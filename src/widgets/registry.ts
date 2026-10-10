import { getProfile, getSettings, update } from '../storage/settings';
import { widgetIds, type WidgetId } from '../settings/schema';
import { el, safeURL } from '../shared/dom';
import { icon } from '../shared/icons';
const optional = new Set<WidgetId>([
  'notes',
  'music',
  'status',
  'tabs',
  'recent',
  'sessions',
  'shelf',
]);
const mounted = new Map<WidgetId, { profile: string; cleanup: () => void }>();
let generation = 0,
  clockTimer: ReturnType<typeof setTimeout>,
  linkSignature = '',
  creditSignature = '';
function clock() {
  clearTimeout(clockTimer);
  const p = getProfile(),
    now = new Date();
  const node = document.querySelector('#clock');
  if (node) {
    const parts = new Intl.DateTimeFormat([], {
      hour: '2-digit',
      minute: '2-digit',
      ...(p.appearance.clockStyle === 'seconds' ? { second: '2-digit' } : {}),
      hour12: p.appearance.clockStyle === '12h',
    }).formatToParts(now);
    const digits = el(
      'span',
      'clock-digits',
      parts
        .filter((p) => p.type !== 'dayPeriod')
        .map((p) => p.value)
        .join('')
        .trim(),
    );
    const meridiem = el(
      'small',
      'clock-meridiem',
      parts.find((p) => p.type === 'dayPeriod')?.value ?? '',
    );
    node.replaceChildren(digits, meridiem);
    (node as HTMLElement).dataset.meridiem = p.appearance.meridiemPosition;
  }
  document.querySelectorAll<HTMLElement>('.clock-widget .eyebrow').forEach((n) => {
    n.textContent = p.appearance.clockCaption;
    n.hidden = !p.appearance.showClockCaption;
  });
  const date = document.querySelector('#widget-date');
  if (date)
    date.textContent = now.toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  if (!document.hidden && (p.widgets.clock || p.widgets.date)) {
    const step = p.appearance.clockStyle === 'seconds' ? 1000 : 60000;
    clockTimer = setTimeout(clock, step - (Date.now() % step) + 10);
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(clockTimer);
  else clock();
});
function links(node: HTMLElement) {
  const p = getProfile();
  const signature = JSON.stringify([p.id, p.links, p.linksOptions]);
  if (linkSignature === signature && node.childNodes.length) return;
  linkSignature = signature;
  node.replaceChildren();
  node.classList.toggle('compact', p.linksOptions.compact);
  const groups = [...new Set(p.links.map((l) => l.group))];
  for (const group of groups) {
    const holder = el('div', 'link-group');
    if (group) holder.append(el('span', 'group-label', group));
    for (const link of p.links.filter((l) => l.group === group)) {
      const a = el('a', 'quick-link');
      a.href = safeURL(link.url);
      a.title = link.title + (link.shortcut ? ' · ' + link.shortcut : '');
      a.setAttribute('aria-label', link.title);
      if (link.newTab) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      a.draggable = true;
      a.dataset.linkId = link.id;
      const span = el('span', 'link-icon');
      if (/^data:image\/(png|jpeg|webp|gif);base64,/.test(link.icon) || link.favicon) {
        const image = el('img');
        image.alt = '';
        image.src = link.favicon ? new URL('/favicon.ico', link.url).href : link.icon;
        image.referrerPolicy = 'no-referrer';
        image.addEventListener('error', () => {
          span.textContent = '↗';
        });
        span.append(image);
      } else if (['github', 'discord', 'youtube'].includes(link.id.toLowerCase()))
        span.append(icon(link.id.toLowerCase()));
      else span.textContent = link.icon || '↗';
      a.append(span);
      if (p.linksOptions.labels && !p.linksOptions.iconsOnly) a.append(el('span', '', link.title));
      a.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/nova-link', link.id);
      });
      a.addEventListener('dragover', (e) => e.preventDefault());
      a.addEventListener('drop', (e) => {
        e.preventDefault();
        const id = e.dataTransfer?.getData('text/nova-link');
        if (id === link.id) return;
        update((_s, p) => {
          const from = p.links.findIndex((l) => l.id === id),
            to = p.links.findIndex((l) => l.id === link.id);
          if (from >= 0 && to >= 0) {
            const [item] = p.links.splice(from, 1);
            p.links.splice(to, 0, item);
          }
        });
      });
      holder.append(a);
    }
    node.append(holder);
  }
}
function credits(node: HTMLElement) {
  const signature = JSON.stringify(getSettings().credits);
  if (signature === creditSignature && node.childNodes.length) return;
  creditSignature = signature;
  node.replaceChildren();
  const row = el('div', 'credit-row');
  for (const [name, url, photo] of [
    ['xtufa7', 'https://github.com/xtufa7', 'accounts/github.png'],
    ['guns.lol/xtufa7', 'https://guns.lol/xtufa7', 'accounts/guns.webp'],
  ]) {
    const link = el('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const avatar = el('img', 'credit-avatar');
    avatar.src = photo;
    avatar.alt = name;
    link.append(avatar, el('span', '', name));
    row.append(link);
    if (url.includes('guns.lol') && getSettings().credits.gunsAvatarId)
      void import('../storage/media').then(async ({ getMedia }) => {
        const blob = await getMedia(getSettings().credits.gunsAvatarId);
        if (!blob || !node.isConnected) return;
        const local = URL.createObjectURL(blob);
        avatar.onload = () => URL.revokeObjectURL(local);
        avatar.src = local;
      });
  }
  node.append(row);
}
export async function renderWidgets() {
  const run = ++generation,
    p = getProfile(),
    canvas = document.querySelector('#canvas')!;
  for (const id of widgetIds) {
    let node = document.querySelector<HTMLElement>('#widget-' + id);
    const enabled = id === 'terminal' || p.widgets[id];
    if (!enabled) {
      node?.remove();
      mounted.get(id)?.cleanup();
      mounted.delete(id);
      continue;
    }
    if (!node) {
      node = el('section', 'widget ' + (optional.has(id) ? 'extra-widget' : id + '-widget'));
      node.id = 'widget-' + id;
      if (id === 'lyrics') {
        const clock = canvas.querySelector('#widget-clock');
        if (clock) clock.after(node);
        else canvas.prepend(node);
      } else canvas.append(node);
      if (id === 'clock') {
        const time = el('div', 'clock');
        time.id = 'clock';
        const caption = el('div', 'eyebrow', 'YOUR TIME. YOUR SPACE.');
        caption.hidden = !p.appearance.showClockCaption;
        node.append(time, caption);
      }
      if (id === 'greeting') {
        const greeting = el('p');
        greeting.id = 'greeting';
        node.append(greeting);
      }
    }
    if (id === 'greeting') {
      const hour = new Date().getHours();
      node
        .querySelector('p')!
        .replaceChildren(
          document.createTextNode(
            `${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}, ${p.terminal.username}`,
          ),
          el('span', '', '.'),
        );
    }
    if (id === 'links') links(node);
    if (id === 'credits') credits(node);
    const item = p.layout[id];
    if (item?.custom) {
      Object.assign(node.style, {
        position: 'absolute',
        left: item.x + '%',
        top: item.y + '%',
        width: item.w + '%',
        height: item.h + '%',
        zIndex: String(item.z),
        margin: '0',
      });
    } else node.removeAttribute('style');
    node.dataset.locked = String(item?.locked ?? false);
    if (optional.has(id) && mounted.get(id)?.profile !== p.id) {
      mounted.get(id)?.cleanup();
      mounted.delete(id);
      const module = id === 'music' ? await import('./music') : await import('./optional');
      if (run !== generation) return;
      const cleanup = await module.mount(node, id);
      if (run !== generation) {
        cleanup();
        return;
      }
      mounted.set(id, { profile: p.id, cleanup });
    }
  }
  // Terminal is mandatory and retains its listeners through profile switches.
  clock();
  document.dispatchEvent(new Event('nova-render'));
}
