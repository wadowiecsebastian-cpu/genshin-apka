// migrator.js — jednorazowa migracja localStorage -> IndexedDB (store: kv)
(function(){
  async function migrate(){
    if (!window.IDB || typeof IDB.kvGet !== "function") return;

    // jeśli już migrowane — wyjście
    const already = await IDB.kvGet("__migrated_from_localstorage_v1");
    if (already) return;

    const toDelete = [];

    // 1) lastCharacter
    try{
      const v = localStorage.getItem("lastCharacter");
      if (v !== null && v !== undefined && String(v).trim() !== ""){
        await IDB.kvSet("lastCharacter", String(v));
        toDelete.push("lastCharacter");
      }
    }catch(e){}

    // 2) ownedCharacters (team-planner)
    try{
      const raw = localStorage.getItem("ownedCharacters");
      if (raw){
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object"){
          await IDB.kvSet("ownedCharacters_v1", parsed);
          toDelete.push("ownedCharacters");
        }
      }
    }catch(e){}

    // 3) dashboard recents
    const RECENT_KEYS = ["dashboard_recentPages","dashboard_recentCharacters"];
    for (const k of RECENT_KEYS){
      try{
        const raw = localStorage.getItem(k);
        if (raw){
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)){
            await IDB.kvSet(k, parsed);
            toDelete.push(k);
          }
        }
      }catch(e){}
    }

    // 3b) pity (Genshin Pity) — localStorage -> IndexedDB
    try{
      const raw = localStorage.getItem("genshin_pity_multi_v3");
      if (raw){
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object"){
          await IDB.kvSet("pity_state_v1", parsed);
          toDelete.push("genshin_pity_multi_v3");
        }
      }
    }catch(e){}

    // 4) settings: setting_*
    try{
      for (let i=0; i<localStorage.length; i++){
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith("setting_")){
          const v = localStorage.getItem(k);
          // trzymamy jako string (jak w localStorage)
          await IDB.kvSet(k, v);
          toDelete.push(k);
        }
      }
    }catch(e){}

    // 5) legacy progress keys -> kv jako lista postaci
    // (po to, żeby tier-list / tier-analytics / planner miały fallback bez localStorage)
    const legacyKeys = [
      "characterProgress","CHARACTER_PROGRESS","CHAR_PROGRESS",
      "characterLevels","materials.characterProgress","materials.progress",
      "materials.characterLevels","materials.characterLevelsMap",
      "CHAR_LEVELS","CHAR_LEVELS_MAP","progress","progressCharacters"
    ];

    const legacySet = new Set();
    for (const k of legacyKeys){
      try{
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);

        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)){
          Object.keys(parsed).forEach(n => legacySet.add(String(n)));
          toDelete.push(k);
          continue;
        }
        if (Array.isArray(parsed)){
          parsed.forEach(n => legacySet.add(String(n)));
          toDelete.push(k);
          continue;
        }
      }catch(e){}
    }

    if (legacySet.size){
      await IDB.kvSet("progress_legacy_characters_v1", Array.from(legacySet));
    }

    // 6) flaga migracji
    await IDB.kvSet("__migrated_from_localstorage_v1", true);

    // 7) (opcjonalnie) sprzątamy localStorage, żeby nie zostawiać śmieci / limitów quota
    try{
      toDelete.forEach(k => {
        try{ localStorage.removeItem(k); }catch(e){}
      });
    }catch(e){}
  }

  // uruchom po załadowaniu (defer), bez blokowania strony
  migrate().catch(()=>{});
})();
