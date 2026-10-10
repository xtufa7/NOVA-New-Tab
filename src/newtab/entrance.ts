import { getSettings } from '../storage/settings';
import type { Settings } from '../settings/schema';
const active = new Set<Animation>();
export function entranceStatus() {
  const s = getSettings();
  if (!s.entrance.enabled) return 'Opening animation is disabled.';
  if (s.performance.lowPower) return 'Paused by Low Power Mode.';
  if (s.entrance.respectSystem && matchMedia('(prefers-reduced-motion: reduce)').matches)
    return 'Paused by your system reduced-motion preference.';
  return 'Ready · independent of the general Animations setting.';
}
export function animateEntrance(nodes: HTMLElement[], config: Settings['entrance']) {
  return nodes.map((node, index) => {
    const from: Keyframe = { opacity: 0 };
    if (config.style === 'rise' || config.style === 'rise+blur')
      from.translate = `0 ${config.distance}px`;
    if (config.style === 'slide') from.translate = `${-config.distance}px 0`;
    if (config.style === 'zoom') from.scale = '.9';
    if (config.style === 'rise+blur') from.filter = `blur(${config.blur}px)`;
    return node.animate(
      [
        from,
        {
          opacity: getComputedStyle(node).opacity,
          translate: '0 0',
          scale: '1',
          filter: getComputedStyle(node).filter,
        },
      ],
      {
        duration: config.duration,
        delay: config.delay + index * config.stagger,
        easing: config.easing === 'smooth' ? 'cubic-bezier(.16,1,.3,1)' : config.easing,
        fill: 'backwards',
      },
    );
  });
}
export function enterWorkspace() {
  document.body.classList.remove('nova-loading');
  if (document.hidden) {
    const whenVisible=()=>{if(document.hidden)return;document.removeEventListener('visibilitychange',whenVisible);enterWorkspace();};
    document.addEventListener('visibilitychange',whenVisible);
    return;
  }
  for (const animation of active) animation.cancel();
  active.clear();
  if (!entranceStatus().startsWith('Ready')) return;
  const c = getSettings().entrance;
  const nodes: HTMLElement[] = [];
  if (c.header)
    nodes.push(...document.querySelectorAll<HTMLElement>('.wordmark,.top-actions > button'));
  if (c.widgets) nodes.push(...document.querySelectorAll<HTMLElement>('#canvas > .widget'));
  for (const animation of animateEntrance(
    nodes.filter((n) => n.getClientRects().length > 0),
    c,
  )) {
    active.add(animation);
    void animation.finished.then(() => active.delete(animation)).catch(() => {});
  }
  if (c.background) {
    const bg = document.querySelector<HTMLElement>('#background');
    if (bg) {
      const animation = bg.animate([{ opacity: 0 }, { opacity: bg.style.opacity || '1' }], {
        duration: c.duration,
        fill: 'backwards',
      });
      active.add(animation);
      void animation.finished.then(() => active.delete(animation)).catch(() => {});
    }
  }
}
