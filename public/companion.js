if (globalThis.browser) globalThis.chrome = globalThis.browser;
/* NØVA © xtufa7. Optional isolated browser handle; no page-content collection. */
(() => {
  if (globalThis.__novaCompanion) return;
  globalThis.__novaCompanion = true;
  let host,
    button,
    hidden = false,
    config,
    ownTabId,
    accent = '#cba6f7';
  const send = async (message) => {
    const result = await chrome.runtime.sendMessage({
      target: 'worker',
      ...message,
      tabId: ownTabId,
    });
    if (result?.error) throw new Error(result.error);
    return result;
  };
  function destroy() {
    host?.remove();
    host = undefined;
  }
  function paint() {
    const excluded = config?.exceptions?.some(
      (d) => location.hostname === d || location.hostname.endsWith('.' + d),
    );
    if (!config?.enabled || hidden || excluded) {
      destroy();
      return;
    }
    if (!host) {
      host = document.createElement('div');
      host.id = 'nova-browser-handle';
      host.style.cssText =
        'all:initial!important;position:fixed!important;z-index:2147483647!important;width:30px!important;height:88px!important;';
      const root = host.attachShadow({ mode: 'closed' }),
        style = document.createElement('style');
      style.textContent =
        ':host{all:initial}button{all:initial;box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:30px;height:88px;border:1px solid #ffffff25;background:var(--nova-accent,#cba6f7);color:#15111e;font:700 15px system-ui;border-radius:10px 0 0 10px;cursor:grab;box-shadow:0 6px 30px #0005;touch-action:none}button:focus-visible{outline:2px solid white;outline-offset:2px}.menu{position:absolute;right:36px;top:0;width:160px;padding:8px;background:#181520;color:#eee;border:1px solid #ffffff30;border-radius:12px}.menu button{width:100%;height:auto;min-height:34px;background:transparent;color:#eee;box-shadow:none;font:12px system-ui;border:0;border-radius:8px;cursor:pointer}.menu button:hover{background:#ffffff15}';
      button = document.createElement('button');
      button.type = 'button';
      button.textContent = '♪';
      button.title =
        'NØVA · Pull inward to open TikTok. Drag vertically or across to move. Right-click to hide.';
      button.setAttribute('aria-label', 'Open TikTok mini window');
      root.append(style, button);
      document.documentElement.append(host);
      let start,
        dragged = false;
      button.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        start = { x: e.clientX, y: e.clientY, edge: config.edge };
        dragged = false;
        button.setPointerCapture(e.pointerId);
      });
      button.addEventListener('pointermove', (e) => {
        if (!start) return;
        const dx = e.clientX - start.x,
          dy = e.clientY - start.y;
        dragged ||= Math.hypot(dx, dy) > 7;
        if (Math.abs(dy) > 20 || Math.abs(dx) > innerWidth / 3) {
          config.edge = e.clientX < innerWidth / 2 ? 'left' : 'right';
          config.y = Math.max(0.05, Math.min(0.95, e.clientY / innerHeight));
          position();
        }
      });
      button.addEventListener('pointerup', (e) => {
        if (!start) return;
        const dx = e.clientX - start.x,
          dy = e.clientY - start.y;
        const pull =
          Math.abs(dy) < 40 &&
          (start.edge === 'right' ? dx < -40 : dx > 40) &&
          Math.abs(dx) < innerWidth / 3;
        start = undefined;
        if (pull) void send({ type: 'companion-open' }).catch(showError);
        else if (dragged)
          void send({ type: 'companion-position', edge: config.edge, y: config.y }).catch(
            showError,
          );
      });
      button.addEventListener('click', () => {
        if (!dragged) void send({ type: 'companion-open' }).catch(showError);
        dragged = false;
      });
      button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        root.querySelector('.menu')?.remove();
        const menu = document.createElement('div');
        menu.className = 'menu';
        menu.style[config.edge === 'right' ? 'right' : 'left'] = '36px';
        menu.style[config.edge === 'right' ? 'left' : 'right'] = 'auto';
        for (const [text, action] of [
          [
            'Hide on this tab',
            () => {
              hidden = true;
              void send({ type: 'companion-hide' }).catch(showError);
              destroy();
            },
          ],
          ['Close menu', () => menu.remove()],
        ]) {
          const b = document.createElement('button');
          b.textContent = text;
          b.onclick = action;
          menu.append(b);
        }
        root.append(menu);
      });
    }
    position();
  }
  function position() {
    if (!host) return;
    host.style.setProperty('top', `calc(${config.y * 100}vh - 44px)`, 'important');
    host.style.setProperty('left', config.edge === 'left' ? '0' : 'auto', 'important');
    host.style.setProperty('right', config.edge === 'right' ? '0' : 'auto', 'important');
    host.style.setProperty('--nova-accent', accent);
    button.style.borderRadius = config.edge === 'right' ? '10px 0 0 10px' : '0 10px 10px 0';
  }
  function showError(error) {
    if (button) {
      button.title = error.message;
      button.textContent = '!';
    }
  }
  async function refresh() {
    try {
      if (chrome.tabs?.getCurrent) ownTabId = (await chrome.tabs.getCurrent())?.id;
      const data = await send({ type: 'companion-config' });
      config = data.config;
      accent = data.accent;
      hidden = data.hidden;

      paint();
    } catch {
      destroy();
    }
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes['nova.settings']) void refresh();
    if (
      area === 'session' &&
      Object.keys(changes).some(
        (key) =>
          key.startsWith('nova.sideHidden.') ||
          key.startsWith('nova.nativePin.') ||
          key === 'nova.tiktok' ||
          key === 'nova.popup',
      )
    )
      void refresh();
  });
  void refresh();
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.target === 'companion-refresh') void refresh();
  });
})();
