import { KEY, validateSettings } from '../storage/settings';
import { defaults } from '../settings/schema';
import { sessionValue, type FloatingRecord } from '../shared/browser';
export async function openFloating(
  tabId: number,
  mode: string,
  closeExisting: () => Promise<void>,
) {
  if (!Number.isInteger(tabId) || !['live', 'interactive'].includes(mode))
    throw new Error('Invalid floating tab request.');
  const tab = await chrome.tabs.get(tabId);
  if (!/^https?:\/\//.test(tab.url ?? '')) throw new Error('Only web tabs can float.');
  if (await sessionValue<FloatingRecord>('nova.float'))
    await closeExisting().catch(() => chrome.storage.session.remove(['nova.float', 'nova.popup']));
  if (mode === 'live') {
    if (!chrome.tabCapture?.getMediaStreamId)
      throw new Error(
        'Live capture is unavailable in this browser. Use an interactive window or the browser’s built-in video PiP.',
      );
    if (!(await chrome.permissions.contains({ permissions: ['tabCapture'] })))
      throw new Error('Grant tabCapture from the toolbar first.');
    const viewer = await chrome.tabs.create({
      url: chrome.runtime.getURL('floating.html') + `?target=${tabId}`,
      active: true,
    });
    let streamId = '',
      error = '';
    try {
      streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: tabId,
        consumerTabId: viewer.id,
      });
    } catch (cause) {
      error =
        (cause instanceof Error ? cause.message : String(cause)) +
        ' Use the interactive fallback below.';
    }
    await chrome.storage.session.set({
      ['nova.capture.' + viewer.id]: { streamId, tabId, error },
      'nova.float': { viewerId: viewer.id, sourceId: tabId },
    });
    return {};
  }
  const raw = (await chrome.storage.local.get(KEY))[KEY];
  const settings = raw ? validateSettings(raw) : defaults();
  const f = settings.floatingTabs;
  const popup = await chrome.windows.create({
    tabId,
    type: 'popup',
    width: f.width,
    height: f.height,
    left: f.left,
    top: f.top,
    focused: true,
  });
  if (!popup?.id) throw new Error('Browser did not create a popup.');
  await chrome.storage.session.set({
    'nova.popup': { tabId, windowId: tab.windowId, index: tab.index, popupWindowId: popup.id },
    'nova.float': { popupTabId: tabId, sourceId: tabId },
  });
  await chrome.scripting
    .executeScript({ target: { tabId }, files: ['site-pip.js'] })
    .catch(() => {});
  return {};
}
