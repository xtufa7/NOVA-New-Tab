import { resolvePalette } from '../website/model';
import { tokenPalette } from '../themes/tokens';
import { getSettings, getProfile } from '../storage/settings';
import { getMedia } from '../storage/media';
import { el } from '../shared/dom';
import { fontFamily } from '../fonts/family';
export { fontFamily } from '../fonts/family';
let mediaURL = '';
let lastMedia = '';
let generation = 0;
export async function renderAppearance() {
  const base = getProfile().appearance,
    suite = getSettings().suite;
  const id = suite.adaptive.enabled
    ? resolvePalette(
        suite,
        getProfile().id,
        new Date(),
        matchMedia('(prefers-color-scheme: dark)').matches,
      )
    : base.theme;
  const palette = tokenPalette(id, suite.website.custom);
  const a = suite.adaptive.enabled
      ? {
          ...base,
          color: palette.tokens.base,
          accent: palette.tokens.accent,
          text: palette.tokens.text,
          gradient: palette.tokens.gradient,
        }
      : base,
    perf = getSettings().performance;
  const root = document.documentElement,
    body = document.body;
  const header = document.querySelector<HTMLElement>('.masthead');
  if (header) header.hidden = !a.showHeader;
  document
    .querySelectorAll<HTMLElement>('.terminal-help,.input-hint')
    .forEach((n) => (n.hidden = !a.showTerminalHints));
  document
    .querySelectorAll<HTMLElement>('.clock-widget .eyebrow')
    .forEach((n) => (n.hidden = !a.showClockCaption));
  body.dataset.clockFace = a.clockFace;
  root.style.setProperty('--clock-font', fontFamily(a.clockFont));
  root.style.setProperty('--clock-spacing', a.clockSpacing + 'em');
  root.style.setProperty('--meridiem-size', a.meridiemSize + '%');
  document
    .querySelectorAll<HTMLElement>('.clock-widget .eyebrow')
    .forEach((n) => (n.textContent = a.clockCaption));
  const blurLimit = perf.lowPower ? 0 : { high: 40, medium: 12, low: 4, off: 0 }[perf.blur];
  const variables: Record<string, string> = {
    '--bg': a.color,
    '--accent': a.accent,
    '--text': a.text,
    '--radius': a.radius + 'px',
    '--font-size': a.fontSize + 'px',
    '--panel': `color-mix(in srgb, ${a.color} ${a.panelOpacity}%, transparent)`,
    '--shadow': a.shadow + 'px',
    '--glow': perf.lowPower ? '0px' : a.glow + 'px',
    '--panel-filter':
      Math.min(a.blur, blurLimit) > 0 ? `blur(${Math.min(a.blur, blurLimit)}px)` : 'none',
    '--font': fontFamily(a.font),
  };
  for (const [key, value] of Object.entries(variables)) root.style.setProperty(key, value);
  const { applyFonts } = await import('../fonts/library');
  await applyFonts();
  root.style.colorScheme = a.theme === 'frost' || id === 'latte' ? 'light' : 'dark';
  for (const [k, v] of Object.entries(palette.tokens)) root.style.setProperty('--nova-' + k, v);
  body.dataset.animations = perf.lowPower ? 'off' : perf.animations;
  body.dataset.cursor = a.cursor;
  let custom = document.querySelector<HTMLStyleElement>('#custom-css');
  if (!custom) {
    custom = el('style');
    custom.id = 'custom-css';
    document.head.append(custom);
  }
  custom.textContent = document.querySelector('#canvas') && a.cssEnabled ? a.customCSS : '';
  const bg = document.querySelector<HTMLElement>('#background');
  if (!bg) return;
  bg.style.background = a.background === 'gradient' ? a.gradient : a.color;
  bg.style.opacity = String(a.opacity / 100);
  bg.style.setProperty('--wallpaper-opacity', String(a.opacity / 100));
  bg.style.filter =
    perf.lowPower ||
    (Math.min(a.blur, blurLimit) === 0 &&
      a.brightness === 100 &&
      a.contrast === 100 &&
      a.saturation === 100)
      ? 'none'
      : `blur(${Math.min(a.blur, blurLimit)}px) brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%)`;
  const desired = `${a.background}:${a.mediaId}:${perf.lowPower}:${perf.video}`;
  if (desired !== lastMedia) {
    lastMedia = desired;
    const run = ++generation;
    bg.dataset.mediaReady = 'pending';
    bg.replaceChildren();
    if (mediaURL) {
      URL.revokeObjectURL(mediaURL);
      mediaURL = '';
    }
    if (
      a.mediaId &&
      (a.background === 'image' ||
        (a.background === 'video' && perf.video !== 'off' && !perf.lowPower))
    ) {
      const blob = await getMedia(a.mediaId).catch(() => undefined);
      if (run !== generation) return;
      if (blob) {
        mediaURL = URL.createObjectURL(blob);
        const media = el(a.background === 'video' ? 'video' : 'img');
        media.src = mediaURL;
        if (media instanceof HTMLVideoElement) {
          media.muted = true;
          media.autoplay = true;
          media.playsInline = true;
          media.preload = perf.video === 'reduced' ? 'metadata' : 'auto';
          media.loop = a.videoLoop;
          media.playbackRate = a.videoSpeed;
          media.style.objectFit = 'cover';
        }
        bg.append(media);
        const done = () => {
          if (run !== generation) return;
          bg.dataset.mediaReady = 'ready';
          document.dispatchEvent(new Event('nova-background-ready'));
        };
        const timer = setTimeout(done, 1800);
        const ready = () => {
          clearTimeout(timer);
          done();
        };
        media.addEventListener('error', ready, { once: true });
        if (media instanceof HTMLImageElement)
          void media
            .decode()
            .catch(() => {})
            .then(ready);
        else {
          media.addEventListener(
            'loadeddata',
            () => {
              if ('requestVideoFrameCallback' in media) media.requestVideoFrameCallback(ready);
              else ready();
            },
            { once: true },
          );
        }
      }
    }
  }
  if (!bg.querySelector('video,img')) {
    bg.dataset.mediaReady = 'ready';
    document.dispatchEvent(new Event('nova-background-ready'));
  }
  const video = bg.querySelector('video');
  if (video) {
    video.loop = a.videoLoop;
    video.playbackRate = a.videoSpeed;
    if (document.hidden) video.pause();
    else void video.play().catch(() => {});
  }
  let particles = bg.querySelector('.particle-layer');
  if (
    perf.particles &&
    !perf.lowPower &&
    perf.animations === 'full' &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    if (!particles) {
      particles = el('div', 'particle-layer');
      for (let i = 0; i < 16; i++) {
        const dot = el('i');
        dot.style.left = ((i * 47) % 100) + '%';
        dot.style.top = ((i * 31) % 100) + '%';
        dot.style.animationDelay = -i + 's';
        particles.append(dot);
      }
      bg.append(particles);
    }
  } else particles?.remove();
}
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('page-hidden', document.hidden);
  const video = document.querySelector<HTMLVideoElement>('#background video');
  if (document.hidden) video?.pause();
  else if (video) void video.play().catch(() => {});
});

window.addEventListener('pagehide', () => {
  document.querySelector<HTMLVideoElement>('#background video')?.pause();
  if (mediaURL) {
    URL.revokeObjectURL(mediaURL);
    mediaURL = '';
    lastMedia = '';
    generation++;
  }
});
window.addEventListener('pageshow', (e) => {
  if (e.persisted) void renderAppearance();
});
