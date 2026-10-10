import { isGecko } from '../../shared/platform';
import { getSettings, inExtension } from '../../storage/settings';
import { type Settings } from '../schema';
import { button } from '../../shared/dom';
import { sessionValue, type PopupRecord } from '../../shared/browser';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const section = 'Floating Tabs';
  const { field, range, note, resetButton, change } = ui;
  const content = ui.content;
  const s = getSettings();
  note(
    isGecko
      ? 'Firefox / Zen: use the built-in browser video Picture-in-Picture button to pin video. Interactive browser windows are available; live tabCapture preview is unavailable.'
      : 'No helper required. Direct video PiP moves the real video into a window above apps, with playback controls. Use the toolbar → Pin video directly, then click 📌 on the page. TikTok mini windows include this button automatically. Keep the source tab open.',
  );
  field(
    'Preferred toolbar mode',
    'text',
    isGecko ? 'interactive' : s.floatingTabs.mode,
    (v) => change((s) => (s.floatingTabs.mode = v as Settings['floatingTabs']['mode'])),
    isGecko ? ['interactive'] : ['live', 'interactive'],
  );
  range('Width', s.floatingTabs.width, 240, 1600, (v) => change((s) => (s.floatingTabs.width = v)));
  range('Height', s.floatingTabs.height, 160, 1200, (v) =>
    change((s) => (s.floatingTabs.height = v)),
  );
  if (!isGecko)
    field('Capture audio (muted initially)', 'checkbox', s.floatingTabs.audio, (v) =>
      change((s) => (s.floatingTabs.audio = Boolean(v))),
    );
  content.append(
    button('Float last web tab · interactive', async () => {
      const { floatCommand } = await import('../../floating/client');
      await floatCommand('current');
    }),
    button('Close / restore floating tab', async () => {
      const { floatCommand } = await import('../../floating/client');
      await floatCommand('close');
    }),
  );
  if (inExtension)
    content.append(
      button('Restore interactive window', async () => {
        const saved = await sessionValue<PopupRecord>('nova.popup');
        if (!saved) throw new Error('No interactive floating tab.');
        const r = await chrome.runtime.sendMessage({
          target: 'worker',
          type: 'float-restore',
          tabId: saved.tabId,
        });
        if (r?.error) throw new Error(r.error);
      }),
    );
  ui.heading('Keyboard shortcuts');
  const keys = document.createElement('div');
  keys.className = 'keybind-list';
  content.append(keys);
  if (inExtension)
    void chrome.commands.getAll().then((commands) => {
      if (!keys.isConnected) return;
      for (const command of commands.filter((c) => c.name?.startsWith('float-'))) {
        const row = document.createElement('div');
        row.className = 'keybind-row';
        const label = document.createElement('span');
        label.textContent = command.description ?? command.name ?? '';
        const key = document.createElement('kbd');
        key.textContent = command.shortcut || 'Unassigned';
        row.append(label, key);
        keys.append(row);
      }
    });
  content.append(
    button('Change browser keybinds', async () => {
      if (!inExtension) throw new Error('Install the extension first.');
      await chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    }),
  );
  resetButton(section);
}
