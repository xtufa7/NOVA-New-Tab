# NØVA 3.0.0 — QA

Windows verification, 2026-10-11, disposable profiles and isolated native host registrations.

- Production standalone settings verified section navigation and viewport bounds on desktop/mobile; actual adaptive/focus/commands/tabs screenshots are included.
- Non-extension Vite preview passed opening, settings and browser-action gating with no unhandled errors. Native CSS uses an explicit empty PostCSS pipeline; the manifest plugin runs only during builds.
- Strict TypeScript, 25 unit tests, Store/Private/Firefox production builds and MV3 verification passed. Schema 7 preserves existing configuration/media and validates suite imports.
- New suite browser tests passed actual browser-created New Tabs, all five opening styles, independent targets, no settings replay, palette keyboard interaction, perceptual website surfaces, gradients/transparency, protected media/editors/forms, open shadows, SPA mutations, reversible Focus, real Inspector preview/undo/redo/save and exact restoration. Manager actions include pin/mute/move/native group/workspace/session save/close/reopen.
- Helium and Chromium 141 passed actual live lyric blur/rise, letters/Arabic word motion, typography, tab identity, preview changes, low-power/system preference and rapid-save checks.
- Core/feature/v14/v15 suites passed layout/search/storage/sessions/offscreen audio, repeat, local LRC/Google Fonts, sidebar/PiP, real GIF/PNG/WAV/WebM backup restoration, corruption rejection, native video move/control/restore, PowerShell connect/disconnect and automatic browser restart.
- Automatic Spotify Web reader and lyrics passed controlled DOM/LRCLIB fixtures, including reconnect without data_collection and preserved opt-out.
- Firefox 157.0.1 and Zen 1.23.2b passed native New Tab page opening, website mapping/protected canvas, manager backend, settings, actual WAV playback/audio-tab cleanup and Windows Native Messaging. Zen's native test supplies the browser-resolved New Tab URL; its default command opens its address bar.
- Mozilla lint: zero errors/notices, nine guarded Chromium API warnings. Gecko uses audio-tab/sidebar/full-page fallbacks.
- Setup/bootstrap/native installer passed Windows PowerShell 5.1/7, all-browser discovery, exact origin registration, Unicode/spaced paths, archive layout/traversal rejection, stable updates and cleanup. No permanent user registration changed.
- Actual Helium demos were decoded and timestamp/codec/faststart checked. Static PNG is the primary README preview; GitHub publication was not performed.
- Before/after benchmark, large-page slice metrics and isolated manager/popup/palette response observations are included in release reports. Manager search timing measures its synchronous handler, not completion of asynchronous tab refresh.

[Engineering report A–J](docs/ENGINEERING_REPORT_3.md) · [Compatibility](docs/COMPATIBILITY_3.md) · [Migration](docs/MIGRATION_3.md).

Reports in the versioned output: v3-report.json, v156-report.json, v156-chromium-report.json, browser-report.json, v14-report.json, v15-report.json, gecko-report.json, firefox-lint.json, spotify-auto-report.json, bootstrap-report.json, installer-report.json, setup-report.json, performance-v3.json, suite-performance.json, demo-media-report.json and demo-recording-report.json. SHA256SUMS.txt covers packaged files.

Coverage limits: controlled website/Spotify fixtures do not certify every live site or song. Every native panel's browser chrome and permission-revocation dialog were not individually exercised. Linux/macOS and all Chromium derivatives were not independently tested. Closed shadows/restricted pages/ungranted frames, canvas/video pixels, native whole-window OS pinning and unsigned permanent Gecko installs have browser/platform limits. Lyrics from line timestamps estimate words; exact timing requires enhanced LRC. Structural selectors can change. No Store upload, signing, GitHub push or published-media rendering verification occurred. Initial failed development attempts and their fixes are documented in the engineering report.
