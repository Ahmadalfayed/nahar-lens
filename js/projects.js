/* المشاريع | جميع الحقوق محفوظة © 2026 وطن النهار */
'use strict';
(function (NL) {
  const { $, $$, esc, icon, S, DB, h, modal, confirmBox, toast, pickFiles, downscale, arNum } = NL;
  const GENRES = ['دراما', 'أكشن', 'إثارة', 'رعب', 'كوميديا', 'خيال علمي', 'وثائقي', 'رومانسي', 'تاريخي', 'فيلم قصير', 'إعلان', 'كليب موسيقي'];
  const GRADS = [['#3a2410', '#0b0b0d'], ['#0f2b33', '#08090a'], ['#33140f', '#0a0909'], ['#1d1a33', '#09090c'], ['#2b2b12', '#0a0a08'], ['#122a1c', '#080a09']];
  function grad(id) { let n = 0; for (const c of id) n = (n * 31 + c.charCodeAt(0)) >>> 0; return GRADS[n % GRADS.length]; }
  const fmtDate = (t) => new Date(t).toLocaleDateString('ar-KW', { day: 'numeric', month: 'long', year: 'numeric' });

  async function projectForm(p) {
    const isNew = !p;
    let posterBlob = null, posterUrl = p && p.posterId ? await S.urlAsync(p.posterId) : '';
    const body = h(`<form class="form" onsubmit="return false">
      <div class="poster-pick" tabindex="0" role="button" aria-label="اختيار بوستر">${posterUrl ? `<img src="${posterUrl}" alt="">` : `<div class="pp-empty">${icon('image')}<span>أضف بوستر الفيلم</span></div>`}</div>
      <div class="form-col">
        <label>عنوان الفيلم<input name="title" maxlength="80" required value="${esc(p ? p.title : '')}" placeholder="مثال: ليل الفريج"></label>
        <label>التصنيف<select name="genre">${GENRES.map(g => `<option ${p && p.genre === g ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
        <label>الفكرة في سطر (Logline)<textarea name="logline" rows="3" maxlength="300" placeholder="بطل، هدف، عقبة… في جملة واحدة مشوّقة">${esc(p ? p.logline : '')}</textarea></label>
      </div></form>`);
    const pick = $('.poster-pick', body);
    pick.onclick = async () => {
      const [f] = await pickFiles('image/*', false); if (!f) return;
      posterBlob = await downscale(f, 1000);
      pick.innerHTML = `<img src="${URL.createObjectURL(posterBlob)}" alt="">`;
    };
    const res = await modal({
      title: isNew ? 'مشروع فيلم جديد' : 'تعديل المشروع', body, wide: true,
      onOpen: (el) => setTimeout(() => $('input[name=title]', el).focus(), 120),
      actions: [{ label: 'إلغاء', value: null }, {
        label: isNew ? 'إنشاء المشروع' : 'حفظ', kind: 'gold', icon: isNew ? 'sparkles' : 'check', onClick: () => {
          const f = body; const title = f.title.value.trim();
          if (!title) { f.title.focus(); f.title.classList.add('shake'); setTimeout(() => f.title.classList.remove('shake'), 500); return false; }
          return { title, genre: f.genre.value, logline: f.logline.value.trim() };
        }
      }]
    });
    if (!res) return null;
    return { ...res, posterBlob };
  }

  async function render(main) {
    const projects = (await DB.all('projects')).sort((a, b) => b.updated - a.updated);
    const posters = {};
    for (const p of projects) if (p.posterId) posters[p.id] = await S.urlAsync(p.posterId);
    main.innerHTML = `<section class="home">
      <div class="hero">
        <div class="hero-txt"><span class="eyebrow">${icon('sparkles')} استوديو الأفلام في جيبك</span>
        <h1>اصنع فيلمك <em>من الفكرة</em> إلى الشاشة</h1>
        <p>سيناريو، لوحة قصة، جدول تصوير، ومونتاج سينمائي بتلوين احترافي — في مكان واحد.</p>
        <button class="btn gold lg" id="newProj">${icon('plus')}<span>مشروع جديد</span></button></div>
        <div class="hero-art" aria-hidden="true"><img src="assets/logo.svg" alt=""><div class="ring r1"></div><div class="ring r2"></div></div>
      </div>
      <div class="sec-head"><h2>مشاريعي <span class="count">${arNum(projects.length)}</span></h2></div>
      <div class="proj-grid">${projects.length ? projects.map((p, i) => {
        const [c1, c2] = grad(p.id); const scenes = (p.script || []).filter(l => l.type === 'scene').length;
        return `<article class="proj-card" data-id="${p.id}" style="--i:${i}">
          <a class="poster" href="#/p/${p.id}/script" style="--c1:${c1};--c2:${c2}">
            ${posters[p.id] ? `<img src="${posters[p.id]}" alt="">` : `<div class="poster-auto"><span>${esc(p.title)}</span></div>`}
            <span class="genre-chip">${esc(p.genre)}</span></a>
          <div class="pc-body"><h3><a href="#/p/${p.id}/script">${esc(p.title)}</a></h3>
            <p class="logline">${esc(p.logline || 'بدون فكرة مكتوبة بعد')}</p>
            <div class="pc-meta"><span>${icon('script')}${arNum(scenes)} مشهد</span><span>${icon('board')}${arNum((p.shots || []).length)} لقطة</span><span class="date">${fmtDate(p.updated)}</span></div>
            <div class="pc-actions">
              <a class="btn sm" href="#/p/${p.id}/edit">${icon('edit')}<span>المونتاج</span></a>
              <button class="icon-btn sm" data-act="editp" title="تعديل">${icon('pen')}</button>
              <button class="icon-btn sm" data-act="dup" title="نسخة">${icon('copy')}</button>
              <button class="icon-btn sm danger" data-act="del" title="حذف">${icon('trash')}</button>
            </div></div></article>`;
      }).join('') : `<div class="empty">${icon('film', 'big')}<h3>لا توجد مشاريع بعد</h3><p>ابدأ أول فيلم لك الآن، أو جرّب مشروعاً تجريبياً جاهزاً.</p><button class="btn" id="demoProj">${icon('sparkles')}<span>مشروع تجريبي</span></button></div>`}</div>
    </section>`;
    $('#newProj', main).onclick = async () => {
      const r = await projectForm(null); if (!r) return;
      const p = S.newProject(r);
      if (r.posterBlob) { const m = await S.addMedia(r.posterBlob, 'poster', { projectId: p.id, name: 'poster.jpg' }); p.posterId = m.id; }
      await DB.put('projects', p); toast('تم إنشاء المشروع ✨'); location.hash = `#/p/${p.id}/script`;
    };
    const demo = $('#demoProj', main);
    if (demo) demo.onclick = async () => {
      const p = S.newProject({ title: 'ليل الفريج', genre: 'دراما', logline: 'مصوّر شاب يعود إلى فريجه القديم ليوثّق آخر ليلة قبل الهدم، فيكتشف سرّاً دفنه أبوه قبل ثلاثين عاماً.' });
      const L = (type, text) => ({ id: NL.uid('l'), type, text });
      p.script = [L('scene', 'خارجي. فريج قديم في الكويت - ليل'), L('action', 'أضواء صفراء خافتة. جدران طينية متشققة. يقف سالم (٢٨) يحمل كاميرا قديمة.'), L('character', 'سالم'), L('dialogue', 'كل حجر هنا يعرف اسمي…'), L('transition', 'قطع إلى:'), L('scene', 'داخلي. بيت العائلة - الغرفة القديمة - ليل'), L('action', 'غبار يتطاير في ضوء الكشاف. صندوق خشبي تحت السرير.'), L('character', 'أم سالم (صوت)'), L('dialogue', 'لا تفتحه يا ولدي.')];
      const sc = p.script.filter(l => l.type === 'scene');
      p.shots = [
        { id: NL.uid('s'), sceneId: sc[0].id, type: 'واسعة جداً', move: 'رافعة (كرين)', lens: '24mm', dur: 6, notes: 'لقطة افتتاحية للفريج كاملاً', done: false, dayId: null, location: 'الفريج القديم', cast: '' },
        { id: NL.uid('s'), sceneId: sc[0].id, type: 'متوسطة', move: 'تتبع (Dolly)', lens: '35mm', dur: 4, notes: 'سالم يمشي باتجاه الكاميرا', done: false, dayId: null, location: 'الفريج القديم', cast: 'سالم' },
        { id: NL.uid('s'), sceneId: sc[1].id, type: 'قريبة جداً', move: 'ثابتة', lens: '85mm', dur: 3, notes: 'يد سالم على الصندوق', done: false, dayId: null, location: 'بيت العائلة', cast: 'سالم' },
      ];
      await DB.put('projects', p); location.hash = `#/p/${p.id}/script`;
    };
    $$('.proj-card', main).forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        const p = await DB.get('projects', id);
        if (b.dataset.act === 'del') {
          if (await confirmBox('حذف المشروع', `سيتم حذف «${p.title}» وكل ملفاته نهائياً من هذا الجهاز.`, 'حذف نهائي')) {
            card.classList.add('leaving'); await DB.delProject(id); toast('تم حذف المشروع'); setTimeout(() => render(main), 300);
          }
        } else if (b.dataset.act === 'editp') {
          const r = await projectForm(p); if (!r) return;
          Object.assign(p, { title: r.title, genre: r.genre, logline: r.logline, updated: Date.now() });
          if (r.posterBlob) { const m = await S.addMedia(r.posterBlob, 'poster', { projectId: p.id, name: 'poster.jpg' }); p.posterId = m.id; }
          await DB.put('projects', p); render(main);
        } else if (b.dataset.act === 'dup') {
          const q = JSON.parse(JSON.stringify(p)); q.id = NL.uid('p_'); q.title = p.title + ' (نسخة)'; q.created = q.updated = Date.now();
          const ms = await DB.mediaOf(p.id);
          // نسخ الوسائط بمعرّفات جديدة لتجنب التعارض
          const map = {};
          for (const m of ms) { const nid = NL.uid('m_'); map[m.id] = nid; await DB.put('media', { ...m, id: nid, projectId: q.id }); }
          const s = JSON.stringify(q).replace(/m_[a-z0-9]+/g, (x) => map[x] || x);
          await DB.put('projects', JSON.parse(s)); toast('تم إنشاء نسخة'); render(main);
        }
      });
    });
  }
  NL.Views = NL.Views || {};
  NL.Views.projects = { render };
  NL.projectForm = projectForm;
})(window.NL);
