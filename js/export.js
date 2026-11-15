/* التصدير: Canvas + MediaRecorder | جميع الحقوق محفوظة © 2026 وطن النهار */
'use strict';
(function (NL) {
  const { $, esc, icon, h, modal, toast, Engine, download, arNum, fmtTime, clamp } = NL;
  const MIMES = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.4d002a,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  function pickMime() { if (!window.MediaRecorder) return null; return MIMES.find(m => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || ''; }
  NL.pickMime = pickMime;
  function sizeFor(aspect, q) {
    const base = { '720': 720, '1080': 1080, '480': 480 }[q] || 1080;
    if (aspect === '9:16') return [base, Math.round(base * 16 / 9)];
    if (aspect === '1:1') return [base, base];
    if (aspect === '4:5') return [base, Math.round(base * 5 / 4)];
    return [Math.round(base * 16 / 9), base];
  }
  async function openExport(P) {
    const dur = Engine.duration(P);
    if (dur <= 0) return toast('الخط الزمني فارغ', 'err');
    const mime = pickMime();
    if (mime === null || !HTMLCanvasElement.prototype.captureStream) return modal({ title: 'التصدير غير مدعوم', body: '<p class="muted">هذا المتصفح لا يدعم تسجيل الفيديو. جرّب Safari أو Chrome بأحدث إصدار.</p>', actions: [{ label: 'حسناً', value: 1 }] });
    const isMp4 = /mp4/.test(mime);
    const body = h(`<div class="export">
      <div class="ex-info"><div><span class="muted">المدة</span><b>${fmtTime(dur)}</b></div><div><span class="muted">الصيغة</span><b>${isMp4 ? 'MP4 (H.264)' : 'WebM'}</b></div><div><span class="muted">النسبة</span><b>${P.edit.aspect === '2.39' ? '2.39:1' : P.edit.aspect}</b></div></div>
      <div class="seg" data-name="q"><button data-v="480">480p</button><button data-v="720">720p</button><button data-v="1080" class="on">1080p</button></div>
      <div class="seg" data-name="fps">${[24, 25, 30, 60].map(v => `<button data-v="${v}" class="${(P.edit.fps || 30) === v ? 'on' : ''}">${v} fps</button>`).join('')}</div>
      <div class="seg" data-name="br"><button data-v="6">جودة جيدة</button><button data-v="12" class="on">عالية</button><button data-v="24">قصوى</button></div>
      <p class="muted small">${icon('info')} يتم التصدير بالوقت الحقيقي (المدة نفسها تقريباً). أبقِ الشاشة مفتوحة وهذه الصفحة ظاهرة حتى النهاية.</p>
      <div class="ex-progress" hidden><div class="ex-canvas"></div><div class="bar big"><i></i></div><div class="ex-stat"><span class="pct">٠٪</span><span class="eta"></span></div></div>
      <div class="ex-result" hidden></div></div>`);
    const val = (n) => +body.querySelector(`.seg[data-name=${n}] .on`).dataset.v;
    body.addEventListener('click', (e) => { const b = e.target.closest('.seg button'); if (!b) return; b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
    let job = null;
    await modal({
      title: 'تصدير الفيلم', body, wide: true, cls: 'export-modal',
      actions: [{ label: 'إغلاق', value: null, onClick: () => { if (job) job.cancel(); } }, {
        label: 'ابدأ التصدير', kind: 'gold', icon: 'download', onClick: async (el) => {
          if (job) return false;
          const btn = el.querySelector('.modal-actions .gold'); btn.disabled = true; btn.querySelector('span').textContent = 'جارٍ التصدير…';
          body.querySelectorAll('.seg').forEach(s => s.classList.add('disabled'));
          const [W, H] = sizeFor(P.edit.aspect, String(val('q')));
          job = render(P, { W, H, fps: val('fps'), bitrate: val('br') * 1e6 * (W * H > 2e6 ? 1 : W * H > 9e5 ? .6 : .35), mime, onProgress: (p, eta) => {
            const pg = body.querySelector('.ex-progress'); pg.hidden = false; pg.querySelector('.bar i').style.width = (p * 100).toFixed(1) + '%';
            pg.querySelector('.pct').textContent = arNum(Math.round(p * 100)) + '٪'; pg.querySelector('.eta').textContent = eta > 0 ? `متبقي ${fmtTime(eta)}` : '';
          }, mount: body.querySelector('.ex-canvas') });
          try {
            const blob = await job.promise; job = null;
            const ext = /mp4/.test(blob.type || mime) ? 'mp4' : 'webm';
            const name = `${P.title.replace(/[\\/:*?"<>|]/g, '')}.${ext}`;
            const url = URL.createObjectURL(blob);
            const res = body.querySelector('.ex-result'); res.hidden = false;
            res.innerHTML = `<video src="${url}" controls playsinline></video><div class="btn-row"><button class="btn gold" id="exDl">${icon('download')}<span>تنزيل (${(blob.size / 1e6).toFixed(1)} ميجابايت)</span></button>${navigator.canShare && navigator.canShare({ files: [new File([blob], name, { type: blob.type })] }) ? `<button class="btn" id="exShare">${icon('upload')}<span>حفظ في الصور / مشاركة</span></button>` : ''}</div>`;
            res.querySelector('#exDl').onclick = () => download(blob, name);
            const sh = res.querySelector('#exShare'); if (sh) sh.onclick = () => navigator.share({ files: [new File([blob], name, { type: blob.type })], title: P.title }).catch(() => { });
            body.querySelector('.ex-progress').hidden = true;
            btn.querySelector('span').textContent = 'تم التصدير ✓';
            window.__lastExport = { size: blob.size, type: blob.type, name };
            toast('اكتمل التصدير 🎬');
          } catch (err) {
            job = null; console.error(err); btn.disabled = false; btn.querySelector('span').textContent = 'إعادة المحاولة';
            if (err && err.message !== 'cancel') toast('تعذر التصدير: ' + (err.message || err), 'err');
          }
          return false;
        }
      }]
    });
  }
  function render(P, { W, H, fps, bitrate, mime, onProgress, mount }) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d', { alpha: false });
    if (mount) { mount.innerHTML = ''; mount.appendChild(cv); }
    let cancelled = false, rec, timer;
    // يجب فتح الصوت داخل لمسة المستخدم (iOS) قبل أي انتظار
    Engine.unlockAll(P);
    const AC = Engine.Audio.ensure();
    const run = async () => {
      await Engine.fontsReady();
      const dur = Engine.duration(P);
      // تحضير الإطار الأول
      Engine.sync(P, 0, false, fps); await new Promise(r => setTimeout(r, 600));
      Engine.frame(ctx, W, H, 0, P);
      const stream = cv.captureStream(fps);
      let dest = null;
      if (AC) { dest = AC.createMediaStreamDestination(); Engine.Audio.master.connect(dest); dest.stream.getAudioTracks().forEach(t => stream.addTrack(t)); }
      const chunks = [];
      rec = new MediaRecorder(stream, Object.assign({ videoBitsPerSecond: Math.round(bitrate), audioBitsPerSecond: 192000 }, mime ? { mimeType: mime } : {}));
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      const stopped = new Promise(r => rec.onstop = r);
      rec.start(500);
      const t0 = performance.now();
      await new Promise((resolve) => {
        const step = () => {
          if (cancelled) return resolve();
          const t = (performance.now() - t0) / 1000;
          const tt = Math.min(t, dur);
          Engine.sync(P, tt, true, fps); Engine.frame(ctx, W, H, tt, P);
          onProgress && onProgress(clamp(t / dur, 0, 1), Math.max(0, dur - t));
          if (t >= dur + 0.15) return resolve();
          timer = setTimeout(step, 1000 / fps / 1.5);
        };
        step();
      });
      Engine.stopAll();
      rec.stop(); await stopped;
      if (dest) try { Engine.Audio.master.disconnect(dest); } catch (e) { }
      stream.getTracks().forEach(t => t.stop());
      if (cancelled) throw new Error('cancel');
      return new Blob(chunks, { type: (rec.mimeType || mime || 'video/webm').split(';')[0] });
    };
    const promise = (async () => {
      Engine.exporting = true;
      try { return await run(); } finally { Engine.exporting = false; Engine.onNeedRender && Engine.onNeedRender(); }
    })();
    return { promise, cancel() { cancelled = true; clearTimeout(timer); } };
  }
  NL.openExport = openExport; NL.renderExport = render;
})(window.NL);
