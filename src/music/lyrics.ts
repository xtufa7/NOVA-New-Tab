export interface LyricLine {
  time: number;
  text: string;
  words?: { time: number; text: string }[];
}
export function parseLRC(source: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const offset = Number(source.match(/\[offset:([+-]?\d+)\]/i)?.[1] ?? 0) / 1000;
  for (const line of source.slice(0, 100000).split(/\r?\n/)) {
    const stamps = [...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const text = line
      .replace(/\[[^\]]*\]/g, '')
      .replace(/<\d{1,3}:\d{2}(?:\.\d{1,3})?>/g, '')
      .trim()
      .slice(0, 500);
    for (const match of stamps) {
      if (Number(match[2]) >= 60) continue;
      lines.push({
        time: Math.max(
          0,
          Number(match[1]) * 60 + Number(match[2]) + Number('0.' + (match[3] ?? 0)) + offset,
        ),
        text,
        ...(() => {
          const words = [...line.matchAll(/<(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?>([^<]+)/g)]
            .filter((word) => Number(word[2]) < 60)
            .map((word) => ({
              time: Number(word[1]) * 60 + Number(word[2]) + Number('0.' + (word[3] ?? 0)) + offset,
              text: word[4].trim(),
            }));
          return words.length ? { words } : {};
        })(),
      });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}
export function lyricIndex(lines: LyricLine[], time: number) {
  let low = 0,
    high = lines.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (lines[mid].time <= time) low = mid + 1;
    else high = mid;
  }
  return low - 1;
}
export function paintLyrics(
  node: HTMLElement,
  lines: LyricLine[],
  time: number,
  style: LyricAnimation = 'rise',
) {
  const index = lyricIndex(lines, time),
    signature = String(index) + ':' + (lines[index]?.text ?? '');
  if (node.dataset.line !== signature) {
    node.dataset.line = signature;
    node.replaceChildren();
    for (let i = Math.max(0, index - 1); i <= Math.min(lines.length - 1, index + 1); i++) {
      const p = document.createElement(i === index ? 'div' : 'p');
      if (i === index) p.className = 'player-lyric-active lyric-slot';
      else p.textContent = lines[i].text || '♪';
      node.append(p);
    }
  }
  const active = node.querySelector<HTMLElement>('.player-lyric-active');
  if (active) {
    const text = lines[index]?.text || '♪';
    animateLyric(
      active,
      /\p{Script=Arabic}/u.test(text) ? revealedLyric(lines, time).text : text,
      signature,
      style,
    );
  }
}
export function revealedLyric(lines: LyricLine[], time: number) {
  const index = lyricIndex(lines, time),
    line = lines[index];
  if (!line) return { text: '', key: '', exact: false };
  const words = line.words?.length
    ? line.words
    : line.text
        .split(/\s+/)
        .filter(Boolean)
        .map((text, i, all) => ({
          text,
          time:
            line.time +
            (i *
              Math.max(0.8, Math.min(12, (lines[index + 1]?.time ?? line.time + 6) - line.time))) /
              all.length,
        }));
  let count = words.filter((word) => word.time <= time).length;
  count = Math.min(words.length, Math.max(0, count));
  return {
    text: words
      .slice(0, count)
      .map((word) => word.text)
      .join(' '),
    key: `${index}:${count}:${line.text}`,
    exact: !!line.words?.length,
  };
}
const cache = new Map<string, Promise<LyricLine[]>>();
export function lookupLyrics(
  title: string,
  artist: string,
  duration: number,
  local?: string,
): Promise<LyricLine[]> {
  if (local) return Promise.resolve(parseLRC(local));
  if (!title || !artist) return Promise.resolve([]);
  const key = JSON.stringify([title, artist, Math.round(duration)]);
  if (!cache.has(key))
    cache.set(
      key,
      (async () => {
        try {
          if (
            !(await chrome.permissions.contains({
              origins: ['https://lrclib.net/*'],
            }))
          )
            return [];
          const params = new URLSearchParams({
            track_name: title,
            artist_name: artist,
            duration: String(Math.round(duration)),
          });
          const response = await fetch('https://lrclib.net/api/get?' + params, {
            credentials: 'omit',
            signal: AbortSignal.timeout(10000),
          });
          const data = response.ok ? await response.json() : undefined;
          if (typeof data?.syncedLyrics === 'string' && data.syncedLyrics.trim())
            return parseLRC(data.syncedLyrics);
          // Exact lookup can miss live/remastered editions or metadata with no duration.
          const search = new URLSearchParams({ track_name: title, artist_name: artist });
          const fallback = await fetch('https://lrclib.net/api/search?' + search, {
            credentials: 'omit',
            signal: AbortSignal.timeout(10000),
          });
          if (!fallback.ok) return [];
          const results: unknown = await fallback.json();
          if (!Array.isArray(results)) return [];
          const candidates = results.filter(
            (r) =>
              typeof r?.syncedLyrics === 'string' &&
              r.syncedLyrics.trim() &&
              (duration <= 0 || Math.abs(Number(r.duration) - duration) <= 10),
          );
          candidates.sort(
            (a, b) =>
              Math.abs(Number(a.duration) - duration) - Math.abs(Number(b.duration) - duration),
          );
          return candidates.length ? parseLRC(candidates[0].syncedLyrics) : [];
        } catch {
          return [];
        }
      })(),
    );
  if (cache.size > 150) cache.delete(cache.keys().next().value!);
  const result = cache.get(key)!;
  void result.then((lines) => {
    if (!lines.length && cache.get(key) === result) cache.delete(key);
  });
  return result;
}
import { animateLyric, type LyricAnimation } from './lyric-animation';
