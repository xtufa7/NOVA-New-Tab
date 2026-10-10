import { getSettings, flush } from './settings';
import { mediaKeys, removeMedia } from './media';
export async function cleanUnusedMedia() {
  await flush();
  const used = new Set<string>([getSettings().tab.iconId, getSettings().credits.gunsAvatarId]);
  for (const id of Object.values(getSettings().accountAvatars)) used.add(id);
  for (const font of getSettings().fonts) for (const face of font.faces) used.add(face.mediaId);
  for (const theme of getSettings().customThemes) used.add(theme.appearance.mediaId);
  for (const profile of getSettings().profiles) {
    used.add(profile.appearance.mediaId);
    for (const track of profile.music.tracks) {
      used.add(track.id);
      used.add(track.coverId);
    }
  }
  let removed = 0;
  for (const id of await mediaKeys())
    if (!used.has(id)) {
      await removeMedia(id);
      removed++;
    }
  return removed;
}
