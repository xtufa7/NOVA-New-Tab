import {
  getSettings,
  replaceSettings,
  validateSettings,
  inExtension,
} from '../../storage/settings';
import { defaults, makeProfile } from '../schema';
import { el, button, toast, download } from '../../shared/dom';
import { clearMedia } from '../../storage/media';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const { files, note, heading, change, redraw } = ui;
  const content = ui.content;

  note(
    'Full backup includes settings, wallpaper videos, music, covers, fonts and tab icons. JSON remains available for settings only. Backups from versions 1–5 remain supported.',
  );
  const progress = el('p', 'settings-description');
  progress.setAttribute('role', 'status');
  content.append(progress);
  const full = button(
    'Export full backup · media included',
    async () => {
      full.disabled = true;
      try {
        const { fullBackup, downloadBackup } = await import('../../storage/full-backup');
        downloadBackup(
          await fullBackup((value) => {
            progress.textContent = value;
          }),
        );
      } finally {
        full.disabled = false;
      }
    },
    'primary',
  );
  content.append(full);
  files('Import full backup', '.nova,.zip', false, async ([file]) => {
    const { restoreFullBackup } = await import('../../storage/full-backup');
    if (
      await restoreFullBackup(
        file,
        async () =>
          confirm(
            'Restore validated settings and all bundled media? Current files remain until cleanup.',
          ),
        (value) => {
          progress.textContent = value;
        },
      )
    ) {
      redraw();
      toast('Full backup restored.');
    }
  });
  note(
    'Full media limit: 512 MB per archive. Files already missing from this device cannot be recovered by export.',
  );
  content.append(
    button(
      'Export configuration',
      () =>
        download(
          'nova-backup.json',
          JSON.stringify(
            {
              format: 'nova-backup',
              schemaVersion: 6,
              settings: getSettings(),
            },
            null,
            2,
          ),
        ),
      'primary',
    ),
  );
  files('Import configuration', '.json', false, async ([file]) => {
    if (file.size > 10e6) throw new Error('Backup too large (10 MB maximum).');
    const raw = JSON.parse(await file.text());
    if (raw.format && raw.format !== 'nova-backup') throw new Error('Wrong backup format.');
    const candidate = validateSettings(raw.settings ?? raw);
    if (!confirm('Replace current configuration with this validated backup?')) return;
    await replaceSettings(candidate);
    redraw();
    toast('Configuration imported.');
  });
  heading('Reset');
  content.append(
    button('Reset current profile', () => {
      if (!confirm('Reset current profile?')) return;
      change((s, p) => (s.profiles[s.profiles.indexOf(p)] = makeProfile(p.name, p.id)));
      redraw();
    }),
    button(
      'Factory Reset',
      async () => {
        if (!confirm('Factory Reset deletes all settings, sessions, and local media. Continue?'))
          return;
        if (inExtension) {
          const { musicCommand } = await import('../../music/client');
          await musicCommand('stop').catch(() => {});
        }
        await clearMedia();
        await replaceSettings(defaults());
        redraw();
        toast('Factory reset complete.');
      },
      'danger',
    ),
  );
}
