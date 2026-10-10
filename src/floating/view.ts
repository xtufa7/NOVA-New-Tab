import { getSettings, loadSettings, update, flush } from '../storage/settings';
import { floatTab } from './client';
import { sessionValue, type CaptureRecord } from '../shared/browser';
const video = document.querySelector<HTMLVideoElement>('#preview')!,
  controls = document.querySelector<HTMLElement>('#float-controls')!,
  status = document.querySelector<HTMLElement>('#float-status')!;
const startButton = document.querySelector<HTMLButtonElement>('#start-float')!;
const muteButton = document.querySelector<HTMLButtonElement>('#mute-float')!;
const pinButton = document.querySelector<HTMLButtonElement>('#pin-float')!;
startButton.disabled = true;
let stream: MediaStream | undefined,
  pip: Window | undefined,
  sourceId = Number(new URL(location.href).searchParams.get('target')),
  closed = false,
  captureFailed = false;
function stop() {
  if (closed) return;
  closed = true;
  stream?.getTracks().forEach((t) => t.stop());
  video.srcObject = null;
  if (pip) {
    const closing = pip;
    pip = undefined;
    document.body.prepend(video, controls, status);
    closing.close();
  }
  startButton.disabled = true;
  startButton.hidden = false;
  pinButton.hidden = true;
}
async function openPiP() {
  if (captureFailed) {
    const tab = await chrome.tabs.get(sourceId);
    stop();
    await floatTab(tab, 'interactive');
    window.close();
    return;
  }
  if (!window.documentPictureInPicture) {
    if (!document.pictureInPictureEnabled)
      throw new Error(
        'This browser does not support pinning. Use a Chromium build with Picture-in-Picture enabled.',
      );
    await video.requestPictureInPicture();
    status.textContent = 'Pinned video above apps. Keep this controller open.';
    return;
  }
  const f = getSettings().floatingTabs;
  pip = await window.documentPictureInPicture.requestWindow({
    width: f.width,
    height: f.height,
    preferInitialWindowPlacement: true,
  });
  const css = pip.document.createElement('link');
  css.rel = 'stylesheet';
  css.href = document.querySelector<HTMLLinkElement>('link[rel=stylesheet]')?.href ?? '';
  pip.document.head.append(css);
  pip.document.body.className = 'float-page';
  startButton.hidden = true;
  pinButton.hidden = false;
  pip.document.body.append(video, controls, status);
  pip.document.title = 'NØVA · Pinned live preview';
  pip.addEventListener('resize', () => {
    if (pip)
      update((s) => {
        s.floatingTabs.width = Math.max(240, Math.min(1600, pip!.innerWidth));
        s.floatingTabs.height = Math.max(160, Math.min(1200, pip!.innerHeight));
      });
  });
  pip.addEventListener(
    'pagehide',
    () => {
      if (closed) return;
      pip = undefined;
      document.body.prepend(video, controls, status);
      startButton.hidden = false;
      pinButton.hidden = true;
      status.textContent = 'Unpinned. Click the pin to stay above apps again.';
      void flush();
    },
    { once: true },
  );
  status.textContent = 'Pinned above apps. Keep this controller tab open.';
}
pinButton.addEventListener('click', () => pip?.close());
document
  .querySelector('#start-float')!
  .addEventListener('click', () => void openPiP().catch((e) => (status.textContent = e.message)));
muteButton.addEventListener('click', () => {
  video.muted = !video.muted;
  muteButton.textContent = video.muted ? 'Unmute' : 'Mute';
});
document.querySelector('#return-float')!.addEventListener('click', () => {
  void chrome.tabs
    .update(sourceId, { active: true })
    .then((tab) => {
      if (tab) return chrome.windows.update(tab.windowId, { focused: true });
    })
    .catch(() => {
      status.textContent = 'The source tab was closed.';
      stop();
    });
});
document.querySelector('#close-float')!.addEventListener('click', () => {
  stop();
  window.close();
});
window.addEventListener('pagehide', stop);
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.target === 'floating' && message.type === 'mute') {
    video.muted = !video.muted;
    muteButton.textContent = video.muted ? 'Unmute' : 'Mute';
    respond({});
  }
});
async function start() {
  await loadSettings();
  if (!getSettings().floatingTabs.audio) {
    muteButton.disabled = true;
    muteButton.textContent = 'Audio off';
  }
  const current = await chrome.tabs.getCurrent();
  const key = 'nova.capture.' + current!.id;
  // The toolbar creates the consumer tab before delivering its single-use stream token.
  let saved = await sessionValue<CaptureRecord>(key);
  if (!saved)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        chrome.storage.onChanged.removeListener(listener);
        reject(new Error('Capture authorization expired. Start from the toolbar again.'));
      }, 10000);
      const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
        if (area === 'session' && changes[key]?.newValue) {
          saved = changes[key].newValue as CaptureRecord;
          clearTimeout(timeout);
          chrome.storage.onChanged.removeListener(listener);
          resolve();
        }
      };
      chrome.storage.onChanged.addListener(listener);
      void sessionValue<CaptureRecord>(key)
        .then((value) => {
          if (value) {
            saved = value;
            clearTimeout(timeout);
            chrome.storage.onChanged.removeListener(listener);
            resolve();
          }
        })
        .catch(reject);
    });
  await chrome.storage.session.remove(key);
  if (!saved) throw new Error('Capture token missing.');
  if (saved.error) throw new Error(saved.error);
  sourceId = saved.tabId;
  const media = {
    audio: getSettings().floatingTabs.audio
      ? {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: saved.streamId,
          },
        }
      : false,
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: saved.streamId,
        maxWidth: 1280,
        maxHeight: 720,
        maxFrameRate: 24,
      },
    },
  } as unknown as MediaStreamConstraints;
  stream = await navigator.mediaDevices.getUserMedia(media);
  video.srcObject = stream;
  await video.play();
  startButton.disabled = false;
  stream.getVideoTracks()[0]?.addEventListener('ended', () => {
    stop();
    status.textContent = 'Capture ended.';
  });
  if (!window.documentPictureInPicture) {
    document.querySelector('#start-float')!.textContent = '📌 Pin video above apps';
    status.textContent =
      'This browser uses native video Picture-in-Picture. The controller stays in this tab.';
  }
}
void start().catch((e) => {
  startButton.disabled = false;
  captureFailed = true;
  status.textContent = e.message;
  startButton.textContent = 'Use interactive fallback';
});
