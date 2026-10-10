import { getProfile, update } from '../storage/settings';
import { defaults, makeProfile, type Settings, type Profile } from './schema';
import { el, button, report } from '../shared/dom';
import { renderAppearance } from '../newtab/appearance';
export function createSettingsUI(
  initialContent: HTMLElement,
  redraw: () => void,
  close: () => void,
) {
  let content = initialContent;
  function change(action: (s: Settings, p: Profile) => void) {
    update(action);
    void renderAppearance().catch(report);
  }
  function field(
    label: string,
    type: string,
    value: string | number | boolean,
    action: (value: string | number | boolean) => void,
    options?: string[],
  ) {
    const row = el('label', 'field'),
      caption = el('span', '', label);
    row.append(caption);
    const input = options ? el('select') : el('input');
    input.setAttribute('aria-label', label);
    if (input instanceof HTMLSelectElement)
      for (const option of options ?? []) {
        const opt = el('option', '', option);
        opt.value = option;
        input.append(opt);
      }
    else input.type = type;
    if (input instanceof HTMLInputElement && type === 'checkbox') input.checked = Boolean(value);
    else input.value = String(value);
    input.addEventListener('change', () => {
      try {
        action(
          input instanceof HTMLInputElement && type === 'checkbox'
            ? input.checked
            : type === 'number' || type === 'range'
              ? Number(input.value)
              : input.value,
        );
      } catch (error) {
        report(error);
        input.value = String(value);
      }
    });
    row.append(input);
    content.append(row);
    return input;
  }
  function range(
    label: string,
    value: number,
    min: number,
    max: number,
    action: (n: number) => void,
    step = 1,
  ) {
    const input = field(`${label} · ${value}`, 'range', value, (n) =>
      action(Number(n)),
    ) as HTMLInputElement;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    // Range inputs clamp values against their default 0..100 bounds when assigned early.
    input.value = String(value);
    input.setAttribute('aria-label', label);
    input.addEventListener('input', () => {
      input.parentElement!.querySelector('span')!.textContent = `${label} · ${input.value}`;
      action(Number(input.value));
    });
    return input;
  }
  function textArea(label: string, value: string, action: (v: string) => void, code = false) {
    const row = el('label', 'field block', label),
      input = el('textarea', code ? 'code-editor' : '');
    input.value = value;
    input.spellcheck = false;
    input.setAttribute('aria-label', label);
    input.addEventListener('change', () => {
      try {
        action(input.value);
      } catch (error) {
        report(error);
      }
    });
    row.append(input);
    content.append(row);
    return input;
  }
  function files(
    label: string,
    accept: string,
    multiple: boolean,
    action: (files: File[]) => Promise<void>,
  ) {
    const wrapper = el('label', 'file-button', label),
      input = el('input');
    input.type = 'file';
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'button');
    wrapper.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        input.click();
      }
    });
    input.accept = accept;
    input.multiple = multiple;
    input.addEventListener('change', () => {
      const selected = Array.from(input.files ?? []);
      if (selected.length)
        void action(selected)
          .catch(report)
          .finally(() => (input.value = ''));
    });
    wrapper.append(input);
    content.append(wrapper);
    return wrapper;
  }
  function note(text: string) {
    content.append(el('p', 'settings-description', text));
  }
  function heading(text: string) {
    content.append(el('h3', '', text));
  }
  function resetButton(section: string) {
    content.append(
      button('Reset ' + section, () => {
        const d = defaults(),
          p = makeProfile(getProfile().name, getProfile().id);
        change((s, current) => {
          switch (section) {
            case 'Appearance':
              current.appearance = p.appearance;
              s.tab = d.tab;
              break;
            case 'Layout':
              current.layout = {};
              break;
            case 'Widgets':
              current.widgets = p.widgets;
              break;
            case 'Terminal':
              current.terminal = p.terminal;
              break;
            case 'Music':
              current.music = p.music;
              s.lyrics = d.lyrics;
              break;
            case 'Privacy':
              s.privacy = d.privacy;
              break;
            case 'Shortcuts':
              current.links = p.links;
              current.linksOptions = p.linksOptions;
              break;
            case 'Performance':
              s.performance = d.performance;
              s.entrance = d.entrance;
              s.memory = d.memory;
              break;
            case 'Floating Tabs':
              s.floatingTabs = d.floatingTabs;
              break;
            case 'Advanced':
              current.appearance.customCSS = '';
              current.appearance.cssEnabled = false;
              break;
          }
        });
        redraw();
      }),
    );
  }

  return {
    get content() {
      return content;
    },
    set content(value: HTMLElement) {
      content = value;
    },
    group(label: string, action: () => void, open = false) {
      const parent = content,
        details = el('details', 'settings-group');
      details.open = open;
      details.append(el('summary', '', label));
      content = el('div', 'settings-group-content');
      details.append(content);
      parent.append(details);
      try {
        action();
      } finally {
        content = parent;
      }
    },
    field,
    range,
    textArea,
    files,
    note,
    heading,
    resetButton,
    change,
    redraw,
    close,
  };
}
export type SettingsUI = ReturnType<typeof createSettingsUI>;
