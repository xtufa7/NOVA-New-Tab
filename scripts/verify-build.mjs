import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const directory = process.argv[2] ?? 'dist';
function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((item) =>
    item.isDirectory() ? files(resolve(path, item.name)) : [resolve(path, item.name)],
  );
}
const all = files(directory),
  manifest = JSON.parse(readFileSync(resolve(directory, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.chrome_url_overrides.newtab, 'newtab.html');
assert.deepEqual(manifest.host_permissions, ['https://open.spotify.com/*', 'https://lrclib.net/*']);
assert.ok(!all.some((file) => file.endsWith('.map')));
for (const file of [
  'manager.html',
  'website.js',
  'newtab.html',
  'settings.html',
  'floating.html',
  'offscreen.html',
  'popup.html',
  'background.js',
  ...Object.values(manifest.icons),
])
  assert.ok(existsSync(resolve(directory, file)), `Missing ${file}`);
for (const file of all.filter((file) => file.endsWith('.js'))) {
  const source = readFileSync(file, 'utf8');
  assert.ok(!/\beval\s*\(/.test(source), `eval in ${file}`);
  assert.ok(!source.includes('sourceMappingURL'));
}
const total = all.reduce((n, file) => n + readFileSync(file).length, 0);
const hash = createHash('sha256');
all.sort().forEach((file) => hash.update(readFileSync(file)));
console.log(
  `MV3 verified · ${all.length} files · ${(total / 1024).toFixed(1)} KiB · SHA256 ${hash.digest('hex')}`,
);
