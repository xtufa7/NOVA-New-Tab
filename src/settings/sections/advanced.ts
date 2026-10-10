import { getSettings, getProfile } from '../../storage/settings';
import { safeURL } from '../../shared/dom';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const section = 'Advanced';
  const { field, textArea, note, resetButton, change } = ui;
  const p = getProfile();
  const s = getSettings();

  note('Custom CSS applies to New Tab only.');
  field('Enable custom CSS', 'checkbox', p.appearance.cssEnabled, (v) =>
    change((_s, p) => (p.appearance.cssEnabled = Boolean(v))),
  );
  textArea(
    'Custom CSS',
    p.appearance.customCSS,
    (value) => {
      if (value.length > 100000) throw new Error('CSS too large.');
      change((_s, p) => (p.appearance.customCSS = value));
    },
    true,
  );
  resetButton(section);
  field('Discord link', 'url', s.credits.discordURL, (v) =>
    change((s) => (s.credits.discordURL = safeURL(String(v)))),
  );
}
