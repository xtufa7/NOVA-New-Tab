import { send } from '../commands/palette';
import { update, flush } from '../storage/settings';
import { domain, hostPattern } from '../website/model';
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

const extra = document.createElement('section');
extra.className = 'popup-suite';
extra.innerHTML =
  '<h2>Website appearance</h2><p id="site-host" class="muted"></p><label class="field"><span>Enabled</span><input id="web-enabled" type="checkbox"></label><label class="field"><span>Mode</span><select id="web-mode"><option>smart</option><option>force</option><option>dark-only</option><option>original</option><option>custom</option></select></label><label class="field"><span>Intensity</span><input id="web-intensity" type="range" min="0" max="100"></label><div class="popup-actions"><button id="site-toggle">Disable this site</button><button id="site-allow">Allow this site</button><button id="site-inspect">Inspect</button><button id="site-focus">Focus picker</button><button id="tabs-open">Tab Manager</button><button id="palette-open">Command Palette</button><button id="snapshot-capture">Capture hover snapshot</button><button id="suite-settings">Full settings</button></div>';
document.body.append(extra);
void ready.then(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const valid = !!tab?.url && /^https?:\/\//.test(tab.url);
  const w = getSettings().suite.website;
  const enabled = extra.querySelector<HTMLInputElement>('#web-enabled')!,
    mode = extra.querySelector<HTMLSelectElement>('#web-mode')!,
    intensity = extra.querySelector<HTMLInputElement>('#web-intensity')!;
  enabled.checked = w.enabled;
  mode.value = w.mode;
  intensity.value = String(w.intensity);
  extra.querySelector('#site-host')!.textContent = valid
    ? new URL(tab.url!).hostname
    : 'Website actions require a web tab.';
  enabled.addEventListener('change', () =>
    update((s) => {
      s.suite.website.enabled = enabled.checked;
    }),
  );
  mode.addEventListener('change', () =>
    update((s) => {
      s.suite.website.mode = mode.value as typeof w.mode;
    }),
  );
  intensity.addEventListener('change', () =>
    update((s) => {
      s.suite.website.intensity = +intensity.value;
    }),
  );
  const bind = (id: string, fn: () => Promise<unknown>) =>
    extra
      .querySelector('#' + id)!
      .addEventListener('click', () => void fn().catch((e) => (status.textContent = e.message)));
  bind('site-allow', async () => {
    if (!valid) throw Error('Open a website first.');
    if (await chrome.permissions.request({ origins: [hostPattern(tab.url!)] })) {
      update((s) => {
        s.suite.website.enabled = true;
      });
      await flush();
      status.textContent = 'Website enabled.';
    }
  });
  bind('site-toggle', async () => {
    if (!valid) throw Error('Open a website first.');
    const host = domain(tab.url!);
    const rule = getSettings().suite.website.sites.find((r) => r.domain === host);
    await send('suite-site-save', { tabId: tab.id, enabled: rule?.enabled === false });
    status.textContent = rule?.enabled === false ? 'Site enabled.' : 'Site disabled.';
  });
  bind('site-inspect', () => send('suite-command', { id: 'inspector', tabId: tab.id }));
  bind('site-focus', () => send('suite-command', { id: 'focus-pick', tabId: tab.id }));
  bind('tabs-open', () => send('suite-command', { id: 'manager' }));
  bind('palette-open', async () => {
    if (!tab.id) return;
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['website.js'] });
    await chrome.tabs.sendMessage(tab.id, { type: 'nova-palette' }, { frameId: 0 });
    window.close();
  });
  bind('snapshot-capture', async () => {
    await send('suite-capture', { tabId: tab.id });
    status.textContent = 'Snapshot saved locally for Tab Manager hover previews.';
  });
  bind('suite-settings', () =>
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') + '#Website%20Appearance' }),
  );
});
