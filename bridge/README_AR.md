# جسر NØVA لويندوز — Spotify وCAVA وتثبيت النوافذ

هذا الجسر اختياري. Spotify Web والمعاينة المثبّتة عبر Picture-in-Picture يعملان دون الجسر.
الجسر يقرأ Spotify من واجهة Windows Media Control، ويعرض بيانات CAVA الخام، ويثبت نافذة المتصفح التفاعلية فوق التطبيقات. لا يشغّل أوامر من المواقع ولا يتحكم بتشغيل Spotify.

## التشغيل السريع — دون Python

1. شغّل `NOVA-Bridge.exe` الموجود داخل هذا المجلد في إصدار 1.3.
2. من NØVA → Floating Tabs أو Performance اضغط **Copy extension ID**.
3. ألصق المعرّف في نافذة الجسر واضغط **Start bridge**.
4. اضغط **Allow Windows bridge** في الإضافة، ثم **Check bridge connection**.
5. افتح TikTok من الزر الجانبي واضغط **📌 Pin above apps** داخل نافذته الصغيرة.

اترك نافذة الجسر مفتوحة. يتذكر المعرّف على جهازك في `%LOCALAPPDATA%\NOVA\bridge.json`، ولا يسجّل نفسه في بدء تشغيل ويندوز. زر Stop & close يوقفه. ملف التشغيل لويندوز x64 ومبني محليًا؛ المصدر وملف البناء موجودان هنا. لا يحتاج صلاحيات Administrator.

## قراءة RAM

من Performance فعّل Show browser RAM under terminal واختر المتصفح: Helium افتراضيًا. يظهر مجموع Working Sets لكل عمليات ذلك المتصفح بالميغابايت؛ قد تتكرر الصفحات المشتركة في هذا المجموع. لا تُقرأ عناوين التابات أو محتوياتها لهذا القياس. التحديث كل خمس ثوانٍ عند ظهور New Tab، ويتوقف عند إخفائها أو تعطيل الإعداد. عند عدم اتصال الجسر يظهر تلميح اتصال بدل رقم وهمي. [واجهة processes في Chrome مقتصرة على قناة Dev](https://developer.chrome.com/docs/extensions/reference/api/processes)، لذلك يستخدم الإصدار المستقر قياس ويندوز.

## البديل للمطوّر — Python

1. ثبّت Python لويندوز 3.9 أو أحدث، مع تفعيل إضافته إلى PATH.
2. افتح PowerShell داخل مجلد `bridge` الموجود بجانب نسخ الإصدار.
3. نفّذ `./setup.ps1`. ينشئ بيئة Python مستقلة ويثبت حزم PyWinRT من PyPI.
4. افتح `chrome://extensions` وانسخ ID الخاص بـ NØVA: سلسلة من 32 حرفًا.
5. شغّل الجسر بالأمر التالي، بعد استبدال ID بالمُعرّف الحقيقي:

```powershell
./start.ps1 -ExtensionId 'ضع_معرف_الاضافة_هنا'
```

اترك هذه الطرفية مفتوحة أثناء الاستخدام. Ctrl+C يوقف الجسر؛ لا يضيف نفسه إلى بدء تشغيل ويندوز.
إذا منع PowerShell السكربت، يمكنك تشغيل أوامر الإعداد مباشرة دون تغيير سياسة النظام:

```powershell
python -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt
./.venv/Scripts/python.exe nova_bridge.py --extension-id 'ضع_معرف_الاضافة_هنا'
```

## Spotify على ويندوز

في NØVA: Settings → Music → Spotify & synchronized lyrics:
اختر `desktop` ثم Connect Spotify. وافق على الاتصال المحلي، ثم Enable online lyrics لطلب الكلمات من LRCLIB.
المصدر الافتراضي `web`، وله زر Connect Spotify وإذن خاص بـ open.spotify.com.
تغيير المصدر يفصل الاتصال حتى تضغط Connect للمصدر الجديد. بعض الأغاني لا تتوفر لها كلمات متزامنة؛ يمكنك تعديل تأخير الكلمات من الإعدادات. يجب أن يكون Spotify ظاهرًا ضمن جلسات الوسائط في ويندوز.

## تثبيت النافذة التفاعلية وTikTok

1. افتح النافذة عبر Interactive window أو زر TikTok الجانبي.
2. اضغط **📌 Pin above apps** داخل نافذة الموقع.
3. بديلًا: أيقونة NØVA → **Pin / unpin popup · Windows bridge**.
4. اضغطه مجددًا لإلغاء التثبيت. يتطابق الجسر مع عنوان النافذة وحدودها ويستخدم واجهة ويندوز الفعلية للبقاء فوق التطبيقات.

المعاينة الحية: افتح Pinned preview من أيقونة NØVA، ثم اضغط Pin above apps داخل تبويب التحكم. هذه معاينة مرئية؛ التفاعل مع الموقع يتم في تبويبه أو النافذة التفاعلية. لا تغلق تبويب التحكم أثناء استخدام Picture-in-Picture. المحتوى المحمي وبعض صفحات المتصفح لا تسمح بالتقاط الصورة.

## CAVA الحقيقي

خيار `cava` يرسم طيف الموسيقى المحلية بشكل شرائح من Web Audio؛ خيار `native-cava` يقرأ برنامج CAVA نفسه.
شغّل نسخة CAVA المتوافقة مع بيئتك واجعل إخراجها ملفًا محليًا مرئيًا لويندوز. في إعداد CAVA:

```ini
[general]
bars = 16
framerate = 15

[output]
method = raw
raw_target = مسار_ملف_محلي
data_format = ascii
ascii_max_range = 255
bar_delimiter = 59
frame_delimiter = 10
```

استخدم مسارًا صالحًا لبيئة CAVA؛ مع WSL يمكن استخدام ملف في `/mnt/c/...` وقراءة مقابله `C:\...` في الجسر. اضبط مصدر التقاط الصوت في قسم input وفق نظامك، كما في توثيق CAVA.

```powershell
./start.ps1 -ExtensionId 'ضع_معرف_الاضافة_هنا' -CavaFile 'C:\مسار\cava.raw'
```

في Music → Audio spectrum اختر `native-cava` واضغط Allow local CAVA bridge، ثم فعّل Mini player widget. Low Power يخفي الطيف. إذا توقّف إخراج CAVA، تختفي القيم القديمة خلال ثانيتين. ملف إخراج مستمر قد يكبر؛ أوقف CAVA قبل تنظيف الملف عند الحاجة. الجسر لا يثبت CAVA ولا يلتقط صوت النظام بنفسه.

## الخصوصية والتشخيص

الاتصال فقط على `127.0.0.1:17832`؛ يتحقق من ترويسة معرّف الإضافة المحدد ويرفض Origins مواقع الويب. قد يحذف Chromium ترويسة Origin من طلبات الإضافة المصرّح بها، ولهذا يتطلب الجسر ترويسة عميل إضافية. لا تقم بتغيير عنوان الاستماع إلى شبكة عامة. إذا تغير ID الإضافة بعد الانتقال من Load unpacked إلى المتجر، أعد تشغيل الجسر بالـ ID الجديد.

عدم ظهور كلمات: تأكد من Connect Spotify + Enable online lyrics، ومن وجود عنوان وفنان للأغنية. جُرّب Reconnect Spotify + enable lyrics لإعادة حقن القارئ في التاب المفتوح. عدم اتصال الجسر: تأكد من بقاء نافذة الجسر مفتوحة، وصحة ID، ومنح الاتصال المحلي. التثبيت لا يعمل إذا كانت النافذة مصغرة أو لا يمكن مطابقة عنوانها وحدودها؛ أعد إظهارها وحاول ثانية.

المراجع: [PyWinRT](https://pywinrt.readthedocs.io/en/stable/types.html)، [Windows Media Control](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssessionmanager.requestasync)، [CAVA config](https://github.com/karlstav/cava/blob/master/example_files/config).

## CAVA مع ملف التشغيل

يمكن تشغيل الملف من الطرفية مع إخراج CAVA دون بيئة Python:

```powershell
./NOVA-Bridge.exe --extension-id 'ضع_معرف_الاضافة_هنا' --cava-file 'C:\مسار\cava.raw'
```

لإعادة بناء ملف التشغيل من المصدر بعد setup، نفّذ `./build.ps1`. اختبارات هذا الإصدار تشمل خدمة الجسر المجمّعة وقراءة RAM وواجهة Win32 للتثبيت، ولا تتطلب الوصول لحسابات Spotify أو TikTok الخاصة بك.
