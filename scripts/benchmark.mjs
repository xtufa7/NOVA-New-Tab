import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
const report = {
  browser: process.env.NOVA_BROWSER,
  method:
    '5 actual browser-created tabs per build, identical clean local settings; headless Helium; single machine, not a universal benchmark',
  builds: [],
};
for (const [version, directory] of [
  ['1.5.6', 'output/1.5.6/store'],
  ['3.0.0', 'dist'],
]) {
  const dir = resolve(directory),
    context = await chromium.launchPersistentContext(
      resolve('work/benchmark-' + version + '-' + Date.now()),
      {
        executablePath: process.env.NOVA_BROWSER,
        headless: true,
        viewport: { width: 1440, height: 900 },
        args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`],
      },
    );
  try {
    await context.route('https://**/*', (r) => r.abort());
    const worker =
      context.serviceWorkers().find((w) => w.url().startsWith('chrome-extension:')) ??
      (await context.waitForEvent('serviceworker', {
        predicate: (w) => w.url().startsWith('chrome-extension:'),
      }));
    await new Promise((r) => setTimeout(r, 500));
    const seed = await context.newPage();
    await seed.goto('chrome-extension://' + new URL(worker.url()).host + '/newtab.html');
    await seed.waitForFunction(() => performance.getEntriesByName('nova-ready').length);
    await seed.waitForTimeout(400);
    await seed.evaluate(async () => {
      const s = (await chrome.storage.local.get('nova.settings'))['nova.settings'];
      s.integrations.spotify = false;
      s.integrations.onlineLyrics = false;
      s.companion.enabled = false;
      s.profiles[0].appearance.background = 'solid';
      s.performance.lowPower = false;
      await chrome.storage.local.set({ 'nova.settings': s, 'nova.spotify.autoSetup.v1': true });
    });
    const samples = [];
    for (let i = 0; i < 5; i++) {
      const incoming = context.waitForEvent('page');
      await worker.evaluate(() => chrome.tabs.create({ active: true }));
      const p = await incoming;
      await p.bringToFront();
      await p.waitForFunction(() => performance.getEntriesByName('nova-ready').length);
      const data = await p.evaluate(() => ({
        ready: performance.getEntriesByName('nova-ready')[0].startTime,
        opening: performance.getEntriesByName('nova-opening-start')[0]?.startTime ?? null,
        paint: performance
          .getEntriesByType('paint')
          .map((v) => ({ name: v.name, time: v.startTime })),
      }));
      const cdp = await context.newCDPSession(p);
      await cdp.send('Performance.enable');
      await p.waitForTimeout(1800);
      const before = await cdp.send('Performance.getMetrics');
      await p.waitForTimeout(500);
      const after = await cdp.send('Performance.getMetrics');
      const metric = (m, k) => m.metrics.find((v) => v.name === k)?.value ?? 0;
      samples.push({
        ...data,
        heapBytes: metric(after, 'JSHeapUsedSize'),
        idleTaskSeconds: metric(after, 'TaskDuration') - metric(before, 'TaskDuration'),
      });
      await p.close();
    }
    const files = (path) =>
      readdirSync(path, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? files(resolve(path, e.name)) : [resolve(path, e.name)],
      );
    const bytes = files(dir).reduce((n, p) => n + readFileSync(p).length, 0);
    const median = (k) => samples.map((v) => v[k]).sort((a, b) => a - b)[2];
    report.builds.push({
      version,
      samples,
      bytes,
      medianReadyMs: median('ready'),
      medianHeapBytes: median('heapBytes'),
      medianIdleTaskSeconds: median('idleTaskSeconds'),
    });
    console.log(version, 'ready median', median('ready').toFixed(1), 'ms');
  } finally {
    await context.close();
  }
}
writeFileSync('work/performance-v3.json', JSON.stringify(report, null, 2));
