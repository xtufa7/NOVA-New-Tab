import { chromium } from 'playwright';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaults } from '../src/settings/schema';
import { registry, searchCommands } from '../src/commands/registry';
const directory = resolve('work/suite-perf-extension-' + Date.now());
mkdirSync(directory, { recursive: true });
cpSync(resolve('dist'), directory, { recursive: true });
const manifest = JSON.parse(readFileSync(resolve(directory, 'manifest.json'), 'utf8'));
manifest.permissions.push('tabs');
manifest.optional_permissions = manifest.optional_permissions.filter((p: string) => p !== 'tabs');
writeFileSync(resolve(directory, 'manifest.json'), JSON.stringify(manifest));
const context = await chromium.launchPersistentContext(
  resolve('work/suite-perf-profile-' + Date.now()),
  {
    executablePath: process.env.NOVA_BROWSER,
    headless: true,
    args: [`--disable-extensions-except=${directory}`, `--load-extension=${directory}`],
  },
);
const result: Record<string, unknown> = {
  version: '3.0.0',
  method:
    'Isolated production-code fixture with optional tabs pregranted; 25 lightweight blank tabs. UI-ready timings measured inside loaded pages, not native browser chrome.',
};
try {
  await context.route('https://**/*', (r) => r.abort());
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await new Promise((r) => setTimeout(r, 500));
  const base = 'chrome-extension://' + new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(base + '/newtab.html');
  await page.waitForFunction(() => performance.getEntriesByName('nova-ready').length);
  await worker.evaluate(async () => {
    for (let i = 0; i < 25; i++) await chrome.tabs.create({ url: 'about:blank', active: false });
  });
  const manager = await context.newPage();
  await manager.goto(base + '/manager.html');
  await manager.getByLabel('Search tabs').waitFor();
  result.managerReadyMs = await manager.evaluate(() => performance.now());
  result.managerRows = await manager.locator('.tab-row').count();
  result.managerSearchHandlerMs = await manager.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('[aria-label="Search tabs"]')!,
      start = performance.now();
    input.value = 'about';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return performance.now() - start;
  });
  const popup = await context.newPage();
  await popup.goto(base + '/popup.html');
  await popup.locator('#site-allow').waitFor();
  result.popupReadyMs = await popup.evaluate(() => performance.now());
  await page.bringToFront();
  const paletteStarted = await page.evaluate(() => performance.now());
  await page.keyboard.press('Alt+Shift+P');
  await page.locator('.palette-row').first().waitFor();
  result.paletteOpenMs = (await page.evaluate(() => performance.now())) - paletteStarted;
  result.paletteSearchMs = await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('[aria-label="Search commands"]')!,
      start = performance.now();
    input.value = 'settings music';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return performance.now() - start;
  });
  const commands = registry(
    defaults(),
    Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      title: 'Project ' + i,
      url: 'https://example.test/' + i,
    })),
  );
  const samples = [];
  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    searchCommands(commands, 'proj999');
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  result.nodeFuzzy1000MedianMs = samples[15];
  result.nodeFuzzy1000MaxMs = samples.at(-1);
  writeFileSync('work/suite-performance.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await context.close();
}
