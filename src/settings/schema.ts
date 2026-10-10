export const SCHEMA_VERSION = 6;
export const widgetIds = [
  'clock',
  'lyrics',
  'date',
  'greeting',
  'terminal',
  'links',
  'notes',
  'music',
  'status',
  'tabs',
  'recent',
  'sessions',
  'credits',
  'shelf',
] as const;
export type WidgetId = (typeof widgetIds)[number];
export interface Appearance {
  theme: string;
  background: 'solid' | 'gradient' | 'image' | 'video';
  color: string;
  gradient: string;
  mediaId: string;
  accent: string;
  text: string;
  opacity: number;
  blur: number;
  brightness: number;
  contrast: number;
  saturation: number;
  panelOpacity: number;
  radius: number;
  shadow: number;
  glow: number;
  font: string;
  fontSize: number;
  clockStyle: '24h' | '12h' | 'seconds';
  clockFace: 'classic' | 'neon' | 'outline' | 'gradient' | 'retro' | 'bold';
  clockFont: string;
  clockCaption: string;
  clockSpacing: number;
  meridiemSize: number;
  meridiemPosition: 'inline' | 'below' | 'hidden';
  customFontId: string;
  clockCustomFontId: string;
  cursor: 'default' | 'crosshair' | 'dot';
  videoLoop: boolean;
  videoSpeed: number;
  customCSS: string;
  cssEnabled: boolean;
  showHeader: boolean;
  showClockCaption: boolean;
  showTerminalHints: boolean;
}
export interface LayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  locked: boolean;
  custom: boolean;
}
export interface QuickLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  favicon: boolean;
  shortcut: string;
  newTab: boolean;
  alias: string;
  group: string;
}
export interface Track {
  id: string;
  title: string;
  artist: string;
  coverId: string;
  playlist: string;
  lyrics?: string;
}
export interface Profile {
  id: string;
  name: string;
  appearance: Appearance;
  layout: Partial<Record<WidgetId, LayoutItem>>;
  widgets: Record<WidgetId, boolean>;
  terminal: {
    username: string;
    hostname: string;
    engine: string;
    engines: Record<string, string>;
    aliases: Record<string, string>;
    history: string[];
  };
  links: QuickLink[];
  linksOptions: { labels: boolean; compact: boolean; iconsOnly: boolean };
  notes: string;
  music: {
    tracks: Track[];
    volume: number;
    shuffle: boolean;
    repeat: 'off' | 'all' | 'one';
    playlist: string;
    muted: boolean;
    autoDuck: boolean;
  };
}
export interface Settings {
  schemaVersion: 6;
  branding: { name: string; hidden: boolean };
  accountAvatars: { github: string; instagram: string; x: string; discord: string };
  memory: { enabled: boolean; browser: 'helium' | 'chrome' | 'msedge' | 'brave' | 'chromium' };
  activeProfile: string;
  profiles: Profile[];
  lyrics: {
    enabled: boolean;
    respectSystem: boolean;
    unit: 'word' | 'letter';
    duration: number;
    stagger: number;
    rise: number;
    blur: number;
    color: string;
    arabicFont: string;
    englishFont: string;
    size: number;
    weight: number;
    spacing: number;
    lineHeight: number;
  };
  entrance: {
    enabled: boolean;
    respectSystem: boolean;
    style: 'rise+blur' | 'rise' | 'fade' | 'zoom' | 'slide';
    duration: number;
    stagger: number;
    delay: number;
    distance: number;
    blur: number;
    easing: 'smooth' | 'ease-out' | 'linear';
    header: boolean;
    widgets: boolean;
    background: boolean;
  };
  performance: {
    lowPower: boolean;
    animations: 'full' | 'reduced' | 'off';
    blur: 'high' | 'medium' | 'low' | 'off';
    video: 'full' | 'reduced' | 'off';
    particles: boolean;
    visualizer: boolean;
  };
  floatingTabs: {
    width: number;
    height: number;
    left: number;
    top: number;
    audio: boolean;
    mode: 'live' | 'interactive';
  };
  credits: { discordURL: string; gunsAvatarId: string; syncGunsAvatar: boolean; lastSync: number };
  tab: {
    title: string;
    animation: 'off' | 'typewriter' | 'scroll';
    speed: number;
    iconId: string;
    animateIcon: boolean;
  };

  shortcuts: { settings: string; edit: string };
  privacy: { rememberHistory: boolean; blockTrackers: boolean; exceptions: string[] };
  fonts: { id: string; name: string; faces: { mediaId: string; unicodeRange: string }[] }[];
  companion: { enabled: boolean; edge: 'left' | 'right'; y: number; exceptions: string[] };
  integrations: {
    spotify: boolean;
    spotifySource: 'web' | 'desktop';
    onlineLyrics: boolean;
    terminalLyrics: boolean;
    lyricsOffset: number;
    lyricsAnimation: 'rise' | 'rise+blur' | 'fade' | 'blur' | 'typewriter' | 'none';
    desktopBridge: boolean;
    spectrum: 'off' | 'bars' | 'cava' | 'native-cava';
  };
  customThemes: { id: string; name: string; appearance: Appearance }[];
  sessions: { id: string; name: string; urls: string[]; created: number }[];
}
export const engines: Record<string, string> = {
  google: 'https://www.google.com/search?q={query}',
  duckduckgo: 'https://duckduckgo.com/?q={query}',
  bing: 'https://www.bing.com/search?q={query}',
  youtube: 'https://www.youtube.com/results?search_query={query}',
  github: 'https://github.com/search?q={query}',
  reddit: 'https://www.reddit.com/search/?q={query}',
  x: 'https://x.com/search?q={query}',
  stackoverflow: 'https://stackoverflow.com/search?q={query}',
};
export const themes: Record<
  string,
  { color: string; accent: string; text: string; gradient: string }
> = {
  void: {
    color: '#0b0b10',
    accent: '#b2a1ef',
    text: '#eeedf5',
    gradient: 'radial-gradient(ellipse at 50% 20%, #20172c 0%, #0b0b10 65%)',
  },
  charcoal: {
    color: '#111314',
    accent: '#a7c6bd',
    text: '#e4ece8',
    gradient: 'radial-gradient(ellipse at 50% 15%, #20302a 0%, #111314 65%)',
  },
  dusk: {
    color: '#150e17',
    accent: '#e6a8b8',
    text: '#f7edf1',
    gradient: 'radial-gradient(ellipse at 50% 20%, #38212e 0%, #150e17 65%)',
  },
  aurora: {
    color: '#071918',
    accent: '#64fbd0',
    text: '#e4fff8',
    gradient:
      'radial-gradient(at 20% 15%, #18574b, transparent 65%), radial-gradient(at 85% 70%, #28225b, #071918 75%)',
  },
  electric: {
    color: '#101126',
    accent: '#7daaff',
    text: '#eef2ff',
    gradient:
      'radial-gradient(at 15% 20%, #243d72, transparent 65%), radial-gradient(at 90% 70%, #512969, #101126 75%)',
  },
  sunset: {
    color: '#271226',
    accent: '#ffbb83',
    text: '#fff1e7',
    gradient:
      'radial-gradient(at 20% 10%, #803c50, transparent 60%), radial-gradient(at 90% 80%, #442976, #271226 75%)',
  },
  candy: {
    color: '#1e1230',
    accent: '#f69be6',
    text: '#fbecff',
    gradient:
      'radial-gradient(at 10% 30%, #662753, transparent 65%), radial-gradient(at 90% 10%, #3c487a, #1e1230 75%)',
  },
  ocean: {
    color: '#071b29',
    accent: '#70d6f4',
    text: '#e5f7ff',
    gradient: 'radial-gradient(at 60% 10%, #174761, #071b29 70%)',
  },
  ember: {
    color: '#21110e',
    accent: '#ff906d',
    text: '#ffede6',
    gradient: 'radial-gradient(at 50% 10%, #603326, #21110e 70%)',
  },
  mocha: {
    color: '#1e1e2e',
    accent: '#cba6f7',
    text: '#cdd6f4',
    gradient: 'radial-gradient(ellipse at 50% 10%, #30263f, #1e1e2e 75%)',
  },
  frost: {
    color: '#e9edf2',
    accent: '#57539c',
    text: '#242534',
    gradient: 'radial-gradient(ellipse at 50% 20%, #f7f4ff 0%, #e9edf2 70%)',
  },
};
export function makeProfile(name = 'Minimal', id: string = crypto.randomUUID()): Profile {
  return {
    id,
    name,
    appearance: {
      theme: 'void',
      background: 'gradient',
      ...themes.void,
      mediaId: '',
      opacity: 100,
      blur: 0,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      panelOpacity: 35,
      radius: 16,
      shadow: 8,
      glow: 0,
      font: 'system',
      fontSize: 14,
      clockStyle: '24h',
      clockFace: 'classic',
      clockFont: 'system',
      clockCaption: 'YOUR TIME. YOUR SPACE.',
      clockSpacing: -0.06,
      meridiemSize: 20,
      meridiemPosition: 'inline',
      customFontId: '',
      clockCustomFontId: '',
      cursor: 'default',
      videoLoop: true,
      videoSpeed: 1,
      customCSS: '',
      cssEnabled: false,
      showHeader: true,
      showClockCaption: true,
      showTerminalHints: true,
    },
    layout: {},
    widgets: Object.fromEntries(
      widgetIds.map((w) => [
        w,
        ['clock', 'lyrics', 'greeting', 'terminal', 'links', 'credits'].includes(w),
      ]),
    ) as Record<WidgetId, boolean>,
    terminal: {
      username: 'KiT',
      hostname: 'Helium',
      engine: 'google',
      engines: { ...engines },
      aliases: {
        g: 'google',
        ddg: 'duckduckgo',
        yt: 'youtube',
        gh: 'github',
        so: 'stackoverflow',
      },
      history: [],
    },
    links: [
      ['GitHub', 'https://github.com', '⌘'],
      ['YouTube', 'https://youtube.com', '▷'],
      ['Discord', 'https://discord.com/app', '◈'],
      ['ChatGPT', 'https://chatgpt.com', '✳'],
    ].map(([title, url, icon]) => ({
      id: title.toLowerCase(),
      title,
      url,
      icon,
      favicon: false,
      shortcut: '',
      newTab: false,
      alias: title.toLowerCase(),
      group: '',
    })),
    linksOptions: { labels: true, compact: false, iconsOnly: false },
    notes: '',
    music: {
      tracks: [],
      volume: 40,
      shuffle: false,
      repeat: 'all',
      playlist: 'All tracks',
      muted: false,
      autoDuck: true,
    },
  };
}
export function defaults(): Settings {
  const profiles = ['Minimal', 'Coding', 'Gaming', 'Work'].map((name) =>
    makeProfile(name, name.toLowerCase()),
  );
  profiles[1].widgets.notes = true;
  profiles[3].widgets.sessions = true;
  return {
    schemaVersion: 6,
    branding: { name: 'NØVA', hidden: false },
    accountAvatars: { github: '', instagram: '', x: '', discord: '' },
    memory: { enabled: true, browser: 'helium' },
    activeProfile: 'minimal',
    profiles,
    lyrics: {
      enabled: true,
      respectSystem: true,
      unit: 'letter',
      duration: 650,
      stagger: 35,
      rise: 16,
      blur: 8,
      color: '#e0e0e0',
      arabicFont: 'system',
      englishFont: 'mono',
      size: 15,
      weight: 400,
      spacing: 0,
      lineHeight: 1.6,
    },
    entrance: {
      enabled: true,
      respectSystem: true,
      style: 'rise+blur',
      duration: 800,
      stagger: 90,
      delay: 100,
      distance: 24,
      blur: 8,
      easing: 'smooth',
      header: true,
      widgets: true,
      background: true,
    },
    performance: {
      lowPower: false,
      animations: 'reduced',
      blur: 'low',
      video: 'reduced',
      particles: false,
      visualizer: false,
    },
    floatingTabs: {
      width: 480,
      height: 300,
      left: 80,
      top: 80,
      audio: false,
      mode: 'live',
    },
    credits: {
      discordURL: 'https://discord.com/app',
      gunsAvatarId: '',
      syncGunsAvatar: false,
      lastSync: 0,
    },
    tab: { title: 'NØVA', animation: 'off', speed: 350, iconId: '', animateIcon: true },
    shortcuts: { settings: 'Ctrl+,', edit: 'Ctrl+Shift+E' },
    privacy: { rememberHistory: true, blockTrackers: false, exceptions: [] },
    fonts: [],
    companion: { enabled: false, edge: 'right', y: 0.5, exceptions: [] },
    integrations: {
      spotify: true,
      spotifySource: 'web',
      onlineLyrics: true,
      terminalLyrics: true,
      lyricsOffset: 0,
      lyricsAnimation: 'rise+blur',
      desktopBridge: false,
      spectrum: 'off',
    },
    customThemes: [],
    sessions: [],
  };
}
export function applyTheme(profile: Profile, name: string) {
  if (!themes[name]) throw new Error(`Unknown theme: ${name}`);
  Object.assign(profile.appearance, themes[name], {
    theme: name,
    background: 'gradient',
  });
}
