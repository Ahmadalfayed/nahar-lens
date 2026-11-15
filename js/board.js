/* لوحة القصة | جميع الحقوق محفوظة © 2026 وطن النهار */
'use strict';
(function (NL) {
  const { $, $$, esc, icon, S, h, uid, toast, modal, confirmBox, pickFiles, downscale, sortable, arNum } = NL;
  const SHOT_TYPES = ['واسعة جداً', 'واسعة', 'متوسطة واسعة', 'متوسطة', 'متوسطة قريبة', 'قريبة', 'قريبة جداً', 'تفصيلية', 'من فوق الكتف', 'وجهة نظر (POV)', 'علوية (عين الطائر)', 'منخفضة'];
  const MOVES = ['ثابتة', 'استدارة أفقية (Pan)', 'إمالة (Tilt)', 'تتبع (Dolly)', 'زووم', 'محمولة باليد', 'جيمبل (Steadicam)', 'رافعة (كرين)', 'درون', 'دائرية (Arc)'];
  const LENSES = ['14mm', '24mm', '35mm', '50mm', '85mm', '135mm', 'ماكرو'];
  NL.SHOT = { SHOT_TYPES, MOVES, LENSES };
  let root, filter = 'all';
  const shots = () => S.project.shots;

  function shotNumber(s) {
    const sc = NL.sceneList(); const scene = sc.find(x => x.id === s.sceneId);
    const inScene = shots().filter(x => x.sceneId === s.sceneId); const k = inScene.indexOf(s) + 1;
    return scene ? `${arNum(scene.num)}-${arNum(k)}` : arNum(shots().indexOf(s) + 1);
  }
  NL.shotNumber = shotNumber;

  function render(main) {
    root = main;
    const sc = NL.sceneList();
    const list = filter === 'all' ? shots() : shots().filter(s => s.sceneId === filter);
    const totalDur = shots().reduce((a, s) => a + (+s.dur || 0), 0);
    main.innerHTML = `<section class="board">
      <div class="page-head"><div><h2>لوحة القصة</h2><p class="muted">${arNum(shots().length)} لقطة · المدة التقديرية ${NL.fmtTime(totalDur)}</p></div>
        <div class="ph-actions">
          <select id="sceneFilter" class="select"><option value="all">كل المشاهد</option>${sc.map(s => `<option value="${s.id}" ${filter === s.id ? 'selected' : ''}>مشهد ${arNum(s.num)}: ${esc(s.text.slice(0, 32))}</option>`).join('')}</select>
          <button class="btn sm" id="animatic" title="ضع صور اللقطات على الخط الزمني">${icon('film')}<span>أنيماتك</span></button>
          <button class="btn gold" id="addShot">${icon('plus')}<span>لقطة</span></button>
        </div></div>
      <div class="sb-grid" id="sbGrid">${list.length ? list.map((s, i) => card(s, i)).join('') : `<div class="empty">${icon('board', 'big')}<h3>لا توجد لقطات</h3><p>أضف أول لقطة وارسمها أو ارفع صورة مرجعية.</p></div>`}</div>
    </section>`;
    $$('.sb-card img[data-mid]', main).forEach(async img => { img.src = await S.urlAsync(img.dataset.mid); });
    $('#sceneFilter', main).onchange = (e) => { filter = e.target.value; render(main); };
    $('#addShot', main).onclick = () => editShot(null);
    $('#animatic', main).onclick = makeAnimatic;
    const grid = $('#sbGrid', main);
    grid.addEventListener('click', (e) => {
      const c = e.target.closest('.sb-card'); if (!c || e.target.closest('.sb-handle')) return;
      const s = shots().find(x => x.id === c.dataset.id);
      const act = e.target.closest('[data-act]');
      if (act && act.dataset.act === 'draw') return drawShot(s);
      if (act && act.dataset.act === 'img') return uploadImg(s);
      editShot(s);
    });
    sortable(grid, '.sb-card', '.sb-handle', (from, to) => {
      S.commit();
      const ids = $$('.sb-card', grid).map(c => c.dataset.id);
      const visible = new Set(ids);
      const others = shots().filter(s => !visible.has(s.id));
      const ordered = ids.map(id => shots().find(s => s.id === id));
      if (filter === 'all') S.project.shots = ordered;
      else { // أعد دمج الترتيب داخل المشهد مع بقية اللقطات
        let k = 0; S.project.shots = shots().map(s => visible.has(s.id) ? ordered[k++] : s); void others;
      }
      S.changed({ silent: true }); render(main); toast('تم إعادة الترتيب');
    });
  }
  function card(s, i) {
    const sc = NL.sceneList().find(x => x.id === s.sceneId);
    return `<article class="sb-card" data-id="${s.id}" style="--i:${i}">
      <div class="sb-frame">${s.imageId ? `<img data-mid="${s.imageId}" alt="">` : `<div class="sb-empty"><button class="btn sm" data-act="draw">${icon('pen')}<span>ارسم</span></button><button class="btn sm" data-act="img">${icon('image')}<span>صورة</span></button></div>`}
        <span class="sb-num">لقطة ${shotNumber(s)}</span><button class="sb-handle" title="اسحب لإعادة الترتيب" aria-label="سحب">${icon('grip')}</button>
        ${s.done ? `<span class="sb-done">${icon('check')}</span>` : ''}</div>
      <div class="sb-info"><div class="sb-scene">${sc ? `مشهد ${arNum(sc.num)} · ${esc(sc.text.slice(0, 40))}` : 'بدون مشهد'}</div>
        <div class="sb-tags"><span>${icon('camera')}${esc(s.type)}</span><span>${icon('move')}${esc(s.move)}</span><span>${esc(s.lens)}</span><span>${icon('clock')}${arNum(s.dur || 0)}ث</span></div>
        ${s.notes ? `<p class="sb-notes">${esc(s.notes)}</p>` : ''}</div></article>`;
  }
  async function uploadImg(s) {
    const [f] = await pickFiles('image/*', false); if (!f) return;
    const b = await downscale(f, 1280); const m = await S.addMedia(b, 'board', { name: 'shot.jpg' });
    S.commit(); s.imageId = m.id; S.changed({ silent: true }); render(root);
  }
  async function editShot(s) {
    const isNew = !s; const sc = NL.sceneList();
    const d = s || { id: uid('s'), sceneId: filter !== 'all' ? filter : (sc[sc.length - 1] || {}).id || null, type: 'متوسطة', move: 'ثابتة', lens: '35mm', dur: 4, notes: '', done: false, dayId: null, location: '', cast: '', imageId: null };
    let imageId = d.imageId;
    const opt = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
    const body = h(`<form class="form shot-form" onsubmit="return false">
      <div class="sf-img">${imageId ? `<img alt="">` : `<div class="pp-empty">${icon('image')}<span>لا توجد صورة</span></div>`}
        <div class="sf-img-btns"><button type="button" class="btn sm" data-a="img">${icon('image')}<span>رفع صورة</span></button><button type="button" class="btn sm" data-a="draw">${icon('pen')}<span>رسم</span></button></div></div>
      <label>المشهد<select name="sceneId"><option value="">— بدون —</option>${sc.map(x => `<option value="${x.id}" ${x.id === d.sceneId ? 'selected' : ''}>مشهد ${arNum(x.num)}: ${esc(x.text.slice(0, 40))}</option>`).join('')}</select></label>
      <div class="row2"><label>حجم اللقطة<select name="type">${opt(SHOT_TYPES, d.type)}</select></label><label>حركة الكاميرا<select name="move">${opt(MOVES, d.move)}</select></label></div>
      <div class="row2"><label>العدسة<select name="lens">${opt(LENSES, d.lens)}</select></label><label>المدة (ثانية)<input name="dur" type="number" min="0.5" max="600" step="0.5" value="${d.dur}"></label></div>
      <label>ملاحظات<textarea name="notes" rows="3" placeholder="الحركة، الإضاءة، الأداء…">${esc(d.notes)}</textarea></label>
    </form>`);
    const imgBox = $('.sf-img', body);
    const showImg = async () => { if (imageId) { imgBox.querySelector('img, .pp-empty').outerHTML = `<img src="${await S.urlAsync(imageId)}" alt="">`; } };
    showImg();
    body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'img') { const [f] = await pickFiles('image/*', false); if (!f) return; const bl = await downscale(f, 1280); imageId = (await S.addMedia(bl, 'board', { name: 'shot.jpg' })).id; showImg(); }
      else { const id = await drawCanvas(imageId); if (id) { imageId = id; showImg(); } }
    });
    const actions = [{ label: 'إلغاء', value: null }];
    if (!isNew) actions.unshift({ label: 'حذف', kind: 'danger ghost', icon: 'trash', value: 'del' });
    actions.push({ label: isNew ? 'إضافة' : 'حفظ', kind: 'gold', icon: 'check', value: 'ok' });
    const r = await modal({ title: isNew ? 'لقطة جديدة' : `لقطة ${shotNumber(s)}`, body, actions, wide: true });
    if (r === 'del') { if (await confirmBox('حذف اللقطة', 'هل تريد حذف هذه اللقطة؟', 'حذف')) { S.commit(); S.project.shots = shots().filter(x => x.id !== d.id); S.changed({ silent: true }); render(root); } return; }
    if (r !== 'ok') return;
    const f = body;
    S.commit();
    Object.assign(d, { sceneId: f.sceneId.value || null, type: f.type.value, move: f.move.value, lens: f.lens.value, dur: Math.max(0.5, +f.dur.value || 4), notes: f.notes.value.trim(), imageId });
    if (isNew) shots().push(d);
    S.changed({ silent: true }); render(root); toast(isNew ? 'أضيفت اللقطة' : 'تم الحفظ');
  }
  async function drawShot(s) { const id = await drawCanvas(s.imageId); if (id) { S.commit(); s.imageId = id; S.changed({ silent: true }); render(root); } }

  // لوحة رسم بالقلم/الإصبع
  async function drawCanvas(bgId) {
    const W = 1280, H = 720; let color = '#111111', size = 6, erasing = false; const strokes = [];
    const body = h(`<div class="draw">
      <div class="draw-tools">
        ${['#111111', '#ffffff', '#e7b453', '#d64545', '#3d8bd6'].map((c, i) => `<button class="swatch ${i === 0 ? 'on' : ''}" data-c="${c}" style="--c:${c}" aria-label="لون"></button>`).join('')}
        <span class="sep"></span>
        ${[3, 6, 12, 24].map(n => `<button class="size ${n === 6 ? 'on' : ''}" data-s="${n}"><i style="width:${Math.min(18, n)}px;height:${Math.min(18, n)}px"></i></button>`).join('')}
        <span class="sep"></span>
        <button class="icon-btn" data-t="eraser" title="ممحاة">${icon('eraser')}</button>
        <button class="icon-btn" data-t="undo" title="تراجع">${icon('undo')}</button>
        <button class="icon-btn" data-t="grid" title="خطوط الأثلاث">${icon('board')}</button>
        <button class="icon-btn danger" data-t="clear" title="مسح">${icon('trash')}</button>
      </div>
      <div class="draw-stage"><canvas width="${W}" height="${H}"></canvas><div class="thirds"></div></div></div>`);
    const cv = $('canvas', body), ctx = cv.getContext('2d');
    let bg = null;
    const redraw = () => {
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, W, H);
      if (bg) { const s = Math.max(W / bg.width, H / bg.height); ctx.drawImage(bg, (W - bg.width * s) / 2, (H - bg.height * s) / 2, bg.width * s, bg.height * s); }
      strokes.forEach(st => { ctx.strokeStyle = st.erase ? '#f4f1ea' : st.c; ctx.lineWidth = st.s; ctx.lineCap = ctx.lineJoin = 'round'; ctx.beginPath(); st.p.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (st.p.length === 1) ctx.lineTo(st.p[0][0] + .1, st.p[0][1]); ctx.stroke(); });
    };
    if (bgId) { const img = new Image(); img.onload = () => { bg = img; redraw(); }; img.src = await S.urlAsync(bgId); }
    redraw();
    body.addEventListener('click', (e) => {
      const sw = e.target.closest('.swatch'); if (sw) { $$('.swatch', body).forEach(x => x.classList.remove('on')); sw.classList.add('on'); color = sw.dataset.c; erasing = false; $('[data-t=eraser]', body).classList.remove('on'); }
      const sz = e.target.closest('.size'); if (sz) { $$('.size', body).forEach(x => x.classList.remove('on')); sz.classList.add('on'); size = +sz.dataset.s; }
      const t = e.target.closest('[data-t]'); if (!t) return;
      if (t.dataset.t === 'eraser') { erasing = !erasing; t.classList.toggle('on', erasing); }
      if (t.dataset.t === 'undo') { strokes.pop(); redraw(); }
      if (t.dataset.t === 'clear') { strokes.length = 0; bg = null; redraw(); }
      if (t.dataset.t === 'grid') { $('.thirds', body).classList.toggle('on'); t.classList.toggle('on'); }
    });
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    let cur = null;
    cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = { c: color, s: erasing ? size * 3 : size * (e.pressure && e.pointerType === 'pen' ? .5 + e.pressure : 1), erase: erasing, p: [pos(e)] }; strokes.push(cur); redraw(); });
    cv.addEventListener('pointermove', (e) => { if (!cur) return; cur.p.push(pos(e)); redraw(); });
    const end = () => { cur = null; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    const r = await modal({ title: 'رسم اللقطة', body, wide: true, cls: 'draw-modal', actions: [{ label: 'إلغاء', value: null }, { label: 'حفظ الرسم', kind: 'gold', icon: 'check', value: 'ok' }] });
    if (r !== 'ok') return null;
    const blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', .9));
    return (await S.addMedia(blob, 'board', { name: 'sketch.jpg' })).id;
  }
  async function makeAnimatic() {
    const withImg = shots().filter(s => s.imageId);
    if (!withImg.length) return toast('أضف صوراً أو رسومات للّقطات أولاً', 'err');
    S.commit();
    const tr = S.project.edit.tracks.find(t => t.id === 'v1');
    let t = tr.clips.reduce((a, c) => Math.max(a, c.start + NL.clipDur(c)), 0);
    withImg.forEach(s => { tr.clips.push(NL.newClip({ mediaId: s.imageId, kind: 'image', start: t, dur: +s.dur || 3 })); t += +s.dur || 3; });
    S.changed({ silent: true }); toast(`تمت إضافة ${arNum(withImg.length)} لقطة إلى المونتاج`);
    location.hash = `#/p/${S.project.id}/edit`;
  }
  NL.Views = NL.Views || {};
  NL.Views.board = { render, refresh() { if (root) render(root); }, destroy() { root = null; } };
})(window.NL);
