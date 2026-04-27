/* team-planner.js (od zera)
   Wymagania:
   - unikalne teamy po secie członków
   - top 8 slotów, lock/usuń/clear
   - filtry żywiołów (max 3) + zasada: team nie może mieć członków spoza filtrów
   - ownedOnly (4/4)
   - sort: name / matchElements / ownedCompleteness
   - limit: postać max w 2 top teamach + modal: kto blokuje, gdzie, swap w slocie X
   - live conflict badge w wynikach
*/

(function(){
  "use strict";

  const STORE_KEY = "teamPlanner_v2"; // nowe, małe dane w IDB

  const ELEMENTS = [
    "Pyro","Hydro","Electro","Cryo","Anemo","Geo","Dendro"
  ];

  const $ = (sel) => document.querySelector(sel);

  // ---------- assets helpers ----------
  function imgForCharacter(name){ return `images/characters/${name}.png`; }
  function imgForElement(element){ return `Element Icons/${element}.png`; }

  function charElement(name){
    const c = (window.characterData || {})[name];
    return (c && c.element) ? String(c.element) : null;
  }

  function makeImg(src, className, alt){
    const img = document.createElement("img");
    img.className = className;
    img.alt = alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    img.src = src;
    // jeśli plik nie istnieje (np. literówka w nazwie), po prostu usuń obrazek
    img.addEventListener("error", () => { img.remove(); });
    return img;
  }

  function createCharChip(name, { showName = true, muted = false, showElement = true } = {}){
    const chip = document.createElement("span");
    chip.className = "tp__chip" + (muted ? " tp__chipMuted" : "");
    chip.title = name;

    chip.appendChild(makeImg(imgForCharacter(name), "tp__charIcon", name));

    if (showElement){
      const el = charElement(name);
      if (el) chip.appendChild(makeImg(imgForElement(el), "tp__elMini", el));
    }

    if (showName){
      const t = document.createElement("span");
      t.className = "tp__chipText";
      t.textContent = name;
      chip.appendChild(t);
    }

    return chip;
  }

  function roleToClass(role){
    const r = String(role || "").toLowerCase();
    if (r.includes("main")) return "is-main";
    if (r.includes("sub")) return "is-sub";
    if (r.includes("support")) return "is-support";
    return "";
  }

  function getRoleForMember(teamLike, memberName){
    // 1) jeśli slot na górze ma zapisane role
    if (teamLike && teamLike.memberRoles && teamLike.memberRoles[memberName]){
      return String(teamLike.memberRoles[memberName] || "");
    }

    // 2) jeśli to team z wyników: szukaj w wariantach
    const vars = teamLike && Array.isArray(teamLike.variants) ? teamLike.variants : [];
    for (const v of vars){
      const arr = Array.isArray(v.memberRoles) ? v.memberRoles : [];
      for (const mr of arr){
        if (mr && mr.name === memberName && mr.role) return String(mr.role);
      }
    }
    return "";
  }

  function createTeamShowcase(teamLike){
    const wrap = document.createElement("div");
    wrap.className = "tp__showcase";

    const members = Array.isArray(teamLike.members) ? teamLike.members : [];
    for (const name of members){
      const owned = isOwned(name);

      const el = charElement(name);
      const role = getRoleForMember(teamLike, name);

      const item = document.createElement("div");
      item.className = "tp__member" + (!owned ? " is-not-owned" : "");
      item.title = name;

      item.appendChild(makeImg(imgForCharacter(name), "tp__portrait", name));

      const nm = document.createElement("div");
      nm.className = "tp__memberName";
      nm.textContent = name;
      item.appendChild(nm);

      if (role){
        const badge = document.createElement("div");
        badge.className = "tp__roleBadge " + roleToClass(role);
        badge.textContent = role;
        item.appendChild(badge);
      }

      if (el){
        item.appendChild(makeImg(imgForElement(el), "tp__elementBig", el));
      }

      wrap.appendChild(item);
    }

    return wrap;
  }

  function buildMemberRolesMap(team){
    // zapisujemy do slotów, żeby role były stabilne w top 8
    const out = {};
    for (const m of (team.members || [])){
      const r = getRoleForMember(team, m);
      if (r) out[m] = r;
    }
    return out;
  }

  const state = {
    view: "tiles",                 // tiles | list
    ownedOnly: false,
    sortMode: "name",              // name | match | owned
    elementFilter: [],             // max 3 elementy
    topSlots: Array.from({length:8}, () => ({ locked:false, teamKey:null, members:[], displayName:"" })),
    // dane wyników
    teams: [],                     // lista unikalnych teamów
    ownedMap: {},                  // {Name: true/obj}
  };

  // ---------- boot ----------
  document.addEventListener("DOMContentLoaded", init);

  async function init(){
    // dane
    state.ownedMap = await loadOwnedMap();
    state.teams = buildUniqueTeamsFromCharacterData(window.characterData || {});

    // ui listeners
    $("#ownedOnly").addEventListener("change", () => {
      state.ownedOnly = $("#ownedOnly").checked;
      persist();
      renderAll();
    });

    $("#sortMode").addEventListener("change", () => {
      state.sortMode = $("#sortMode").value;
      persist();
      renderAll();
    });

    $("#viewTiles").addEventListener("click", () => setView("tiles"));
    $("#viewList").addEventListener("click", () => setView("list"));

    $("#clearTop").addEventListener("click", () => clearTopUnlocked());

    // modal
    $("#conflictClose").addEventListener("click", closeConflictModal);
    $("#conflictCancel").addEventListener("click", closeConflictModal);
    $("#conflictModal").addEventListener("click", (e) => {
      if (e.target === $("#conflictModal")) closeConflictModal();
    });

    // restore
    await restore();

    // render
    renderElementFilters();
    renderAll();
  }

  function setView(view){
    state.view = view;
    $("#viewTiles").classList.toggle("is-active", view === "tiles");
    $("#viewList").classList.toggle("is-active", view === "list");
    persist();
    renderAll();
  }

  // ---------- data: owned ----------
  async function loadOwnedMap(){
    try{
      const owned = ((window.IDB && IDB.kvGet) ? (await IDB.kvGet("ownedCharacters_v1")) : null) || {};
      return owned || {};
    }catch(err){
      console.warn("Owned map load failed:", err);
      return {};
    }
  }

  function isOwned(name){
    const v = state.ownedMap ? state.ownedMap[name] : null;
    return !!v; // w Twojej appce zwykle to obiekt lub true
  }

  // ---------- data: unique teams ----------
  function buildUniqueTeamsFromCharacterData(characterData){
    // Map: teamKey -> aggregated team
    const map = new Map();

    for (const [charName, charObj] of Object.entries(characterData)){
      const teams = Array.isArray(charObj.teams) ? charObj.teams : [];
      for (const t of teams){
        const members = (t && Array.isArray(t.members)) ? t.members.map(m => (m && m.name ? String(m.name) : "")).filter(Boolean) : [];
        if (members.length !== 4) continue;

        const teamKey = makeTeamKey(members);

        if (!map.has(teamKey)){
          map.set(teamKey, {
            teamKey,
            displayName: (t && t.name) ? String(t.name) : "Team",
            members: uniquePreserve(members),
            // meta
            variants: [], // role/comment/rotationIcons z różnych wystąpień
            elements: [], // wyliczone później
          });
        }

        const agg = map.get(teamKey);
        agg.variants.push({
          from: charName,
          name: (t && t.name) ? String(t.name) : "",
          comment: (t && t.comment) ? String(t.comment) : "",
          rotationIcons: Array.isArray(t.rotationIcons) ? t.rotationIcons : null,
          memberRoles: (Array.isArray(t.members) ? t.members.map(m => ({
            name: m && m.name ? String(m.name) : "",
            role: m && m.role ? String(m.role) : ""
          })) : [])
        });

        // preferuj najdłuższą / bardziej opisową nazwę (żeby sort A→Z miało sens)
        const candidateName = (t && t.name) ? String(t.name) : "";
        if (candidateName && candidateName.length > agg.displayName.length){
          agg.displayName = candidateName;
        }
      }
    }

    // policz elementy dla teamów
    for (const team of map.values()){
      team.elements = team.members.map(n => {
        const c = characterData[n];
        return c && c.element ? String(c.element) : "Unknown";
      });
    }

    return Array.from(map.values());
  }

  function makeTeamKey(members){
    // identyczny set członków = to samo (kolejność nie ma znaczenia)
    const sorted = [...members].map(String).sort((a,b)=>a.localeCompare(b, "pl"));
    return sorted.join("|");
  }

  function uniquePreserve(arr){
    const seen = new Set();
    const out = [];
    for (const x of arr){
      if (!seen.has(x)){ seen.add(x); out.push(x); }
    }
    return out;
  }

  // ---------- UI: element filters ----------
  function renderElementFilters(){
    const wrap = $("#elementFilters");
    wrap.innerHTML = "";

    ELEMENTS.forEach(el => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tp__elBtn";
      btn.dataset.el = el;

      const icon = makeImg(imgForElement(el), "tp__elIcon", el);
      btn.appendChild(icon);

      const label = document.createElement("span");
      label.textContent = el;
      btn.appendChild(label);

      btn.addEventListener("click", () => toggleElementFilter(el));
      wrap.appendChild(btn);
    });

    syncElementButtons();
  }

  function toggleElementFilter(el){
    const idx = state.elementFilter.indexOf(el);
    if (idx >= 0){
      state.elementFilter.splice(idx, 1);
    }else{
      if (state.elementFilter.length >= 3) return; // max 3
      state.elementFilter.push(el);
    }
    syncElementButtons();
    persist();
    renderAll();
  }

  function syncElementButtons(){
    document.querySelectorAll(".tp__elBtn").forEach(btn => {
      const el = btn.dataset.el;
      btn.classList.toggle("is-active", state.elementFilter.includes(el));
    });
  }

  // ---------- TOP slots ----------
  function renderTopSlots(){
    const wrap = $("#topSlots");
    wrap.innerHTML = "";

    state.topSlots.forEach((slot, i) => {
      const card = document.createElement("div");
      card.className = "tp__slot";
      if (slot.locked) card.classList.add("is-locked");

      const top = document.createElement("div");
      top.className = "tp__slotTop";

      const title = document.createElement("div");
      title.className = "tp__slotTitle";
      title.textContent = `Slot ${i+1}`;
      top.appendChild(title);

      const btns = document.createElement("div");
      btns.className = "tp__slotBtns";

      const lockBtn = document.createElement("button");
      lockBtn.type = "button";
      lockBtn.className = "tp__iconBtn";
      lockBtn.textContent = slot.locked ? "Unlock" : "Lock";
      lockBtn.title = "Zablokuj / odblokuj slot";
      lockBtn.addEventListener("click", () => {
        slot.locked = !slot.locked;
        persist();
        renderAll();
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "tp__iconBtn";
      delBtn.textContent = "Usuń";
      delBtn.title = "Usuń drużynę z tego slotu";
      delBtn.disabled = !slot.teamKey;
      delBtn.addEventListener("click", () => {
        if (slot.locked) return;
        clearSlot(i);
      });

      btns.appendChild(lockBtn);
      btns.appendChild(delBtn);
      top.appendChild(btns);

      card.appendChild(top);

      if (!slot.teamKey){
        const empty = document.createElement("div");
        empty.className = "tp__chip tp__chipMuted";
        empty.textContent = "Pusty slot";
        card.appendChild(empty);
      }else{
        const nameChip = document.createElement("div");
        nameChip.className = "tp__chip";
        nameChip.textContent = slot.displayName || "Team";
        card.appendChild(nameChip);

        const showcase = createTeamShowcase(slot);
        card.appendChild(showcase);
      }

      wrap.appendChild(card);
    });

    $("#topStats").textContent = buildTopStatsText();
  }

  function clearSlot(i){
    const s = state.topSlots[i];
    if (s.locked) return;
    state.topSlots[i] = { locked:false, teamKey:null, members:[], displayName:"" };
    persist();
    renderAll();
  }

  function clearTopUnlocked(){
    state.topSlots = state.topSlots.map(s => s.locked ? s : ({ locked:false, teamKey:null, members:[], displayName:"" }));
    persist();
    renderAll();
  }

  function buildTopStatsText(){
    const usage = computeUsageCounts();
    const over = Object.entries(usage).filter(([,c]) => c >= 2).map(([n])=>n);
    if (!over.length) return "Brak konfliktów limitu 2 wystąpień postaci.";
    return `Postacie osiągnęły limit (2/2): ${over.join(", ")}. Drużyny w wynikach z tymi postaciami dostaną badge "Conflict".`;
  }

  // ---------- usage counts / conflicts ----------
  function computeUsageCounts(){
    const counts = Object.create(null);
    for (const s of state.topSlots){
      if (!s.teamKey) continue;
      for (const m of s.members){
        counts[m] = (counts[m] || 0) + 1;
      }
    }
    return counts;
  }

  function getBlockingInfo(newMembers, replaceSlotIndex /*nullable*/){
    // zwraca:
    // - blockers: [{name, slots:[idx,...]}]
    // - wouldExceed: true/false
    const slotsToCheck = state.topSlots.map((s, idx) => {
      if (replaceSlotIndex != null && idx === replaceSlotIndex){
        return null; // usuwamy stary team w tym slocie (symulacja)
      }
      return s;
    });

    const counts = Object.create(null);
    const usedSlots = Object.create(null); // name -> [slotIdx,...]

    slotsToCheck.forEach((s, idx) => {
      if (!s || !s.teamKey) return;
      s.members.forEach(m => {
        counts[m] = (counts[m] || 0) + 1;
        (usedSlots[m] ||= []).push(idx);
      });
    });

    const blockers = [];
    let wouldExceed = false;

    for (const m of newMembers){
      const c = counts[m] || 0;
      if (c >= 2){
        wouldExceed = true;
        blockers.push({ name: m, slots: usedSlots[m] ? [...usedSlots[m]] : [] });
      }
    }

    return { blockers, wouldExceed };
  }

  // ---------- results ----------
  function renderResults(){
    const wrap = $("#results");
    wrap.className = "tp__grid" + (state.view === "list" ? " is-list" : "");

    const usage = computeUsageCounts();

    const filtered = applyFilters(state.teams);
    const sorted = applySort(filtered);

    $("#resultsCount").textContent = `Wyniki: ${sorted.length} / ${state.teams.length}`;
    $("#activeRules").textContent = buildActiveRulesText();

    wrap.innerHTML = "";
    for (const team of sorted){
      const card = document.createElement("div");
      card.className = "tp__card";

      const head = document.createElement("div");
      head.className = "tp__cardHead";

      const left = document.createElement("div");
      const name = document.createElement("div");
      name.className = "tp__cardName";
      name.textContent = team.displayName || "Team";
      left.appendChild(name);

      const meta = document.createElement("div");
      meta.className = "tp__cardMeta";

      const ownedCount = team.members.reduce((a,m)=>a+(isOwned(m)?1:0),0);
      meta.innerHTML = "";

      const metaRow = document.createElement("div");
      metaRow.className = "tp__metaRow";

      metaRow.appendChild(document.createTextNode(`Owned: ${ownedCount}/4`));
      metaRow.appendChild(document.createTextNode(" • "));

      const elLabel = document.createElement("span");
      elLabel.className = "tp__metaLabel";
      elLabel.textContent = "Elementy w teamie:";
      metaRow.appendChild(elLabel);

      uniquePreserve(team.elements).forEach(e => {
        metaRow.appendChild(makeImg(imgForElement(e), "tp__elMini", e));
      });

      meta.appendChild(metaRow);

      left.appendChild(meta);

      head.appendChild(left);

      const badges = document.createElement("div");
      badges.className = "tp__badges";

      if (ownedCount === 4){
        const b = document.createElement("span");
        b.className = "tp__badge tp__badge--owned";
        b.textContent = "Owned 4/4";
        badges.appendChild(b);
      }

      if (isConflictTeam(team, usage)){
        const b = document.createElement("span");
        b.className = "tp__badge tp__badge--conflict";
        b.textContent = "Conflict";
        badges.appendChild(b);
      }

      head.appendChild(badges);
      card.appendChild(head);

      // members chips
      const showcase = createTeamShowcase(team);
      card.appendChild(showcase);

      // add button
      const add = document.createElement("button");
      add.type = "button";
      add.className = "tp__btn";
      add.textContent = "Dodaj do listy";
      add.addEventListener("click", () => tryAddTeam(team));
      card.appendChild(add);

      // quick preview (tooltip/accordion style)
      const details = document.createElement("details");
      details.className = "tp__details";

      const sum = document.createElement("summary");
      sum.textContent = "Podgląd ról / komentarzy (z characterData.js)";
      details.appendChild(sum);

      const content = document.createElement("div");
      content.className = "tp__detailsContent";

      const variants = (team.variants || []).slice(0, 4); // krótko, bez przeładowania UI
      variants.forEach(v => {
        const row = document.createElement("div");
        const title = (v.name ? v.name : team.displayName) + (v.from ? ` • źródło: ${v.from}` : "");
        const comment = v.comment ? v.comment : "(brak komentarza)";
        row.textContent = `${title} — ${comment}`;
        content.appendChild(row);
      });

      if ((team.variants || []).length > 4){
        const more = document.createElement("div");
        more.textContent = `+ ${(team.variants.length - 4)} innych wariantów…`;
        content.appendChild(more);
      }

      details.appendChild(content);
      card.appendChild(details);

      wrap.appendChild(card);
    }
  }

  function isConflictTeam(team, usageCounts){
    return team.members.some(m => (usageCounts[m] || 0) >= 2);
  }

  function buildActiveRulesText(){
    const parts = [];
    if (state.elementFilter.length){
      parts.push(`Filtr elementów: ${state.elementFilter.join(", ")}`);
      parts.push(`Zasada: brak członków spoza filtrów`);
    }else{
      parts.push("Filtr elementów: (brak)");
    }
    if (state.ownedOnly) parts.push("OwnedOnly: ON");
    parts.push(`Sort: ${state.sortMode}`);
    return parts.join(" • ");
  }

  function applyFilters(list){
    let out = [...list];

    // filtr ownedOnly: tylko 4/4
    if (state.ownedOnly){
      out = out.filter(t => t.members.every(isOwned));
    }

    // filtr elementów + reguła: team nie może mieć członków spoza wybranych elementów
    if (state.elementFilter.length){
      const allowed = new Set(state.elementFilter);
      out = out.filter(t => t.elements.every(e => allowed.has(e)));
    }

    return out;
  }

  function applySort(list){
    const out = [...list];

    const allowed = new Set(state.elementFilter);
    const matchCount = (t) => {
      if (!state.elementFilter.length) return 0;
      const uniq = new Set(t.elements);
      let c = 0;
      uniq.forEach(e => { if (allowed.has(e)) c++; });
      return c;
    };

    const ownedCount = (t) => t.members.reduce((a,m)=>a+(isOwned(m)?1:0),0);

    if (state.sortMode === "name"){
      out.sort((a,b)=> (a.displayName||"").localeCompare((b.displayName||""), "pl"));
    }else if (state.sortMode === "match"){
      out.sort((a,b)=> {
        const d = matchCount(b) - matchCount(a);
        if (d !== 0) return d;
        return (a.displayName||"").localeCompare((b.displayName||""), "pl");
      });
    }else if (state.sortMode === "owned"){
      out.sort((a,b)=> {
        const d = ownedCount(b) - ownedCount(a);
        if (d !== 0) return d;
        return (a.displayName||"").localeCompare((b.displayName||""), "pl");
      });
    }

    return out;
  }

  // ---------- add team / validation / modal ----------
  function tryAddTeam(team){
    const newMembers = team.members;

    // znajdź slot docelowy (pierwszy pusty i nie-locked)
    const target = findFirstFreeUnlockedSlot();
    if (target == null){
      // jeżeli brak wolnych: pokaż modal z opcjami swap
      openConflictModal({
        title: "Brak wolnych slotów",
        desc: "Masz zajęte wszystkie odblokowane sloty. Wybierz zamianę w slocie.",
        blockers: [],
        team,
        reason: "no-space"
      });
      return;
    }

    // walidacja limitu 2
    const { blockers, wouldExceed } = getBlockingInfo(newMembers, null);
    if (wouldExceed){
      openConflictModal({
        title: "Limit 2 wystąpień postaci został przekroczony",
        desc: "Nie można dodać tej drużyny, bo poniższe postacie są już użyte w 2 slotach.",
        blockers,
        team,
        reason: "limit"
      });
      return;
    }

    // dodaj
    assignTeamToSlot(team, target);
  }

  function assignTeamToSlot(team, slotIndex){
    const slot = state.topSlots[slotIndex];
    if (slot.locked) return;

    state.topSlots[slotIndex] = {
      locked: slot.locked,
      teamKey: team.teamKey,
      members: [...team.members],
      displayName: team.displayName || "Team",
      memberRoles: buildMemberRolesMap(team)
    };
    persist();
    renderAll();
  }

  function findFirstFreeUnlockedSlot(){
    for (let i=0;i<state.topSlots.length;i++){
      const s = state.topSlots[i];
      if (!s.locked && !s.teamKey) return i;
    }
    return null;
  }

  function openConflictModal({title, desc, blockers, team, reason}){
    $("#conflictTitle").textContent = title;
    $("#conflictDesc").textContent = desc;

    const list = $("#conflictList");
    list.innerHTML = "";

    if (blockers && blockers.length){
      blockers.forEach(b => {
        const row = document.createElement("div");
        row.className = "tp__conflictRow";

        const left = document.createElement("div");
        left.innerHTML = "";

        const who = createCharChip(b.name, { showName: true, muted: false, showElement: true });
        left.appendChild(who);

        const where = document.createElement("div");
        where.className = "tp__chipMuted";
        where.textContent = `W slocie: ${b.slots.map(i => i + 1).join(", ")}`;
        left.appendChild(where);

        const right = document.createElement("div");
        right.className = "tp__chipMuted";
        right.textContent = "Blokuje dodanie";

        row.appendChild(left);
        row.appendChild(right);
        list.appendChild(row);
      });
    }else{
      const row = document.createElement("div");
      row.className = "tp__chip tp__chipMuted";
      row.textContent = (reason === "no-space")
        ? "Brak blokujących postaci – problemem jest brak miejsca."
        : "Brak szczegółów konfliktu.";
      list.appendChild(row);
    }

    // swap options: pokaż „zamień w slocie X” tylko gdy zamiana rozwiąże konflikt
    const swaps = $("#swapOptions");
    swaps.innerHTML = "";

    const candidates = state.topSlots
      .map((s, idx) => ({s, idx}))
      .filter(x => !x.s.locked); // nie ruszamy locked

    if (!candidates.length){
      const info = document.createElement("div");
      info.className = "tp__chip tp__chipMuted";
      info.textContent = "Wszystkie sloty są zablokowane. Odblokuj slot, aby umożliwić zamianę.";
      swaps.appendChild(info);
    }else{
      candidates.forEach(({idx}) => {
        const { wouldExceed } = getBlockingInfo(team.members, idx); // symuluj replace idx
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tp__btn";
        btn.textContent = `Zamień w slocie ${idx+1}`;
        btn.disabled = wouldExceed; // jeżeli nadal łamie limit – blokuj
        btn.addEventListener("click", () => {
          assignTeamToSlot(team, idx);
          closeConflictModal();
        });
        swaps.appendChild(btn);
      });
    }

    $("#conflictModal").hidden = false;
  }

  function closeConflictModal(){
    $("#conflictModal").hidden = true;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  // ---------- render all ----------
  function renderAll(){
    renderTopSlots();
    renderResults();
  }

  // ---------- persistence (IDB kv) ----------
  async function persist(){
    const payload = {
      view: state.view,
      ownedOnly: state.ownedOnly,
      sortMode: state.sortMode,
      elementFilter: [...state.elementFilter],
      topSlots: state.topSlots.map(s => ({
        locked: !!s.locked,
        teamKey: s.teamKey || null,
        members: Array.isArray(s.members) ? [...s.members] : [],
        displayName: s.displayName || ""
      }))
    };

    try{
      if (window.IDB && IDB.kvSet){
        await IDB.kvSet(STORE_KEY, payload);
      }else{
        // fallback minimalny (mały), żeby nie wywołać quota
        localStorage.setItem(STORE_KEY, JSON.stringify(payload).slice(0, 3000));
      }
    }catch(err){
      console.warn("Persist failed:", err);
    }
  }

  async function restore(){
    try{
      let payload = null;
      if (window.IDB && IDB.kvGet){
        payload = await IDB.kvGet(STORE_KEY);
      }else{
        const raw = localStorage.getItem(STORE_KEY);
        payload = raw ? JSON.parse(raw) : null;
      }

      if (!payload) return;

      state.view = payload.view === "list" ? "list" : "tiles";
      state.ownedOnly = !!payload.ownedOnly;
      state.sortMode = payload.sortMode || "name";
      state.elementFilter = Array.isArray(payload.elementFilter) ? payload.elementFilter.slice(0,3) : [];

      const slots = Array.isArray(payload.topSlots) ? payload.topSlots : [];
      if (slots.length === 8){
        state.topSlots = slots.map(s => ({
          locked: !!s.locked,
          teamKey: s.teamKey || null,
          members: Array.isArray(s.members) ? s.members.slice(0,4) : [],
          displayName: s.displayName || ""
        }));
      }

      // sync ui values
      $("#ownedOnly").checked = state.ownedOnly;
      $("#sortMode").value = state.sortMode;

      setView(state.view);
      syncElementButtons();

    }catch(err){
      console.warn("Restore failed:", err);
    }
  }

})();
