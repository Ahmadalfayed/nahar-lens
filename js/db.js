/* تخزين محلي IndexedDB — كل البيانات تبقى على جهازك | © 2026 وطن النهار */
'use strict';
(function (NL) {
  const NAME = 'nahar-lens', VER = 1;
  let dbp = null;
  const mem = { projects: new Map(), media: new Map() };
  let useMem = false;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res) => {
      if (!window.indexedDB) { useMem = true; return res(null); }
      let req;
      try { req = indexedDB.open(NAME, VER); } catch (e) { useMem = true; return res(null); }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' }).createIndex('projectId', 'projectId');
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => { useMem = true; res(null); };
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const db = await open();
    if (useMem) return fn(null);
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode); const s = t.objectStore(store);
      let out; const r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  }
  const DB = {
    async all(store) { if ((await open(), useMem)) return [...mem[store].values()]; return tx(store, 'readonly', s => s.getAll()); },
    async get(store, id) { if ((await open(), useMem)) return mem[store].get(id); return tx(store, 'readonly', s => s.get(id)); },
    async put(store, obj) { if ((await open(), useMem)) { mem[store].set(obj.id, obj); return; } return tx(store, 'readwrite', s => s.put(obj)); },
    async del(store, id) { if ((await open(), useMem)) { mem[store].delete(id); return; } return tx(store, 'readwrite', s => s.delete(id)); },
    async mediaOf(pid) {
      if ((await open(), useMem)) return [...mem.media.values()].filter(m => m.projectId === pid);
      return tx('media', 'readonly', s => s.index('projectId').getAll(pid));
    },
    async delProject(pid) {
      const ms = await DB.mediaOf(pid);
      for (const m of ms) await DB.del('media', m.id);
      await DB.del('projects', pid);
    },
    async persist() { try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { } },
    get memoryOnly() { return useMem; }
  };
  NL.DB = DB;
})(window.NL);
