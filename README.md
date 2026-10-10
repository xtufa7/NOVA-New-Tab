# NØVA

![NØVA — Mocha workspace](docs/images/newtab.png)

A fast, customizable New Tab for **Chromium / Helium / Firefox / Zen**. Your clock, terminal, music and workspace in one place.

**Version 1.5.6** · Manifest V3 · TypeScript + Vite · Local media · Optional Windows PowerShell integration

<a href="https://github.com/xtufa7"><img src="public/accounts/github.png" width="42" height="42" alt="xtufa7 on GitHub"></a> <a href="https://guns.lol/xtufa7"><img src="public/accounts/guns.webp" width="42" height="42" alt="xtufa7 on Guns.lol"></a>

Created by [xtufa7](https://github.com/xtufa7) · [Guns.lol](https://guns.lol/xtufa7)

## Watch NØVA

[![Video wallpaper and opening animation](docs/demos/video-background-demo.gif)](docs/demos/video-background-demo.mp4)

[Video wallpaper demo · MP4](docs/demos/video-background-demo.mp4) · [Opening animation · MP4](docs/demos/startup-demo.mp4) · [Original wallpaper · MP4](docs/demos/background-original.mp4)

Recorded inside Helium using a full media backup restored through the extension's Backup screen. The original wallpaper video is included; the personal backup and music are excluded. [Video setup and demo details](docs/DEMOS.md).

The header, clock and enabled widgets enter in sequence when a new tab opens. Editing settings does not restart the workspace animation. Opening motion has its own enable switch, independent of general page Animations. Low Power and the optional system reduced-motion preference are respected.

## Install

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select `dist/`.
3. Open a New Tab and use the gear to customize it.

Load `dist`, which contains `manifest.json`, rather than the project root. To update an existing installation, replace its built files and press Reload while keeping its extension ID. Export a full backup before moving to a different installation.

**العربية:** حمّل مجلد `dist` من «تحميل إضافة غير مضغوطة». حدّث نفس التثبيت للحفاظ على بياناتك؛ النسخة الاحتياطية الكاملة تنقل الإعدادات والفيديو والأغاني معًا.

## What you can customize

- Eleven palettes, including purple Catppuccin Mocha; custom saved color themes.
- Local image/video wallpapers with visual previews, brightness, blur and playback controls.
- Six clock styles, letter spacing, small AM/PM, custom caption and uploaded/downloaded fonts.
- Drag, resize, hide and lock widgets; independent workspaces and quick links.
- Local music player, automatic repeat, synchronized LRC, CAVA-style visualizer and fade out/in when another tab plays audio.
- Animated tab titles and uploaded PNG, WebP, ICO or GIF favicon.
- Spotify Web lyrics inside the idle terminal; clicking or typing moves them between the clock and greeting.
- Browser sidebar, a small TikTok browser window, direct video PiP and optional tracker blocking.

![Tab title and icon — reference](public/help/tab-customization.png)

Open **Appearance → Browser tab · title & GIF icon**. Enter a title, choose typewriter/scroll animation, and upload an icon. GIF frames animate in supported browsers; title/icon animations pause in hidden tabs and Low Power Mode; their own switches control animation independently of general page Animations. Up to 90 GIF frames are used.

## Spotify lyrics

Play a song at `open.spotify.com`; Spotify Web and synchronized lyrics are enabled by default. If you previously disabled them, use **Music → Spotify & synchronized lyrics → Reconnect Spotify + enable lyrics**.

Idle terminal: `Tufa7@Spotify ~ ❯` followed by animated words. Click/type into the input to restore your normal prompt and search placeholder. Move the **Lyrics** widget in Layout to choose its position.

Enhanced LRC word timestamps give exact word timing. Ordinary synchronized lyrics usually contain line timestamps, so the word reveal is an estimate between lines. Missing lyrics remain empty. Timing offset is adjustable. Spotify Desktop on Windows can use the optional PowerShell bridge described below. Choose Rise, Rise + Blur, Fade, Blur, Typewriter or None in Music → Lyrics animation preview. Each new word animates without rebuilding previous words. Switching animation updates the open preview immediately.

Arabic lyrics stay in Arabic: each new word enters from the left and shifts earlier words to the right, preserving right-to-left reading order. The terminal and music player share the selected animation. No translation is performed.

### Lyrics typography and motion

![Lyrics typography settings](docs/images/gallery/lyrics-typography.png)

Open **Music → Lyrics typography & motion** to set Arabic/English font families, imported fonts, color, size, weight, English letter spacing and line height. Choose word or letter animation, duration, letter stagger, rise distance and blur strength. English letter mode uses graphemes; Arabic words stay joined so shaping remains correct. The preview uses the same engine and supports English and Arabic. Previously revealed words remain stable. Rapid changes are saved in order, including switching back while a previous save is still pending.

![Lyrics motion settings](docs/images/gallery/lyrics-motion.png)

### Opening animation

![Opening animation settings](docs/images/gallery/opening-animation.png)

Open **Performance → Opening animation**. Choose Rise + Blur, Rise, Fade, Zoom or Slide; customize duration, stagger, delay, distance, blur and easing. Choose header, widgets and wallpaper independently. Replay the inline preview or the real workspace. A status card explains whether motion is enabled or paused by Low Power/system preferences. General page Animations can remain off.

Animated tab titles also follow their own controls in **Appearance → Browser tab · title & GIF icon**.


## Spotify Desktop · Windows PowerShell

![PowerShell settings and warning](docs/images/desktop-bridge.png)

**Runs outside the extension. Download only from [the official developer](https://github.com/xtufa7).** Extract the separate `NOVA-1.5.6-Windows-PowerShell.zip` to a permanent folder. Run **native/setup.cmd** once to discover NØVA IDs and register supported browsers together. Enable Desktop bridge in each browser where you want it. For manual commands, open **Music → Spotify desktop**, use all or choose any browser, and replace `C:\NOVA` with your extracted path. Run the registration command once, then enable Desktop bridge. The browser launches `native/spotify-bridge.ps1` when it starts. Disabling the bridge disconnects and stops that process; the uninstall command removes your per-user browser registration. No administrator access, scheduled task, Python, executable helper or local HTTP server is needed.

The bundled `launch.cmd` starts Windows PowerShell 5.1. ExecutionPolicy Bypass applies only to that process; the installer does not change Windows policy. Windows media sessions supply Spotify title, artist, duration, position and play/pause state. Audio and screen content are not captured. Online lyrics is enabled by default and can be disabled in Music. Spotify Web remains the default source.

[Detailed setup and removal](docs/WINDOWS_SPOTIFY_AR.md).

## Other browsers

| Browser family | Package | Installation / differences |
| --- | --- | --- |
| Chrome, Helium, Edge, Brave, Vivaldi, Opera | Browser-named Chromium ZIP | Extract → Load unpacked. Shared Chromium build. |
| Firefox, Zen | Firefox/Zen ZIP or unsigned XPI | `about:debugging` → This Firefox → Load Temporary Add-on → manifest.json. Sign through Mozilla for permanent installation. |

Firefox/Zen use a module background page instead of a Chromium service worker, and a dedicated **NØVA audio tab** instead of Offscreen. Keep the audio tab open. Live tabCapture preview is unavailable; interactive windows and the browser's built-in video PiP are the available paths. Memory reports unavailable when this browser does not expose page heap. GIF favicons fall back to a static image when ImageDecoder is unavailable. Firefox desktop minimum: 140.

[Browser installation and signing guide](docs/BROWSERS_AR.md) · [Chrome Store upload guide](docs/STORE_PUBLISH_AR.md).

## Visual tour

![Lyrics animation preview](docs/images/animation-preview.png)

![Lyrics in the terminal](docs/images/lyrics-terminal.png)

![Lyrics placed in the layout](docs/images/lyrics-layout.png)

## Pin video above applications

On a page playing video, click the NØVA toolbar button → **Pin video directly**, then click the page's **📌 Pin video above apps** button. TikTok mini windows get this button when Browser Companion is enabled.

The extension moves the actual video into the browser's [Document Picture-in-Picture window](https://developer.chrome.com/docs/web-platform/document-picture-in-picture), with playback/mute/unpin controls, and restores it on close. Keep its source tab open. Website controls and feed navigation remain in the source page. Browser support, protected media, embedded players and site rerenders can limit the feature. A normal interactive browser popup has no guaranteed OS pin; the separate live-preview mode is available through tab capture.

## Portable backups

**Backup → Export full backup · media included** downloads `NOVA-full-backup.nova`.

| Full `.nova` archive | JSON configuration |
| --- | --- |
| Settings + video/image backgrounds + audio/covers + font files + tab icon + cached avatars | Settings and media references only |
| SHA-256 checks for each media file; corruption rejected before changes | Strict settings validation |
| Fresh media IDs on restore; original files retained until cleanup | Supports older configuration versions 1–5 |
| Up to 512 MB of local media per archive | Up to 10 MB of settings |

Export can only include files still present on the device. The archive records missing references. Backups contain personal notes, history and configuration; keep your personal backup separate from this public source repository.

## Accounts and privacy

About and the footer show GitHub and Guns.lol with locally bundled creator photos. Cached avatars from existing configurations remain supported and included in full backups. About has no upload/follow buttons.

The default page makes no external requests. Optional features request their own access: Spotify for displayed playback metadata, LRCLIB for song lookup, Google Fonts for requested font downloads, and legacy Guns avatar sync if enabled in an existing configuration. No analytics or remote executable code. See [privacy policy](docs/PRIVACY_POLICY.md).

The memory indicator reports this New Tab's JavaScript heap, not total browser RAM. Toggle it in Performance. No native process runs by default. The optional Desktop bridge starts PowerShell through Native Messaging only after one-time registration and explicit enabling. No localhost server is used.

## Terminal and shortcuts

```text
g cats                # Google search
yt music              # YouTube search
gh xtufa7             # GitHub search
theme mocha
profile coding
settings music
music play
music pause
music next
volume 40
float current
float close
session save work
help
```

Unknown text uses the selected search engine. ↑/↓ navigate history, Tab completes, Enter runs, Escape dismisses. Shortcuts apply in NØVA rather than intercepting typing in Discord or other website inputs.

| Shortcut | Action |
| --- | --- |
| Ctrl+, | Settings |
| Ctrl+Shift+E | Edit layout |
| Ctrl+Shift+Y | Standalone Control Center |
| Ctrl+Shift+F | Floating live preview |
| Alt+Shift+F | Interactive browser window |
| Ctrl+Shift+X | Close/restore floating tab |

Change browser-level bindings at `chrome://extensions/shortcuts`. Developer branding commands require the local `sudo developer` gate. The entered password is not stored or exported. This is a convenience gate, not a security boundary against someone editing the extension source.

## Develop and verify

Requires Node.js 22.12+ or a supported newer release and npm.

```sh
npm ci
npm run typecheck
npm test
npm run build           # dist/
npm run build:private   # dist-private/
node scripts/verify-build.mjs
npx playwright install chromium
npm run test:browser
npm run test:features
npm run test:v14
```

`NOVA_BROWSER` can point to Chrome for Testing. Browser tests use disposable profiles with optional access pregranted only in fixture manifests. The feature test downloads a font from Google; other external interactions use controlled fixtures. The tiny synthetic WebM in `tests/fixtures` is test data, not shipped music or wallpaper. The UI preview (`npm run dev`, `/newtab.html`) cannot replace extension-only integration tests.

```text
src/        Extension, settings, terminal, music and storage source
public/     Packaged icons, account photos, help image and content scripts
tests/      Unit and browser integration tests
scripts/    Built package validation
manifest.json
package.json / package-lock.json
dist/       Ready-to-load build (included in the upload bundle)
docs/       Images, privacy policy and Arabic Store instructions
```

## Publish / upload to GitHub

Upload the **contents** of the versioned `github-ready` folder to your repository root. It already contains this README and its relative image paths, source, lockfile and built `dist`. The Store ZIP is a separate extension package; do not submit the GitHub source ZIP to the Store.

See [Arabic Chrome Web Store guide](docs/STORE_PUBLISH_AR.md). This project has not been submitted or published automatically.

## License

Personal, non-commercial use under [LICENSE](LICENSE). Third-party libraries retain their licenses; see [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md). NØVA is not affiliated with Spotify, TikTok, Google, Helium, or Catppuccin.
## Settings gallery

Real screenshots of every settings section. Click a preview to view the full image.

### Appearance

![Appearance](docs/images/gallery/appearance.png)

### Layout

![Layout](docs/images/gallery/layout.png)

### Widgets

![Widgets](docs/images/gallery/widgets.png)

### Shortcuts

![Shortcuts](docs/images/gallery/shortcuts.png)

### Terminal

![Terminal](docs/images/gallery/terminal.png)

### Music

![Music](docs/images/gallery/music.png)

### Floating Tabs

![Floating Tabs](docs/images/gallery/floating-tabs.png)

### Browser Companion

![Browser Companion](docs/images/gallery/browser-companion.png)

### Profiles

![Profiles](docs/images/gallery/profiles.png)

### Performance

![Performance](docs/images/gallery/performance.png)

### Privacy

![Privacy](docs/images/gallery/privacy.png)

### Backup

![Backup](docs/images/gallery/backup.png)

### Advanced

![Advanced](docs/images/gallery/advanced.png)

### About

![About](docs/images/gallery/about.png)

### Firefox and Zen

![Firefox](docs/images/firefox.png)

![Zen](docs/images/zen.png)

### Background, fonts and tab identity

![Background picker](docs/images/gallery/background.png)

![Custom fonts](docs/images/gallery/fonts.png)

![Tab customization](docs/images/gallery/tab-customization.png)

![Custom theme](docs/images/gallery/custom-theme.png)

![PowerShell commands](docs/images/gallery/desktop-commands.png)

## One-command Windows setup (after publishing)

```powershell
irm 'https://raw.githubusercontent.com/xtufa7/NOVA-New-Tab/main/native/bootstrap.ps1' | iex
```

Requires Windows 10 1809 or newer. Use the Music settings command to include your extension ID. Files install into your local app-data folder; enable Desktop bridge in each browser. This URL becomes available after publishing the repository.

To publish the extracted github-ready package, install Git + GitHub CLI and run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-github.ps1`. It authenticates as xtufa7, creates the public NOVA-New-Tab repository if needed, and pushes main without force. [Setup and removal](docs/WINDOWS_SPOTIFY_AR.md).

After editing native scripts, run `npm run native:bootstrap` to refresh the embedded standalone installer. `npm run test:bootstrap` exercises temporary host registrations and cleans them up.

Spotify Web and online lyrics now activate automatically at install/update. Required site access is limited to open.spotify.com and lrclib.net. The browser may ask you to approve the new access once; no repeated activation is needed. Explicit later opt-outs remain saved.

## Full Windows Setup from GitHub

After publishing the official repository, run:

```powershell
irm 'https://raw.githubusercontent.com/xtufa7/NOVA-New-Tab/main/setup.ps1' | iex
```

Setup detects supported browser executables/profiles, downloads the repository, selects the Chromium or Firefox/Zen build, and prepares stable folders under `%LOCALAPPDATA%\NOVA\BrowserSetup`. It opens browser installation pages and writes `INSTALL.txt`. Local extension installation needs your approval in the browser. Firefox/Zen unsigned builds are temporary until signed by Mozilla. For an existing extension, reload/update the same installation folder to keep its ID and configuration.

After approving a new Chromium installation, `Finish-Spotify-Setup.cmd` discovers its ID and completes the optional Windows bridge registration. The bridge can then be enabled in Music. Setup does not edit browser preferences or enterprise policies, or disable signature checks. `-DryRun` lists detected browsers without writing files; `-PrepareOnly` prepares files without launching browsers or registering a native host. `-BrowserPaths` supports portable browser executables.

Rise + Blur is available in Music → Lyrics animation. It animates both the revealed words and the lyric line inside the terminal. Live lyrics use the browser animation engine independently of general page Animations. Low Power pauses live motion. The system reduced-motion checkbox is enabled by default.

The publisher script installs Git/GitHub CLI through WinGet if missing, signs in as xtufa7, pushes main, and creates a versioned GitHub Release with browser/PowerShell assets when that release does not already exist. Live publishing requires your account login. [Setup guide](docs/SETUP_AR.md).
