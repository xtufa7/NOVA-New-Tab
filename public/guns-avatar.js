if (globalThis.browser) globalThis.chrome = globalThis.browser;
/* Reads only the avatar of the creator's explicitly enabled public Guns profile. */
(() => {
  if (
    globalThis.__novaGunsAvatar ||
    location.hostname !== 'guns.lol' ||
    location.pathname.replace(/\/$/, '').toLowerCase() !== '/xtufa7'
  )
    return;
  globalThis.__novaGunsAvatar = true;
  let previous = '',
    timer;
  async function read() {
    clearTimeout(timer);
    try {
      if (
        !(await chrome.storage.local.get('nova.settings'))['nova.settings']?.credits?.syncGunsAvatar
      ) {
        previous = '';
        timer = setTimeout(read, 5000);
        return;
      }
    } catch {
      return;
    }
    const avatar = [...document.querySelectorAll('img')].find((image) => {
      try {
        const url = new URL(image.currentSrc || image.src);
        return url.hostname === 'r2.guns.lol' && image.getBoundingClientRect().width > 30;
      } catch {
        return false;
      }
    });
    const url = avatar?.currentSrc || avatar?.src;
    if (url && url !== previous) {
      try {
        const result = await chrome.runtime.sendMessage({
          target: 'worker',
          type: 'guns-avatar',
          url,
        });
        if (result?.ok) previous = url;
      } catch {}
    }
    timer = setTimeout(read, 5000);
  }
  void read();
  window.addEventListener('pagehide', () => clearTimeout(timer), { once: true });
})();
