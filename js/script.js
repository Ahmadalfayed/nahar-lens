/* محرر السيناريو | جميع الحقوق محفوظة © 2026 وطن النهار */
'use strict';
(function (NL) {
  const { $, $$, esc, icon, S, h, uid, toast, download, arNum } = NL;
  const TYPES = [
    { id: 'scene', label: 'مشهد', key: '1', hint: 'داخلي/خارجي. المكان - الوقت' },
    { id: 'action', label: 'وصف', key: '2', hint: 'صف ما يحدث على الشاشة…' },
    { id: 'character', label: 'شخصية', key: '3', hint: 'اسم الشخصية' },
    { id: 'paren', label: 'توجيه', key: '4', hint: '(بهمس)' },
    { id: 'dialogue', label: 'حوار', key: '5', hint: 'ماذا تقول الشخصية؟' },
    { id: 'transition', label: 'انتقال', key: '6', hint: 'قطع إلى:' },
  ];
  const NEXT = { scene: 'action', action: 'action', character: 'dialogue', paren: 'dialogue', dialogue: 'character', transition: 'scene' };
  let root, paper, activeId = null, dirtyFocus = false;

  const lines = () => S.project.script;
  function sceneNums() { let n = 0; const map = {}; lines().forEach(l => { if (l.type === 'scene') map[l.id] = ++n; }); return map; }
  NL.sceneList = () => { const nums = sceneNums(); return lines().filter(l => l.type === 'scene').map(l => ({ id: l.id, num: nums[l.id], text: l.text })); };

  function lineEl(l, nums) {
    const t = TYPES.find(x => x.id === l.type) || TYPES[1];
    return `<div class="sl sl-${l.type}" data-id="${l.id}" ${l.type === 'scene' ? `data-num="${arNum(nums[l.id])}"` : ''} contenteditable="true" spellcheck="false" data-ph="${esc(t.hint)}">${esc(l.text)}</div>`;
  }
  function renderPaper(focusId, caretEnd = true) {
    const nums = sceneNums();
    paper.innerHTML = lines().map(l => lineEl(l, nums)).join('');
    renderNav(); renderStats();
    if (focusId) focusLine(focusId, caretEnd);
  }
  function renumber() { const nums = sceneNums(); $$('.sl-scene', paper).forEach(el => el.dataset.num = arNum(nums[el.dataset.id] || '')); renderNav(); }
  function renderNav() {
    const nav = $('.scene-nav-list', root); if (!nav) return;
    const sc = NL.sceneList();
    nav.innerHTML = sc.length ? sc.map(s => `<button data-id="${s.id}"><b>${arNum(s.num)}</b><span>${esc(s.text || 'مشهد بلا عنوان')}</span></button>`).join('') : '<p class="muted small">لا مشاهد بعد</p>';
  }
  function renderStats() {
    const st = $('.script-stats', root); if (!st) return;
    const words = lines().reduce((a, l) => a + (l.text.trim() ? l.text.trim().split(/\s+/).length : 0), 0);
    const sc = lines().filter(l => l.type === 'scene').length;
    const chars = new Set(lines().filter(l => l.type === 'character' && l.text.trim()).map(l => l.text.trim().replace(/\s*\(.*\)$/, ''))).size;
    st.innerHTML = `<span>${arNum(sc)} مشهد</span><span>${arNum(chars)} شخصية</span><span>${arNum(words)} كلمة</span><span>≈ ${arNum(Math.max(1, Math.round(words / 160)))} دقيقة</span>`;
    renderChips();
  }
  function renderChips() {
    const box = $('.char-chips', root); if (!box) return;
    const names = [...new Set(lines().filter(l => l.type === 'character' && l.text.trim()).map(l => l.text.trim()))].slice(0, 12);
    box.innerHTML = names.map(n => `<button class="chip" data-name="${esc(n)}">${esc(n)}</button>`).join('');
  }
  function focusLine(id, end = true) {
    const el = paper.querySelector(`[data-id="${id}"]`); if (!el) return;
    el.focus();
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(!end ? true : false);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function caretOffset(el) {
    const sel = getSelection(); if (!sel.rangeCount) return el.textContent.length;
    const r = sel.getRangeAt(0); const pre = r.cloneRange(); pre.selectNodeContents(el); pre.setEnd(r.endContainer, r.endOffset);
    return pre.toString().length;
  }
  function setType(type) {
    const id = activeId || (lines()[lines().length - 1] || {}).id; if (!id) return;
    const l = lines().find(x => x.id === id); if (!l || l.type === type) return;
    S.commit(); l.type = type; S.changed({ silent: true });
    const el = paper.querySelector(`[data-id="${id}"]`);
    el.className = 'sl sl-' + type; el.dataset.ph = TYPES.find(t => t.id === type).hint;
    if (type === 'scene') el.dataset.num = ''; else delete el.dataset.num;
    renumber(); renderStats(); updateToolbar(); focusLine(id);
  }
  function updateToolbar() {
    const l = lines().find(x => x.id === activeId);
    $$('.type-btn', root).forEach(b => b.classList.toggle('on', !!l && b.dataset.type === l.type));
    const chips = $('.char-chips', root); if (chips) chips.classList.toggle('show', !!l && l.type === 'character');
  }

  function render(main) {
    root = main;
    main.innerHTML = `<div class="script-wrap">
      <aside class="scene-nav"><div class="nav-head">${icon('script')}<b>المشاهد</b></div><div class="scene-nav-list"></div></aside>
      <section class="script-main">
        <div class="script-toolbar">
          <div class="type-btns">${TYPES.map(t => `<button class="type-btn" data-type="${t.id}" title="${t.label} (Alt+${t.key})">${t.label}</button>`).join('')}</div>
          <div class="tb-end">
            <button class="btn sm" id="addScene">${icon('plus')}<span>مشهد</span></button>
            <button class="btn sm" id="exportTxt" title="تصدير نص">${icon('download')}<span>نص</span></button>
            <button class="btn sm gold" id="exportPdf">${icon('printer')}<span>PDF</span></button>
          </div>
        </div>
        <div class="char-chips"></div>
        <div class="paper-scroll"><div class="paper"><div class="paper-title"><h2>${esc(S.project.title)}</h2><p>${esc(S.project.logline || '')}</p></div><div class="paper-lines" id="paperLines"></div></div>
        <p class="script-help muted small">Enter سطر جديد · Tab تغيير النوع · Alt+1..6 اختيار النوع مباشرة</p></div>
        <div class="script-stats"></div>
      </section></div>`;
    paper = $('#paperLines', main);
    renderPaper();
    $$('.type-btn', main).forEach(b => b.addEventListener('mousedown', e => e.preventDefault()));
    $$('.type-btn', main).forEach(b => b.onclick = () => setType(b.dataset.type));
    $('.char-chips', main).addEventListener('mousedown', e => e.preventDefault());
    $('.char-chips', main).onclick = (e) => {
      const c = e.target.closest('.chip'); if (!c || !activeId) return;
      const l = lines().find(x => x.id === activeId); S.commit(); l.text = c.dataset.name; S.changed({ silent: true });
      paper.querySelector(`[data-id="${activeId}"]`).textContent = l.text; newLineAfter(l, 'dialogue');
    };
    $('.scene-nav-list', main).onclick = (e) => { const b = e.target.closest('button'); if (b) focusLine(b.dataset.id); };
    $('#addScene', main).onclick = () => { S.commit(); const l = { id: uid('l'), type: 'scene', text: '' }; lines().push(l, { id: uid('l'), type: 'action', text: '' }); S.changed({ silent: true }); renderPaper(l.id); };
    $('#exportPdf', main).onclick = printScript;
    $('#exportTxt', main).onclick = () => {
      const nums = sceneNums();
      const txt = lines().map(l => l.type === 'scene' ? `\n${nums[l.id]}. ${l.text}` : l.type === 'character' ? `\n\t\t${l.text}` : l.type === 'dialogue' ? `\t${l.text}` : l.type === 'paren' ? `\t\t(${l.text.replace(/[()]/g, '')})` : l.type === 'transition' ? `\n\t\t\t${l.text}` : `\n${l.text}`).join('\n');
      download(new Blob([`${S.project.title}\n${S.project.logline}\n\nجميع الحقوق محفوظة © 2026 وطن النهار\n` + txt], { type: 'text/plain;charset=utf-8' }), `${S.project.title}-سيناريو.txt`);
    };

    paper.addEventListener('focusin', (e) => { const el = e.target.closest('.sl'); if (!el) return; activeId = el.dataset.id; dirtyFocus = false; updateToolbar(); });
    paper.addEventListener('input', (e) => {
      const el = e.target.closest('.sl'); if (!el) return;
      const l = lines().find(x => x.id === el.dataset.id); if (!l) return;
      if (!dirtyFocus) { S.commit(); dirtyFocus = true; }
      if (el.innerHTML.includes('<')) { const t = el.textContent; el.textContent = t; focusLine(l.id); }
      l.text = el.textContent;
      S.changed({ silent: true });
      if (l.type === 'scene') renderNav();
      renderStatsSoon();
    });
    paper.addEventListener('paste', (e) => {
      e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, t.replace(/\r?\n/g, ' '));
    });
    paper.addEventListener('keydown', onLineKey);
    $('.paper-scroll', main).addEventListener('click', (e) => {
      if (e.target.closest('.sl')) return;
      if (e.target.closest('.paper')) { const last = lines()[lines().length - 1]; if (last) focusLine(last.id); }
    });
  }
  const renderStatsSoon = NL.debounce(() => renderStats(), 400);
  function newLineAfter(l, type, text = '') {
    const idx = lines().indexOf(l);
    const nl = { id: uid('l'), type, text };
    lines().splice(idx + 1, 0, nl);
    S.changed({ silent: true }); dirtyFocus = true;
    const nums = sceneNums();
    const el = h(lineEl(nl, nums));
    const cur = paper.querySelector(`[data-id="${l.id}"]`);
    cur.after(el); renumber(); activeId = nl.id; focusLine(nl.id, false); updateToolbar(); renderStatsSoon();
  }
  function onLineKey(e) {
    const el = e.target.closest('.sl'); if (!el) return;
    const l = lines().find(x => x.id === el.dataset.id); if (!l) return;
    if (e.altKey && /^[1-6]$/.test(e.key)) { e.preventDefault(); setType(TYPES[+e.key - 1].id); return; }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); if (e.isComposing) return;
      S.commit();
      const off = caretOffset(el); const txt = el.textContent;
      if (!txt.trim() && l.type !== 'action') { setType(l.type === 'dialogue' ? 'action' : 'action'); return; }
      l.text = txt.slice(0, off); el.textContent = l.text;
      newLineAfter(l, NEXT[l.type] || 'action', txt.slice(off));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const order = TYPES.map(t => t.id); const i = order.indexOf(l.type);
      setType(order[(i + (e.shiftKey ? order.length - 1 : 1)) % order.length]);
    } else if (e.key === 'Backspace' && caretOffset(el) === 0 && getSelection().isCollapsed) {
      const idx = lines().indexOf(l); if (idx === 0) return;
      e.preventDefault(); S.commit();
      const prev = lines()[idx - 1]; const prevLen = prev.text.length;
      prev.text += l.text; lines().splice(idx, 1); S.changed({ silent: true });
      const pel = paper.querySelector(`[data-id="${prev.id}"]`); pel.textContent = prev.text; el.remove(); renumber(); renderStatsSoon();
      pel.focus(); const r = document.createRange(); if (pel.firstChild) { r.setStart(pel.firstChild, prevLen); r.collapse(true); } else { r.selectNodeContents(pel); r.collapse(false); }
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const idx = lines().indexOf(l); const off = caretOffset(el);
      if (e.key === 'ArrowUp' && off === 0 && idx > 0) { e.preventDefault(); focusLine(lines()[idx - 1].id); }
      if (e.key === 'ArrowDown' && off === el.textContent.length && idx < lines().length - 1) { e.preventDefault(); focusLine(lines()[idx + 1].id, false); }
    }
  }
  function printScript() {
    const nums = sceneNums();
    const area = h(`<div id="print-area" dir="rtl">
      <div class="pr-title"><div><h1>${esc(S.project.title)}</h1><p class="pr-genre">${esc(S.project.genre)}</p><p class="pr-log">${esc(S.project.logline || '')}</p></div>
      <p class="pr-copy">جميع الحقوق محفوظة © 2026 وطن النهار<br>عدسة النهار · Nahar Lens</p></div>
      <div class="pr-body">${lines().filter(l => l.text.trim()).map(l => `<p class="pl pl-${l.type}">${l.type === 'scene' ? `<span class="pn">${arNum(nums[l.id])}</span>` : ''}${esc(l.type === 'paren' && !/^\(/.test(l.text) ? '(' + l.text + ')' : l.text)}</p>`).join('')}</div></div>`);
    document.body.appendChild(area); document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); area.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { window.print(); setTimeout(() => { if (document.body.classList.contains('printing') && !window.__keepPrint) done(); }, 1500); }, 60);
    toast('اختر «حفظ كملف PDF» من نافذة الطباعة');
  }
  NL.Views = NL.Views || {};
  NL.Views.script = { render, refresh() { if (root) render(root); }, destroy() { root = null; } };
  NL.printScript = printScript;
})(window.NL);
