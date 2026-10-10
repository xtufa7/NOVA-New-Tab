import type { Profile } from '../settings/schema';
import { safeURL } from '../shared/dom';
export interface Parsed {
  command: string;
  args: string[];
  query: string;
  searchURL?: string;
}
export const commands = [
  'open',
  'theme',
  'profile',
  'music',
  'volume',
  'float',
  'focus',
  'session',
  'help',
  'settings',
  'edit',
  'clear',
];
export function parse(input: string, terminal: Profile['terminal']): Parsed {
  const tokens =
    input
      .trim()
      .match(/"[^"]*"|'[^']*'|\S+/g)
      ?.map((t) => t.replace(/^("|')|("|')$/g, '')) ?? [];
  let command = (tokens.shift() ?? '').toLowerCase();
  let args = tokens;
  const seen = new Set<string>();
  while (Object.hasOwn(terminal.aliases, command) && terminal.aliases[command]) {
    if (seen.has(command) || seen.size >= 10) throw new Error('Command alias cycle.');
    seen.add(command);
    const expanded = terminal.aliases[command].trim().split(/\s+/);
    command = expanded.shift()!.toLowerCase();
    args = [...expanded, ...args];
  }
  if (Object.hasOwn(terminal.engines, command)) {
    const query = args.join(' ');
    return {
      command,
      args,
      query,
      searchURL: safeURL(
        terminal.engines[command].replaceAll('{query}', encodeURIComponent(query)),
      ),
    };
  }
  if (commands.includes(command)) return { command, args, query: args.join(' ') };
  return {
    command: 'search',
    args: tokens,
    query: input.trim(),
    searchURL: safeURL(
      terminal.engines[terminal.engine].replaceAll('{query}', encodeURIComponent(input.trim())),
    ),
  };
}
export function suggestions(input: string, p: Profile): { value: string; label: string }[] {
  const all = [
    ...commands.map((value) => ({ value, label: 'command' })),
    ...Object.keys(p.terminal.engines).map((value) => ({
      value,
      label: 'search engine',
    })),
    ...Object.keys(p.terminal.aliases).map((value) => ({
      value,
      label: 'alias → ' + p.terminal.aliases[value],
    })),
    ...p.links.filter((l) => l.alias).map((l) => ({ value: 'open ' + l.alias, label: l.title })),
  ];
  const lower = input.toLowerCase().trim();
  return all.filter((s) => s.value.startsWith(lower) && s.value !== lower).slice(0, 7);
}
