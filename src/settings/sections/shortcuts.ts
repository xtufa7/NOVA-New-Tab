import { getProfile, getSettings } from '../../storage/settings';
import { el, button, safeURL, shortcut } from '../../shared/dom';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const section = 'Shortcuts';
  const { field, files, note, heading, resetButton, change, redraw } = ui;
  let content = ui.content;
  const p = getProfile();
  const s = getSettings();

  field('Show labels', 'checkbox', p.linksOptions.labels, (v) =>
    change((_s, p) => (p.linksOptions.labels = Boolean(v))),
  );
  field('Icon only', 'checkbox', p.linksOptions.iconsOnly, (v) =>
    change((_s, p) => (p.linksOptions.iconsOnly = Boolean(v))),
  );
  field('Compact', 'checkbox', p.linksOptions.compact, (v) =>
    change((_s, p) => (p.linksOptions.compact = Boolean(v))),
  );
  heading('Quick links');
  content.append(
    button('+ Add link', () => {
      change((_s, p) =>
        p.links.push({
          id: crypto.randomUUID(),
          title: 'New link',
          url: 'https://example.com',
          icon: '↗',
          favicon: false,
          shortcut: '',
          newTab: false,
          alias: '',
          group: '',
        }),
      );
      redraw();
    }),
  );
  note(
    'Drag links on the New Tab to reorder, or use ↑ / ↓ below. Favicons contact the destination website only when explicitly enabled.',
  );
  p.links.forEach((link, index) => {
    const card = el('div', 'settings-card');
    content.append(card);
    const holder = content;
    ui.content = content = card;
    const row = el('div', 'row');
    row.append(el('strong', '', link.title), el('div', 'row'));
    row.lastElementChild!.append(
      button('↑', () => {
        if (index > 0)
          change(
            (_s, p) =>
              ([p.links[index - 1], p.links[index]] = [p.links[index], p.links[index - 1]]),
          );
        redraw();
      }),
      button('↓', () => {
        if (index < p.links.length - 1)
          change(
            (_s, p) =>
              ([p.links[index + 1], p.links[index]] = [p.links[index], p.links[index + 1]]),
          );
        redraw();
      }),
      button('Copy', () => {
        change((_s, p) =>
          p.links.push({
            ...link,
            id: crypto.randomUUID(),
            title: link.title + ' copy',
          }),
        );
        redraw();
      }),
      button('×', () => {
        change((_s, p) => (p.links = p.links.filter((l) => l.id !== link.id)));
        redraw();
      }),
    );
    card.append(row);
    const edit = (key: keyof typeof link, value: string | boolean) =>
      change((_s, p) => {
        const l = p.links.find((l) => l.id === link.id);
        if (l) Object.assign(l, { [key]: value });
      });
    for (const [label, key] of [
      ['Title', 'title'],
      ['URL', 'url'],
      ['Icon / character', 'icon'],
      ['Command alias', 'alias'],
      ['Folder / group', 'group'],
      ['Keyboard shortcut', 'shortcut'],
    ] as const)
      field(label, 'text', link[key], (v) =>
        edit(
          key,
          key === 'url' ? safeURL(String(v)) : String(v).slice(0, key === 'title' ? 100 : 80),
        ),
      );
    field('Open new tab', 'checkbox', link.newTab, (v) => edit('newTab', Boolean(v)));
    field('Use site favicon', 'checkbox', link.favicon, (v) => edit('favicon', Boolean(v)));
    files('Upload icon', 'image/png,image/jpeg,image/webp,image/gif', false, async ([file]) => {
      if (file.size > 100000) throw new Error('Use an icon below 100 KB.');
      const value = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      edit('icon', value);
      edit('favicon', false);
    });
    ui.content = content = holder;
  });
  resetButton(section);

  heading('Application shortcuts');
  for (const key of ['settings', 'edit'] as const) {
    const row = el('div', 'field');
    row.append(el('span', '', key === 'settings' ? 'Control center' : 'Edit Mode'));
    const capture = button(
      s.shortcuts[key],
      () => {
        capture.textContent = 'Press shortcut…';
        const listener = (event: KeyboardEvent) => {
          event.preventDefault();
          event.stopPropagation();
          if (event.key === 'Escape') capture.textContent = s.shortcuts[key];
          else if (!['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
            const value = shortcut(event);
            change((s) => (s.shortcuts[key] = value));
            capture.textContent = value;
          } else return;
          capture.removeEventListener('keydown', listener);
        };
        capture.addEventListener('keydown', listener);
      },
      'shortcut-capture',
    );
    row.append(capture);
    content.append(row);
  }
}
