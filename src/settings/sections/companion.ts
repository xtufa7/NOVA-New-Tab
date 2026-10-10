import { getSettings, flush, validateSettings, inExtension } from '../../storage/settings';
import { button, toast } from '../../shared/dom';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const s = getSettings();
  ui.note(
    'A movable handle on web pages opens TikTok in a real mini browser window. Drag it to either edge; right-click to hide it on one tab.',
  );
  ui.content.append(
    button(s.companion.enabled ? 'Disable browser handle' : 'Enable browser handle', async () => {
      if (!inExtension) throw new Error('Install the extension first.');
      if (
        !s.companion.enabled &&
        !(await chrome.permissions.request({ origins: ['https://*/*', 'http://*/*'] }))
      )
        throw new Error('Website access was not granted.');
      ui.change((s) => (s.companion.enabled = !s.companion.enabled));
      await flush();
      ui.redraw();
    }),
  );
  ui.field(
    'Browser edge',
    'text',
    s.companion.edge,
    (v) => ui.change((s) => (s.companion.edge = v as 'left' | 'right')),
    ['left', 'right'],
  );
  ui.range('Vertical position', Math.round(s.companion.y * 100), 5, 95, (v) =>
    ui.change((s) => (s.companion.y = v / 100)),
  );
  for (const [name, edge, y] of [
    ['Top left', 'left', 0.08],
    ['Top right', 'right', 0.08],
    ['Bottom left', 'left', 0.92],
    ['Bottom right', 'right', 0.92],
  ] as const)
    ui.content.append(
      button(name, () =>
        ui.change((s) => {
          s.companion.edge = edge;
          s.companion.y = y;
        }),
      ),
    );
  ui.textArea(
    'Hide on websites · one domain per line',
    s.companion.exceptions.join('\n'),
    (value) => {
      const candidate = structuredClone(getSettings());
      candidate.companion.exceptions = [
        ...new Set(
          value
            .split(/\s+/)
            .filter(Boolean)
            .map((x) => x.toLowerCase()),
        ),
      ];
      validateSettings(candidate);
      ui.change((s) => (s.companion.exceptions = candidate.companion.exceptions));
    },
  );
  ui.content.append(
    button('Restore handles on hidden tabs', async () => {
      const saved = await chrome.storage.session.get(null);
      await chrome.storage.session.remove(
        Object.keys(saved).filter((k) => k.startsWith('nova.sideHidden.')),
      );
      toast('Hidden tab handles restored.');
    }),
  );
  ui.note(
    'Browser internal pages and the Chrome Web Store do not allow page overlays. Website access is requested only when enabling the handle.',
  );
}
