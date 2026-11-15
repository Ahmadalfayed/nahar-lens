/* جسر التطبيق الأصلي (Android / iOS عبر Capacitor) — لا يفعل شيئاً في المتصفح | جميع الحقوق محفوظة © 2026 وطن النهار */
'use strict';
(function (NL) {
  const Cap = window.Capacitor;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  NL.isNative = isNative;
  NL.platform = isNative ? Cap.getPlatform() : 'web';
  const webDownload = NL.download;

  // ===== إبقاء الشاشة مضاءة أثناء التصدير =====
  let wakeLock = null;
  NL.keepAwake = async (on) => {
    try {
      if (isNative) { const K = Cap.Plugins.KeepAwake; if (K) await (on ? K.keepAwake() : K.allowSleep()); return; }
      if (on && navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
      else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { }
  };
  if (!isNative) { NL.saveToGallery = null; NL.shareFile = null; return; }

  document.documentElement.classList.add('native', 'native-' + NL.platform);
  const P = Cap.Plugins;

  // ===== كتابة Blob إلى ملف مؤقت على الجهاز (على دفعات لتفادي استهلاك الذاكرة) =====
  const b64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
  const safeName = (n) => String(n || 'file').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 120);
  async function blobToFile(blob, name) {
    const FS = P.Filesystem; const ext = (String(name).match(/\.([a-z0-9]{2,5})$/i) || [, 'bin'])[1].toLowerCase();
    const path = 'exports/nahar-lens-' + Date.now() + '.' + ext; // مسار ASCII آمن؛ الاسم العربي يُمرَّر للمعرض كاسم عرض
    const CH = 3 * 1024 * 1024; // مضاعف 3 لتبقى دفعات base64 سليمة
    await FS.writeFile({ path, directory: 'CACHE', data: await b64(blob.slice(0, CH)), recursive: true });
    for (let off = CH; off < blob.size; off += CH) await FS.appendFile({ path, directory: 'CACHE', data: await b64(blob.slice(off, off + CH)) });
    const { uri } = await FS.getUri({ path, directory: 'CACHE' });
    return uri;
  }
  NL.fileFromBlob = blobToFile;

  NL.saveToGallery = async (blob, name) => {
    const uri = await blobToFile(blob, name);
    const isVideo = /^video\//.test(blob.type) || /\.(mp4|webm|mov)$/i.test(name);
    const fn = isVideo ? 'saveVideo' : 'saveImage';
    await P.GallerySaver[fn]({ path: uri, fileName: safeName(name), mimeType: blob.type || (isVideo ? 'video/mp4' : 'image/jpeg') });
    return uri;
  };
  NL.shareFile = async (blob, name, title) => {
    const uri = await blobToFile(blob, name);
    try { await P.Share.share({ title: title || name, files: [uri], dialogTitle: 'مشاركة' }); } catch (e) { if (!/cancel/i.test(String(e && e.message))) throw e; }
  };

  // التنزيل داخل التطبيق: الفيديو والصور إلى المعرض، وباقي الملفات عبر نافذة المشاركة (حفظ في الملفات…)
  NL.download = async (blob, name) => {
    try {
      if (/^(video|image)\//.test(blob.type)) { await NL.saveToGallery(blob, name); NL.toast('تم الحفظ في الصور ✓'); }
      else await NL.shareFile(blob, name);
    } catch (e) {
      console.error(e);
      NL.toast(/PERMISSION/.test(String(e && e.message)) ? 'يرجى السماح بالوصول إلى الصور من الإعدادات' : 'تعذّر الحفظ: ' + (e && e.message || e), 'err');
    }
  };

  // الطباعة / PDF عبر نافذة الطباعة الأصلية
  window.__keepPrint = true;
  window.print = () => {
    const name = (document.title || 'عدسة النهار');
    P.GallerySaver.print({ name }).catch((e) => NL.toast('تعذّرت الطباعة: ' + (e && e.message || e), 'err'))
      .finally(() => window.dispatchEvent(new Event('afterprint')));
  };

  // شريط الحالة الداكن
  try { P.StatusBar && P.StatusBar.setStyle({ style: 'DARK' }); } catch (e) { }

  // زر الرجوع في أندرويد: يغلق النافذة المفتوحة، ثم يرجع للخلف، ثم يصغّر التطبيق من الرئيسية
  if (P.App) P.App.addListener('backButton', () => {
    const m = document.querySelector('.modal-back .m-close');
    if (m) { m.click(); return; }
    const h = location.hash.replace(/^#\/?/, '');
    if (!/index\.html$|\/$/.test(location.pathname)) { location.href = 'index.html'; return; }
    if (h && h !== '/') { location.hash = '#/'; return; }
    P.App.minimizeApp();
  });
})(window.NL);
