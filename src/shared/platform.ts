const geckoAPI = (globalThis as unknown as { browser?: typeof chrome }).browser;
// Chromium derivatives may expose a browser alias. That alone does not identify Firefox.
export function isGeckoAPI(api: unknown): boolean {
  const runtime = (api as { runtime?: { getBrowserInfo?: unknown; getManifest?: () => { browser_specific_settings?: { gecko?: unknown } } } } | undefined)?.runtime;
  return typeof runtime?.getBrowserInfo === 'function' && !!runtime.getManifest?.().browser_specific_settings?.gecko;
}
export const isGecko = isGeckoAPI(geckoAPI);
// Firefox's browser namespace provides the Promise API used throughout NØVA.
if (isGecko && geckoAPI) (globalThis as unknown as { chrome: typeof chrome }).chrome = geckoAPI;
