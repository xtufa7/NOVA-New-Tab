import { renderFonts } from '../../fonts/ui';
import { getProfile, getSettings } from '../../storage/settings';
import { themes, applyTheme } from '../schema';
import { el, button, toast } from '../../shared/dom';
import { fontFamily } from '../../newtab/appearance';
import { putMedia, getMedia } from '../../storage/media';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const { field, range, files, resetButton, change, redraw, group } = ui;
  const a = getProfile().appearance;
  const fonts = ['system', 'mono', 'serif', 'rounded', 'condensed', 'display', 'custom'];
  const gallery = el('div', 'theme-gallery');
  const galleryHeading = el('div', 'theme-gallery-heading');
  const expand = button('Show all', () => {
    const expanded = gallery.classList.toggle('theme-gallery-expanded');
    expand.textContent = expanded ? 'Collapse' : 'Show all';
    expand.setAttribute('aria-expanded', String(expanded));
  });
  expand.setAttribute('aria-expanded', 'false');
  galleryHeading.append(
    el('span', 'eyebrow', 'THEME LIBRARY · ' + Object.keys(themes).length),
    expand,
  );
  gallery.append(galleryHeading);
  const tiles = el('div', 'theme-tiles');
  for (const [name, theme] of Object.entries(themes)) {
    const b = button(
      '',
      () => {
        change((_s, p) => applyTheme(p, name));
        redraw();
      },
      'theme-tile',
    );
    b.setAttribute('aria-label', name);
    b.style.background = theme.gradient;
    b.style.color = theme.text;
    b.setAttribute('aria-pressed', String(a.theme === name));
    b.append(el('span', 'theme-time', '12:48'), el('span', 'theme-name', name));
    tiles.append(b);
  }
  gallery.append(
    tiles,
    el('span', 'theme-gallery-hint', Object.keys(themes).length + ' palettes · scroll to explore'),
  );
  ui.content.append(gallery);
  group(
    'Clock & caption',
    () => {
      const faces = el('div', 'clock-faces');
      for (const face of ['classic', 'neon', 'outline', 'gradient', 'retro', 'bold'] as const) {
        const b = button(
          '',
          () => {
            change((_s, p) => (p.appearance.clockFace = face));
            redraw();
          },
          'clock-face',
        );
        b.dataset.face = face;
        b.setAttribute('aria-label', 'Clock style ' + face);
        b.setAttribute('aria-pressed', String(a.clockFace === face));
        b.append(el('span', 'clock-sample', '12:48'), el('small', '', face));
        faces.append(b);
      }
      ui.content.append(faces);
      const font = field(
        'Clock font',
        'text',
        a.clockFont,
        (v) => change((_s, p) => (p.appearance.clockFont = String(v))),
        fonts,
      );
      for (const option of font.querySelectorAll('option'))
        option.style.fontFamily = fontFamily(option.value);
      field(
        'Clock format',
        'text',
        a.clockStyle,
        (v) => change((_s, p) => (p.appearance.clockStyle = v as typeof a.clockStyle)),
        ['24h', '12h', 'seconds'],
      );
      range(
        'Digit spacing',
        a.clockSpacing,
        -0.2,
        0.5,
        (v) => change((_s, p) => (p.appearance.clockSpacing = v)),
        0.01,
      );
      range('AM / PM size', a.meridiemSize, 8, 60, (v) =>
        change((_s, p) => (p.appearance.meridiemSize = v)),
      );
      field(
        'AM / PM placement',
        'text',
        a.meridiemPosition,
        (v) => change((_s, p) => (p.appearance.meridiemPosition = v as typeof a.meridiemPosition)),
        ['inline', 'below', 'hidden'],
      );
      const caption = field('Text below clock', 'text', a.clockCaption, (v) =>
        change((_s, p) => (p.appearance.clockCaption = String(v).slice(0, 200))),
      );
      (caption as HTMLInputElement).maxLength = 200;
      field('Show clock caption', 'checkbox', a.showClockCaption, (v) =>
        change((_s, p) => (p.appearance.showClockCaption = Boolean(v))),
      );
    },
    true,
  );
  group('Custom colors & saved themes', () => {
    for (const [label, key] of [
      ['Background color', 'color'],
      ['Accent color', 'accent'],
      ['Text color', 'text'],
    ] as const)
      field(label, 'color', a[key], (v) =>
        change((_s, p) => {
          p.appearance[key] = String(v);
          p.appearance.theme = 'custom';
          if (p.appearance.background === 'gradient' && key !== 'text')
            p.appearance.gradient = `radial-gradient(ellipse at 50% 15%, color-mix(in srgb, ${p.appearance.accent} 25%, ${p.appearance.color}), ${p.appearance.color} 70%)`;
        }),
      );
    field('Gradient', 'text', a.gradient, (v) => {
      if (!CSS.supports('background-image', String(v))) throw new Error('Invalid gradient.');
      change((_s, p) => {
        p.appearance.gradient = String(v);
        p.appearance.theme = 'custom';
        p.appearance.background = 'gradient';
      });
    });
    const row = el('div', 'row');
    const name = el('input');
    name.placeholder = 'Theme name';
    name.setAttribute('aria-label', 'Theme name');
    name.maxLength = 80;
    row.append(
      name,
      button('Save theme', () => {
        if (!name.value.trim()) throw new Error('Name your theme.');
        if (getSettings().customThemes.length >= 30) throw new Error('Maximum 30 saved themes.');
        change((s, p) =>
          s.customThemes.push({
            id: crypto.randomUUID(),
            name: name.value.trim(),
            appearance: structuredClone(p.appearance),
          }),
        );
        toast('Theme saved.');
        redraw();
      }),
    );
    ui.content.append(row);
    for (const t of getSettings().customThemes) {
      const row = el('div', 'row saved-theme');
      const swatch = el('i');
      swatch.style.background = t.appearance.gradient;
      row.append(
        swatch,
        button(t.name, () => {
          change((_s, p) => (p.appearance = structuredClone(t.appearance)));
          redraw();
        }),
        button('Delete', () => {
          change((s) => (s.customThemes = s.customThemes.filter((x) => x.id !== t.id)));
          redraw();
        }),
      );
      ui.content.append(row);
    }
  });
  group(
    'Background & local media',
    () => {
      ui.note(
        'Choose a background type, then upload your own image or video. Your file stays on this device.',
      );
      const types = el('div', 'background-types');
      for (const [kind, symbol, hint] of [
        ['solid', '◼', 'A clean canvas'],
        ['gradient', '◒', 'Soft color blends'],
        ['image', '▧', 'Your own wallpaper'],
        ['video', '▷', 'A moving background'],
      ] as const) {
        const tile = button(
          '',
          () => {
            change((_s, p) => {
              p.appearance.background = kind;
            });
            redraw();
          },
          'background-type',
        );
        tile.setAttribute('aria-label', 'Background ' + kind);
        tile.setAttribute('aria-pressed', String(a.background === kind));
        tile.append(el('span', '', symbol), el('strong', '', kind), el('small', '', hint));
        types.append(tile);
      }
      ui.content.append(types);
      const preview = el('div', 'background-preview');
      preview.style.background = a.background === 'gradient' ? a.gradient : a.color;
      const previewClock = el('span', 'background-preview-clock', '12:48');
      const badge = el(
        'span',
        'background-preview-label',
        a.background.toUpperCase() + ' · PREVIEW',
      );
      preview.append(previewClock, badge);
      ui.content.append(preview);
      if (a.mediaId && ['image', 'video'].includes(a.background))
        void getMedia(a.mediaId).then((blob) => {
          if (!blob || !preview.isConnected) return;
          const url = URL.createObjectURL(blob);
          const media = a.background === 'video' ? el('video') : el('img');
          media.src = url;
          if (media instanceof HTMLVideoElement) {
            media.muted = true;
            media.loop = true;
            media.controls = true;
          }
          if (media instanceof HTMLImageElement)
            media.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
          else {
            const cleanup = new MutationObserver(() => {
              if (!preview.isConnected) {
                URL.revokeObjectURL(url);
                cleanup.disconnect();
              }
            });
            cleanup.observe(document.body, { childList: true, subtree: true });
          }
          preview.prepend(media);
          badge.textContent = `${a.background.toUpperCase()} · ${(blob.size / 1048576).toFixed(1)} MB · LOCAL`;
        });
      const upload = async ([file]: File[]) => {
        if (!/^(image|video)\//.test(file.type)) throw new Error('Choose an image or video.');
        if (file.size > 250 * 1024 * 1024) throw new Error('Maximum 250 MB.');
        const id = await putMedia(file);
        change((_s, p) => {
          p.appearance.mediaId = id;
          p.appearance.background = file.type.startsWith('video') ? 'video' : 'image';
        });
        redraw();
      };
      if (a.background === 'image' || a.background === 'video') {
        const drop = files(
          a.mediaId
            ? 'Replace wallpaper · click or drop a file'
            : 'Choose wallpaper · click or drop a file',
          a.background === 'image' ? 'image/*' : 'video/*',
          false,
          upload,
        );
        drop.classList.add('wallpaper-drop');
        drop.addEventListener('dragover', (event) => {
          event.preventDefault();
          drop.classList.add('dragover');
        });
        drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
        drop.addEventListener('drop', (event) => {
          event.preventDefault();
          drop.classList.remove('dragover');
          const file = event.dataTransfer?.files[0];
          if (file) void upload([file]).catch((error) => toast(String(error)));
        });
        if (a.mediaId)
          ui.content.append(
            button('Remove selected wallpaper', () => {
              change((_s, p) => {
                p.appearance.mediaId = '';
                p.appearance.background = 'gradient';
              });
              redraw();
            }),
          );
      }
      for (const [label, key, max] of [
        ['Background opacity', 'opacity', 100],
        ['Background blur', 'blur', 40],
        ['Brightness', 'brightness', 200],
        ['Contrast', 'contrast', 200],
        ['Saturation', 'saturation', 200],
      ] as const)
        range(label, a[key], 0, max, (v) => change((_s, p) => (p.appearance[key] = v)));
      if (a.background === 'video') {
        field('Loop video', 'checkbox', a.videoLoop, (v) =>
          change((_s, p) => (p.appearance.videoLoop = Boolean(v))),
        );
        range(
          'Video speed',
          a.videoSpeed,
          0.25,
          2,
          (v) => change((_s, p) => (p.appearance.videoSpeed = v)),
          0.25,
        );
      }
    },
    true,
  );
  group('Browser tab · title & GIF icon', () => {
    const tab = getSettings().tab;
    const figure = el('figure', 'tab-help');
    const image = el('img');
    image.src = 'help/tab-customization.png';
    image.alt = 'Browser tab: icon on the left and NØVA title beside it';
    figure.append(
      image,
      el(
        'figcaption',
        '',
        'This is the browser tab, above your New Tab. Customize its title and the small icon on the left.',
      ),
    );
    ui.content.append(figure);
    field('Tab title', 'text', tab.title, (v) =>
      change((s) => {
        s.tab.title = String(v).trim().slice(0, 80) || 'NØVA';
      }),
    );
    field(
      'Title animation',
      'text',
      tab.animation,
      (v) =>
        change((s) => {
          s.tab.animation = v as typeof tab.animation;
        }),
      ['off', 'typewriter', 'scroll'],
    );
    range(
      'Animation speed (ms)',
      tab.speed,
      100,
      2000,
      (v) =>
        change((s) => {
          s.tab.speed = v;
        }),
      50,
    );
    files(
      'Upload tab icon · PNG / GIF / ICO / WebP',
      'image/png,image/gif,image/webp,image/x-icon,image/vnd.microsoft.icon,.ico',
      false,
      async ([file]) => {
        if (!/\.(png|gif|webp|ico)$/i.test(file.name) || file.size > 10 * 1048576)
          throw new Error('Choose PNG, GIF, WebP or ICO below 10 MB.');
        const id = await putMedia(
          new Blob([file], { type: /\.gif$/i.test(file.name) ? 'image/gif' : file.type }),
        );
        change((s) => {
          s.tab.iconId = id;
        });
        redraw();
      },
    );
    field('Animate GIF tab icon', 'checkbox', tab.animateIcon, (v) =>
      change((s) => {
        s.tab.animateIcon = Boolean(v);
      }),
    );
    ui.content.append(
      button('Reset tab icon', () => {
        change((s) => {
          s.tab.iconId = '';
        });
        redraw();
      }),
    );
    ui.note(
      'Title and icon animation pause in hidden tabs and Low Power Mode. The icon remains static if this browser cannot animate it.',
    );
  });
  group('Custom font library', () => renderFonts(ui));
  group('Typography & surfaces', () => {
    field('Font', 'text', a.font, (v) => change((_s, p) => (p.appearance.font = String(v))), fonts);
    range('Font size', a.fontSize, 10, 24, (v) => change((_s, p) => (p.appearance.fontSize = v)));
    for (const [label, key, max] of [
      ['Panel opacity', 'panelOpacity', 100],
      ['Border radius', 'radius', 48],
      ['Shadow', 'shadow', 40],
      ['Glow', 'glow', 30],
    ] as const)
      range(label, a[key], 0, max, (v) => change((_s, p) => (p.appearance[key] = v)));
    field(
      'Cursor',
      'text',
      a.cursor,
      (v) => change((_s, p) => (p.appearance.cursor = v as typeof a.cursor)),
      ['default', 'crosshair', 'dot'],
    );
    field('Show header controls', 'checkbox', a.showHeader, (v) =>
      change((_s, p) => (p.appearance.showHeader = Boolean(v))),
    );
    field('Show terminal hints', 'checkbox', a.showTerminalHints, (v) =>
      change((_s, p) => (p.appearance.showTerminalHints = Boolean(v))),
    );
  });
  resetButton('Appearance');
}
