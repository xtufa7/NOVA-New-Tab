import { getSettings, update, inExtension, flush } from '../storage/settings';
export async function requirePermission(permission: 'tabs' | 'history' | 'tabCapture') {
  if (!inExtension) throw new Error('This feature needs the installed extension.');
  if (await chrome.permissions.contains({ permissions: [permission] })) return;
  if (!(await chrome.permissions.request({ permissions: [permission] })))
    throw new Error(`${permission} permission was not granted.`);
}
export async function saveSession(name: string) {
  if (!name.trim() || name.length > 80)
    throw new Error('Give the session a name (1–80 characters).');
  await requirePermission('tabs');
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const urls = tabs.map((t) => t.url ?? '').filter((url) => /^https?:\/\//.test(url));
  if (!urls.length) throw new Error('No web tabs to save.');
  update((s) => {
    const existing = s.sessions.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.urls = urls;
      existing.created = Date.now();
    } else {
      s.sessions.push({
        id: crypto.randomUUID(),
        name,
        urls,
        created: Date.now(),
      });
    }
  });
  await flush();
}
export async function openSession(name: string) {
  if (!inExtension) throw new Error('Install the extension to restore browser sessions.');
  const session = getSettings().sessions.find(
    (s) => s.name.toLowerCase() === name.toLowerCase() || s.id === name,
  );
  if (!session) throw new Error('Session not found.');
  await chrome.windows.create({ url: session.urls, type: 'normal' });
}
