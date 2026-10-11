import { getSettings } from '../storage/settings';
import type { Settings } from '../settings/schema';
const active = new Set<Animation>();
let generation = 0,
  started = false,
  automatic = false,
  late: MutationObserver | undefined,
  lateTimer: ReturnType<typeof setTimeout>;
const seen = new WeakSet<HTMLElement>();
export function entranceStatus() {
  const s = getSettings();
  if (!s.entrance.enabled) return 'Opening animation is disabled.';
  if (s.performance.lowPower) return 'Paused by Low Power Mode.';
  if (s.entrance.respectSystem && matchMedia('(prefers-reduced-motion: reduce)').matches)
    return 'Paused by your system reduced-motion preference.';
  return 'Ready · independent of the general Animations setting.';
}
export function animateEntrance(nodes: HTMLElement[], c: Settings['entrance']) {
  return nodes.map((node, index) => {
    const from: Keyframe = { opacity: 0 };
    if (c.style === 'rise' || c.style === 'rise+blur') from.translate = `0 ${c.distance}px`;
    if (c.style === 'slide') from.translate = `${-c.distance}px 0`;
    if (c.style === 'zoom') from.scale = '.9';
    if (c.style === 'rise+blur') from.filter = `blur(${c.blur}px)`;
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
        duration: c.duration,
        delay: c.delay + index * c.stagger,
        easing: c.easing === 'smooth' ? 'cubic-bezier(.16,1,.3,1)' : c.easing,
        fill: 'backwards',
      },
    );
  });
}
function track(a: Animation) {
  active.add(a);
  void a.finished.then(() => active.delete(a)).catch(() => active.delete(a));
}
function targets() {
  const c = getSettings().entrance;
  return [
    ...(c.header ? document.querySelectorAll<HTMLElement>('.wordmark,.top-actions > button') : []),
    ...document.querySelectorAll<HTMLElement>('#canvas > .widget'),
  ].filter(
    (n) =>
      n.getClientRects().length > 0 &&
      (!n.classList.contains('widget')
        ? true
        : n.id === 'widget-clock'
          ? c.clock
          : n.id === 'widget-terminal'
            ? c.terminal
            : c.widgets),
  );
}
function visible() {
  if (!document.hidden) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const listener = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', listener);
      resolve();
    };
    document.addEventListener('visibilitychange', listener, { signal: lifecycle.signal });
  });
}
function painted() {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(finish, 250);
    requestAnimationFrame(() => requestAnimationFrame(finish));
  });
}
const lifecycle = new AbortController();
export async function enterWorkspace(replay = true) {
  if (!document.querySelector('#canvas')) return;
  if (!replay && automatic) return;
  if (!replay) automatic = true;
  const run = ++generation;
  try {
    await visible();
    await painted();
    // A tab can become hidden between the visibility event and its paint opportunity.
    while (document.hidden && run === generation) {
      await visible();
      await painted();
    }
    if (run !== generation) return;
    for (const a of active) a.cancel();
    active.clear();
    late?.disconnect();
    clearTimeout(lateTimer);
    if (!entranceStatus().startsWith('Ready')) {
      document.body.classList.remove('nova-loading');
      started = true;
      return;
    }
    const c = getSettings().entrance,
      nodes = targets();
    for (const n of nodes) seen.add(n);
    for (const a of animateEntrance(nodes, c)) track(a);
    // Arm backwards-fill effects after a visible paint, before removing the startup curtain.
    document.body.classList.remove('nova-loading');
    performance.mark('nova-opening-start');
    started = true;
    if (c.background) {
      const bg = document.querySelector<HTMLElement>('#background');
      const animateBG = () => {
        if (run !== generation || !bg || !entranceStatus().startsWith('Ready')) return;
        track(
          bg.animate([{ opacity: 0 }, { opacity: bg.style.opacity || '1' }], {
            duration: c.duration,
            delay: c.delay,
            fill: 'backwards',
          }),
        );
      };
      if (bg?.dataset.mediaReady === 'pending') {
        document.addEventListener('nova-background-ready', animateBG, {
          once: true,
          signal: lifecycle.signal,
        });
      } else animateBG();
    }
    late = new MutationObserver(() => {
      const fresh = targets().filter((n) => !seen.has(n));
      for (const n of fresh) seen.add(n);
      for (const a of animateEntrance(fresh, { ...c, delay: 0 })) track(a);
    });
    late.observe(document.querySelector('#canvas')!, { childList: true, subtree: false });
    lateTimer = setTimeout(() => late?.disconnect(), 2500);
  } catch {
    document.body.classList.remove('nova-loading');
  }
}
window.addEventListener('pagehide', () => {
  generation++;
  for (const a of active) a.cancel();
  active.clear();
  late?.disconnect();
  clearTimeout(lateTimer);
  document.body.classList.remove('nova-loading');
});
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    document.body.classList.remove('nova-loading');
    if (!started) void enterWorkspace(false);
  }
});
setTimeout(() => document.body.classList.remove('nova-loading'), 4000);
