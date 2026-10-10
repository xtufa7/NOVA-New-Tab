# NØVA 1.5.6

Fixed live lyrics and New Tab opening motion being suppressed by the general CSS animation reset. Both now use browser Web Animations with independent persisted settings. New tabs opened in the background defer entrance until visible.

Lyrics: Arabic/English fonts (including the local font library), color, size, weight, line height and English spacing; word/letter unit, duration, stagger, rise and blur. English letters use graphemes; Arabic words remain joined. Preview and live terminal/player use one engine. Low Power and optional system reduced motion remain respected.

Opening: Rise + Blur, Rise, Fade, Zoom, Slide; duration, stagger, delay, distance, blur, easing, independent targets, live preview and workspace replay. Tab title/icon controls are independent of general page Animations.

Fixed asynchronous save acknowledgements restoring an earlier animation choice during rapid edits. Old settings/media backups remain supported. The GitHub package includes updated screenshots and actual Helium wallpaper/opening recordings. Previous output releases are preserved. Nothing has been uploaded to a Store or GitHub.
