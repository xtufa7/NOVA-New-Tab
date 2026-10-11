import { el, shortcut } from '../shared/dom';
import { searchCommands, type Command } from './registry';
export async function send(type: string, data: Record<string, unknown> = {}) {
  if (!globalThis.chrome?.runtime?.id)
    throw Error('Open NØVA as an installed extension to use browser actions.');
  const result = await chrome.runtime.sendMessage({ target: 'worker', type, ...data });
  if (result?.error) throw Error(result.error);
  return result;
}
export function openPalette(parent: HTMLElement | ShadowRoot = document.body, tabId?: number) {
  if (parent.querySelector('.nova-palette')) return;
  const overlay = el('div', 'nova-palette'),
    panel = el('section', 'palette-panel'),
    input = el('input'),
    list = el('div', 'palette-results'),
    status = el('p', 'palette-status', '↑ ↓ choose · Enter run · Escape close');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'NØVA command palette');
  input.maxLength = 200;
  input.placeholder = 'Tabs, themes, workspaces, commands…';
  input.setAttribute('aria-label', 'Search commands');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'true');
  input.setAttribute('aria-controls', 'nova-command-results');
  list.id = 'nova-command-results';
  list.setAttribute('role', 'listbox');
  panel.append(input, list, status);
  overlay.append(panel);
  parent.append(overlay);
  const previous = document.activeElement as HTMLElement | null;
  let items: Command[] = [],
    visible: Command[] = [],
    favorites: string[] = [],
    recent: string[] = [],
    selected = 0;
  const close = () => {
    overlay.remove();
    previous?.focus();
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  const run = async (item: Command) => {
    try {
      await send('suite-command', { id: item.id, tabId });
      close();
    } catch (e) {
      status.textContent = String(e instanceof Error ? e.message : e);
    }
  };
  const paint = () => {
    visible = searchCommands(items, input.value, favorites, recent);
    selected = Math.min(selected, Math.max(0, visible.length - 1));
    list.replaceChildren();
    visible.forEach((item, i) => {
      const row = el('div', 'palette-row'),
        b = el('button', '', item.label),
        star = el('button', 'palette-star', favorites.includes(item.id) ? '★' : '☆');
      b.id = 'nova-command-' + i;
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', String(i === selected));
      b.append(el('small', '', item.category));
      b.addEventListener('click', () => void run(item));
      star.setAttribute('aria-label', 'Favorite ' + item.label);
      star.addEventListener('click', () => {
        void send('suite-favorite', { id: item.id })
          .then(() => {
            favorites = favorites.includes(item.id)
              ? favorites.filter((id) => id !== item.id)
              : [...favorites, item.id];
            paint();
          })
          .catch((e) => (status.textContent = e.message));
      });
      row.append(b, star);
      list.append(row);
    });
    input.setAttribute('aria-activedescendant', 'nova-command-' + selected);
    if (!visible.length) list.append(el('p', '', 'No matching commands.'));
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  };
  input.addEventListener('input', () => {
    selected = 0;
    paint();
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      selected =
        (selected + (e.key === 'ArrowDown' ? 1 : -1) + visible.length) %
        Math.max(1, visible.length);
      paint();
    }
    if (e.key === 'Enter' && visible[selected]) {
      e.preventDefault();
      void run(visible[selected]);
    }
    if (e.key === 'Tab') {
      const nodes = [input, ...panel.querySelectorAll<HTMLButtonElement>('button')];
      const i = nodes.indexOf(
        (parent instanceof ShadowRoot
          ? parent.activeElement
          : document.activeElement) as HTMLInputElement,
      );
      e.preventDefault();
      nodes[(i + (e.shiftKey ? -1 : 1) + nodes.length) % nodes.length].focus();
    }
  });
  void send('suite-registry')
    .then((data) => {
      if (data.enabled === false) {
        status.textContent = 'Command Palette is disabled in settings.';
        return;
      }
      items = data.items;
      favorites = data.favorites;
      recent = data.recent;
      paint();
    })
    .catch((e) => (status.textContent = e.message));
  input.focus();
  return close;
}
export function paletteShortcut(event: KeyboardEvent, key: string) {
  return shortcut(event) === key;
}
