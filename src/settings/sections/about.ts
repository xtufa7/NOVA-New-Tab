import { getProfile, getSettings } from '../../storage/settings';
import { el } from '../../shared/dom';
import { getMedia } from '../../storage/media';
import type { SettingsUI } from '../ui';
export function render(ui: SettingsUI) {
  const hero = el('div', 'about-hero');
  hero.append(
    el('span', 'about-logo', 'NØVA'),
    el('p', '', 'Your time. Your space.'),
    el('small', '', 'VERSION ' + __BUILD__.version),
  );
  ui.content.append(hero);
  const cards = el('div', 'account-cards');
  for (const [name, url, image] of [
    ['GitHub · xtufa7', 'https://github.com/xtufa7', 'accounts/github.png'],
    ['Guns.lol · xtufa7', 'https://guns.lol/xtufa7', 'accounts/guns.webp'],
  ]) {
    const card = el('div', 'account-card'),
      link = el('a'),
      avatar = el('img', 'account-avatar');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    avatar.src = image;
    avatar.alt = name;
    link.append(avatar, el('strong', '', name), el('span', '', '↗'));
    card.append(link);
    cards.append(card);
    const id = url.includes('guns.lol')
      ? getSettings().credits.gunsAvatarId
      : getSettings().accountAvatars.github;
    if (id)
      void getMedia(id).then((blob) => {
        if (!blob || !card.isConnected) return;
        const local = URL.createObjectURL(blob);
        avatar.onload = () => URL.revokeObjectURL(local);
        avatar.src = local;
      });
  }
  ui.content.append(cards);
  ui.field('Show Creator Credits', 'checkbox', getProfile().widgets.credits, (value) =>
    ui.change((_s, p) => {
      p.widgets.credits = Boolean(value);
    }),
  );
  ui.group('Build & license', () => {
    ui.note(`${__BUILD__.profile} · ${__BUILD__.buildId}`);
    const author = el('a', '', '© 2026 xtufa7 · GitHub ↗');
    author.href = 'https://github.com/xtufa7';
    author.target = '_blank';
    author.rel = 'noopener noreferrer';
    ui.content.append(author);
  });
}
