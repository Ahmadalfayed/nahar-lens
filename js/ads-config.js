/* إعدادات الإعلانات — تبقى مطفية ما دامت الأرقام فارغة | جميع الحقوق محفوظة © 2026 وطن النهار */
'use strict';
(function (NL) {
  /**
   * اترك كل الحقول فارغة (أو ADMOB_ENABLED = false) حتى تبقى الإعلانات مطفية بالكامل:
   * لا سكربت، لا طلبات شبكة، ولا مساحات فارغة في الواجهة.
   *
   * الموقع (AdSense) — بعد الموافقة ضع:
   *   ADSENSE_CLIENT:     "ca-pub-XXXXXXXXXXXXXXXX"
   *   ADSENSE_SLOT_HOME:  معرّف وحدة البانر في الشاشة الرئيسية
   *   ADSENSE_SLOT_PAGES: معرّف وحدة البانر في الشاشات الأخرى (السيناريو، لوحة القصة، التصوير، حول)
   * ولا تُعرض الإعلانات داخل المونتاج ولا أثناء التصدير، ولا داخل التطبيق الأصلي.
   *
   * التطبيق الأصلي (AdMob) — اترك ADMOB_ENABLED = false في إصدار 1.0.0.
   * تفعيلها يتطلّب تثبيت الإضافة وبناءً جديداً (يضيف إذن INTERNET وSDK إعلانات جوجل).
   * انظر docs/ads.md و native/README-native.md.
   */
  NL.AdsConfig = {
    ADSENSE_CLIENT: '',
    ADSENSE_SLOT_HOME: '',
    ADSENSE_SLOT_PAGES: '',

    // للقطات التخطيط فقط: ?ads=demo في الرابط يعرض صندوقاً وهمياً بدون أي طلب لشبكة إعلانات.
    DEMO_PLACEHOLDER: false,

    ADMOB_ENABLED: false,
    ADMOB_USE_TEST_IDS: true,
    ADMOB_ANDROID_APP_ID: '',
    ADMOB_IOS_APP_ID: '',
    ADMOB_ANDROID_BANNER: '',
    ADMOB_IOS_BANNER: ''
  };
})(window.NL = window.NL || {});
