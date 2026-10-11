# نسخ المتصفحات والتثبيت

| المتصفح | حزمة الإصدار | التثبيت |
| --- | --- | --- |
| Chrome | NOVA-3.0.0-Chrome.zip | chrome://extensions → Developer mode → Load unpacked |
| Helium | NOVA-3.0.0-Helium.zip | صفحة إضافات Chromium → Load unpacked |
| Edge | NOVA-3.0.0-Edge.zip | edge://extensions → Developer mode → Load unpacked |
| Brave | NOVA-3.0.0-Brave.zip | brave://extensions → Load unpacked |
| Vivaldi | NOVA-3.0.0-Vivaldi.zip | vivaldi://extensions → Load unpacked |
| Opera | NOVA-3.0.0-Opera.zip | opera://extensions → Developer mode → Load unpacked |
| Firefox | NOVA-3.0.0-Firefox.zip / unsigned.xpi | تحميل مؤقت أو توقيع Mozilla |
| Zen | NOVA-3.0.0-Zen.zip / unsigned.xpi | نفس بناء Gecko وطريقة Firefox |

فك ZIP أولًا واختر المجلد الذي يحتوي manifest.json. نسخ Chromium لها نفس الكود والبناء؛ الأسماء لتسهيل اختيار الحزمة، وليست دليل اختبار مستقل لكل متصفح.

## Firefox / Zen

![Firefox](images/firefox.png)

![Zen](images/zen.png)

البناء يستخدم background module بدل service worker، ويتطلب Firefox 140 أو أحدث. للتجربة: افتح `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → اختر manifest.json من المجلد المفكوك. التحميل المؤقت ينتهي عند إعادة تشغيل المتصفح.

**ملفات XPI الموجودة غير موقّعة.** للتثبيت الدائم ارفع Firefox ZIP إلى [بوابة مطوري Mozilla](https://addons.mozilla.org/developers/)، واختر Listed للنشر أو Unlisted للتوزيع بنفسك. أرفق المصدر وشرح البناء `npm ci && npm run build:firefox` عند طلب المراجعة. بعد التوقيع نزّل XPI الموقّع وثبّته في Firefox/Zen. لا تغيّر ملفات الحزمة بعد التوقيع. [تعليمات التوقيع الرسمية](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

في Firefox/Zen الموسيقى المحلية تفتح تبويب NØVA audio عند التشغيل الأول، ويجب إبقاؤه مفتوحًا. قد يتطلب المتصفح الضغط على Play فيه قبل المتابعة بالخلفية. الالتقاط الحي tabCapture غير متاح؛ استخدم النافذة التفاعلية أو زر Picture-in-Picture المدمج بالفيديو. هذا الزر يعتمد على المتصفح والموقع؛ لا يوجد دبوس مزيف لنافذة الويب كلها. عند غياب ImageDecoder تصبح أيقونة GIF ثابتة.

اختُبرت Helium وChromium 141 وFirefox 157.0.1 وZen 1.23.2b في ملفات تعريف اختبار منفصلة. نسخ Edge/Brave/Vivaldi/Opera مبنية لعائلة Chromium ولم تُختبر جميعها مستقلة في هذا الإصدار.

[رفع نسخة Chrome إلى المتجر](STORE_PUBLISH_AR.md) · [جسر Spotify لويندوز](WINDOWS_SPOTIFY_AR.md)

[مصفوفة التوافق والحدود في 3.0](COMPATIBILITY_3.md). مدير التابات يعمل كصفحة أو لوحة جانبية مدعومة. المجموعات الأصلية في Chromium، وWorkspaces متاحة في العائلتين. زر New Tab الافتراضي في Zen قد يفتح شريط العنوان؛ حركة NØVA تبدأ عندما تُفتح صفحتها الفعلية.
