import { isGecko } from '../shared/platform';
import { loadSettings, getSettings } from '../storage/settings';
import { floatTab } from './client';
const status = document.querySelector<HTMLElement>('#status')!;
const ready = loadSettings();
if (isGecko) {
  const live = document.querySelector<HTMLButtonElement>('#live')!;
  live.disabled = true;
  live.title = 'Live capture is unavailable in Firefox / Zen.';
  document.querySelector<HTMLButtonElement>('#direct-pin')!.disabled = true;
  status.textContent =
    'Use the built-in browser video PiP button for pinning. Interactive windows are available below.';
}
document.querySelector('#direct-pin')!.addEventListener('click', () => {
  void (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//.test(tab.url ?? '')) throw new Error('Open a web video first.');
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['site-pip.js'] });
    status.textContent = 'Click the 📌 button on the page to open direct Picture-in-Picture.';
    window.close();
  })().catch((error) => {
    status.textContent = error.message;
  });
});
void ready.then(() => {
  document
    .querySelector('#live')!
    .classList.toggle('primary', getSettings().floatingTabs.mode === 'live');
  document
    .querySelector('#interactive')!
    .classList.toggle('primary', getSettings().floatingTabs.mode === 'interactive');
});
for (const [id, mode] of [
  ['live', 'live'],
  ['interactive', 'interactive'],
])
  document.querySelector('#' + id)!.addEventListener('click', () => {
    void (async () => {
      await ready;
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab) throw new Error('No active tab.');
      await floatTab(tab, mode);
      window.close();
    })().catch((e) => (status.textContent = e.message));
  });
