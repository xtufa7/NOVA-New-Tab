import { getSettings, getProfile } from '../storage/settings';
import { lookupLyrics, revealedLyric, lyricIndex, type LyricLine } from './lyrics';
import { el } from '../shared/dom';
import { animateLyric } from './lyric-animation';
export interface NowPlaying {
  title: string;
  artist: string;
  current: number;
  duration: number;
  playing: boolean;
  updatedAt: number;
}
export async function spotifyStatus(): Promise<NowPlaying | undefined> {
  const integration = getSettings().integrations;
  if (!integration.spotify || !globalThis.chrome?.runtime?.id) return;
  const storageKey =
    integration.spotifySource === 'desktop' ? 'nova.spotify.desktop' : 'nova.spotify';
  const s = (await chrome.storage.session.get(storageKey))[storageKey] as NowPlaying | undefined;
  if (s && Date.now() - s.updatedAt < 12000)
    return {
      ...s,
      current: Math.min(
        s.duration > 0 ? s.duration : Infinity,
        s.current + (s.playing ? (Date.now() - s.updatedAt) / 1000 : 0),
      ),
    };
}
export function mountTerminalLyrics() {
  const form = document.querySelector<HTMLElement>('#terminal-form');
  const input = document.querySelector<HTMLInputElement>('#terminal-input');
  if (!form || !input) return;
  const ribbon = el('div', 'terminal-lyrics lyric-slot');
  ribbon.hidden = true;
  ribbon.setAttribute('aria-label', 'Spotify synchronized lyrics');
  form.append(ribbon);
  const placeholder = input.placeholder;
  let timer: ReturnType<typeof setTimeout>,
    key = '',
    lines: LyricLine[] = [],
    retryAt = 0;
  let interacting = false,
    state: NowPlaying | undefined,
    loading = false,
    lastStatusRead = 0;
  function paint() {
    const integration = getSettings().integrations;
    const active =
      !!state?.playing &&
      integration.spotify &&
      integration.terminalLyrics &&
      integration.onlineLyrics;
    const current = state
      ? state.current +
        (state.playing ? (Date.now() - state.updatedAt) / 1000 : 0) +
        integration.lyricsOffset
      : 0;
    const fragment = active ? revealedLyric(lines, current) : { text: '', key: '', exact: false };
    const editing = document.body.classList.contains('editing');
    const busy = interacting || !!input!.value;
    ribbon.hidden = !fragment.text || busy;
    input!.placeholder = !ribbon.hidden ? '' : placeholder;
    document.querySelector('.prompt-host')!.textContent = !ribbon.hidden
      ? '@Spotify'
      : '@' + getProfile().terminal.hostname;
    if (!ribbon.hidden) {
      ribbon.style.left =
        Math.max(0, input!.getBoundingClientRect().left - form!.getBoundingClientRect().left) +
        'px';
      animateLyric(
        ribbon,
        fragment.text,
        key + lyricIndex(lines, current),
        integration.lyricsAnimation,
      );
      ribbon.title = fragment.exact ? 'Timed words' : 'Word reveal estimated from line timing';
    }
    const widget = document.querySelector<HTMLElement>('#widget-lyrics');
    if (widget) {
      widget.hidden = !editing && (!fragment.text || !busy);
      let display = widget.querySelector<HTMLElement>('.lyric-slot');
      if (!display) {
        display = el('div', 'lyric-slot');
        widget.append(display);
      }
      animateLyric(
        display,
        editing && !fragment.text ? 'Spotify lyrics · drag to move' : fragment.text,
        key + lyricIndex(lines, current) + String(editing),
        integration.lyricsAnimation,
      );
    }
  }
  async function poll() {
    clearTimeout(timer);
    if (document.hidden) return;
    const integration = getSettings().integrations;
    if (integration.spotify && !loading && Date.now() - lastStatusRead >= 900) {
      loading = true;
      lastStatusRead = Date.now();
      try {
        const incoming = await spotifyStatus();
        if (incoming) {
          const predicted = state
            ? state.current + (state.playing ? (Date.now() - state.updatedAt) / 1000 : 0)
            : incoming.current;
          const same =
            state?.title === incoming.title &&
            state.artist === incoming.artist &&
            state.playing === incoming.playing;
          if (same && incoming.playing && Math.abs(predicted - incoming.current) < 1.25)
            incoming.current = predicted;
          state = { ...incoming, updatedAt: Date.now() };
        } else if (state && Date.now() - state.updatedAt > 14000) state = undefined;
        if (state?.playing) {
          const next = JSON.stringify([
            state.title,
            state.artist,
            integration.spotifySource,
            integration.onlineLyrics,
          ]);
          if (next !== key || (!lines.length && Date.now() >= retryAt)) {
            key = next;
            retryAt = Date.now() + 30000;
            lines = [];
            if (integration.onlineLyrics)
              lines = await lookupLyrics(state.title, state.artist, state.duration);
          }
        }
      } finally {
        loading = false;
      }
    }
    paint();
    timer = setTimeout(() => void poll(), integration.spotify ? 120 : 3000);
  }
  input.addEventListener('pointerdown', () => {
    interacting = true;
    paint();
  });
  input.addEventListener('keydown', () => {
    interacting = true;
    paint();
  });
  input.addEventListener('blur', () => {
    interacting = false;
    paint();
  });
  input.addEventListener('input', paint);
  const resize = new ResizeObserver(paint);
  resize.observe(form);
  window.addEventListener('pagehide', () => resize.disconnect(), { once: true });
  document.addEventListener('nova-render', paint);
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (!document.hidden) void poll();
  });
  void poll();
}
