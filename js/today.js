(function () {
  "use strict";

  const PROGRESS_STORE = "progress";
  const TODAY_STORE = "todayTasks";
  const INVENTORY_STORE = "inventory";

  const DAY_NAMES_EN = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  function todayInfo() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    const weekdayEn = DAY_NAMES_EN[now.getDay()];
    return { now, dateStr, weekdayEn };
  }

  function getDom(id) {
    return document.getElementById(id);
  }

  function safeArray(x) {
    return Array.isArray(x) ? x : [];
  }

  function getCharacterMeta(name, progressRow) {
    const charData = (window.characterData && window.characterData[name]) || {};
    const costs = (typeof CHARACTER_COSTS !== "undefined" && CHARACTER_COSTS[name]) || {};
    const element = charData.element || costs.element || "";
    const rating = charData.rating || "";
    const teamsArr = safeArray(charData.teams);
    const teamCount = teamsArr.length || 0;

    const picks = costs.picks || {};
    const bookGroup = (picks.books || "").toLowerCase() || null;
    const bookDays = safeArray(costs.bookDays || []);

    // brakujące poziomy (asc + talenty)
    let missingLevels = 0;
    if (progressRow) {
      const pairs = [
        ["ascCur","ascTarget"],
        ["naCur","naTarget"],
        ["skillCur","skillTarget"],
        ["burstCur","burstTarget"]
      ];
      for (const [curKey, tgtKey] of pairs) {
        const cur = Number(progressRow[curKey] || 0);
        const tgt = Number(progressRow[tgtKey] || 0);
        if (tgt > cur) missingLevels += (tgt - cur);
      }
    }

    return {
      element,
      rating,
      teamCount,
      missingLevels,
      bookGroup,
      bookDays,
      bossNormalKey: picks.bossNormal || null,
      bossWeeklyKey: picks.bossWeekly || null
    };
  }

  function ratingScore(rating) {
    switch (String(rating).toUpperCase()) {
      case "SS": return 5;
      case "S":  return 4;
      case "A":  return 3;
      case "B":  return 2;
      case "C":  return 1;
      case "D":  return 0;
      default:   return 0;
    }
  }

  function characterPriorityScore(name, progressRow) {
    const charData = (window.characterData && window.characterData[name]) || {};
    const meta = getCharacterMeta(name, progressRow);
    const rScore = ratingScore(meta.rating);
    const teamCount = meta.teamCount;
    const missing = meta.missingLevels;

    // prosty model: rating*100 + teams*5 + missingLevels
    return rScore * 100 + teamCount * 5 + missing;
  }

  function hasAnyGoal(row) {
    if (!row) return false;
    const pairs = [
      ["ascCur","ascTarget"],
      ["naCur","naTarget"],
      ["skillCur","skillTarget"],
      ["burstCur","burstTarget"]
    ];
    return pairs.some(([curKey, tgtKey]) => {
      const cur = Number(row[curKey] || 0);
      const tgt = Number(row[tgtKey] || 0);
      return tgt > cur;
    });
  }

  function hasTalentGoal(row) {
    if (!row) return false;
    const pairs = [
      ["naCur","naTarget"],
      ["skillCur","skillTarget"],
      ["burstCur","burstTarget"]
    ];
    return pairs.some(([curKey, tgtKey]) => {
      const cur = Number(row[curKey] || 0);
      const tgt = Number(row[tgtKey] || 0);
      return tgt > cur;
    });
  }

  function hasAscGoal(row) {
    if (!row) return false;
    const cur = Number(row.ascCur || 0);
    const tgt = Number(row.ascTarget || 0);
    return tgt > cur;
  }

  function findBossesByDropKey(dropKey) {
    const result = [];
    if (!dropKey) return result;
    const list = Array.isArray(window.BOSSES) ? window.BOSSES : [];
    for (const b of list) {
      const drops = safeArray(b.drops);
      if (drops.includes(dropKey)) {
        result.push(b);
      }
    }
    return result;
  }

  function parseVersion(v) {
    const parts = String(v || "").split(".").map(n => parseInt(n, 10));
    return parts.map(n => (Number.isFinite(n) ? n : 0));
  }

  function compareVersions(a, b) {
    const pa = parseVersion(a);
    const pb = parseVersion(b);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const da = pa[i] ?? 0;
      const db = pb[i] ?? 0;
      if (da !== db) return da - db;
    }
    return 0;
  }

  function getLatestTierVersion() {
    const th = window.tierHistory || {};
    const versions = new Set();
    for (const def of Object.values(th)) {
      const hist = def && def.history ? def.history : {};
      for (const v of Object.keys(hist)) versions.add(v);
    }
    const arr = Array.from(versions);
    arr.sort(compareVersions);
    return arr.length ? arr[arr.length - 1] : null;
  }

  function getTierForLatestVersion(charName, latestVersion) {
    if (!latestVersion) return "";
    const th = window.tierHistory || {};
    const def = th[charName];
    const hist = def && def.history ? def.history : null;
    const rec = hist && hist[latestVersion] ? hist[latestVersion] : null;
    return rec && rec.rating ? String(rec.rating) : "";
  }

  function buildTeamAppearanceIndex() {
    const data = window.characterData || {};
    const out = new Map(); // charName -> Set(signature)
    const add = (name, sig) => {
      if (!name) return;
      if (!out.has(name)) out.set(name, new Set());
      out.get(name).add(sig);
    };

    for (const owner of Object.keys(data)) {
      const teams = safeArray(data[owner] && data[owner].teams);
      for (const t of teams) {
        const members = safeArray(t && t.members)
          .map(m => (m && m.name) ? String(m.name) : "")
          .filter(Boolean);

        const uniqMembers = Array.from(new Set(members))
          .sort((a,b)=>a.localeCompare(b,"pl",{sensitivity:"base"}));

        const sig = `${String(t && t.name || "").trim()}||${uniqMembers.join("|")}`;

        for (const m of uniqMembers) add(m, sig);
      }
    }

    const counts = new Map();
    for (const [k, set] of out.entries()) counts.set(k, set.size);
    return counts;
  }

  async function getInventoryCount(key) {
    try {
      if (!window.IDB) return 0;
      return (await window.IDB.get(INVENTORY_STORE, key)) ?? 0;
    } catch (e) {
      console.warn("[today] cannot read inventory:", e);
      return 0;
    }
  }

  function flatMaterials(filterType = "all") {
    const out = [];
    const groups = (typeof MATERIALS !== "undefined" && MATERIALS) ? MATERIALS : {};
    Object.entries(groups).forEach(([groupKey, def]) => {
      if (filterType !== "all" && filterType !== groupKey) return;
      (def.items || []).forEach(it => out.push({ ...it, _type: groupKey, _groupLabel: def.groupLabel }));
    });
    return out;
  }

  function keyExists(k) {
    if (!k) return false;
    return flatMaterials("all").some(i => i.key === k);
  }

  function firstExistingGemKey(tier) {
    const it = (MATERIALS.gems?.items || []).find(x => x.tier === tier);
    return it?.key || null;
  }

  function gemKey(element, tier) {
    const map = {
      Pyro: ["gem_pyro_t1","gem_pyro_t2","gem_pyro_t3","gem_pyro_t4"],
      Hydro:["gem_hydro_t1","gem_hydro_t2","gem_hydro_t3","gem_hydro_t4"],
      Cryo: ["gem_cryo_t1","gem_cryo_t2","gem_cryo_t3","gem_cryo_t4"],
      Electro:["gem_electro_t1","gem_electro_t2","gem_electro_t3","gem_electro_t4"],
      Anemo:["gem_anemo_t1","gem_anemo_t2","gem_anemo_t3","gem_anemo_t4"],
      Geo:  ["gem_geo_t1","gem_geo_t2","gem_geo_t3","gem_geo_t4"],
      Dendro:["gem_dendro_t1","gem_dendro_t2","gem_dendro_t3","gem_dendro_t4"],
    };
    const arr = map[element] || [];
    const k = arr[tier - 1];
    if (keyExists(k)) return k;
    return firstExistingGemKey(tier);
  }

  function enemyKey(group, tier) {
    const k = `enemy_${group}_t${tier}`;
    return keyExists(k) ? k : null;
  }

  function bookKey(family, tier) {
    const k = `book_${family}_t${tier}`;
    if (keyExists(k)) return k;
    const it = (MATERIALS.books?.items || []).find(x => x.tier === tier);
    return it?.key || null;
  }

  function findLocalKey(nameKey) {
    const it = (MATERIALS.local?.items || []).find(i => i.key === nameKey);
    return it?.key || null;
  }

  function ensureExistsKey(key) {
    if (keyExists(key)) return key;
    return null;
  }

  function computeDemand(rows) {
    const out = {};
    function add(key, n) { if (!key || !n) return; out[key] = (out[key] || 0) + n; }

    rows.forEach(r => {
      const c = (typeof CHARACTER_COSTS !== "undefined" && CHARACTER_COSTS[r.character]) ? CHARACTER_COSTS[r.character] : null;
      if (!c) return;

      // ASC
      const ascStart = Math.max(0, Math.min(6, r.ascCur | 0));
      const ascEnd = Math.max(0, Math.min(6, r.ascTarget | 0));
      for (let i = ascStart; i < ascEnd; i++) {
        const step = c.asc?.[i]; if (!step) continue;

        for (let t = 1; t <= 4; t++) {
          const n = step.gems?.["t" + t] || 0;
          const k = gemKey(c.element, t);
          if (k) add(k, n);
        }
        for (let t = 1; t <= 3; t++) {
          const n = step.enemy?.["t" + t] || 0;
          const k = enemyKey(c.picks?.enemiesAsc, t);
          if (k) add(k, n);
        }
        { const k = findLocalKey(c.picks?.local); if (k) add(k, step.local || 0); }
        { const k = ensureExistsKey(c.picks?.bossNormal); if (k) add(k, step.boss || 0); }
        add("Mora", step.mora || 0);
      }

      // TALENTS
      function talentRange(cur, tar) { return [Math.max(1, cur | 0), Math.max(1, tar | 0)]; }
      const parts = [
        talentRange(r.naCur, r.naTarget),
        talentRange(r.skillCur, r.skillTarget),
        talentRange(r.burstCur, r.burstTarget),
      ];

      parts.forEach(([cur, tar]) => {
        for (let lvl = cur; lvl < tar; lvl++) {
          const idx = Math.max(1, Math.min(9, lvl)) - 1;
          const step = c.tal?.[idx]; if (!step) continue;

          for (let t = 1; t <= 3; t++) {
            const nb = step.books?.["t" + t] || 0;
            const kb = bookKey(c.picks?.books, t);
            if (kb) add(kb, nb);

            const ne = step.enemy?.["t" + t] || 0;
            const ke = enemyKey(c.picks?.enemiesTal, t);
            if (ke) add(ke, ne);
          }

          { const k = ensureExistsKey(c.picks?.bossWeekly); if (k) add(k, step.weekly || 0); }
          add("Mora", step.mora || 0);
        }
      });
    });

    return out;
  }

  // --- RUNS (Talent Books) ---
  // Założenia użytkownika:
  // 1 run ≈ 3x tier 3 + 3x tier 2
  // 3x tier 3 = 1x tier 2
  // 3x tier 2 = 1x tier 1
  function runsNeededForBooks(missT1, missT2, missT3) {
    const m1 = Math.max(0, Number(missT1 || 0));
    const m2 = Math.max(0, Number(missT2 || 0));
    const m3 = Math.max(0, Number(missT3 || 0));

    // prosta pętla: szukamy minimalnej liczby runów spełniającej braki
    for (let r = 0; r <= 5000; r++) {
      const t2 = 3 * r;
      const t3 = 3 * r;

      // najpierw musimy pokryć T3 bez możliwości craftu w dół
      if (t3 < m3) continue;

      // ile maksymalnie T3 możemy przerobić na T2 po zostawieniu braków T3
      const xMax = Math.floor((t3 - m3) / 3); // 3x T3 -> +1x T2
      const t2Total = t2 + xMax;

      if (t2Total < m2) continue;

      const t2Left = t2Total - m2;

      // 3x T2 -> +1x T1
      const t1 = Math.floor(t2Left / 3);
      if (t1 < m1) continue;

      return r;
    }

    return 0;
  }

  function getBookMissingByGroup(groupKey, demand, inv) {
    const k1 = bookKey(groupKey, 1);
    const k2 = bookKey(groupKey, 2);
    const k3 = bookKey(groupKey, 3);

    const need1 = k1 ? Number(demand[k1] || 0) : 0;
    const need2 = k2 ? Number(demand[k2] || 0) : 0;
    const need3 = k3 ? Number(demand[k3] || 0) : 0;

    const have1 = k1 ? Number(inv.get(k1) || 0) : 0;
    const have2 = k2 ? Number(inv.get(k2) || 0) : 0;
    const have3 = k3 ? Number(inv.get(k3) || 0) : 0;

    const miss1 = Math.max(need1 - have1, 0);
    const miss2 = Math.max(need2 - have2, 0);
    const miss3 = Math.max(need3 - have3, 0);

    const runs = runsNeededForBooks(miss1, miss2, miss3);

    return { miss1, miss2, miss3, runs };
  }

  async function loadInventoryMap(keys) {
    const map = new Map();
    const arr = Array.from(keys);
    const values = await Promise.all(arr.map(k => getInventoryCount(k)));
    arr.forEach((k, i) => map.set(k, values[i] ?? 0));
    return map;
  }

  function buildWeeklyBossTasks(progressRows, weekdayEn) {
    const byBossId = new Map();

    for (const row of progressRows) {
      const name = row.character || "";
      if (!name) continue;
      if (!hasTalentGoal(row)) continue;

      const meta = getCharacterMeta(name, row);
      if (!meta.bossWeeklyKey) continue;

      const bosses = findBossesByDropKey(meta.bossWeeklyKey);
      for (const b of bosses) {
        if (String(b.type) !== "weekly") continue;
        const key = b.id;
        if (!byBossId.has(key)) {
          byBossId.set(key, {
            id: `weekly:${key}`,
            category: "must",
            type: "weeklyBoss",
            bossId: key,
            bossName: b.name,
            materialKey: meta.bossWeeklyKey,
            elementTags: safeArray(b.elements || []),
            characters: [],
            label: "",
            description: "",
            score: 0
          });
        }
        const task = byBossId.get(key);
        if (!task.characters.includes(name)) {
          task.characters.push(name);
        }
      }
    }

    // Uzupełniamy label/score
    for (const task of byBossId.values()) {
      const chars = task.characters.slice().sort((a,b)=>a.localeCompare(b,"pl",{sensitivity:"base"}));
      task.label = `Weekly boss: ${task.bossName}`;
      task.description = chars.length ? `For: ${chars.join(", ")}` : "";
      let maxScore = 0;
      for (const ch of chars) {
        const row = progressRows.find(r => r.character === ch);
        const s = characterPriorityScore(ch, row);
        if (s > maxScore) maxScore = s;
      }
      task.score = maxScore;
    }

    return Array.from(byBossId.values());
  }

  function buildTalentBookTasks(progressRows, weekdayEn) {
    const byGroup = new Map();

    for (const row of progressRows) {
      const name = row.character || "";
      if (!name) continue;
      if (!hasTalentGoal(row)) continue;

      const meta = getCharacterMeta(name, row);
      if (!meta.bookGroup) continue;

      const gKey = meta.bookGroup;
      if (!byGroup.has(gKey)) {
        const pretty = gKey.charAt(0).toUpperCase() + gKey.slice(1);
        byGroup.set(gKey, {
          id: `books:${gKey}`,
          category: "high",
          type: "talentBooks",
          group: gKey,
          groupName: pretty,
          days: meta.bookDays.slice(),
          availableToday: meta.bookDays.includes(weekdayEn),
          characters: [],
          label: "",
          description: "",
          score: 0
        });
      }
      const task = byGroup.get(gKey);
      task.availableToday = !!task.availableToday || meta.bookDays.includes(weekdayEn);
      if (!task.characters.includes(name)) {
        task.characters.push(name);
      }
    }

    for (const task of byGroup.values()) {
      const chars = task.characters.slice().sort((a,b)=>a.localeCompare(b,"pl",{sensitivity:"base"}));
      task.label = `Farm talent books: ${task.groupName}`;
      task.description = chars.length ? `For: ${chars.join(", ")}` : "";
      let maxScore = 0;
      for (const ch of chars) {
        const row = progressRows.find(r => r.character === ch);
        const s = characterPriorityScore(ch, row);
        if (s > maxScore) maxScore = s;
      }
      task.score = maxScore;
    }

    return Array.from(byGroup.values());
  }

  function buildNormalBossTasks(progressRows) {
    const byBossId = new Map();

    for (const row of progressRows) {
      const name = row.character || "";
      if (!name) continue;
      if (!hasAscGoal(row)) continue;

      const meta = getCharacterMeta(name, row);
      if (!meta.bossNormalKey) continue;

      const bosses = findBossesByDropKey(meta.bossNormalKey);
      for (const b of bosses) {
        if (String(b.type) !== "normal") continue;
        const key = b.id;
        if (!byBossId.has(key)) {
          byBossId.set(key, {
            id: `normal:${key}`,
            category: "high",
            type: "normalBoss",
            bossId: key,
            bossName: b.name,
            materialKey: meta.bossNormalKey,
            elementTags: safeArray(b.elements || []),
            characters: [],
            label: "",
            description: "",
            score: 0
          });
        }
        const task = byBossId.get(key);
        if (!task.characters.includes(name)) {
          task.characters.push(name);
        }
      }
    }

    for (const task of byBossId.values()) {
      const chars = task.characters.slice().sort((a,b)=>a.localeCompare(b,"pl",{sensitivity:"base"}));
      task.label = `Normal boss: ${task.bossName}`;
      task.description = chars.length ? `For: ${chars.join(", ")}` : "";
      let maxScore = 0;
      for (const ch of chars) {
        const row = progressRows.find(r => r.character === ch);
        const s = characterPriorityScore(ch, row);
        if (s > maxScore) maxScore = s;
      }
      task.score = maxScore;
    }

    return Array.from(byBossId.values());
  }

  function buildArtifactTasks(progressRows) {
    const data = window.characterData || {};
    const bySet = new Map();

    for (const row of progressRows) {
      const name = row.character || "";
      if (!name) continue;
      const charObj = data[name];
      if (!charObj) continue;

      const roles = safeArray(charObj.roles);
      for (const role of roles) {
        const artifacts = role.artifacts || {};
        const best = artifacts.best || null;
        if (!best || !best.name) continue;
        const setName = String(best.name);
        const key = setName;

        if (!bySet.has(key)) {
          bySet.set(key, {
            id: `artifact:${key}`,
            category: "optional",
            type: "artifacts",
            setName,
            characters: [],
            label: "",
            description: "",
            score: 0
          });
        }
        const task = bySet.get(key);
        if (!task.characters.includes(name)) {
          task.characters.push(name);
        }
      }
    }

    for (const task of bySet.values()) {
      const chars = task.characters.slice().sort((a,b)=>a.localeCompare(b,"pl",{sensitivity:"base"}));
      task.label = `Artifacts: ${task.setName}`;
      task.description = chars.length ? `For: ${chars.join(", ")}` : "";
      let maxScore = 0;
      for (const ch of chars) {
        const row = progressRows.find(r => r.character === ch);
        const s = characterPriorityScore(ch, row);
        if (s > maxScore) maxScore = s;
      }
      task.score = maxScore;
    }

    return Array.from(bySet.values());
  }

  async function loadProgressRows() {
    try {
      if (!window.IDB) return [];
      const rows = await window.IDB.all(PROGRESS_STORE) || [];
      return rows.filter(hasAnyGoal);
    } catch (e) {
      console.warn("[today] cannot load progress from IDB:", e);
      return [];
    }
  }

  async function loadTodayStatusMap(dateStr) {
    const map = new Map();
    try {
      if (!window.IDB) return map;
      const all = await window.IDB.all(TODAY_STORE) || [];
      for (const rec of all) {
        if (!rec || !rec.id) continue;
        if (rec.date !== dateStr) continue;
        map.set(rec.id, !!rec.done);
      }
    } catch (e) {
      console.warn("[today] cannot load todayTasks:", e);
    }
    return map;
  }

  async function saveTaskState(rec) {
    try {
      if (!window.IDB) return;
      await window.IDB.put(TODAY_STORE, rec);
    } catch (e) {
      console.warn("[today] cannot save todayTasks:", e);
    }
  }

  async function renderTasksSection(listEl, tasks, statusMap, dateStr, counter, ctx) {
  listEl.innerHTML = "";

  const latestTierVersion = ctx.latestTierVersion;
  const teamAppearances = ctx.teamAppearances;
  const demand = ctx.demand;
  const inv = ctx.inventoryMap;

  tasks.sort((a, b) => {
    const aBook = a && a.type === "talentBooks";
    const bBook = b && b.type === "talentBooks";

    // Najpierw zawsze talent books
    if (aBook !== bBook) return aBook ? -1 : 1;

    // W obrębie talent books: najpierw dostępne dziś, potem reszta
    if (aBook && bBook) {
      const ad = a.availableToday ? 1 : 0;
      const bd = b.availableToday ? 1 : 0;
      if (ad !== bd) return bd - ad;

      const sc = (b.score || 0) - (a.score || 0);
      if (sc) return sc;

      return String(a.groupName || "").localeCompare(String(b.groupName || ""), "pl", { sensitivity: "base" });
    }

    // Reszta zadań jak wcześniej
    return (b.score || 0) - (a.score || 0);
  });

  for (const task of tasks) {
    const fullId = `${dateStr}|${task.id}`;
    const done = !!statusMap.get(fullId);

    const root = document.createElement("div");
    root.className = "today-task";

    if (task && task.type === "talentBooks" && !task.availableToday) {
      root.classList.add("today-task--unavailable");
    }

    if (done) root.classList.add("today-task--done");

    const label = document.createElement("label");
    label.className = "today-task-main";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "today-task-checkbox";
    cb.checked = done;

    const body = document.createElement("div");
    body.className = "today-task-body";

    const title = document.createElement("div");
    title.className = "today-task-title";
    
    title.textContent = task.label || "Task";

    if (task && task.type === "talentBooks") {
      const info = getBookMissingByGroup(task.group, demand, inv);

      // Czyścimy tytuł i budujemy: "Farm talent books: X" + badge "NN runs"
      title.textContent = "";
      title.appendChild(document.createTextNode(task.label || "Talent books"));

      const badge = document.createElement("span");
      badge.className = "today-runs-badge";
      badge.textContent = `${info.runs} runs`;
      title.appendChild(badge);
    }

    const meta = document.createElement("div");
    meta.className = "today-task-meta";

    // (1) Opis (jeśli jest) – zostawiamy jako zwykły tekst
    if (task.description) {
      const span = document.createElement("span");
      span.textContent = task.description;
      meta.appendChild(span);
    }

    // (2) Lista postaci z tierem (najnowsza wersja) + liczbą unikalnych teamów
    if (task.characters && task.characters.length) {
      const wrap = document.createElement("div");
      wrap.className = "today-charlist";

      const chars = task.characters
        .slice()
        .sort((a, b) => a.localeCompare(b, "pl", { sensitivity: "base" }));

      for (const name of chars) {
        const tier = getTierForLatestVersion(name, latestTierVersion);
        const teams = teamAppearances.get(name) || 0;

        const card = document.createElement("div");
        card.className = "today-charcard";
        card.title = `Tier ${latestTierVersion || "?"}: ${tier || "—"} | Unique teams: ${teams}`;

        // Avatar
        const avatar = document.createElement("img");
        avatar.className = "today-char-avatar";
        avatar.alt = name;
        avatar.src = `images/characters/${encodeURIComponent(name)}.png`;

        const fallback = document.createElement("span");
        fallback.className = "today-char-fallback";
        fallback.textContent = (name || "?").trim().slice(0, 1).toUpperCase();

        avatar.addEventListener("error", () => {
          avatar.style.display = "none";
          fallback.style.display = "inline-flex";
        });

        // Name
        const nm = document.createElement("span");
        nm.className = "today-char-name";
        nm.textContent = name;

        // Tier icon (Rating Icons/<tier>.png)
        let tierIcon = null;
        let tierFallback = null;

        if (tier) {
          tierIcon = document.createElement("img");
          tierIcon.className = "today-tier-icon";
          tierIcon.alt = tier;
          tierIcon.src = `Rating%20Icons/${encodeURIComponent(tier)}.png`;

          tierFallback = document.createElement("span");
          tierFallback.className = "today-tier-fallback";
          tierFallback.textContent = tier;

          tierIcon.addEventListener("error", () => {
            tierIcon.style.display = "none";
            tierFallback.style.display = "inline-flex";
          });
        }

        // Teams badge
        const badge = document.createElement("span");
        badge.className = "today-team-badge";
        badge.innerHTML = `Teams <strong>${teams}</strong>`;

        card.appendChild(avatar);
        card.appendChild(fallback);
        card.appendChild(nm);
        if (tierIcon) card.appendChild(tierIcon);
        if (tierFallback) card.appendChild(tierFallback);
        card.appendChild(badge);

        wrap.appendChild(card);
      }

      meta.appendChild(wrap);
    }

    // (3) Liczniki Have/Need/Missing (jak Global Materials Demand)
    const metrics = document.createElement("div");
    metrics.className = "today-metrics";

    function addMetric(labelText, key) {
      if (!key) return;
      const need = Number(demand[key] || 0);
      const have = Number(inv.get(key) || 0);
      const missing = Math.max(need - have, 0);

      if (need <= 0) return;

      const item = document.createElement("div");
      item.className = "today-metric";
      item.classList.add(missing === 0 ? "today-metric--ok" : "today-metric--partial");

      const title = document.createElement("div");
      title.className = "today-metric-title";
      title.textContent = labelText;

      const pills = document.createElement("div");
      pills.className = "today-metric-pills";

      const pHave = document.createElement("span");
      pHave.className = "today-metric-pill today-metric-pill--have";
      pHave.innerHTML = `Have <strong>${have}</strong>`;

      const pNeed = document.createElement("span");
      pNeed.className = "today-metric-pill today-metric-pill--need";
      pNeed.innerHTML = `Need <strong>${need}</strong>`;

      const pMissing = document.createElement("span");
      pMissing.className = "today-metric-pill today-metric-pill--missing";
      pMissing.innerHTML = `Missing <strong>${missing}</strong>`;

      pills.appendChild(pHave);
      pills.appendChild(pNeed);
      pills.appendChild(pMissing);

      item.appendChild(title);
      item.appendChild(pills);

      item.title = `${labelText}\nHave: ${have}\nNeed: ${need}\nMissing: ${missing}`;
      metrics.appendChild(item);
    }

    if (task.type === "weeklyBoss" || task.type === "normalBoss") {
      addMetric("Material", task.materialKey || null);
    } else if (task.type === "talentBooks") {
      addMetric("Books T1", bookKey(task.group, 1));
      addMetric("Books T2", bookKey(task.group, 2));
      addMetric("Books T3", bookKey(task.group, 3));
    }

    if (metrics.childNodes.length) {
      meta.appendChild(metrics);
    }

    const tagsBox = document.createElement("div");
    tagsBox.className = "today-task-tags";

    const typePill = document.createElement("span");
    typePill.className = "today-pill";
    if (task.type === "weeklyBoss") typePill.textContent = "Weekly boss";
    else if (task.type === "normalBoss") typePill.textContent = "Normal boss";
    else if (task.type === "talentBooks") typePill.textContent = "Talent books";
    else if (task.type === "artifacts") typePill.textContent = "Artifacts";
    else typePill.textContent = "Task";
    tagsBox.appendChild(typePill);

    if (task && task.type === "talentBooks" && !task.availableToday) {
      const pill = document.createElement("span");
      pill.className = "today-pill";
      pill.textContent = "Not today";
      tagsBox.appendChild(pill);
    }

    if (task.elementTags && task.elementTags.length) {
      for (const el of task.elementTags) {
        const pill = document.createElement("span");
        pill.className = "today-pill";
        pill.textContent = el;
        tagsBox.appendChild(pill);
      }
    }

    if (task.groupName) {
      const pill = document.createElement("span");
      pill.className = "today-pill";
      pill.textContent = task.groupName;
      tagsBox.appendChild(pill);
    }

    if (tagsBox.children.length) {
      meta.appendChild(tagsBox);
    }

    body.appendChild(title);
    if (meta.childNodes.length) body.appendChild(meta);

    label.appendChild(cb);
    label.appendChild(body);
    root.appendChild(label);
    listEl.appendChild(root);

    counter.total++;

    cb.addEventListener("change", async () => {
      const nowDone = !!cb.checked;
      if (nowDone) {
        root.classList.add("today-task--done");
        counter.done++;
      } else {
        root.classList.remove("today-task--done");
        counter.done--;
      }

      updateCounterText(counter);

      await saveTaskState({
        id: fullId,
        date: dateStr,
        key: task.id,
        done: nowDone
      });
    });

    if (done) {
      counter.done++;
    }
  }
}

  function updateCounterText(counter) {
    const el = getDom("today-counter");
    if (!el) return;
    if (!counter.total) {
      el.textContent = "No tasks for today.";
      return;
    }
    el.textContent = `${counter.done} / ${counter.total} tasks done today`;
  }

  async function initToday() {
  const { dateStr, weekdayEn } = todayInfo();

  const dateEl = getDom("today-date");
  if (dateEl) {
    dateEl.textContent = `Tasks for: ${dateStr} (${weekdayEn})`;
  }

  const progressRows = await loadProgressRows();
  const statusMap = await loadTodayStatusMap(dateStr);

  const mustList = getDom("today-must-list");
  const highList = getDom("today-high-list");
  const optList = getDom("today-optional-list");

  if (!mustList || !highList || !optList) {
    console.warn("[today] Missing container elements");
    return;
  }

  // --- module settings (Today) ---
  const appS = window.__APP_SETTINGS__ || {};
  const modS = (appS.modules && appS.modules.today) ? appS.modules.today : {};
  const showOptional = (modS.showOptional || "on") === "on";
  const highLimit = Number(modS.highLimit || 0);

  // hide/show Optional section (nie psuje danych — tylko UI)
  const optSection = optList.closest(".today-section");
  if (optSection) optSection.style.display = showOptional ? "" : "none";

  const weeklyTasks = buildWeeklyBossTasks(progressRows, weekdayEn);
  const bookTasks = buildTalentBookTasks(progressRows, weekdayEn);
  const normalBossTasks = buildNormalBossTasks(progressRows);
  const artifactTasks = buildArtifactTasks(progressRows);

  let highTasks = bookTasks.concat(normalBossTasks);

  if (Number.isFinite(highLimit) && highLimit > 0) {
    highTasks = highTasks.slice(0, highLimit);
  }

  // --- Kontekst: tier (najnowsza wersja), unikalne teamy, demand + inventory ---
  const latestTierVersion = getLatestTierVersion();
  const teamAppearances = buildTeamAppearanceIndex();

  const demand = computeDemand(progressRows);

  const keys = new Set();
  for (const t of weeklyTasks) if (t.materialKey) keys.add(t.materialKey);
  for (const t of normalBossTasks) if (t.materialKey) keys.add(t.materialKey);
  for (const t of bookTasks) {
    const k1 = bookKey(t.group, 1); if (k1) keys.add(k1);
    const k2 = bookKey(t.group, 2); if (k2) keys.add(k2);
    const k3 = bookKey(t.group, 3); if (k3) keys.add(k3);
  }

  const inventoryMap = await loadInventoryMap(keys);

  // --- Total runs summary (all talent book series) ---
  const runsEl = getDom("today-books-runs");
  if (runsEl) {
    let totalRuns = 0;

    for (const t of bookTasks) {
      const info = getBookMissingByGroup(t.group, demand, inventoryMap);
      totalRuns += Number(info.runs || 0);
    }

    runsEl.innerHTML = `Book runs left: <strong>${totalRuns}</strong>`;
  }

  const counter = { done: 0, total: 0 };

  const ctx = { latestTierVersion, teamAppearances, demand, inventoryMap };

  await renderTasksSection(mustList, weeklyTasks, statusMap, dateStr, counter, ctx);
  await renderTasksSection(highList, highTasks, statusMap, dateStr, counter, ctx);
  await renderTasksSection(optList, artifactTasks, statusMap, dateStr, counter, ctx);

  updateCounterText(counter);
}

  window.addEventListener("DOMContentLoaded", initToday);
})();
