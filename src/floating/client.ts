import { inExtension } from '../storage/settings';
import { requirePermission } from '../sessions/index';
import { sessionValue, type FloatingRecord } from '../shared/browser';
export async function floatTab(tab: chrome.tabs.Tab, mode = 'live') {
  if (!tab.id || !tab.windowId) throw new Error('Tab is unavailable.');
  if (!/^https?:\/\//.test(tab.url ?? ''))
    throw new Error('Choose a web tab. Browser and extension pages cannot be captured.');
  if (mode === 'live') {
    if (!chrome.tabCapture?.getMediaStreamId)
      throw new Error(
        'This browser supports interactive windows; use its built-in video PiP for pinning.',
      );
    await requirePermission('tabCapture');
  }
  // The worker owns creation and state recording: opening a tab/window closes the toolbar popup.
  const result = await chrome.runtime.sendMessage({
    target: 'worker',
    type: 'float-open',
    tabId: tab.id,
    mode,
  });
  if (result?.error) throw new Error(result.error);
}
export async function floatCommand(action: string) {
  if (!inExtension) throw new Error('Floating tabs need the installed extension.');
  if (action === 'close') {
    const response = await chrome.runtime.sendMessage({
      target: 'worker',
      type: 'float-close',
    });
    if (response?.error) throw new Error(response.error);
    return;
  }
  if (action === 'mute') {
    if (!(await sessionValue<FloatingRecord>('nova.float'))?.viewerId)
      throw new Error('No live preview to mute.');
    await chrome.runtime.sendMessage({ target: 'floating', type: 'mute' });
    return;
  }
  if (action !== 'current') throw new Error('Use float current, close, or mute.');
  await requirePermission('tabs');
  const current = await chrome.tabs.getCurrent();
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const tab = tabs
    .filter((t) => t.id !== current?.id && /^https?:\/\//.test(t.url ?? ''))
    .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
  if (!tab) throw new Error('No web tab available. Use the NØVA toolbar on a web tab.');
  // New Tab has no activeTab grant for another site; interactive mode is the reliable command fallback.
  await floatTab(tab, 'interactive');
}
