/* Tiny IndexedDB helper (no modules) */
(function(){
  const DB_NAME = "GenshinTrackerDB";
  const DB_VER  = 4;
  const STORES  = ["inventory","progress","meta","todayTasks","kv"];

  function promisify(req){
    return new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); });
  }
  function openDb(){
    return new Promise((res,rej)=>{
      const rq = indexedDB.open(DB_NAME, DB_VER);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        STORES.forEach(s=>{
          if(!db.objectStoreNames.contains(s)){
            if (s === "progress") db.createObjectStore(s, { keyPath: "id" });
            else db.createObjectStore(s);
          }
        });
      };
      rq.onsuccess = ()=>res(rq.result);
      rq.onerror   = ()=>rej(rq.error);
    });
  }
  async function withStore(store, mode, fn){
    const db = await openDb();
    return await new Promise((res,rej)=>{
      const tx = db.transaction(store, mode);
      const st = tx.objectStore(store);
      const out = fn(st);
      tx.oncomplete = ()=>res(out);
      tx.onerror = ()=>rej(tx.error);
    });
  }

  window.IDB = {
    async get(store, key){ return withStore(store,'readonly', st => promisify(st.get(key))); },
    async set(store, key, value){
      return withStore(store,'readwrite', st => {
        const req = (store === 'progress')
          ? st.put(value)
          : st.put(value, key);
        return promisify(req);
      });
    },
    async put(store, value){ return withStore(store,'readwrite', st => promisify(st.put(value))); },
    async del(store, key){ return withStore(store,'readwrite', st => promisify(st.delete(key))); },
    async all(store){
      return withStore(store,'readonly', st => {
        const req = st.getAll ? st.getAll() : st.openCursor();
        return promisify(req);
      });
    },
    async keys(store){
      return withStore(store,'readonly', st => promisify(st.getAllKeys ? st.getAllKeys() : st.openCursor()));
    },
    // --- KV store (key-value) dla ustawień / dashboardu / owned itp. ---
    async kvGet(key){
      return withStore("kv", "readonly", st => promisify(st.get(key)));
    },
    async kvSet(key, value){
      return withStore("kv", "readwrite", st => promisify(st.put(value, key)));
    },
    async kvDel(key){
      return withStore("kv", "readwrite", st => promisify(st.delete(key)));
    },
  };
})();
