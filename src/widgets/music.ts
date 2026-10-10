import { el, button, report } from '../shared/dom';
import { musicCommand, type MusicStatus } from '../music/client';
import { getMedia } from '../storage/media';
import { getSettings, getProfile } from '../storage/settings';
import { lookupLyrics, paintLyrics, type LyricLine } from '../music/lyrics';
import { spotifyStatus } from '../music/spotify';
const time = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
export async function mount(node: HTMLElement): Promise<() => void> {
  let disposed = false,
    timer: ReturnType<typeof setTimeout>,
    coverURL = '',
    coverId = '';
  let lyricsKey = '',
    lyricLines: LyricLine[] = [],
    lyricsSequence = 0;
  const heading = el('h2', '', 'Your soundtrack'),
    info = el('div', 'music-info'),
    cover = el('img', 'music-cover');
  cover.alt = 'Cover art';
  cover.hidden = true;
  const placeholder = el('span', 'music-art-placeholder', '♫');
  placeholder.setAttribute('aria-hidden', 'true');
  const text = el('div'),
    title = el('p', 'music-title', 'Nothing playing'),
    artist = el('p', 'music-artist', 'Add local files in Music settings.');
  text.append(title, artist);
  info.append(placeholder, cover, text);
  const controls = el('div', 'music-controls'),
    play = el('button', '', '▶');
  play.type = 'button';
  play.setAttribute('aria-label', 'Play or pause');
  let playing = false;
  play.onclick = () =>
    void musicCommand(playing ? 'pause' : 'play')
      .then(paint)
      .catch(report);
  const shuffle = button('⤨', () => musicCommand('shuffle').then(paint)),
    repeat = button('↻', () => musicCommand('repeat').then(paint)),
    mute = button('♪', () => musicCommand('mute').then(paint));
  shuffle.title = 'Shuffle';
  repeat.title = 'Repeat';
  mute.title = 'Mute';
  const volume = el('input', 'music-volume');
  volume.type = 'range';
  volume.min = '0';
  volume.max = '100';
  volume.setAttribute('aria-label', 'Volume');
  volume.addEventListener(
    'change',
    () => void musicCommand('volume', Number(volume.value)).then(paint).catch(report),
  );
  controls.append(
    button('◀', () => musicCommand('prev').then(paint)),
    play,
    button('▶|', () => musicCommand('next').then(paint)),
    shuffle,
    repeat,
    mute,
    volume,
  );
  controls
    .querySelectorAll('button')
    .forEach((b, i) =>
      b.setAttribute(
        'aria-label',
        ['Previous track', 'Play or pause', 'Next track', 'Shuffle', 'Repeat', 'Mute'][i],
      ),
    );
  const seek = el('input', 'music-progress');
  seek.type = 'range';
  seek.min = '0';
  seek.max = '0';
  seek.step = '1';
  seek.setAttribute('aria-label', 'Seek');
  seek.addEventListener(
    'change',
    () => void musicCommand('seek', Number(seek.value)).then(paint).catch(report),
  );
  const timing = el('div', 'music-timing'),
    elapsed = el('span', '', '0:00'),
    duration = el('span', '', '0:00');
  timing.append(elapsed, duration);
  const bars = el('div', 'visualizer');
  for (let i = 0; i < 16; i++) bars.append(el('i'));
  const lyrics = el('div', 'music-lyrics');
  const spotifyPanel = el('div', 'spotify-player-panel');
  const spotifyTitle = el('p', 'spotify-player-title');
  const spotifyLyrics = el('div', 'music-lyrics');
  spotifyPanel.append(spotifyTitle, spotifyLyrics);
  spotifyPanel.hidden = true;
  let spotifyKey = '',
    spotifyLines: LyricLine[] = [],
    retryLyricsAt = 0;
  lyrics.hidden = true;
  lyrics.setAttribute('aria-label', 'Synchronized song lyrics');
  node.replaceChildren(heading, info, controls, seek, timing, bars, lyrics, spotifyPanel);
  function paint(s: MusicStatus) {
    if (disposed) return;
    const hiddenForAudio = s.ducked && spotifyPanel.hidden;
    node.classList.toggle('music-ducked', hiddenForAudio);
    node.inert = hiddenForAudio;
    node.setAttribute('aria-hidden', String(hiddenForAudio));
    playing = s.playing;
    title.textContent = s.title;
    artist.textContent = s.artist;
    play.textContent = s.playing ? '❚❚' : '▶';
    shuffle.setAttribute('aria-pressed', String(s.shuffle));
    repeat.title = 'Repeat: ' + s.repeat;
    repeat.setAttribute('aria-pressed', String(s.repeat !== 'off'));
    mute.setAttribute('aria-pressed', String(s.muted));
    volume.value = String(s.volume);
    seek.max = String(s.duration);
    seek.value = String(s.current);
    elapsed.textContent = time(s.current);
    duration.textContent = time(s.duration);
    bars.hidden = !getSettings().performance.visualizer || getSettings().performance.lowPower;
    const integration = getSettings().integrations;
    bars.dataset.style = integration.spectrum;
    const track = getProfile().music.tracks.find((t) => t.id === s.trackId);
    const key = JSON.stringify([
      s.trackId,
      track?.lyrics,
      integration.onlineLyrics,
      s.title,
      s.artist,
      Math.round(s.duration),
    ]);
    if (key !== lyricsKey) {
      lyricsKey = key;
      lyricLines = [];
      const token = ++lyricsSequence;
      void (
        track?.lyrics || integration.onlineLyrics
          ? lookupLyrics(s.title, s.artist, s.duration, track?.lyrics)
          : Promise.resolve([])
      ).then((lines) => {
        if (disposed || token !== lyricsSequence) return;
        lyricLines = lines;
        lyrics.hidden = !lines.length;
        paintLyrics(
          lyrics,
          lines,
          s.current + integration.lyricsOffset,
          integration.lyricsAnimation,
        );
      });
    }
    lyrics.hidden = !lyricLines.length;
    if (lyricLines.length)
      paintLyrics(
        lyrics,
        lyricLines,
        s.current + integration.lyricsOffset,
        integration.lyricsAnimation,
      );
    bars
      .querySelectorAll<HTMLElement>('i')
      .forEach((b, i) => (b.style.height = Math.max(1, ((s.bins[i] ?? 0) / 255) * 34) + 'px'));
    if (coverId !== s.coverId) {
      coverId = s.coverId;
      if (coverURL) URL.revokeObjectURL(coverURL);
      coverURL = '';
      cover.hidden = true;
      placeholder.hidden = false;
      if (coverId) {
        const requestedId = coverId;
        void getMedia(coverId).then((blob) => {
          if (blob && !disposed && coverId === requestedId) {
            coverURL = URL.createObjectURL(blob);
            cover.src = coverURL;
            cover.hidden = false;
            placeholder.hidden = true;
          }
        });
      }
    }
  }
  async function poll() {
    clearTimeout(timer);
    if (disposed || document.hidden) return;
    try {
      paint(await musicCommand('status'));
      const spotify = await spotifyStatus();
      if (disposed) return;
      spotifyPanel.hidden = !spotify?.playing;
      controls.hidden = !!spotify?.playing;
      heading.textContent = spotify?.playing ? 'Spotify · now playing' : 'Your soundtrack';
      if (spotify?.playing) {
        node.classList.remove('music-ducked');
        node.inert = false;
        node.setAttribute('aria-hidden', 'false');
        title.textContent = spotify.title;
        artist.textContent = spotify.artist;
        cover.hidden = true;
        placeholder.hidden = false;
        seek.disabled = true;
        seek.max = String(spotify.duration);
        seek.value = String(spotify.current);
        elapsed.textContent = time(spotify.current);
        duration.textContent = time(spotify.duration);
        lyrics.hidden = true;
        spotifyTitle.textContent = 'SPOTIFY · LIVE LYRICS';
        const key = JSON.stringify([
          spotify.title,
          spotify.artist,
          spotify.duration,
          getSettings().integrations.onlineLyrics,
        ]);
        if (key !== spotifyKey || (!spotifyLines.length && Date.now() >= retryLyricsAt)) {
          spotifyKey = key;
          retryLyricsAt = Date.now() + 30000;
          spotifyLines = getSettings().integrations.onlineLyrics
            ? await lookupLyrics(spotify.title, spotify.artist, spotify.duration)
            : [];
          if (disposed) return;
        }
        if (spotifyLines.length)
          paintLyrics(
            spotifyLyrics,
            spotifyLines,
            spotify.current + getSettings().integrations.lyricsOffset,
            getSettings().integrations.lyricsAnimation,
          );
        else {
          spotifyLyrics.replaceChildren(
            el(
              'p',
              '',
              getSettings().integrations.onlineLyrics
                ? 'Synchronized lyrics unavailable for this song.'
                : 'Enable online lyrics in Music settings.',
            ),
          );
        }
      } else seek.disabled = false;
    } catch (error) {
      artist.textContent = error instanceof Error ? error.message : String(error);
    }
    if (!disposed)
      timer = setTimeout(
        () => void poll(),
        playing || getSettings().integrations.spotify
          ? getSettings().performance.visualizer && !getSettings().performance.lowPower
            ? 200
            : 1000
          : 4000,
      );
  }
  const visibility = () => {
    clearTimeout(timer);
    if (!document.hidden) void poll();
  };
  document.addEventListener('visibilitychange', visibility);
  const stateListener = (message: { target?: string; status?: MusicStatus }) => {
    if (message.target === 'music-state' && message.status) paint(message.status);
  };
  globalThis.chrome?.runtime?.onMessage.addListener(stateListener);
  const checkpointListener = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    const saved = changes['nova.audioResume']?.newValue as { status?: MusicStatus } | undefined;
    if (area === 'session' && saved?.status) paint(saved.status);
  };
  globalThis.chrome?.storage?.onChanged.addListener(checkpointListener);
  await poll();
  return () => {
    globalThis.chrome?.runtime?.onMessage.removeListener(stateListener);
    globalThis.chrome?.storage?.onChanged.removeListener(checkpointListener);
    disposed = true;
    clearTimeout(timer);
    if (coverURL) URL.revokeObjectURL(coverURL);
    document.removeEventListener('visibilitychange', visibility);
  };
}
