import { getProfile } from '../../storage/settings';
import { widgetIds } from '../schema';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const section = 'Widgets';
  const { field, resetButton, change } = ui;
  const p = getProfile();
  for (const id of widgetIds) {
    if (id === 'terminal') continue;
    field(
      id === 'credits' ? 'Show Creator Credits' : id[0].toUpperCase() + id.slice(1),
      'checkbox',
      p.widgets[id],
      (v) => change((_s, p) => (p.widgets[id] = Boolean(v))),
    );
  }
  resetButton(section);
}
