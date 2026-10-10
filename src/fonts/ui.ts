import { getSettings } from '../storage/settings';
import { putMedia } from '../storage/media';
import { el, button, toast } from '../shared/dom';
import { downloadFont } from './library';
import type { SettingsUI } from '../settings/ui';
export function renderFonts(ui: SettingsUI) {
  const input = el('input');
  input.placeholder = 'Search a font by name · e.g. Cairo';
  input.setAttribute('aria-label', 'Font family name');
  input.maxLength = 100;
  const list = el('datalist');
  list.id = 'font-families';
  for (const name of [
    'Cairo',
    'Tajawal',
    'Amiri',
    'Noto Sans Arabic',
    'Inter',
    'Roboto',
    'Orbitron',
    'Space Grotesk',
    'JetBrains Mono',
    'Rajdhani',
    'Poppins',
    'Nunito',
    'Montserrat',
    'Bebas Neue',
    'Share Tech Mono',
  ]) {
    const option = el('option');
    option.value = name;
    list.append(option);
  }
  input.setAttribute('list', list.id);
  const add = button('Find & download', async () => {
    if (getSettings().fonts.length >= 30) throw new Error('Maximum 30 custom fonts.');
    add.disabled = true;
    try {
      const font = await downloadFont(input.value);
      ui.change((s, p) => {
        s.fonts.push(font);
        p.appearance.customFontId = font.id;
        p.appearance.clockCustomFontId = font.id;
        p.appearance.font = 'custom';
        p.appearance.clockFont = 'custom';
      });
      toast('Font saved locally.');
      ui.redraw();
    } finally {
      add.disabled = false;
    }
  });
  const row = el('div', 'row');
  row.append(input, list, add);
  ui.content.append(row);
  ui.files('Import font file', '.woff2,.woff,.ttf,.otf', false, async ([file]) => {
    if (file.size > 5e6 || getSettings().fonts.length >= 30)
      throw new Error('Maximum 5 MB per font and 30 fonts.');
    const font = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^.]+$/, '').slice(0, 100),
      faces: [{ mediaId: await putMedia(file), unicodeRange: '' }],
    };
    // Verify the uploaded bytes before selecting the font.
    await new FontFace('NovaImportCheck', await file.arrayBuffer()).load();
    ui.change((s, p) => {
      s.fonts.push(font);
      p.appearance.customFontId = font.id;
      p.appearance.clockCustomFontId = font.id;
      p.appearance.font = 'custom';
      p.appearance.clockFont = 'custom';
    });
    ui.redraw();
  });
  ui.note('Google Fonts downloads run only when requested. Imported fonts stay on this device.');
  for (const font of getSettings().fonts) {
    const row = el('div', 'row saved-theme');
    row.append(
      el('span', '', font.name),
      button('Use in interface', () =>
        ui.change((_s, p) => {
          p.appearance.customFontId = font.id;
          p.appearance.font = 'custom';
        }),
      ),
      button('Use for clock', () =>
        ui.change((_s, p) => {
          p.appearance.clockCustomFontId = font.id;
          p.appearance.clockFont = 'custom';
        }),
      ),
      button('Delete', () => {
        ui.change((s) => (s.fonts = s.fonts.filter((f) => f.id !== font.id)));
        ui.redraw();
      }),
    );
    ui.content.append(row);
  }
}
