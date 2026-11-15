/* محرك العرض: تركيب الطبقات + تلوين WebGL + الصوت | جميع الحقوق محفوظة © 2026 وطن النهار */
'use strict';
(function (NL) {
  const { S, clamp, lerp, ease, uid } = NL;

  // ===== منحنيات تغيير السرعة (Speed Ramps) =====
  const RAMPS = {
    none: { label: 'ثابتة', f: () => 1 },
    'slow-mid': { label: 'بطء في المنتصف', f: (u) => 1 - 0.78 * Math.pow(Math.sin(Math.PI * u), 2) },
    'fast-mid': { label: 'تسارع في المنتصف', f: (u) => 1 + 2.2 * Math.pow(Math.sin(Math.PI * u), 2) },
    'slow-end': { label: 'تباطؤ نحو النهاية', f: (u) => 1 - 0.72 * ease(u) },
    'fast-end': { label: 'تسارع نحو النهاية', f: (u) => 0.45 + 1.8 * ease(u) },
    'hero': { label: 'لقطة البطل (سريع-بطيء-سريع)', f: (u) => u < .3 ? 1.8 : u > .7 ? 1.8 : 0.25 },
  };
  const rampCache = {};
  function rampTable(name) {
    if (rampCache[name]) return rampCache[name];
    const f = (RAMPS[name] || RAMPS.none).f, N = 200, cum = [0];
    for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + (f((i - .5) / N)) / N);
    const mean = cum[N];
    return (rampCache[name] = { f, cum: cum.map(v => v / mean), mean, N });
  }
  function rampF(name, u) { const T = rampTable(name); u = clamp(u, 0, 1); const x = u * T.N, i = Math.floor(x); if (i >= T.N) return 1; return lerp(T.cum[i], T.cum[i + 1], x - i); }

  // ===== نموذج المقطع =====
  const isTimed = (c) => c.kind === 'video' || c.kind === 'audio';
  function clipDur(c) {
    if (!isTimed(c)) return Math.max(0.1, c.out - c.in);
    return Math.max(0.05, (c.out - c.in) / ((c.speed || 1) * rampTable(c.ramp || 'none').mean));
  }
  function srcTime(c, lt) { const d = clipDur(c); return c.in + (c.out - c.in) * rampF(c.ramp || 'none', lt / d); }
  function instRate(c, lt) { const T = rampTable(c.ramp || 'none'); return (c.speed || 1) * T.f(clamp(lt / clipDur(c), 0, 1)); }
  const defGrade = () => ({ preset: 'none', intensity: 1, exposure: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, fade: 0, vignette: 0, grain: 0 });
  function newClip({ mediaId = null, kind, start = 0, dur = 4, srcDur = null, text = null }) {
    const c = {
      id: uid('c'), kind, mediaId, start, in: 0, out: isTimed({ kind }) ? (srcDur || dur) : dur,
      speed: 1, ramp: 'none', volume: 1, mute: false, fadeIn: 0, fadeOut: 0,
      trans: { type: 'none', dur: 0.8 }, grade: defGrade(), fit: 'cover', kb: { on: kind === 'image', dir: 'in' },
      kf: { x: [], y: [], scale: [], opacity: [], rotate: [] }
    };
    if (kind === 'text') c.text = Object.assign({ content: 'عنوان الفيلم', style: 'title', size: 0.09, color: '#ffffff', font: 'messiri', anim: 'rise', box: false, x: 0, y: 0 }, text || {});
    if (kind === 'text' || kind === 'audio') c.kb.on = false;
    return c;
  }
  // ===== المفاتيح (Keyframes) =====
  const KF_DEF = { x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 };
  function kfValue(c, prop, lt) {
    const arr = (c.kf && c.kf[prop]) || [];
    if (!arr.length) return KF_DEF[prop];
    if (lt <= arr[0].t) return arr[0].v;
    const last = arr[arr.length - 1]; if (lt >= last.t) return last.v;
    for (let i = 0; i < arr.length - 1; i++) {
      const a = arr[i], b = arr[i + 1];
      if (lt >= a.t && lt <= b.t) return lerp(a.v, b.v, ease((lt - a.t) / Math.max(1e-6, b.t - a.t)));
    }
    return last.v;
  }
  function setKf(c, prop, lt, v) {
    c.kf = c.kf || { x: [], y: [], scale: [], opacity: [], rotate: [] };
    const arr = c.kf[prop] || (c.kf[prop] = []);
    const ex = arr.find(k => Math.abs(k.t - lt) < 0.04);
    if (ex) ex.v = v; else { arr.push({ t: +lt.toFixed(3), v }); arr.sort((a, b) => a.t - b.t); }
  }

  // ===== التلوين السينمائي =====
  const PRESETS = {
    none: { label: 'بدون' },
    teal: { label: 'تيل وبرتقالي', contrast: .16, saturation: .12, temperature: .04, sh: [0, .42, .5], hi: [1, .62, .28], split: .42 },
    noir: { label: 'نوار', mono: 1, contrast: .42, exposure: -.05, vignette: .5, grain: .28 },
    warm: { label: 'دافئ', temperature: .38, saturation: .08, hi: [1, .78, .48], sh: [.45, .3, .2], split: .16 },
    cold: { label: 'بارد', temperature: -.36, tint: -.03, saturation: -.1, sh: [.1, .26, .52], hi: [.75, .88, 1], split: .2 },
    vintage: { label: 'عتيق', fade: .13, saturation: -.28, temperature: .2, contrast: -.08, grain: .38, vignette: .38, sh: [.3, .22, .38], hi: [1, .86, .6], split: .24 },
    film35: { label: 'فيلم ٣٥مم', contrast: .12, saturation: .05, fade: .045, grain: .22, temperature: .08, sh: [.12, .2, .26], hi: [1, .9, .74], split: .14, vignette: .18 },
    bleach: { label: 'تبييض (Bleach)', saturation: -.5, contrast: .38, exposure: .02, grain: .12 },
    desert: { label: 'صحراوي ذهبي', temperature: .46, saturation: .16, contrast: .1, hi: [1, .74, .35], sh: [.35, .22, .1], split: .26 },
    matrix: { label: 'ماتريكس', tint: .22, saturation: -.22, contrast: .22, sh: [.05, .3, .12], hi: [.75, 1, .7], split: .3 },
    dream: { label: 'حالم', fade: .09, exposure: .1, contrast: -.16, saturation: -.04, hi: [1, .82, .9], sh: [.3, .25, .4], split: .2 },
    night: { label: 'ليل أمريكي', exposure: -.55, temperature: -.42, saturation: -.3, contrast: .12, sh: [.05, .12, .35], hi: [.6, .75, 1], split: .3, vignette: .3 },
  };
  function gradeParams(g) {
    const p = PRESETS[g.preset] || PRESETS.none, k = g.preset === 'none' ? 0 : (g.intensity == null ? 1 : g.intensity);
    const v = (n) => (p[n] || 0) * k + (g[n] || 0);
    return {
      exposure: v('exposure'), contrast: v('contrast'), saturation: v('saturation'), temperature: v('temperature'), tint: v('tint'),
      fade: v('fade'), vignette: v('vignette'), grain: v('grain'), mono: (p.mono || 0) * k,
      sh: p.sh || [.5, .5, .5], hi: p.hi || [.5, .5, .5], split: (p.split || 0) * k,
    };
  }
  const isNeutral = (g) => !g || (g.preset === 'none' && !g.exposure && !g.contrast && !g.saturation && !g.temperature && !g.tint && !g.fade && !g.vignette && !g.grain);

  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const FS = `precision mediump float;varying vec2 v;uniform sampler2D t;
  uniform float uE,uC,uS,uT,uTi,uF,uV,uG,uM,uSp,uSeed,uA;uniform vec3 uSh,uHi;
  float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  vec3 ov(vec3 a,vec3 b){return mix(2.*a*b,1.-2.*(1.-a)*(1.-b),step(.5,a));}
  void main(){vec4 s=texture2D(t,v);vec3 c=s.rgb;
   c*=exp2(uE);
   c.r*=1.+uT*.22;c.b*=1.-uT*.22;c.g*=1.+uTi*.18;
   c=(c-.5)*(1.+uC)+.5;
   float l=dot(clamp(c,0.,1.),vec3(.2126,.7152,.0722));
   c=mix(vec3(l),c,1.+uS);
   c=mix(c,vec3(l),uM);
   vec3 tone=mix(uSh,uHi,smoothstep(.05,.95,l));
   c=mix(c,ov(clamp(c,0.,1.),tone),uSp);
   c=uF*.55+c*(1.-uF*.75);
   vec2 q=(v-.5)*vec2(uA,1.);float d=length(q)/length(vec2(uA,1.)*.5);
   c*=1.-uV*smoothstep(.35,1.05,d);
   c+=(hash(v*vec2(1913.,1171.)+uSeed)-.5)*uG*.2;
   gl_FragColor=vec4(clamp(c,0.,1.),s.a);}`;
  const Grader = {
    cv: null, gl: null, ok: null, u: {},
    init() {
      if (this.ok !== null) return this.ok;
      try {
        const cv = document.createElement('canvas'); const gl = cv.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
        if (!gl) throw 0;
        const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
        const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
        [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        'uE uC uS uT uTi uF uV uG uM uSp uSeed uA uSh uHi'.split(' ').forEach(n => this.u[n] = gl.getUniformLocation(pr, n));
        this.cv = cv; this.gl = gl; this.ok = true;
      } catch (e) { console.warn('WebGL غير متاح — سيتم العرض بدون تلوين', e); this.ok = false; }
      return this.ok;
    },
    render(src, w, h, g, seed) {
      if (!this.init()) return null;
      const { gl, cv, u } = this;
      w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      gl.viewport(0, 0, w, h);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch (e) { return null; }
      const p = gradeParams(g);
      gl.uniform1f(u.uE, p.exposure); gl.uniform1f(u.uC, p.contrast); gl.uniform1f(u.uS, p.saturation); gl.uniform1f(u.uT, p.temperature); gl.uniform1f(u.uTi, p.tint);
      gl.uniform1f(u.uF, p.fade); gl.uniform1f(u.uV, p.vignette); gl.uniform1f(u.uG, p.grain); gl.uniform1f(u.uM, p.mono); gl.uniform1f(u.uSp, p.split);
      gl.uniform1f(u.uSeed, seed % 100); gl.uniform1f(u.uA, w / h); gl.uniform3fv(u.uSh, p.sh); gl.uniform3fv(u.uHi, p.hi);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return cv;
    }
  };

  // ===== الوسائط وعناصر التشغيل =====
  const images = new Map();   // mediaId -> Image
  const els = new Map();      // clipId -> {el, gain, mediaId}
  const Audio = {
    ctx: null, master: null, dest: null,
    ensure() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      els.forEach(rec => attachAudio(rec));
      return this.ctx;
    }
  };
  function attachAudio(rec) {
    if (!Audio.ctx || rec.gain) return;
    try { const src = Audio.ctx.createMediaElementSource(rec.el); rec.gain = Audio.ctx.createGain(); src.connect(rec.gain); rec.gain.connect(Audio.master); rec.el.muted = false; } catch (e) { console.warn(e); }
  }
  function loadImage(mediaId) {
    if (images.has(mediaId)) return images.get(mediaId);
    const img = new Image(); img.decoding = 'async'; img._ready = false;
    img.onload = () => { img._ready = true; Engine.onNeedRender && Engine.onNeedRender(); };
    S.urlAsync(mediaId).then(u => { img.src = u; });
    images.set(mediaId, img); return img;
  }
  function getEl(c) {
    let rec = els.get(c.id);
    if (rec && rec.mediaId === c.mediaId) return rec;
    if (rec) { rec.el.pause(); rec.el.removeAttribute('src'); rec.el.remove(); els.delete(c.id); }
    const el = document.createElement(c.kind === 'audio' ? 'audio' : 'video');
    el.preload = 'auto'; el.playsInline = true; el.setAttribute('playsinline', ''); el.setAttribute('webkit-playsinline', ''); el.crossOrigin = 'anonymous';
    el.muted = !Audio.ctx;
    let pool = document.getElementById('media-pool');
    if (!pool) { pool = document.createElement('div'); pool.id = 'media-pool'; pool.setAttribute('aria-hidden', 'true'); pool.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:.01;pointer-events:none;z-index:-1'; document.body.appendChild(pool); }
    el.style.cssText = 'width:2px;height:2px'; pool.appendChild(el);
    S.urlAsync(c.mediaId).then(u => { el.src = u; el.load(); });
    el.addEventListener('seeked', () => Engine.onNeedRender && Engine.onNeedRender());
    el.addEventListener('loadeddata', () => Engine.onNeedRender && Engine.onNeedRender());
    rec = { el, gain: null, mediaId: c.mediaId };
    els.set(c.id, rec); attachAudio(rec);
    return rec;
  }

  // ===== المرسِم (Compositor) =====
  const visTracks = (P) => P.edit.tracks.filter(t => t.type === 'video');
  const txtTracks = (P) => P.edit.tracks.filter(t => t.type === 'text');
  const audTracks = (P) => P.edit.tracks.filter(t => t.type === 'audio');
  function activeAt(track, t) { return track.clips.find(c => t >= c.start && t < c.start + clipDur(c)); }
  function prevAdjacent(track, c) {
    let best = null;
    track.clips.forEach(o => { if (o !== c) { const e = o.start + clipDur(o); if (Math.abs(e - c.start) < 0.12 && (!best || o.start > best.start)) best = o; } });
    return best;
  }
  function duration(P) { let d = 0; P.edit.tracks.forEach(t => t.clips.forEach(c => { d = Math.max(d, c.start + clipDur(c)); })); return d; }
  function envelope(c, lt) {
    const d = clipDur(c); let a = 1;
    if (c.fadeIn > 0) a *= clamp(lt / c.fadeIn, 0, 1);
    if (c.fadeOut > 0) a *= clamp((d - lt) / c.fadeOut, 0, 1);
    return a;
  }
  function transform(c, lt, W, H) {
    const d = clipDur(c), u = clamp(lt / d, 0, 1);
    let x = kfValue(c, 'x', lt), y = kfValue(c, 'y', lt), s = kfValue(c, 'scale', lt), o = kfValue(c, 'opacity', lt), r = kfValue(c, 'rotate', lt);
    if (c.kb && c.kb.on) {
      const e = ease(u);
      if (c.kb.dir === 'in') s *= lerp(1.0, 1.2, e);
      else if (c.kb.dir === 'out') s *= lerp(1.2, 1.0, e);
      else if (c.kb.dir === 'left') { s *= 1.15; x += lerp(.06, -.06, e); }
      else if (c.kb.dir === 'right') { s *= 1.15; x += lerp(-.06, .06, e); }
      else if (c.kb.dir === 'up') { s *= 1.15; y += lerp(.06, -.06, e); }
    }
    return { x: x * W, y: y * H, s, o, r: r * Math.PI / 180 };
  }
  function sourceOf(c) {
    if (c.kind === 'image') { const img = loadImage(c.mediaId); return img._ready ? { src: img, w: img.naturalWidth, h: img.naturalHeight } : null; }
    const rec = getEl(c); const el = rec.el;
    if (el.readyState < 2 || !el.videoWidth) return null;
    return { src: el, w: el.videoWidth, h: el.videoHeight };
  }
  function drawVisual(ctx, c, lt, W, H, extra = {}) {
    const so = sourceOf(c); if (!so) return;
    const tf = transform(c, lt, W, H);
    const base = c.fit === 'contain' ? Math.min(W / so.w, H / so.h) : Math.max(W / so.w, H / so.h);
    let sc = base * tf.s * (extra.scale || 1);
    const dw = so.w * sc, dh = so.h * sc;
    let alpha = clamp(tf.o * envelope(c, lt) * (extra.alpha == null ? 1 : extra.alpha), 0, 1);
    if (alpha <= 0.001) return;
    let img = so.src;
    if (!isNeutral(c.grade)) {
      const k = Math.min(1, Math.max(dw, dh) / Math.max(so.w, so.h), extra.maxGL || 1);
      const kk = Math.min(1, Math.max(0.05, k * 1.05)); const g = Grader.render(so.src, so.w * kk, so.h * kk, c.grade, (extra.seed || 0));
      if (g) img = g;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    if (extra.clip) { ctx.beginPath(); ctx.rect(extra.clip[0], extra.clip[1], extra.clip[2], extra.clip[3]); ctx.clip(); }
    ctx.translate(W / 2 + tf.x + (extra.dx || 0), H / 2 + tf.y);
    if (tf.r) ctx.rotate(tf.r);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }
  const FONTS = { cairo: 'Cairo', messiri: 'ElMessiri' };
  function drawText(ctx, c, lt, W, H) {
    const T = c.text, d = clipDur(c), tf = transform(c, lt, W, H);
    let a = tf.o * envelope(c, lt);
    const ain = clamp(lt / 0.6, 0, 1), aout = clamp((d - lt) / 0.5, 0, 1);
    let dy = 0, sc = 1, content = T.content || '';
    if (T.anim === 'fade') a *= Math.min(ain, aout);
    else if (T.anim === 'rise') { a *= Math.min(ain, aout); dy = (1 - ease(ain)) * H * 0.04; }
    else if (T.anim === 'zoom') { a *= Math.min(ain, aout); sc = lerp(1.25, 1, ease(ain)); }
    else if (T.anim === 'type') { const n = Math.floor(content.length * clamp(lt / Math.max(.4, d * .45), 0, 1)); content = content.slice(0, n); a *= aout; }
    if (a <= 0.001 || !content) return;
    const size = Math.max(8, T.size * H);
    const lines = content.split('\n');
    const lh = size * 1.35;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    ctx.direction = 'rtl'; ctx.textBaseline = 'middle';
    ctx.font = `${T.style === 'subtitle' ? 600 : 800} ${size}px ${FONTS[T.font] || 'Cairo'}, Cairo, sans-serif`;
    let cx = W / 2, cy = H / 2, align = 'center';
    if (T.style === 'lower') { cx = W * 0.92; cy = H * 0.78; align = 'right'; }
    else if (T.style === 'subtitle') { cy = H * 0.88; }
    else if (T.style === 'credits') { const total = lines.length * lh + H; cy = H + lh - (total) * (lt / d); }
    cx += tf.x + T.x * W; cy += tf.y + T.y * H + dy;
    ctx.translate(cx, cy); if (tf.r) ctx.rotate(tf.r); ctx.scale(sc * tf.s, sc * tf.s);
    ctx.textAlign = align;
    const widths = lines.map(l => ctx.measureText(l).width); const maxW = Math.max(...widths);
    const top = -((lines.length - 1) * lh) / 2;
    if (T.style === 'lower') {
      ctx.fillStyle = '#e7b453'; ctx.fillRect(6, top - lh / 2, size * 0.14, lines.length * lh);
      if (T.box) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(-maxW - size * .5, top - lh / 2, maxW + size * .5, lines.length * lh); }
    } else if (T.box || T.style === 'subtitle') {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      const bw = maxW + size * 1.0, bh = lines.length * lh + size * .25;
      ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(-bw / 2, top - lh / 2 - size * .12, bw, bh, size * .25) : ctx.rect(-bw / 2, top - lh / 2 - size * .12, bw, bh)); ctx.fill();
    }
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = size * .25; ctx.shadowOffsetY = size * .04;
    ctx.fillStyle = T.color || '#fff';
    lines.forEach((l, i) => ctx.fillText(l, 0, top + i * lh));
    ctx.restore();
  }
  function frame(ctx, W, H, t, P, opts = {}) {
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const seed = Math.floor(t * 24) * 7.13;
    for (const tr of visTracks(P)) {
      if (tr.hidden) continue;
      const c = activeAt(tr, t); if (!c) continue;
      const lt = t - c.start; const tt = c.trans && c.trans.type !== 'none' ? c.trans : null;
      const td = tt ? Math.min(tt.dur, clipDur(c) / 2) : 0;
      if (tt && lt < td) {
        const p = ease(lt / td); const prev = prevAdjacent(tr, c);
        const drawPrev = (ex) => { if (prev) drawVisual(ctx, prev, t - prev.start, W, H, Object.assign({ seed }, ex)); };
        if (tt.type === 'dissolve') { drawPrev({}); drawVisual(ctx, c, lt, W, H, { alpha: p, seed }); }
        else if (tt.type === 'fade') { if (lt < td / 2) drawPrev({ alpha: 1 - lt / (td / 2) }); else drawVisual(ctx, c, lt, W, H, { alpha: (lt - td / 2) / (td / 2), seed }); }
        else if (tt.type === 'wipe') { drawPrev({}); drawVisual(ctx, c, lt, W, H, { clip: [W * (1 - p), 0, W * p + 1, H], seed }); }
        else if (tt.type === 'slide') { drawPrev({ dx: -W * p }); drawVisual(ctx, c, lt, W, H, { dx: W * (1 - p), seed }); }
        else if (tt.type === 'zoom') { drawPrev({ scale: 1 + p * .3, alpha: 1 - p }); drawVisual(ctx, c, lt, W, H, { scale: lerp(1.3, 1, p), alpha: p, seed }); }
        else drawVisual(ctx, c, lt, W, H, { seed });
      } else drawVisual(ctx, c, lt, W, H, { seed });
    }
    if (P.edit.aspect === '2.39') { const ch = W / 2.39, bar = Math.max(0, (H - ch) / 2); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar + 1); }
    for (const tr of txtTracks(P)) { if (tr.hidden) continue; const c = activeAt(tr, t); if (c) drawText(ctx, c, t - c.start, W, H); }
    ctx.restore();
  }
  // يحدد المقاطع المطلوبة حالياً ويضبط عناصر الفيديو/الصوت
  function neededClips(P, t) {
    const out = [];
    for (const tr of P.edit.tracks) {
      if (tr.type === 'text') continue;
      for (const c of tr.clips) {
        if (c.kind !== 'video' && c.kind !== 'audio') continue;
        const s = c.start, e = s + clipDur(c);
        let need = t >= s - 0.6 && t < e;
        // المقطع السابق مطلوب أثناء الانتقال
        if (!need && tr.type === 'video' && t >= e && t < e + 2.5) {
          const nx = tr.clips.find(o => Math.abs(o.start - e) < 0.12 && o.trans && o.trans.type !== 'none' && t < o.start + Math.min(o.trans.dur, clipDur(o) / 2));
          if (nx) need = true;
        }
        if (need) out.push({ c, tr });
      }
    }
    return out;
  }
  function sync(P, t, playing, fps = 30) {
    const need = neededClips(P, t); const ids = new Set();
    for (const { c, tr } of need) {
      const rec = getEl(c); const el = rec.el; ids.add(c.id);
      const lt = t - c.start, d = clipDur(c);
      const pre = lt < 0;
      let desired = pre ? c.in : lt > d ? c.out + (lt - d) * (c.speed || 1) : srcTime(c, lt);
      if (el.duration && isFinite(el.duration)) desired = Math.min(desired, el.duration - 0.04);
      const muted = c.mute || tr.muted;
      const vol = pre ? 0 : (muted ? 0 : (c.volume == null ? 1 : c.volume) * envelope(c, clamp(lt, 0, d)));
      if (rec.gain) rec.gain.gain.value = vol; else if (!Audio.ctx) el.muted = true;
      if (el.readyState < 1) continue;
      if (playing && !pre && lt <= d) {
        const rate = clamp(instRate(c, lt), 0.0625, 16);
        if (Math.abs(el.playbackRate - rate) > 0.01) el.playbackRate = rate;
        if (el.paused) { if (Math.abs(el.currentTime - desired) > 0.05) el.currentTime = desired; const pr = el.play(); if (pr) pr.catch(() => { }); }
        else if (Math.abs(el.currentTime - desired) > 0.3) el.currentTime = desired;
      } else {
        if (!el.paused) el.pause();
        if (Math.abs(el.currentTime - desired) > 0.5 / fps) el.currentTime = desired;
      }
    }
    els.forEach((rec, id) => { if (!ids.has(id) && !rec.el.paused) rec.el.pause(); });
  }
  function stopAll() { els.forEach(r => { if (!r.el.paused) r.el.pause(); }); }
  function unlockAll(P) { // فتح تشغيل الوسائط على iOS داخل لمسة المستخدم
    Audio.ensure();
    P.edit.tracks.forEach(tr => tr.clips.forEach(c => {
      if (c.kind !== 'video' && c.kind !== 'audio') return;
      const rec = getEl(c); if (rec.el._unlocked) return; rec.el._unlocked = true;
      if (rec.el.paused) { const g = rec.gain; if (g) g.gain.value = 0; const p = rec.el.play(); if (p) p.then(() => rec.el.pause()).catch(() => { }); }
    }));
  }
  function release(clipIds) { (clipIds || [...els.keys()]).forEach(id => { const r = els.get(id); if (r) { r.el.pause(); } }); }
  function preloadImages(P) { P.edit.tracks.forEach(tr => tr.clips.forEach(c => { if (c.kind === 'image') loadImage(c.mediaId); })); }
  async function fontsReady() { try { await Promise.all([document.fonts.load('800 40px Cairo'), document.fonts.load('800 40px ElMessiri'), document.fonts.load('600 40px Cairo')]); } catch (e) { } }

  function gradeThumb(c, grade, w, h) {
    const so = sourceOf(c); if (!so) return null;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d');
    let img = so.src; if (!isNeutral(grade)) { const g = Grader.render(so.src, w * 2, h * 2, grade, 3); if (g) img = g; }
    const s = Math.max(w / so.w, h / so.h); x.drawImage(img, (w - so.w * s) / 2, (h - so.h * s) / 2, so.w * s, so.h * s);
    return cv.toDataURL('image/jpeg', .7);
  }
  const Engine = { gradeThumb, sourceOf, frame, sync, stopAll, unlockAll, release, duration, preloadImages, fontsReady, Audio, Grader, getEl, els, onNeedRender: null, activeAt };
  Object.assign(NL, { Engine, RAMPS, PRESETS, clipDur, srcTime, newClip, kfValue, setKf, defGrade, isNeutral, KF_DEF });
})(window.NL);
