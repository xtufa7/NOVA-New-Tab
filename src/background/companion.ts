import type { Settings } from '../settings/schema';
import { KEY, validateSettings } from '../storage/settings';
import { defaults } from '../settings/schema';
let queue = Promise.resolve();
export function syncCompanion(settings: Settings) {
  queue = queue.catch(() => {}).then(() => register(settings));
  return queue;
}
async function register(settings: Settings) {
  const registered = await chrome.scripting.getRegisteredContentScripts();
  for (const [id, enabled, matches, file] of [
    [
      'nova-guns-avatar',
      settings.credits.syncGunsAvatar,
      ['https://guns.lol/xtufa7*'],
      'guns-avatar.js',
    ],
    ['nova-companion', settings.companion.enabled, ['https://*/*', 'http://*/*'], 'companion.js'],
    ['nova-site-pip', settings.companion.enabled, ['https://www.tiktok.com/*'], 'site-pip.js'],
    ['nova-spotify', settings.integrations.spotify, ['https://open.spotify.com/*'], 'spotify.js'],
  ] as const) {
    const has = await chrome.permissions.contains({ origins: [...matches] });
    if (enabled && has && !registered.some((s) => s.id === id)) {
      await chrome.scripting.registerContentScripts([
        {
          id,
          js: [file],
          matches: [...matches],
          runAt: 'document_idle',
          persistAcrossSessions: true,
        },
      ]);
      const tabs = await chrome.tabs.query({ url: [...matches] });
      for (const tab of tabs)
        if (tab.id)
          await chrome.scripting
            .executeScript({ target: { tabId: tab.id }, files: [file] })
            .catch(() => {});
    } else if ((!enabled || !has) && registered.some((s) => s.id === id))
      await chrome.scripting.unregisterContentScripts({ ids: [id] });
  }
}
export async function companionCommand(
  message: Record<string, unknown>,
  sender: chrome.runtime.MessageSender,
) {
  const settings = validateSettings((await chrome.storage.local.get(KEY))[KEY] ?? defaults());
  const tabId =
    sender.tab?.id ??
    (sender.url?.startsWith(chrome.runtime.getURL('')) ? Number(message.tabId) : undefined);
  if (message.type === 'companion-config') {
    const hidden = tabId
      ? await chrome.storage.session.get(['nova.sideHidden.' + tabId, 'nova.tiktok', 'nova.popup'])
      : {};
    const mini = hidden['nova.tiktok'] as { tabId?: number; windowId?: number } | undefined;
    const popup = hidden['nova.popup'] as { tabId?: number; popupWindowId?: number } | undefined;
    const managedWindowId =
      mini?.tabId === tabId
        ? mini?.windowId
        : popup?.tabId === tabId
          ? popup?.popupWindowId
          : undefined;
    const profile = settings.profiles.find((p) => p.id === settings.activeProfile)!;
    return {
      config: settings.companion,
      accent: profile.appearance.accent,
      hidden: !!hidden['nova.sideHidden.' + tabId] || mini?.tabId === tabId,
      managedWindowId,
      pinned: managedWindowId
        ? !!(await chrome.storage.session.get('nova.nativePin.' + managedWindowId))[
            'nova.nativePin.' + managedWindowId
          ]
        : false,
    };
  }
  if (message.type === 'companion-hide') {
    if (!tabId) throw new Error('Tab is unavailable.');
    await chrome.storage.session.set({ ['nova.sideHidden.' + tabId]: true });
    return {};
  }
  if (message.type === 'companion-position') {
    if (
      !['left', 'right'].includes(String(message.edge)) ||
      !Number.isFinite(message.y) ||
      Number(message.y) < 0.05 ||
      Number(message.y) > 0.95
    )
      throw new Error('Invalid handle position.');
    settings.companion.edge = message.edge as 'left' | 'right';
    settings.companion.y = Number(message.y);
    await chrome.storage.local.set({ [KEY]: settings });
    return {};
  }
  if (message.type === 'companion-open') {
    if (!settings.companion.enabled) throw new Error('Enable Browser Companion first.');
    const saved = (await chrome.storage.session.get('nova.tiktok'))['nova.tiktok'] as
      { windowId: number } | undefined;
    if (saved)
      try {
        await chrome.windows.update(saved.windowId, { focused: true });
        return {};
      } catch {
        await chrome.storage.session.remove('nova.tiktok');
      }
    const popup = await chrome.windows.create({
      url: 'https://www.tiktok.com/',
      type: 'popup',
      width: 430,
      height: 680,
      focused: true,
    });
    await chrome.storage.session.set({
      'nova.tiktok': { windowId: popup?.id, tabId: popup?.tabs?.[0]?.id },
    });
    return {};
  }
  throw new Error('Unsupported companion action.');
}
