import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import assert from 'node:assert/strict';
const version = JSON.parse(readFileSync('manifest.json', 'utf8')).version;
const root = resolve('output', version);
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(resolve(dir, e.name)) : [resolve(dir, e.name)],
  );
}
const all = files(root);
for (const line of readFileSync(resolve(root, 'SHA256SUMS.txt'), 'utf8').trim().split('\n')) {
  const [hash, ...parts] = line.split('  '),
    name = parts.join('  '),
    path = resolve(root, name);
  assert(path.startsWith(root + sep));
  assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), hash, name);
}
let linkCount = 0;
for (const path of all.filter((p) => p.endsWith('.md'))) {
  const source = readFileSync(path, 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const match of source.matchAll(/\]\(([^)]+)\)|\bsrc="([^"]+)"/g)) {
    let target = (match[1] ?? match[2]).trim().replace(/^<|>$/g, '');
    if (/^(?:[a-z]+:|#|\/)/i.test(target)) continue;
    target = target.split('#')[0].split('?')[0];
    if (!target) continue;
    const resolved = resolve(dirname(path), decodeURIComponent(target));
    assert(existsSync(resolved), `Broken link ${relative(root, path)} -> ${target}`);
    linkCount++;
  }
}
let archives = 0;
for (const path of all.filter((p) => /\.(zip|xpi)$/.test(p))) {
  const entries = unzipSync(readFileSync(path));
  archives++;
  for (const name of Object.keys(entries))
    assert(
      !/(^|\/)(?:work|bridge|node_modules|\.git)(\/|$)|\.nova$|native\/host-.*\.json$/i.test(name),
      `Private/unwanted file: ${name}`,
    );
  if (
    /(?:store|private|Chrome|Chromium|Helium|Edge|Brave|Vivaldi|Opera|Firefox|Zen)(?:-unsigned)?\.(zip|xpi)$/.test(
      path,
    )
  ) {
    assert.equal(JSON.parse(strFromU8(entries['manifest.json'])).version, version);
    assert(entries['website.js'] && entries['manager.html']);
    assert(!Object.keys(entries).some((n) => n.startsWith('native/')));
  }
  if (path.endsWith('github-ready.zip')) {
    for (const n of [
      'README.md',
      'manager.html',
      'src/website/engine.ts',
      'tests/browser-v3.ts',
      'docs/ENGINEERING_REPORT_3.md',
      'dist/website.js',
    ])
      assert(entries[n], `GitHub package missing ${n}`);
  }
}
console.log(
  `Release ${version} verified: ${all.length} files, ${archives} archives, ${linkCount} local documentation links, SHA256 integrity. Read-only verification; prior releases untouched.`,
);
