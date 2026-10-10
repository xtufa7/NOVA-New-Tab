import { getProfile, update } from '../storage/settings';
import { type WidgetId, type LayoutItem } from '../settings/schema';
import { button, el } from '../shared/dom';
let editing = false;
let cleanup: (() => void)[] = [];
export const isEditing = () => editing;
export function toggleEdit(force?: boolean) {
  editing = force ?? !editing;
  document.body.classList.toggle('editing', editing);
  document.querySelector<HTMLElement>('#edit-banner')!.hidden = !editing;
  decorate();
}
export function applyLayout(node: HTMLElement, id: WidgetId) {
  const item = getProfile().layout[id];
  node.removeAttribute('style');
  if (item?.custom) {
    Object.assign(node.style, {
      position: 'absolute',
      left: item.x + '%',
      top: item.y + '%',
      width: item.w + '%',
      height: item.h + '%',
      zIndex: String(item.z),
      margin: '0',
      overflow: 'visible',
    });
  }
  node.dataset.locked = String(item?.locked ?? false);
}
export function decorate() {
  const activeLabel = document.activeElement?.getAttribute('aria-label');
  cleanup.forEach((fn) => fn());
  cleanup = [];
  document
    .querySelectorAll('.edit-tools,.resize-handle,.alignment-x,.alignment-y')
    .forEach((n) => n.remove());
  if (!editing) return;
  const canvas = document.querySelector<HTMLElement>('#canvas')!;
  for (const node of canvas.querySelectorAll<HTMLElement>('.widget')) {
    const id = node.id.replace('widget-', '') as WidgetId;
    const tools = el('div', 'edit-tools');
    const drag = button('⠿ ' + id, () => {}, 'drag-handle');
    drag.setAttribute('aria-label', 'Drag ' + id);
    tools.append(drag);
    tools.append(
      button(getProfile().layout[id]?.locked ? 'Unlock' : 'Lock', () =>
        update((_s, p) => {
          const item = capture(node, id);
          item.locked = !item.locked;
          p.layout[id] = item;
        }),
      ),
    );
    tools.append(button('Hide', () => update((_s, p) => (p.widgets[id] = false))));
    tools.append(button('Reset', () => update((_s, p) => delete p.layout[id])));
    tools.append(
      button('↑', () =>
        update((_s, p) => {
          const item = capture(node, id);
          item.z = Math.min(100, item.z + 1);
          p.layout[id] = item;
        }),
      ),
    );
    tools.append(
      button('↓', () =>
        update((_s, p) => {
          const item = capture(node, id);
          item.z = Math.max(0, item.z - 1);
          p.layout[id] = item;
        }),
      ),
    );
    if (id === 'links')
      tools.append(
        button('Duplicate link', () =>
          update((_s, p) => {
            if (p.links[0])
              p.links.push({
                ...p.links[0],
                id: crypto.randomUUID(),
                title: p.links[0].title + ' copy',
              });
          }),
        ),
      );
    node.append(tools);
    const resize = el('button', 'resize-handle');
    resize.setAttribute('aria-label', 'Resize ' + id);
    resize.title = 'Drag to resize';
    node.append(resize);
    for (const [handle, mode] of [
      [drag, 'drag'],
      [resize, 'resize'],
    ] as const) {
      const start = (event: PointerEvent) => {
        if (getProfile().layout[id]?.locked) return;
        event.preventDefault();
        const box = canvas.getBoundingClientRect(),
          initial = capture(node, id),
          startX = event.clientX,
          startY = event.clientY;
        let next = { ...initial };
        handle.setPointerCapture(event.pointerId);
        const ax = el('div', 'alignment-x'),
          ay = el('div', 'alignment-y');
        canvas.append(ax, ay);
        const move = (e: PointerEvent) => {
          const dx = ((e.clientX - startX) / box.width) * 100,
            dy = ((e.clientY - startY) / box.height) * 100;
          const snapX = (24 / box.width) * 100,
            snapY = (24 / box.height) * 100;
          if (mode === 'drag') {
            next.x = Math.max(
              0,
              Math.min(100 - next.w, Math.round((initial.x + dx) / snapX) * snapX),
            );
            next.y = Math.max(
              0,
              Math.min(100 - next.h, Math.round((initial.y + dy) / snapY) * snapY),
            );
            if (Math.abs(next.x + next.w / 2 - 50) < 1.5) next.x = 50 - next.w / 2;
            if (Math.abs(next.y + next.h / 2 - 50) < 1.5) next.y = 50 - next.h / 2;
          } else {
            next.w = Math.max(
              10,
              Math.min(100 - next.x, Math.round((initial.w + dx) / snapX) * snapX),
            );
            next.h = Math.max(
              5,
              Math.min(100 - next.y, Math.round((initial.h + dy) / snapY) * snapY),
            );
          }
          Object.assign(node.style, {
            position: 'absolute',
            left: next.x + '%',
            top: next.y + '%',
            width: next.w + '%',
            height: next.h + '%',
            margin: '0',
          });
        };
        const end = () => {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', end);
          handle.removeEventListener('pointercancel', end);
          ax.remove();
          ay.remove();
          update((_s, p) => (p.layout[id] = next));
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
      };
      handle.addEventListener('pointerdown', start);
      cleanup.push(() => handle.removeEventListener('pointerdown', start));
      handle.addEventListener('keydown', (e) => {
        if (
          !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) ||
          getProfile().layout[id]?.locked
        )
          return;
        e.preventDefault();
        update((_s, p) => {
          const item = capture(node, id);
          if (mode === 'drag') {
            item.x = Math.max(
              0,
              Math.min(
                100 - item.w,
                item.x + (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0),
              ),
            );
            item.y = Math.max(
              0,
              Math.min(
                100 - item.h,
                item.y + (e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0),
              ),
            );
          } else {
            item.w = Math.max(
              10,
              Math.min(
                100 - item.x,
                item.w + (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0),
              ),
            );
            item.h = Math.max(
              5,
              Math.min(
                100 - item.y,
                item.h + (e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0),
              ),
            );
          }
          p.layout[id] = item;
        });
      });
    }
  }
  if (activeLabel)
    Array.from(canvas.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.getAttribute('aria-label') === activeLabel)
      ?.focus({ preventScroll: true });
}
function capture(node: HTMLElement, id: WidgetId): LayoutItem {
  const existing = getProfile().layout[id];
  if (existing?.custom) return { ...existing };
  const c = document.querySelector('#canvas')!.getBoundingClientRect(),
    r = node.getBoundingClientRect();
  return {
    x: Math.max(0, ((r.left - c.left) / c.width) * 100),
    y: Math.max(0, ((r.top - c.top) / c.height) * 100),
    w: Math.max(5, Math.min(100, (r.width / c.width) * 100)),
    h: Math.max(2, Math.min(100, (r.height / c.height) * 100)),
    z: existing?.z ?? 1,
    locked: existing?.locked ?? false,
    custom: true,
  };
}
document.querySelector('#edit-done')?.addEventListener('click', () => toggleEdit(false));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editing && !document.querySelector('.control-center'))
    toggleEdit(false);
});
document.addEventListener('nova-render', () => {
  document
    .querySelectorAll<HTMLElement>('.widget')
    .forEach((node) => applyLayout(node, node.id.replace('widget-', '') as WidgetId));
  decorate();
});
