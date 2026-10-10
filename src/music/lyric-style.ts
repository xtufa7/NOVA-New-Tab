import { getSettings } from '../storage/settings';
import { fontFamily } from '../fonts/family';
export function lyricMotionAllowed(preview = false) {
  const s = getSettings();
  return (
    (preview || s.lyrics.enabled) &&
    (preview || !s.performance.lowPower) &&
    !(s.lyrics.respectSystem && matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
}
export function applyLyricStyle(node: HTMLElement) {
  const c = getSettings().lyrics;
  const family = (name: string) =>
    name.startsWith('font-')
      ? `"NovaFont-${name.slice(5)}",system-ui,sans-serif`
      : ['system', 'mono', 'serif', 'rounded', 'condensed', 'display'].includes(name)
        ? fontFamily(name)
        : `"${name}",system-ui,sans-serif`;
  node.style.setProperty('--lyrics-arabic-font', family(c.arabicFont));
  node.style.setProperty('--lyrics-english-font', family(c.englishFont));
  node.style.setProperty('--lyrics-color', c.color);
  node.style.setProperty('--lyrics-size', c.size + 'px');
  node.style.setProperty('--lyrics-weight', String(c.weight));
  node.style.setProperty('--lyrics-spacing', c.spacing + 'px');
  node.style.setProperty('--lyrics-leading', String(c.lineHeight));
}
