/* حالة المشروع، التراجع/الإعادة، والحفظ التلقائي | © 2026 وطن النهار */
'use strict';
(function (NL) {
  const { DB, uid, debounce } = NL;
  const urlCache = new Map();
  const S = {
    project: null, media: [], undoStack: [], redoStack: [], listeners: new Set(),
    newProject({ title, genre, logline, posterId }) {
      return {
        id: uid('p_'), title: title || 'فيلم بلا عنوان', genre: genre || 'دراما', logline: logline || '', posterId: posterId || null,
        created: Date.now(), updated: Date.now(),
        script: [{ id: uid('l'), type: 'scene', text: 'داخلي. مقهى قديم في الكويت - ليل' }, { id: uid('l'), type: 'action', text: '' }],
        shots: [], days: [],
        edit: {
          aspect: '16:9', fps: 30,
          tracks: [
            { id: 'v1', type: 'video', name: 'فيديو ١', clips: [] },
            { id: 'v2', type: 'video', name: 'فيديو ٢', clips: [] },
            { id: 't1', type: 'text', name: 'نصوص', clips: [] },
            { id: 'a1', type: 'audio', name: 'موسيقى', clips: [] },
            { id: 'a2', type: 'audio', name: 'صوت ٢', clips: [] },
          ]
        }
      };
    },
    async load(id) {
      const p = await DB.get('projects', id);
      if (!p) return null;
      S.project = p; S.undoStack = []; S.redoStack = [];
      S.media = await DB.mediaOf(id);
      return p;
    },
    // يُستدعى قبل أي تعديل لحفظ نقطة تراجع
    commit() {
      if (!S.project) return;
      S.undoStack.push(JSON.stringify(S.project));
      if (S.undoStack.length > 120) S.undoStack.shift();
      S.redoStack = [];
      S.emitHist();
    },
    changed(opts = {}) { if (!S.project) return; S.project.updated = Date.now(); S.setSave('saving'); S.saveSoon(); if (!opts.silent) S.listeners.forEach(f => f('change')); },
    undo() {
      if (!S.undoStack.length) return false;
      S.redoStack.push(JSON.stringify(S.project));
      S.project = JSON.parse(S.undoStack.pop());
      S.changed(); S.listeners.forEach(f => f('history')); S.emitHist(); return true;
    },
    redo() {
      if (!S.redoStack.length) return false;
      S.undoStack.push(JSON.stringify(S.project));
      S.project = JSON.parse(S.redoStack.pop());
      S.changed(); S.listeners.forEach(f => f('history')); S.emitHist(); return true;
    },
    emitHist() { document.dispatchEvent(new CustomEvent('nl-hist', { detail: { u: S.undoStack.length, r: S.redoStack.length } })); },
    setSave(state) { document.dispatchEvent(new CustomEvent('nl-save', { detail: state })); },
    saveNow: async () => {
      if (!S.project) return;
      try { await DB.put('projects', S.project); S.setSave('saved'); } catch (e) { console.error(e); S.setSave('error'); }
    },
    async addMedia(file, kind, extra = {}) {
      const m = { id: uid('m_'), projectId: S.project ? S.project.id : extra.projectId, name: file.name || 'media', type: file.type || '', kind, blob: file, size: file.size || 0, created: Date.now(), ...extra };
      await DB.put('media', m);
      if (S.project && m.projectId === S.project.id) S.media.push(m);
      return m;
    },
    async updateMedia(m) { await DB.put('media', m); },
    mediaById(id) { return S.media.find(m => m.id === id); },
    url(id, blob) {
      if (!id) return '';
      if (urlCache.has(id)) return urlCache.get(id);
      const m = blob ? { blob } : S.mediaById(id);
      if (!m || !m.blob) return '';
      const u = URL.createObjectURL(m.blob); urlCache.set(id, u); return u;
    },
    async urlAsync(id) {
      if (urlCache.has(id)) return urlCache.get(id);
      const m = S.mediaById(id) || await DB.get('media', id);
      if (!m) return '';
      return S.url(id, m.blob);
    }
  };
  S.saveSoon = debounce(S.saveNow, 500);
  window.addEventListener('beforeunload', () => { if (S.project) DB.put('projects', S.project); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) S.saveNow(); });
  NL.S = S;
})(window.NL);
