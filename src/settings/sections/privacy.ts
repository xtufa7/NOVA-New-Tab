import { isGecko } from '../../shared/platform';
import { getSettings, inExtension, flush, validateSettings } from '../../storage/settings';
import { el, button, toast, report } from '../../shared/dom';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const { field, note, change, resetButton, redraw, textArea } = ui;
  const content = ui.content;
  const s = getSettings();

  const intro = el('div', 'settings-intro');
  intro.append(
    el('strong', '', 'Private by default'),
    el('p', '', 'Local settings and media. No analytics. You control optional access.'),
  );
  content.append(intro);
  ui.group(
    'Tracking protection',
    () => {
      const content = ui.content;
      content.append(
        button(
          s.privacy.blockTrackers ? 'Disable tracker blocker' : 'Enable tracker blocker',
          async () => {
            if (!inExtension) throw new Error('Install the extension first.');
            change((s) => (s.privacy.blockTrackers = !s.privacy.blockTrackers));
            await flush();
            redraw();
          },
          s.privacy.blockTrackers ? 'primary' : '',
        ),
      );
      note(
        'Blocks known tracking endpoints across the browser. Add exceptions if a website needs them.',
      );
      textArea(
        'Website exceptions · one domain per line',
        s.privacy.exceptions.join('\n'),
        (value) => {
          const exceptions = [
            ...new Set(
              value
                .split(/\s+/)
                .filter(Boolean)
                .map((x) => x.toLowerCase()),
            ),
          ];
          const candidate = structuredClone(getSettings());
          candidate.privacy.exceptions = exceptions;
          validateSettings(candidate);
          change((s) => (s.privacy.exceptions = exceptions));
        },
      );
    },
    true,
  );
  ui.group('Local data & history', () => {
    const content = ui.content;
    field('Remember command history', 'checkbox', s.privacy.rememberHistory, (v) =>
      change((s) => (s.privacy.rememberHistory = Boolean(v))),
    );
    content.append(
      button('Clear all command histories', () => {
        change((s) => s.profiles.forEach((p) => (p.terminal.history = [])));
        toast('Histories cleared.');
      }),
    );

    content.append(
      button('Clean unused local media', async () => {
        const { cleanUnusedMedia } = await import('../../storage/cleanup');
        toast(`Removed ${await cleanUnusedMedia()} unused local media files.`);
      }),
    );
  });
  ui.group('Browser permissions', () => {
    const content = ui.content;
    const descriptions: Record<string, [string, string]> = {
      tabs: ['Tabs & sessions', 'Read tab titles and URLs for workspaces and browser tools.'],
      history: ['Recent sites', 'Read browsing history only for the Recent sites widget.'],
      tabCapture: ['Live tab preview', 'Capture the tab you select. Preview stays on this device.'],
      nativeMessaging: ['Spotify desktop', 'Allow the optional external PowerShell integration.'],
    };
    for (const permission of [
      'tabs',
      'history',
      ...(!isGecko ? ['tabCapture' as const] : []),
      'nativeMessaging',
    ] as const) {
      const row = el('div', 'permission-card');
      const [label, description] = descriptions[permission];
      const copy = el('div', 'permission-copy');
      copy.append(el('strong', '', label), el('p', '', description));
      const state = el('span', 'status-badge', 'Checking…');
      const grant = button('Allow', async () => {
        if (!(await chrome.permissions.request({ permissions: [permission] })))
          throw new Error('Permission was not granted.');
        await refresh();
        toast(label + ' allowed.');
      });
      const revoke = button('Remove access', async () => {
        if (inExtension) await chrome.permissions.remove({ permissions: [permission] });
        await refresh();
        toast(label + ' access removed.');
      });
      const refresh = async () => {
        const allowed =
          inExtension && (await chrome.permissions.contains({ permissions: [permission] }));
        if (!row.isConnected) return;
        state.textContent = allowed ? 'Allowed' : 'Not allowed';
        state.dataset.enabled = String(allowed);
        grant.disabled = !!allowed;
        revoke.disabled = !allowed;
      };
      const actions = el('div', 'permission-actions');
      actions.append(state, grant, revoke);
      row.append(copy, actions);
      content.append(row);
      void refresh().catch(report);
    }
    note(
      'Only the features you enable use these permissions. Website access is managed separately below.',
    );
  });
  ui.group('Website access', () => {
    const content = ui.content;
    note(
      'Remove optional website permissions and disconnect online integrations. Local media and workspaces stay available.',
    );
    content.append(
      button('Revoke optional website access', async () => {
        if (!inExtension) return;
        change((s) => {
          s.companion.enabled = false;
          s.integrations.spotify = false;
          s.integrations.onlineLyrics = false;
          s.credits.syncGunsAvatar = false;
        });
        await flush();
        await chrome.permissions.remove({ origins: ['https://*/*', 'http://*/*'] });
        toast('Optional website access revoked.');
        redraw();
      }),
    );
  });
  resetButton('Privacy');
}
