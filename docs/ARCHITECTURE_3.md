# NØVA 3.0 architecture

NØVA shares one validated settings store, profile model and token vocabulary across its New Tab, Control Center, browser toolbar, website overlays and tab manager. Website access is optional; disabling it leaves the existing workspace usable.

## Data and migrations

`src/settings/schema.ts` defines schema 7. `migrations.ts` upgrades earlier configurations without replacing profiles or media IDs. `src/website/model.ts` owns suite defaults, domain precedence, schedule selection and bounded validation. `src/storage/settings.ts` clones before applying a mutation, validates before replacing live state and serializes writes. Worker mutations read fresh storage through a separate serialized queue. Full `.nova` backups retain the suite configuration along with existing media; theme-only imports contain validated color data, never code.

## Appearance pipeline

`src/themes/tokens.ts` supplies shared palettes and typed semantic tokens. `src/productivity/worker.ts` resolves the active profile, adaptive/manual choice, domain rule and granted origin into a minimal page configuration. Other profiles, browsing history and unrelated site rules are not sent to the page. `syncWebsite` registers the bundled isolated-world `website.js` only for permitted HTTP/HTTPS origins and refreshes existing pages. Permission removal makes existing instances restore their changes.

`src/website/content.ts` manages one engine and a closed-shadow overlay per frame. `color.ts` parses, composites and maps colors. `engine.ts` walks eligible elements, reads computed styles in bounded batches, then writes only properties it owns. Inline snapshots preserve priorities and original absence of the style attribute. Removal restores a property only when it still equals NØVA's normalized last write, so later application changes are retained. Mutation queues, visibility handling and bounded open-shadow discovery support SPAs without continuous polling.

`inspector.ts` freezes the selected element during preview, shows original/current colors and contrast, generates a unique selector where possible, and restores preview state before committing a rule. Local undo/redo operates on preview edits. Focus picking uses the same selector and preservation guards; it stores rules separately from website CSS.

## Productivity

`src/commands/registry.ts` describes typed actions for tabs, saved sessions, profiles, themes, settings, music and floating tools. The shared `palette.ts` renders a keyboard-accessible dialog in the extension or page overlay. Website shortcuts require opt-in and do not replace ordinary website typing. Terminal commands invoke the same worker actions.

`src/tabs/manager.ts` is a real extension page used in Chrome's side panel, Firefox's sidebar and a full-page fallback. Its worker actions invoke browser tabs/groups/sessions APIs; it does not impersonate or modify the native tab strip. Workspace assignment is local metadata. Session restoration requires optional sessions access. Screenshots are requested explicitly and retained only in bounded session storage.

## Lifecycle

`src/newtab/entrance.ts` owns the automatic one-time opening sequence and explicit replay. It waits for visibility and a paint opportunity, arms backwards-fill effects before revealing the page, includes late widgets for a bounded period, and cleans animations on page hide. A 250 ms paint fallback prevents a stalled frame clock from blocking the sequence; a separate 4 s curtain failsafe keeps the workspace accessible.

`src/newtab/appearance.ts` owns wallpaper readiness, video playback and object URLs. Generation guards reject stale async work; hidden tabs pause video; page hide releases resources and BFCache restoration rebuilds them. Adaptive rules use browser alarms at the next local time boundary, plus profile/system/visibility events; they do not keep a service worker alive with a timer.

## Builds

Vite builds Store, Private and Firefox packages. Esbuild bundles the website entry as an IIFE for isolated content-script execution. Firefox replaces service-worker/offscreen/sidePanel assumptions with its module background page, audio tab and sidebar. Native Messaging remains a separate, optional Windows package. No new runtime framework or remote JavaScript dependency was introduced for 3.0.

The local Vite UI preview gates extension-only actions and does not write production manifests on shutdown. Native CSS has an explicit empty PostCSS pipeline to avoid inheriting unrelated parent-workspace configuration.
