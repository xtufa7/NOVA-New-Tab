import { getSettings, replaceSettings, validateSettings } from '../../storage/settings';
import { makeProfile } from '../schema';
import { el, button, download } from '../../shared/dom';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const { files, change, redraw } = ui;
  const content = ui.content;
  const s = getSettings();

  const intro = el('div', 'settings-intro');
  intro.append(
    el('strong', '', `${s.profiles.length} workspace${s.profiles.length === 1 ? '' : 's'}`),
    el('p', '', 'Switch between independent themes, layouts, notes and music libraries.'),
  );
  content.append(intro);
  ui.group(
    'Create a workspace',
    () => {
      const name = el('input');
      name.placeholder = 'Workspace name';
      name.maxLength = 80;
      name.setAttribute('aria-label', 'New profile name');
      const row = el('div', 'profile-create');
      const create = () => {
        if (!name.value.trim()) throw new Error('Enter a workspace name.');
        change((s) => {
          const profile = makeProfile(name.value.trim().slice(0, 80));
          s.profiles.push(profile);
          s.activeProfile = profile.id;
        });
        redraw();
      };
      name.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') create();
      });
      row.append(name, button('Create workspace', create, 'primary'));
      ui.content.append(row);
    },
    true,
  );
  const grid = el('div', 'profile-grid');
  content.append(grid);
  for (const profile of s.profiles) {
    const active = profile.id === s.activeProfile;
    const card = el('article', 'profile-card');
    card.dataset.active = String(active);
    const swatch = el('div', 'profile-swatch');
    swatch.style.background = profile.appearance.gradient;
    swatch.append(el('span', '', profile.name.slice(0, 1).toUpperCase()));
    const header = el('div', 'profile-card-heading');
    header.append(
      swatch,
      el('strong', '', profile.name),
      el('span', 'status-badge', active ? 'Active' : 'Workspace'),
    );
    const stats = el(
      'p',
      'profile-stats',
      `${profile.appearance.theme} theme · ${profile.music.tracks.length} tracks`,
    );
    const actions = el('div', 'profile-actions');
    const switchButton = button(
      active ? 'Current workspace' : 'Use workspace',
      () => {
        change((s) => (s.activeProfile = profile.id));
        redraw();
      },
      active ? '' : 'primary',
    );
    switchButton.disabled = active;
    actions.append(
      switchButton,
      button('Duplicate', () => {
        change((s) => {
          const copy = structuredClone(profile);
          copy.id = crypto.randomUUID();
          copy.name = (copy.name + ' copy').slice(0, 80);
          s.profiles.push(copy);
        });
        redraw();
      }),
      button('Export', () =>
        download(
          'nova-' + profile.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-') + '.json',
          JSON.stringify({ format: 'nova-profile', schemaVersion: 3, profile }, null, 2),
        ),
      ),
    );
    const rename = el('details', 'profile-rename');
    rename.append(el('summary', '', 'Rename workspace'));
    const input = el('input');
    input.value = profile.name;
    input.maxLength = 80;
    input.setAttribute('aria-label', `Rename ${profile.name}`);
    rename.append(
      input,
      button('Save name', () => {
        if (!input.value.trim()) throw new Error('Enter a workspace name.');
        change((s) => (s.profiles.find((p) => p.id === profile.id)!.name = input.value.trim()));
        redraw();
      }),
    );
    const remove = button(
      'Delete workspace',
      () => {
        if (!confirm('Delete ' + profile.name + '?')) return;
        change((s) => {
          s.profiles = s.profiles.filter((p) => p.id !== profile.id);
          if (s.activeProfile === profile.id) s.activeProfile = s.profiles[0].id;
        });
        redraw();
      },
      'quiet-danger',
    );
    remove.disabled = s.profiles.length === 1;
    remove.title = remove.disabled ? 'Keep at least one workspace.' : 'Delete this workspace';
    card.append(header, stats, actions, rename, remove);
    grid.append(card);
  }
  ui.heading('Transfer & reset');
  files('Import profile', '.json', false, async ([file]) => {
    if (file.size > 5e6) throw new Error('Profile too large.');
    const raw = JSON.parse(await file.text());
    if (raw.format !== 'nova-profile' || ![1, 2, 3].includes(raw.schemaVersion))
      throw new Error('Unsupported profile format.');
    const candidate = structuredClone(getSettings());
    raw.profile.id = crypto.randomUUID();
    candidate.profiles.push(raw.profile);
    validateSettings(candidate);
    await replaceSettings(candidate);
    redraw();
  });
  content.append(
    button('Reset active profile', () => {
      if (!confirm('Reset this profile?')) return;
      change((s, p) => (s.profiles[s.profiles.indexOf(p)] = makeProfile(p.name, p.id)));
      redraw();
    }),
  );
}
