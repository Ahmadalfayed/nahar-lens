/* قائمة اللقطات وجدول التصوير | جميع الحقوق محفوظة © 2026 وطن النهار */
'use strict';
(function (NL) {
  const { $, $$, esc, icon, S, h, uid, toast, modal, confirmBox, arNum } = NL;
  let root, dayFilter = 'all';
  const fmtDay = (d) => d ? new Date(d + 'T00:00').toLocaleDateString('ar-KW', { weekday: 'long', day: 'numeric', month: 'long' }) : 'بدون تاريخ';
  function render(main) {
    root = main;
    const P = S.project; P.days = P.days || [];
    const shots = P.shots; const sc = NL.sceneList();
    const list = dayFilter === 'all' ? shots : dayFilter === 'none' ? shots.filter(s => !s.dayId) : shots.filter(s => s.dayId === dayFilter);
    const done = shots.filter(s => s.done).length; const pct = shots.length ? Math.round(done / shots.length * 100) : 0;
    main.innerHTML = `<section class="shots">
      <div class="page-head"><div><h2>قائمة اللقطات وجدول التصوير</h2><p class="muted">مرتبطة تلقائياً بلوحة القصة</p></div>
        <div class="ph-actions"><button class="btn sm" id="printSheet">${icon('printer')}<span>ورقة التصوير</span></button><button class="btn gold" id="addDay">${icon('calendar')}<span>يوم تصوير</span></button></div></div>
      <div class="progress-card"><div class="pc-row"><b>نسبة الإنجاز</b><span>${arNum(done)} / ${arNum(shots.length)} لقطة · ${arNum(pct)}٪</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>
      <div class="days">${P.days.map((d, i) => {
        const ds = shots.filter(s => s.dayId === d.id); const dd = ds.filter(s => s.done).length;
        return `<button class="day-card ${dayFilter === d.id ? 'on' : ''}" data-day="${d.id}" style="--i:${i}">
          <span class="day-n">اليوم ${arNum(i + 1)}</span><b>${fmtDay(d.date)}</b>
          <span class="muted small">${icon('clock')} ${esc(d.call || '—')} · ${icon('pin')} ${esc(d.location || '—')}</span>
          <span class="day-prog">${arNum(dd)}/${arNum(ds.length)} لقطة</span><span class="day-edit" data-editday="${d.id}" title="تعديل">${icon('pen')}</span></button>`;
      }).join('')}
        <button class="day-card add" id="addDay2">${icon('plus')}<span>إضافة يوم</span></button></div>
      <div class="filter-tabs"><button data-f="all" class="${dayFilter === 'all' ? 'on' : ''}">الكل</button><button data-f="none" class="${dayFilter === 'none' ? 'on' : ''}">غير مجدولة</button>${P.days.map((d, i) => `<button data-f="${d.id}" class="${dayFilter === d.id ? 'on' : ''}">اليوم ${arNum(i + 1)}</button>`).join('')}</div>
      ${list.length ? `<div class="table-wrap"><table class="shot-table"><thead><tr><th>تم</th><th>اللقطة</th><th>المشهد</th><th>الحجم</th><th>الحركة</th><th>العدسة</th><th>المدة</th><th>الموقع</th><th>الممثلون</th><th>يوم التصوير</th></tr></thead><tbody>
        ${list.map(s => {
          const scn = sc.find(x => x.id === s.sceneId);
          return `<tr data-id="${s.id}" class="${s.done ? 'is-done' : ''}">
          <td data-l="تم"><label class="check"><input type="checkbox" data-f="done" ${s.done ? 'checked' : ''}><i>${icon('check')}</i></label></td>
          <td data-l="اللقطة"><b class="gold-txt">${NL.shotNumber(s)}</b></td>
          <td data-l="المشهد" class="ellipsis">${scn ? `${arNum(scn.num)}. ${esc(scn.text)}` : '—'}</td>
          <td data-l="الحجم">${esc(s.type)}</td><td data-l="الحركة">${esc(s.move)}</td><td data-l="العدسة">${esc(s.lens)}</td><td data-l="المدة">${arNum(s.dur)}ث</td>
          <td data-l="الموقع"><input data-f="location" value="${esc(s.location || '')}" placeholder="الموقع"></td>
          <td data-l="الممثلون"><input data-f="cast" value="${esc(s.cast || '')}" placeholder="الأسماء"></td>
          <td data-l="اليوم"><select data-f="dayId"><option value="">—</option>${P.days.map((d, i) => `<option value="${d.id}" ${s.dayId === d.id ? 'selected' : ''}>اليوم ${arNum(i + 1)}</option>`).join('')}</select></td></tr>`;
        }).join('')}</tbody></table></div>` : `<div class="empty">${icon('list', 'big')}<h3>لا توجد لقطات هنا</h3><p>أضف لقطات من «لوحة القصة» وستظهر هنا تلقائياً.</p><a class="btn" href="#/p/${P.id}/board">${icon('board')}<span>لوحة القصة</span></a></div>`}
    </section>`;
    $('#addDay', main).onclick = $('#addDay2', main).onclick = () => editDay(null);
    $('#printSheet', main).onclick = printSheet;
    $$('.filter-tabs button', main).forEach(b => b.onclick = () => { dayFilter = b.dataset.f; render(main); });
    $$('.day-card[data-day]', main).forEach(b => b.onclick = (e) => {
      if (e.target.closest('[data-editday]')) return editDay(P.days.find(d => d.id === b.dataset.day));
      dayFilter = dayFilter === b.dataset.day ? 'all' : b.dataset.day; render(main);
    });
    const tb = $('.shot-table', main);
    if (tb) tb.addEventListener('change', (e) => {
      const tr = e.target.closest('tr'); const f = e.target.dataset.f; if (!tr || !f) return;
      const s = P.shots.find(x => x.id === tr.dataset.id); S.commit();
      s[f] = f === 'done' ? e.target.checked : (e.target.value || (f === 'dayId' ? null : ''));
      if (f === 'dayId' && s.dayId && !s.location) { const d = P.days.find(x => x.id === s.dayId); if (d && d.location) s.location = d.location; }
      S.changed({ silent: true });
      if (f === 'done' || f === 'dayId') render(main);
    });
  }
  async function editDay(d) {
    const isNew = !d; const x = d || { id: uid('d'), date: new Date().toISOString().slice(0, 10), call: '07:00', location: '', notes: '' };
    const body = h(`<form class="form" onsubmit="return false">
      <div class="row2"><label>التاريخ<input type="date" name="date" value="${esc(x.date)}"></label><label>موعد الحضور<input type="time" name="call" value="${esc(x.call)}"></label></div>
      <label>الموقع<input name="location" value="${esc(x.location)}" placeholder="مثال: سوق المباركية"></label>
      <label>ملاحظات<textarea name="notes" rows="2">${esc(x.notes)}</textarea></label></form>`);
    const acts = [{ label: 'إلغاء', value: null }, { label: isNew ? 'إضافة' : 'حفظ', kind: 'gold', value: 'ok' }];
    if (!isNew) acts.unshift({ label: 'حذف', kind: 'danger ghost', icon: 'trash', value: 'del' });
    const r = await modal({ title: isNew ? 'يوم تصوير جديد' : 'تعديل يوم التصوير', body, actions: acts });
    const P = S.project;
    if (r === 'del') { if (await confirmBox('حذف اليوم', 'ستصبح لقطاته غير مجدولة.', 'حذف')) { S.commit(); P.days = P.days.filter(y => y.id !== x.id); P.shots.forEach(s => { if (s.dayId === x.id) s.dayId = null; }); dayFilter = 'all'; S.changed({ silent: true }); render(root); } return; }
    if (r !== 'ok') return;
    const f = body; S.commit();
    Object.assign(x, { date: f.date.value, call: f.call.value, location: f.location.value.trim(), notes: f.notes.value.trim() });
    if (isNew) P.days.push(x);
    P.days.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    S.changed({ silent: true }); render(root);
  }
  function printSheet() {
    const P = S.project, sc = NL.sceneList();
    const days = dayFilter !== 'all' && dayFilter !== 'none' ? P.days.filter(d => d.id === dayFilter) : P.days;
    const groups = days.map((d) => ({ title: `اليوم ${arNum(P.days.indexOf(d) + 1)} — ${fmtDay(d.date)} · حضور ${d.call || '—'} · ${d.location || ''}`, notes: d.notes, shots: P.shots.filter(s => s.dayId === d.id) }));
    const un = P.shots.filter(s => !s.dayId); if (dayFilter === 'all' || dayFilter === 'none') groups.push({ title: 'لقطات غير مجدولة', shots: un });
    const area = h(`<div id="print-area" class="sheet" dir="rtl"><h1>${esc(P.title)} — ورقة التصوير</h1>
      ${groups.filter(g => g.shots.length).map(g => `<h2>${esc(g.title)}</h2>${g.notes ? `<p>${esc(g.notes)}</p>` : ''}<table><thead><tr><th>✓</th><th>اللقطة</th><th>المشهد</th><th>الحجم</th><th>الحركة</th><th>العدسة</th><th>المدة</th><th>الموقع</th><th>الممثلون</th><th>ملاحظات</th></tr></thead><tbody>
      ${g.shots.map(s => { const n = sc.find(x => x.id === s.sceneId); return `<tr><td>${s.done ? '✓' : '☐'}</td><td>${NL.shotNumber(s)}</td><td>${n ? arNum(n.num) + '. ' + esc(n.text) : ''}</td><td>${esc(s.type)}</td><td>${esc(s.move)}</td><td>${esc(s.lens)}</td><td>${arNum(s.dur)}ث</td><td>${esc(s.location || '')}</td><td>${esc(s.cast || '')}</td><td>${esc(s.notes || '')}</td></tr>`; }).join('')}</tbody></table>`).join('')}
      <p class="pr-copy">جميع الحقوق محفوظة © 2026 وطن النهار · عدسة النهار</p></div>`);
    document.body.appendChild(area); document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); area.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { window.print(); setTimeout(() => { if (!window.__keepPrint) done(); }, 1500); }, 60);
  }
  NL.Views = NL.Views || {};
  NL.Views.shots = { render, refresh() { if (root) render(root); }, destroy() { root = null; } };
})(window.NL);
