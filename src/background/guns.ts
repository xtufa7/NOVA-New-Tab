import { KEY, validateSettings } from '../storage/settings';
import { defaults } from '../settings/schema';
import { putMedia } from '../storage/media';
let queue: Promise<unknown> = Promise.resolve();
export function syncGunsAvatar(url: unknown, sender: chrome.runtime.MessageSender) {
  const task = queue.catch(() => {}).then(() => sync(url, sender));
  queue = task;
  return task;
}
async function sync(url: unknown, sender: chrome.runtime.MessageSender) {
  const read = async () =>
    validateSettings((await chrome.storage.local.get(KEY))[KEY] ?? defaults());
  const settings = await read(),
    from = new URL(sender.url ?? 'https://invalid.local'),
    image = new URL(String(url));
  if (
    !settings.credits.syncGunsAvatar ||
    from.hostname !== 'guns.lol' ||
    from.pathname.replace(/\/$/, '').toLowerCase() !== '/xtufa7' ||
    image.protocol !== 'https:' ||
    image.hostname !== 'r2.guns.lol' ||
    image.username ||
    image.password ||
    image.href.length > 1500
  )
    throw new Error('Invalid avatar sender or URL.');
  if (!(await chrome.permissions.contains({ origins: ['https://*.guns.lol/*'] })))
    throw new Error('Allow Guns avatar access first.');
  const ruleId = 919001,
    limit = 5 * 1048576;
  try {
    // A public CDN requires its website referrer. This rule affects this extension's exact image request only.
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [ruleId],
      addRules: [
        {
          id: ruleId,
          priority: 1,
          action: {
            type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
            requestHeaders: [
              {
                header: 'referer',
                operation: 'set' as chrome.declarativeNetRequest.HeaderOperation,
                value: 'https://guns.lol/',
              },
            ],
          },
          condition: {
            urlFilter: '|' + image.href + '|',
            initiatorDomains: [chrome.runtime.id],
            resourceTypes: ['xmlhttprequest' as chrome.declarativeNetRequest.ResourceType],
          },
        },
      ],
    });
    const response = await fetch(image.href, {
      credentials: 'omit',
      cache: 'no-cache',
      signal: AbortSignal.timeout(10000),
    });
    const type = response.headers.get('content-type')?.split(';')[0] ?? '';
    if (!response.ok || !/^image\/(png|webp|gif|jpeg|avif)$/.test(type) || !response.body)
      throw new Error('Guns avatar unavailable.');
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error('Avatar maximum is 5 MB.');
      }
      chunks.push(value.slice());
    }
    const current = await read();
    if (
      !current.credits.syncGunsAvatar ||
      current.credits.gunsAvatarId !== settings.credits.gunsAvatarId
    )
      return { ok: false };
    current.credits.gunsAvatarId = await putMedia(new Blob(chunks, { type }));
    current.credits.lastSync = Date.now();
    await chrome.storage.local.set({ [KEY]: current });
    return { ok: true };
  } finally {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] });
  }
}
