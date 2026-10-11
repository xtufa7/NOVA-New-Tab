import type { Settings } from '../settings/schema';
import { themes } from '../settings/schema';
import { palettes } from '../themes/tokens';
export interface Command {
  id: string;
  label: string;
  category: string;
  keywords?: string;
  action: string;
  value?: string;
}
export function registry(
  s: Settings,
  tabs: { id?: number; title?: string; url?: string }[] = [],
): Command[] {
  const items: Command[] = [
    { id: 'manager', label: 'Open Tab Manager', category: 'Tabs', action: 'manager' },
    {
      id: 'web-toggle',
      label: 'Toggle website appearance',
      category: 'Website',
      action: 'web-toggle',
    },
    { id: 'inspector', label: 'Inspect this website', category: 'Website', action: 'inspect' },
    {
      id: 'focus-site',
      label: 'Toggle Focus Mode for this site',
      category: 'Focus',
      action: 'focus',
    },
    {
      id: 'focus-pick',
      label: 'Choose a distraction to hide',
      category: 'Focus',
      action: 'focus-pick',
    },
    {
      id: 'web-original',
      label: 'Restore original site colors',
      category: 'Website',
      action: 'web-mode',
      value: 'original',
    },
    {
      id: 'web-smart',
      label: 'Smart website colors',
      category: 'Website',
      action: 'web-mode',
      value: 'smart',
    },
    { id: 'float', label: 'Float current tab', category: 'Floating', action: 'float' },
    { id: 'music-play', label: 'Play music', category: 'Music', action: 'music', value: 'play' },
    { id: 'music-pause', label: 'Pause music', category: 'Music', action: 'music', value: 'pause' },
  ];
  for (const action of ['next', 'prev', 'shuffle', 'repeat', 'mute'])
    items.push({
      id: 'music-' + action,
      label: 'Music: ' + action,
      category: 'Music',
      action: 'music',
      value: action,
    });
  for (const section of [
    'Appearance',
    'Website Appearance',
    'Theme Inspector',
    'Theme Marketplace',
    'Tab Manager',
    'Command Palette',
    'Adaptive Themes',
    'Focus Mode',
    'Profiles',
    'Music',
    'Backup',
  ])
    items.push({
      id: 'settings:' + section,
      label: 'Open ' + section,
      category: 'Settings',
      action: 'settings',
      value: section,
    });
  for (const p of s.profiles)
    items.push({
      id: 'profile:' + p.id,
      label: 'Switch workspace: ' + p.name,
      category: 'Workspaces',
      action: 'profile',
      value: p.id,
    });
  for (const [id] of Object.entries(themes))
    items.push({
      id: 'theme:' + id,
      label: 'New Tab theme: ' + id,
      category: 'Themes',
      action: 'theme',
      value: id,
    });
  for (const p of [...palettes, ...s.suite.website.custom])
    items.push({
      id: 'palette:' + p.id,
      label: 'Website palette: ' + p.name,
      category: 'Themes',
      action: 'palette',
      value: p.id,
    });
  for (const t of tabs)
    if (t.id)
      items.push({
        id: 'tab:' + t.id,
        label: t.title || t.url || 'Untitled tab',
        keywords: t.url,
        category: 'Tabs',
        action: 'tab',
        value: String(t.id),
      });
  for (const session of s.sessions)
    items.push({
      id: 'session:' + session.id,
      label: 'Restore session: ' + session.name,
      category: 'Sessions',
      action: 'session',
      value: session.id,
    });
  return items;
}
export function fuzzy(query: string, value: string) {
  const q = query.trim().toLowerCase(),
    v = value.toLowerCase();
  if (!q) return 0;
  const direct = v.indexOf(q);
  if (direct >= 0) return 1000 - direct;
  let pos = 0,
    score = 0;
  for (const c of q) {
    const i = v.indexOf(c, pos);
    if (i < 0) return -1;
    score += 10 - (i - pos);
    pos = i + 1;
  }
  return score;
}
export function searchCommands(
  items: Command[],
  query: string,
  favorites: string[] = [],
  recent: string[] = [],
) {
  return items
    .map((item) => ({
      item,
      score: fuzzy(query, item.label + ' ' + item.category + ' ' + (item.keywords ?? '')),
    }))
    .filter((v) => v.score >= 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(favorites.includes(b.item.id)) - Number(favorites.includes(a.item.id)) ||
        recent.indexOf(a.item.id) - recent.indexOf(b.item.id),
    )
    .slice(0, 60)
    .map((v) => v.item);
}
