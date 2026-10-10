import { loadSettings, subscribe, getSettings, storageWarning } from '../storage/settings';
import { renderAppearance } from './appearance';
import { report, shortcut } from '../shared/dom';
import { initTerminal } from '../terminal/index';
import { renderWidgets } from '../widgets/registry';
import { enterWorkspace } from './entrance';
let ready = false;
export async function openSettings(section?: string) {
  const module = await import('../settings/control');
  module.openControlCenter(section);
}
export async function toggleEdit() {
  const module = await import('./edit');
  module.toggleEdit();
}
async function render() {
  if (!ready) return;
  const wordmark = document.querySelector<HTMLElement>('.wordmark')!;
  wordmark.textContent = getSettings().branding.name;
  wordmark.hidden = getSettings().branding.hidden;
  await Promise.all([renderAppearance(), renderWidgets()]);
}
async function main() {
  await loadSettings();
  if (storageWarning) report(storageWarning);
  ready = true;
  initTerminal({ openSettings, toggleEdit });
  await render();
  if (globalThis.chrome?.runtime?.id) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('companion.js');
    document.body.append(script);
  }
  const { mountTerminalLyrics } = await import('../music/spotify');
  mountTerminalLyrics();
  const { mountMemory } = await import('./memory');
  mountMemory();
  const { mountTabIdentity } = await import('./tab-identity');
  mountTabIdentity();
  subscribe(() => void render().catch(report));
  document
    .querySelector('#settings-toggle')!
    .addEventListener('click', () => void openSettings().catch(report));
  document
    .querySelector('#edit-toggle')!
    .addEventListener('click', () => void toggleEdit().catch(report));
  document.addEventListener('nova-error', (e) => report((e as CustomEvent).detail));
  document.addEventListener('keydown', (e) => {
    const key = shortcut(e),
      s = getSettings();
    if (key === s.shortcuts.settings) {
      e.preventDefault();
      void openSettings().catch(report);
    }
    if (key === s.shortcuts.edit) {
      e.preventDefault();
      void toggleEdit().catch(report);
    }
  });
  performance.mark('nova-ready');
  enterWorkspace();
}
void main().catch((error) => {
  document.body.classList.remove('nova-loading');
  report(error);
});
