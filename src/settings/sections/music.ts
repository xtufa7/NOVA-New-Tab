import { getProfile, getSettings, flush } from '../../storage/settings';
import { type Profile, defaults } from '../schema';
import { lyricMotionAllowed } from '../../music/lyric-style';
import { el, button, toast, report } from '../../shared/dom';
import { animateLyric, type LyricAnimation } from '../../music/lyric-animation';
import { isGecko } from '../../shared/platform';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const { field, range, files, note, change, redraw, resetButton } = ui;
  const content = ui.content;
  const p = getProfile();
  const settings = getSettings();
  ui.group('Spotify & synchronized lyrics', () => {
    note(
      'Spotify Web and lyrics start automatically. Open open.spotify.com and play a song. You can disable either below. Desktop Spotify needs the one-time Windows setup shown further down.',
    );
    const connection = el('div', 'spotify-connection');
    connection.textContent = 'Spotify · checking connection…';
    ui.content.append(connection);
    void import('../../music/spotify')
      .then(async ({ spotifyStatus }) => {
        const status = await spotifyStatus();
        if (!connection.isConnected) return;
        connection.textContent = !settings.integrations.spotify
          ? 'Spotify is disconnected. Connect below.'
          : status?.title
            ? `${status.playing ? 'Playing' : 'Paused'} · ${status.title} — ${status.artist || 'Artist not detected'}`
            : settings.integrations.spotifySource === 'web'
              ? 'Open Spotify Web, play a song, then reconnect below if needed.'
              : 'Enable Desktop bridge below, then play a song in Spotify on Windows.';
      })
      .catch(report);
    ui.content.append(
      button('Reconnect Spotify + enable lyrics', async () => {
        const origin = 'https://open.spotify.com/*';
        if (
          !(await chrome.permissions.request({
            origins: [origin, 'https://lrclib.net/*'],
          }))
        )
          throw new Error('Access was not granted.');
        change((s) => {
          s.integrations.spotify = true;
          s.integrations.spotifySource = 'web';
          s.integrations.onlineLyrics = true;
        });
        await flush();
        if (getSettings().integrations.spotifySource === 'web') {
          const result = await chrome.runtime.sendMessage({
            target: 'worker',
            type: 'spotify-reconnect',
          });
          if (result?.error) throw new Error(result.error);
          toast(
            result?.tabs
              ? 'Spotify reader refreshed. Play a song in Spotify.'
              : 'Open open.spotify.com and play a song.',
          );
        }
        redraw();
      }),
    );
    field(
      'Spotify source',
      'text',
      settings.integrations.spotifySource,
      (v) => {
        change((s) => {
          s.integrations.spotifySource = v as 'web' | 'desktop';
          s.integrations.spotify = true;
        });
        redraw();
      },
      ['web', 'desktop'],
    );
    ui.content.append(
      button(
        settings.integrations.spotify ? 'Disable Spotify connection' : 'Connect Spotify',
        async () => {
          if (
            !getSettings().integrations.spotify &&
            !(await chrome.permissions.request({
              origins: ['https://open.spotify.com/*'],
            }))
          )
            throw new Error('Spotify access was not granted.');
          change((s) => {
            s.integrations.spotify = !s.integrations.spotify;
            if (s.integrations.spotify) {
              s.integrations.onlineLyrics = true;
              s.integrations.terminalLyrics = true;
            }
          });
          await flush();
          redraw();
        },
      ),
    );
    ui.content.append(
      button(
        settings.integrations.onlineLyrics ? 'Disable online lyrics' : 'Enable online lyrics',
        async () => {
          if (
            !getSettings().integrations.onlineLyrics &&
            !(await chrome.permissions.request({
              origins: ['https://lrclib.net/*'],
            }))
          )
            throw new Error('Lyrics access was not granted.');
          change((s) => (s.integrations.onlineLyrics = !s.integrations.onlineLyrics));
          await flush();
          redraw();
        },
      ),
    );
    field('Transparent lyrics in terminal', 'checkbox', settings.integrations.terminalLyrics, (v) =>
      change((s) => (s.integrations.terminalLyrics = Boolean(v))),
    );
    range(
      'Lyrics timing offset (seconds)',
      settings.integrations.lyricsOffset,
      -10,
      10,
      (v) => change((s) => (s.integrations.lyricsOffset = v)),
      0.1,
    );
    note(
      'Lyrics replace the idle search placeholder. Click or type to restore the terminal and move lyrics between the clock and greeting. Move the Lyrics widget in Layout. Word timing is exact with word timestamps; otherwise the reveal is estimated from line timings.',
    );
  });
  ui.group('Lyrics typography & motion', () => {
    const c = settings.lyrics;
    const status = el(
      'p',
      'motion-status',
      lyricMotionAllowed()
        ? 'Live lyrics motion is ready · independent of page Animations.'
        : 'Live motion is paused. Check the toggle, Low Power Mode and system reduced motion.',
    );
    ui.content.append(status);
    const updateStatus = () => {
      if (!status.isConnected) {
        document.removeEventListener('nova-render', updateStatus);
        return;
      }
      status.textContent = lyricMotionAllowed()
        ? 'Live lyrics motion is ready · independent of page Animations.'
        : 'Live motion is paused. Check the toggle, Low Power Mode and system reduced motion.';
    };
    document.addEventListener('nova-render', updateStatus);
    field('Enable lyrics animation', 'checkbox', c.enabled, (v) =>
      change((s) => (s.lyrics.enabled = Boolean(v))),
    );
    field('Respect system reduced motion for lyrics', 'checkbox', c.respectSystem, (v) =>
      change((s) => (s.lyrics.respectSystem = Boolean(v))),
    );
    field(
      'Animate by',
      'text',
      c.unit,
      (v) => change((s) => (s.lyrics.unit = v as 'word' | 'letter')),
      ['letter', 'word'],
    );
    const fonts = [
      'system',
      'mono',
      'serif',
      'rounded',
      'condensed',
      'display',
      'Arial',
      'Tahoma',
      'Segoe UI',
      ...settings.fonts.map((f) => 'font-' + f.id),
    ];
    for (const [label, key] of [
      ['Arabic lyrics font', 'arabicFont'],
      ['English lyrics font', 'englishFont'],
    ] as const) {
      const select = field(
        label,
        'text',
        c[key],
        (v) => change((s) => (s.lyrics[key] = String(v))),
        fonts,
      ) as HTMLSelectElement;
      for (const option of select.options)
        if (option.value.startsWith('font-'))
          option.textContent =
            settings.fonts.find((f) => 'font-' + f.id === option.value)?.name ?? option.value;
    }
    note(
      'Downloaded or uploaded fonts from Appearance → Fonts are available here. Arabic words remain joined for correct shaping; letter mode animates English graphemes.',
    );
    field('Lyrics color', 'color', c.color, (v) => change((s) => (s.lyrics.color = String(v))));
    range('Lyrics font size', c.size, 10, 36, (v) => change((s) => (s.lyrics.size = v)));
    range(
      'Lyrics font weight',
      c.weight,
      100,
      900,
      (v) => change((s) => (s.lyrics.weight = v)),
      100,
    );
    range(
      'English letter spacing',
      c.spacing,
      -1,
      5,
      (v) => change((s) => (s.lyrics.spacing = v)),
      0.1,
    );
    range(
      'Lyrics line height',
      c.lineHeight,
      1,
      2.5,
      (v) => change((s) => (s.lyrics.lineHeight = v)),
      0.1,
    );
    range(
      'Lyrics duration (ms)',
      c.duration,
      150,
      2000,
      (v) => change((s) => (s.lyrics.duration = v)),
      50,
    );
    range(
      'Letter stagger (ms)',
      c.stagger,
      0,
      100,
      (v) => change((s) => (s.lyrics.stagger = v)),
      5,
    );
    range('Lyrics rise distance (px)', c.rise, 0, 80, (v) => change((s) => (s.lyrics.rise = v)));
    range('Lyrics blur strength (px)', c.blur, 0, 24, (v) => change((s) => (s.lyrics.blur = v)));
    ui.content.append(
      button('Reset lyrics appearance', () => {
        change((s) => {
          s.lyrics = defaults().lyrics;
          s.integrations.lyricsAnimation = 'rise+blur';
        });
        redraw();
      }),
    );
    note(
      'Font, color and motion apply to Spotify lyrics, the music player and the search terminal. Changes update the live preview.',
    );
  });
  ui.group('Lyrics animation preview', () => {
    let restartPreview = () => {};
    field(
      'Lyrics animation',
      'text',
      settings.integrations.lyricsAnimation,
      (v) => {
        change((s) => (s.integrations.lyricsAnimation = v as LyricAnimation));
        restartPreview();
      },
      ['rise', 'rise+blur', 'fade', 'blur', 'typewriter', 'none'],
    );
    const preview = el('div', 'lyric-slot lyrics-preview');
    preview.setAttribute('aria-label', 'Lyrics animation preview');
    ui.content.append(preview);
    const caption = el('p', 'preview-caption');
    ui.content.append(caption);
    const descriptions = {
      'rise+blur': 'Rise + Blur · words glide upward and come into focus',
      rise: 'Rise · words glide upward with a soft fade',
      fade: 'Fade · a smooth reveal without movement',
      blur: 'Blur · words come into focus with a gentle zoom',
      typewriter: 'Typewriter · letters are revealed from left to right',
      none: 'None · instant text, no movement',
    };
    let tick = 0,
      paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let words = ['Your', 'music', 'your', 'space', 'your', 'NØVA'];
    field(
      'Preview language',
      'text',
      'English',
      (v) => {
        words =
          v === 'Arabic'
            ? ['موسيقى', 'ترافق', 'وقتك', 'في', 'نوفا']
            : ['Your', 'music', 'your', 'space', 'your', 'NØVA'];
        restartPreview();
      },
      ['English', 'Arabic'],
    );
    let timer: ReturnType<typeof setTimeout>;
    const paint = () => {
      const style = getSettings().integrations.lyricsAnimation;
      preview.classList.toggle('preview-motion', !paused);
      caption.textContent = descriptions[style];
      animateLyric(
        preview,
        words.slice(0, (tick % words.length) + 1).join(' '),
        String(Math.floor(tick / words.length)),
        style,
      );
      tick++;
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!preview.isConnected) return;
        if (!paused && !document.hidden && preview.getClientRects().length) paint();
        schedule();
      }, 1050);
    };
    const toggle = button(paused ? 'Play preview' : 'Pause preview', () => {
      paused = !paused;
      toggle.textContent = paused ? 'Play preview' : 'Pause preview';
      preview.classList.toggle('preview-motion', !paused);
      if (paused) preview.getAnimations({ subtree: true }).forEach((a) => a.pause());
      else restartPreview();
    });
    restartPreview = () => {
      tick = 0;
      paused = false;
      toggle.textContent = 'Pause preview';
      preview.replaceChildren();
      paint();
      schedule();
    };
    paint();
    schedule();
    const refresh = () => {
      if (!preview.isConnected) {
        document.removeEventListener('nova-render', refresh);
        return;
      }
      const current = preview.querySelector<HTMLElement>('.current');
      if (current)
        animateLyric(
          preview,
          current.dataset.text ?? '',
          current.dataset.line ?? '',
          getSettings().integrations.lyricsAnimation,
        );
      if (paused) preview.getAnimations({ subtree: true }).forEach((a) => a.pause());
    };
    document.addEventListener('nova-render', refresh);
    const actions = el('div', 'row');
    actions.append(toggle, button('Replay animation', restartPreview));
    ui.content.append(actions);
    note(
      'The preview uses the same engine, font and timing as live lyrics. Page Animations does not disable it. Low Power pauses live lyrics; system reduced motion follows the checkbox above. Change a style or press Replay.',
    );
  });
  ui.group('Spotify desktop · optional Windows PowerShell', () => {
    const warning = el('div', 'native-warning');
    warning.append(
      el('strong', 'warning-label', 'Warning'),
      el('span', '', ' · Runs outside the extension'),
      el(
        'p',
        '',
        'PowerShell reads Spotify song metadata from Windows. Install it only from the official developer. Never run commands from an untrusted download.',
      ),
    );
    const official = el('a', '', 'Official developer · github.com/xtufa7');
    official.href = 'https://github.com/xtufa7';
    official.target = '_blank';
    official.rel = 'noopener noreferrer';
    warning.append(official);
    ui.content.append(warning);
    note(
      'Run the install command once, or download native/bootstrap.ps1 from the official repository and run it with Windows PowerShell. It installs to your local app-data folder and detects NØVA across supported browsers. Windows 10 version 1809 or newer is required. Then enable Desktop bridge in each browser. The Raw URL requires the repository to be published first.',
    );
    let browserName = 'all';
    const commands = el('pre', 'native-commands');
    const updateCommands = () => {
      const id =
        browserName === 'firefox' || browserName === 'zen'
          ? 'nova@xtufa7'
          : /^[a-p]{32}$/.test(chrome.runtime.id)
            ? chrome.runtime.id
            : '';
      commands.textContent = `# Install once; this Raw URL works after the official repository is published.\n$env:NOVA_BROWSER='${browserName}'; $env:NOVA_EXTENSION_ID='${id}'; irm 'https://raw.githubusercontent.com/xtufa7/NOVA-New-Tab/main/native/bootstrap.ps1' | iex\n\n# Remove registration (separate command):\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\\NOVA\\SpotifyBridge\\native\\install.ps1" -Browser ${browserName} -Uninstall`;
    };
    field(
      'Browser for PowerShell registration',
      'text',
      browserName,
      (v) => {
        browserName = String(v);
        updateCommands();
      },
      [
        'all',
        'chrome',
        'helium',
        'edge',
        'brave',
        'vivaldi',
        'opera',
        'chromium',
        'firefox',
        'zen',
      ],
    );
    updateCommands();
    ui.content.append(commands);
    ui.content.append(
      button('Copy install command', async () => {
        await navigator.clipboard.writeText((commands.textContent ?? '').split('\n')[1] ?? '');
        toast('Install command copied. Requires the published official Raw file.');
      }),
    );
    ui.content.append(
      button('Copy uninstall command', async () => {
        await navigator.clipboard.writeText((commands.textContent ?? '').split('\n').at(-1) ?? '');
        toast('Uninstall command copied.');
      }),
    );
    ui.content.append(
      button(
        settings.integrations.desktopBridge ? 'Disable desktop bridge' : 'Enable desktop bridge',
        async () => {
          if (
            !getSettings().integrations.desktopBridge &&
            !(await chrome.permissions.request({ permissions: ['nativeMessaging'] }))
          )
            throw new Error('Native messaging permission was not granted.');
          change((s) => {
            s.integrations.desktopBridge = !s.integrations.desktopBridge;
            if (s.integrations.desktopBridge) {
              s.integrations.spotifySource = 'desktop';
              s.integrations.spotify = true;
              s.integrations.onlineLyrics = true;
              s.integrations.terminalLyrics = true;
            }
          });
          await flush();
          redraw();
        },
      ),
    );
    const status = el('p', 'spotify-connection', 'Desktop bridge · checking…');
    ui.content.append(status);
    const showStatus = async () => {
      const value = (await chrome.storage.session.get('nova.desktop.status'))[
        'nova.desktop.status'
      ] as { state?: string } | undefined;
      if (status.isConnected) status.textContent = `Desktop bridge · ${value?.state ?? 'disabled'}`;
    };
    void showStatus().catch(report);
    const statusTimer = window.setInterval(() => {
      if (!status.isConnected) clearInterval(statusTimer);
      else void showStatus().catch(report);
    }, 1500);
    ui.content.append(
      button('Reconnect desktop bridge', async () => {
        await chrome.runtime.sendMessage({ target: 'worker', type: 'desktop-reconnect' });
        await showStatus();
      }),
    );
    note(
      'If song metadata connects but lyrics do not appear, enable online lyrics above. The bridge does not record audio or your screen.',
    );
  });
  ui.group('Audio spectrum', () => {
    field(
      'Spectrum style',
      'text',
      settings.integrations.spectrum,
      (v) =>
        change((s) => {
          s.integrations.spectrum = v as 'off' | 'bars' | 'cava' | 'native-cava';
          s.performance.visualizer = v !== 'off';
        }),
      ['off', 'bars', 'cava'],
    );
    note(
      'bars / cava visualize your local music directly. Spotify Web works directly. Desktop metadata uses the optional PowerShell bridge above.',
    );
  });

  const playlists = ['All tracks', ...new Set(p.music.tracks.map((t) => t.playlist))];
  field(
    'Playlist',
    'text',
    p.music.playlist,
    (v) => {
      change((_s, p) => (p.music.playlist = String(v)));
      void import('../../music/client').then((m) => m.musicCommand('sync')).catch(report);
    },
    playlists,
  );
  const playlist = el('input');
  playlist.placeholder = 'Playlist name (default: Library)';
  playlist.setAttribute('aria-label', 'Import playlist');
  content.append(playlist);
  files('Add local audio', 'audio/*,.mp3,.flac,.ogg,.wav,.m4a', true, async (files) => {
    const { importTrack } = await import('../../music/metadata');
    for (const file of files) {
      if (getProfile().music.tracks.length >= 1000)
        throw new Error('The local library is limited to 1000 tracks.');
      if (file.size > 100 * 1024 * 1024) throw new Error('Use tracks below 100 MB.');
      const track = await importTrack(file, playlist.value.trim().slice(0, 80) || 'Library');
      change((_s, p) => p.music.tracks.push(track));
    }
    await flush();
    redraw();
    toast('Local audio imported.');
  });
  field('Mini player widget', 'checkbox', p.widgets.music, (v) =>
    change((_s, p) => (p.widgets.music = Boolean(v))),
  );
  field('Fade out for other browser audio', 'checkbox', p.music.autoDuck, (v) =>
    change((_s, p) => (p.music.autoDuck = Boolean(v))),
  );
  range('Volume', p.music.volume, 0, 100, (v) => {
    change((_s, p) => (p.music.volume = v));
    void import('../../music/client').then((m) => m.musicCommand('volume', v)).catch(report);
  });
  field('Shuffle', 'checkbox', p.music.shuffle, (v) =>
    change((_s, p) => (p.music.shuffle = Boolean(v))),
  );
  field(
    'Repeat',
    'text',
    p.music.repeat,
    (v) => change((_s, p) => (p.music.repeat = v as Profile['music']['repeat'])),
    ['all', 'one'],
  );
  const controls = el('div', 'row');
  for (const action of ['play', 'pause', 'prev', 'next', 'stop'])
    controls.append(
      button(action, async () => {
        const { musicCommand } = await import('../../music/client');
        await flush();
        await musicCommand(action);
      }),
    );
  content.append(controls);
  if (isGecko)
    note(
      'Firefox / Zen keep local audio in a dedicated NØVA audio tab. Keep that tab open while listening.',
    );
  note(
    'Playback continues after New Tab closes. Other audible tabs fade and pause NØVA; silence resumes it.',
  );
  for (const track of p.music.tracks) {
    const row = el('div', 'settings-card row');
    row.append(
      el('span', '', `${track.title} — ${track.artist}`),
      button('Remove', () => {
        change((_s, p) => (p.music.tracks = p.music.tracks.filter((t) => t.id !== track.id)));
        redraw();
      }),
    );
    content.append(row);
    field('Title · ' + track.title, 'text', track.title, (v) =>
      change((_s, p) => {
        const t = p.music.tracks.find((t) => t.id === track.id);
        if (t) t.title = String(v).slice(0, 180);
      }),
    );
    field('Artist · ' + track.title, 'text', track.artist, (v) =>
      change((_s, p) => {
        const t = p.music.tracks.find((t) => t.id === track.id);
        if (t) t.artist = String(v).slice(0, 180);
      }),
    );
    files('LRC lyrics · ' + track.title, '.lrc,text/plain', false, async (files) => {
      if (files[0].size > 100000) throw new Error('LRC files must be below 100 KB.');
      const lyrics = await files[0].text();
      change((_s, p) => {
        const t = p.music.tracks.find((t) => t.id === track.id);
        if (t) t.lyrics = lyrics;
      });
      await flush();
      toast('Synchronized lyrics saved.');
    });
  }
  resetButton('Music');
}
