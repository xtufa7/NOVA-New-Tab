import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const directory = resolve('dist');
mkdirSync('docs/images/suite', { recursive: true });
const context = await chromium.launchPersistentContext(
  resolve('work/suite-gallery-' + Date.now()),
  {
    executablePath: process.env.NOVA_BROWSER,
    headless: true,
    viewport: { width: 1440, height: 1000 },
    args: [`--disable-extensions-except=${directory}`, `--load-extension=${directory}`],
  },
);
try {
  await context.route('https://**/*', (r) => r.abort());
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  const base = 'chrome-extension://' + new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(base + '/settings.html');
  await page.getByRole('button', { name: 'Adaptive Themes', exact: true }).waitFor();
  const bounds = await page.locator('.control-center').boundingBox();
  assert(
    bounds.x >= 0 && bounds.x + bounds.width <= 1440,
    'Standalone settings must remain within the viewport',
  );
  for (const [name, file] of [
    ['Adaptive Themes', 'adaptive-settings'],
    ['Focus Mode', 'focus-settings'],
    ['Command Palette', 'command-settings'],
    ['Tab Manager', 'tab-settings'],
  ]) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.waitForTimeout(150);
    await page.screenshot({ path: 'docs/images/suite/' + file + '.png' });
  }
  await page.setViewportSize({ width: 400, height: 800 });
  await page.getByRole('button', { name: 'Adaptive Themes', exact: true }).click();
  const mobile = await page.locator('.control-center').boundingBox();
  assert(
    mobile.x >= 0 && mobile.x + mobile.width <= 400,
    'Mobile settings stay within the viewport',
  );
  await page.screenshot({ path: 'docs/images/suite/settings-mobile.png' });
  console.log('Actual production settings captured: adaptive, focus, commands and tabs.');
} finally {
  await context.close();
}
