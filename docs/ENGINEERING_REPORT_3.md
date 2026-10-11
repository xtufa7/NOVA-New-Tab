# NØVA 3.0.0 — Engineering report

2026-10-11 · local branch `dev/nova-3.0` · upstream baseline `2726e59` (1.5.6). This is a review release with packaged builds, not a Store acceptance claim. No remote push, automatic publication or signing was performed.

## A. Implemented features

**Website appearance:** smart computed-style analysis, effective transparent backgrounds, light/dark/mixed classification, perceptual surface mapping, distinct surfaces, contrast-target text, semantic tint preservation, borders, links, gradients, shadows, highlights and selection. Smart, Force, Dark-only, Original and Custom modes; intensity, saturation and contrast controls. Per-domain rules include priorities, subdomains, inherited/explicit palettes, tokens, preserve selectors and separate validated CSS. Optional origins gate injection and configuration; disable restores owned changes.

**Protection and lifecycle:** images, videos, audio, canvas/SVG charts, embedded documents, editors/contenteditable and sensitive forms remain protected. Bounded mutation work supports SPA insertions and observed open shadow roots; independently authorized frames receive their own isolated instance. Hidden documents pause queued work. Cleanup restores snapshots without overwriting later website-owned property edits.

**Inspector:** highlight/select, unique selector generation, match count, original/current colors, contrast, token and rule context, live preview, undo/redo, save/preserve/reset and clean Escape/close. Preview freezing prevents the engine from fighting manual edits; commit restores transient styles before recording persistent configuration. Unsafe or cross-shadow persistence is refused with a warning.

**Marketplace and tokens:** 14 offline palettes, including official Mocha/Latte, Deep Purple, Soft Dark and legacy palettes; category/search/detail/preview, separate New Tab/website application, duplicate/create/edit/delete custom palettes and bounded JSON import/export. New Tab custom colors remain intact unless an adaptive rule explicitly selects a palette. No remote executable themes.

**Tab Manager:** favicon/title search, switch, pin, mute, close, reopen, duplicate, drag/reorder, sort, duplicate cleanup, discard, native Chromium groups where authorized, profile/workspace assignments and saved windows/sessions. Width, compact rows, collapse and minimal controls. Full-page manager, sidePanel/sidebar feature detection and useful fallback. Explicit active-tab screenshots are session-only and capped at eight; no automatic screenshot capture.

**Commands:** shared typed registry and modal, fuzzy search, keyboard navigation, categories, favorites/recent actions, tabs/profiles/themes/settings/sessions/music/floating/Focus. Terminal aliases route into the same worker. Website shortcuts are separately opt-in.

**Adaptive and Focus:** local time/overnight schedules, system preference, active profile/workspace rules, priority, one-hour manual override and Resume. One-shot browser alarms target boundaries; lifecycle events refresh after wake. Per-site safe distraction picking, reversible selector rules, reading width and reduced motion presets protect controls, forms and security dialogs.

**Workspace and continuity:** five opening styles and full timing/easing controls, independent header/clock/terminal/widgets/background targets, visibility/paint sequencing and late-widget/media readiness. Existing lyric typography/letter and Arabic word motion, tab identity, repeat/fading, PiP, Spotify, native scripts, tracker controls and full media backups remain. Schema 7 migration and transactional configuration validation preserve existing data.

## B. Architecture

One validated configuration and token vocabulary connect extension pages, worker commands and isolated website code. The worker owns grants, rule resolution, tab actions, registration and alarms. Content instances receive only current-site styling configuration and shortcuts. Closed-shadow overlays isolate inspector/palette UI. Color analysis and reversible property application are separated from domain rules, import validation and the existing New Tab appearance layer.

See [architecture](ARCHITECTURE_3.md) and [engine guide](THEME_ENGINE_3.md). No additional runtime framework or third-party remote script was introduced.

## C. Key files

| Area | Files |
| --- | --- |
| Theme model and color math | `src/themes/tokens.ts`, `src/themes/legacy.ts`, `src/website/model.ts`, `color.ts` |
| Website lifecycle and inspector | `src/website/engine.ts`, `content.ts`, `inspector.ts`, `overlay.ts` |
| Worker / registry / manager | `src/productivity/worker.ts`, `src/commands/registry.ts`, `palette.ts`, `src/tabs/manager.ts`, `manager.html` |
| Unified controls | `src/settings/sections/suite.ts`, `control.ts`, `page.ts`, `src/floating/popup.ts`, `src/newtab/style.css` |
| Settings / migrations | `src/settings/schema.ts`, `migrations.ts`, `src/storage/settings.ts` |
| Opening and wallpaper | `src/newtab/entrance.ts`, `index.ts`, `appearance.ts`, `src/settings/sections/performance.ts` |
| Integration / build | `src/background/index.ts`, `src/terminal/parser.ts`, `index.ts`, `manifest.json`, `vite.config.ts` |
| Verification | `tests/suite.test.ts`, `browser-v3.ts`, `browser-gecko.mjs`, existing regression suites |
| Media / delivery | `scripts/record-demos.mjs`, `verify-demos.mjs`, `benchmark.mjs`, `package-release.mjs`, `verify-release.mjs`, `publish-github.ps1` |

Source and tests omitted from the published 1.5.6 repository were restored in a separate preparatory commit before the major change. Previous output folders and the obsolete local helper remain on disk; the helper is excluded from this source/release upload.

## D. Opening animation fix

The audited 1.5.6 implementation already used Web Animations, but its automatic sequence started in initialization without a visible paint barrier. It could run while loading/hidden, before wallpaper readiness, and miss delayed widgets. Direct navigation tests did not sufficiently exercise native New Tab creation. A target-filter error also coupled header animation to the widget toggle.

The new sequence waits for visibility and two frame opportunities (250 ms stalled-clock fallback), rechecks visibility, creates backwards-fill effects before removing the loading curtain, and records the opening mark. A generation cancels stale work; one automatic run is allowed, with explicit Replay separate. Wallpaper waits for ready/decode/first-frame or a bounded fallback. Late widgets join once for 2.5 seconds. Pagehide cancels effects/observers; a 4-second failsafe prevents a stuck hidden workspace. Low Power and optional system reduced-motion still pause intentionally. Independent clock/terminal/header choices are migrated and tested.

Helium/Chromium tests inspect real animation keyframes and changing computed blur/translation in live lyric and opening nodes. New 3.0 tests create actual native New Tabs using `chrome.tabs.create` with no URL, test all five styles and independent targets, and capture [start](images/suite/opening-start.png), [middle](images/suite/opening-middle.png) and [end](images/suite/opening-end.png). Settings changes do not replay the sequence. Firefox uses native BrowserCommands; Zen uses that command with its resolved New Tab URL because its ordinary command opens an address-bar UI. Both report opening=true on the extension page.

## E. GitHub demonstration media

The original 4K wallpaper is only 0.6 seconds/18 frames at 30 fps, so its hard loop seam can be visible. The old primary GIF was 10 fps and approximately 942 KB; that is a poorer playback preview than video. No evidence established a GitHub-specific decoding defect.

The original wallpaper is preserved byte-for-byte. A fresh actual Helium recording restores the supplied visual backup through the production Backup UI in a disposable profile. The recording verifies moving video currentTime and native New Tab creation. Personal backups/history/music are excluded from publication.

| Asset | Result |
| --- | --- |
| Full demo MP4 | 1280×720, H.264, yuv420p, 25 fps, 10 s, 250 frames, 627,803 bytes |
| Startup MP4 | Same encoding, 4 s, 100 frames, 301,860 bytes |
| Primary static PNG | 165,352 bytes, linked to MP4 |
| Secondary GIF | 480 px, 10 fps, 128-color optimized palette, 759,099 bytes |
| Original wallpaper | 3840×2160 H.264/yuv420p, 30 fps, 0.6 s, 1,111,059 bytes |

Encoding uses libx264 slow/CRF18, yuv420p, faststart and native 25 fps timestamps; no fabricated interpolation or audio. FFprobe/FFmpeg validate dimensions, duration, codec, pixel format, complete decoding, timestamp order/40 ms steps, faststart placement and repeated frame hashes. Both new MP4s have no consecutive identical downscaled frames. [Demo details](DEMOS.md). Published GitHub rendering remains untested because no upload occurred.

## F. Performance

<!-- PERFORMANCE_START -->
Same Windows machine, headless Helium, five actual browser-created tabs per build, identical clean local settings and blocked external requests. Medians are measured observations, not a statistical guarantee.

| Metric | 1.5.6 | 3.0.0 |
| --- | ---: | ---: |
| New Tab ready | 276.9 ms | 273.5 ms |
| New Tab JS heap | 5,395,200 bytes | 6,050,720 bytes |
| Idle task CPU over 500 ms | 2.672 ms | 2.593 ms |
| Uncompressed Store package | 450,439 bytes | 539,942 bytes |

Ready-time difference: -3.4 ms (-1.2%). Heap difference: 655,520 bytes. The added suite increases package size by 89,503 bytes. On the final 2,519-processed-element mixed fixture, economical mode used 90 slices and the largest measured slice was 11.3 ms. The 4 ms read budget is soft; grouped writes/layout can exceed it. Repeated runs varied (earlier ready medians included 111.1 / 116.0 ms and 260.8 / 317.5 ms), so small timing differences are not evidence of a meaningful speedup or slowdown. No hard universal timing or absence of all long tasks is asserted.
<!-- PERFORMANCE_END -->

An isolated production-code fixture with optional tabs pregranted and 25 lightweight blank tabs produced the observations below. Page-ready readings include navigation and automation observation overhead; they do not measure native browser toolbar/sidebar painting. Search timings are synchronous handlers; the manager's asynchronous browser query/render completion was not separately timed.

| Suite observation | Result |
| --- | ---: |
| Manager page ready, 28 rows | 641.0 ms |
| Manager search handler | 4.1 ms |
| Popup page ready | 259.4 ms |
| Keyboard palette open and first result observed | 82.6 ms |
| Palette search handler and synchronous list update | 1.6 ms |
| Node-side fuzzy search, 1,000 tabs, 30 samples | 0.68 ms median / 4.93 ms maximum |

Raw paint/opening samples are in `performance-v3.json`; the ready-time sampling point precedes some opening marks and first paints. Animation correctness is established by the separate actual-New-Tab style/visibility tests and staged screenshots, not inferred from missing benchmark marks. Mutation observer overhead was not isolated from processing/layout: slice and idle measurements are the available combined evidence. `suite-performance.json` records the additional UI observations.

The website engine uses soft read budgets of 8 ms balanced / 4 ms economical, then grouped writes; these are scheduling targets, not a hard bound on style/layout cost. Queues and batch sizes are bounded, and processing pauses when hidden. Large-fixture slice metrics are included in `v3-report.json`. No universal website benchmark or claim of zero possible long tasks is made. Optional modules are dynamically loaded where possible; no engine/marketplace polling runs continuously. Tab manager listens to browser events with a short debounce, and schedules use browser alarms.

## G. Compatibility

[Compatibility matrix](COMPATIBILITY_3.md) covers actual tested versions and API fallbacks. Store/Private packages use the Chromium worker/offscreen path; Gecko uses a module background page and dedicated audio tab. Firefox/Zen omit unsupported Chromium permissions and provide a native sidebar/full manager page. Native groups and live tab capture remain Chromium-specific. ImageDecoder, H.264, heap and PiP support depend on browser capabilities.

## H. Tests and evidence

- Strict TypeScript and 25 unit tests: schema migration/default isolation, validation/roundtrip, domain boundary/priority, palette safety, color compositing/contrast, schedules/manual override, 1,000-tab bounded fuzzy search and existing music/settings tests.
- Store, Private and Firefox production builds and MV3 verifier.
- `test:preview`: non-extension Vite page, actual opening, Website Appearance settings, browser-action gating, zero unhandled errors. Explicit native CSS processing avoids parent-workspace PostCSS discovery; the manifest plugin is build-only.
- `test:v3`: five actual New Tab styles, no settings replay, keyboard palette, multiple website surfaces/gradients, media/editor/auth protection, open shadow roots, SPA insertions, Focus restoration, real inspector preview/undo/redo/save/reset restoration, manager search/duplicate and native pin/mute/move/group/workspace/session/close/reopen actions, economical 2,500-node fixture.
- `test:v156`: actual live blur/rise, English letters, Arabic shaping/stagger, typography, six preview modes, title controls, low-power/system preference and rapid-save regression in Helium and Chromium 141.
- `test:browser`, `test:features`, `test:v14`, `test:v15`: layout/settings/search/storage/session/audio; repeat/LRC/Google Fonts/sidebar/PiP; actual media full-backup restore/corruption; native host connection/disconnection/browser restart and settings gallery.
- `test:spotify`: automatic DOM reader/LRCLIB fixture, terminal lyrics effects, reconnect without Firefox-only permission fields, preserved explicit opt-out.
- `test:gecko`: Firefox 157.0.1 and Zen 1.23.2b, native New Tab opening, website mapping/protected canvas, tab-manager backend, settings, actual WAV/audio-tab stop, actual Native Messaging connection.
- Bootstrap / setup / native-installer tests: Windows PowerShell 5.1 and PowerShell 7, Unicode/spaced paths, exact extension origins, all-browser discovery, safe ZIP extraction, stable update and isolated registration cleanup.
- Mozilla lint: zero errors/notices and nine guarded Chromium-API warnings (sidePanel/offscreen/tabCapture/windows bounds); supported Gecko fallbacks ran successfully.
- Production standalone settings/gallery capture checks verify viewport bounds and section navigation at 1440×1000 and 400×800. The initial screenshot attempt found a wrapper sizing defect that put the sidebar outside the viewport; a bounded wrapper fixes desktop and mobile access.
- Demo validation, measured baseline comparison, archive/version/link/hash/private-data exclusion verification.

Failures observed during development were not hidden: the first Spotify fixture navigation was interrupted by initial blank-page navigation and was replaced with a browser-created tab; a missing Playwright executable was resolved by selecting the installed test browser. Firefox rejected port-bearing permission patterns; product checks now use host patterns. Initial Zen New Tab assertions targeted its URL-bar behavior or assumed handle ordering; the test now tracks the newly created handle and uses the browser's resolved New Tab URL. Type errors in new test storage reads were fixed before successful builds. Final preview review found unguarded browser API reads outside the extension; guards and asynchronous action errors now keep the preview usable. Its CSS request initially stalled during parent-workspace PostCSS discovery; an explicit empty pipeline fixed loading, and the manifest plugin now applies only to builds. These failed attempts precede the passing release checks.

Reports and screenshots are copied into the versioned release. Live Spotify catalog coverage, every website redesign, every native sidebar's browser chrome and every host-revocation UI path are not certified by fixture tests.

## I. Remaining limitations

**Browser/platform boundaries:** restricted browser/store pages, closed shadow roots, inaccessible native controls, pixels inside video/canvas and ungranted cross-origin frames cannot be recolored. A whole interactive web window cannot be guaranteed always-on-top; native video PiP is the supported path. Permanent Gecko installs require signing. Browser permission prompts require consent. The optional desktop bridge is Windows-only, and OS media metadata does not provide guaranteed word timings. Line-timed lyrics estimate words; missing lyrics stay empty.

**Practical engine limits:** preserved editors/charts/media may keep their original colors. Structural selectors can break after a site redesign. Newly attached open shadows are discovered through observed DOM or interaction; closed-root interception is deliberately absent. Custom CSS is an advanced explicit override and can change layout. Tab IDs are session-specific; workspace assignments alone are not a durable session-restoration format. Timezone changes apply on the next lifecycle refresh. Arbitrary remote marketplace packages are deliberately unsupported; local palettes and safe JSON are complete.

**Verification scope:** Linux/macOS and every Chromium derivative were not independently executed. Broad live-site coverage, browser permission-revocation dialogs and published GitHub playback need further practical review; these are coverage limits, not missing implementations of the listed modules. No unresolved failed release check is silently treated as a pass. Store review/signing remains an external step.

## J. Release status

Version **3.0.0**, settings schema **7**, Store/Private/Firefox builds, browser-named ZIP/XPI packages, optional Windows package, GitHub-ready source/docs/media bundle and SHA256 manifest. Older output versions and user media remain untouched. [Migration](MIGRATION_3.md), [privacy](PRIVACY_POLICY.md), [Store guide](STORE_PUBLISH_AR.md) and [Setup/review script](SETUP_AR.md) are included.

The local `dev/nova-3.0` branch is prepared for review. No push to main, remote release, Store upload or signature was performed. The publisher script defaults to the review branch and refuses main/master; an optional draft remains unpublished. Main's Raw setup link keeps fetching main until you review and merge the new version.
