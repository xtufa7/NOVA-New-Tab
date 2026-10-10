# Spotify على ويندوز · PowerShell اختياري

![الإعدادات والتحذير](images/desktop-bridge.png)

**يعمل خارج نطاق الإضافة. حمّله فقط من [المطور الرسمي xtufa7](https://github.com/xtufa7).**

## تثبيت مباشر بعد نشر GitHub

يدعم Spotify Desktop ويندوز 10 إصدار 1809 وما بعده، بما فيه ويندوز 11. PowerShell 5.1 أو 7 يستطيعان تشغيل المثبّت؛ الجسر يستخدم Windows PowerShell 5.1 المدمج. لا يحتاج مسؤولًا. أنظمة Windows 7/8 وmacOS/Linux تستخدم Spotify Web. [حدود واجهة Windows](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssessionmanager).

بعد نشر مستودع **xtufa7/NOVA-New-Tab** على فرع **main**، يعمل:

```powershell
irm 'https://raw.githubusercontent.com/xtufa7/NOVA-New-Tab/main/native/bootstrap.ps1' | iex
```

الأمر الموجود في Music يتضمن ID متصفحك أيضًا، وهو الأنسب للمسارات غير القياسية. الرابط مُجهّز للنشر؛ لن يعمل قبل رفع المستودع. الملف مستقل ويحمل الملفات المضمّنة معه إلى `%LOCALAPPDATA%\NOVA\SpotifyBridge\native`، لذلك لا يعتمد على مجلد الطرفية ولا على `C:\NOVA`. إذا لم يظهر ID تلقائيًا، انسخ أمر التثبيت من إعدادات Music في متصفحك.

بدون استضافة: فك ZIP ثم شغّل الملف الموجود فعليًا:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\native\bootstrap.ps1
```

بعد التثبيت افتح Music → Spotify desktop في كل متصفح واضغط **Enable desktop bridge**. قائمة التسجيل تعرض all وجميع المتصفحات العشرة. online lyrics مفعّل افتراضيًا؛ عدّل التوقيت عند الحاجة. الجسر يبدأ مع المتصفح عند تفعيله ويتوقف عند تعطيله. المتصفحات ذات السياسات المؤسسية التي تمنع Native Messaging تحتاج Spotify Web.

## الرفع إلى حسابك

ثبّت Git و[GitHub CLI](https://cli.github.com/)، وفك github-ready ZIP. من داخله شغّل:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-github.ps1
```

يطلب تسجيل الدخول بحساب xtufa7، ينشئ مستودعًا عامًا باسم NOVA-New-Tab عند غيابه، ويرفع المصدر والصور والبناء إلى main، ثم يطبع رابط Raw. لا يرفع تلقائيًا الآن، ولا يستخدم force push. إذا كان المستودع موجودًا وفيه تاريخ مختلف يتوقف، بدل حذف تاريخك. اسم الإضافة المعروض يبقى NØVA؛ اسم GitHub يقبل ASCII فقط.



بعد التسجيل، يبدأ المتصفح `spotify-bridge.ps1` عبر Native Messaging عند تشغيله، فقط إذا كان خيار الجسر مفعّلًا. لا توجد مهمة بدء تشغيل ويندوز، ولا Python، ولا exe مساعد، ولا خادم localhost. Windows PowerShell 5.1 يشغَّل بواسطة `launch.cmd`. صلاحية ExecutionPolicy Bypass تخص هذه العملية؛ لا يغيّر السكربت سياسة النظام.

## الإيقاف والإزالة

Disable desktop bridge يفصل الاتصال ويحذف حالة الأغنية ويجعل عملية PowerShell تنتهي. لإزالة التسجيل المحلي أيضًا، شغّل أمر `-Uninstall` من الإعدادات. سجّل من جديد إذا تغيّر مسار المجلد أو ID الإضافة. تسجيل Firefox وZen مشترك تحت Mozilla؛ تسجيل عائلة Chromium يمكن أن يشارك ملف host واحدًا، لذلك أعد تسجيل المتصفحات الأخرى إن أزلته.

## ما الذي يُقرأ؟

Windows media sessions توفر عنوان الأغنية والفنان والموضع والمدة وحالة التشغيل لتطبيق Spotify فقط. لا يسجل الصوت أو الشاشة، ولا يقرأ كلمات المرور أو التوكنات. ملف PowerShell لا يقبل أوامر تشغيل من الإضافة. عرض الكلمات يحتاج بيانات توقيت من LRCLIB؛ التوقيت كلمة بكلمة يكون تقديريًا إذا توفر توقيت السطور فقط.

## حل المشاكل

- Native host not found: تحقق من المتصفح المختار، وID، ومسار المجلد، ثم نفّذ أمر التسجيل واضغط Reconnect desktop bridge.
- connected ولكن لا أغنية: افتح Spotify وشغّل أغنية؛ يجب أن ينشر التطبيق جلسة وسائط في ويندوز.
- أغنية بلا كلمات: فعّل online lyrics؛ بعض الأغاني ليس لها كلمات متزامنة في الخدمة.
- صلاحية nativeMessaging مرفوضة: اسمح بها عند Enable، أو من Privacy. إزالتها تفصل الجسر.
- إذا منعت مؤسسة/سياسة Windows تشغيل السكربت، استخدم Spotify Web؛ لا يعدّل المثبّت السياسات.

[Native Messaging في Chrome](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging) · [Windows media sessions](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssessionmanager)
