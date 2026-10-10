import { SCHEMA_VERSION } from './schema';
export function migrateSettings(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Backup must be a settings object.');
  let settings = structuredClone(raw) as Record<string, unknown>;
  let version = settings.schemaVersion ?? 0;
  // Version 0 is the unversioned development format. Missing fields receive defaults during validation.
  if (version === 0) {
    settings = { ...settings, schemaVersion: 1 };
    version = 1;
  }
  if (version === 1) {
    settings = { ...settings, schemaVersion: 2 };
    version = 2;
  }
  if (version === 2) {
    settings = { ...settings, schemaVersion: 3 };
    version = 3;
  }
  if (version === 3) {
    if (Array.isArray(settings.profiles))
      for (const profile of settings.profiles) {
        if (profile && typeof profile === 'object' && profile.music?.repeat === 'off')
          profile.music.repeat = 'all';
      }
    settings.schemaVersion = 4;
    version = 4;
  }
  if (version === 4) {
    const integrations = settings.integrations as Record<string, unknown> | undefined;
    if (integrations?.spotifySource === 'desktop') {
      integrations.spotifySource = 'web';
      integrations.spotify = false;
    }
    if (integrations?.spectrum === 'native-cava') integrations.spectrum = 'cava';
    settings.schemaVersion = 5;
    version = 5;
  }
  if (version === 5) {
    settings.schemaVersion = 6;
    version = 6;
  }
  if (version !== SCHEMA_VERSION) throw new Error(`Unsupported backup version: ${String(version)}`);
  return settings;
}
