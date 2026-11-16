/* الموجّه والهيكل العام | جميع الحقوق محفوظة © 2026 وطن النهار */
'use strict';
(function (NL) {
  const { $, $$, esc, icon, S, toast } = NL;
  const TABS = [
    { id: 'script', label: 'السيناريو', ic: 'script' },
    { id: 'board', label: 'لوحة القصة', ic: 'board' },
    { id: 'shots', label: 'التصوير', ic: 'list' },
    { id: 'edit', label: 'المونتاج', ic: 'edit' },
  ];
  let current = null, currentKey = '';
  $('#undoBtn').innerHTML = icon('undo'); $('#redoBtn').innerHTML = icon('redo'); $('#aboutBtn').innerHTML = icon('info');
  $('#undoBtn').onclick = () => doUndo(); $('#redoBtn').onclick = () => doRedo();
  function doUndo() { if (S.undo()) toast('تم التراجع'); }
  function doRedo() { if (S.redo()) toast('تمت الإعادة'); }
  NL.doUndo = doUndo; NL.doRedo = doRedo;
  document.addEventListener('nl-hist', (e) => { $('#undoBtn').disabled = !e.detail.u; $('#redoBtn').disabled = !e.detail.r; });
  document.addEventListener('nl-save', (e) => {
    const el = $('#saveState'); const st = e.detail;
    el.className = 'save-state ' + st;
    el.innerHTML = st === 'saving' ? '<i></i>جارٍ الحفظ' : st === 'saved' ? icon('check') + 'محفوظ' : st === 'error' ? 'تعذّر الحفظ' : '';
  });
  S.listeners.add((kind) => { if (kind === 'history' && current && current.refresh) current.refresh(); if (S.project) $('#projTitle').textContent = S.project.title; });

  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !typing && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
    if (mod && !typing && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); S.saveNow(); toast('تم الحفظ'); return; }
    if (current && current.onKey && !typing) current.onKey(e);
  });

  function renderRail(pid, tab) {
    const rail = $('#rail');
    if (!pid) { rail.innerHTML = ''; document.body.classList.remove('in-project'); return; }
    document.body.classList.add('in-project');
    rail.innerHTML = `<a class="rail-item home" href="#/">${icon('film')}<span>المشاريع</span></a>` +
      TABS.map(t => `<a class="rail-item ${t.id === tab ? 'on' : ''}" href="#/p/${pid}/${t.id}" data-tab="${t.id}">${icon(t.ic)}<span>${t.label}</span></a>`).join('');
  }
  async function route() {
    const hash = location.hash.replace(/^#\/?/, '');
    const parts = hash.split('/');
    let key = hash || 'home';
    if (key === currentKey) return;
    if (current && current.destroy) current.destroy();
    current = null; currentKey = key;
    const main = $('#view'); main.innerHTML = ''; main.className = '';
    if (parts[0] === 'p' && parts[1]) {
      const pid = parts[1], tab = TABS.some(t => t.id === parts[2]) ? parts[2] : 'script';
      if (!S.project || S.project.id !== pid) {
        if (S.project) await S.saveNow();
        const p = await S.load(pid);
        if (!p) { toast('المشروع غير موجود', 'err'); location.hash = '#/'; return; }
        S.emitHist();
      }
      $('#projTitle').textContent = S.project.title;
      renderRail(pid, tab);
      main.className = 'view-' + tab;
      current = NL.Views[tab]; current.render(main);
    } else {
      if (S.project) { await S.saveNow(); S.project = null; S.undoStack = []; S.redoStack = []; S.emitHist(); }
      $('#projTitle').textContent = '';
      renderRail(null);
      if (parts[0] === 'about') { main.className = 'view-about'; current = NL.Views.about; }
      else { main.className = 'view-home'; current = NL.Views.projects; }
      current.render(main);
    }
    main.classList.add('enter');
    main.scrollTop = 0;
    document.dispatchEvent(new CustomEvent('nl-route', { detail: { key, tab: (parts[0] === 'p' && parts[1]) ? (parts[2] || 'script') : (parts[0] || 'home') } }));
  }
  NL.Views = NL.Views || {};
  NL.Views.about = {
    render(main) {
      main.innerHTML = `<section class="about">
        <div class="about-hero"><img src="assets/logo.svg" alt="" class="about-logo"><h1>عدسة النهار</h1><p class="sub">NAHAR LENS · CINEMATIC FILM STUDIO</p>
        <p class="lead">استوديو عربي متكامل لصناعة الأفلام: من الفكرة والسيناريو إلى لوحة القصة وجدول التصوير والمونتاج والتصدير — كل شيء يعمل على جهازك، بدون حساب وبدون رفع ملفاتك لأي خادم.</p></div>
        <div class="about-grid">
          <div class="card">${icon('script')}<h3>السيناريو</h3><p>تنسيق احترافي للمشاهد والحوار وترقيم تلقائي وتصدير PDF.</p></div>
          <div class="card">${icon('board')}<h3>لوحة القصة</h3><p>لقطات بالصور أو الرسم، نوع اللقطة والعدسة وحركة الكاميرا.</p></div>
          <div class="card">${icon('list')}<h3>جدول التصوير</h3><p>قائمة لقطات مرتبطة، أيام تصوير، مواقع وممثلين وحالة الإنجاز.</p></div>
          <div class="card">${icon('edit')}<h3>المونتاج</h3><p>خط زمني متعدد المسارات، انتقالات، مفاتيح حركة، تلوين سينمائي وتصدير حتى 1080p.</p></div>
        </div>
        <div class="card shortcuts"><h3>${icon('keyboard')} اختصارات لوحة المفاتيح (المونتاج)</h3>
          <div class="kbd-grid">
          ${[['مسافة', 'تشغيل / إيقاف'], ['S', 'قص عند المؤشر'], ['Delete', 'حذف المقطع'], ['D', 'تكرار المقطع'], ['K', 'إضافة مفتاح حركة'], ['← →', 'إطار للأمام/للخلف'], ['Shift + ← →', 'ثانية كاملة'], ['Home / End', 'البداية / النهاية'], ['+ / −', 'تكبير وتصغير الخط الزمني'], ['N', 'تفعيل المغناطيس'], ['Ctrl + Z', 'تراجع'], ['Ctrl + Shift + Z', 'إعادة'], ['Ctrl + S', 'حفظ']].map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`).join('')}
          </div></div>
        <div class="card"><h3>الخصوصية والتوافق</h3><p class="muted">يعمل على آيفون وأجهزة هواوي (بدون خدمات جوجل) والكمبيوتر. ${NL.isNative ? 'لا يجمع التطبيق أي بيانات ولا يحتاج حساباً أو إنترنت؛ كل مشاريعك محفوظة على جهازك فقط، فاحرص على تصدير أعمالك المهمة.' : 'يمكنك تثبيته كتطبيق من قائمة المتصفح «إضافة إلى الشاشة الرئيسية». بياناتك محفوظة محلياً في المتصفح، فاحرص على تصدير أعمالك المهمة.'}</p><p><a class="link-gold" href="privacy.html">سياسة الخصوصية · Privacy Policy</a></p></div>
        <footer class="copyright"><img src="assets/logo.svg" alt=""><div><b>جميع الحقوق محفوظة © 2026 وطن النهار</b><br><span dir="ltr">All rights reserved © 2026 Watan Al-Nahar</span><br><small class="muted">الإصدار 1.0 · لا يجوز نسخ التطبيق أو توزيعه أو تعديله دون إذن كتابي من المالك.</small></div></footer>
      </section>`;
    }
  };
  window.addEventListener('hashchange', route);
  window.addEventListener('DOMContentLoaded', async () => {
    NL.DB.persist();
    await route();
    setTimeout(() => document.getElementById('splash').classList.add('gone'), 450);
    if ('serviceWorker' in navigator && !NL.isNative && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => { });
  });
})(window.NL);
