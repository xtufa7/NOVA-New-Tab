import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let n = 0; n < 8; n++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const label = Buffer.from(type);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([label, data])));
  return Buffer.concat([size, label, data, crc]);
}
mkdirSync('public/icons', { recursive: true });
for (const size of [16, 48, 128]) {
  const data = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const nx = x / size,
        ny = y / size;
      const letter =
        (nx > 0.24 && nx < 0.33 && ny > 0.23 && ny < 0.75) ||
        (nx > 0.65 && nx < 0.74 && ny > 0.23 && ny < 0.75) ||
        (ny > 0.23 && ny < 0.75 && Math.abs(nx - (0.27 + (ny - 0.23) * 0.84)) < 0.052);
      const dot = (nx - 0.82) ** 2 + (ny - 0.77) ** 2 < 0.002;
      const i = y * (size * 4 + 1) + 1 + x * 4;
      const rgb = dot ? [178, 161, 239] : letter ? [236, 233, 245] : [14, 13, 20];
      data.set([...rgb, 255], i);
    }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(
    `public/icons/${size}.png`,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(data)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}
