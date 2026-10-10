if (globalThis.browser) globalThis.chrome = globalThis.browser;
// Local Spotify Web metadata reader. No account tokens, cookies, or listening history are collected.
(() => {
  if (globalThis.__novaSpotifyRefresh) {
    globalThis.__novaSpotifyRefresh();
    return;
  }
  globalThis.__novaSpotify = true;
  let timer,
    enabled = true;
  const seconds = (value) => {
    const parts = (value || '').trim().split(':').map(Number);
    return parts.every(Number.isFinite) ? parts.reduce((a, n) => a * 60 + n, 0) : 0;
  };
  async function read() {
    clearTimeout(timer);
    if (!enabled) return;
    try {
      const root = document.querySelector(
        '[data-testid="now-playing-widget"], [data-testid="now-playing-bar"], footer',
      );
      const metadata = navigator.mediaSession?.metadata;
      const title =
        root?.querySelector('[data-testid="context-item-info-title"]')?.textContent?.trim() ||
        root?.querySelector('a[href*="/track/"]')?.textContent?.trim() ||
        metadata?.title ||
        '';
      const artist =
        [...(root?.querySelectorAll('a[href*="/artist/"]') || [])]
          .map((a) => a.textContent.trim())
          .filter(Boolean)
          .join(', ') ||
        root?.querySelector('[data-testid="context-item-info-subtitles"]')?.textContent?.trim() ||
        metadata?.artist ||
        '';
      const control = document.querySelector('[data-testid="control-button-playpause"]');
      const playing =
        !!control?.querySelector(
          '[data-encore-id="icon"][viewBox] path[d^="M2.7"],svg path[d^="M2.7"]',
        ) ||
        /pause|إيقاف مؤقت|pausa|anhalten|暂停/i.test(control?.getAttribute('aria-label') || '') ||
        navigator.mediaSession?.playbackState === 'playing';
      const progress = document.querySelector(
        '[data-testid="playback-progressbar"] [role="slider"], [aria-label="Playback position"][role="slider"], [data-testid="playback-progressbar"] input',
      );
      const current =
        seconds(
          document.querySelector('[data-testid="playback-position"], #playback-position')
            ?.textContent,
        ) || Number(progress?.getAttribute('aria-valuenow') || progress?.value || 0);
      const duration =
        seconds(
          document.querySelector('[data-testid="playback-duration"], #playback-duration')
            ?.textContent,
        ) || Number(progress?.getAttribute('aria-valuemax') || progress?.max || 0);
      if (title)
        await chrome.runtime.sendMessage({
          target: 'worker',
          type: 'spotify-state',
          state: {
            title: title.slice(0, 300),
            artist: artist.slice(0, 300),
            current: Number.isFinite(current) ? Math.max(0, current) : 0,
            duration: Number.isFinite(duration) ? Math.max(0, duration) : 0,
            playing,
          },
        });
    } catch {}
    timer = setTimeout(read, document.hidden ? 3000 : 1000);
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes['nova.settings']) {
      enabled = !!changes['nova.settings'].newValue?.integrations?.spotify;
      if (enabled) void read();
      else clearTimeout(timer);
    }
  });
  window.addEventListener('pagehide', () => clearTimeout(timer));
  globalThis.__novaSpotifyRefresh = () => {
    enabled = true;
    void read();
  };
  void read();
})();
