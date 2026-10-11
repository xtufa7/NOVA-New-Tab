import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const backup = process.env.NOVA_DEMO_BACKUP;
if (!backup)
  throw Error(
    'Set NOVA_DEMO_BACKUP to a sanitized visual .nova backup. Never publish a personal backup or music.',
  );
const context = await chromium.launchPersistentContext(resolve('work/demo-v3-' + Date.now()), {
  executablePath: process.env.NOVA_BROWSER,
  headless: true,
  args: [`--disable-extensions-except=${resolve('dist')}`, `--load-extension=${resolve('dist')}`],
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: resolve('work/demo-v3-recordings'), size: { width: 1280, height: 720 } },
});
let recording,
  states = [];
try {
  await context.route('https://**/*', (r) => r.abort());
  const worker =
    context.serviceWorkers().find((w) => w.url().startsWith('chrome-extension:')) ??
    (await context.waitForEvent('serviceworker', {
      predicate: (w) => w.url().startsWith('chrome-extension:'),
    }));
  const seed = await context.newPage();
  await seed.goto('chrome-extension://' + new URL(worker.url()).host + '/newtab.html');
  await seed.waitForFunction(() => performance.getEntriesByName('nova-ready').length);
  await seed.getByRole('button', { name: 'Open control center', exact: true }).click();
  await seed.getByRole('button', { name: 'Backup', exact: true }).click();
  seed.once('dialog', (d) => d.accept());
  await seed.getByLabel('Import full backup', { exact: true }).setInputFiles(resolve(backup));
  await seed.getByText('Full backup restored.', { exact: true }).waitFor();
  await seed.waitForTimeout(300);
  await seed.evaluate(async () => {
    const s = (await chrome.storage.local.get('nova.settings'))['nova.settings'];
    s.entrance.enabled = true;
    s.entrance.style = 'rise+blur';
    s.entrance.duration = 1000;
    s.entrance.stagger = 70;
    s.entrance.delay = 80;
    s.performance.lowPower = false;
    s.integrations.spotify = false;
    s.integrations.onlineLyrics = false;
    await chrome.storage.local.set({ 'nova.settings': s });
  });
  const created = context.waitForEvent('page');
  await worker.evaluate(() => chrome.tabs.create({ active: true }));
  const page = await created;
  await page.bringToFront();
  await page.waitForFunction(() => performance.getEntriesByName('nova-opening-start').length);
  await page.waitForFunction(() => {
    const v = document.querySelector('#background video');
    return v?.videoWidth && !v.paused && v.currentTime > 0;
  });
  for (let i = 0; i < 5; i++) {
    states.push(
      await page
        .locator('#background video')
        .evaluate((v) => ({
          time: v.currentTime,
          muted: v.muted,
          loop: v.loop,
          paused: v.paused,
          width: v.videoWidth,
          height: v.videoHeight,
        })),
    );
    await page.waitForTimeout(150);
  }
  console.log('Wallpaper samples:', states);
  assert(
    new Set(states.map((v) => v.time)).size > 1 &&
      states.every((v) => v.muted && v.loop && !v.paused),
  );
  await page.waitForTimeout(1200);
  mkdirSync('docs/demos', { recursive: true });
  await page.screenshot({ path: 'docs/demos/video-background.png' });
  await page.waitForTimeout(7500);
  recording = page.video();
} finally {
  await context.close();
}
const source = await recording.path(),
  run = (args) => {
    const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  };
const previous = {};
for (const file of ['video-background-demo.mp4', 'startup-demo.mp4', 'video-background-demo.gif'])
  previous[file] = statSync('docs/demos/' + file).size;
for (const [file, seconds] of [
  ['video-background-demo.mp4', 10],
  ['startup-demo.mp4', 4],
])
  run([
    '-y',
    '-i',
    source,
    '-t',
    String(seconds),
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-fps_mode',
    'passthrough',
    '-movflags',
    '+faststart',
    'docs/demos/' + file,
  ]);
run([
  '-y',
  '-i',
  'docs/demos/video-background-demo.mp4',
  '-t',
  '4',
  '-filter_complex',
  '[0:v]fps=10,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3',
  'docs/demos/video-background-demo.gif',
]);
writeFileSync(
  'work/demo-recording-report.json',
  JSON.stringify(
    {
      version: '3.0.0',
      productionFullBackupUI: true,
      actualBrowserCreatedNewTab: true,
      videoPlaying: true,
      states,
      source,
      sourceSHA256: createHash('sha256').update(readFileSync(source)).digest('hex'),
      recordedBrowser: 'Helium',
      size: '1280x720',
      originalBackupPublished: false,
      audioPublished: false,
      previousBytes: previous,
    },
    null,
    2,
  ),
);
console.log(
  'Actual New Tab and original local wallpaper recorded; H.264/yuv420p/faststart generated from native 25fps source.',
);
