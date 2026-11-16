# إعلانات عدسة النهار

جميع الحقوق محفوظة © 2026 وطن النهار

الإعلانات **مطفية افتراضياً**. ما دامت الأرقام في `js/ads-config.js` فارغة و`ADMOB_ENABLED = false`، لا يُحمَّل أي سكربت إعلانات، ولا تُرسل أي طلبات لشبكات الإعلان، ولا يظهر أي فراغ في الواجهة. إصدار المتاجر 1.0.0 يبقى كما هو إلى أن تُفعَّل الإعلانات صراحةً في بناء جديد.

## القيم التي يجب أن يوفّرها وطن النهار

### 1) موقع lens.clipkat.live — Google AdSense
1. أنشئ حساب [Google AdSense](https://www.google.com/adsense/) واربط الموقع `https://lens.clipkat.live`.
2. بعد الموافقة انسخ:
   - **معرّف الناشر (Publisher ID)** بالشكل `ca-pub-XXXXXXXXXXXXXXXX` → `ADSENSE_CLIENT`
   - **معرّف وحدة البانر** للشاشة الرئيسية (وحدة متجاوبة) → `ADSENSE_SLOT_HOME`
   - **معرّف وحدة البانر** لبقية الشاشات غير المونتاج → `ADSENSE_SLOT_PAGES`  
     (يمكن استخدام الوحدة نفسها في الحقلين إن رغبت بوحدة واحدة).
3. ضع سطر `ads.txt` الرسمي الذي يعطيك إياه AdSense في ملف `ads.txt` (بدل التعليقات)، ثم انشر الموقع حتى يصبح الملف متاحاً على:
   `https://lens.clipkat.live/ads.txt`
4. حدّث سياسة الخصوصية إذا تغيّر نصّها عند التفعيل الفعلي، وأعد نشر `privacy.html`.

لا تُعرض إعلانات AdSense داخل التطبيق الأصلي (Android / iOS)، ولا داخل شاشة المونتاج، ولا أثناء تصدير الفيلم.

### 2) تطبيق المتاجر — Google AdMob (Android و iOS)
لا تُثبَّت إضافة AdMob في إصدار 1.0.0 حتى لا يُضاف إذن `INTERNET` ولا SDK إعلانات جوجل.

عند الرغبة في التفعيل (بناء جديد، ليس 1.0.0):
1. أنشئ تطبيقين في [AdMob](https://apps.admob.com/) (Android بمعرّف `live.clipkat.lens`، و iOS بنفس المعرّف).
2. انسخ:
   - **معرّف تطبيق Android** `ca-app-pub-xxxx~yyyy` → `ADMOB_ANDROID_APP_ID`
   - **معرّف تطبيق iOS** → `ADMOB_IOS_APP_ID`
   - **معرّف وحدة بانر Android** `ca-app-pub-xxxx/yyyy` → `ADMOB_ANDROID_BANNER`
   - **معرّف وحدة بانر iOS** → `ADMOB_IOS_BANNER`
3. ثبّت الإضافة وابنِ من مجلد `native/`:
   ```bash
   cd native
   npm install @capacitor-community/admob
   npm run sync
   ```
   هذا البناء **سيضيف إذن INTERNET** و**Google Mobile Ads SDK**، ولن يعمل على أجهزة هواوي التي بلا خدمات جوجل (انظر أدناه).
4. ضع `ADMOB_ENABLED: true` في `js/ads-config.js`. أثناء التطوير اترك `ADMOB_USE_TEST_IDS: true` (يستخدم معرّفات اختبار جوجل الرسمية). قبل الرفع للمتاجر اجعلها `false` بعد التأكد من المعرّفات الحقيقية.
5. أضف معرّف التطبيق في المشروع الأصلي:
   - Android: في `AndroidManifest.xml` داخل `<application>`:
     ```xml
     <meta-data
       android:name="com.google.android.gms.ads.APPLICATION_ID"
       android:value="ca-app-pub-xxxxxxxx~yyyyyyyy"/>
     ```
   - iOS: في `Info.plist` المفتاح `GADApplicationIdentifier` بنفس قيمة iOS App ID.
6. حدّث سياسة الخصوصية ونموذج «أمان البيانات» في المتاجر *قبل* رفع البناء الجديد. النسخة الحالية من النموذج (بدون إعلانات) تبقى صحيحة لإصدار 1.0.0. النسخة «إذا فُعِّلت الإعلانات» موجودة في حزمة المتاجر:
   `/workspace/nahar-lens-store/listing/data-safety-google-play.md` (القسم الأخير).

### 3) أجهزة هواوي بدون خدمات جوجل — Huawei Ads (Petal Ads)
AdMob يعتمد على خدمات جوجل، لذلك **لا يعمل** على أجهزة هواوي بدون Google Mobile Services. الحل هو بناء منفصل (نكهة / product flavor) يستخدم [Huawei Ads Kit](https://developer.huawei.com/consumer/en/hms/huawei-adskit/):

1. سجّل التطبيق في AppGallery Connect وأنشئ وحدات إعلانية (بانر).
2. أضف HMS Core وAds SDK إلى نكهة `huawei` فقط، دون إضافة Google Play Services.
3. في الجسر (`js/ads.js`) يمكن لاحقاً استدعاء إضافة كاباسيتر خاصة بهواوي أو جسر أندرويد محلي بنفس شرط الإخفاء: لا بانر في المونتاج ولا أثناء التصدير.
4. أبقِ النكهة الحالية (1.0.0) بدون إذن إنترنت حتى يُقرَّر التفعيل.
5. حدّث سياسة الخصوصية لهذا البناء واذكر هواوي كطرف ثالث عند التفعيل.

هذا البناء غير مُضمَّن الآن عمداً حتى لا يتغيّر سلوك الإصدار المنشور.

## أين تظهر الإعلانات عند التفعيل
- الشاشة الرئيسية للمشاريع، وأسفل شاشات السيناريو ولوحة القصة وجدول التصوير و«حول».
- لا تظهر داخل محرّر الخط الزمني، ولا فوق نافذة التصدير أو أثناءه.
- في الجوال داخل المشروع تجلس البانر فوق شريط التنقّل السفلي ولا تغطيه.

## Content-Security-Policy
الموقع حالياً **بدون** ترويسة CSP (ولا نضيف واحدة الآن حتى لا نكسر المونتاج أو التصدير أو عناوين `blob:`). عامل الخدمة لا يعترض طلبات الطرف الثالث ولا ملف `ads.txt`.

إذا أُضيفت سياسة CSP لاحقاً (مثلاً من Caddy)، يجب أن تسمح على الأقل بما يلي بعد تفعيل AdSense:

```
script-src 'self' https://pagead2.googlesyndication.com https://partner.googleadservices.com https://www.google.com https://www.gstatic.com https://tpc.googlesyndication.com;
img-src 'self' data: blob: https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.gstatic.com;
connect-src 'self' https://pagead2.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.gstatic.com https://*.googlesyndication.com;
frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://pagead2.googlesyndication.com https://*.googlesyndication.com;
style-src 'self' 'unsafe-inline' https://www.gstatic.com;
font-src 'self' https://fonts.gstatic.com;
```

كذلك أبقِ `script-src` متوافقاً مع التطبيق نفسه (`'self'`، وربما `'unsafe-inline'` بسبب بعض معالجات HTML الحالية مثل `onsubmit`). لا تمنع `blob:` و`media-src` و`worker-src` لأن المونتاج والتصدير يعتمدان عليها. قالب جاهز في `docs/ads-csp-caddy.snippet` — لا يُطبَّق على الخادم حتى يُطلب ذلك.

## عامل الخدمة
الإصدار `nahar-lens-v3` يعتمد الشبكة أولاً للملفات المحلية، ويتجاهل أي طلب خارج أصل الموقع ويتجاهل `/ads.txt` حتى يبقى ملف الإعلانات دائماً من الشبكة. ملفّا `js/ads-config.js` و`js/ads.js` مضافان إلى قائمة التخزين المؤقت للعمل دون إنترنت عندما تكون الإعلانات مطفية.

## وضع معاينة التخطيط
افتح `/?ads=demo` لعرض صندوق وهمي بنفس مكان البانر، دون أي طلب لشبكات الإعلان. مفيد للقطات الشاشة فقط.
