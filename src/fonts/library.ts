import { getSettings, getProfile } from '../storage/settings';
import { getMedia, putMedia } from '../storage/media';
import type { Settings } from '../settings/schema';
const loaded = new Map<string, Promise<void>>();
export async function applyFonts() {
  const a = getProfile().appearance;
  for (const [kind, id] of [
    ['font', a.customFontId],
    ['clock', a.clockCustomFontId],
    ['lyricsArabic', getSettings().lyrics.arabicFont.replace(/^font-/, '')],
    ['lyricsEnglish', getSettings().lyrics.englishFont.replace(/^font-/, '')],
  ] as const) {
    if (
      (kind === 'font' || kind === 'clock') &&
      (kind === 'font' ? a.font : a.clockFont) !== 'custom'
    )
      continue;
    const font = getSettings().fonts.find((f) => f.id === id);
    if (!font) continue;
    if (!loaded.has(id))
      loaded.set(
        id,
        (async () => {
          for (const face of font.faces) {
            const blob = await getMedia(face.mediaId);
            if (!blob) continue;
            const f = new FontFace(
              'NovaFont-' + id,
              await blob.arrayBuffer(),
              face.unicodeRange ? { unicodeRange: face.unicodeRange } : {},
            );
            await f.load();
            document.fonts.add(f);
          }
        })().catch(() => {}),
      );
    await loaded.get(id);
    if (kind === 'font' || kind === 'clock')
      document.documentElement.style.setProperty(
        kind === 'font' ? '--font' : '--clock-font',
        `"NovaFont-${id}",system-ui,sans-serif`,
      );
  }
}
export async function downloadFont(name: string): Promise<Settings['fonts'][number]> {
  name = name.trim();
  if (!/^[\p{L}\p{N} -]{1,100}$/u.test(name))
    throw new Error('Enter a valid Google Fonts family name.');
  const origins = ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'];
  if (!(await chrome.permissions.request({ origins })))
    throw new Error('Font download access was not granted.');
  const response = await fetch(
    'https://fonts.googleapis.com/css2?family=' +
      encodeURIComponent(name) +
      ':wght@400&display=swap',
    { credentials: 'omit', signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw new Error('Font not found. Check its family name.');
  const css = await response.text();
  if (css.length > 200000) throw new Error('Font response is too large.');
  const faces: Settings['fonts'][number]['faces'] = [];
  for (const block of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
    const url = block[1].match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)?.[1];
    if (!url) continue;
    const data = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(15000) });
    if (!data.ok) throw new Error('Font download failed.');
    const blob = await data.blob();
    if (blob.size > 5e6) throw new Error('Font file is too large.');
    faces.push({
      mediaId: await putMedia(blob),
      unicodeRange: block[1].match(/unicode-range:\s*([^;]+);/)?.[1] ?? '',
    });
    if (faces.length >= 50) break;
  }
  if (!faces.length) throw new Error('No supported font files found.');
  return { id: crypto.randomUUID(), name, faces };
}
