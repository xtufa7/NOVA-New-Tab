import { getSettings, getProfile, validateSettings } from '../../storage/settings';
import { button, toast } from '../../shared/dom';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const section = 'Terminal';
  const { field, textArea, resetButton, change } = ui;
  const content = ui.content;
  const p = getProfile();

  field('Username', 'text', p.terminal.username, (v) =>
    change((_s, p) => (p.terminal.username = String(v).slice(0, 40))),
  );
  field('Browser / hostname', 'text', p.terminal.hostname, (v) =>
    change((_s, p) => (p.terminal.hostname = String(v).slice(0, 40))),
  );
  field(
    'Default search',
    'text',
    p.terminal.engine,
    (v) => change((_s, p) => (p.terminal.engine = String(v))),
    Object.keys(p.terminal.engines),
  );
  textArea(
    'Aliases · JSON object',
    JSON.stringify(p.terminal.aliases, null, 2),
    (value) => {
      const aliases = JSON.parse(value);
      const candidate = structuredClone(getSettings());
      candidate.profiles.find((x) => x.id === candidate.activeProfile)!.terminal.aliases = aliases;
      validateSettings(candidate);
      change((_s, p) => (p.terminal.aliases = aliases));
    },
    true,
  );
  textArea(
    'Search engine URL templates · {query}',
    JSON.stringify(p.terminal.engines, null, 2),
    (value) => {
      const engines = JSON.parse(value);
      const candidate = structuredClone(getSettings());
      candidate.profiles.find((x) => x.id === candidate.activeProfile)!.terminal.engines = engines;
      validateSettings(candidate);
      change((_s, p) => (p.terminal.engines = engines));
    },
    true,
  );
  content.append(
    button('Clear history', () => {
      change((_s, p) => (p.terminal.history = []));
      toast('Command history cleared.');
    }),
  );
  resetButton(section);
}
