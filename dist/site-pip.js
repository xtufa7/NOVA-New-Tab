/* Extension-only PiP: moves the actual video, preserves playback, and restores it on close. */
(() => {
  if (globalThis.__novaSitePiP) return;
  let pip, restore, host;
  function chooseVideo() {
    return [...document.querySelectorAll('video')].sort((a, b) => {
      const score = (v) => {
        const r = v.getBoundingClientRect();
        return (
          (!v.paused ? 1e8 : 0) + (r.top < innerHeight && r.bottom > 0 ? r.width * r.height : 0)
        );
      };
      return score(b) - score(a);
    })[0];
  }
  async function open() {
    if (pip && !pip.closed) {
      pip.close();
      return;
    }
    const video = chooseVideo();
    if (!video) throw new Error('Play a video on this page first, then click Pin again.');
    if (!window.documentPictureInPicture) {
      if (document.pictureInPictureEnabled) {
        if (document.pictureInPictureElement === video) await document.exitPictureInPicture();
        else await video.requestPictureInPicture();
        return;
      }
      throw new Error('Use this browser’s built-in video Picture-in-Picture button. Programmatic PiP is unavailable in this browser.');
    }
    // Request synchronously from the website button click: no worker round trip consumes activation.
    pip = await window.documentPictureInPicture.requestWindow({ width: 430, height: 680 });
    const sourceParent = video.parentNode,
      marker = document.createComment('NOVA PiP video');
    const style = video.getAttribute('style'),
      controls = video.controls,
      playing = !video.paused;
    sourceParent.insertBefore(marker, video);
    const target = pip;
    restore = () => {
      const resume = !video.paused;
      if (marker.isConnected) marker.replaceWith(video);
      else if (sourceParent.isConnected) sourceParent.append(video);
      else document.body.append(video);
      if (style === null) video.removeAttribute('style');
      else video.setAttribute('style', style);
      video.controls = controls;
      if (resume) void video.play().catch(() => {});
      pip = undefined;
      restore = undefined;
      if (host?._button) host._button.textContent = '📌 Pin video above apps';
    };
    target.document.title = 'NØVA · Video';
    target.document.body.style.cssText =
      'margin:0;background:#0b0b10;color:#eeedf5;display:flex;flex-direction:column;height:100vh;font:12px system-ui;overflow:hidden';
    video.style.cssText =
      'width:100%;height:calc(100vh - 52px);object-fit:contain;min-height:0;flex:1;display:block;background:black';
    video.controls = true;
    target.document.body.append(video);
    const controlsRow = target.document.createElement('div');
    controlsRow.style.cssText =
      'display:flex;gap:8px;justify-content:center;align-items:center;height:52px;flex-shrink:0;background:#17131f';
    for (const [label, action] of [
      ['Play / pause', () => (video.paused ? video.play() : video.pause())],
      [
        'Mute',
        () => {
          video.muted = !video.muted;
        },
      ],
      [
        'Back to tab',
        () => {
          window.focus();
        },
      ],
      ['Unpin', () => target.close()],
    ]) {
      const button = target.document.createElement('button');
      button.textContent = label;
      button.style.cssText =
        'padding:8px;border:1px solid #ffffff25;border-radius:8px;background:#242030;color:#eee;font:11px system-ui;cursor:pointer';
      button.onclick = () => Promise.resolve(action()).catch(() => {});
      controlsRow.append(button);
    }
    target.document.body.append(controlsRow);
    target.addEventListener('pagehide', () => restore?.(), { once: true });
    if (playing) await video.play().catch(() => {});
    if (host?._button) host._button.textContent = '📌 Pinned · unpin';
  }
  function mount() {
    if (host?.isConnected) return;
    host = document.createElement('div');
    host.id = 'nova-direct-pin';
    host.style.cssText =
      'all:initial!important;position:fixed!important;top:10px!important;right:10px!important;z-index:2147483647!important;';
    const root = host.attachShadow({ mode: 'closed' });
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '📌 Pin video above apps';
    button.style.cssText =
      'border:1px solid #cba6f770;border-radius:99px;padding:10px 14px;background:#1e1e2ef0;color:#cdd6f4;font:600 12px system-ui;cursor:pointer;box-shadow:0 4px 20px #0005';
    button.setAttribute('aria-label', 'Pin video above apps');
    button.onclick = () => {
      void open().catch((error) => {
        let note = root.querySelector('p');
        if (!note) {
          note = document.createElement('p');
          root.append(note);
        }
        note.style.cssText =
          'max-width:240px;padding:12px;border-radius:10px;background:#1e1e2e;color:#eee;font:12px/1.6 system-ui';
        note.textContent = error.message;
      });
    };
    root.append(button);
    host._button = button;
    document.documentElement.append(host);
  }
  globalThis.__novaSitePiP = { open, mount };
  mount();
  window.addEventListener(
    'pagehide',
    () => {
      if (pip && !pip.closed) pip.close();
      restore?.();
    },
    { once: true },
  );
})();
