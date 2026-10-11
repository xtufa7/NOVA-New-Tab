import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync } from 'fflate';
import assert from 'node:assert/strict';
const root = resolve('.'),
  version = JSON.parse(readFileSync('manifest.json', 'utf8')).version;
assert(/^\d+\.\d+\.\d+$/.test(version));
const out = resolve('output', version);
assert(!existsSync(out), `Release exists; previous archives are preserved: ${out}`);
for (const dir of ['dist', 'dist-private', 'dist-firefox'])
  assert.equal(JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8')).version, version);
for (const report of ['v14-report', 'v15-report'])
  assert.equal(JSON.parse(readFileSync(`work/${report}.json`, 'utf8')).version, version);
const gecko = JSON.parse(readFileSync('work/gecko-report.json', 'utf8'));
assert(gecko.every((r) => r.native.startsWith('connected') && r.audio.includes('playing=true')));
assert(gecko.every((r) => r.suite?.actualOpening?.opening && r.suite?.themeState?.engine));
assert.equal(JSON.parse(readFileSync('work/v3-report.json', 'utf8')).version, version);
assert.equal(JSON.parse(readFileSync('work/firefox-lint.json', 'utf8')).errors.length, 0);
mkdirSync(out, { recursive: true });
const copy = (from, to) => cpSync(resolve(root, from), resolve(out, to), { recursive: true });
copy('dist', 'store');
copy('dist-private', 'private');
copy('dist-firefox', 'firefox');
for (const file of ['QA.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'INSTALL_AR.md'])
  copy(file, file);
copy('docs', 'docs');
copy('docs/PRIVACY_POLICY.md', 'PRIVACY_POLICY.md');
writeFileSync(
  resolve(out, 'STORE_PUBLISH_AR.md'),
  readFileSync('docs/STORE_PUBLISH_AR.md', 'utf8').replaceAll(
    '(BROWSERS_AR.md)',
    '(docs/BROWSERS_AR.md)',
  ),
);
writeFileSync(
  resolve(out, 'INSTALL_AR.md'),
  readFileSync('INSTALL_AR.md', 'utf8').replaceAll(
    'public/help/tab-customization.png',
    'store/help/tab-customization.png',
  ),
);

for (const name of [
  'browser-report',
  'v14-report',
  'v15-report',
  'gecko-report',
  'firefox-lint',
  'installer-report',
  'bootstrap-report',
  'spotify-auto-report',
  'setup-report',
  'v156-report',
  'v156-chromium-report',
  'demo-media-report',
  'demo-recording-report',
  'v3-report',
  'performance-v3',
  'suite-performance',
])
  copy(`work/${name}.json`, `${name}.json`);
mkdirSync(resolve(out, 'screenshots'));
for (const name of [
  'preview',
  'settings',
  'player',
  'mobile',
  'lyrics-terminal',
  'lyrics-layout',
  'tab-settings',
  'about',
  'desktop-bridge',
  'animation-preview',
  'firefox',
  'zen',
])
  copy(`work/NOVA-${version}-${name}.png`, `screenshots/${name}.png`);
const github = resolve(out, 'github-ready');
mkdirSync(github);
for (const dir of ['src', 'public', 'docs', 'scripts']) copy(dir, `github-ready/${dir}`);
cpSync(resolve(root, 'tests'), resolve(github, 'tests'), {
  recursive: true,
  filter: (path) => !path.endsWith('browser-v13.ts') && !path.endsWith('native-pin.py'),
});
for (const file of [
  'README.md',
  'setup.ps1',
  'setup.cmd',
  'RELEASE_NOTES.md',
  'INSTALL_AR.md',
  'QA.md',
  'CHANGELOG.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  '.gitignore',
  '.prettierrc.json',
  'manifest.json',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'newtab.html',
  'settings.html',
  'popup.html',
  'floating.html',
  'offscreen.html',
  'manager.html',
])
  copy(file, `github-ready/${file}`);
for (const dist of ['dist', 'dist-firefox']) copy(dist, `github-ready/${dist}`);
for (const file of [
  'install.ps1',
  'spotify-bridge.ps1',
  'launch.cmd',
  'setup.cmd',
  'bootstrap.ps1',
]) {
  copy(`native/${file}`, `github-ready/native/${file}`);
  copy(`native/${file}`, `Windows-PowerShell/native/${file}`);
}
writeFileSync(
  resolve(out, 'Windows-PowerShell/README.md'),
  readFileSync('docs/WINDOWS_SPOTIFY_AR.md', 'utf8').replace(
    '(SETUP_AR.md)',
    '(https://github.com/xtufa7/NOVA-New-Tab/blob/main/docs/SETUP_AR.md)',
  ),
);
copy('docs/images/desktop-bridge.png', 'Windows-PowerShell/images/desktop-bridge.png');
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(resolve(dir, e.name)) : [resolve(dir, e.name)],
  );
}
function zip(dir, name) {
  const data = Object.fromEntries(
    files(dir)
      .sort()
      .map((path) => [
        relative(dir, path).replaceAll('\\', '/'),
        [new Uint8Array(readFileSync(path)), { mtime: new Date('2026-10-07T00:00:00Z') }],
      ]),
  );
  writeFileSync(resolve(out, name), zipSync(data, { level: 6 }));
}
zip(resolve(out, 'store'), `NOVA-${version}-store.zip`);
zip(resolve(out, 'private'), `NOVA-${version}-private.zip`);
for (const browser of [
  'Chrome',
  'Chromium',
  'Helium',
  'Edge',
  'Brave',
  'Vivaldi',
  'Opera',
  'Opera-GX',
]) {
  copy('dist', `browsers/${browser}`);
  zip(resolve(out, 'browsers', browser), `NOVA-${version}-${browser}.zip`);
}
for (const browser of ['Firefox', 'Zen']) {
  copy('dist-firefox', `browsers/${browser}`);
  zip(resolve(out, 'browsers', browser), `NOVA-${version}-${browser}.zip`);
  zip(resolve(out, 'browsers', browser), `NOVA-${version}-${browser}-unsigned.xpi`);
}
zip(resolve(out, 'Windows-PowerShell'), `NOVA-${version}-Windows-PowerShell.zip`);
mkdirSync(resolve(github, 'release-assets'));
for (const name of readdirSync(out).filter(
  (name) => /\.(zip|xpi)$/.test(name) && !name.includes('github-ready'),
))
  cpSync(resolve(out, name), resolve(github, 'release-assets', name));
zip(github, `NOVA-${version}-github-ready.zip`);
writeFileSync(
  resolve(out, 'README.md'),
  `# NØVA ${version}\n\n![NØVA](docs/demos/video-background.png)\n\nBrowser Experience Suite: Website Appearance, Theme Inspector, offline Marketplace, Tab Manager, Command Palette, adaptive themes and reversible Focus.\n\n- **store/**: ready Chromium / Helium build. Update the same extension folder and ID to retain settings.\n- **NOVA-${version}-store.zip**: Chrome Store upload package; [upload guide](docs/STORE_PUBLISH_AR.md).\n- **browsers/**: browser-named Chromium/Gecko builds and archives. Firefox/Zen XPI files are unsigned; [signing and compatibility](docs/BROWSERS_AR.md).\n- **github-ready/** and **NOVA-${version}-github-ready.zip**: source, builds, screenshots, demos, scripts and docs for your repository. [Full README](github-ready/README.md).\n- **Windows-PowerShell/**: optional desktop Spotify integration, outside the extension. [Setup and removal](docs/WINDOWS_SPOTIFY_AR.md).\n\n[Engineering report A–J](docs/ENGINEERING_REPORT_3.md) · [QA](QA.md) · [Migration](docs/MIGRATION_3.md) · [Privacy](PRIVACY_POLICY.md) · [Demo](docs/DEMOS.md)\n\nVersion ${version}, schema 7. Prior release folders and personal media are preserved. No Store publication, signing or GitHub upload was performed. Local review branch: dev/nova-3.0. Website appearance starts disabled and requires site access; default Spotify Web behavior remains.\n`,
);
const sums = files(out)
  .sort()
  .map(
    (path) =>
      `${createHash('sha256').update(readFileSync(path)).digest('hex')}  ${relative(out, path).replaceAll('\\', '/')}`,
  );
writeFileSync(resolve(out, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
console.log(
  `Packaged ${version}: ${files(out).length} files. Chromium/Gecko/GitHub/optional PowerShell. Previous releases unchanged.`,
);
