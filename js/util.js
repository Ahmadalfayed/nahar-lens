/* عدسة النهار — أدوات مشتركة | جميع الحقوق محفوظة © 2026 وطن النهار */
'use strict';
window.NL = window.NL || {};
(function (NL) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const arNum = (n) => String(n).replace(/[0-9]/g, d => AR_DIGITS[d]);
  function fmtTime(t, frames = false, fps = 30) {
    t = Math.max(0, t || 0);
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    let out = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    if (frames) out += ':' + String(Math.floor((t % 1) * fps)).padStart(2, '0');
    return out;
  }
  function debounce(fn, ms) { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; }
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  // أيقونات SVG مرسومة يدوياً (خطوط) — بدون أي مكتبات خارجية
  const P = {
    film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"/>',
    script: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    board: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
    edit: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 12h20M8 5v14M16 5v14"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
    back: '<path d="M9 6l6 6-6 6"/>',
    split: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/>',
    magnet: '<path d="M6 15V8a6 6 0 0 1 12 0v7a6 6 0 0 1-12 0z"/><path d="M6 8h4M14 8h4"/>',
    zoomin: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>',
    zoomout: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    grip: '<circle cx="9" cy="6" r="1.3" fill="currentColor"/><circle cx="15" cy="6" r="1.3" fill="currentColor"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><circle cx="9" cy="18" r="1.3" fill="currentColor"/><circle cx="15" cy="18" r="1.3" fill="currentColor"/>',
    sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    camera: '<path d="M15 10l5-3v10l-5-3z"/><rect x="2" y="6" width="13" height="12" rx="2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    diamond: '<path d="M12 3l9 9-9 9-9-9z"/>',
    skipb: '<path d="M18 5v14L8 12z" fill="currentColor"/><path d="M6 5v14"/>',
    skipf: '<path d="M6 5v14l10-7z" fill="currentColor"/><path d="M18 5v14"/>',
    printer: '<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2"/><rect x="6" y="14" width="12" height="7"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.3" fill="currentColor"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/><circle cx="16" cy="10" r="1.3" fill="currentColor"/><path d="M12 21a2.5 2.5 0 0 1 0-5h2a3 3 0 0 0 3-3"/>',
    move: '<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
    gauge: '<path d="M12 14l4-4"/><path d="M3.3 17a9 9 0 1 1 17.4 0"/>',
    volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
    eraser: '<path d="M20 20H8l-5-5 10-10 8 8-6 7"/><path d="M8.5 9.5l6 6"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    wand: '<path d="M15 4V2M15 10V8M12 5h-2M20 5h-2M18 2.5l-1.2 1.2M18 7.5l-1.2-1.2"/><path d="M3 21l11-11 1.5 1.5L4.5 22.5z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  // إشعارات منبثقة
  function toast(msg, kind = '') {
    let wrap = $('#toasts');
    const el = h(`<div class="toast ${kind}">${esc(msg)}</div>`);
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, 2600);
  }
  // نافذة حوار عامة
  function modal({ title, body, actions = [], wide = false, onOpen, cls = '' }) {
    return new Promise((resolve) => {
      const el = h(`<div class="modal-back"><div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true">
        <div class="modal-head"><h3>${esc(title || '')}</h3><button class="icon-btn m-close" aria-label="إغلاق">${icon('x')}</button></div>
        <div class="modal-body"></div><div class="modal-actions"></div></div></div>`);
      const bodyEl = $('.modal-body', el);
      if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
      const close = (v) => { el.classList.remove('in'); document.removeEventListener('keydown', onKey); setTimeout(() => el.remove(), 250); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') close(null); };
      actions.forEach(a => {
        const b = h(`<button class="btn ${a.kind || ''}">${a.icon ? icon(a.icon) : ''}<span>${esc(a.label)}</span></button>`);
        b.onclick = async () => { const v = a.onClick ? await a.onClick(el) : a.value; if (v !== false) close(v === undefined ? a.value : v); };
        $('.modal-actions', el).appendChild(b);
      });
      $('.m-close', el).onclick = () => close(null);
      el.addEventListener('pointerdown', (e) => { if (e.target === el) close(null); });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('in'));
      onOpen && onOpen(el, close);
    });
  }
  const confirmBox = (title, text, okLabel = 'تأكيد', danger = true) => modal({
    title, body: `<p class="muted">${esc(text)}</p>`,
    actions: [{ label: 'إلغاء', value: false }, { label: okLabel, kind: danger ? 'danger' : 'gold', value: true }]
  });

  function pickFiles(accept, multiple = true) {
    return new Promise(res => {
      const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple;
      i.style.display = 'none'; document.body.appendChild(i);
      i.onchange = () => { res(Array.from(i.files || [])); i.remove(); };
      i.click();
    });
  }
  // تصغير صورة إلى Blob (للبوستر ولوحة القصة)
  function downscale(src, max = 1280, q = .86) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => res(b), 'image/jpeg', q);
      };
      img.onerror = rej;
      img.src = typeof src === 'string' ? src : URL.createObjectURL(src);
    });
  }
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  // سحب وإعادة ترتيب بالمؤشر (يعمل باللمس على آيفون وهواوي)
  function sortable(container, itemSel, handleSel, onDone) {
    container.addEventListener('pointerdown', (e) => {
      const handle = e.target.closest(handleSel); if (!handle || !container.contains(handle)) return;
      const item = handle.closest(itemSel); if (!item) return;
      e.preventDefault();
      const items = $$(itemSel, container); const from = items.indexOf(item);
      const r0 = item.getBoundingClientRect();
      const ghost = item.cloneNode(true); ghost.classList.add('drag-ghost');
      Object.assign(ghost.style, { width: r0.width + 'px', height: r0.height + 'px', left: r0.left + 'px', top: r0.top + 'px' });
      document.body.appendChild(ghost); item.classList.add('drag-src');
      const dx = e.clientX - r0.left, dy = e.clientY - r0.top;
      const move = (ev) => {
        ghost.style.left = (ev.clientX - dx) + 'px'; ghost.style.top = (ev.clientY - dy) + 'px';
        const over = document.elementFromPoint(ev.clientX, ev.clientY);
        const tgt = over && over.closest(itemSel);
        if (tgt && tgt !== item && container.contains(tgt)) {
          const rr = tgt.getBoundingClientRect();
          const all = $$(itemSel, container);
          const after = all.indexOf(tgt) > all.indexOf(item);
          container.insertBefore(item, after ? tgt.nextSibling : tgt);
          void rr;
        }
      };
      const up = () => {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
        ghost.remove(); item.classList.remove('drag-src');
        const to = $$(itemSel, container).indexOf(item);
        if (to !== from) onDone(from, to);
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    });
  }
  Object.assign(NL, { $, $$, esc, uid, clamp, lerp, ease, arNum, fmtTime, debounce, h, icon, toast, modal, confirmBox, pickFiles, downscale, download, sortable });
})(window.NL);
