"""Standalone Windows bridge launcher; no admin rights or startup registration."""
import sys
import re
import json
import threading
from pathlib import Path
import tkinter as tk
from tkinter import ttk, messagebox
from nova_bridge import serve

if '--extension-id' in sys.argv:
    import argparse
    parser=argparse.ArgumentParser()
    parser.add_argument('--extension-id',required=True)
    parser.add_argument('--cava-file')
    args=parser.parse_args()
    if not re.fullmatch('[a-p]{32}',args.extension_id):parser.error('Invalid extension ID')
    serve(args.extension_id,args.cava_file)
else:
    root=tk.Tk()
    root.title('NØVA · Windows Bridge')
    root.geometry('490x330')
    root.resizable(False,False)
    root.configure(bg='#1e1e2e')
    style=ttk.Style()
    style.theme_use('clam')
    style.configure('TFrame',background='#1e1e2e')
    style.configure('TLabel',background='#1e1e2e',foreground='#cdd6f4',font=('Segoe UI',10))
    style.configure('TButton',padding=9,font=('Segoe UI',10))
    frame=ttk.Frame(root,padding=24);frame.pack(fill='both',expand=True)
    ttk.Label(frame,text='NØVA  ·  Windows Bridge',font=('Segoe UI',18,'bold')).pack(anchor='w')
    ttk.Label(frame,text='Pin interactive windows · Spotify Desktop · Browser RAM').pack(anchor='w',pady=(8,20))
    ttk.Label(frame,text='Paste extension ID from NØVA → Performance → Copy ID').pack(anchor='w')
    extension=tk.StringVar()
    config=Path.home()/'AppData'/'Local'/'NOVA'/'bridge.json'
    try:extension.set(json.loads(config.read_text())['extensionId'])
    except (OSError,ValueError,KeyError):pass
    entry=ttk.Entry(frame,textvariable=extension,font=('Consolas',11));entry.pack(fill='x',pady=8)
    status=tk.StringVar(value='Stopped · local connection only')
    ttk.Label(frame,textvariable=status,wraplength=440).pack(anchor='w',pady=8)
    server=[]
    def ready(http):
        server.append(http)
        def display():
            status.set('Running · keep this window open while using NØVA')
            start.configure(text='Bridge running',state='disabled')
            entry.configure(state='disabled')
        root.after(0,display)
    def run():
        try:serve(extension.get().strip(),ready=ready)
        except Exception as error:
            message=str(error)
            root.after(0,lambda: (status.set(message),start.configure(state='normal')))
    def launch():
        if not re.fullmatch('[a-p]{32}',extension.get().strip()):
            messagebox.showerror('Extension ID','Paste the 32-letter extension ID.');return
        config.parent.mkdir(parents=True,exist_ok=True)
        config.write_text(json.dumps({'extensionId':extension.get().strip()}))
        start.configure(state='disabled')
        threading.Thread(target=run,daemon=True).start()
    def stop():
        if server:
            threading.Thread(target=server[0].shutdown,daemon=True).start()
        root.destroy()
    start=ttk.Button(frame,text='Start bridge',command=launch);start.pack(fill='x',pady=8)
    ttk.Button(frame,text='Stop & close',command=stop).pack(fill='x')
    root.protocol('WM_DELETE_WINDOW',stop)
    root.mainloop()
