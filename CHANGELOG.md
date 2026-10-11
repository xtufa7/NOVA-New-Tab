# 3.0.0

A major browser suite release, retaining the New Tab, terminal, profiles, music, lyrics, backups, privacy and floating tools.

- Shared semantic tokens and reversible website appearance with modes, contrast, domain priority, protection rules and separate CSS.
- Live Theme Inspector with original/current comparison, preview, undo/redo and saved element rules.
- Offline 14-palette marketplace and validated custom theme JSON.
- Real Tab Manager with groups where supported, sessions, workspaces, sorting, duplicates and discard.
- Typed command palette with fuzzy search, keyboard navigation, favorites and recent commands.
- Adaptive local schedules, system/profile rules, manual override and per-site Focus.
- Opening sequencing waits for visible paint, arms effects before reveal, handles media and late widgets, and exposes separate clock/terminal targets.
- Transactional settings changes, schema 7 migration, full backup compatibility and wallpaper resource cleanup.
- Fresh actual browser screenshots and stable-timestamp H.264 demos, with static README thumbnail.

Website access remains optional. Store/Private/Firefox builds are version 3.0.0. Prior releases and user media remain untouched. Review branch only; no remote publication. [Engineering report](docs/ENGINEERING_REPORT_3.md).

# 1.5.6

- Replaced live lyric/opening CSS motion with browser Web Animations so general page Animations no longer suppress configured effects.
- Added independent Arabic/English lyric fonts, color, typography, letter/word motion, timing, rise and blur controls.
- Added five entrance styles, target toggles, detailed timing/easing controls, previews, replay and pause diagnostics.
- Kept Arabic shaping and stable word DOM; deferred entrance for background tabs.
- Fixed tab title and GIF icon being suppressed by unrelated general page animation settings.
- Fixed rapid edits returning to the original value being lost when an older save acknowledgement arrives.
- Added actual Helium/Chromium live-motion regression tests, updated screenshots and recordings.

# 1.5.5

- Added a staggered entrance for the header, background and enabled widgets on each new tab; settings edits do not replay it.
- Arabic lyric words enter from the left and move existing words right, with stable word nodes and no translation.
- Applied the selected lyric animation to the active music-player line as well as the search terminal and Lyrics widget.
- Added actual Helium video wallpaper recordings, animated README preview and the original backup-verified wallpaper MP4.
- Preserved configuration imports and previous release folders; motion settings remain respected.

# 1.5.4

- Added Rise + Blur, including terminal words and the containing lyric line.
- Fixed reduced performance mode suppressing all lyric word animations; it now shortens them while off/system reduced motion remains honored.
- Animation selection updates existing lyric words immediately without rebuilding the line every tick.
- Added standalone Windows GitHub Setup with browser detection, build selection, stable update folders, optional bridge registration and installation instructions.
- Publishing prepares a GitHub Release with browser assets and can install Git/GitHub CLI via WinGet.

# 1.5.3

- Fixed Chromium derivatives exposing a browser namespace being misidentified as Firefox.
- Removed Firefox-only data_collection fields from runtime requests; Firefox declares consent at installation.
- Spotify Web and online lyrics activate automatically, with narrowly required Spotify/LRCLIB hosts. Existing installs receive setup once, and later opt-outs stay saved.
- Real unmodified Chromium build regression test covers automatic lyrics and the browser alias.

# 1.5.2

- Standalone Raw bootstrap with a stable local-app-data path; removed the nonexistent C:\NOVA command from settings.
- Separate install/uninstall copy controls; ten-browser registration and Windows version checks.
- Distinct animation previews, immediate replay, preview motion independent of page performance mode.
- GitHub publication script for xtufa7/NOVA-New-Tab; source, builds, guides and image gallery included.

# 1.5.1 · 2026-10-07

- Unified Windows setup: setup.cmd discovers installed NØVA IDs and registers supported browser families together. All browsers are listed in Music, with all as default.
- Fixed preview closure on animation selection and aligned outgoing preview text. Existing settings groups retain their open state after edits.
- English-only integration UI; only the Warning label uses red. Simplified automatic-start setup instructions.
- Redesigned workspace cards with inline rename and clear active state; organized privacy groups with live permission status and descriptions.

# 1.5.0 · 2026-10-07

- Removed the two Guns avatar action buttons from About; retained cached avatars and backups.
- Added five lyrics animation modes and a live preview. Reveals reuse existing line/word nodes; Spotify timeline smoothing avoids second-resolution backward jitter.
- Optional Windows PowerShell Native Messaging bridge reads Spotify desktop metadata. Manual per-user registration; browser startup when enabled; disconnect on disable. Red external-process warning and official developer link in settings.
- Added a genuine Firefox/Zen background-module build with a dedicated audio tab and honest PiP/capture fallbacks.
- Browser-specific ZIPs, unsigned Gecko XPIs, a separate PowerShell ZIP, full illustrated GitHub source bundle, and store/signing guides.

# 1.1.0 — 2026-10-06

## 1.4.0 — 2026-10-07

- Animated Spotify words replace the idle input placeholder; interacting restores the prompt and moves lyrics to a draggable widget between clock and greeting.
- Exact enhanced-LRC words and estimated word reveal for line-timed lyrics; adjustable timing offset.
- Browser tab title/typewriter/scroll customization and local animated GIF favicon with the supplied UI reference image.
- Full portable `.nova` backup includes referenced local video, audio, covers, fonts, favicon and avatars; hash validation precedes any restore mutation. JSON and older schema imports remain supported.
- Extension-only direct video PiP with real playback controls and restoration; removed runtime dependency on the Windows helper. Spotify now uses its browser version, and memory is labeled as page JavaScript heap.
- Creator links reduced to GitHub and Guns.lol with cached public photos and optional avatar following on public profile visits.
- Mobile terminal overlay sizing fixed; image-rich README and GitHub upload bundle prepared.


- Ten palettes, six clock faces, six local font stacks, editable clock caption and saved custom themes.
- Compact theme gallery, collapsible appearance controls, clearer settings navigation and shorter copy.
- Automatic 750 ms music fade/pause when other tabs are audible, player hiding, checkpointed resume and manual-pause cancellation.
- Optional browser tracker blocking with curated local endpoint rules and domain exceptions.
- Floating-preview pin/unpin controls; three browser shortcuts with a shortcut editor link.
- Version 2 settings migrate old backups and profiles without losing local media references.
- Removed the trailing dot from NØVA branding.

# 1.0.0 — 2026-10-06

## 1.4.0 — 2026-10-07

- Animated Spotify words replace the idle input placeholder; interacting restores the prompt and moves lyrics to a draggable widget between clock and greeting.
- Exact enhanced-LRC words and estimated word reveal for line-timed lyrics; adjustable timing offset.
- Browser tab title/typewriter/scroll customization and local animated GIF favicon with the supplied UI reference image.
- Full portable `.nova` backup includes referenced local video, audio, covers, fonts, favicon and avatars; hash validation precedes any restore mutation. JSON and older schema imports remain supported.
- Extension-only direct video PiP with real playback controls and restoration; removed runtime dependency on the Windows helper. Spotify now uses its browser version, and memory is labeled as page JavaScript heap.
- Creator links reduced to GitHub and Guns.lol with cached public photos and optional avatar following on public profile visits.
- Mobile terminal overlay sizing fixed; image-rich README and GitHub upload bundle prepared.


- Minimal dark New Tab with an instant terminal, themes, quick links, and optional credits.
- Local profiles, modular widgets, pointer/keyboard layout editing, and Control Center.
- Local media backgrounds and MP3 metadata; offscreen playlists and music controls.
- Explicit live tab capture + Document PiP controller; interactive popup and restore fallback.
- Optional tab/history access, pinned shelf, named sessions, validated JSON backups, and schema migration.
- Reduced-motion/low-power controls, event-driven worker, Store/Private production builds, and creator metadata.
- Core validation and actual Chromium integration tests.
