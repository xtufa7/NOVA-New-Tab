# Updating to NØVA 3.0

1. Export Backup → Full backup (media included).
2. Update the same unpacked folder or Store installation, preserving its extension ID.
3. Reload the extension and open a fresh New Tab. Settings migrate automatically to schema 7.
4. Website appearance starts disabled. Grant the domains you want and enable it in Website Appearance.

Existing profiles, custom colors, layouts, fonts, video/audio, icons, lyrics controls, terminal history and privacy preferences are retained. New suite settings receive independent defaults. Older opening configurations inherit their widget choice for the new separate clock/terminal controls. JSON imports are validated transactionally; rejected changes do not replace the live configuration. Full backups include suite rules and referenced local media that still exist.

A new extension ID has separate browser storage. Import your full backup when moving between IDs or browser families. JSON configuration exports contain media references only. Missing files cannot be reconstructed. Tab assignments refer to live browser tab IDs and may not identify the same tab after a fresh browser session; saved session/workspace opening provides a separate restoration path.

Downgrading is not automatic: 1.5.6 does not understand schema 7. Keep a pre-update backup if you need to revert. Prior release folders remain untouched; don't replace them with the 3.0 build.
