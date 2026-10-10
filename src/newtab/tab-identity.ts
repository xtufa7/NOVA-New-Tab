import { getSettings } from '../storage/settings';
import { getMedia } from '../storage/media';
interface Decoder {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } };
  decode(options: { frameIndex: number }): Promise<{ image: VideoFrame }>;
  close(): void;
}
export function mountTabIdentity() {
  let link = document.querySelector<HTMLLinkElement>('#nova-tab-icon');
  if (!link) {
    link = document.createElement('link');
    link.id = 'nova-tab-icon';
    link.rel = 'icon';
    document.head.append(link);
  }
  let timer: ReturnType<typeof setTimeout>,
    iconTimer: ReturnType<typeof setTimeout>,
    generation = 0,
    signature = '',
    frames: { url: string; duration: number }[] = [],
    local = '';
  const dispose = () => {
    clearTimeout(timer);
    clearTimeout(iconTimer);
    if (local) {
      URL.revokeObjectURL(local);
      local = '';
    }
  };
  async function render() {
    const settings = getSettings(),
      config = settings.tab;
    const next = JSON.stringify([
      config,
      settings.performance.lowPower,
      settings.performance.animations,
      document.hidden,
    ]);
    if (next === signature) return;
    signature = next;
    dispose();
    const token = ++generation;
    document.title = config.title;
    link!.href = 'icons/48.png';
    const quiet =
      document.hidden || settings.performance.lowPower;
    if (config.animation !== 'off' && !quiet) {
      const chars = Array.from(config.title);
      let index = 0;
      const step = () => {
        if (token !== generation) return;
        if (config.animation === 'typewriter') {
          const phase = index++ % (chars.length + 8);
          document.title = chars.slice(0, Math.min(chars.length, phase + 1)).join('');
        } else {
          const text = [...chars, ' ', '·', ' '];
          const at = index++ % text.length;
          document.title = [...text.slice(at), ...text.slice(0, at)].join('');
        }
        timer = setTimeout(step, config.speed);
      };
      step();
    }
    frames = [];
    if (!config.iconId) {
      link!.href = 'icons/48.png';
      return;
    }
    const blob = await getMedia(config.iconId);
    if (token !== generation || !blob) return;
    local = URL.createObjectURL(blob);
    link!.href = local;
    const DecoderClass = (
      globalThis as unknown as {
        ImageDecoder?: new (options: { data: ArrayBuffer; type: string }) => Decoder;
      }
    ).ImageDecoder;
    if (blob.type !== 'image/gif' || !config.animateIcon || quiet || !DecoderClass) return;
    let decoder: Decoder | undefined;
    try {
      decoder = new DecoderClass({ data: await blob.arrayBuffer(), type: 'image/gif' });
      await decoder.tracks.ready;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 32;
      const context = canvas.getContext('2d')!;
      const count = Math.min(90, decoder.tracks.selectedTrack.frameCount);
      const decoded: { url: string; duration: number }[] = [];
      for (let i = 0; i < count; i++) {
        if (token !== generation) return;
        const { image } = await decoder.decode({ frameIndex: i });
        context.clearRect(0, 0, 32, 32);
        context.drawImage(image, 0, 0, 32, 32);
        decoded.push({
          url: canvas.toDataURL('image/png'),
          duration: Math.max(100, (image.duration ?? 100000) / 1000),
        });
        image.close();
      }
      if (token !== generation) return;
      frames = decoded;
      let index = 0;
      const animate = () => {
        if (token !== generation || !frames.length) return;
        const frame = frames[index++ % frames.length];
        link!.href = frame.url;
        iconTimer = setTimeout(animate, frame.duration);
      };
      animate();
    } catch {
      /* A static favicon remains usable if animated decoding is unsupported. */
    } finally {
      decoder?.close();
    }
  }
  document.addEventListener('nova-render', () => void render());
  document.addEventListener('visibilitychange', () => {
    signature = '';
    void render();
  });
  window.addEventListener('pagehide', dispose, { once: true });
  void render();
}
