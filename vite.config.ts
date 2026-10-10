import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
  const gecko = mode === 'firefox';
  if (gecko) {
    manifest.background = { scripts: ['background.js'], type: 'module' };
    manifest.permissions = manifest.permissions.filter((p: string) => p !== 'offscreen');
    manifest.optional_permissions = manifest.optional_permissions.filter(
      (p: string) => p !== 'tabCapture',
    );
    delete manifest.minimum_chrome_version;
    manifest.browser_specific_settings = {
      gecko: {
        id: 'nova@xtufa7',
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['websiteContent'] },
      },
      gecko_android: { strict_min_version: '142.0' },
    };
  }
  let commit = 'unversioned';
  let timestamp = '2026-10-06T00:00:00.000Z';
  try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    timestamp = execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    /* Reproducible fallback for source archives. */
  }
  if (process.env.SOURCE_DATE_EPOCH)
    timestamp = new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString();
  const sourceHash = createHash('sha256').update(JSON.stringify(manifest) + commit + mode);
  function hashDirectory(path: string) {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name, 'en'),
    )) {
      const full = resolve(path, entry.name);
      if (entry.isDirectory()) hashDirectory(full);
      else {
        sourceHash.update(full.slice(process.cwd().length).replaceAll('\\', '/'));
        sourceHash.update(readFileSync(full));
      }
    }
  }
  hashDirectory('src');
  hashDirectory('public');
  for (const path of [
    'newtab.html',
    'settings.html',
    'offscreen.html',
    'popup.html',
    'floating.html',
    'package-lock.json',
    'vite.config.ts',
  ])
    sourceHash.update(readFileSync(path));
  const fingerprint = sourceHash.digest('hex').slice(0, 16);
  const outDir = gecko ? 'dist-firefox' : mode === 'private' ? 'dist-private' : 'dist';
  return {
    base: './',
    define: {
      __BUILD__: JSON.stringify({
        version: manifest.version,
        buildId: fingerprint,
        commit,
        timestamp,
        profile: mode,
      }),
    },
    build: {
      outDir,
      sourcemap: false,
      minify: 'esbuild',
      target: 'chrome116',
      rollupOptions: {
        input: {
          newtab: resolve('newtab.html'),
          settings: resolve('settings.html'),
          popup: resolve('popup.html'),
          offscreen: resolve('offscreen.html'),
          floating: resolve('floating.html'),
          background: resolve('src/background/index.ts'),
        },
        output: {
          entryFileNames: (chunk) =>
            chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
        },
      },
    },
    plugins: [
      {
        name: 'nova-manifest',
        closeBundle() {
          mkdirSync(outDir, { recursive: true });
          writeFileSync(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
          writeFileSync(
            resolve(outDir, 'build-info.json'),
            JSON.stringify(
              {
                version: manifest.version,
                buildId: fingerprint,
                commit,
                timestamp,
                profile: mode,
              },
              null,
              2,
            ),
          );
        },
      },
    ],
  };
});
