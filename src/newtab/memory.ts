import { getSettings } from '../storage/settings';
export function mountMemory() {
  const node = document.querySelector<HTMLElement>('#browser-memory');
  if (!node) return;
  let timer: ReturnType<typeof setTimeout>,
    generation = 0;
  async function sample() {
    clearTimeout(timer);
    const token = ++generation;
    const config = getSettings().memory;
    node!.hidden = !config.enabled;
    if (!config.enabled || document.hidden) return;
    const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
      ?.usedJSHeapSize;
    const text = Number.isFinite(heap)
      ? `New Tab heap · ${Math.round(heap! / 1048576)} MB`
      : 'Page memory unavailable';
    const description =
      'JavaScript heap for this page, not total browser RAM. Stable Chromium requires a native helper for all-process memory.';
    if (token !== generation) return;
    node!.textContent = text;
    node!.title = description;
    timer = setTimeout(() => void sample(), 5000);
  }
  document.addEventListener('nova-render', () => void sample());
  document.addEventListener('visibilitychange', () => void sample());
  void sample();
}
