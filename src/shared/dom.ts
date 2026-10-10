export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
export function button(text: string, action: () => unknown, className = '') {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', () => {
    Promise.resolve().then(action).catch(report);
  });
  return node;
}
let toastTimer: ReturnType<typeof setTimeout>;
export function report(error: unknown) {
  toast(error instanceof Error ? error.message : String(error));
}
export function toast(message: string) {
  const node =
    document.querySelector<HTMLElement>('#toast') ?? document.body.appendChild(el('div', 'toast'));
  node.id = 'toast';
  node.setAttribute('role', 'status');
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (node.hidden = true), 4000);
}
export function safeURL(value: string): string {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Use an http or https URL.');
  if (url.username || url.password) throw new Error('URLs cannot contain credentials.');
  return url.href;
}
export function navigate(url: string, newTab = false) {
  const safe = safeURL(url);
  if (newTab) window.open(safe, '_blank', 'noopener');
  else location.assign(safe);
}
export function download(name: string, data: string) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = el('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function shortcut(event: KeyboardEvent) {
  return [
    event.ctrlKey ? 'Ctrl' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
    event.metaKey ? 'Meta' : '',
    event.key.length === 1 && event.key !== ',' ? event.key.toUpperCase() : event.key,
  ]
    .filter(Boolean)
    .join('+');
}
