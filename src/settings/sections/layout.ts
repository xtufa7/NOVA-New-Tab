import { inExtension } from '../../storage/settings';
import { button, toast } from '../../shared/dom';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const section = 'Layout';
  const { note, resetButton, close } = ui;
  const content = ui.content;

  content.append(
    button(
      'Open Edit Mode · Ctrl Shift E',
      async () => {
        if (!document.querySelector('#canvas')) {
          if (inExtension)
            await chrome.tabs.create({
              url: chrome.runtime.getURL('newtab.html'),
            });
          toast('Use Ctrl Shift E on the New Tab.');
          return;
        }
        close();
        const m = await import('../../newtab/edit');
        m.toggleEdit(true);
      },
      'primary',
    ),
  );
  note('Drag to move or resize. Arrow keys fine-tune position; lock keeps widgets in place.');
  resetButton(section);
}
