import { Zip, ZipPassThrough, unzipSync } from 'fflate';
import { getSettings, validateSettings, replaceSettings, inExtension } from './settings';
import { getMedia, putMediaBatch, removeMedia } from './media';
import type { Settings } from '../settings/schema';
const LIMIT = 512 * 1048576;
export function referencedMedia(s: Settings) {
  const ids = new Set([s.tab.iconId, s.credits.gunsAvatarId, ...Object.values(s.accountAvatars)]);
  for (const p of s.profiles) {
    ids.add(p.appearance.mediaId);
    ids.add(p.appearance.customFontId);
    ids.add(p.appearance.clockCustomFontId);
    for (const t of p.music.tracks) {
      ids.add(t.id);
      ids.add(t.coverId);
    }
  }
  for (const t of s.customThemes) ids.add(t.appearance.mediaId);
  for (const f of s.fonts) for (const face of f.faces) ids.add(face.mediaId);
  ids.delete('');
  // Font family IDs refer to library records rather than blobs.
  for (const f of s.fonts) ids.delete(f.id);
  return ids;
}
const hash = async (data: Uint8Array) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', data as BufferSource))]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
export async function fullBackup(progress: (value: string) => void): Promise<Blob> {
  const settings = structuredClone(getSettings());
  const files: { id: string; blob: Blob }[] = [],
    missing: string[] = [];
  let total = 0;
  for (const id of referencedMedia(settings)) {
    const blob = await getMedia(id);
    if (!blob) {
      missing.push(id);
      continue;
    }
    total += blob.size;
    if (total > LIMIT)
      throw new Error(
        'Full backup maximum is 512 MB. Export settings separately or reduce the media library.',
      );
    files.push({ id, blob });
  }
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let failure: Error | null = null;
  const zip = new Zip((error, chunk) => {
    if (error) failure = error;
    else chunks.push(chunk.slice());
  });
  const assets: { id: string; path: string; type: string; size: number; sha256: string }[] = [];
  for (const [index, entry] of files.entries()) {
    progress(`Packing media ${index + 1} / ${files.length}`);
    const bytes = new Uint8Array(await entry.blob.arrayBuffer());
    const path = `media/${String(index).padStart(6, '0')}.bin`;
    assets.push({
      id: entry.id,
      path,
      type: entry.blob.type,
      size: bytes.length,
      sha256: await hash(bytes),
    });
    const file = new ZipPassThrough(path);
    zip.add(file);
    for (let offset = 0; offset < bytes.length; offset += 1048576) {
      const end = Math.min(bytes.length, offset + 1048576);
      file.push(bytes.subarray(offset, end), end === bytes.length);
      if (offset % (8 * 1048576) === 0) await new Promise((r) => setTimeout(r, 0));
    }
    if (!bytes.length) file.push(new Uint8Array(), true);
  }
  const meta = new ZipPassThrough('nova.json');
  zip.add(meta);
  meta.push(
    new TextEncoder().encode(
      JSON.stringify({ format: 'nova-full-backup', version: 1, settings, assets, missing }),
    ),
    true,
  );
  zip.end();
  if (failure) throw failure;
  progress(
    missing.length
      ? `Ready · ${missing.length} referenced files were already missing.`
      : 'Ready · settings and all local media included.',
  );
  return new Blob(chunks, { type: 'application/zip' });
}
export async function restoreFullBackup(
  file: Blob,
  confirmRestore: () => Promise<boolean>,
  progress: (value: string) => void,
) {
  if (file.size > LIMIT + 10 * 1048576) throw new Error('Maximum full archive: 512 MB of media.');
  progress('Validating archive…');
  let total = 0;
  const content = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter: (entry) => {
      if (entry.name !== 'nova.json' && !/^media\/\d{6}\.bin$/.test(entry.name)) return false;
      if (!Number.isSafeInteger(entry.originalSize) || entry.originalSize < 0)
        throw new Error('Invalid archive entry size.');
      total += entry.originalSize;
      if (entry.originalSize > LIMIT || total > LIMIT + 10 * 1048576)
        throw new Error('Archive expands beyond the allowed size.');
      if (entry.name === 'nova.json' && entry.originalSize > 10 * 1048576)
        throw new Error('Settings entry is too large.');
      return true;
    },
  });
  if (!content['nova.json']) throw new Error('Missing nova.json.');
  const raw = JSON.parse(new TextDecoder().decode(content['nova.json']));
  if (
    raw.format !== 'nova-full-backup' ||
    raw.version !== 1 ||
    !Array.isArray(raw.assets) ||
    raw.assets.length > 12000
  )
    throw new Error('Unsupported full backup.');
  const settings = validateSettings(raw.settings);
  const ids = new Set<string>(),
    paths = new Set<string>(),
    mapping = new Map<string, string>();
  const entries: { id: string; blob: Blob }[] = [];
  for (const asset of raw.assets) {
    if (
      typeof asset.id !== 'string' ||
      !asset.id ||
      asset.id.length > 200 ||
      ids.has(asset.id) ||
      typeof asset.path !== 'string' ||
      !/^media\/\d{6}\.bin$/.test(asset.path) ||
      paths.has(asset.path) ||
      typeof asset.type !== 'string' ||
      asset.type.length > 200 ||
      !Number.isSafeInteger(asset.size) ||
      !/^[a-f0-9]{64}$/.test(asset.sha256)
    )
      throw new Error('Invalid media manifest.');
    ids.add(asset.id);
    paths.add(asset.path);
    const bytes = content[asset.path];
    if (!bytes || bytes.length !== asset.size || (await hash(bytes)) !== asset.sha256)
      throw new Error('A media file is missing or corrupted. Import cancelled.');
    const id = crypto.randomUUID();
    mapping.set(asset.id, id);
    entries.push({ id, blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: asset.type }) });
  }
  if (!(await confirmRestore())) {
    progress('Import cancelled.');
    return false;
  }
  const remap = (id: string) => mapping.get(id) ?? id;
  settings.tab.iconId = remap(settings.tab.iconId);
  settings.credits.gunsAvatarId = remap(settings.credits.gunsAvatarId);
  for (const key of Object.keys(settings.accountAvatars) as (keyof Settings['accountAvatars'])[])
    settings.accountAvatars[key] = remap(settings.accountAvatars[key]);
  for (const p of settings.profiles) {
    p.appearance.mediaId = remap(p.appearance.mediaId);
    for (const t of p.music.tracks) {
      t.id = remap(t.id);
      t.coverId = remap(t.coverId);
    }
  }
  for (const t of settings.customThemes) t.appearance.mediaId = remap(t.appearance.mediaId);
  for (const f of settings.fonts) for (const face of f.faces) face.mediaId = remap(face.mediaId);
  if (inExtension) {
    const { musicCommand } = await import('../music/client');
    await musicCommand('stop').catch(() => {});
  }
  progress('Restoring local media…');
  await putMediaBatch(entries);
  try {
    await replaceSettings(settings);
  } catch (error) {
    await Promise.allSettled(entries.map((entry) => removeMedia(entry.id)));
    throw error;
  }
  progress(`Restored · ${entries.length} local files.`);
  return true;
}
export function downloadBackup(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'NOVA-full-backup.nova';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
