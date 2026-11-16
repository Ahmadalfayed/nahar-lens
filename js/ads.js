/* عرض الإعلانات (AdSense للموقع / AdMob للتطبيق) — لا يعمل إلا بعد ملء الإعدادات | جميع الحقوق محفوظة © 2026 وطن النهار */
'use strict';
(function (NL) {
  const filled = (s) => typeof s === 'string' && s.trim().length > 0;
  const cfg = () => NL.AdsConfig || {};
  const isNative = () => !!(NL.isNative || document.documentElement.getAttribute('data-native-build'));
  const isDemo = () => {
    try { if (new URLSearchParams(location.search).get('ads') === 'demo') return true; } catch (e) { }
    return cfg().DEMO_PLACEHOLDER === true;
  };
  const TAB = (hash) => {
    const parts = (hash || location.hash).replace(/^#\/?/, '').split('/');
    if (parts[0] === 'p' && parts[1]) return ['script', 'board', 'shots', 'edit'].includes(parts[2]) ? parts[2] : 'script';
    return parts[0] === 'about' ? 'about' : 'home';
  };
  const isExporting = () => !!(NL.Engine && NL.Engine.exporting) || !!document.querySelector('.modal.export-modal');
  const host = () => document.getElementById('nlAdHost');

  // معرّفات اختبار AdMob الرسمية من جوجل — لا تُستخدم في الإصدارات المنشورة
  const TEST = {
    androidApp: 'ca-app-pub-3940256099942544~3347511713',
    iosApp: 'ca-app-pub-3940256099942544~1458002511',
    androidBanner: 'ca-app-pub-3940256099942544/6300978111',
    iosBanner: 'ca-app-pub-3940256099942544/2934735716'
  };

  let adsenseLoaded = false, admobReady = false, admobVisible = false, lastKey = '';

  function hideHost() {
    const el = host();
    if (!el) return;
    el.hidden = true;
    el.innerHTML = '';
    document.body.classList.remove('has-ads');
    lastKey = '';
  }

  function slotFor(tab) {
    const c = cfg();
    if (tab === 'home') return (c.ADSENSE_SLOT_HOME || '').trim();
    return (c.ADSENSE_SLOT_PAGES || '').trim();
  }

  function adsenseEnabled() {
    if (isNative()) return false; // AdSense للموقع فقط — داخل التطبيق نستخدم AdMob إن فُعِّل
    const c = cfg();
    return filled(c.ADSENSE_CLIENT);
  }

  function loadAdsense(client) {
    if (adsenseLoaded) return;
    adsenseLoaded = true;
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(client);
    document.head.appendChild(s);
  }

  function renderAdsense(tab) {
    const c = cfg();
    const slot = slotFor(tab);
    if (!filled(c.ADSENSE_CLIENT) || !filled(slot)) { hideHost(); return; }
    const el = host(); if (!el) return;
    const key = 'adsense:' + tab + ':' + slot;
    if (key === lastKey && !el.hidden) return;
    loadAdsense(c.ADSENSE_CLIENT.trim());
    el.innerHTML = '';
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle nl-ad-slot';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', c.ADSENSE_CLIENT.trim());
    ins.setAttribute('data-ad-slot', slot);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    el.appendChild(ins);
    el.hidden = false;
    document.body.classList.add('has-ads');
    lastKey = key;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { }
  }

  function renderDemo(tab) {
    const el = host(); if (!el) return;
    const key = 'demo:' + tab;
    if (key === lastKey && !el.hidden) return;
    el.innerHTML = '<div class="nl-ad-slot nl-ad-demo" role="presentation" aria-hidden="true">إعلان تجريبي — لا يُحمَّل في النسخة الفعلية حتى تُضاف أرقام الحساب</div>';
    el.hidden = false;
    document.body.classList.add('has-ads');
    lastKey = key;
  }

  function admobIds() {
    const c = cfg();
    const android = (NL.platform === 'android');
    if (c.ADMOB_USE_TEST_IDS) {
      return { app: android ? TEST.androidApp : TEST.iosApp, banner: android ? TEST.androidBanner : TEST.iosBanner };
    }
    return {
      app: (android ? c.ADMOB_ANDROID_APP_ID : c.ADMOB_IOS_APP_ID) || '',
      banner: (android ? c.ADMOB_ANDROID_BANNER : c.ADMOB_IOS_BANNER) || ''
    };
  }

  async function initAdMob() {
    if (admobReady || !isNative() || !cfg().ADMOB_ENABLED) return false;
    const plugin = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.AdMob;
    if (!plugin) {
      console.warn('عدسة النهار: ADMOB_ENABLED=true لكن إضافة AdMob غير مثبتة. راجع docs/ads.md — لن يتغيّر سلوك 1.0.0.');
      return false;
    }
    const ids = admobIds();
    if (!filled(ids.app) || !filled(ids.banner)) return false;
    try {
      await plugin.initialize({ requestTrackingAuthorization: false, initializeForTesting: !!cfg().ADMOB_USE_TEST_IDS });
      NL._admob = { plugin, ids };
      admobReady = true;
      return true;
    } catch (e) {
      console.warn('عدسة النهار: تعذّر تهيئة AdMob', e);
      return false;
    }
  }

  async function syncAdMob(show) {
    const ok = await initAdMob();
    if (!ok || !NL._admob) return;
    const { plugin, ids } = NL._admob;
    try {
      if (show && !admobVisible) {
        await plugin.showBanner({
          adId: ids.banner,
          adSize: 'ADAPTIVE_BANNER',
          position: 'BOTTOM_CENTER',
          margin: 0,
          isTesting: !!cfg().ADMOB_USE_TEST_IDS
        });
        admobVisible = true;
      } else if (!show && admobVisible) {
        await plugin.hideBanner();
        admobVisible = false;
      }
    } catch (e) { console.warn('عدسة النهار: بانر AdMob', e); }
  }

  function shouldShow() {
    const tab = TAB();
    if (tab === 'edit') return false;
    if (isExporting()) return false;
    return true;
  }

  function sync() {
    const tab = TAB();
    const show = shouldShow();
    if (isNative()) {
      hideHost(); // لا AdSense ولا صندوق HTML داخل التطبيق
      if (cfg().ADMOB_ENABLED) syncAdMob(show);
      return;
    }
    if (!show) { hideHost(); return; }
    if (isDemo()) { renderDemo(tab); return; }
    if (adsenseEnabled() && filled(slotFor(tab))) { renderAdsense(tab); return; }
    hideHost();
  }

  NL.syncAds = sync;

  function boot() {
    const el = host();
    if (el) el.hidden = true;
    document.body.classList.remove('has-ads');
    // لا نحمّل شيئاً إن كانت الإعدادات فارغة وليس وضع العرض التجريبي
    if (!isDemo() && !adsenseEnabled() && !(isNative() && cfg().ADMOB_ENABLED)) return;
    sync();
    window.addEventListener('hashchange', sync);
    document.addEventListener('nl-route', sync);
    const mo = new MutationObserver(() => {
      // إخفاء فوري عند فتح نافذة التصدير أو تغيير حالتها
      if (isExporting() || lastKey) sync();
    });
    mo.observe(document.body, { childList: true, subtree: false });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window.NL = window.NL || {});
