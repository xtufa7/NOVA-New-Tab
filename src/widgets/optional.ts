import type { WidgetId } from '../settings/schema';
import { getProfile, getSettings, update, inExtension } from '../storage/settings';
import { el, button, report, toast } from '../shared/dom';
import { saveSession, openSession, requirePermission } from '../sessions/index';
import { sessionValue, type PopupRecord } from '../shared/browser';
export async function mount(node: HTMLElement, id: WidgetId): Promise<() => void> {
  node.replaceChildren(
    el(
      'h2',
      '',
      (
        {
          notes: 'Scratchpad',
          status: 'Browser status',
          tabs: 'Open tabs',
          recent: 'Recent sites',
          sessions: 'Sessions',
          shelf: 'Pinned tab shelf',
        } as Partial<Record<WidgetId, string>>
      )[id] ?? id,
    ),
  );
  let disposed = false;
  if (id === 'notes') {
    const area = el('textarea', 'notes-area');
    area.value = getProfile().notes;
    area.placeholder = 'Leave a thought here…';
    area.setAttribute('aria-label', 'Local notes');
    area.addEventListener('input', () => update((_s, p) => (p.notes = area.value)));
    node.append(area);
    const refresh = () => {
      if (document.activeElement !== area && area.value !== getProfile().notes)
        area.value = getProfile().notes;
    };
    document.addEventListener('nova-render', refresh);
    return () => document.removeEventListener('nova-render', refresh);
  }
  if (id === 'status') {
    node.append(
      el(
        'p',
        'muted',
        `${inExtension ? 'Extension' : 'Preview'} · ${navigator.onLine ? 'Online' : 'Offline'}\nLocal storage · no telemetry`,
      ),
    );
    return () => {};
  }
  if (id === 'sessions') {
    const name = el('input');
    name.placeholder = 'Session name';
    name.setAttribute('aria-label', 'Session name');
    const list = el('div', 'small-list');
    node.append(el('div', 'row'), list);
    node.querySelector('.row')!.append(
      name,
      button('Save tabs', async () => {
        await saveSession(name.value);
        name.value = '';
        refresh();
        toast('Session saved.');
      }),
    );
    const refresh = () => {
      list.replaceChildren();
      for (const s of getSettings().sessions) {
        const row = el('div', 'row');
        row.append(
          button(`${s.name} · ${s.urls.length}`, () => openSession(s.id)),
          button('Rename', () => {
            const next = prompt('Session name', s.name);
            if (next?.trim())
              update((settings) => {
                const session = settings.sessions.find((x) => x.id === s.id);
                if (session) session.name = next.trim().slice(0, 80);
              });
          }),
          button('×', () =>
            update(
              (settings) => (settings.sessions = settings.sessions.filter((x) => x.id !== s.id)),
            ),
          ),
        );
        list.append(row);
      }
    };
    refresh();
    document.addEventListener('nova-render', refresh);
    return () => document.removeEventListener('nova-render', refresh);
  }
  if (!inExtension) {
    node.append(el('p', 'muted', 'Install NØVA to use browser tools.'));
    return () => {};
  }
  async function load() {
    if (
      !(await chrome.permissions.contains({
        permissions: [id === 'recent' ? 'history' : 'tabs'],
      }))
    ) {
      node.append(
        button('Enable ' + (id === 'recent' ? 'recent sites' : 'tab access'), async () => {
          await requirePermission(id === 'recent' ? 'history' : 'tabs');
          await show();
        }),
      );
      return;
    }
    await show();
  }
  const list = el('div', 'small-list');
  node.append(list);
  async function show() {
    if (disposed) return;
    node.querySelectorAll(':scope > button').forEach((n) => n.remove());
    list.replaceChildren();
    if (id === 'recent') {
      const sites = await chrome.history.search({
        text: '',
        maxResults: 30,
        startTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
      });
      if (disposed) return;
      for (const site of sites.filter((s) => /^https?:\/\//.test(s.url ?? '')).slice(0, 8)) {
        const a = el('a', '', site.title || new URL(site.url!).hostname);
        a.href = site.url!;
        list.append(a);
      }
      return;
    }
    const tabs = await chrome.tabs.query({
      currentWindow: true,
      ...(id === 'shelf' ? { pinned: true } : {}),
    });
    if (disposed) return;
    if (id === 'tabs') {
      list.append(el('span', 'muted', `${tabs.length} tabs in this window`));
      return;
    }
    for (const tab of tabs) {
      const row = el('div', 'row');
      const focus = button(tab.title || 'Tab', () => chrome.tabs.update(tab.id!, { active: true }));
      focus.title = tab.url ?? '';
      focus.style.maxWidth = '200px';
      focus.style.overflow = 'hidden';
      focus.style.whiteSpace = 'nowrap';
      focus.style.textOverflow = 'ellipsis';
      const info = el('div', 'tab-info');
      const domain = el('small', 'muted');
      try {
        domain.textContent = new URL(tab.url ?? '').hostname;
      } catch {
        domain.textContent = 'Browser tab';
      }
      info.append(focus, domain);
      if (tab.favIconUrl && /^https?:|^data:image\//.test(tab.favIconUrl)) {
        const image = el('img', 'tab-favicon');
        image.src = tab.favIconUrl;
        image.alt = '';
        image.referrerPolicy = 'no-referrer';
        image.addEventListener('error', () => image.remove());
        info.prepend(image);
      }
      row.append(
        info,
        button('↗', async () => {
          const m = await import('../floating/client');
          await m.floatTab(tab, 'interactive');
        }),
        button('×', () => chrome.tabs.remove(tab.id!)),
      );
      list.append(row);
    }
    const saved = await sessionValue<PopupRecord>('nova.popup');
    if (saved)
      list.append(
        button('Restore floating tab', async () => {
          const result = await chrome.runtime.sendMessage({
            target: 'worker',
            type: 'float-restore',
            tabId: saved.tabId,
          });
          if (result?.error) throw new Error(result.error);
        }),
      );
  }
  await load().catch(report);
  const refresh = () => void show().catch(report);
  if (id !== 'recent') {
    chrome.tabs.onCreated.addListener(refresh);
    chrome.tabs.onRemoved.addListener(refresh);
    chrome.tabs.onUpdated.addListener(refresh);
  }
  return () => {
    disposed = true;
    chrome.tabs.onCreated.removeListener(refresh);
    chrome.tabs.onRemoved.removeListener(refresh);
    chrome.tabs.onUpdated.removeListener(refresh);
  };
}
