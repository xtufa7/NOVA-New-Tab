import { el, button } from '../shared/dom';
import { createSettingsUI } from './ui';
import { render as render0 } from './sections/appearance';
import { render as render1 } from './sections/layout';
import { render as render2 } from './sections/widgets';
import { render as render3 } from './sections/shortcuts';
import { render as render4 } from './sections/terminal';
import { render as render5 } from './sections/music';
import { render as render6 } from './sections/floating-tabs';
import { render as render7 } from './sections/profiles';
import { render as render8 } from './sections/performance';
import { render as render9 } from './sections/privacy';
import { render as render10 } from './sections/backup';
import { render as render11 } from './sections/advanced';
import { render as render12 } from './sections/about';
import { render as renderCompanion } from './sections/companion';
const renderers: Record<string, (ui: ReturnType<typeof createSettingsUI>) => void> = {
  'Browser Companion': renderCompanion,
  Appearance: render0,
  Layout: render1,
  Widgets: render2,
  Shortcuts: render3,
  Terminal: render4,
  Music: render5,
  'Floating Tabs': render6,
  Profiles: render7,
  Performance: render8,
  Privacy: render9,
  Backup: render10,
  Advanced: render11,
  About: render12,
};
const sections = [
  'Appearance',
  'Layout',
  'Widgets',
  'Shortcuts',
  'Terminal',
  'Music',
  'Floating Tabs',
  'Browser Companion',
  'Profiles',
  'Performance',
  'Privacy',
  'Backup',
  'Advanced',
  'About',
];
let overlay: HTMLElement | undefined,
  panel: HTMLElement,
  nav: HTMLElement,
  content: HTMLElement,
  current = 'Appearance',
  standalone = false,
  lastFocus: HTMLElement | null = null;
function redraw() {
  const label = document.activeElement?.getAttribute('aria-label');
  const opened = new Set(
    [...content.querySelectorAll<HTMLDetailsElement>('details.settings-group[open]')].map(
      (d) => d.querySelector('summary')?.textContent,
    ),
  );
  const scroll = content.scrollTop;
  renderSection(current);
  content.querySelectorAll<HTMLDetailsElement>('details.settings-group').forEach((d) => {
    if (opened.has(d.querySelector('summary')?.textContent)) d.open = true;
  });
  content.scrollTop = scroll;
  if (label) content.querySelector<HTMLElement>(`[aria-label="${CSS.escape(label)}"]`)?.focus();
}
function close() {
  if (standalone) return;
  overlay?.remove();
  overlay = undefined;
  lastFocus?.focus();
  document.removeEventListener('keydown', keyboard);
}
function keyboard(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
  }
  if (e.key === 'Tab' && overlay) {
    const nodes = Array.from(
      panel.querySelectorAll<HTMLElement>('button,input,textarea,select,a[href]'),
    ).filter((n) => !n.hasAttribute('disabled') && n.offsetParent !== null);
    const first = nodes[0],
      last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
}
export function openControlCenter(section?: string, page = false) {
  current = sections.find((s) => s.toLowerCase() === section?.toLowerCase()) ?? current;
  standalone = page;
  if (overlay) {
    redraw();
    return;
  }
  lastFocus = document.activeElement as HTMLElement;
  const root = document.querySelector('#modal-root') ?? document.body;
  overlay = el('div', page ? '' : 'modal-overlay');
  panel = el('section', 'control-center');
  panel.setAttribute('aria-label', 'NØVA Control Center');
  panel.setAttribute('role', page ? 'region' : 'dialog');
  if (!page) panel.setAttribute('aria-modal', 'true');
  nav = el('nav', 'settings-nav');
  nav.setAttribute('aria-label', 'Settings sections');
  nav.append(el('span', 'wordmark', 'NØVA'), el('span', 'eyebrow', 'CONTROL CENTER'));
  const symbols = ['◐', '▦', '◫', '↗', '›_', '♫', '▣', '♪', '◇', 'ϟ', '◈', '↓', '⚙', 'ⓘ'];
  for (const [index, section] of sections.entries()) {
    const b = button(section, () => renderSection(section));
    b.dataset.section = section;
    b.setAttribute('aria-label', section);
    b.dataset.icon = symbols[index];
    nav.append(b);
  }
  content = el('div', 'settings-main');
  panel.append(nav, content);
  overlay.append(panel);
  root.append(overlay);
  if (!page) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', keyboard);
  }
  redraw();
  nav.querySelector<HTMLButtonElement>(`[data-section="${current}"]`)?.focus();
}
function renderSection(section: string) {
  current = section;
  content.replaceChildren();
  nav.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
    if (b.dataset.section === section) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  const title = el('div', 'settings-heading');
  const heading = el('div');
  heading.append(el('span', 'eyebrow', 'NØVA / YOUR WORKSPACE'), el('h1', '', section));
  const descriptions: Record<string, string> = {
    Appearance: 'Make this space feel like you. Preview your clock, colors and wallpaper.',
    Profiles: 'Independent workspaces. Switch, organize and take them with you.',
    Privacy: 'Clear permissions, local data and protection you control.',
    Music: 'Your soundtrack, lyrics and audio connections in one place.',
    'Floating Tabs': 'Keep a window close. Connect Windows pinning in three steps.',
    About: 'Built by xtufa7. Find me around the web.',
    Performance: 'Control effects and see real browser memory usage.',
  };
  heading.append(
    el(
      'p',
      'settings-description',
      descriptions[section] ?? 'Personalize your workspace. Changes save automatically.',
    ),
  );
  title.append(heading);
  if (!standalone) title.append(button('×', close));
  content.append(title);

  const ui = createSettingsUI(content, redraw, close);
  renderers[section]?.(ui);
  content.scrollTop = 0;
}
