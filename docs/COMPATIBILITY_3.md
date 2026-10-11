# NØVA 3.0 compatibility

| Feature | Chromium / Helium | Firefox / Zen |
| --- | --- | --- |
| New Tab, profiles, terminal, backups, local images/video/fonts | Supported; codec dependent | Supported; codec dependent |
| Website appearance, inspector, open shadows, Focus | Granted HTTP/HTTPS origins | Granted HTTP/HTTPS origins; match patterns omit ports |
| Tab Manager | Full page or native side panel when available | Full page or browser sidebar |
| Native tab groups | Optional tabGroups, feature detected | Workspace metadata fallback; no Chromium group API |
| Reopen closed tabs | Optional sessions | Optional sessions |
| Command palette | New Tab; opt-in website overlay | Same |
| Adaptive schedules | Browser alarms and lifecycle events | Same |
| Local music | Offscreen extension document | Dedicated extension audio tab; keep it open |
| Desktop Spotify | Optional Windows Native Messaging registration | Same Windows registration; Gecko extension ID |
| Pin video | Document PiP where supported | Browser's video PiP fallback |
| Tab capture live preview | Optional tabCapture | Unavailable; interactive window fallback |
| GIF tab icon | Animated with ImageDecoder | Static fallback where ImageDecoder is absent |
| Memory indicator | New Tab heap where exposed | Unavailable when heap API is absent |

Actual Windows verification used Helium, Chromium 141, Firefox 157.0.1 and Zen 1.23.2b in disposable profiles. Edge, Brave, Vivaldi, Opera and Opera GX packages share the Chromium build; their names do not imply independent execution tests. Chrome Store and Mozilla signing/submission have not been performed. Linux/macOS share extension code but were not tested here; the optional PowerShell bridge is Windows-only.

Zen's default New Tab command can open its URL bar without creating a tab. The tested browser-native path passes the browser-resolved New Tab URL to BrowserCommands, creating the overridden extension page. NØVA cannot animate a browser URL bar where its page has not loaded. Firefox's test uses the ordinary native New Tab command.

Host grants cannot bypass internal browser pages, store restrictions, missing cross-origin frame access or closed shadow roots. Automatic recoloring preserves image/video/canvas/SVG content and sensitive editing surfaces. Side panel/sidebar opening can require a user gesture; the full manager page remains available when native opening is rejected. Real page manager UI and Gecko backend actions were tested; every native panel's browser chrome was not independently exercised.

Permanent Firefox/Zen installation requires a signed XPI. Optional permissions are requested from actual browser gestures; NØVA cannot silently grant them. No extension API guarantees pinning a whole interactive browser window above all desktop applications. Native PiP is the supported pinned-video path.

Primary API references: [Chrome sidePanel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [Chrome tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs), [Mozilla sidebarAction](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction), [Mozilla match patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns), [Mozilla signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).
