# Setup من GitHub · 1.5.6

![إعدادات الكلمات](images/animation-preview.png)

## الرفع بحسابك

فك حزمة github-ready ثم شغّل:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-github.ps1
```

يثبّت Git وGitHub CLI عبر WinGet إن كانا ناقصين، ثم يفتح تسجيل الدخول بحساب xtufa7. ينشئ المستودع العام NOVA-New-Tab إذا لم يكن موجودًا ويرفع الملفات والصور والبناء إلى main دون force push. ينشئ GitHub Release برقم الإصدار ويرفع ZIP/XPI المناسب لكل متصفح والجسر. إذا كان الإصدار موجودًا يحافظ على أصوله. قد يطلب مثبت Git صلاحيات ويندوز. إذا لم يتوفر WinGet ثبّت Git وGitHub CLI من موقعيهما الرسميين ثم أعد التشغيل.

لم يحدث رفع حي من هذه الجلسة؛ السكربت جاهز لتشغيله من حسابك.

## للمستخدم بعد نشر المستودع

```powershell
irm 'https://raw.githubusercontent.com/xtufa7/NOVA-New-Tab/main/setup.ps1' | iex
```

الرابط لا يعمل قبل نشر الملفات. حمّل فقط من المطور الرسمي. السكربت يعمل خارج الإضافة.

يكتشف Chrome وChromium وHelium وEdge وBrave وVivaldi وOpera وOpera GX وFirefox وZen من المسارات القياسية وApp Paths وملفات التعريف الموجودة. نتيجة existing-profile قد تخص تثبيتًا سابقًا؛ النتيجة executable تعني العثور على ملف المتصفح. المتصفحات المحمولة تدعم تحديد BrowserPaths عند تشغيل ملف Setup محليًا.

ينزّل المستودع ويجهّز البناء الملائم في مجلدات ثابتة تحت Local AppData. يفتح صفحة الإضافات إن عرف ملف المتصفح ويكتب INSTALL.txt بالمسارات والخطوات. Chromium يحتاج Developer mode → Load unpacked. Firefox/Zen يحتاجان Load Temporary Add-on لبناء غير موقّع؛ التثبيت الدائم يحتاج توقيع Mozilla. لا يغير السكربت تفضيلات المتصفح أو سياسات المؤسسة أو فحص التوقيع. [تثبيت وتوقيع Gecko](BROWSERS_AR.md).

عند تحديث تثبيت قديم، حدّث مجلده الحالي بدل تحميل مجلد جديد لتبقى إعداداته وID كما هي. التثبيت الذي أُنشئ بواسطة Setup يستخدم المسار نفسه في التحديثات التالية.

Spotify Web والكلمات تلقائيان بعد موافقة المتصفح. لجسر Desktop، بعد تحميل الإضافة الجديدة شغّل Finish-Spotify-Setup.cmd من مجلد Setup لكي يكتشف ID المتصفح، ثم فعّل Desktop bridge في Music مرة واحدة. [تفاصيل الجسر وإزالته](WINDOWS_SPOTIFY_AR.md).

## الفحص دون تثبيت

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -DryRun
```

PrepareOnly يجهّز الملفات دون تشغيل متصفح أو تسجيل جسر. SkipBridge يتجاوز الجسر، وNoOpenBrowser يتجاوز فتح الصفحات. ArchivePath يسمح باستخدام ZIP محلي من نفس المستودع. يفحص Setup هوية المصدر وإصدار البناء، ويرفض مسارات ZIP الخارجة عن مجلد الاستخراج.

مراجع التثبيت: [Load unpacked في Chrome](https://support.google.com/chrome/a/answer/2714278?hl=en) · [التثبيت المؤقت في Firefox](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).
