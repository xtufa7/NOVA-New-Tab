# NØVA optional Windows media bridge. Reads metadata only; no playback control.
import argparse
import asyncio
import json
import re
import threading
import time
import ctypes
from ctypes import wintypes
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

STATE = {"title": "", "artist": "", "current": 0, "duration": 0, "playing": False}
BINS = []
ERROR = ""
LOCK = threading.Lock()

def pin_window(data):
    user=ctypes.windll.user32
    user.SetWindowPos.argtypes=[wintypes.HWND,wintypes.HWND,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_int,wintypes.UINT]
    found=[]
    callback=ctypes.WINFUNCTYPE(wintypes.BOOL,wintypes.HWND,wintypes.LPARAM)
    user.IsWindowVisible.argtypes=[wintypes.HWND]
    user.GetClassNameW.argtypes=[wintypes.HWND,wintypes.LPWSTR,ctypes.c_int]
    user.GetWindowTextW.argtypes=[wintypes.HWND,wintypes.LPWSTR,ctypes.c_int]
    user.GetWindowRect.argtypes=[wintypes.HWND,ctypes.POINTER(wintypes.RECT)]
    user.GetDpiForWindow.argtypes=[wintypes.HWND]
    user.GetDpiForWindow.restype=wintypes.UINT
    user.EnumWindows.argtypes=[callback,wintypes.LPARAM]
    @callback
    def visit(hwnd,_):
        if not user.IsWindowVisible(hwnd):return True
        name=ctypes.create_unicode_buffer(256);user.GetClassNameW(hwnd,name,256)
        if name.value!='Chrome_WidgetWin_1':return True
        title=ctypes.create_unicode_buffer(1024);user.GetWindowTextW(hwnd,title,1024)
        rect=wintypes.RECT();user.GetWindowRect(hwnd,ctypes.byref(rect))
        if data['title'] not in title.value:return True
        # Match a specific extension-created popup by title AND all four browser bounds.
        actual=[rect.left,rect.top,rect.right-rect.left,rect.bottom-rect.top]
        expected=[data['left'],data['top'],data['width'],data['height']]
        dpi=user.GetDpiForWindow(hwnd) or 96
        ratios=[1,dpi/96]
        if any(all(abs(a-e*ratio)<=18 for a,e in zip(actual,expected)) for ratio in ratios):found.append(hwnd)
        return True
    user.EnumWindows(visit,0)
    if len(found)!=1:raise ValueError('Could not uniquely identify this browser popup. Keep it visible and try again.')
    if not user.SetWindowPos(found[0],wintypes.HWND(-1 if data['pinned'] else -2),0,0,0,0,0x0001|0x0002|0x0010):raise OSError('Windows could not change the pin state.')
    return {'pinned':data['pinned']}

async def media_loop():
    global STATE, ERROR
    try:
        from winrt.windows.media.control import GlobalSystemMediaTransportControlsSessionManager as Manager
        from winrt.windows.media.control import GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status
        manager = await Manager.request_async()
    except Exception as error:
        ERROR = str(error)
        return
    while True:
        try:
            selected = None
            for session in manager.get_sessions():
                if "spotify" in session.source_app_user_model_id.lower():
                    if selected is None or session.get_playback_info().playback_status == Status.PLAYING:
                        selected = session
            state = {"title": "", "artist": "", "current": 0, "duration": 0, "playing": False}
            if selected:
                properties = await selected.try_get_media_properties_async()
                timeline = selected.get_timeline_properties()
                playback = selected.get_playback_info()
                playing = playback.playback_status == Status.PLAYING
                current = (timeline.position-timeline.start_time).total_seconds()
                if playing:
                    from datetime import datetime, timezone
                    elapsed = (datetime.now(timezone.utc)-timeline.last_updated_time).total_seconds()
                    if 0 <= elapsed < 86400:
                        current += elapsed
                duration = max(0, (timeline.end_time-timeline.start_time).total_seconds())
                state = {"title": properties.title[:300], "artist": properties.artist[:300], "current": max(0,min(duration,current)), "duration": duration, "playing": playing}
            with LOCK:
                STATE = state
                ERROR = ""
        except Exception as error:
            ERROR = str(error)
        await asyncio.sleep(.5)


def parse_frame(value):
    tokens = value.strip().rstrip(';').split(';')
    if not tokens or len(tokens) > 64:
        return []
    try:
        return [max(0, min(255, int(token))) for token in tokens]
    except ValueError:
        return []


def cava_loop(path):
    global BINS
    # CAVA raw_target is a normal file, ASCII 0..255; reading only its tail keeps memory bounded.
    last_change = 0
    last_stamp = None
    while True:
        try:
            with path.open('rb') as stream:
                size = path.stat().st_size
                stream.seek(max(0,size-4096))
                data = stream.read(4096).decode('ascii',errors='ignore')
            stamp=(path.stat().st_mtime_ns,size)
            if stamp != last_stamp:
                last_stamp=stamp
                last_change=time.monotonic()
                complete=data.split('\n')[:-1]
                if complete:
                    with LOCK:
                        BINS=parse_frame(complete[-1])
            if time.monotonic()-last_change>2:
                with LOCK:
                    BINS=[]
        except OSError:
            with LOCK:
                BINS=[]
        time.sleep(.08)


def browser_memory(browser):
    import psutil
    if browser not in ['helium','chrome','msedge','brave','chromium']:
        raise ValueError('Unknown browser.')
    total=0
    count=0
    for process in psutil.process_iter(['name','exe','memory_info']):
        try:
            name=(process.info['name'] or '').lower()
            exe=(process.info['exe'] or '').lower()
            # Helium may ship chrome.exe; distinguish its install path from Google Chrome.
            helium=name=='helium.exe' or (name in ['chrome.exe','chromium.exe'] and any(part.name.lower().startswith('helium') for part in list(Path(exe).parents)[:3]))
            match=helium if browser=='helium' else name==browser+'.exe' and not helium
            if match and process.info['memory_info']:
                total+=process.info['memory_info'].rss
                count+=1
        except (psutil.NoSuchProcess,psutil.AccessDenied):
            pass
    return {'bytes':total,'processes':count,'browser':browser,'metric':'working-set-sum'}


def serve(extension_id, cava_file=None, port=17832, ready=None):
    origin='chrome-extension://'+extension_id
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args): pass
        def authorized(self):
            # Chrome may omit Origin for host-authorized extension GET requests.
            # A non-simple header is mandatory; website preflights are rejected.
            return self.headers.get('X-Nova-Client')==extension_id and self.headers.get('Origin') in (None,origin) and self.headers.get('Host')==f'127.0.0.1:{port}'
        def do_OPTIONS(self):
            if self.headers.get('Origin')!=origin:self.send_error(403);return
            self.send_response(204);self.send_header('Access-Control-Allow-Origin',origin)
            self.send_header('Access-Control-Allow-Methods','GET, POST');self.send_header('Access-Control-Allow-Headers','Content-Type, X-Nova-Client');self.end_headers()
        def do_POST(self):
            if self.path!='/pin' or not self.authorized():self.send_error(403);return
            try:
                length=int(self.headers.get('Content-Length','0'))
                if not 0<length<=4096:raise ValueError('Invalid request size.')
                data=json.loads(self.rfile.read(length))
                if not isinstance(data.get('title'),str) or not 1<=len(data['title'])<=300 or type(data.get('pinned'))!=bool:raise ValueError('Invalid popup metadata.')
                if any(type(data.get(key)) not in (float,int) or abs(data[key])>100000 for key in ['left','top','width','height']):raise ValueError('Invalid window bounds.')
                result=pin_window(data)
            except Exception as error:result={'error':str(error)}
            body=json.dumps(result).encode();self.send_response(200)
            self.send_header('Access-Control-Allow-Origin',origin);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
        def do_GET(self):
            if not self.authorized():
                self.send_error(403);return
            if self.path.startswith('/memory?'):
                from urllib.parse import urlparse,parse_qs
                try:
                    browser=parse_qs(urlparse(self.path).query).get('browser',['helium'])[0]
                    data=browser_memory(browser)
                except Exception:
                    self.send_error(400);return
            else:
                with LOCK:
                    data = dict(STATE) if self.path=='/now-playing' else {"bins":list(BINS)} if self.path=='/spectrum' else {"ok":True,"mediaError":ERROR} if self.path=='/health' else None
            if data is None:
                self.send_error(404);return
            body=json.dumps(data).encode()
            self.send_response(200)
            self.send_header('Content-Type','application/json')
            self.send_header('Access-Control-Allow-Origin',origin)
            self.send_header('Vary','Origin')
            self.send_header('Cache-Control','no-store')
            self.send_header('Content-Length',str(len(body)))
            self.end_headers();self.wfile.write(body)
    server=ThreadingHTTPServer(('127.0.0.1',port),Handler)
    threading.Thread(target=lambda:asyncio.run(media_loop()),daemon=True).start()
    if cava_file:
        threading.Thread(target=cava_loop,args=(Path(cava_file),),daemon=True).start()
    if ready: ready(server)
    print(f'NØVA bridge on 127.0.0.1:{port}, allowed extension: {extension_id}. Ctrl+C to stop.',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--extension-id',required=True)
    parser.add_argument('--cava-file')
    args=parser.parse_args()
    if not re.fullmatch('[a-p]{32}',args.extension_id):
        parser.error('Use the 32-letter ID shown on chrome://extensions.')
    serve(args.extension_id,args.cava_file)
