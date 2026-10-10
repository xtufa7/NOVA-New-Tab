import { parse, suggestions } from './parser';
import { getProfile, getSettings, update, flush } from '../storage/settings';
import { applyTheme } from '../settings/schema';
import { el, navigate, shortcut } from '../shared/dom';
import { developerCommand } from './developer';
interface Hooks {
  openSettings: (section?: string) => Promise<void>;
  toggleEdit: () => Promise<void>;
}
let focusEnd = 0;
let focusTimer: ReturnType<typeof setTimeout>;
export function initTerminal(hooks: Hooks) {
  const input = document.querySelector<HTMLInputElement>('#terminal-input')!,
    form = document.querySelector<HTMLFormElement>('#terminal-form')!,
    list = document.querySelector<HTMLElement>('#suggestions')!,
    status = document.querySelector<HTMLElement>('#terminal-status')!;
  let selected = -1,
    historyIndex = -1,
    draft = '',
    items: ReturnType<typeof suggestions> = [];
  function prompt() {
    const p = getProfile().terminal;
    document.querySelector('.prompt-user')!.textContent = p.username;
    document.querySelector('.prompt-host')!.textContent = '@' + p.hostname;
  }
  document.addEventListener('nova-render', prompt);
  prompt();
  function dismiss() {
    list.hidden = true;
    selected = -1;
    input.removeAttribute('aria-activedescendant');
    input.setAttribute('aria-expanded', 'false');
  }
  function complete(value: string) {
    input.value = value + ' ';
    dismiss();
    input.focus();
  }
  function paint() {
    list.replaceChildren();
    items.forEach((item, i) => {
      const b = el('button', '', item.value);
      b.type = 'button';
      b.id = 'suggestion-' + i;
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', String(i === selected));
      const label = el('small', '', item.label);
      b.append(label);
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => complete(item.value));
      list.append(b);
    });
    list.hidden = !items.length;
    input.setAttribute('aria-expanded', String(!!items.length));
    if (selected >= 0) input.setAttribute('aria-activedescendant', 'suggestion-' + selected);
  }
  input.addEventListener('input', () => {
    historyIndex = -1;
    selected = -1;
    items = input.value.trim() ? suggestions(input.value, getProfile()).slice(0, 3) : [];
    paint();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!list.hidden) dismiss();
      else input.value = '';
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && items.length && !list.hidden) {
      e.preventDefault();
      complete(items[Math.max(0, selected)].value);
      return;
    }
    if (e.key === 'ArrowDown' && !list.hidden && historyIndex === -1) {
      e.preventDefault();
      selected = (selected + 1) % items.length;
      paint();
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const history = getProfile().terminal.history;
      if (!history.length) return;
      e.preventDefault();
      if (historyIndex === -1) draft = input.value;
      historyIndex = Math.min(
        history.length - 1,
        Math.max(-1, historyIndex + (e.key === 'ArrowUp' ? 1 : -1)),
      );
      input.value = historyIndex === -1 ? draft : history[historyIndex];
      dismiss();
    }
    if (e.key === 'Enter' && selected >= 0 && !list.hidden) {
      e.preventDefault();
      complete(items[selected].value);
    }
  });
  document.addEventListener('click', (e) => {
    if (!form.contains(e.target as Node) && !list.contains(e.target as Node)) dismiss();
  });
  document.addEventListener('keydown', (e) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement ||
      document.querySelector('.control-center')
    )
      return;
    const link = getProfile().links.find((l) => l.shortcut === shortcut(e));
    if (link) {
      e.preventDefault();
      navigate(link.url, link.newTab);
    }
    if (e.key === '/' && !e.ctrlKey) {
      e.preventDefault();
      input.focus();
    }
  });
  async function execute(raw: string) {
    const developerResult = await developerCommand(raw);
    if (developerResult !== undefined) return developerResult;
    const p = getProfile();
    if (getSettings().privacy.rememberHistory)
      update((_s, p) => {
        p.terminal.history = [raw, ...p.terminal.history.filter((v) => v !== raw)].slice(0, 100);
      });
    const quick = p.links.find(
      (l) => l.alias && raw.trim().toLowerCase() === l.alias.toLowerCase(),
    );
    if (quick) {
      await flush();
      navigate(quick.url, quick.newTab);
      return '';
    }
    const parsed = parse(raw, p.terminal),
      { command, args, query } = parsed;
    if (parsed.searchURL) {
      await flush();
      navigate(parsed.searchURL);
      return '';
    }
    switch (command) {
      case 'open': {
        const link = p.links.find((l) =>
          [l.alias, l.title, l.id].some((v) => v.toLowerCase() === query.toLowerCase()),
        );
        if (!link) throw new Error('Link not found. Add it in Shortcuts.');
        await flush();
        navigate(link.url, link.newTab);
        return '';
      }
      case 'theme':
        update((_s, p) => applyTheme(p, query.toLowerCase()));
        return 'Theme → ' + query;
      case 'profile': {
        const found = getSettings().profiles.find(
          (p) => p.name.toLowerCase() === query.toLowerCase() || p.id === query,
        );
        if (!found) throw new Error('Profile not found.');
        update((s) => (s.activeProfile = found.id));
        return 'Workspace → ' + found.name;
      }
      case 'settings':
        await hooks.openSettings(query || undefined);
        return '';
      case 'edit':
        await hooks.toggleEdit();
        return '';
      case 'clear':
        return '';
      case 'help':
        return 'g / ddg / yt / gh / so <search>\nopen <link> · theme void / charcoal / dusk / frost\nprofile <name> · settings · edit\nmusic play / pause / next / prev / shuffle / repeat\nvolume 0–100 · float current / close / mute\nsession save / open <name> · focus <minutes>\nsudo developer · sudo lock (name customization)\n↑ history · ↓ suggestions · Tab complete · / focus';
      case 'music':
      case 'volume': {
        await flush();
        const m = await import('../music/client');
        await m.musicCommand(
          command === 'volume' ? 'volume' : (args[0] ?? 'play'),
          command === 'volume' ? Number(args[0]) : undefined,
        );
        return 'Music → ' + (query || 'play');
      }
      case 'float': {
        const m = await import('../floating/client');
        await m.floatCommand(args[0] ?? 'current');
        return 'Floating tab → ' + (args[0] ?? 'current');
      }
      case 'session': {
        const m = await import('../sessions/index');
        const name = args.slice(1).join(' ');
        if (args[0] === 'save') await m.saveSession(name);
        else if (args[0] === 'open') await m.openSession(name);
        else throw new Error('Use session save <name> or session open <name>.');
        return 'Session → ' + name;
      }
      case 'focus': {
        const minutes = Number(args[0]);
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240)
          throw new Error('Choose 1–240 minutes.');
        focusEnd = Date.now() + minutes * 60000;
        tickFocus();
        return `Focus started · ${minutes} minutes`;
      }
      default:
        throw new Error('Unknown command. Type help.');
    }
  }
  function tickFocus() {
    clearTimeout(focusTimer);
    if (!focusEnd) return;
    const remaining = Math.max(0, focusEnd - Date.now());
    if (!remaining) {
      status.textContent = 'Focus complete. Take a breath.';
      focusEnd = 0;
      return;
    }
    status.textContent = `Focus · ${Math.ceil(remaining / 60000)} minutes remaining`;
    if (!document.hidden) focusTimer = setTimeout(tickFocus, 60000);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTimeout(focusTimer);
    else tickFocus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    if (!raw) return;
    input.value = '';
    historyIndex = -1;
    dismiss();
    void execute(raw)
      .then((message) => (status.textContent = message))
      .catch(
        (error) => (status.textContent = error instanceof Error ? error.message : String(error)),
      );
  });
}
