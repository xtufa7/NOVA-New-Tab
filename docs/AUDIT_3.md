# NØVA 3.0 — Repository audit and implementation roadmap

Baseline: upstream main 2726e59 (1.5.6), inspected 2026-10-11. Local branch: dev/nova-3.0. No remote mutation authorized.

Existing: MV3 worker, framework-free typed UI, 14 settings sections, schema 6 validation/reconciliation, IndexedDB media, full ZIP backups with hashes, themes/profiles, local audio/Spotify, companion, floating/PiP, Gecko build and native integration. Reuse these.

Findings:
- Published repository omits tests/scripts/native tooling. Restored local development files in a separate commit.
- Entrance is triggered in the initialization task without a paint barrier; hidden handling adds independent listeners and cannot track late elements. Background can decode after the sequence. Existing tests mostly navigate directly to extension HTML rather than actual New Tab creation.
- Website appearance/inspector/focus/tab-manager modules do not exist. Isolate content code from extension UI; no global inversion or CSS reset.
- Permissions are already optional for general hosts/tabs. Retain narrow Spotify/LRCLIB install hosts. Register website scripts only for explicitly granted origins and disable/restore existing injections immediately.
- Worker settings writes are spread across modules. New productivity actions use a serialized validated update queue; preserve current media and profiles.
- Scope New Tab CSS separately from website CSS; validate site domains, selectors, palette data and CSS network-bearing constructs.
- Existing local media object URLs are revoked on switches. Add pagehide cleanup and first-frame readiness separately from demo optimization.
- README GIF: 60 frames/6 seconds, 10 fps, ~942 KB. MP4: 25 fps, 1280×720, 10.96s, ~228 KB. Original wallpaper is only 0.6s/18 frames, 4K30. Inspect source frame changes and recording timing; retain originals and use a static preview as primary.

Order: schema 7 and tokens → website analysis/application + permission coordinator → inspector/focus → theme library/adaptive → manager/registry/palette/popup → actual-new-tab lifecycle and source-based demos → production/browser regressions → docs/reviewable 3.0.0 packages.

Budgets: website read-budget targets 8ms normal/4ms economical (soft, writes/style/layout can exceed these), bounded batch/observer queues and node limits with conservative fallback; no permanent polling. Palette search target <16ms/1000 items. New Tab baseline measured in work/browser-report.json; record current before/after rather than declaring an unmeasured budget.
