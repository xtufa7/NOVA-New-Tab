import { getSettings } from '../storage/settings';
import { applyLyricStyle, lyricMotionAllowed } from './lyric-style';
export type LyricAnimation = 'rise' | 'rise+blur' | 'fade' | 'blur' | 'typewriter' | 'none';
const motions = new WeakMap<HTMLElement, { key: string; animations: Animation[] }>();
const shifts = new WeakMap<HTMLElement, Animation>();
function reveal(word: HTMLElement, style: LyricAnimation, preview: boolean) {
  const c = getSettings().lyrics;
  const arabic = /\p{Script=Arabic}/u.test(word.textContent ?? '');
  const letters = c.unit === 'letter' && !arabic;
  const allowed = style !== 'none' && lyricMotionAllowed(preview);
  if (!allowed) shifts.get(word)?.cancel();
  const key = JSON.stringify([style, c, allowed]);
  if (motions.get(word)?.key === key) return;
  motions.get(word)?.animations.forEach((a) => a.cancel());
  if (word.dataset.unit !== (letters ? 'letter' : 'word')) {
    const text = word.textContent ?? '';
    word.replaceChildren();
    if (letters)
      for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(
        text,
      )) {
        const char = document.createElement('span');
        char.className = 'lyric-char';
        char.textContent = segment;
        word.append(char);
      }
    else word.textContent = text;
    word.dataset.unit = letters ? 'letter' : 'word';
  }
  word.dataset.animation = style;
  word.lang = arabic ? 'ar' : 'en';
  const animations: Animation[] = [];
  if (allowed) {
    const nodes = letters ? (Array.from(word.children) as HTMLElement[]) : [word];
    nodes.forEach((node, index) => {
      const from: Keyframe = { opacity: 0 };
      if (style === 'rise' || style === 'rise+blur')
        from.transform = `translate(${arabic ? -10 : 0}px,${c.rise}px)`;
      if (style === 'blur' || style === 'rise+blur') from.filter = `blur(${c.blur}px)`;
      if (style === 'blur') from.transform = 'scale(.92)';
      if (style === 'typewriter') {
        from.clipPath = 'inset(0 100% 0 0)';
        from.opacity = 1;
      }
      animations.push(
        node.animate(
          [
            from,
            {
              opacity: 1,
              transform: 'translate(0,0) scale(1)',
              filter: 'blur(0)',
              clipPath: 'inset(0 0 0 0)',
            },
          ],
          {
            duration: c.duration,
            delay: Math.min(index, 24) * c.stagger,
            easing: style === 'typewriter' ? 'steps(8,end)' : 'cubic-bezier(.16,1,.3,1)',
            fill: 'both',
          },
        ),
      );
    });
  }
  motions.set(word, { key, animations });
}
// Stable words retain their reveal; only new text or an explicit style change starts motion.
export function animateLyric(node: HTMLElement, text: string, line: string, style: LyricAnimation) {
  const preview = node.classList.contains('lyrics-preview');
  node.dataset.animation = style;
  node.dataset.live = 'true';
  applyLyricStyle(node);
  node.querySelectorAll<HTMLElement>('.lyric-word').forEach((w) => reveal(w, style, preview));
  let current = node.querySelector<HTMLElement>('.current');
  if (current?.dataset.line === line && current.dataset.text === text) return;
  const previous = current?.dataset.line === line ? (current.dataset.text ?? '') : '';
  if (!current || current.dataset.line !== line) {
    node.querySelectorAll('.lyric-out').forEach((n) => n.remove());
    if (current) {
      const old = current;
      old.classList.replace('current', 'lyric-out');
      if (style === 'none' || !lyricMotionAllowed(preview)) old.remove();
      else {
        const a = old.animate(
          [
            { opacity: 1, translate: '0 0' },
            { opacity: 0, translate: '0 -8px' },
          ],
          { duration: 180 },
        );
        void a.finished.then(() => old.remove()).catch(() => old.remove());
      }
    }
    current = document.createElement('span');
    current.className = 'current lyric-in';
    current.dataset.line = line;
    node.append(current);
  }
  const arabic = /\p{Script=Arabic}/u.test(text);
  current.dataset.flow = arabic ? 'arabic' : 'latin';
  current.dir = arabic ? 'rtl' : 'ltr';
  const before = arabic
    ? Array.from(current.querySelectorAll<HTMLElement>('.lyric-word')).map((word) => {
        const x = word.getBoundingClientRect().x;
        shifts.get(word)?.cancel();
        return { word, x };
      })
    : [];
  if (previous && text.startsWith(previous + ' '))
    appendWords(current, text.slice(previous.length), style, preview);
  else {
    current.replaceChildren();
    appendWords(current, text, style, preview);
  }
  current.dataset.text = text;
  if (arabic && style !== 'none' && lyricMotionAllowed(preview))
    for (const { word, x } of before) {
      if (!word.isConnected) continue;
      const delta = x - word.getBoundingClientRect().x;
      if (Math.abs(delta) > 0.5)
        shifts.set(
          word,
          word.animate([{ translate: `${delta}px 0` }, { translate: '0 0' }], {
            duration: Math.min(400, getSettings().lyrics.duration),
            easing: 'cubic-bezier(.16,1,.3,1)',
          }),
        );
    }
}
function appendWords(node: HTMLElement, text: string, style: LyricAnimation, preview: boolean) {
  for (const piece of text.split(/(\s+)/).filter(Boolean)) {
    if (/^\s+$/.test(piece)) {
      node.append(document.createTextNode(piece));
      continue;
    }
    const word = document.createElement('span');
    word.className = 'lyric-word';
    word.textContent = piece;
    word.dir = 'auto';
    node.append(word);
    reveal(word, style, preview);
  }
}
