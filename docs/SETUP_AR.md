# Setup من GitHub · 3.0.0

![إعدادات الكلمات](images/animation-preview.png)

## الرفع بحسابك

فك حزمة github-ready ثم شغّل:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-github.ps1
```

ثبّت Git وGitHub CLI وسجّل دخول حساب xtufa7 أولًا. المستودع يجب أن يكون موجودًا. السكربت يرفع فرع المراجعة `dev/nova-3.0` فقط، دون force push ودون تعديل main أو نشر إصدار. الخيار `-CreateDraftRelease` ينشئ مسودة إصدار فقط عند طلبه صراحة. راجع الفرع قبل دمجه بنفسك.

لم يحدث رفع حي من هذه الجلسة؛ السكربت جاهز لتشغيله من حسابك.

## للمستخدم بعد نشر المستودع

```powershell
irm 'https://raw.githubusercontent.com/xtufa7/NOVA-New-Tab/main/setup.ps1' | iex
```

أمر main يجلب النسخة الموجودة على main، وهي قد تكون أقدم من 3.0 حتى تراجع الفرع وتدمجه. لم نرفع الملفات أو ننشر إصدارًا في هذه الجلسة. حمّل فقط من المطور الرسمي؛ السكربت يعمل خارج الإضافة. بعد رفع فرع المراجعة يمكنك تنزيل Setup منه وتجربته محليًا:

```powershell
Invoke-WebRequest 'https://raw.githubusercontent.com/xtufa7/NOVA-New-Tab/dev/nova-3.0/setup.ps1' -OutFile nova-setup.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\nova-setup.ps1 -Branch dev/nova-3.0 -PrepareOnly
```

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
