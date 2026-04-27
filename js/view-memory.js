// view-memory.js
// Small helper for remembering per-page UI state (filters, tabs, view options)
// Works ONLY when appSettings_v1.nav.rememberViews === "on"

(function(){
  const SETTINGS_KEY = "appSettings_v1";

  function safeObj(x){ return (x && typeof x === "object") ? x : {}; }

  async function getSettings(){
    try{
      if (window.IDB && IDB.kvGet){
        const s = await IDB.kvGet(SETTINGS_KEY);
        return safeObj(s);
      }
    }catch(e){}
    return {};
  }

  async function isEnabled(){
    const s = await getSettings();
    const nav = safeObj(s.nav);
    return nav.rememberViews === "on";
  }

  async function get(key, fallback){
    try{
      if (!(window.IDB && IDB.kvGet)) return fallback;
      const v = await IDB.kvGet(key);
      return (v === undefined || v === null) ? fallback : v;
    }catch(e){
      return fallback;
    }
  }

  async function set(key, value){
    try{
      if (!(window.IDB && IDB.kvSet)) return;
      await IDB.kvSet(key, value);
    }catch(e){}
  }

  async function del(key){
    try{
      if (!(window.IDB && IDB.kvDel)) return;
      await IDB.kvDel(key);
    }catch(e){}
  }

  // Convenience: store one object under one key
  async function getObj(key, fallback){
    const v = await get(key, null);
    return (v && typeof v === "object") ? v : (fallback || {});
  }

  window.ViewMemory = {
    isEnabled,
    get,
    set,
    del,
    getSettings,
    getObj
  };
})();
