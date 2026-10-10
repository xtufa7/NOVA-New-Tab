// NØVA © xtufa7. Event-driven worker; no keepalive timers.
import { KEY, validateSettings } from '../storage/settings';
import { defaults } from '../settings/schema';
import { sessionValue, type FloatingRecord, type PopupRecord } from '../shared/browser';
import { openFloating } from './floating';
import { syncPrivacy } from './privacy';
import { syncCompanion, companionCommand } from './companion';
import { syncGunsAvatar } from './guns';
import { syncDesktop } from './desktop';
import { isGecko } from '../shared/platform';
import { idle, type MusicStatus } from '../music/client';
interface AudioSnapshot {
  profileId: string;
  trackId: string;
  position: number;
  wantsPlay: boolean;
  status: MusicStatus;
}
async function readSettings() {
  return validateSettings((await chrome.storage.local.get(KEY))[KEY] ?? defaults());
}
async function otherAudio() {
  return (await chrome.tabs.query({ audible: true })).some(
    (t) => !t.mutedInfo?.muted && !(t.url ?? '').startsWith(chrome.runtime.getURL('')),
  );
}
let creating: Promise<void> | undefined;
async function audioExists() {
  if (isGecko)
    return (await chrome.tabs.query({ url: chrome.runtime.getURL('offscreen.html') })).length > 0;
  return (
    (
      await chrome.runtime.getContexts({
        contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
      })
    ).length > 0
  );
}
async function ensureAudio() {
  if (await audioExists()) return;
  if (isGecko) {
    if (!creating)
      creating = chrome.tabs
        .create({ url: chrome.runtime.getURL('offscreen.html'), active: true })
        .then(async (tab) => {
          for (let i = 0; i < 100; i++) {
            if ((await chrome.tabs.get(tab.id!)).status === 'complete') return;
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          throw new Error('The audio tab did not finish loading.');
        })
        .finally(() => {
          creating = undefined;
        });
    await creating;
    return;
  }
  if (!creating)
    creating = chrome.offscreen
      .createDocument({
        url: 'offscreen.html',
        reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
        justification: 'Play user-selected local audio across new tab pages.',
      })
      .finally(() => (creating = undefined));
  await creating;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.target !== 'worker') return;
  void (async () => {
    if (String(message.type).startsWith('companion-')) return companionCommand(message, sender);
    if (message.type === 'desktop-reconnect') {
      if (!sender.url?.startsWith(chrome.runtime.getURL(''))) throw new Error('Use NØVA settings.');
      await syncDesktop(await readSettings(), true);
      return {};
    }
    if (message.type === 'guns-avatar') return syncGunsAvatar(message.url, sender);
    if (message.type === 'spotify-reconnect') {
      if (!sender.url?.startsWith(chrome.runtime.getURL(''))) throw new Error('Use NØVA settings.');
      if (!(await chrome.permissions.contains({ origins: ['https://open.spotify.com/*'] })))
        throw new Error('Allow Spotify access.');
      const tabs = await chrome.tabs.query({ url: 'https://open.spotify.com/*' });
      for (const tab of tabs)
        if (tab.id)
          await chrome.scripting
            .executeScript({ target: { tabId: tab.id }, files: ['spotify.js'] })
            .catch(() => {});
      return { tabs: tabs.length };
    }
    if (message.type === 'spotify-state') {
      const settings = await readSettings();
      if (
        !settings.integrations.spotify ||
        !sender.tab?.id ||
        !sender.url?.startsWith('https://open.spotify.com/')
      )
        throw new Error('Invalid Spotify sender.');
      const data = message.state;
      if (
        !data ||
        typeof data.title !== 'string' ||
        typeof data.artist !== 'string' ||
        data.title.length > 300 ||
        data.artist.length > 300 ||
        typeof data.playing !== 'boolean' ||
        !Number.isFinite(data.current) ||
        !Number.isFinite(data.duration) ||
        data.current < 0 ||
        data.duration < 0 ||
        data.duration > 86400
      )
        throw new Error('Invalid playback metadata.');
      const previous = await sessionValue<{ playing: boolean; updatedAt: number; tabId: number }>(
        'nova.spotify',
      );
      if (
        !data.playing &&
        previous?.playing &&
        previous.tabId !== sender.tab.id &&
        Date.now() - previous.updatedAt < 8000
      )
        return {};
      await chrome.storage.session.set({
        'nova.spotify': { ...data, tabId: sender.tab.id, updatedAt: Date.now() },
      });
      return {};
    }
    if (message.type === 'audio-checkpoint') {
      if (!sender.url?.startsWith(chrome.runtime.getURL('offscreen.html')))
        throw new Error('Invalid audio sender.');
      await chrome.storage.session.set({ 'nova.audioResume': message.snapshot });
      return {};
    }
    if (message.type === 'music') {
      const snapshot = await sessionValue<AudioSnapshot>('nova.audioResume');
      const existing = await audioExists();
      if (!existing && ['volume', 'mute', 'shuffle', 'repeat', 'seek'].includes(message.action)) {
        const settings = await readSettings(),
          profile = settings.profiles.find((p) => p.id === settings.activeProfile)!;
        const action = message.action;
        if (action === 'volume') {
          if (!Number.isFinite(message.value) || message.value < 0 || message.value > 100)
            throw new Error('Volume must be 0–100.');
          profile.music.volume = message.value;
        } else if (action === 'mute') profile.music.muted = !profile.music.muted;
        else if (action === 'shuffle') profile.music.shuffle = !profile.music.shuffle;
        else if (action === 'repeat')
          profile.music.repeat = profile.music.repeat === 'one' ? 'all' : 'one';
        if (action !== 'seek') await chrome.storage.local.set({ [KEY]: settings });
        const status = snapshot?.profileId === profile.id ? snapshot.status : { ...idle };
        Object.assign(status, {
          volume: profile.music.volume,
          muted: profile.music.muted,
          shuffle: profile.music.shuffle,
          repeat: profile.music.repeat,
        });
        if (snapshot?.profileId === profile.id) {
          if (
            action === 'seek' &&
            Number.isFinite(message.value) &&
            message.value >= 0 &&
            message.value <= status.duration
          ) {
            snapshot.position = message.value;
            status.current = message.value;
          }
          await chrome.storage.session.set({ 'nova.audioResume': snapshot });
        }
        return status;
      }
      if (!existing && ['status', 'pause', 'stop', 'sync'].includes(message.action)) {
        if (snapshot && ['pause', 'stop'].includes(message.action)) {
          snapshot.wantsPlay = false;
          snapshot.status.ducked = false;
          snapshot.status.playing = false;
          await chrome.storage.session.set({ 'nova.audioResume': snapshot });
        }
        return message.action === 'stop' ? null : (snapshot?.status ?? null);
      }
      await ensureAudio();
      const raw = (await chrome.storage.local.get(KEY))[KEY];
      const settings = raw ? validateSettings(raw) : defaults();
      const profile = settings.profiles.find((p) => p.id === settings.activeProfile)!;
      const response = await chrome.runtime.sendMessage({
        ...message,
        target: 'audio',
        profile,
        performance: settings.performance,
        externalAudio: await otherAudio(),
        restore:
          !existing &&
          message.action === 'play' &&
          snapshot?.trackId &&
          snapshot.profileId === profile.id
            ? snapshot
            : undefined,
      });
      if (response?.error) throw new Error(response.error);
      if (['volume', 'mute', 'shuffle', 'repeat'].includes(message.action)) {
        const latest = validateSettings((await chrome.storage.local.get(KEY))[KEY] ?? defaults());
        const active = latest.profiles.find((p) => p.id === response.profileId);
        if (active) {
          const key = message.action === 'mute' ? 'muted' : message.action;
          Object.assign(active.music, { [key]: response.music[key] });
          await chrome.storage.local.set({ [KEY]: latest });
        }
      }
      if (message.action === 'stop' && (await audioExists())) {
        if (isGecko) {
          const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('offscreen.html') });
          await Promise.all(tabs.map((t) => chrome.tabs.remove(t.id!)));
        } else await chrome.offscreen.closeDocument();
      }
      return response?.status;
    }
    if (message.type === 'float-open')
      return openFloating(message.tabId, message.mode, closeFloating);
    if (message.type === 'float-close') {
      await closeFloating();
      return {};
    }
    if (message.type === 'float-restore') {
      await restorePopup(message.tabId);
      return {};
    }
    throw new Error('Unsupported browser action.');
  })()
    .then(respond)
    .catch((e) => respond({ error: e instanceof Error ? e.message : String(e) }));
  return true;
});
async function closeFloating() {
  const entry = await sessionValue<FloatingRecord>('nova.float');
  if (entry?.viewerId) await chrome.tabs.remove(entry.viewerId).catch(() => {});
  if (entry?.popupTabId) await restorePopup(entry.popupTabId).catch(() => {});
  await chrome.storage.session.remove('nova.float');
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (
    area === 'session' &&
    Object.keys(changes).some((key) => key.startsWith('nova.sideHidden.') || key === 'nova.tiktok')
  ) {
    void chrome.tabs
      .query({})
      .then((tabs) =>
        Promise.all(
          tabs
            .filter((tab) => tab.id)
            .map((tab) =>
              chrome.tabs.sendMessage(tab.id!, { target: 'companion-refresh' }).catch(() => {}),
            ),
        ),
      )
      .catch(() => {});
  }
  if (area !== 'local' || !changes[KEY]?.newValue) return;
  void (async () => {
    const s = validateSettings(changes[KEY].newValue);
    await syncDesktop(s);
    await syncPrivacy(s);
    await syncCompanion(s);
    if (!(await audioExists())) {
      refreshAudio();
      return;
    }
    const p = s.profiles.find((p) => p.id === s.activeProfile)!;
    await chrome.runtime.sendMessage({
      target: 'audio',
      action: 'sync',
      profile: p,
      performance: s.performance,
    });
  })().catch(() => {});
});
async function restorePopup(tabId: number) {
  const stored = await sessionValue<PopupRecord>('nova.popup');
  if (!stored || stored.tabId !== tabId)
    throw new Error('Original window information is unavailable.');
  try {
    await chrome.tabs.get(tabId);
  } catch {
    await chrome.storage.session.remove('nova.popup');
    return;
  }
  let normal: chrome.windows.Window | undefined;
  try {
    normal = await chrome.windows.get(stored.windowId);
  } catch {
    /* Original window closed. */
  }
  if (normal) {
    await chrome.tabs.move(tabId, {
      windowId: normal.id!,
      index: stored.index,
    });
    await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(normal.id!, { focused: true });
  } else await chrome.windows.create({ tabId, type: 'normal' });
  await chrome.storage.session.remove('nova.popup');
}
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-control-center')
    void chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  else
    void (async () => {
      if (command === 'float-close') {
        await closeFloating();
        return;
      }
      if (!['float-live', 'float-interactive'].includes(command)) return;
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.id) return;
      if (
        command === 'float-live' &&
        !(await chrome.permissions.contains({ permissions: ['tabCapture'] }))
      ) {
        await chrome.action.openPopup();
        return;
      }
      await openFloating(tab.id, command === 'float-live' ? 'live' : 'interactive', closeFloating);
    })().catch(() => chrome.action.openPopup().catch(() => {}));
});
let duckQueue = Promise.resolve();
function refreshAudio() {
  duckQueue = duckQueue
    .catch(() => {})
    .then(async () => {
      const settings = await readSettings(),
        profile = settings.profiles.find((p) => p.id === settings.activeProfile)!;
      const externalAudio = await otherAudio();
      if (await audioExists()) {
        await chrome.runtime.sendMessage({
          target: 'audio',
          action: 'duck',
          profile,
          performance: settings.performance,
          externalAudio,
        });
      } else if (!externalAudio || !profile.music.autoDuck) {
        const snapshot = await sessionValue<AudioSnapshot>('nova.audioResume');
        if (
          !snapshot?.wantsPlay ||
          snapshot.profileId !== profile.id ||
          !profile.music.tracks.some((t) => t.id === snapshot.trackId)
        )
          return;
        await ensureAudio();
        await chrome.runtime.sendMessage({
          target: 'audio',
          action: 'play',
          profile,
          performance: settings.performance,
          externalAudio,
          restore: snapshot,
        });
      }
    });
  void duckQueue.catch(() => {});
}
chrome.tabs.onUpdated.addListener((_id, change) => {
  if (change.audible !== undefined || change.mutedInfo !== undefined) refreshAudio();
});
chrome.tabs.onRemoved.addListener((id) => {
  refreshAudio();
  void (async () => {
    const popup = await sessionValue<PopupRecord>('nova.popup');
    if (popup?.tabId === id) await chrome.storage.session.remove('nova.popup');
    const floating = await sessionValue<FloatingRecord>('nova.float');
    if (floating?.viewerId === id || floating?.popupTabId === id)
      await chrome.storage.session.remove('nova.float');
    const spotify = await sessionValue<{ tabId: number }>('nova.spotify');
    if (spotify?.tabId === id) await chrome.storage.session.remove('nova.spotify');
    await chrome.storage.session.remove('nova.sideHidden.' + id);
  })().catch(() => {});
});
chrome.windows.onRemoved.addListener((id) => {
  void (async () => {
    await chrome.storage.session.remove('nova.nativePin.' + id);
    const mini = await sessionValue<{ windowId: number }>('nova.tiktok');
    if (mini?.windowId === id) await chrome.storage.session.remove('nova.tiktok');
  })().catch(() => {});
});
chrome.runtime.onInstalled.addListener(() => {
  void readSettings()
    .then(async (s) => {
      // Apply the requested automatic Spotify setup once. Later explicit opt-outs survive restarts and updates.
      const marker = 'nova.spotify.autoSetup.v1';
      if (!(await chrome.storage.local.get(marker))[marker]) {
        s.integrations.spotify = true;
        s.integrations.onlineLyrics = true;
        s.integrations.terminalLyrics = true;
        await chrome.storage.local.set({ [KEY]: s, [marker]: true });
      }
      await syncDesktop(s);
      await syncPrivacy(s);
      await syncCompanion(s);
    })
    .catch(() => {});
});
chrome.runtime.onStartup.addListener(() => {
  void readSettings()
    .then(async (s) => {
      await syncDesktop(s);
      await syncPrivacy(s);
      await syncCompanion(s);
    })
    .catch(() => {});
});
chrome.permissions.onAdded.addListener(() => {
  void readSettings()
    .then(async (s) => {
      await syncDesktop(s);
      await syncPrivacy(s);
      await syncCompanion(s);
    })
    .catch(() => {});
});
chrome.permissions.onRemoved.addListener(() => {
  void readSettings()
    .then(async (s) => {
      await syncDesktop(s, true);
      await syncCompanion(s);
    })
    .catch(() => {});
});
chrome.windows.onBoundsChanged?.addListener((window) => {
  void (async () => {
    const saved = await sessionValue<PopupRecord>('nova.popup');
    if (saved?.popupWindowId !== window.id) return;
    const stored = (await chrome.storage.local.get(KEY))[KEY];
    const settings = stored ? validateSettings(stored) : defaults();
    Object.assign(settings.floatingTabs, {
      width: Math.max(240, Math.min(1600, window.width ?? 480)),
      height: Math.max(160, Math.min(1200, window.height ?? 300)),
      left: window.left ?? 80,
      top: window.top ?? 80,
    });
    await chrome.storage.local.set({ [KEY]: settings });
  })().catch(() => {});
});
