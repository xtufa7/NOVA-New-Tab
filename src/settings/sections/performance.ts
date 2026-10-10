import { getSettings } from '../../storage/settings';
import { type Settings } from '../schema';
import type { SettingsUI } from '../ui';
import { el, button } from '../../shared/dom';
import { animateEntrance, enterWorkspace, entranceStatus } from '../../newtab/entrance';
export function render(ui: SettingsUI) {
  const section = 'Performance';
  const { field, note, resetButton, change } = ui;
  const s = getSettings();
  ui.group(
    'Opening animation',
    () => {
      const c = s.entrance;
      const status = el('p', 'motion-status', entranceStatus());
      ui.content.append(status);
      const preview = el('div', 'motion-preview');
      const pieces = ['NØVA', '12:34', 'Your workspace'].map((text) => el('span', '', text));
      preview.append(...pieces);
      let running: Animation[] = [];
      const play = () => {
        running.forEach((a) => a.cancel());
        status.textContent = entranceStatus();
        if (
          getSettings().entrance.respectSystem &&
          matchMedia('(prefers-reduced-motion: reduce)').matches
        )
          return;
        running = animateEntrance(pieces, getSettings().entrance);
      };
      const update = (action: (settings: Settings) => void) => {
        change(action);
        play();
      };
      field('Enable opening animation', 'checkbox', c.enabled, (v) =>
        update((s) => (s.entrance.enabled = Boolean(v))),
      );
      field('Respect system reduced motion for opening', 'checkbox', c.respectSystem, (v) =>
        update((s) => (s.entrance.respectSystem = Boolean(v))),
      );
      field(
        'Opening style',
        'text',
        c.style,
        (v) => update((s) => (s.entrance.style = v as Settings['entrance']['style'])),
        ['rise+blur', 'rise', 'fade', 'zoom', 'slide'],
      );
      field(
        'Opening easing',
        'text',
        c.easing,
        (v) => update((s) => (s.entrance.easing = v as Settings['entrance']['easing'])),
        ['smooth', 'ease-out', 'linear'],
      );
      ui.range(
        'Opening duration (ms)',
        c.duration,
        150,
        2000,
        (v) => update((s) => (s.entrance.duration = v)),
        50,
      );
      ui.range(
        'Opening stagger (ms)',
        c.stagger,
        0,
        250,
        (v) => update((s) => (s.entrance.stagger = v)),
        10,
      );
      ui.range(
        'Opening delay (ms)',
        c.delay,
        0,
        1500,
        (v) => update((s) => (s.entrance.delay = v)),
        50,
      );
      ui.range('Opening distance (px)', c.distance, 0, 100, (v) =>
        update((s) => (s.entrance.distance = v)),
      );
      ui.range('Opening blur strength (px)', c.blur, 0, 24, (v) =>
        update((s) => (s.entrance.blur = v)),
      );
      field('Animate header', 'checkbox', c.header, (v) =>
        update((s) => (s.entrance.header = Boolean(v))),
      );
      field('Animate widgets', 'checkbox', c.widgets, (v) =>
        update((s) => (s.entrance.widgets = Boolean(v))),
      );
      field('Animate wallpaper', 'checkbox', c.background, (v) =>
        update((s) => (s.entrance.background = Boolean(v))),
      );
      ui.content.append(
        preview,
        button('Replay opening preview', play),
        button('Replay on New Tab', () => {
          ui.close();
          requestAnimationFrame(() => enterWorkspace());
        }),
      );
      note(
        'Opening motion has its own settings. General Animations can stay off. Low Power pauses it; system reduced motion follows the checkbox above. Preview is a demo; Replay on New Tab uses your enabled targets.',
      );
      play();
    },
    true,
  );
  ui.group(
    'Page memory',
    () => {
      field('Show page memory under terminal', 'checkbox', s.memory.enabled, (v) =>
        change((settings) => {
          settings.memory.enabled = Boolean(v);
        }),
      );
      note(
        'Without a native helper, stable Chromium exposes only this page’s JavaScript heap. The label says New Tab heap and never pretends it is total browser RAM.',
      );
    },
    true,
  );

  field('Low Power Mode', 'checkbox', s.performance.lowPower, (v) =>
    change((s) => (s.performance.lowPower = Boolean(v))),
  );
  field(
    'Animations',
    'text',
    s.performance.animations,
    (v) => change((s) => (s.performance.animations = v as Settings['performance']['animations'])),
    ['full', 'reduced', 'off'],
  );
  field(
    'Blur',
    'text',
    s.performance.blur,
    (v) => change((s) => (s.performance.blur = v as Settings['performance']['blur'])),
    ['high', 'medium', 'low', 'off'],
  );
  field(
    'Background video',
    'text',
    s.performance.video,
    (v) => change((s) => (s.performance.video = v as Settings['performance']['video'])),
    ['full', 'reduced', 'off'],
  );
  field('Particles', 'checkbox', s.performance.particles, (v) =>
    change((s) => (s.performance.particles = Boolean(v))),
  );
  field('Audio visualizer', 'checkbox', s.performance.visualizer, (v) =>
    change((s) => (s.performance.visualizer = Boolean(v))),
  );
  note('Low Power Mode pauses visual effects and video. Hidden tabs pause background work.');
  resetButton(section);
}
