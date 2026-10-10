import '../shared/platform';
import { defaults, type Settings, type Profile, widgetIds } from '../settings/schema';
import { safeURL } from '../shared/dom';
import { migrateSettings } from '../settings/migrations';
import { mergeSettings } from './reconcile';
export const KEY = 'nova.settings';
const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
function mergeValidated(base: unknown, input: unknown, path = ''): unknown {
  if (typeof base === 'string') {
    if (typeof input !== 'string' || input.length > 200000)
      throw new Error(`Invalid text at ${path}`);
    return input;
  }
  if (typeof base === 'number') {
    if (typeof input !== 'number' || !Number.isFinite(input))
      throw new Error(`Invalid number at ${path}`);
    return input;
  }
  if (typeof base === 'boolean') {
    if (typeof input !== 'boolean') throw new Error(`Invalid toggle at ${path}`);
    return input;
  }
  if (Array.isArray(base)) {
    if (!Array.isArray(input)) throw new Error(`Invalid list at ${path}`);
    return structuredClone(input);
  }
  if (!isRecord(input)) throw new Error(`Invalid object at ${path}`);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(base as object))
    result[key] =
      input[key] === undefined
        ? structuredClone(value)
        : mergeValidated(value, input[key], `${path}.${key}`);
  return result;
}
function enumValue(value: string, options: string[]) {
  if (!options.includes(value)) throw new Error(`Invalid option: ${value}`);
}
function range(value: number, min: number, max: number) {
  if (value < min || value > max) throw new Error(`Value outside ${min}–${max}`);
}
function strings(value: unknown, max: number): asserts value is Record<string, string> {
  if (
    !isRecord(value) ||
    Object.keys(value).length > max ||
    Object.entries(value).some(
      ([k, v]) =>
        k.length > 80 ||
        ['__proto__', 'constructor', 'prototype'].includes(k) ||
        typeof v !== 'string' ||
        v.length > 2000,
    )
  )
    throw new Error('Invalid aliases or engines');
}
export function validateSettings(raw: unknown): Settings {
  raw = migrateSettings(raw);
  if (!isRecord(raw)) throw new Error('Backup must be a settings object.');
  const settings = mergeValidated(defaults(), raw) as Settings;
  if (!settings.tab.title.trim() || settings.tab.title.length > 80)
    throw new Error('Use a tab title of 1–80 characters.');
  enumValue(settings.tab.animation, ['off', 'typewriter', 'scroll']);
  range(settings.tab.speed, 100, 2000);
  if (settings.tab.iconId.length > 200 || settings.credits.gunsAvatarId.length > 200)
    throw new Error('Invalid local media reference.');
  range(settings.credits.lastSync, 0, Number.MAX_SAFE_INTEGER);
  if (!settings.branding.name.trim() || settings.branding.name.length > 40)
    throw new Error('Use a brand name of 1–40 characters.');
  enumValue(settings.memory.browser, ['helium', 'chrome', 'msedge', 'brave', 'chromium']);
  if (!settings.profiles.length || settings.profiles.length > 50)
    throw new Error('Use 1–50 profiles.');
  const ids = new Set<string>();
  settings.profiles = settings.profiles.map((value) => {
    const p = mergeValidated(defaults().profiles[0], value, 'profile') as Profile;
    if (isRecord(value) && value.layout !== undefined)
      p.layout = structuredClone(value.layout) as Profile['layout'];
    p.widgets.terminal = true;
    if (!p.id || p.id.length > 100 || ids.has(p.id)) throw new Error('Profile IDs must be unique.');
    ids.add(p.id);
    if (!p.name.trim() || p.name.length > 80) throw new Error('Invalid profile name.');
    const a = p.appearance;
    if (a.customCSS.length > 100000 || a.gradient.length > 4096 || p.notes.length > 100000)
      throw new Error('CSS, gradient, or notes are too large.');
    enumValue(a.background, ['solid', 'gradient', 'image', 'video']);
    enumValue(a.clockStyle, ['24h', '12h', 'seconds']);
    enumValue(a.cursor, ['default', 'crosshair', 'dot']);
    enumValue(a.font, ['system', 'mono', 'serif', 'rounded', 'condensed', 'display', 'custom']);
    enumValue(a.clockFont, [
      'system',
      'mono',
      'serif',
      'rounded',
      'condensed',
      'display',
      'custom',
    ]);
    enumValue(a.clockFace, ['classic', 'neon', 'outline', 'gradient', 'retro', 'bold']);
    if (a.clockCaption.length > 200) throw new Error('Caption maximum: 200 characters.');
    for (const color of [a.color, a.accent, a.text])
      if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Use six-digit hex colors.');
    range(a.clockSpacing, -0.2, 0.5);
    range(a.meridiemSize, 8, 60);
    enumValue(a.meridiemPosition, ['inline', 'below', 'hidden']);
    range(a.opacity, 0, 100);
    range(a.blur, 0, 40);
    range(a.brightness, 0, 200);
    range(a.contrast, 0, 200);
    range(a.saturation, 0, 200);
    range(a.panelOpacity, 0, 100);
    range(a.radius, 0, 48);
    range(a.shadow, 0, 40);
    range(a.glow, 0, 30);
    range(a.fontSize, 10, 24);
    range(a.videoSpeed, 0.25, 2);
    strings(
      value && isRecord(value) && isRecord(value.terminal)
        ? (value.terminal.aliases ?? p.terminal.aliases)
        : p.terminal.aliases,
      100,
    );
    if (isRecord(value) && isRecord(value.terminal)) {
      if (value.terminal.aliases)
        p.terminal.aliases = {
          ...(value.terminal.aliases as Record<string, string>),
        };
      if (value.terminal.engines)
        p.terminal.engines = {
          ...(value.terminal.engines as Record<string, string>),
        };
    }
    strings(p.terminal.engines, 50);
    for (const template of Object.values(p.terminal.engines)) {
      if (!template.includes('{query}')) throw new Error('Search URL needs {query}.');
      safeURL(template.replace('{query}', 'test'));
    }
    if (!Object.hasOwn(p.terminal.engines, p.terminal.engine))
      throw new Error('Default engine does not exist.');
    if (
      p.terminal.history.length > 100 ||
      p.terminal.history.some((v) => typeof v !== 'string' || v.length > 2000)
    )
      throw new Error('Invalid command history.');
    if (p.links.length > 300) throw new Error('Too many links.');
    p.links = p.links.map((link) => {
      const l = mergeValidated(
        defaults().profiles[0].links[0],
        link,
        'link',
      ) as Profile['links'][number];
      safeURL(l.url);
      if (l.title.length > 100 || l.icon.length > 200000) throw new Error('Link too large.');
      return l;
    });
    if (new Set(p.links.map((l) => l.id)).size !== p.links.length)
      throw new Error('Link IDs must be unique.');
    if (!isRecord(p.layout)) throw new Error('Invalid layout.');
    for (const [id, item] of Object.entries(p.layout)) {
      if (!widgetIds.includes(id as (typeof widgetIds)[number]) || !isRecord(item))
        throw new Error('Invalid widget layout');
      for (const key of ['x', 'y', 'w', 'h', 'z'])
        if (typeof item[key] !== 'number' || !Number.isFinite(item[key]))
          throw new Error('Invalid widget coordinates');
      range(item.x as number, 0, 100);
      range(item.y as number, 0, 100);
      range(item.w as number, 5, 100);
      range(item.h as number, 2, 100);
      range(item.z as number, 0, 100);
      if (typeof item.locked !== 'boolean' || typeof item.custom !== 'boolean')
        throw new Error('Invalid layout flags');
    }
    range(p.music.volume, 0, 100);
    enumValue(p.music.repeat, ['off', 'all', 'one']);
    if (
      p.music.tracks.length > 1000 ||
      p.music.tracks.some(
        (t) =>
          !isRecord(t) ||
          ['id', 'title', 'artist', 'coverId', 'playlist'].some((k) => typeof t[k] !== 'string') ||
          (t.lyrics !== undefined && (typeof t.lyrics !== 'string' || t.lyrics.length > 100000)),
      )
    )
      throw new Error('Invalid music library.');
    return p;
  });
  if (!ids.has(settings.activeProfile)) throw new Error('Active profile missing.');
  enumValue(settings.performance.animations, ['full', 'reduced', 'off']);
  enumValue(settings.lyrics.unit, ['word', 'letter']);
  range(settings.lyrics.duration, 150, 2000);
  range(settings.lyrics.stagger, 0, 100);
  range(settings.lyrics.rise, 0, 80);
  range(settings.lyrics.blur, 0, 24);
  range(settings.lyrics.size, 10, 36);
  range(settings.lyrics.weight, 100, 900);
  range(settings.lyrics.spacing, -1, 5);
  range(settings.lyrics.lineHeight, 1, 2.5);
  if (!/^#[a-f0-9]{6}$/i.test(settings.lyrics.color)) throw new Error('Invalid lyrics color.');
  for (const font of [settings.lyrics.arabicFont, settings.lyrics.englishFont])
    if (!/^[\p{L}\p{N} _.-]{1,100}$/u.test(font)) throw new Error('Invalid lyrics font.');
  enumValue(settings.entrance.style, ['rise+blur', 'rise', 'fade', 'zoom', 'slide']);
  enumValue(settings.entrance.easing, ['smooth', 'ease-out', 'linear']);
  range(settings.entrance.duration, 150, 2000);
  range(settings.entrance.stagger, 0, 250);
  range(settings.entrance.delay, 0, 1500);
  range(settings.entrance.distance, 0, 100);
  range(settings.entrance.blur, 0, 24);
  enumValue(settings.performance.blur, ['high', 'medium', 'low', 'off']);
  enumValue(settings.performance.video, ['full', 'reduced', 'off']);
  range(settings.floatingTabs.width, 240, 1600);
  range(settings.floatingTabs.height, 160, 1200);
  enumValue(settings.floatingTabs.mode, ['live', 'interactive']);
  safeURL(settings.credits.discordURL);
  if (
    settings.sessions.length > 100 ||
    settings.sessions.some(
      (s) =>
        !isRecord(s) ||
        typeof s.id !== 'string' ||
        typeof s.name !== 'string' ||
        typeof s.created !== 'number' ||
        !Array.isArray(s.urls) ||
        s.urls.length > 500,
    )
  )
    throw new Error('Invalid sessions.');
  if (settings.customThemes.length > 30) throw new Error('Maximum 30 saved themes.');
  const themeIds = new Set<string>();
  settings.customThemes = settings.customThemes.map((t) => {
    if (
      !isRecord(t) ||
      typeof t.id !== 'string' ||
      !t.id ||
      themeIds.has(t.id) ||
      typeof t.name !== 'string' ||
      !t.name.trim() ||
      t.name.length > 80
    )
      throw new Error('Invalid saved theme.');
    themeIds.add(t.id);
    const candidate = defaults();
    candidate.profiles[0].appearance = t.appearance;
    const appearance = validateSettings(candidate).profiles[0].appearance;
    return { id: t.id, name: t.name, appearance };
  });
  if (
    settings.privacy.exceptions.length > 100 ||
    settings.privacy.exceptions.some(
      (d) =>
        typeof d !== 'string' ||
        !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(d) ||
        d.length > 253,
    )
  )
    throw new Error('Use valid website domains for exceptions.');
  range(settings.companion.y, 0.05, 0.95);
  enumValue(settings.companion.edge, ['left', 'right']);
  enumValue(settings.integrations.spotifySource, ['web', 'desktop']);
  enumValue(settings.integrations.spectrum, ['off', 'bars', 'cava', 'native-cava']);
  enumValue(settings.integrations.lyricsAnimation, [
    'rise',
    'rise+blur',
    'fade',
    'blur',
    'typewriter',
    'none',
  ]);
  if (settings.integrations.spectrum === 'native-cava') settings.integrations.spectrum = 'cava';
  range(settings.integrations.lyricsOffset, -10, 10);
  if (
    settings.companion.exceptions.length > 100 ||
    settings.companion.exceptions.some(
      (d) =>
        typeof d !== 'string' || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/i.test(d),
    )
  )
    throw new Error('Use website domains for sidebar exclusions.');
  if (
    settings.fonts.length > 30 ||
    new Set(settings.fonts.map((f) => f.id)).size !== settings.fonts.length
  )
    throw new Error('Maximum 30 unique custom fonts.');
  for (const f of settings.fonts)
    if (
      !isRecord(f) ||
      typeof f.id !== 'string' ||
      !f.id ||
      f.id.length > 100 ||
      typeof f.name !== 'string' ||
      !f.name.trim() ||
      f.name.length > 100 ||
      !Array.isArray(f.faces) ||
      !f.faces.length ||
      f.faces.length > 50 ||
      f.faces.some(
        (face) =>
          !isRecord(face) ||
          typeof face.mediaId !== 'string' ||
          face.mediaId.length > 100 ||
          typeof face.unicodeRange !== 'string' ||
          face.unicodeRange.length > 4096,
      )
    )
      throw new Error('Invalid font library.');
  for (const p of settings.profiles)
    for (const t of p.music.tracks)
      if (t.lyrics !== undefined && (typeof t.lyrics !== 'string' || t.lyrics.length > 100000))
        throw new Error('Invalid lyrics.');
  settings.sessions.forEach((s) => s.urls.forEach(safeURL));
  return settings;
}
let state = defaults();
let baseline = structuredClone(state);
let dirty = false;
export let storageWarning = '';
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout>;
let pending: Promise<void> = Promise.resolve();
// Reconcile an acknowledgement against its own local snapshot, not an older baseline.
// This preserves a newer edit that deliberately returns a field to its original value.
const ownWrites = new Map<string, Settings>();
let submitted: Settings | undefined;
export const inExtension = !!globalThis.chrome?.runtime?.id;
export async function loadSettings() {
  let raw: unknown;
  try {
    raw = inExtension
      ? (await chrome.storage.local.get(KEY))[KEY]
      : JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch (error) {
    storageWarning =
      'Stored settings could not be read. ' +
      (error instanceof Error ? error.message : String(error));
  }
  if (raw) {
    try {
      state = validateSettings(raw);
    } catch (error) {
      storageWarning =
        'Stored settings were preserved but could not be loaded. ' +
        (error instanceof Error ? error.message : String(error));
      /* Preserve invalid stored data for recovery; don't overwrite it during load. */
    }
  }
  baseline = structuredClone(state);
  if (inExtension)
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[KEY]?.newValue) {
        try {
            const remote = validateSettings(changes[KEY].newValue);
            const fingerprint = JSON.stringify(remote);
            const ownSnapshot = ownWrites.get(fingerprint);
            state = mergeSettings(ownSnapshot ?? baseline, state, remote);
            ownWrites.delete(fingerprint);
            if (ownSnapshot && submitted === ownSnapshot) submitted = undefined;
          baseline = remote;
          listeners.forEach((fn) => fn());
        } catch {
          /* Ignore incompatible remote updates. */
        }
      }
    });
  else
    window.addEventListener('storage', (e) => {
      if (e.key === KEY && e.newValue) {
        try {
          const remote = validateSettings(JSON.parse(e.newValue));
          state = mergeSettings(baseline, state, remote);
          baseline = remote;
          listeners.forEach((fn) => fn());
        } catch {
          /* Ignore invalid external state. */
        }
      }
    });
  return state;
}
export const getSettings = () => state;
export const getProfile = () => state.profiles.find((p) => p.id === state.activeProfile)!;
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function update(fn: (s: Settings, p: Profile) => void) {
  fn(state, getProfile());
  dirty = true;
  listeners.forEach((l) => l());
  clearTimeout(saveTimer);
  saveTimer = setTimeout(
    () =>
      void flush().catch(() => {
        document.dispatchEvent(
          new CustomEvent('nova-error', {
            detail: 'Settings could not be saved. Storage may be full.',
          }),
        );
      }),
    150,
  );
}
export async function flush() {
  clearTimeout(saveTimer);
  if (!dirty) return pending;
  const snapshot = structuredClone(state);
  const baseSnapshot = structuredClone(submitted ?? baseline);
  submitted = snapshot;
  dirty = false;
  pending = pending
    .catch(() => {})
    .then(async () => {
      let remote = baseSnapshot;
      try {
        const raw = inExtension
          ? (await chrome.storage.local.get(KEY))[KEY]
          : JSON.parse(localStorage.getItem(KEY) || 'null');
        if (raw) remote = validateSettings(raw);
      } catch {
        /* An explicit local edit can replace incompatible stored settings. */
      }
      const merged = validateSettings(mergeSettings(baseSnapshot, snapshot, remote));
      if (inExtension) {
        ownWrites.set(JSON.stringify(merged), snapshot);
        if (ownWrites.size > 32) ownWrites.delete(ownWrites.keys().next().value!);
        await chrome.storage.local.set({ [KEY]: merged });
      }
      else {
        localStorage.setItem(KEY, JSON.stringify(merged));
        baseline = merged;
        if (submitted === snapshot) submitted = undefined;
      }
    })
    .catch((error) => {
      dirty = true;
      submitted = undefined;
      throw error;
    });
  return pending;
}
export async function replaceSettings(raw: unknown) {
  const valid = validateSettings(raw);
  state = valid;
  ownWrites.clear();
  submitted = undefined;
  dirty = false;
  clearTimeout(saveTimer);
  listeners.forEach((l) => l());
  pending = pending
    .catch(() => {})
    .then(async () => {
      if (inExtension) await chrome.storage.local.set({ [KEY]: valid });
      else localStorage.setItem(KEY, JSON.stringify(valid));
      baseline = structuredClone(valid);
    });
  await pending;
}
if (typeof window !== 'undefined')
  window.addEventListener('pagehide', () => {
    void flush();
  });
