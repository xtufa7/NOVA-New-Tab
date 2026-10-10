import { isGecko } from '../shared/platform';
import { getMedia } from '../storage/media';
import { makeProfile, defaults, type Track, type Profile, type Settings } from '../settings/schema';
import type { MusicStatus } from './client';
const audio = new Audio();
audio.preload = 'metadata';
let current: Track | undefined;
let url = '';
let context: AudioContext | undefined, analyser: AnalyserNode | undefined;
let loading = Promise.resolve();
let profile: Profile = makeProfile();
let performanceSettings: Settings['performance'] = defaults().performance;
let intent = false,
  externalAudio = false,
  gain = 1;
const getProfile = () => profile;
function blocked() {
  return profile.music.autoDuck && externalAudio;
}
function checkpoint() {
  void chrome.runtime
    .sendMessage({
      target: 'worker',
      type: 'audio-checkpoint',
      snapshot: {
        profileId: profile.id,
        trackId: current?.id ?? '',
        position: audio.currentTime,
        wantsPlay: intent,
        status: status(),
      },
    })
    .catch(() => {});
}
function broadcast() {
  void chrome.runtime.sendMessage({ target: 'music-state', status: status() }).catch(() => {});
}
async function fade(to: number) {
  if (gain === to) return;
  const from = gain,
    started = Date.now();
  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - started) / 750);
      gain = from + (to - from) * progress;
      audio.volume = (profile.music.volume / 100) * gain;
      if (progress === 1) {
        clearInterval(timer);
        resolve();
      }
    }, 25);
  });
}
async function duck() {
  broadcast();
  checkpoint();
  if (blocked()) {
    if (!audio.paused) await fade(0);
    else gain = 0;
    audio.pause();
  } else if (intent && current) {
    if (audio.paused) {
      gain = 0;
      sync();
      await audio.play();
    }
    await fade(1);
  } else {
    gain = 1;
    sync();
  }
  checkpoint();
  broadcast();
}
function tracks() {
  const music = getProfile().music;
  return music.tracks.filter(
    (t) => music.playlist === 'All tracks' || t.playlist === music.playlist,
  );
}
function sync() {
  const m = getProfile().music;
  audio.volume = (m.volume / 100) * gain;
  audio.muted = m.muted;
  audio.loop = m.repeat === 'one';
  if (current && !tracks().some((t) => t.id === current?.id)) {
    audio.pause();
    intent = false;
    current = undefined;
    checkpoint();
    audio.removeAttribute('src');
    if (url) URL.revokeObjectURL(url);
    url = '';
  }
}
async function playTrack(track: Track) {
  const blob = await getMedia(track.id);
  if (!blob) throw new Error('Audio file is missing. Reimport it from Music settings.');
  audio.pause();
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(blob);
  current = track;
  audio.src = url;
  sync();
  if (!blocked()) {
    if (isGecko) {
      let timeout: ReturnType<typeof setTimeout>;
      try {
        await Promise.race([
          audio.play(),
          new Promise<never>((_resolve, reject) => {
            timeout = setTimeout(
              () =>
                reject(
                  new Error(
                    'Open the N�VA audio tab and press Play to allow playback in this browser.',
                  ),
                ),
              8000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timeout!);
      }
    } else await audio.play();
  }
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
    });
    navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
  }
}
async function step(direction: number) {
  const library = tracks();
  if (!library.length) throw new Error('Add local audio files in Music settings.');
  const index = library.findIndex((t) => t.id === current?.id);
  let next = (index + direction + library.length) % library.length;
  if (getProfile().music.shuffle && library.length > 1) {
    next = (index + 1 + Math.floor(Math.random() * (library.length - 1))) % library.length;
  }
  await playTrack(library[next]);
}
audio.addEventListener('ended', () => {
  if (
    getProfile().music.repeat === 'off' &&
    tracks().at(-1)?.id === current?.id &&
    !getProfile().music.shuffle
  ) {
    intent = false;
    checkpoint();
    broadcast();
    return;
  }
  void step(1).catch(() => {});
});
audio.addEventListener('error', () => {
  void chrome.runtime
    .sendMessage({
      target: 'notice',
      type: 'audio-error',
      message: 'This audio format cannot be decoded.',
    })
    .catch(() => {});
});
function status(): MusicStatus {
  let bins: number[] = [];
  const perf = performanceSettings;
  if (perf.visualizer && !perf.lowPower && !audio.paused) {
    if (!context) {
      context = new AudioContext();
      analyser = context.createAnalyser();
      analyser.fftSize = 64;
      context.createMediaElementSource(audio).connect(analyser);
      analyser.connect(context.destination);
    }
    void context.resume().catch(() => {});
    const values = new Uint8Array(32);
    analyser!.getByteFrequencyData(values);
    bins = Array.from(values).slice(0, 16);
  }
  return {
    playing: !audio.paused,
    ducked: blocked() && intent,
    trackId: current?.id ?? '',
    title: current?.title ?? 'Nothing playing',
    artist: current?.artist ?? 'Local files. Your soundtrack.',
    coverId: current?.coverId ?? '',
    current: audio.currentTime,
    duration: Number.isFinite(audio.duration) ? audio.duration : 0,
    volume: getProfile().music.volume,
    muted: audio.muted,
    shuffle: getProfile().music.shuffle,
    repeat: getProfile().music.repeat,
    bins,
  };
}
async function command(action: string, value?: number) {
  sync();
  switch (action) {
    case 'play':
      intent = true;
      if (!current) await step(1);
      await duck();
      break;
    case 'duck':
      await duck();
      break;
    case 'pause':
      intent = false;
      audio.pause();
      break;
    case 'next':
      intent = true;
      await step(1);
      break;
    case 'prev':
      intent = true;
      if (audio.currentTime > 3) audio.currentTime = 0;
      else await step(-1);
      break;
    case 'volume':
      if (!Number.isFinite(value) || value! < 0 || value! > 100)
        throw new Error('Volume must be 0–100.');
      profile.music.volume = value!;
      break;
    case 'seek':
      if (Number.isFinite(value) && value! >= 0 && value! <= audio.duration)
        audio.currentTime = value!;
      break;
    case 'mute':
      profile.music.muted = !profile.music.muted;
      break;
    case 'shuffle':
      profile.music.shuffle = !profile.music.shuffle;
      break;
    case 'repeat':
      profile.music.repeat = profile.music.repeat === 'one' ? 'all' : 'one';
      break;
    case 'stop':
      intent = false;
      audio.pause();
      audio.removeAttribute('src');
      if (url) URL.revokeObjectURL(url);
      url = '';
      current = undefined;
      break;
    case 'status':
      break;
    case 'sync':
      if ((blocked() && !audio.paused) || (!blocked() && intent && audio.paused)) await duck();
      break;
    default:
      throw new Error('Unknown audio command.');
  }
  sync();
  if (action !== 'status') {
    checkpoint();
    broadcast();
  }
  return { status: status(), music: profile.music, profileId: profile.id };
}
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.target !== 'audio') return;
  loading = loading
    .catch(() => {})
    .then(() =>
      Promise.resolve()
        .then(async () => {
          if (typeof message.externalAudio === 'boolean') externalAudio = message.externalAudio;
          if (message.profile) profile = message.profile;
          if (message.performance) performanceSettings = message.performance;
          if (message.restore) {
            const track = tracks().find((t) => t.id === message.restore.trackId);
            if (!track) throw new Error('Saved track is unavailable.');
            gain = 0;
            intent = true;
            await playTrack(track);
            if (audio.readyState < 1)
              await new Promise<void>((resolve, reject) => {
                audio.addEventListener('loadedmetadata', () => resolve(), { once: true });
                audio.addEventListener('error', () => reject(new Error('Cannot restore track.')), {
                  once: true,
                });
              });
            audio.currentTime = Math.min(
              message.restore.position,
              Number.isFinite(audio.duration) ? audio.duration : 0,
            );
          }
          return command(message.action, message.value);
        })
        .then(respond)
        .catch((e) => respond({ error: e.message })),
    );
  return true;
});
if ('mediaSession' in navigator) {
  for (const [action, cmd] of [
    ['play', 'play'],
    ['pause', 'pause'],
    ['nexttrack', 'next'],
    ['previoustrack', 'prev'],
  ] as const)
    navigator.mediaSession.setActionHandler(action, () => {
      void command(cmd).catch(() => {});
    });
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    void command('seek', details.seekTime).catch(() => {});
  });
}

if (isGecko) {
  document.body.style.cssText =
    'background:#171522;color:#e6dff4;font:16px system-ui;padding:40px;max-width:640px;margin:auto;line-height:1.8';
  const heading = document.createElement('h1');
  heading.textContent = 'NØVA · music';
  const description = document.createElement('p');
  description.textContent =
    'Keep this tab open for background music in Firefox / Zen. Control your library from New Tab → Music. Closing this tab stops audio.';
  audio.controls = true;
  audio.style.width = '100%';
  document.body.append(heading, description, audio);
}
