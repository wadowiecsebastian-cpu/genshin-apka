/* planner.js – drużyny z ≥1 członkiem w Character Progress (IndexedDB) + realne poziomy z CP
 *
 * Wymaga: characterData.js, idb.js (IndexedDB), materials.js (CHARACTER_COSTS.bookDays)
 */

(function(){
  "use strict";

  const DEBUG = true;
  const log  = (...a)=>{ if (DEBUG) console.log("[planner]", ...a); };
  const warn = (...a)=>console.warn("[planner]", ...a);

  const normalizeName = (name)=>{
    if (!name) return "";
    let s = String(name).trim();
    s = s.replace(/\s*\([^)]*\)\s*$/g, "");
    s = s.replace(/\s+/g, " ");
    return s;
  };

  /* ---------- characterData.js: odczyt zespołów ---------- */
  function tryVar(varName){
    try { return (0,eval)(`typeof ${varName}!=="undefined"?${varName}:undefined`); }
    catch(e){ return undefined; }
  }
  function getCharacterData(){
    let cd = tryVar("characterData") || window.characterData ||
             window.CHARACTERS || window.data ||
             tryVar("CHARACTERS") || tryVar("data");
    if (!cd) { warn("Nie znaleziono characterData – używam pustego obiektu."); cd = {}; }
    return cd;
  }
  function extractMembers(team){
    if (!team) return [];
    const src = Array.isArray(team.members) ? team.members
              : Array.isArray(team.team)    ? team.team
              : [];
    const out = [];
    for (const m of src){
      if (typeof m === "string") out.push(normalizeName(m));
      else if (m && typeof m === "object" && (m.name || m.character || m.id)) {
        out.push(normalizeName(m.name || m.character || m.id));
      }
    }
    return out.filter(Boolean);
  }

  /* ---------- IndexedDB: wczytanie Character Progress ---------- */
  async function loadProgressFromIDB(){
    if (!window.IDB || !IDB.all) return { list: [], map: new Map(), set: new Set() };
    const list = (await IDB.all("progress")) || [];  // każdy rekord ma: character, ascCur/Target, naCur/Target, skillCur/Target, burstCur/Target
    list.sort((a,b)=> (a.character||"").localeCompare(b.character||"", "pl", {sensitivity:"base"}));

    const map = new Map();
    const set = new Set();
    for (const row of list){
      const name = normalizeName(row.character);
      if (!name) continue;
      map.set(name, row);
      set.add(name);
    }
    log("IndexedDB progress:", list.length, "wierszy");
    return { list, map, set };
  }

    /* ---------- Fallback (jeśli IDB puste): IDB.kv (po migracji z localStorage) ---------- */
  async function buildProgressSetFallback(){
    const objCandidates = [
      tryVar("characterProgress"),
      tryVar("CHARACTER_PROGRESS"),
      tryVar("CHAR_PROGRESS"),
      tryVar("characterLevels"),
      window.characterProgress,
      window.CHARACTER_PROGRESS,
      window.CHAR_PROGRESS,
      window.characterLevels,
      tryVar("materialsProgress"),
      window.materialsProgress
    ].filter(Boolean);

    for (const obj of objCandidates){
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        const keys = Object.keys(obj).map(normalizeName);
        if (keys.length) { log("Progress (fallback) – obiekt:", keys.length); return new Set(keys); }
      }
    }

    const arrCandidates = [
      tryVar("CHARACTER_PROGRESS_LIST"),
      tryVar("progressCharacters"),
      window.CHARACTER_PROGRESS_LIST,
      window.progressCharacters
    ].filter(Boolean);
    for (const arr of arrCandidates){
      if (Array.isArray(arr) && arr.length){ log("Progress (fallback) – tablica:", arr.length); return new Set(arr.map(normalizeName)); }
    }

    const lsKeys = [
      "characterProgress","CHARACTER_PROGRESS","CHAR_PROGRESS",
      "characterLevels","materials.characterProgress","materials.progress",
      "materials.characterLevels","materials.characterLevelsMap",
      "CHAR_LEVELS","CHAR_LEVELS_MAP","progress","progressCharacters"
    ];
    for (const key of lsKeys){
      // fallback z migratora: IDB.kv -> "progress_legacy_characters_v1"
      try{
        if (window.IDB && IDB.kvGet){
          const arr = await IDB.kvGet("progress_legacy_characters_v1");
          if (Array.isArray(arr) && arr.length){
            log("Progress (fallback) – IDB.kv legacy:", arr.length);
            return new Set(arr.map(normalizeName));
          }
        }
      }catch(e){}
    }

    warn("Brak Progress w fallbacku.");
    return new Set();
  }

  /* ---------- Book Days z CHARACTER_COSTS (materials.js) ---------- */
  function getBookDaysFor(name){
    const n = normalizeName(name);
    const obj = tryVar("CHARACTER_COSTS") || window.CHARACTER_COSTS || tryVar("characterCosts");
    if (!obj || typeof obj !== "object") return null;
    if (obj[n]?.bookDays && Array.isArray(obj[n].bookDays)) return obj[n].bookDays;
    const k = Object.keys(obj).find(k => normalizeName(k) === n);
    return k && Array.isArray(obj[k].bookDays) ? obj[k].bookDays : null;
  }

  /* ---------- Rating z characterData.js ---------- */
  function getRatingFor(name){
    const cd = getCharacterData();
    const n = normalizeName(name);
    if (!cd || typeof cd !== "object") return null;

    // 1) próba bezpośrednio po kluczu
    if (cd[n] && typeof cd[n] === "object" && cd[n].rating){
      return cd[n].rating;
    }

    // 2) dopasowanie po znormalizowanej nazwie
    for (const [key, val] of Object.entries(cd)){
      if (!val || typeof val !== "object") continue;
      if (normalizeName(key) === n && val.rating){
        return val.rating;
      }
    }

    return null;
  }

  /* ---------- Budowanie unikatowych drużyn, gdzie ≥1 członek jest w CP ---------- */
  function buildUniqueTeams_AnyMemberInProgress(progressSet){
    const characterData = getCharacterData();
    const unique = new Map(); // signature -> Set(members)
    let allTeams = 0, kept = 0;

    for (const [, charObj] of Object.entries(characterData || {})) {
      const arr = Array.isArray(charObj?.teams) ? charObj.teams : [];
      for (const team of arr) {
        allTeams++;
        const members = extractMembers(team);
        if (!members.length) continue;

        const mset = Array.from(new Set(members.map(normalizeName))).filter(Boolean);
        if (!mset.length) continue;

        if (!mset.some(m => progressSet.has(m))) continue; // ≥1 członek jest w CP

        const signature = mset.slice().sort((a,b)=>a.localeCompare(b)).join("|");
        if (!unique.has(signature)) {
          unique.set(signature, new Set(mset));
          kept++;
        }
      }
    }
    log(`Drużyny: znaleziono ${allTeams}, po filtrze/unikalności: ${kept}`);
    return unique;
  }

  function countTeamsPerCharacter(uniqueTeams){
    const counts = new Map();
    for (const members of uniqueTeams.values()){
      for (const m of members){
        counts.set(m, (counts.get(m) || 0) + 1);
      }
    }
    return counts;
  }

  /* ---------- Render helpers ---------- */
  function portraitSrcFor(name){ return `images/characters/${name}.png`; }

  function ratingIconSrc(rating){
    if (!rating) return null;
    const key = String(rating).trim().toUpperCase();
    // jeśli folder jest w "images/Rating Icons", zmień poniższą linię na:
    // return `images/Rating Icons/${key}.png`;
    return `Rating Icons/${key}.png`;
  }

  function tdText(val){ const td=document.createElement("td"); td.textContent=String(val); return td; }
  function tdLevel(val, isCur){
    const td = document.createElement("td");
    const span = document.createElement("span");
    span.className = "level " + (isCur ? "level--cur" : "level--target");
    span.textContent = (val === null || val === undefined) ? "–" : String(val);
    td.appendChild(span);
    return td;
  }

  // --- identyczne kolorowanie jak w Character Progress ---
  function paintPairCells(tdCur, tdTgt, equal){
    const shadow = equal
      ? "inset 0 0 0 2px var(--ok)"
      : "inset 0 0 0 2px var(--bad)";
    const bgOk  = "color-mix(in srgb, var(--ok) 15%, transparent)";
    const bgBad = "color-mix(in srgb, var(--bad) 15%, transparent)";

    function applyBG(td, ok){
      const desired = ok ? bgOk : bgBad;
      td.style.background = desired;
      const applied = td.style.background;
      if (!applied || applied === "") {
        td.style.background = ok
          ? "rgba(54, 179, 126, 0.12)"
          : "rgba(220, 53, 69, 0.14)";
      }
    }

    [tdCur, tdTgt].forEach(td=>{
      td.style.boxShadow = shadow;
      td.style.borderRadius = "8px";
    });
    applyBG(tdCur, equal);
    applyBG(tdTgt, equal);
  }

  function renderRow(idx, name, levels, bookDays, count, rating){
    const tr = document.createElement("tr");

    tr.appendChild(tdText(idx));

    // Portret
    const tdP = document.createElement("td");
    const img = document.createElement("img");
    img.className = "portrait";
    img.alt = name;
    img.loading = "lazy";
    img.src = portraitSrcFor(name);
    img.onerror = function(){
      if (img.dataset.f1 !== "webp") { img.dataset.f1="webp"; img.src=`images/characters/${name}.webp`; }
      else if (img.dataset.f2 !== "jpg") { img.dataset.f2="jpg"; img.src=`images/characters/${name}.jpg`; }
      else {
        img.remove();
        const ph = document.createElement("div");
        ph.className = "portrait";
        ph.style.display="grid"; ph.style.placeItems="center";
        ph.style.fontWeight="700"; ph.style.color="#9fb3c8";
        ph.textContent = (name.split(" ").map(s=>s[0]).join("").slice(0,3).toUpperCase()) || "?";
        tdP.appendChild(ph);
      }
    };
    tdP.appendChild(img);
    tr.appendChild(tdP);

    // Nazwa
    const tdName = document.createElement("td");
    tdName.className = "cell-name";
    tdName.textContent = name;
    tr.appendChild(tdName);

    // Poziomy z CP
    const tdAscCur    = tdLevel(levels?.ascCur, true);
    const tdAscTarget = tdLevel(levels?.ascTarget, false);
    tr.appendChild(tdAscCur);
    tr.appendChild(tdAscTarget);

    const tdNaCur     = tdLevel(levels?.naCur, true);
    const tdNaTarget  = tdLevel(levels?.naTarget, false);
    tr.appendChild(tdNaCur);
    tr.appendChild(tdNaTarget);

    const tdSkillCur  = tdLevel(levels?.skillCur, true);
    const tdSkillTgt  = tdLevel(levels?.skillTarget, false);
    tr.appendChild(tdSkillCur);
    tr.appendChild(tdSkillTgt);

    const tdBurstCur  = tdLevel(levels?.burstCur, true);
    const tdBurstTgt  = tdLevel(levels?.burstTarget, false);
    tr.appendChild(tdBurstCur);
    tr.appendChild(tdBurstTgt);

    // Kolorowanie par Cur/Target
    if (levels){
      const eqAsc   = Number.isFinite(levels.ascCur)   && Number.isFinite(levels.ascTarget)   && levels.ascCur   === levels.ascTarget;
      const eqNa    = Number.isFinite(levels.naCur)    && Number.isFinite(levels.naTarget)    && levels.naCur    === levels.naTarget;
      const eqSkill = Number.isFinite(levels.skillCur) && Number.isFinite(levels.skillTarget) && levels.skillCur === levels.skillTarget;
      const eqBurst = Number.isFinite(levels.burstCur) && Number.isFinite(levels.burstTarget) && levels.burstCur === levels.burstTarget;
      paintPairCells(tdAscCur,   tdAscTarget, eqAsc);
      paintPairCells(tdNaCur,    tdNaTarget,  eqNa);
      paintPairCells(tdSkillCur, tdSkillTgt,  eqSkill);
      paintPairCells(tdBurstCur, tdBurstTgt,  eqBurst);
    }

    // Book days
    const tdDays = document.createElement("td");
    tdDays.className = "cell-days";
    tdDays.textContent = Array.isArray(bookDays) && bookDays.length ? bookDays.join(", ") : "–";
    tr.appendChild(tdDays);

    // Liczba drużyn
    const tdCount = document.createElement("td");
    tdCount.className = "cell-count" + ((count||0) ? "" : " zero");
    tdCount.textContent = String(count||0);
    tr.appendChild(tdCount);

    // Rating
    const tdRating = document.createElement("td");
    tdRating.className = "cell-rating";

    if (rating){
      const imgR = document.createElement("img");
      imgR.className = "rating-icon";
      imgR.alt = rating;
      imgR.loading = "lazy";
      imgR.src = ratingIconSrc(rating);

      // jeśli ikonka się nie wczyta → pokaż tekstową literkę
      imgR.onerror = function(){
        imgR.remove();
        tdRating.textContent = rating;
      };

      tdRating.appendChild(imgR);
    } else {
      tdRating.textContent = "–";
    }

    tr.appendChild(tdRating);

    return tr;
  }

  function renderEmpty(msg){
    const tbody = document.getElementById("plannerTbody");
    tbody.innerHTML = "";
    const tr = document.createElement("tr");
    tr.className = "row-empty";
    const td = document.createElement("td");
    td.colSpan = 14;
    td.textContent = msg;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  /* ---------- State + render ---------- */
  const TODAY_EN = new Date().toLocaleDateString("en-US", { weekday: "long" }); // jak w Materials
  let FILTER_TODAY = false;

  const state = { rows: [], sort: "countDesc", filter: "" };

  function applySort(view){
    if (state.sort === "nameAsc") {
      view.sort((a,b)=> a.name.localeCompare(b.name));
    } else {
      view.sort((a,b)=> (b.count - a.count) || a.name.localeCompare(b.name));
    }
  }

  function render(){
    const tbody = document.getElementById("plannerTbody");
    if (!tbody) return;

    const q = state.filter.trim().toLowerCase();
    let view = state.rows.filter(r => !q || r.name.toLowerCase().includes(q));

    if (FILTER_TODAY) {
      view = view.filter(r => Array.isArray(r.bookDays) && r.bookDays.includes(TODAY_EN));
    }

    if (!view.length){
      renderEmpty("Brak wierszy do wyświetlenia (filtr lub brak dopasowań).");
      return;
    }

    applySort(view);
    tbody.innerHTML = "";
    view.forEach((row, i) => tbody.appendChild(
      renderRow(i+1, row.name, row.levels, row.bookDays, row.count, row.rating)
    ));
  }

  /* ---------- Główna przebudowa ---------- */
  async function rebuild(){
    // 1) Spróbuj IndexedDB (prawdziwy Character Progress)
    const { map: progressMap, set: progressSet } = await loadProgressFromIDB();

    // 2) Jeśli IndexedDB puste → fallback (LS/obiekty)
    let effectiveSet = progressSet;
    if (!effectiveSet.size){
      effectiveSet = buildProgressSetFallback();
      if (!effectiveSet.size){
        renderEmpty("Brak danych Character Progress – otwórz najpierw Materials/Character i zapisz postępy.");
        return;
      }
    }

    // 3) Zlicz unikatowe drużyny, w których ≥1 członek jest w CP
    const uniqueTeams = buildUniqueTeams_AnyMemberInProgress(effectiveSet);
    const counts = countTeamsPerCharacter(uniqueTeams);

    // 4) Wiersze: wyłącznie postacie z Character Progress
    const names = Array.from(effectiveSet).sort((a,b)=>a.localeCompare(b));
    const rows = names.map(name => {
      // poziomy z IDB jeśli są, inaczej brak (pokazujemy "–")
      const rec = progressMap.get(name);
      const levels = rec ? {
        ascCur: rec.ascCur, ascTarget: rec.ascTarget,
        naCur: rec.naCur, naTarget: rec.naTarget,
        skillCur: rec.skillCur, skillTarget: rec.skillTarget,
        burstCur: rec.burstCur, burstTarget: rec.burstTarget
      } : null;
      return {
        name,
        levels,
        bookDays: getBookDaysFor(name),
        count: counts.get(name) || 0,
        rating: getRatingFor(name)
      };
    });

    state.rows = rows;
    render();
  }

  function setupUi(){
    const search = document.getElementById("search");
    const sortByName  = document.getElementById("sortByName");
    const sortByCount = document.getElementById("sortByCount");
    const refresh     = document.getElementById("refresh");
    const filterTodayEl = document.getElementById("filter-today");

    if (search) search.addEventListener("input", e => { state.filter = e.target.value || ""; render(); });
    if (sortByName)  sortByName.addEventListener("click", ()=>{ state.sort="nameAsc";  render(); });
    if (sortByCount) sortByCount.addEventListener("click", ()=>{ state.sort="countDesc"; render(); });
    if (refresh)     refresh.addEventListener("click", rebuild);

    if (filterTodayEl){
      FILTER_TODAY = !!filterTodayEl.checked;
      filterTodayEl.addEventListener("change", ()=>{
        FILTER_TODAY = !!filterTodayEl.checked;
        render();
      });
    }
  }

  window.addEventListener("DOMContentLoaded", ()=>{
    setupUi();
    // Poczekaj 1 klatkę na doładowanie defer-scripts (characterData/materials/idb), potem licz
    requestAnimationFrame(rebuild);
  });
})();
