# عدسة النهار — التطبيق الأصلي (Android / iOS)

جميع الحقوق محفوظة © 2026 وطن النهار

التطبيق مبني بـ **Capacitor 8**، وملفات الويب (`index.html`, `css/`, `js/`, `assets/`) **مضمّنة داخل التطبيق** (لا يحمّل موقعاً عن بُعد) فيعمل بالكامل بدون إنترنت — وهذا يتوافق مع إرشاد آبل 4.2.

- معرّف التطبيق: `live.clipkat.lens`
- Android: `minSdk 24`، `targetSdk/compileSdk 36`، بدون Google Play Services أو Firebase (يعمل على هواوي).
- iOS: iOS 15+، iPhone، Swift Package Manager.

## البنية
```
native/
  capacitor.config.json      إعدادات التطبيق (الاسم، الألوان، شاشة البداية…)
  scripts/copy-web.mjs       ينسخ ملفات الويب من جذر المستودع إلى www/
  plugins/gallery-saver/     إضافة محلية: حفظ الفيديو في المعرض/الصور + الطباعة/PDF
  assets/                    مصادر الأيقونة وشاشة البداية (npx @capacitor/assets generate)
  android/                   مشروع Android Studio
  ios/                       مشروع Xcode
```
جسر الويب ↔ الأصلي في `js/native.js` (لا يعمل إلا داخل التطبيق):
حفظ الفيلم في الصور، المشاركة، إبقاء الشاشة مضاءة أثناء التصدير، الطباعة/PDF، زر الرجوع في أندرويد، شريط الحالة الداكن.

## البناء
```bash
cd native
npm ci
npm run sync                      # نسخ الويب + cap sync
# Android (موقّع) — يقرأ ملف التوقيع من خارج المستودع:
#   /workspace/nahar-lens-signing/keystore.properties  (أو المتغير NAHAR_SIGNING_PROPS)
cd android && ./gradlew bundleRelease assembleRelease
#   AAB: android/app/build/outputs/bundle/release/app-release.aab
#   APK: android/app/build/outputs/apk/release/app-release.apk
```
> لا ترفع ملف المفتاح `.jks` أو كلمات السر إلى GitHub أبداً. احتفظ بنسخة احتياطية آمنة منهما.

## iOS عبر GitHub Actions (`.github/workflows/ios.yml`)
- **build-unsigned**: يبني أرشيفاً بدون توقيع على `macos-26` للتأكد من سلامة المشروع (يعمل مع كل دفع).
- **simulator-smoke**: يشغّل التطبيق على محاكي iPhone ويرفع صورة شاشة.
- **release-upload**: يوقّع ويرفع إلى App Store Connect/TestFlight — يعمل يدوياً من
  *Actions › iOS build › Run workflow › upload = true* بعد إضافة الأسرار التالية في
  *Settings › Secrets and variables › Actions*:

| السر | من أين |
|---|---|
| `APPLE_TEAM_ID` | developer.apple.com › Membership (Team ID من 10 خانات) |
| `ASC_KEY_ID` | App Store Connect › Users and Access › Integrations › App Store Connect API › مفتاح بدور **Admin** |
| `ASC_ISSUER_ID` | نفس الصفحة (Issuer ID) |
| `ASC_KEY_P8_BASE64` | ملف `AuthKey_XXXX.p8` بعد تحويله: `base64 -i AuthKey_XXXX.p8` |

التوقيع تلقائي (Cloud signing) عبر مفتاح الـ API، فلا حاجة لتصدير شهادات أو ملفات Provisioning يدوياً.
قبل أول رفع: أنشئ التطبيق في App Store Connect بنفس المعرّف `live.clipkat.lens`.

## تحديث الإصدار
- Android: `versionCode` و`versionName` في `android/app/build.gradle` (زد `versionCode` في كل رفع).
- iOS: `MARKETING_VERSION` في مشروع Xcode؛ رقم البناء يُضبط تلقائياً من رقم تشغيل الـ workflow.

## الإعلانات (مطفية في 1.0.0)

إصدار المتاجر 1.0.0 **بدون إعلانات وبدون إذن INTERNET وبدون Google Play Services**، ليعمل على هواوي كما هو.

التفعيل لاحقاً يكون في بناء جديد فقط:

1. املأ معرّفات AdMob في `js/ads-config.js` ثم ضع `ADMOB_ENABLED: true`. أثناء التطوير استخدم `ADMOB_USE_TEST_IDS: true`.
2. ثبّت الإضافة ثم أعد المزامنة:
   ```bash
   cd native
   npm install @capacitor-community/admob
   npm run sync
   ```
   هذا يضيف **إذن INTERNET** و**Google Mobile Ads SDK**. بعد ذلك أضف معرّف التطبيق في `AndroidManifest.xml` (`com.google.android.gms.ads.APPLICATION_ID`) وفي `Info.plist` (`GADApplicationIdentifier`). التفاصيل في [docs/ads.md](../docs/ads.md).
3. أجهزة هواوي بدون خدمات جوجل **لن تشغّل AdMob**. يحتاج الأمر بناءً/نكهة منفصلة بـ Huawei Ads Kit (انظر نفس الدليل). لا نضيف هذا البناء الآن حتى لا يتغيّر سلوك 1.0.0.
4. قبل رفع بناء فيه إعلانات: حدّث سياسة الخصوصية ونموذج أمان البيانات في المتاجر (قسم «إذا فُعِّلت الإعلانات»).

`js/ads.js` يستدعي الإضافة فقط إذا كانت `ADMOB_ENABLED` ووُجدت الإضافة. بدونها يبقى التطبيق كما هو.

