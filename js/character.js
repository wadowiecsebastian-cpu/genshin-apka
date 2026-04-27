(function () {
  const $ = (s) => document.querySelector(s);

  /* ---------- URL params ---------- */
  const url = new URL(location.href);
  const rowIdParam = url.searchParams.get("row");
  const nameParam  = url.searchParams.get("character");

  /* ---------- Pagination state ---------- */
  let progressRows = [];   // posortowane wiersze z IndexedDB (Character Progress)
  let currentIndex = 0;    // który wiersz właśnie oglądamy

  /* ---------- Helpers ---------- */
  function imgForCharacter(name) { return `images/characters/${name}.png`; }
  function lc(x) { return (x || "").toLowerCase(); }
  const byName = (a,b)=> (a.character||'').localeCompare(b.character||'', 'pl', {sensitivity:'base'});

  // === FORMAT LICZB DO WYŚWIETLANIA (np. 1,185,634) ===
  const NF  = new Intl.NumberFormat('en-US');
  const fmt = (n) => NF.format(n || 0);

  function findMaterial(key) {
    const S = MATERIALS;
        const secs = [S.gems, S.books, S.enemies, S.bossNormal, S.bossWeekly, S.local, S.levelUp, S.misc, S.mora];
    for (const sec of secs) {
      const hit = (sec?.items || []).find(i => i.key === key);
      if (hit) return hit;
    }
    return null;
  }
  const findGemByGroupTier   = (group, tier) => (MATERIALS?.gems?.items    || []).find(it => it.group === group && it.tier === tier)   || null;
  const findEnemyByGroupTier = (group, tier) => (MATERIALS?.enemies?.items || []).find(it => it.group === group && it.tier === tier)  || null;
  const findBookByGroupTier  = (group, tier) => (MATERIALS?.books?.items   || []).find(it => it.group === group && it.tier === tier)   || null;

  /* ---------- Sumy kosztów ---------- */
  function sumAscNeeds(costs, fromPhase, toPhase) {
    const out = { mora: 0, gems: { t1: 0, t2: 0, t3: 0, t4: 0 }, enemy: { t1: 0, t2: 0, t3: 0 }, local: 0, boss: 0 };
    if (!Array.isArray(costs?.asc)) return out;
    const start = Math.max(0, Math.min(fromPhase, costs.asc.length));
    const stop  = Math.max(0, Math.min(toPhase,  costs.asc.length));
    for (let i = start; i < stop; i++) {
      const st = costs.asc[i]; if (!st) continue;
      out.mora += st.mora || 0;
      ["t1","t2","t3","t4"].forEach(t => out.gems[t]  += st.gems?.[t]  || 0);
      ["t1","t2","t3"].forEach(t => out.enemy[t] += st.enemy?.[t] || 0);
      out.local += st.local || 0;
      out.boss  += st.boss  || 0;
    }
    return out;
  }
  function sumTalNeeds(costs, fromLv, toLv) {
    const out = { books: { t1: 0, t2: 0, t3: 0 }, enemy: { t1: 0, t2: 0, t3: 0 }, weekly: 0, crown: 0, mora: 0 };
    if (!Array.isArray(costs?.tal)) return out;
    const startStep = Math.max(1, Math.min(fromLv, 10));
    const stopStep  = Math.max(1, Math.min(toLv,   10));
    for (let lv = startStep; lv < stopStep; lv++) {
      const step = costs.tal[lv-1]; if (!step) continue;
      ["t1","t2","t3"].forEach(t => out.books[t] += step.books?.[t] || 0);
      ["t1","t2","t3"].forEach(t => out.enemy[t] += step.enemy?.[t] || 0);
      out.weekly += step.weekly || 0;
      out.crown  += step.crown  || 0;
      out.mora   += step.mora   || 0;
    }
    return out;
  }

  const LEVEL_MILESTONES = [1, 20, 40, 50, 60, 70, 80, 90];
  const ASC_PHASE_TO_LEVEL_CUR = [1, 20, 40, 50, 60, 70, 80];
  const ASC_PHASE_TO_LEVEL_TARGET = [20, 40, 50, 60, 70, 80, 90];

  function fallbackLevelCur(row){
    const phase = Math.max(0, Math.min(6, parseInt(row?.ascCur ?? 0, 10) || 0));
    return ASC_PHASE_TO_LEVEL_CUR[phase] || 1;
  }

  function fallbackLevelTarget(row){
    const phase = Math.max(0, Math.min(6, parseInt(row?.ascTarget ?? 6, 10) || 6));
    return ASC_PHASE_TO_LEVEL_TARGET[phase] || 90;
  }

  function getLevelCur(row){
    const val = parseInt(row?.levelCur, 10);
    return LEVEL_MILESTONES.includes(val) ? val : fallbackLevelCur(row);
  }

  function getLevelTarget(row){
    const val = parseInt(row?.levelTarget, 10);
    return LEVEL_MILESTONES.includes(val) ? val : fallbackLevelTarget(row);
  }

  function sumLevelNeeds(fromLv, toLv) {
    const out = { hero: 0, adventurer: 0, wanderer: 0, mora: 0 };
    const list = Array.isArray(LEVEL_UP_COSTS) ? LEVEL_UP_COSTS : [];

    for (const step of list) {
      if (step.from >= fromLv && step.to <= toLv) {
        out.hero += step.hero || 0;
        out.adventurer += step.adventurer || 0;
        out.wanderer += step.wanderer || 0;
        out.mora += step.mora || 0;
      }
    }

    return out;
  }

  /* ---------- IndexedDB ---------- */
  async function getInv(key) { try { return (await IDB.get("inventory", key)) ?? 0; } catch { return 0; } }
  async function setInv(key, val) { try { return await IDB.set("inventory", key, val); } catch {} }

  /* ---------- Aktualizacja wszystkich kart danego klucza ---------- */
  function updateCardsForKey(key, have) {
    document.querySelectorAll(`.card[data-key="${CSS.escape(key)}"]`).forEach(card => {
      const need = parseInt(card.dataset.needQty || "0", 10) || 0;
      const haveBox = card.querySelector(".have-val");
      const input   = card.querySelector(".have-input");
      const missBox = card.querySelector(".miss-val");
      const delta   = Math.max(0, need - have);

      if (haveBox) haveBox.textContent = fmt(have); // sformatowane
      if (input)   input.value = have;              // surowa liczba do edycji
      if (missBox) {
        missBox.textContent = fmt(delta);
        missBox.classList.toggle("warn", delta > 0);
        missBox.classList.toggle("ok",   delta === 0);
      }
    });
  }

  /* ---------- Render karty materiału (z edycją) ---------- */
  async function renderNeedCard(container, def, needQty) {
    if (!def || needQty <= 0) return;
    const have    = parseInt(await getInv(def.key), 10) || 0;
    const missing = Math.max(0, needQty - have);

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.key = def.key;
    card.dataset.needQty = String(needQty);

    const img = document.createElement("img");
    img.src = def.icon || ""; img.alt = def.name || def.key;

    const meta = document.createElement("div");
    meta.className = "meta";

    const h4 = document.createElement("h4");
    h4.textContent = def.name || def.key;

    const line = document.createElement("div");
    line.className = "needline";
    line.innerHTML = `
      <div class="needcell">
        <span class="label muted">Need</span>
        <b class="qty">${fmt(needQty)}</b>
      </div>

      <div class="needcell">
        <span class="label muted">Have</span>
        <b class="qty have-val">${fmt(have)}</b>
        <div class="qty-controls">
          <button class="btn dec" title="–1">–</button>
          <input type="number" class="have-input" min="0" step="1" inputmode="numeric" />
          <button class="btn inc" title="+1">+</button>
        </div>
      </div>

      <div class="needcell">
        <span class="label muted">Missing</span>
        <b class="qty miss-val ${missing > 0 ? "warn" : "ok"}">${fmt(missing)}</b>
      </div>
    `;
    line.querySelector(".have-input").value = have; // surowa wartość do edycji

    const applyDelta = async (delta) => {
      let v = parseInt(await getInv(def.key), 10) || 0;
      v = Math.max(0, v + delta);
      await setInv(def.key, v);
      updateCardsForKey(def.key, v);
    };
    line.querySelector(".inc").addEventListener("click", (e) => {
      const step = e.shiftKey ? 10 : (e.ctrlKey || e.altKey ? 5 : 1);
      applyDelta(step);
    });
    line.querySelector(".dec").addEventListener("click", (e) => {
      const step = e.shiftKey ? 10 : (e.ctrlKey || e.altKey ? 5 : 1);
      applyDelta(-step);
    });

    const input = line.querySelector(".have-input");
    const commitInput = async () => {
      let v = parseInt(input.value, 10);
      if (isNaN(v) || v < 0) v = 0;
      await setInv(def.key, v);
      updateCardsForKey(def.key, v);
    };
    input.addEventListener("change", commitInput);
    input.addEventListener("blur", commitInput);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commitInput(); }
    });

    meta.append(h4, line);
    card.append(img, meta);
    container.appendChild(card);
  }

  /* ---------- RENDER CAŁEJ POSTACI Z DANEGO WIERSZA ---------- */
  function applyFromRow(row){
    const charName = row?.character || null;
    if (!charName || !CHARACTER_COSTS[charName]) {
      $("#char-name").textContent = charName || "Unknown";
      $("#char-element").textContent = "—";
      $("#char-asc").textContent = "—";
      $("#char-na").textContent = "—";
      $("#char-skill").textContent = "—";
      $("#char-burst").textContent = "—";
      return;
    }

    const costs = CHARACTER_COSTS[charName];
    const element  = row?.element || costs.element || "";
    const levelCur = getLevelCur(row), levelTarget = getLevelTarget(row);
    const ascCur   = row?.ascCur ?? 0,   ascTarget = row?.ascTarget ?? 6;
    const naCur    = row?.naCur ?? 1,    naTarget  = row?.naTarget  ?? 10;
    const skCur    = row?.skillCur ?? 1, skTarget  = row?.skillTarget ?? 10;
    const brCur    = row?.burstCur ?? 1, brTarget  = row?.burstTarget ?? 10;
    const notes    = row?.notes || "";

    // Hero
    $("#char-portrait").src = imgForCharacter(charName);
    $("#char-portrait").onerror = () => { $("#char-portrait").style.display = "none"; };
    $("#char-name").textContent = charName;
    $("#char-element").textContent = element || "—";
    const charLevelEl = $("#char-level");
    if (charLevelEl) charLevelEl.textContent = levelCur + "→" + levelTarget;
    $("#char-asc").textContent = ascCur + "→" + ascTarget;
    $("#char-na").textContent = naCur + "→" + naTarget;
    $("#char-skill").textContent = skCur + "→" + skTarget;
    $("#char-burst").textContent = brCur + "→" + brTarget;
    $("#char-notes").textContent = notes;
    const bookDaysLine = (CHARACTER_COSTS[charName]?.bookDays || []).join(", ");
    const tbd = $("#talent-bookdays"); if (tbd) tbd.textContent = bookDaysLine ? ("Book Farm Days: " + bookDaysLine) : "";

    /* --- ASCENSION --- */
    const ascNeed = sumAscNeeds(costs, ascCur, ascTarget);
    const ascWrap = $("#asc-cards"); ascWrap.innerHTML = "";
    const gemGroup = lc(element);

    for (const [tierKey, qty] of Object.entries(ascNeed.gems)) {
      if (qty > 0) {
        const gemDef = findGemByGroupTier(gemGroup, parseInt(tierKey.slice(1), 10));
        renderNeedCard(ascWrap, gemDef, qty);
      }
    }
    for (const [tierKey, qty] of Object.entries(ascNeed.enemy)) {
      if (qty > 0) {
        const enemyDef = findEnemyByGroupTier(costs?.picks?.enemiesAsc, parseInt(tierKey.slice(1), 10));
        renderNeedCard(ascWrap, enemyDef, qty);
      }
    }
    if (ascNeed.local > 0) {
      const localDef = findMaterial(costs?.picks?.local);
      renderNeedCard(ascWrap, localDef, ascNeed.local);
    }
    if (ascNeed.boss > 0) {
      const bossDef = findMaterial(costs?.picks?.bossNormal);
      renderNeedCard(ascWrap, bossDef, ascNeed.boss);
    }

    // Mora (ASC)
    if (ascNeed.mora > 0) {
      const moraDef = findMaterial('Mora') || { key: 'Mora', name: 'Mora', icon: 'images/materials/misc/Mora.png' };
      renderNeedCard(ascWrap, moraDef, ascNeed.mora);
    }

    /* --- LEVELING --- */
    const levelNeed = sumLevelNeeds(levelCur, levelTarget);
    const levelWrap = $("#level-cards");
    if (levelWrap) {
      levelWrap.innerHTML = "";

      if (levelNeed.hero > 0) {
        renderNeedCard(levelWrap, findMaterial("levelup_hero_wit"), levelNeed.hero);
      }
      if (levelNeed.adventurer > 0) {
        renderNeedCard(levelWrap, findMaterial("levelup_adventurer_experience"), levelNeed.adventurer);
      }
      if (levelNeed.wanderer > 0) {
        renderNeedCard(levelWrap, findMaterial("levelup_wanderers_advice"), levelNeed.wanderer);
      }
      if (levelNeed.mora > 0) {
        const moraDef = findMaterial('Mora') || { key: 'Mora', name: 'Mora', icon: 'images/materials/misc/Mora.png' };
        renderNeedCard(levelWrap, moraDef, levelNeed.mora);
      }
    }

    /* --- TALENTS: trzy oddzielne grupy --- */
    const talWrap = $("#talent-cards"); talWrap.innerHTML = "";

    function group(cssClass, title, cur, tgt){
      const group = document.createElement("div");
      group.className = `talent-group ${cssClass}`;

      const head = document.createElement("div");
      head.className = "talent-title";
      head.innerHTML = `<span>${title}</span><span class="range">${cur}→${tgt}</span>`;

      const body = document.createElement("div");
      body.className = "talent-body";
      const grid = document.createElement("div");
      grid.className = "card-grid";

      body.appendChild(grid);
      group.append(head, body);
      talWrap.appendChild(group);

      const need = sumTalNeeds(costs, cur, tgt);

      for (const [tierKey, qty] of Object.entries(need.books)) {
        if (qty > 0) {
          const bookDef = findBookByGroupTier(costs?.picks?.books, parseInt(tierKey.slice(1), 10));
          renderNeedCard(grid, bookDef, qty);
        }
      }
      for (const [tierKey, qty] of Object.entries(need.enemy)) {
        if (qty > 0) {
          const enemyDef = findEnemyByGroupTier(costs?.picks?.enemiesTal, parseInt(tierKey.slice(1), 10));
          renderNeedCard(grid, enemyDef, qty);
        }
      }
      if (need.weekly > 0) {
        const wkDef = findMaterial(costs?.picks?.bossWeekly);
        renderNeedCard(grid, wkDef, need.weekly);
      }
      if (need.crown > 0) {
        const crownDef = findMaterial("misc_Crown of Insight") || {
          key: "misc_Crown of Insight",
          name: "Crown of Insight",
          icon: "images/materials/misc/Crown of Insight.png",
        };
        renderNeedCard(grid, crownDef, need.crown);
      }

      // Mora (TALENTS)
      if (need.mora > 0) {
        const moraDef = findMaterial('Mora') || { key: 'Mora', name: 'Mora', icon: 'images/materials/misc/Mora.png' };
        renderNeedCard(grid, moraDef, need.mora);
      }
    }

    group("na",    "Normal Attack",   naCur, naTarget);
    group("skill", "Elemental Skill", skCur, skTarget);
    group("burst", "Elemental Burst", brCur, brTarget);
  }

  /* ---------- PAGER ---------- */
  function renderPager(){
    const wrap = $("#char-pager");
    wrap.innerHTML = "";
    if (!progressRows.length) return;

    const prev = document.createElement("button");
    prev.className = "page-btn" + (currentIndex<=0 ? " disabled" : "");
    prev.textContent = "‹";
    prev.title = "Poprzednia postać";
    if (currentIndex>0) prev.onclick = ()=> goToIndex(currentIndex-1);
    wrap.appendChild(prev);

    // zakres okna: [current-2 .. current+2], obcięty do [0..n-1]
    const n = progressRows.length;
    const start = Math.max(0, currentIndex - 2);
    const end   = Math.min(n - 1, currentIndex + 2);

    for (let i = start; i <= end; i++){
      const row = progressRows[i];
      const btn = document.createElement("button");
      btn.className = "page-btn" + (i===currentIndex ? " active" : "");
      btn.title = row.character;

      const img = document.createElement("img");
      img.className = "ppic";
      img.src = imgForCharacter(row.character);
      img.alt = row.character;
      img.onerror = ()=>{ img.style.display='none'; };

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = row.character;

      btn.append(img, name);
      if (i!==currentIndex) btn.onclick = ()=> goToIndex(i);
      wrap.appendChild(btn);
    }

    const next = document.createElement("button");
    next.className = "page-btn" + (currentIndex>=n-1 ? " disabled" : "");
    next.textContent = "›";
    next.title = "Następna postać";
    if (currentIndex<n-1) next.onclick = ()=> goToIndex(currentIndex+1);
    wrap.appendChild(next);
  }

  async function goToIndex(idx, push=true){
    currentIndex = Math.max(0, Math.min(idx, progressRows.length-1));
    const row = progressRows[currentIndex];
    applyFromRow(row);
    renderPager();
    // aktualizuj URL + historia
    if (push && row?.id) {
      history.pushState({rowId: row.id}, "", `?row=${row.id}`);
    }
  }

  /* ---------- Inicjalizacja ---------- */
  async function main(){
    // 1) Załaduj wszystkie wiersze z progress i posortuj po nazwie (tak jak w Materials)
    progressRows = (await IDB.all("progress")) || [];   // store 'progress' – patrz idb.js
    progressRows.sort(byName);

    // 2) Ustal indeks startowy: po ?row=..., ewentualnie po ?character=...
    const startIdx = (() => {
      if (rowIdParam){
        const i = progressRows.findIndex(r=>r.id===rowIdParam);
        if (i>=0) return i;
      }
      if (nameParam){
        const i = progressRows.findIndex(r=>(r.character||"").toLowerCase()===(nameParam||"").toLowerCase());
        if (i>=0) return i;
      }
      return 0;
    })();

    // 3) Pierwsze renderowanie + pager
    await goToIndex(startIdx, /*push=*/false);

    // 4) Skróty klawiaturowe
    window.addEventListener("keydown", (e)=>{
      if (e.target && (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA')) return; // nie blokuj edycji
      if (e.key === "ArrowLeft")  { if (currentIndex>0) goToIndex(currentIndex-1); }
      if (e.key === "ArrowRight") { if (currentIndex<progressRows.length-1) goToIndex(currentIndex+1); }
      if (e.key === "Home") { goToIndex(0); }
      if (e.key === "End")  { goToIndex(progressRows.length-1); }
    });

    // 5) Back/Forward
    window.addEventListener("popstate", ()=>{
      const purl = new URL(location.href);
      const rid  = purl.searchParams.get("row");
      const i = progressRows.findIndex(r=>r.id===rid);
      if (i>=0) goToIndex(i, /*push=*/false);
    });

    // Linki
    $("#goto-materials").href = "materials.html";
    $("#goto-bosses").href = "bosses.html";
  }

  main();
})();
