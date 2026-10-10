import { update, flush } from '../storage/settings';
import { el } from '../shared/dom';

// Local customization gate. The password itself is never bundled, exported or recorded.
const digest = '0e23e313eda4ad53fbf0372c13ec389761e6aeb74aedac7e11f3f7de56c46213';
let unlockedUntil = 0;
async function unlock(): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = el('dialog', 'developer-dialog');
    const form = el('form');
    const input = el('input');
    input.type = 'password';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Developer password');
    input.placeholder = 'Developer password';
    const message = el(
      'p',
      'settings-description',
      'Unlock name commands for this tab · 10 minutes',
    );
    const submit = el('button', '', 'Unlock');
    const cancel = el('button', '', 'Cancel');
    cancel.type = 'button';
    const finish = (result: boolean) => {
      input.value = '';
      dialog.close();
      dialog.remove();
      resolve(result);
    };
    cancel.onclick = () => finish(false);
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish(false);
    });
    form.onsubmit = async (event) => {
      event.preventDefault();
      submit.disabled = true;
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.value));
      input.value = '';
      const hash = [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, '0')).join('');
      if (hash === digest) {
        unlockedUntil = Date.now() + 600000;
        finish(true);
      } else {
        message.textContent = 'Incorrect password';
        submit.disabled = false;
        input.focus();
      }
    };
    form.append(el('h2', '', 'sudo developer'), message, input, submit, cancel);
    dialog.append(form);
    document.body.append(dialog);
    dialog.showModal();
    input.focus();
  });
}
export async function developerCommand(raw: string): Promise<string | undefined> {
  if (!/^(?:sudo\b|(?:replace|hide)\s+NOVA-Name\b)/i.test(raw.trim())) return;
  const command = raw.trim();
  if (/^sudo\s+(?:lock|logout)$/i.test(command)) {
    unlockedUntil = 0;
    return 'Developer commands locked.';
  }
  if (/^sudo(?:\s+developer)?$/i.test(command))
    return (await unlock()) ? 'Developer unlocked · 10 minutes.' : 'Unlock cancelled.';
  const match = command.match(/^(?:sudo\s+)?(replace|hide)\s+NOVA-Name\s+to\s*=\s*(.+)$/i);
  if (!match)
    return 'Use: sudo developer, then replace NOVA-Name to = TuFa7 or hide NOVA-Name to = true / false';
  if (Date.now() >= unlockedUntil) {
    if (!/^sudo\s/i.test(command)) return 'Developer locked. Run sudo developer first.';
    if (!(await unlock())) return 'Unlock cancelled.';
  }
  const value = match[2].trim();
  if (match[1].toLowerCase() === 'hide') {
    if (!/^(true|false)$/i.test(value)) return 'Use true or false.';
    update((s) => {
      s.branding.hidden = value.toLowerCase() === 'true';
    });
  } else {
    if (!value || value.length > 40) return 'Use a name of 1–40 characters.';
    update((s) => {
      s.branding.name = value;
    });
  }
  await flush();
  return 'Name updated.';
}
