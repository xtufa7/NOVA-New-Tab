import type { Settings } from '../settings/schema';
let port: chrome.runtime.Port | undefined,
  enabled = false;
export async function syncDesktop(settings: Settings, retry = false) {
  const wasEnabled = enabled;
  enabled = settings.integrations.desktopBridge;
  if (!enabled || !(await chrome.permissions.contains({ permissions: ['nativeMessaging'] }))) {
    const old = port;
    port = undefined;
    old?.disconnect();
    await chrome.storage.session.remove('nova.spotify.desktop');
    await status('disabled');
    return;
  }
  if (port || (wasEnabled && !retry)) return;
  if (!(await chrome.permissions.contains({ permissions: ['nativeMessaging'] }))) {
    await status('Native messaging permission is missing. Enable the bridge in Music settings.');
    return;
  }
  try {
    const current = chrome.runtime.connectNative('com.xtufa7.nova.spotify');
    port = current;
    await status('starting');
    current.onMessage.addListener((message) => {
      if (port !== current || !enabled) return;
      if (message?.type === 'error') {
        void status(String(message.error).slice(0, 500));
        return;
      }
      const s = message?.state;
      if (
        message?.type !== 'spotify-state' ||
        !s ||
        typeof s.title !== 'string' ||
        s.title.length > 300 ||
        typeof s.artist !== 'string' ||
        s.artist.length > 300 ||
        typeof s.playing !== 'boolean' ||
        !Number.isFinite(s.current) ||
        s.current < 0 ||
        !Number.isFinite(s.duration) ||
        s.duration < 0 ||
        s.duration > 86400
      )
        return;
      void chrome.storage.session.set({
        'nova.spotify.desktop': { ...s, updatedAt: Date.now() },
        'nova.desktop.status': {
          state: s.title ? 'connected' : 'connected · open Spotify desktop and play a song',
          updatedAt: Date.now(),
        },
      });
    });
    current.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError?.message;
      if (port !== current) return;
      port = undefined;
      void chrome.storage.session.remove('nova.spotify.desktop');
      void status(
        enabled
          ? error || 'PowerShell bridge disconnected. Reconnect from Music settings.'
          : 'disabled',
      );
    });
  } catch (error) {
    port = undefined;
    await status(error instanceof Error ? error.message : String(error));
  }
}
function status(state: string) {
  return chrome.storage.session.set({ 'nova.desktop.status': { state, updatedAt: Date.now() } });
}
