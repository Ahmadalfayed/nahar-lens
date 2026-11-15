/* المونتاج: الخط الزمني، المعاينة، والخصائص | جميع الحقوق محفوظة © 2026 وطن النهار */
'use strict';
(function (NL) {
  const { $, $$, esc, icon, S, h, uid, toast, clamp, pickFiles, downscale, fmtTime, arNum, Engine, clipDur, newClip, kfValue, setKf, PRESETS, RAMPS, defGrade } = NL;
  const ASPECTS = { '16:9': [16, 9], '2.39': [16, 9], '9:16': [9, 16], '1:1': [1, 1], '4:5': [4, 5] };
  const TRANS = { none: 'بدون', dissolve: 'مزج متقاطع', fade: 'تلاشٍ عبر الأسود', wipe: 'مسح', slide: 'انزلاق', zoom: 'تكبير' };
  const TEXT_STYLES = { title: 'عنوان رئيسي', lower: 'شريط اسم (Lower third)', subtitle: 'ترجمة سفلية', credits: 'شارة نهاية متحركة' };
  const TEXT_ANIMS = { rise: 'صعود ناعم', fade: 'تلاشٍ', zoom: 'تكبير', type: 'آلة كاتبة', none: 'بدون' };
  const KB_DIRS = { in: 'تقريب', out: 'إبعاد', left: 'تحريك يمين←يسار', right: 'تحريك يسار→يمين', up: 'تحريك للأعلى' };
  const TRACK_H = { video: 58, text: 38, audio: 46 };
  let root, P, cv, ctx, time = 0, playing = false, zoom = 60, sel = null, magnet = true, raf = 0, needDraw = false, playT0 = 0, playWall = 0, inspTab = 'basic', mobilePanel = 'media';
  let sliderCommitted = false;

  const tracks = () => P.edit.tracks;
  function find(id) { for (const tr of tracks()) { const c = tr.clips.find(x => x.id === id); if (c) return { c, tr }; } return null; }
  const media = (id) => S.mediaById(id);
  const total = () => Engine.duration(P);
  const fps = () => P.edit.fps || 30;

  // ================= الواجهة =================
  function render(main) {
    root = main; P = S.project;
    main.innerHTML = `<div class="editor">
      <section class="ed-preview">
        <div class="stage-wrap"><div class="stage" id="stage"><canvas id="pv"></canvas><div class="stage-empty" id="stageEmpty">${icon('film', 'big')}<p>استورد فيديو أو صوراً لتبدأ المونتاج</p></div></div></div>
        <div class="transport">
          <div class="tp-side"><select id="aspectSel" class="select sm" title="نسبة العرض">${Object.keys(ASPECTS).map(a => `<option value="${a}" ${P.edit.aspect === a ? 'selected' : ''}>${a === '2.39' ? '2.39:1 سينما' : a}</option>`).join('')}</select></div>
          <div class="tp-main">
            <button class="icon-btn" id="tpStart" title="البداية (Home)">${icon('skipf')}</button>
            <button class="play-btn" id="tpPlay" title="تشغيل (مسافة)">${icon('play')}</button>
            <button class="icon-btn" id="tpEnd" title="النهاية (End)">${icon('skipb')}</button>
          </div>
          <div class="tp-side end"><span class="tc" id="tc">00:00:00</span><button class="btn gold sm" id="exportBtn">${icon('download')}<span>تصدير</span></button></div>
        </div>
      </section>
      <aside class="ed-bin panel" id="binPanel"></aside>
      <aside class="ed-insp panel" id="inspPanel"></aside>
      <div class="ed-mtabs" id="mTabs"><button data-m="media">${icon('image')}<span>الوسائط</span></button><button data-m="insp">${icon('sparkles')}<span>الخصائص</span></button></div>
      <section class="ed-timeline" dir="ltr">
        <div class="tl-tools" dir="rtl">
          <button class="tool" data-t="split" title="قص عند المؤشر (S)">${icon('split')}<span>قص</span></button>
          <button class="tool" data-t="dup" title="تكرار (D)">${icon('copy')}<span>تكرار</span></button>
          <button class="tool" data-t="del" title="حذف (Delete)">${icon('trash')}<span>حذف</span></button>
          <button class="tool" data-t="text" title="إضافة نص">${icon('type')}<span>نص</span></button>
          <button class="tool" data-t="key" title="مفتاح حركة (K)">${icon('diamond')}<span>مفتاح</span></button>
          <button class="tool ${magnet ? 'on' : ''}" data-t="magnet" title="المغناطيس والقص المتموج (N)">${icon('magnet')}<span>مغناطيس</span></button>
          <span class="grow"></span>
          <button class="tool" data-t="zout" title="تصغير (-)">${icon('zoomout')}</button>
          <button class="tool" data-t="zin" title="تكبير (+)">${icon('zoomin')}</button>
        </div>
        <div class="tl-body"><div class="tl-heads" id="tlHeads"></div><div class="tl-scroll" id="tlScroll"><div class="tl-content" id="tlContent"></div></div></div>
      </section>
    </div>`;
    cv = $('#pv', main); ctx = cv.getContext('2d', { alpha: false });
    Engine.onNeedRender = requestDraw;
    Engine.preloadImages(P); Engine.fontsReady().then(requestDraw);
    bindTransport(); bindTimeline(); renderBin(); renderTimeline(); renderInspector(); setMobilePanel(mobilePanel);
    sizeCanvas(); window.addEventListener('resize', onResize);
    if (window.ResizeObserver) { root._ro = new ResizeObserver(onResize); root._ro.observe($('#stage', main).parentElement); }
    loop();
  }
  const onResize = NL.debounce(() => { if (root) { sizeCanvas(); renderTimeline(); } }, 80);
  function aspectWH() { const [a, b] = ASPECTS[P.edit.aspect] || ASPECTS['16:9']; return [a, b]; }
  function sizeCanvas() {
    const wrap = $('#stage', root).parentElement; const [a, b] = aspectWH();
    const maxW = wrap.clientWidth, maxH = wrap.clientHeight || maxW * b / a;
    let w = maxW, hh = w * b / a; if (hh > maxH) { hh = maxH; w = hh * a / b; }
    const st = $('#stage', root); st.style.width = Math.floor(w) + 'px'; st.style.height = Math.floor(hh) + 'px';
    st.classList.toggle('scope', P.edit.aspect === '2.39');
    const dpr = Math.min(2, window.devicePixelRatio || 1); const pw = Math.min(1280, Math.round(w * dpr));
    cv.width = pw; cv.height = Math.round(pw * b / a); requestDraw();
  }
  function setMobilePanel(m) {
    mobilePanel = m; root.querySelector('.editor').dataset.mpanel = m;
    $$('#mTabs button', root).forEach(b => b.classList.toggle('on', b.dataset.m === m));
  }

  // ================= العرض والتشغيل =================
  function requestDraw() { needDraw = true; }
  function drawNow() {
    if (!cv) return;
    Engine.sync(P, time, playing, fps());
    Engine.frame(ctx, cv.width, cv.height, time, P);
    const empty = !tracks().some(t => t.clips.length); const se = $('#stageEmpty', root); if (se) se.style.display = empty ? '' : 'none';
    updatePlayhead();
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (Engine.exporting) return;
    if (playing) {
      time = playT0 + (performance.now() - playWall) / 1000;
      if (time >= total()) { time = total(); pause(); }
      drawNow(); followPlayhead();
    } else if (needDraw && !Engine.exporting) { needDraw = false; drawNow(); }
  }
  function play() {
    if (!tracks().some(t => t.clips.length)) return;
    Engine.unlockAll(P);
    if (time >= total() - 0.05) time = 0;
    playing = true; playT0 = time; playWall = performance.now();
    $('#tpPlay', root).innerHTML = icon('pause'); $('#tpPlay', root).classList.add('on');
  }
  function pause() {
    playing = false; Engine.stopAll();
    if (root) { $('#tpPlay', root).innerHTML = icon('play'); $('#tpPlay', root).classList.remove('on'); }
    requestDraw();
  }
  function seek(t) { time = clamp(t, 0, Math.max(total(), 0)); if (playing) { playT0 = time; playWall = performance.now(); } requestDraw(); updatePlayhead(); }
  NL.editorPause = () => { if (playing) pause(); };
  function bindTransport() {
    $('#tpPlay', root).onclick = () => playing ? pause() : play();
    $('#tpStart', root).onclick = () => seek(0);
    $('#tpEnd', root).onclick = () => seek(total());
    $('#aspectSel', root).onchange = (e) => { S.commit(); P.edit.aspect = e.target.value; S.changed({ silent: true }); sizeCanvas(); };
    $('#exportBtn', root).onclick = () => { pause(); NL.openExport(P); };
    $$('#mTabs button', root).forEach(b => b.onclick = () => setMobilePanel(b.dataset.m));
    $('#stage', root).addEventListener('dblclick', () => { const st = $('#stage', root); (st.requestFullscreen || st.webkitRequestFullscreen || (() => { })).call(st); });
  }

  // ================= الوسائط =================
  async function importFiles() {
    const files = await pickFiles('video/*,image/*,audio/*,.mov,.mp4,.m4v,.webm,.mp3,.m4a,.wav,.aac', true);
    if (!files.length) return;
    const bin = $('#binPanel', root);
    bin.classList.add('busy');
    for (const f of files) {
      const kind = f.type.startsWith('image') ? 'image' : f.type.startsWith('audio') || /\.(mp3|m4a|wav|aac|ogg)$/i.test(f.name) ? 'audio' : 'video';
      try {
        const info = await probe(f, kind);
        const blob = kind === 'image' && f.size > 6e6 ? await downscale(f, 3840, .92) : f;
        await S.addMedia(blob, kind, { name: f.name, ...info });
      } catch (e) { console.error(e); toast(`تعذر قراءة الملف: ${f.name}`, 'err'); }
    }
    bin.classList.remove('busy'); renderBin(); toast(`تم استيراد ${arNum(files.length)} ملف`);
  }
  NL.importMediaFiles = async (files) => { for (const f of files) { const kind = f.type.startsWith('image') ? 'image' : f.type.startsWith('audio') ? 'audio' : 'video'; const info = await probe(f, kind); await S.addMedia(f, kind, { name: f.name, ...info }); } if (root) renderBin(); };
  function probe(file, kind) {
    const url = URL.createObjectURL(file);
    return new Promise((res, rej) => {
      const done = (o) => { URL.revokeObjectURL(url); res(o); };
      if (kind === 'image') {
        const img = new Image(); img.onload = () => {
          const c = document.createElement('canvas'); const s = 160 / Math.max(img.width, img.height); c.width = img.width * s; c.height = img.height * s;
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); done({ duration: 0, w: img.width, h: img.height, thumb: c.toDataURL('image/jpeg', .7) });
        }; img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); }; img.src = url; return;
      }
      const el = document.createElement(kind === 'audio' ? 'audio' : 'video'); el.preload = 'auto'; el.muted = true; el.playsInline = true;
      let to = setTimeout(() => { URL.revokeObjectURL(url); rej(new Error('timeout')); }, 20000);
      el.onloadedmetadata = async () => {
        let d = el.duration;
        if (!isFinite(d)) { el.currentTime = 1e7; await new Promise(r => el.ondurationchange = r); d = el.duration; el.currentTime = 0; }
        const out = { duration: d, w: el.videoWidth || 0, h: el.videoHeight || 0 };
        if (kind === 'video') {
          el.currentTime = Math.min(1, d / 3);
          el.onseeked = () => {
            const c = document.createElement('canvas'); const s = 160 / Math.max(el.videoWidth, el.videoHeight); c.width = el.videoWidth * s; c.height = el.videoHeight * s;
            c.getContext('2d').drawImage(el, 0, 0, c.width, c.height); out.thumb = c.toDataURL('image/jpeg', .7); clearTimeout(to);
            waveform(file).then(w => { out.wave = w; done(out); });
          };
        } else { clearTimeout(to); out.wave = await waveform(file); done(out); }
      };
      el.onerror = () => { clearTimeout(to); URL.revokeObjectURL(url); rej(new Error('media')); };
      el.src = url;
    });
  }
  async function waveform(file) {
    if (file.size > 60e6) return null;
    try {
      const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!AC) return null;
      const buf = await file.arrayBuffer(); const ac = new AC(1, 44100, 44100);
      const ab = await new Promise((r, j) => { const p = ac.decodeAudioData(buf, r, j); if (p && p.then) p.then(r, j); });
      const ch = ab.getChannelData(0), N = 300, step = Math.floor(ch.length / N) || 1, peaks = [];
      for (let i = 0; i < N; i++) { let m = 0; for (let j = i * step; j < (i + 1) * step && j < ch.length; j += 16) m = Math.max(m, Math.abs(ch[j])); peaks.push(+m.toFixed(3)); }
      const mx = Math.max(...peaks, .01); return peaks.map(p => +(p / mx).toFixed(3));
    } catch (e) { return null; }
  }
  const waveCache = new Map();
  function waveURL(m) {
    if (!m || !m.wave) return '';
    if (waveCache.has(m.id)) return waveCache.get(m.id);
    const c = document.createElement('canvas'); c.width = 600; c.height = 60; const x = c.getContext('2d'); x.fillStyle = 'rgba(255,255,255,.55)';
    m.wave.forEach((p, i) => { const hh = Math.max(1, p * 54); x.fillRect(i * 2, 30 - hh / 2, 1.4, hh); });
    const u = c.toDataURL(); waveCache.set(m.id, u); return u;
  }
  function renderBin() {
    const bin = $('#binPanel', root);
    const ms = S.media.filter(m => ['video', 'image', 'audio'].includes(m.kind));
    bin.innerHTML = `<div class="panel-head"><b>${icon('layers')} الوسائط</b><button class="btn sm gold" id="importBtn">${icon('upload')}<span>استيراد</span></button></div>
      <div class="bin-list">${ms.length ? ms.map(m => `<div class="bin-item k-${m.kind}" data-id="${m.id}" draggable="true" title="${esc(m.name)}">
        <div class="bi-thumb">${m.thumb ? `<img src="${m.thumb}" alt="">` : icon(m.kind === 'audio' ? 'music' : 'image')}${m.duration ? `<span class="bi-dur">${fmtTime(m.duration)}</span>` : ''}<span class="bi-kind">${icon(m.kind === 'video' ? 'camera' : m.kind === 'audio' ? 'music' : 'image')}</span></div>
        <div class="bi-name">${esc(m.name)}</div><button class="bi-add" data-add="${m.id}" title="إضافة إلى الخط الزمني">${icon('plus')}</button></div>`).join('')
        : `<button class="bin-empty" id="importBtn2">${icon('upload', 'big')}<b>استورد ملفات من جهازك</b><span>فيديو، صور، موسيقى — تبقى على جهازك فقط</span></button>`}</div>
      <div class="bin-quick"><button class="btn sm" data-tpl="title">${icon('type')}<span>عنوان</span></button><button class="btn sm" data-tpl="lower">${icon('users')}<span>اسم</span></button><button class="btn sm" data-tpl="credits">${icon('star')}<span>شارة نهاية</span></button></div>`;
    $('#importBtn', bin).onclick = importFiles; const i2 = $('#importBtn2', bin); if (i2) i2.onclick = importFiles;
    bin.onclick = (e) => {
      const a = e.target.closest('[data-add]'); if (a) { addMediaClip(media(a.dataset.add)); return; }
      const tpl = e.target.closest('[data-tpl]'); if (tpl) addText(tpl.dataset.tpl);
    };
    $$('.bin-item', bin).forEach(it => it.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/nl-media', it.dataset.id); e.dataTransfer.effectAllowed = 'copy'; }));
  }
  function trackEnd(tr) { return tr.clips.reduce((a, c) => Math.max(a, c.start + clipDur(c)), 0); }
  function addMediaClip(m, trackId, at) {
    if (!m) return;
    const kind = m.kind;
    const tr = trackId ? tracks().find(t => t.id === trackId) : tracks().find(t => t.type === (kind === 'audio' ? 'audio' : 'video'));
    if (!tr) return;
    if ((kind === 'audio') !== (tr.type === 'audio') || tr.type === 'text') return toast('نوع الملف لا يناسب هذا المسار', 'err');
    S.commit();
    const c = newClip({ mediaId: m.id, kind, start: 0, dur: kind === 'image' ? 4 : m.duration, srcDur: m.duration });
    c.start = at != null ? at : trackEnd(tr);
    tr.clips.push(c); resolveOverlap(tr, c);
    sel = c.id; S.changed({ silent: true }); renderTimeline(); renderInspector(); seek(c.start + 0.01);
    if (window.innerWidth < 900) toast('أضيف إلى الخط الزمني');
  }
  function addText(style = 'title') {
    const tr = tracks().find(t => t.type === 'text'); S.commit();
    const presets = { title: { content: S.project.title, style: 'title', size: .1, font: 'messiri', anim: 'rise' }, lower: { content: 'سالم\nمصوّر', style: 'lower', size: .055, font: 'cairo', anim: 'fade', box: true }, credits: { content: `${S.project.title}\n\nإخراج\nوطن النهار\n\nجميع الحقوق محفوظة © 2026`, style: 'credits', size: .06, font: 'cairo', anim: 'none' }, subtitle: { content: 'اكتب الترجمة هنا', style: 'subtitle', size: .05, font: 'cairo', anim: 'fade' } };
    const c = newClip({ kind: 'text', start: time, dur: style === 'credits' ? 8 : 3.5, text: presets[style] || presets.title });
    tr.clips.push(c); resolveOverlap(tr, c); sel = c.id; inspTab = 'text';
    S.changed({ silent: true }); renderTimeline(); renderInspector(); setMobilePanel('insp'); seek(c.start + 0.8);
  }
  function overlaps(tr, c) { const s = c.start, e = s + clipDur(c); return tr.clips.find(o => o !== c && o.start < e - 0.001 && o.start + clipDur(o) > s + 0.001); }
  function resolveOverlap(tr, c) { let o, guard = 0; while ((o = overlaps(tr, c)) && guard++ < 200) c.start = o.start + clipDur(o); }

  // ================= الخط الزمني =================
  function renderTimeline() {
    if (!root) return;
    const heads = $('#tlHeads', root), content = $('#tlContent', root), scroll = $('#tlScroll', root);
    const dur = total(); const width = Math.max(scroll.clientWidth, (dur + 15) * zoom);
    heads.innerHTML = `<div class="tl-ruler-pad">${fmtTime(dur)}</div>` + tracks().map(tr => `<div class="tl-head t-${tr.type}" style="height:${TRACK_H[tr.type]}px" data-tr="${tr.id}">
      <span class="th-ic">${icon(tr.type === 'video' ? 'camera' : tr.type === 'audio' ? 'music' : 'type')}</span><span class="th-name">${esc(tr.name)}</span>
      ${tr.type !== 'text' && tr.type !== 'video' ? `<button class="th-btn ${tr.muted ? 'on' : ''}" data-mute="${tr.id}" title="كتم">${icon(tr.muted ? 'mute' : 'volume')}</button>` : `<button class="th-btn ${tr.hidden ? 'on' : ''}" data-hide="${tr.id}" title="${tr.type === 'video' ? 'إخفاء/كتم' : 'إخفاء'}">${icon(tr.hidden ? 'x' : 'check')}</button>`}</div>`).join('');
    // المسطرة
    const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120]; const step = steps.find(s => s * zoom >= 64) || 120;
    let ticks = '';
    for (let t = 0; t <= width / zoom; t += step) ticks += `<span class="tick" style="left:${t * zoom}px">${fmtTime(t)}</span>`;
    const lanes = tracks().map(tr => `<div class="lane t-${tr.type} ${tr.hidden ? 'is-hidden' : ''}" data-tr="${tr.id}" style="height:${TRACK_H[tr.type]}px">${tr.clips.map(c => clipHTML(c, tr)).join('')}</div>`).join('');
    content.style.width = width + 'px';
    content.innerHTML = `<div class="tl-ruler" id="tlRuler">${ticks}</div><div class="lanes">${lanes}</div><div class="playhead" id="playhead"><i></i></div>`;
    updatePlayhead();
  }
  function clipHTML(c, tr) {
    const m = c.mediaId ? media(c.mediaId) : null; const d = clipDur(c);
    const w = Math.max(6, d * zoom);
    let bg = '';
    if (c.kind === 'video' || c.kind === 'image') bg = m && m.thumb ? `background-image:url(${m.thumb})` : '';
    if (c.kind === 'audio') bg = m ? `background-image:url(${waveURL(m)})` : '';
    const label = c.kind === 'text' ? (c.text.content || '').split('\n')[0] : m ? m.name : 'ملف مفقود';
    const kfs = new Set(); Object.values(c.kf || {}).forEach(arr => arr.forEach(k => kfs.add(k.t)));
    const badges = [c.speed !== 1 || c.ramp !== 'none' ? `<span class="cb">${c.ramp !== 'none' ? '⤳' : ''}${c.speed}x</span>` : '', c.grade && !NL.isNeutral(c.grade) ? `<span class="cb gold">${icon('palette')}</span>` : '', c.kb && c.kb.on ? `<span class="cb">KB</span>` : ''].join('');
    return `<div class="clip k-${c.kind} ${sel === c.id ? 'sel' : ''} ${!m && c.kind !== 'text' ? 'missing' : ''}" data-id="${c.id}" style="left:${c.start * zoom}px;width:${w}px;${bg}">
      ${c.trans && c.trans.type !== 'none' ? `<span class="trans" style="width:${Math.min(c.trans.dur, d / 2) * zoom}px" title="${TRANS[c.trans.type]}"></span>` : ''}
      <span class="clip-label">${c.kind === 'text' ? icon('type') : ''}${esc(label)}</span><span class="clip-badges">${badges}</span>
      ${[...kfs].map(t => `<i class="kf" style="left:${t * zoom}px"></i>`).join('')}
      ${c.fadeIn ? `<span class="fade-in" style="width:${c.fadeIn * zoom}px"></span>` : ''}${c.fadeOut ? `<span class="fade-out" style="width:${c.fadeOut * zoom}px"></span>` : ''}
      <span class="hdl l" data-h="l"></span><span class="hdl r" data-h="r"></span></div>`;
  }
  function updatePlayhead() {
    if (!root) return;
    const ph = $('#playhead', root); if (ph) ph.style.transform = `translateX(${time * zoom}px)`;
    const tc = $('#tc', root); if (tc) tc.innerHTML = `${fmtTime(time, true, fps())}<span class="tot"> / ${fmtTime(total())}</span>`;
  }
  function followPlayhead() {
    const sc = $('#tlScroll', root); if (!sc) return; const x = time * zoom;
    if (x > sc.scrollLeft + sc.clientWidth * .85 || x < sc.scrollLeft) sc.scrollLeft = x - sc.clientWidth * .2;
  }
  function setZoom(z, anchorT = time) {
    const sc = $('#tlScroll', root); const off = anchorT * zoom - sc.scrollLeft;
    zoom = clamp(z, 8, 400); renderTimeline(); sc.scrollLeft = anchorT * zoom - off;
  }
  function snapPoints(exclude) {
    const pts = [0, time];
    tracks().forEach(tr => tr.clips.forEach(c => { if (c.id !== exclude) { pts.push(c.start, c.start + clipDur(c)); } }));
    return pts;
  }
  function snap(t, exclude) {
    if (!magnet) return t; const th = 10 / zoom; let best = t, bd = th;
    snapPoints(exclude).forEach(p => { const d = Math.abs(p - t); if (d < bd) { bd = d; best = p; } });
    return best;
  }
  function bindTimeline() {
    const scroll = $('#tlScroll', root), content = $('#tlContent', root), heads = $('#tlHeads', root);
    $$('.tl-tools .tool', root).forEach(b => b.onclick = () => tool(b.dataset.t));
    heads.onclick = (e) => {
      const m = e.target.closest('[data-mute]'), hd = e.target.closest('[data-hide]');
      if (m) { S.commit(); const tr = tracks().find(t => t.id === m.dataset.mute); tr.muted = !tr.muted; S.changed({ silent: true }); renderTimeline(); requestDraw(); }
      if (hd) { S.commit(); const tr = tracks().find(t => t.id === hd.dataset.hide); tr.hidden = !tr.hidden; tr.muted = tr.type === 'video' ? tr.hidden : tr.muted; S.changed({ silent: true }); renderTimeline(); requestDraw(); }
    };
    scroll.addEventListener('scroll', () => { heads.scrollTop = scroll.scrollTop; });
    scroll.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); } }, { passive: false });
    // سحب الوسائط من المكتبة (سطح المكتب)
    content.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('text/nl-media')) { e.preventDefault(); } });
    content.addEventListener('drop', (e) => {
      const id = e.dataTransfer.getData('text/nl-media'); if (!id) return; e.preventDefault();
      const lane = e.target.closest('.lane'); const r = content.getBoundingClientRect();
      addMediaClip(media(id), lane ? lane.dataset.tr : null, snap(Math.max(0, (e.clientX - r.left) / zoom)));
    });
    // التفاعل بالمؤشر: تحريك المؤشر الزمني، تحديد/تحريك/تشذيب المقاطع
    content.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      const r = content.getBoundingClientRect(); const tAt = (ev) => Math.max(0, (ev.clientX - r.left) / zoom);
      const clipEl = e.target.closest('.clip');
      if (!clipEl || e.target.closest('.tl-ruler')) {
        // تحريك رأس التشغيل
        const wasPlaying = playing; if (wasPlaying) pause();
        if (!clipEl && e.target.closest('.lane') && sel) { sel = null; renderTimeline(); renderInspector(); }
        seek(tAt(e)); content.setPointerCapture(e.pointerId);
        const mv = (ev) => seek(snap(tAt(ev)));
        const up = () => { content.removeEventListener('pointermove', mv); content.removeEventListener('pointerup', up); content.removeEventListener('pointercancel', up); };
        content.addEventListener('pointermove', mv); content.addEventListener('pointerup', up); content.addEventListener('pointercancel', up);
        return;
      }
      const f = find(clipEl.dataset.id); if (!f) return;
      // باللمس: اللمسة الأولى تحدد المقطع فقط حتى يبقى تمرير الخط الزمني سهلاً
      if (e.pointerType === 'touch' && sel !== f.c.id) { sel = f.c.id; $$('.clip.sel', content).forEach(x => x.classList.remove('sel')); clipEl.classList.add('sel'); renderInspector(); return; }
      e.preventDefault();
      const { c } = f; let tr = f.tr;
      const mode = e.target.dataset.h || 'move';
      if (sel !== c.id) { sel = c.id; $$('.clip.sel', content).forEach(x => x.classList.remove('sel')); clipEl.classList.add('sel'); renderInspector(); }
      const x0 = e.clientX, y0 = e.clientY, orig = JSON.parse(JSON.stringify(c)), origTr = tr; let moved = false;
      const m = c.mediaId ? media(c.mediaId) : null; const srcMax = m && m.duration ? m.duration : Infinity;
      const ratio = (orig.out - orig.in) / clipDur(orig); // ثوانٍ مصدر لكل ثانية زمنية
      clipEl.setPointerCapture(e.pointerId);
      const mv = (ev) => {
        const dx = (ev.clientX - x0) / zoom;
        if (!moved && Math.abs(ev.clientX - x0) < 4 && Math.abs(ev.clientY - y0) < 4) return;
        if (!moved) { moved = true; S.commit(); clipEl.classList.add('dragging'); }
        if (mode === 'move') {
          let ns = Math.max(0, orig.start + dx);
          const sEnd = snap(ns + clipDur(c), c.id) - clipDur(c); const sStart = snap(ns, c.id);
          ns = Math.abs(sStart - ns) <= Math.abs(sEnd - ns) ? sStart : sEnd; c.start = Math.max(0, ns);
          const under = document.elementFromPoint(ev.clientX, ev.clientY); const lane = under && under.closest('.lane');
          if (lane && lane.dataset.tr !== tr.id) {
            const nt = tracks().find(t => t.id === lane.dataset.tr);
            if (nt && nt.type === tr.type) { tr.clips.splice(tr.clips.indexOf(c), 1); nt.clips.push(c); tr = nt; lane.appendChild(clipEl); }
          }
          clipEl.style.left = c.start * zoom + 'px';
        } else if (mode === 'l') {
          let delta = snap(orig.start + dx, c.id) - orig.start;
          delta = Math.min(Math.max(delta, -orig.start), clipDur(orig) - 0.1);
          if (c.kind === 'video' || c.kind === 'audio') { delta = Math.max(delta, -orig.in / ratio); c.in = orig.in + delta * ratio; }
          else c.out = orig.out - delta;
          c.start = orig.start + delta;
          clipEl.style.left = c.start * zoom + 'px'; clipEl.style.width = clipDur(c) * zoom + 'px';
        } else {
          let ne = snap(orig.start + clipDur(orig) + dx, c.id); let nd = Math.max(0.1, ne - orig.start);
          if (c.kind === 'video' || c.kind === 'audio') c.out = Math.min(srcMax, orig.in + nd * ratio); else c.out = orig.in + nd;
          clipEl.style.width = clipDur(c) * zoom + 'px';
        }
        if (playing) pause();
        const lt = mode === 'r' ? c.start + clipDur(c) - 0.02 : c.start + 0.001; seek(mode === 'move' ? time : lt);
      };
      const up = () => {
        clipEl.removeEventListener('pointermove', mv); clipEl.removeEventListener('pointerup', up); clipEl.removeEventListener('pointercancel', up);
        if (!moved) { if (window.innerWidth < 900) setMobilePanel('insp'); return; }
        if (overlaps(tr, c)) {
          if (mode === 'move') { const o = overlaps(tr, c); const before = c.start < o.start + clipDur(o) / 2; c.start = before ? o.start - clipDur(c) : o.start + clipDur(o); if (c.start < 0 || overlaps(tr, c)) { resolveOverlap(tr, c); } }
          else { Object.assign(c, orig); if (tr !== origTr) { tr.clips.splice(tr.clips.indexOf(c), 1); origTr.clips.push(c); } toast('لا يمكن تداخل المقاطع في نفس المسار', 'err'); }
        }
        S.changed({ silent: true }); renderTimeline(); renderInspector(); requestDraw();
      };
      clipEl.addEventListener('pointermove', mv); clipEl.addEventListener('pointerup', up); clipEl.addEventListener('pointercancel', up);
    });
  }
  function tool(t) {
    const f = sel ? find(sel) : null;
    if (t === 'zin') return setZoom(zoom * 1.35);
    if (t === 'zout') return setZoom(zoom / 1.35);
    if (t === 'magnet') { magnet = !magnet; $('[data-t=magnet]', root).classList.toggle('on', magnet); return toast(magnet ? 'المغناطيس مفعّل' : 'المغناطيس متوقف'); }
    if (t === 'text') return addText('title');
    if (t === 'split') return splitAt();
    if (!f) return toast('اختر مقطعاً أولاً');
    if (t === 'del') {
      S.commit(); const { c, tr } = f; const d = clipDur(c), end = c.start + d;
      tr.clips.splice(tr.clips.indexOf(c), 1);
      if (magnet && tr.id === 'v1') tr.clips.forEach(o => { if (o.start >= end - 0.01) o.start -= d; });
      sel = null; S.changed({ silent: true }); renderTimeline(); renderInspector(); requestDraw(); toast('تم الحذف');
    }
    if (t === 'dup') {
      S.commit(); const { c, tr } = f; const n = JSON.parse(JSON.stringify(c)); n.id = uid('c'); n.start = c.start + clipDur(c);
      tr.clips.push(n); resolveOverlap(tr, n); sel = n.id; S.changed({ silent: true }); renderTimeline(); renderInspector(); requestDraw();
    }
    if (t === 'key') addKeyAll();
  }
  function splitAt() {
    let f = sel ? find(sel) : null;
    if (!f || !(time > f.c.start && time < f.c.start + clipDur(f.c))) {
      f = null; for (const tr of tracks()) { const c = Engine.activeAt(tr, time); if (c) { f = { c, tr }; break; } }
    }
    if (!f) return toast('ضع المؤشر فوق مقطع للقص');
    const { c, tr } = f; const lt = time - c.start, d = clipDur(c);
    if (lt < 0.05 || lt > d - 0.05) return;
    S.commit();
    const n = JSON.parse(JSON.stringify(c)); n.id = uid('c');
    if (c.kind === 'video' || c.kind === 'audio') { const s = NL.srcTime(c, lt); n.in = s; c.out = s; n.ramp = c.ramp = 'none'; }
    else { c.out = c.in + lt; n.in = 0; n.out = d - lt; }
    n.start = time; n.trans = { type: 'none', dur: .8 }; n.fadeIn = 0; c.fadeOut = 0;
    Object.keys(c.kf || {}).forEach(k => { const arr = c.kf[k]; c.kf[k] = arr.filter(x => x.t <= lt); n.kf[k] = arr.filter(x => x.t >= lt).map(x => ({ t: x.t - lt, v: x.v })); });
    if (c.kb && c.kb.on) { /* يبقى كين بيرنز لكل جزء */ }
    tr.clips.push(n); sel = n.id; S.changed({ silent: true }); renderTimeline(); renderInspector(); requestDraw(); toast('تم القص');
  }
  function addKeyAll() {
    const f = sel ? find(sel) : null; if (!f) return toast('اختر مقطعاً أولاً');
    const { c } = f; const lt = clamp(time - c.start, 0, clipDur(c));
    S.commit(); ['x', 'y', 'scale', 'opacity', 'rotate'].forEach(p => setKf(c, p, lt, kfValue(c, p, lt)));
    S.changed({ silent: true }); renderTimeline(); inspTab = 'motion'; renderInspector(); toast('أضيف مفتاح حركة ◆');
  }

  // ================= لوحة الخصائص =================
  function slider(key, label, min, max, step, val, fmt = (v) => (+v).toFixed(2)) {
    return `<div class="sld" data-key="${key}"><div class="sld-top"><span>${label}</span><output>${fmt(val)}</output></div><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-key="${key}"></div>`;
  }
  function renderInspector() {
    if (!root) return;
    const box = $('#inspPanel', root); const f = sel ? find(sel) : null;
    if (!f) {
      box.innerHTML = `<div class="panel-head"><b>${icon('sparkles')} إعدادات المشروع</b></div>
        <div class="insp-body"><label class="fld">نسبة العرض<select class="select" id="pAspect">${Object.keys(ASPECTS).map(a => `<option value="${a}" ${P.edit.aspect === a ? 'selected' : ''}>${a === '2.39' ? '2.39:1 سينما سكوب' : a}</option>`).join('')}</select></label>
        <label class="fld">معدل الإطارات<select class="select" id="pFps">${[24, 25, 30, 60].map(v => `<option ${fps() === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <div class="tip">${icon('info')}<p>اضغط على أي مقطع في الخط الزمني لتعديل السرعة، الصوت، الانتقالات، التلوين ومفاتيح الحركة.</p></div>
        <div class="tip">${icon('keyboard')}<p>مسافة للتشغيل · S للقص · K لمفتاح حركة · Ctrl+Z للتراجع</p></div></div>`;
      $('#pAspect', box).onchange = (e) => { S.commit(); P.edit.aspect = e.target.value; $('#aspectSel', root).value = e.target.value; S.changed({ silent: true }); sizeCanvas(); };
      $('#pFps', box).onchange = (e) => { S.commit(); P.edit.fps = +e.target.value; S.changed({ silent: true }); };
      return;
    }
    const { c } = f; const visual = c.kind === 'video' || c.kind === 'image'; const timed = c.kind === 'video' || c.kind === 'audio';
    const tabs = [['basic', 'أساسي', 'gauge']]; if (c.kind === 'text') tabs.unshift(['text', 'النص', 'type']);
    if (visual) tabs.push(['color', 'الألوان', 'palette']); if (c.kind !== 'audio') tabs.push(['motion', 'الحركة', 'move']);
    if (!tabs.some(t => t[0] === inspTab)) inspTab = tabs[0][0];
    const m = c.mediaId ? media(c.mediaId) : null;
    let body = '';
    if (inspTab === 'basic') {
      body = `<div class="kv"><span>البداية</span><b>${fmtTime(c.start, true, fps())}</b><span>المدة</span><b>${clipDur(c).toFixed(2)}ث</b></div>
      ${timed ? slider('speed', 'السرعة', .25, 4, .05, c.speed, v => (+v).toFixed(2) + 'x') + `<label class="fld">منحنى السرعة (Speed Ramp)<select class="select" data-key="ramp">${Object.entries(RAMPS).map(([k, r]) => `<option value="${k}" ${c.ramp === k ? 'selected' : ''}>${r.label}</option>`).join('')}</select></label>` : ''}
      ${timed ? slider('volume', 'مستوى الصوت', 0, 2, .01, c.volume, v => Math.round(v * 100) + '٪') + `<label class="toggle"><input type="checkbox" data-key="mute" ${c.mute ? 'checked' : ''}><i></i><span>كتم صوت المقطع</span></label>` : ''}
      ${slider('fadeIn', 'ظهور تدريجي', 0, 3, .1, c.fadeIn, v => (+v).toFixed(1) + 'ث')}${slider('fadeOut', 'اختفاء تدريجي', 0, 3, .1, c.fadeOut, v => (+v).toFixed(1) + 'ث')}
      ${visual ? `<label class="fld">الانتقال عند البداية<select class="select" data-key="trans.type">${Object.entries(TRANS).map(([k, v]) => `<option value="${k}" ${c.trans.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>${c.trans.type !== 'none' ? slider('trans.dur', 'مدة الانتقال', .2, 3, .1, c.trans.dur, v => (+v).toFixed(1) + 'ث') : ''}
      <label class="fld">ملاءمة الإطار<select class="select" data-key="fit"><option value="cover" ${c.fit === 'cover' ? 'selected' : ''}>ملء الإطار (قص)</option><option value="contain" ${c.fit === 'contain' ? 'selected' : ''}>احتواء كامل</option></select></label>` : ''}
      ${m ? `<p class="muted small file-name">${icon(c.kind === 'audio' ? 'music' : 'image')} ${esc(m.name)}${m.w ? ` · ${m.w}×${m.h}` : ''}</p>` : ''}`;
    } else if (inspTab === 'color') {
      const g = c.grade;
      body = `<div class="presets" id="presets">${Object.entries(PRESETS).map(([k, p]) => `<button class="preset ${g.preset === k ? 'on' : ''}" data-preset="${k}"><span class="pv-thumb" data-pk="${k}"></span><span>${p.label}</span></button>`).join('')}</div>
      ${g.preset !== 'none' ? slider('grade.intensity', 'قوة الفلتر', 0, 1.5, .01, g.intensity, v => Math.round(v * 100) + '٪') : ''}
      <h4 class="sub-h">تصحيح يدوي</h4>
      ${slider('grade.exposure', 'التعريض', -1.5, 1.5, .01, g.exposure)}${slider('grade.contrast', 'التباين', -.6, .8, .01, g.contrast)}${slider('grade.saturation', 'التشبع', -1, 1, .01, g.saturation)}
      ${slider('grade.temperature', 'حرارة اللون', -1, 1, .01, g.temperature)}${slider('grade.tint', 'الصبغة', -1, 1, .01, g.tint)}${slider('grade.fade', 'بهتان الأسود', 0, .5, .01, g.fade)}
      ${slider('grade.vignette', 'الإطار المظلم (Vignette)', 0, 1, .01, g.vignette)}${slider('grade.grain', 'حبيبات الفيلم', 0, 1, .01, g.grain)}
      <div class="btn-row"><button class="btn sm" id="gReset">${icon('undo')}<span>إعادة ضبط</span></button><button class="btn sm" id="gAll">${icon('layers')}<span>تطبيق على الكل</span></button></div>`;
    } else if (inspTab === 'motion') {
      const lt = clamp(time - c.start, 0, clipDur(c));
      const kv = (p) => kfValue(c, p, lt);
      const kfRow = (p, label, min, max, step, fmt) => { const has = (c.kf[p] || []).length; const on = (c.kf[p] || []).some(k => Math.abs(k.t - lt) < 0.04); return `<div class="kf-row">${slider('kf.' + p, label + (has ? ` <em>${arNum(has)}◆</em>` : ''), min, max, step, kv(p), fmt)}<button class="kf-btn ${on ? 'on' : ''}" data-kf="${p}" title="مفتاح عند المؤشر">${icon('diamond')}</button>${has ? `<button class="kf-clr" data-kfclr="${p}" title="مسح المفاتيح">${icon('x')}</button>` : ''}</div>`; };
      body = `${visual ? `<label class="toggle"><input type="checkbox" data-key="kb.on" ${c.kb.on ? 'checked' : ''}><i></i><span>تأثير كين بيرنز (حركة سينمائية تلقائية)</span></label>
        ${c.kb.on ? `<label class="fld">اتجاه الحركة<select class="select" data-key="kb.dir">${Object.entries(KB_DIRS).map(([k, v]) => `<option value="${k}" ${c.kb.dir === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>` : ''}` : ''}
        <h4 class="sub-h">${icon('diamond')} مفاتيح الحركة <small class="muted">عند ${lt.toFixed(2)}ث من المقطع</small></h4>
        ${kfRow('x', 'الموضع الأفقي', -1, 1, .005, v => (+v).toFixed(2))}${kfRow('y', 'الموضع العمودي', -1, 1, .005, v => (+v).toFixed(2))}
        ${kfRow('scale', 'الحجم', .1, 4, .01, v => Math.round(v * 100) + '٪')}${kfRow('opacity', 'الشفافية', 0, 1, .01, v => Math.round(v * 100) + '٪')}${kfRow('rotate', 'الدوران', -180, 180, 1, v => Math.round(v) + '°')}
        <p class="muted small">حرّك المؤشر الزمني ثم غيّر القيم — تُنشأ المفاتيح تلقائياً وتتحرك القيم بينها بنعومة.</p>
        <button class="btn sm" id="kfAll">${icon('diamond')}<span>مفتاح لكل الخصائص (K)</span></button>`;
    } else if (inspTab === 'text') {
      const T = c.text;
      body = `<label class="fld">النص<textarea class="input" data-key="text.content" rows="3">${esc(T.content)}</textarea></label>
        <div class="row2"><label class="fld">النمط<select class="select" data-key="text.style">${Object.entries(TEXT_STYLES).map(([k, v]) => `<option value="${k}" ${T.style === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="fld">الخط<select class="select" data-key="text.font"><option value="messiri" ${T.font === 'messiri' ? 'selected' : ''}>المسيري (فني)</option><option value="cairo" ${T.font === 'cairo' ? 'selected' : ''}>القاهرة (حديث)</option></select></label></div>
        <label class="fld">الحركة<select class="select" data-key="text.anim">${Object.entries(TEXT_ANIMS).map(([k, v]) => `<option value="${k}" ${T.anim === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        ${slider('text.size', 'حجم الخط', .02, .25, .005, T.size, v => Math.round(v * 1000) / 10 + '٪')}
        <div class="swatches">${['#ffffff', '#f5d48a', '#e7b453', '#111111', '#e05757', '#7fc8ff'].map(col => `<button class="swatch ${T.color === col ? 'on' : ''}" data-color="${col}" style="--c:${col}"></button>`).join('')}<input type="color" data-key="text.color" value="${T.color}"></div>
        <label class="toggle"><input type="checkbox" data-key="text.box" ${T.box ? 'checked' : ''}><i></i><span>خلفية داكنة خلف النص</span></label>`;
    }
    box.innerHTML = `<div class="panel-head"><b>${icon(c.kind === 'text' ? 'type' : c.kind === 'audio' ? 'music' : c.kind === 'image' ? 'image' : 'camera')} ${c.kind === 'text' ? 'مقطع نص' : c.kind === 'audio' ? 'مقطع صوت' : c.kind === 'image' ? 'صورة' : 'مقطع فيديو'}</b><button class="icon-btn sm" id="deselect" title="إلغاء التحديد">${icon('x')}</button></div>
      <div class="insp-tabs">${tabs.map(([k, l, ic]) => `<button data-tab="${k}" class="${inspTab === k ? 'on' : ''}">${icon(ic)}<span>${l}</span></button>`).join('')}</div>
      <div class="insp-body">${body}</div>`;
    $('#deselect', box).onclick = () => { sel = null; renderTimeline(); renderInspector(); };
    $$('.insp-tabs button', box).forEach(b => b.onclick = () => { inspTab = b.dataset.tab; renderInspector(); });
    bindInspector(box, c);
    if (inspTab === 'color') fillPresetThumbs(box, c);
  }
  function setPath(o, path, v) { const ks = path.split('.'); let x = o; for (let i = 0; i < ks.length - 1; i++) x = x[ks[i]]; x[ks[ks.length - 1]] = v; }
  function bindInspector(box, c) {
    const onVal = (el, final) => {
      const key = el.dataset.key; if (!key) return;
      let v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
      if (!sliderCommitted) { S.commit(); sliderCommitted = true; }
      if (key.startsWith('kf.')) { const p = key.slice(3); const lt = clamp(time - c.start, 0, clipDur(c)); if (!(c.kf[p] || []).length) c.kf[p] = [{ t: 0, v }]; else setKf(c, p, lt, v); }
      else if (key === 'speed') { const old = clipDur(c); c.speed = v; void old; }
      else setPath(c, key, v);
      if (el.type === 'range') { const out = el.closest('.sld').querySelector('output'); const fmt = el.closest('.sld'); out.textContent = fmtFor(key, v); void fmt; }
      S.changed({ silent: true }); requestDraw();
      if (final) { sliderCommitted = false; if (['speed', 'ramp', 'trans.type', 'kb.on', 'text.content', 'fadeIn', 'fadeOut', 'trans.dur'].includes(key) || key.startsWith('kf.') || key.startsWith('grade')) { fixOverlapsAfterResize(c); renderTimeline(); } if (['trans.type', 'kb.on', 'grade.preset'].includes(key) || key.startsWith('kf.')) renderInspector(); }
    };
    // ملاحظة: إسناد مباشر (وليس addEventListener) حتى لا تتراكم المستمعات بين عمليات العرض
    box.oninput = (e) => { if (e.target.dataset.key) onVal(e.target, e.target.type !== 'range' && e.target.tagName !== 'TEXTAREA'); };
    box.onchange = (e) => { if (e.target.dataset.key) onVal(e.target, true); sliderCommitted = false; };
    box.querySelectorAll('textarea').forEach(t => t.addEventListener('blur', () => { sliderCommitted = false; renderTimeline(); }));
    box.onclick = (e) => {
      const pr = e.target.closest('[data-preset]');
      if (pr) { S.commit(); c.grade.preset = pr.dataset.preset; if (c.grade.intensity == null) c.grade.intensity = 1; S.changed({ silent: true }); requestDraw(); renderTimeline(); renderInspector(); return; }
      const sw = e.target.closest('[data-color]'); if (sw) { S.commit(); c.text.color = sw.dataset.color; S.changed({ silent: true }); requestDraw(); renderInspector(); return; }
      const kb = e.target.closest('[data-kf]');
      if (kb) { const p = kb.dataset.kf; const lt = clamp(time - c.start, 0, clipDur(c)); S.commit(); const arr = c.kf[p] || (c.kf[p] = []); const ex = arr.findIndex(k => Math.abs(k.t - lt) < 0.04); if (ex >= 0) arr.splice(ex, 1); else setKf(c, p, lt, kfValue(c, p, lt)); S.changed({ silent: true }); renderTimeline(); renderInspector(); requestDraw(); return; }
      const kc = e.target.closest('[data-kfclr]'); if (kc) { S.commit(); c.kf[kc.dataset.kfclr] = []; S.changed({ silent: true }); renderTimeline(); renderInspector(); requestDraw(); return; }
      if (e.target.closest('#kfAll')) return addKeyAll();
      if (e.target.closest('#gReset')) { S.commit(); c.grade = defGrade(); S.changed({ silent: true }); requestDraw(); renderTimeline(); renderInspector(); }
      if (e.target.closest('#gAll')) { S.commit(); tracks().forEach(tr => tr.clips.forEach(o => { if (o.kind === 'video' || o.kind === 'image') o.grade = JSON.parse(JSON.stringify(c.grade)); })); S.changed({ silent: true }); renderTimeline(); toast('طُبّق التلوين على كل المقاطع'); requestDraw(); }
    };
  }
  function fmtFor(key, v) {
    if (key === 'speed') return v.toFixed(2) + 'x'; if (key === 'volume' || key === 'grade.intensity' || key === 'kf.scale' || key === 'kf.opacity') return Math.round(v * 100) + '٪';
    if (key === 'fadeIn' || key === 'fadeOut' || key === 'trans.dur') return v.toFixed(1) + 'ث'; if (key === 'kf.rotate') return Math.round(v) + '°';
    if (key === 'text.size') return Math.round(v * 1000) / 10 + '٪'; return (+v).toFixed(2);
  }
  function fixOverlapsAfterResize(c) {
    const f = find(c.id); if (!f) return; const o = overlaps(f.tr, c);
    if (o && o.start > c.start) { // ادفع المقاطع التالية
      const end = c.start + clipDur(c); const shift = end - o.start;
      f.tr.clips.forEach(x => { if (x !== c && x.start >= o.start - 0.001) x.start += shift; });
    }
  }
  function fillPresetThumbs(box, c) {
    const go = () => {
      if (!Engine.sourceOf(c)) return setTimeout(() => { if (root && sel === c.id && inspTab === 'color') go(); }, 300);
      $$('.pv-thumb', box).forEach(el => { const g = Object.assign(defGrade(), { preset: el.dataset.pk }); const u = Engine.gradeThumb(c, g, 96, 54); if (u) el.style.backgroundImage = `url(${u})`; });
    };
    go();
  }

  // ================= اختصارات لوحة المفاتيح =================
  function onKey(e) {
    const k = e.key;
    if (k === ' ' || k === 'Spacebar') { e.preventDefault(); playing ? pause() : play(); }
    else if (k === 's' || k === 'S' || k === 'س') { e.preventDefault(); splitAt(); }
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); tool('del'); }
    else if (k === 'd' || k === 'D' || k === 'ي') { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); tool('dup'); } }
    else if (k === 'k' || k === 'K' || k === 'ن') { e.preventDefault(); addKeyAll(); }
    else if (k === 'n' || k === 'N' || k === 'ى') { tool('magnet'); }
    else if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); const dir = k === 'ArrowRight' ? 1 : -1; seek(time + dir * (e.shiftKey ? 1 : 1 / fps())); }
    else if (k === 'Home') { e.preventDefault(); seek(0); }
    else if (k === 'End') { e.preventDefault(); seek(total()); }
    else if (k === '+' || k === '=') setZoom(zoom * 1.25);
    else if (k === '-' || k === '_') setZoom(zoom / 1.25);
    else if (k === 'Escape') { sel = null; renderTimeline(); renderInspector(); }
  }
  function destroy() {
    cancelAnimationFrame(raf); pause(); Engine.stopAll(); window.removeEventListener('resize', onResize);
    if (root && root._ro) root._ro.disconnect(); Engine.onNeedRender = null; root = null;
  }
  function refresh() { if (!root) return; P = S.project; if (sel && !find(sel)) sel = null; $('#aspectSel', root).value = P.edit.aspect; sizeCanvas(); renderTimeline(); renderInspector(); requestDraw(); }
  NL.Views = NL.Views || {};
  NL.Views.edit = { render, destroy, refresh, onKey };
  NL.editorDebug = { get time() { return time; }, seek, play, pause, addMediaClip, addText, splitAt, select: (id) => { sel = id; renderTimeline(); renderInspector(); }, setTab: (t) => { inspTab = t; renderInspector(); }, setMobilePanel };
})(window.NL);
