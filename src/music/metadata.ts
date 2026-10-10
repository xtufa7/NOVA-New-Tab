import { putMedia } from '../storage/media';
import type { Track } from '../settings/schema';
const syncSafe = (bytes: Uint8Array) => bytes.reduce((n, b) => (n << 7) | (b & 127), 0);
function text(bytes: Uint8Array) {
  const encoding = bytes[0];
  return new TextDecoder(
    encoding === 1 || encoding === 2 ? 'utf-16' : encoding === 3 ? 'utf-8' : 'windows-1252',
  )
    .decode(bytes.subarray(1))
    .replaceAll('\0', '')
    .trim();
}
export async function importTrack(file: File, playlist: string): Promise<Track> {
  const track: Track = {
    id: await putMedia(file),
    title: file.name.replace(/\.[^.]+$/, ''),
    artist: 'Local audio',
    coverId: '',
    playlist,
  };
  // Small ID3v2.3/2.4 reader. Unknown formats retain the filename instead of guessing metadata.
  const header = new Uint8Array(await file.slice(0, 10).arrayBuffer());
  if (new TextDecoder().decode(header.subarray(0, 3)) !== 'ID3' || ![3, 4].includes(header[3]))
    return track;
  const data = new Uint8Array(
    await file
      .slice(10, Math.min(10 + syncSafe(header.subarray(6, 10)), 2 * 1024 * 1024))
      .arrayBuffer(),
  );
  for (let offset = 0; offset + 10 < data.length;) {
    const id = new TextDecoder().decode(data.subarray(offset, offset + 4));
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const size =
      header[3] === 4
        ? syncSafe(data.subarray(offset + 4, offset + 8))
        : new DataView(data.buffer).getUint32(offset + 4);
    const frame = data.subarray(offset + 10, offset + 10 + size);
    if (!size || offset + 10 + size > data.length) break;
    if (id === 'TIT2') track.title = text(frame) || track.title;
    if (id === 'TPE1') track.artist = text(frame) || track.artist;
    if (id === 'APIC' && !track.coverId) {
      const mimeEnd = frame.indexOf(0, 1);
      const mime = new TextDecoder().decode(frame.subarray(1, mimeEnd));
      if (['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
        let start = mimeEnd + 2;
        if (frame[0] === 1 || frame[0] === 2) {
          while (start + 1 < frame.length && (frame[start] !== 0 || frame[start + 1] !== 0))
            start += 2;
          start += 2;
        } else {
          while (start < frame.length && frame[start] !== 0) start++;
          start++;
        }
        if (start < frame.length)
          track.coverId = await putMedia(new Blob([frame.slice(start)], { type: mime }));
      }
    }
    offset += 10 + size;
  }
  return track;
}
