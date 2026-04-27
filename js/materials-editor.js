// materials-editor.js
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  const logEl = $("#log");
  function log(msg) {
    const t = new Date().toLocaleTimeString();
    logEl.textContent = `[${t}] ${msg}\n` + logEl.textContent;
  }

  // ---- Load source data from already-loaded materials.js ----
  // UWAGA: materials.js jest ładowany jako zwykły <script>, więc stałe są dostępne w globalnym zakresie tej strony.
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  let state = {
    books: {},
    chars: {},
    mats: {},
  };

  // ---- Images / icons helpers ----
  let materialIndex = new Map();

  function rebuildMaterialIndex() {
    materialIndex = new Map();
    const mats = state.mats || {};
    Object.keys(mats).forEach((cat) => {
      (mats[cat]?.items || []).forEach((it) => {
        if (!it || !it.key) return;
        materialIndex.set(it.key, { icon: (it.icon || "").trim(), name: it.name || "", cat });
      });
    });
  }

  function getMaterialIcon(key) {
    if (!key) return "";
    return (materialIndex.get(key)?.icon || "").trim();
  }

  function createIcoBox(src, alt) {
    const box = document.createElement("div");
    box.className = "me-ico" + (src ? "" : " is-empty");

    const img = document.createElement("img");
    img.alt = alt || "";
    if (src) img.src = src;

    img.onerror = () => {
      box.classList.add("is-empty");
      img.removeAttribute("src");
    };

    box.appendChild(img);
    return box;
  }

  function setImgWithFallbacks(imgEl, candidates) {
    let i = 0;
    function tryNext() {
      const src = candidates[i++];
      if (!src) {
        imgEl.removeAttribute("src");
        imgEl.style.display = "none";
        return;
      }
      imgEl.style.display = "block";
      imgEl.src = src;
    }
    imgEl.onerror = tryNext;
    tryNext();
  }

  function updateCharacterPortrait(imgEl, name) {
    if (!imgEl) return;
    const safe = encodeURIComponent((name || "").trim());
    if (!safe) {
      imgEl.removeAttribute("src");
      imgEl.style.display = "none";
      return;
    }
    const base = `images/characters/${safe}`;
    setImgWithFallbacks(imgEl, [`${base}.png`, `${base}.webp`, `${base}.jpg`, `${base}.jpeg`]);
  }

  function createCharPortraitBox(name) {
    const box = document.createElement("div");
    box.className = "me-ico";
    const img = document.createElement("img");
    img.alt = name || "";
    box.appendChild(img);
    updateCharacterPortrait(img, name);
    return box;
  }

  function attachMaterialMiniIconToInput(inputEl) {
    if (!inputEl) return () => {};

    const host = inputEl.parentElement;
    if (!host) return () => {};

    // nie doklejaj drugi raz
    if (!host.classList.contains("me-field-ico")) {
      host.classList.add("me-field-ico");

      const wrap = document.createElement("div");
      wrap.className = "me-mini-ico";
      const img = document.createElement("img");
      img.alt = "";
      wrap.appendChild(img);
      host.appendChild(wrap);
    }

    const wrap = host.querySelector(".me-mini-ico");
    const img = wrap ? wrap.querySelector("img") : null;

    function update() {
      if (!wrap || !img) return;
      const key = (inputEl.value || "").trim();
      const icon = getMaterialIcon(key);

      if (!icon) {
        img.removeAttribute("src");
        wrap.style.display = "none";
        return;
      }
      wrap.style.display = "flex";
      img.src = icon;
    }

    // podpinamy listenery tylko raz na input
    if (inputEl.dataset.meMiniIcon !== "1") {
      inputEl.dataset.meMiniIcon = "1";
      inputEl.addEventListener("input", update);
      inputEl.addEventListener("change", update);
    }

    return update;
  }

  function loadFromGlobals() {
    // Jeśli coś nie istnieje, dajemy puste obiekty (żeby UI nie padło)
    state.books = deepClone(typeof BOOK_GROUP_DAYS !== "undefined" ? BOOK_GROUP_DAYS : {});
    state.chars = deepClone(typeof CHARACTER_COSTS !== "undefined" ? CHARACTER_COSTS : {});
    state.mats = deepClone(typeof MATERIALS !== "undefined" ? MATERIALS : {});
    rebuildMaterialIndex();
    log("Loaded data from js/materials.js");
  }

  // ---- Tabs ----
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".tabpanel").forEach((p) => p.classList.remove("active"));
      const id = btn.dataset.tab;
      $("#tab-" + id).classList.add("active");
    });
  });

  // ---- BOOKS UI ----
  const BOOK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const bookList = $("#book-list");
  const bookSearch = $("#book-search");
  const bookKey = $("#book-key");
  const bookDaysWrap = $("#book-days");
  const bookSave = $("#book-save");
  const bookDelete = $("#book-delete");
  const bookAdd = $("#book-add");

  let selectedBookKey = null;
  let selectedBookDays = new Set();

  function renderBookDaysChips() {
    bookDaysWrap.innerHTML = "";
    BOOK_DAYS.forEach((d) => {
      const chip = document.createElement("div");
      chip.className = "chip" + (selectedBookDays.has(d) ? " on" : "");
      chip.textContent = d;
      chip.addEventListener("click", () => {
        if (selectedBookDays.has(d)) selectedBookDays.delete(d);
        else selectedBookDays.add(d);
        renderBookDaysChips();
        bookSave.disabled = !bookKey.value.trim();
      });
      bookDaysWrap.appendChild(chip);
    });
  }

  function renderBookList() {
    const q = (bookSearch.value || "").trim().toLowerCase();
    const keys = Object.keys(state.books || {}).sort((a, b) => a.localeCompare(b));
    bookList.innerHTML = "";

    keys
      .filter((k) => !q || k.toLowerCase().includes(q))
      .forEach((k) => {
        const it = document.createElement("div");
        it.className = "item" + (k === selectedBookKey ? " active" : "");

        const meta = document.createElement("div");
        meta.className = "meta";
        const line1 = document.createElement("div");
        line1.className = "k";
        line1.textContent = k;
        const line2 = document.createElement("div");
        line2.className = "s";
        line2.textContent = (state.books[k] || []).join(", ");
        meta.appendChild(line1);
        meta.appendChild(line2);

        it.appendChild(meta);

        it.addEventListener("click", () => {
          selectedBookKey = k;
          bookKey.value = k;
          selectedBookDays = new Set(state.books[k] || []);
          renderBookDaysChips();
          renderBookList();

          bookSave.disabled = false;
          bookDelete.disabled = false;
        });

        bookList.appendChild(it);
      });
  }

  function clearBookEditor() {
    selectedBookKey = null;
    bookKey.value = "";
    selectedBookDays = new Set();
    renderBookDaysChips();
    bookSave.disabled = true;
    bookDelete.disabled = true;
    renderBookList();
  }

  bookSearch.addEventListener("input", renderBookList);

  bookAdd.addEventListener("click", () => {
    selectedBookKey = null;
    bookKey.value = "";
    selectedBookDays = new Set(["Sunday"]);
    renderBookDaysChips();
    bookSave.disabled = false;
    bookDelete.disabled = true;
    bookKey.focus();
  });

  bookKey.addEventListener("input", () => {
    bookSave.disabled = !bookKey.value.trim();
  });

  bookSave.addEventListener("click", () => {
    const kRaw = bookKey.value.trim();
    if (!kRaw) return;

    const k = kRaw.toLowerCase();
    const daysArr = Array.from(selectedBookDays);
    state.books[k] = daysArr.length ? daysArr : ["Sunday"];

    // jeśli zmieniasz nazwę istniejącej grupy
    if (selectedBookKey && selectedBookKey !== k) {
      delete state.books[selectedBookKey];
    }

    selectedBookKey = k;
    log(`Saved BOOK_GROUP_DAYS["${selectedBookKey}"] = [${state.books[selectedBookKey].join(", ")}]`);
    renderBookList();

    rebuildMaterialKeysDatalist();
  });

  bookDelete.addEventListener("click", () => {
    if (!selectedBookKey) return;
    if (!confirm(`Delete group "${selectedBookKey}"?`)) return;
    delete state.books[selectedBookKey];
    log(`Deleted BOOK_GROUP_DAYS["${selectedBookKey}"]`);
    clearBookEditor();

    rebuildMaterialKeysDatalist();
  });

  // ---------------------------------------------------------------------------
  // ---- CHARACTERS UI (FORM) ----
  // Wymaga elementów z HTML:
  // #char-element, #pick-..., #asc-body, #tal-body, #me-material-keys (datalist)
  // ---------------------------------------------------------------------------

  const charList = $("#char-list");
  const charSearch = $("#char-search");
  const charKey = $("#char-key");
  const charSave = $("#char-save");
  const charDelete = $("#char-delete");
  const charAdd = $("#char-add");

  const charElement = $("#char-element");

  const pickBossNormal = $("#pick-bossNormal");
  const pickLocal = $("#pick-local");
  const pickEnemiesAsc = $("#pick-enemiesAsc");
  const pickBooks = $("#pick-books");
  const pickEnemiesTal = $("#pick-enemiesTal");
  const pickBossWeekly = $("#pick-bossWeekly");

  // ---- Character portrait preview + mini-icons for pick inputs ----
  let charPreviewImg = null;

  function ensureCharPreviewUI() {
    if (charPreviewImg || !charKey) return;
    charKey.insertAdjacentHTML(
      "afterend",
      `
        <div class="preview">
          <div class="preview-box">
            <img id="char-preview" alt="" />
          </div>
          <div class="hint">
            Podgląd działa dla obrazów z <code>images/characters</code> (nazwa pliku = nazwa postaci).
          </div>
        </div>
      `
    );
    charPreviewImg = $("#char-preview");
  }

  ensureCharPreviewUI();

  const updatePickBossNormalIcon = attachMaterialMiniIconToInput(pickBossNormal);
  const updatePickLocalIcon = attachMaterialMiniIconToInput(pickLocal);
  const updatePickEnemiesAscIcon = attachMaterialMiniIconToInput(pickEnemiesAsc);
  const updatePickEnemiesTalIcon = attachMaterialMiniIconToInput(pickEnemiesTal);
  const updatePickBossWeeklyIcon = attachMaterialMiniIconToInput(pickBossWeekly);

  function updateAllPickIcons() {
    [updatePickBossNormalIcon, updatePickLocalIcon, updatePickEnemiesAscIcon, updatePickEnemiesTalIcon, updatePickBossWeeklyIcon]
      .filter(Boolean)
      .forEach((fn) => fn());
  }

  // ---- Rich dropdown (picks) z ikonami + nazwami ----
  // Datalist zostaje jako fallback, ale pokazujemy własny dropdown z grafikami.
  let activeDD = null;

  function closeActiveDD() {
    if (activeDD && activeDD.parentNode) activeDD.parentNode.removeChild(activeDD);
    activeDD = null;
  }

  function pickGetGroupIcon(catKey, groupKey) {
    if (!catKey || !groupKey) return "";
    const items = state.mats?.[catKey]?.items || [];
    // prefer tier 1 (albo bez tier) jako "miniaturę"
    const t1 = items.find((it) => it && it.group === groupKey && (Number(it.tier) === 1 || it.tier === undefined));
    const any = items.find((it) => it && it.group === groupKey);
    return ((t1?.icon || any?.icon || "")).trim();
  }

  function pickGetEnemyGroups() {
    const out = [];
    const enemyItems = state.mats?.enemies?.items || [];
    for (const it of enemyItems) {
      if (!it) continue;

      if (it.group) {
        out.push(String(it.group));
        continue;
      }

      if (it.key && String(it.key).startsWith("enemy_")) {
        let g = String(it.key).slice("enemy_".length);
        g = g.replace(/_t\d+$/i, "");
        out.push(g);
      }
    }
    return Array.from(new Set(out)).sort((a, b) => a.localeCompare(b));
  }

  function buildPickItems(kind) {
    // Zwraca: [{ value, label, icon }]
    if (kind === "bossNormal") {
      return (state.mats?.bossNormal?.items || [])
        .filter((it) => it && it.key)
        .map((it) => ({ value: String(it.key), label: (it.name || "").trim(), icon: (it.icon || "").trim() }))
        .sort((a, b) => a.value.localeCompare(b.value));
    }

    if (kind === "local") {
      return (state.mats?.local?.items || [])
        .filter((it) => it && it.key)
        .map((it) => ({ value: String(it.key), label: (it.name || "").trim(), icon: (it.icon || "").trim() }))
        .sort((a, b) => a.value.localeCompare(b.value));
    }

    if (kind === "bossWeekly") {
      return (state.mats?.bossWeekly?.items || [])
        .filter((it) => it && it.key)
        .map((it) => ({ value: String(it.key), label: (it.name || "").trim(), icon: (it.icon || "").trim() }))
        .sort((a, b) => a.value.localeCompare(b.value));
    }

    if (kind === "books") {
      const keys = Object.keys(state.books || {}).sort((a, b) => a.localeCompare(b));
      return keys.map((k) => ({
        value: k,
        label: "Book group",
        icon: pickGetGroupIcon("books", k),
      }));
    }

    if (kind === "enemyGroups") {
      const groups = pickGetEnemyGroups();
      return groups.map((g) => ({
        value: g,
        label: "Enemy group",
        icon: pickGetGroupIcon("enemies", g),
      }));
    }

    return [];
  }

  function openPickDropdown(inputEl, kind) {
    if (!inputEl) return;

    closeActiveDD();

    const dd = document.createElement("div");
    dd.className = "me-dd";

    function render() {
      const q = (inputEl.value || "").trim().toLowerCase();
      const all = buildPickItems(kind);

      const filtered = !q
        ? all
        : all.filter((it) => (it.value || "").toLowerCase().includes(q) || (it.label || "").toLowerCase().includes(q));

      dd.innerHTML = "";

      if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "me-dd-empty";
        empty.textContent = "Brak pasujących pozycji…";
        dd.appendChild(empty);
        return;
      }

      filtered.slice(0, 80).forEach((it) => {
        const row = document.createElement("div");
        row.className = "me-dd-item";

        const ico = document.createElement("div");
        ico.className = "me-dd-ico";
        const img = document.createElement("img");
        img.alt = it.value || "";
        if (it.icon) img.src = it.icon;
        img.onerror = () => img.removeAttribute("src");
        ico.appendChild(img);

        const meta = document.createElement("div");
        meta.className = "me-dd-meta";

        const k = document.createElement("div");
        k.className = "me-dd-k";
        k.textContent = it.value || "";

        const s = document.createElement("div");
        s.className = "me-dd-s";
        s.textContent = it.label || "";

        meta.appendChild(k);
        meta.appendChild(s);

        row.appendChild(ico);
        row.appendChild(meta);

        row.addEventListener("mousedown", (e) => {
          // mousedown, żeby nie zgasło na blur zanim klik zadziała
          e.preventDefault();
          inputEl.value = it.value || "";
          inputEl.dispatchEvent(new Event("input", { bubbles: true }));
          inputEl.dispatchEvent(new Event("change", { bubbles: true }));
          closeActiveDD();
        });

        dd.appendChild(row);
      });
    }

    // pozycjonowanie pod inputem
    const r = inputEl.getBoundingClientRect();
    dd.style.left = Math.max(10, Math.min(r.left, window.innerWidth - 540)) + "px";
    dd.style.top = Math.min(r.bottom + 6, window.innerHeight - 340) + "px";

    document.body.appendChild(dd);
    activeDD = dd;
    render();

    const onDocDown = (e) => {
      if (!activeDD) return;
      if (e.target === inputEl) return;
      if (activeDD.contains(e.target)) return;
      closeActiveDD();
      document.removeEventListener("mousedown", onDocDown, true);
    };
    document.addEventListener("mousedown", onDocDown, true);

    // live filtering
    const onInput = () => render();
    inputEl.addEventListener("input", onInput);

    // cleanup po zamknięciu
    const prevClose = closeActiveDD;
    closeActiveDD = function () {
      inputEl.removeEventListener("input", onInput);
      prevClose();
    };
  }

  function attachPickDropdown(inputEl, kind) {
    if (!inputEl) return;
    if (inputEl.dataset.meRichPick === "1") return;
    inputEl.dataset.meRichPick = "1";

    // otwieraj przy focus/click, filtruj po wpisywaniu
    inputEl.addEventListener("focus", () => openPickDropdown(inputEl, kind));
    inputEl.addEventListener("click", () => openPickDropdown(inputEl, kind));
  }

  // podpinamy dropdowny pod wszystkie picki
  attachPickDropdown(pickBossNormal, "bossNormal");
  attachPickDropdown(pickLocal, "local");
  attachPickDropdown(pickBossWeekly, "bossWeekly");
  attachPickDropdown(pickBooks, "books");

  // te dwa to grupy (opcjonalnie pokażą ikonę, jeśli znajdzie się w MATERIALS)
  attachPickDropdown(pickEnemiesAsc, "enemyGroups");
  attachPickDropdown(pickEnemiesTal, "enemyGroups");

  const ascBody = $("#asc-body");
  const talBody = $("#tal-body");

  const materialKeysDatalist = $("#me-material-keys");

  const bossNormalKeysDatalist = $("#me-material-keys-bossNormal");
  const localKeysDatalist = $("#me-material-keys-local");
  const enemyGroupsDatalist = $("#me-material-keys-enemyGroups");
  const bossWeeklyKeysDatalist = $("#me-material-keys-bossWeekly");
  const bookGroupsDatalist = $("#me-book-groups");

  let selectedCharKey = null;

  // --- SHARED COSTS (takie same dla każdej postaci) ---
  // Uwaga: edytor traktuje asc/tal jako wspólne i zapisuje je identycznie dla wszystkich postaci.
  const SHARED_ASC = [
    { mora: 20000,  gems: { t1: 1, t2: 0, t3: 0, t4: 0 }, enemy: { t1: 3,  t2: 0,  t3: 0  }, local: 3,  boss: 0  }, // 0→1
    { mora: 40000,  gems: { t1: 0, t2: 3, t3: 0, t4: 0 }, enemy: { t1: 15, t2: 0,  t3: 0  }, local: 10, boss: 2  }, // 1→2
    { mora: 60000,  gems: { t1: 0, t2: 6, t3: 0, t4: 0 }, enemy: { t1: 0,  t2: 12, t3: 0  }, local: 20, boss: 4  }, // 2→3
    { mora: 80000,  gems: { t1: 0, t2: 0, t3: 3, t4: 0 }, enemy: { t1: 0,  t2: 18, t3: 0  }, local: 30, boss: 8  }, // 3→4
    { mora: 100000, gems: { t1: 0, t2: 0, t3: 6, t4: 0 }, enemy: { t1: 0,  t2: 0,  t3: 12 }, local: 45, boss: 12 }, // 4→5
    { mora: 120000, gems: { t1: 0, t2: 0, t3: 0, t4: 6 }, enemy: { t1: 0,  t2: 0,  t3: 24 }, local: 60, boss: 20 }, // 5→6
  ];

  const SHARED_TAL = [
    { mora: 12500,  books: { t1: 3,  t2: 0,  t3: 0  }, enemy: { t1: 6,  t2: 0,  t3: 0  }, weekly: 0, crown: 0 }, // 1→2
    { mora: 17500,  books: { t1: 0,  t2: 2,  t3: 0  }, enemy: { t1: 0,  t2: 3,  t3: 0  }, weekly: 0, crown: 0 }, // 2→3
    { mora: 25000,  books: { t1: 0,  t2: 4,  t3: 0  }, enemy: { t1: 0,  t2: 4,  t3: 0  }, weekly: 0, crown: 0 }, // 3→4
    { mora: 30000,  books: { t1: 0,  t2: 6,  t3: 0  }, enemy: { t1: 0,  t2: 6,  t3: 0  }, weekly: 0, crown: 0 }, // 4→5
    { mora: 37500,  books: { t1: 0,  t2: 9,  t3: 0  }, enemy: { t1: 0,  t2: 9,  t3: 0  }, weekly: 0, crown: 0 }, // 5→6
    { mora: 120000, books: { t1: 0,  t2: 0,  t3: 4  }, enemy: { t1: 0,  t2: 0,  t3: 4  }, weekly: 1, crown: 0 }, // 6→7
    { mora: 260000, books: { t1: 0,  t2: 0,  t3: 6  }, enemy: { t1: 0,  t2: 0,  t3: 6  }, weekly: 1, crown: 0 }, // 7→8
    { mora: 450000, books: { t1: 0,  t2: 0,  t3: 12 }, enemy: { t1: 0,  t2: 0,  t3: 9  }, weekly: 2, crown: 0 }, // 8→9
    { mora: 700000, books: { t1: 0,  t2: 0,  t3: 16 }, enemy: { t1: 0,  t2: 0,  t3: 12 }, weekly: 2, crown: 1 }, // 9→10
  ];

  function defaultAscRow() {
    return {
      mora: 0,
      gems: { t1: 0, t2: 0, t3: 0, t4: 0 },
      enemy: { t1: 0, t2: 0, t3: 0 },
      local: 0,
      boss: 0,
    };
  }

  function defaultTalRow() {
    return {
      mora: 0,
      books: { t1: 0, t2: 0, t3: 0 },
      enemy: { t1: 0, t2: 0, t3: 0 },
      weekly: 0,
      crown: 0,
    };
  }

  function ensureCharShape(def) {
    if (!def || typeof def !== "object") def = {};
    if (!def.picks || typeof def.picks !== "object") def.picks = {};
    if (!Array.isArray(def.asc)) def.asc = [];
    if (!Array.isArray(def.tal)) def.tal = [];

    // normalize asc
    def.asc = def.asc.map((r) => {
      if (!r || typeof r !== "object") return defaultAscRow();
      const out = defaultAscRow();
      out.mora = Number(r.mora || 0);
      out.gems = {
        t1: Number(r.gems?.t1 || 0),
        t2: Number(r.gems?.t2 || 0),
        t3: Number(r.gems?.t3 || 0),
        t4: Number(r.gems?.t4 || 0),
      };
      out.enemy = {
        t1: Number(r.enemy?.t1 || 0),
        t2: Number(r.enemy?.t2 || 0),
        t3: Number(r.enemy?.t3 || 0),
      };
      out.local = Number(r.local || 0);
      out.boss = Number(r.boss || 0);
      return out;
    });

    while (def.asc.length < 6) def.asc.push(defaultAscRow());
    def.asc = def.asc.slice(0, 6);

    // normalize tal
    def.tal = def.tal.map((r) => {
      if (!r || typeof r !== "object") return defaultTalRow();
      const out = defaultTalRow();
      out.mora = Number(r.mora || 0);
      out.books = {
        t1: Number(r.books?.t1 || 0),
        t2: Number(r.books?.t2 || 0),
        t3: Number(r.books?.t3 || 0),
      };
      out.enemy = {
        t1: Number(r.enemy?.t1 || 0),
        t2: Number(r.enemy?.t2 || 0),
        t3: Number(r.enemy?.t3 || 0),
      };
      out.weekly = Number(r.weekly || 0);
      out.crown = Number(r.crown || 0);
      return out;
    });

    while (def.tal.length < 9) def.tal.push(defaultTalRow());
    def.tal = def.tal.slice(0, 9);

    return def;
  }

  function rebuildMaterialKeysDatalist() {
    // helper
    function fillDatalist(el, values) {
      if (!el) return;
      el.innerHTML = "";

      const uniq = Array.from(new Set((values || []).filter(Boolean).map((v) => String(v))));
      uniq.sort((a, b) => a.localeCompare(b));

      for (const v of uniq) {
        const opt = document.createElement("option");
        opt.value = v;
        el.appendChild(opt);
      }
    }

    // 1) legacy: wszystkie klucze (zostawiamy, bo może się jeszcze gdzieś przyda)
    const allKeys = [];
    try {
      for (const cat of Object.keys(state.mats || {})) {
        const items = state.mats?.[cat]?.items || [];
        for (const it of items) {
          if (it && it.key) allKeys.push(String(it.key));
        }
      }
    } catch (e) {
      // ignore
    }
    fillDatalist(materialKeysDatalist, allKeys);

    // 2) bossNormal: tylko bossy normalne
    const bossNormalKeys = (state.mats?.bossNormal?.items || []).map((it) => it?.key);
    fillDatalist(bossNormalKeysDatalist, bossNormalKeys);

    // 3) local: tylko local specialties
    const localKeys = (state.mats?.local?.items || []).map((it) => it?.key);
    fillDatalist(localKeysDatalist, localKeys);

    // 4) bossWeekly: tylko weekly bossy
    const bossWeeklyKeys = (state.mats?.bossWeekly?.items || []).map((it) => it?.key);
    fillDatalist(bossWeeklyKeysDatalist, bossWeeklyKeys);

    // 5) enemiesAsc/enemiesTal: lista "group" (np. mask/handguard/slime itd.)
    const enemyGroups = [];
    const enemyItems = state.mats?.enemies?.items || [];
    for (const it of enemyItems) {
      if (!it) continue;

      if (it.group) {
        enemyGroups.push(it.group);
        continue;
      }

      // fallback: jeśli ktoś dodał enemy bez "group", próbujemy wyciągnąć z key: enemy_xxx_t1 -> xxx
      if (it.key && String(it.key).startsWith("enemy_")) {
        let g = String(it.key).slice("enemy_".length);
        g = g.replace(/_t\d+$/i, "");
        enemyGroups.push(g);
      }
    }
    fillDatalist(enemyGroupsDatalist, enemyGroups);

    // 6) books: tylko grupy z BOOK_GROUP_DAYS (klucze obiektu state.books)
    fillDatalist(bookGroupsDatalist, Object.keys(state.books || {}));
  }

  function renderCharList() {
    const q = (charSearch.value || "").trim().toLowerCase();
    const keys = Object.keys(state.chars || {}).sort((a, b) => a.localeCompare(b));
    charList.innerHTML = "";

    keys
      .filter((k) => !q || k.toLowerCase().includes(q))
      .forEach((k) => {
        const it = document.createElement("div");
        it.className = "item" + (k === selectedCharKey ? " active" : "");

        const left = document.createElement("div");
        left.className = "left";

        const portrait = createCharPortraitBox(k);
        left.appendChild(portrait);

        const meta = document.createElement("div");
        meta.className = "meta";

        const line1 = document.createElement("div");
        line1.className = "k";
        line1.textContent = k;

        const picks = state.chars[k]?.picks || {};
        const line2 = document.createElement("div");
        line2.className = "s";
        line2.textContent = `element: ${state.chars[k]?.element || "-"}, books: ${picks.books || "-"}`;

        meta.appendChild(line1);
        meta.appendChild(line2);
        left.appendChild(meta);
        it.appendChild(left);

        it.addEventListener("click", () => {
          selectedCharKey = k;
          fillCharFormFromState(k);
          renderCharList();
          charSave.disabled = false;
          charDelete.disabled = false;
        });

        charList.appendChild(it);
      });
  }

  function clearCharEditor() {
    selectedCharKey = null;

    charKey.value = "";
    if (charElement) charElement.value = "";

    if (pickBossNormal) pickBossNormal.value = "";
    if (pickLocal) pickLocal.value = "";
    if (pickEnemiesAsc) pickEnemiesAsc.value = "";
    if (pickBooks) pickBooks.value = "";
    if (pickEnemiesTal) pickEnemiesTal.value = "";
    if (pickBossWeekly) pickBossWeekly.value = "";

    updateCharacterPortrait(charPreviewImg, "");
    updateAllPickIcons();

    if (ascBody) ascBody.innerHTML = "";
    if (talBody) talBody.innerHTML = "";

    charSave.disabled = true;
    charDelete.disabled = true;

    renderCharList();
  }

  function numInput(value, readOnly = false) {
    const inp = document.createElement("input");
    inp.type = "number";
    inp.className = "me-num" + (readOnly ? " ro" : "");
    inp.value = value !== undefined && value !== null ? String(value) : "0";

    if (readOnly) {
      inp.disabled = true;
    } else {
      inp.addEventListener("input", enableCharSaveIfValid);
    }
    return inp;
  }

  function tdWith(el) {
    const td = document.createElement("td");
    td.appendChild(el);
    return td;
  }

  function renderAscTable(def) {
    if (!ascBody) return;
    ascBody.innerHTML = "";
    def = ensureCharShape(def);

    SHARED_ASC.forEach((row, i) => {
      const tr = document.createElement("tr");

      const tdStep = document.createElement("td");
      tdStep.innerHTML = `<span class="me-step">${i + 1}</span>`;
      tr.appendChild(tdStep);

      const mora = numInput(row.mora || 0, true);
      tr.appendChild(tdWith(mora));

      const g1 = numInput(row.gems?.t1 || 0, true);
      const g2 = numInput(row.gems?.t2 || 0, true);
      const g3 = numInput(row.gems?.t3 || 0, true);
      const g4 = numInput(row.gems?.t4 || 0, true);
      [g1, g2, g3, g4].forEach((inp) => tr.appendChild(tdWith(inp)));

      const e1 = numInput(row.enemy?.t1 || 0, true);
      const e2 = numInput(row.enemy?.t2 || 0, true);
      const e3 = numInput(row.enemy?.t3 || 0, true);
      [e1, e2, e3].forEach((inp) => tr.appendChild(tdWith(inp)));

      const local = numInput(row.local || 0, true);
      const boss  = numInput(row.boss  || 0, true);
      [local, boss].forEach((inp) => tr.appendChild(tdWith(inp)));

      // opcjonalnie zostawiamy (nie szkodzi)
      tr._refs = { mora, g1, g2, g3, g4, e1, e2, e3, local, boss };

      ascBody.appendChild(tr);
    });
  }

  function renderTalTable(def) {
    if (!talBody) return;
    talBody.innerHTML = "";
    def = ensureCharShape(def);

    SHARED_TAL.forEach((row, i) => {
      const tr = document.createElement("tr");

      const tdStep = document.createElement("td");
      tdStep.innerHTML = `<span class="me-step">${i + 1}</span>`;
      tr.appendChild(tdStep);

      const mora = numInput(row.mora || 0, true);
      tr.appendChild(tdWith(mora));

      const b1 = numInput(row.books?.t1 || 0, true);
      const b2 = numInput(row.books?.t2 || 0, true);
      const b3 = numInput(row.books?.t3 || 0, true);
      [b1, b2, b3].forEach((inp) => tr.appendChild(tdWith(inp)));

      const e1 = numInput(row.enemy?.t1 || 0, true);
      const e2 = numInput(row.enemy?.t2 || 0, true);
      const e3 = numInput(row.enemy?.t3 || 0, true);
      [e1, e2, e3].forEach((inp) => tr.appendChild(tdWith(inp)));

      const weekly = numInput(row.weekly || 0, true);
      const crown  = numInput(row.crown  || 0, true);
      [weekly, crown].forEach((inp) => tr.appendChild(tdWith(inp)));

      // opcjonalnie zostawiamy (nie szkodzi)
      tr._refs = { mora, b1, b2, b3, e1, e2, e3, weekly, crown };

      talBody.appendChild(tr);
    });
  }

  function fillCharFormFromState(key) {
    const def = ensureCharShape(state.chars?.[key] || {});
    state.chars[key] = def;

    charKey.value = key;
    if (charElement) charElement.value = def.element || "";

    if (pickBossNormal) pickBossNormal.value = def.picks?.bossNormal || "";
    if (pickLocal) pickLocal.value = def.picks?.local || "";
    if (pickEnemiesAsc) pickEnemiesAsc.value = def.picks?.enemiesAsc || "";
    if (pickBooks) pickBooks.value = def.picks?.books || "";
    if (pickEnemiesTal) pickEnemiesTal.value = def.picks?.enemiesTal || "";
    if (pickBossWeekly) pickBossWeekly.value = def.picks?.bossWeekly || "";

    updateCharacterPortrait(charPreviewImg, key);
    updateAllPickIcons();

    renderAscTable(def);
    renderTalTable(def);

    enableCharSaveIfValid();
  }

  function enableCharSaveIfValid() {
    charSave.disabled = !charKey.value.trim();
  }

  function readAscFromUI() {
    const out = [];
    if (!ascBody) return out;

    ascBody.querySelectorAll("tr").forEach((tr) => {
      const r = tr._refs;
      out.push({
        mora: Number(r.mora.value || 0),
        gems: {
          t1: Number(r.g1.value || 0),
          t2: Number(r.g2.value || 0),
          t3: Number(r.g3.value || 0),
          t4: Number(r.g4.value || 0),
        },
        enemy: {
          t1: Number(r.e1.value || 0),
          t2: Number(r.e2.value || 0),
          t3: Number(r.e3.value || 0),
        },
        local: Number(r.local.value || 0),
        boss: Number(r.boss.value || 0),
      });
    });
    return out;
  }

  function readTalFromUI() {
    const out = [];
    if (!talBody) return out;

    talBody.querySelectorAll("tr").forEach((tr) => {
      const r = tr._refs;
      out.push({
        mora: Number(r.mora.value || 0),
        books: {
          t1: Number(r.b1.value || 0),
          t2: Number(r.b2.value || 0),
          t3: Number(r.b3.value || 0),
        },
        enemy: {
          t1: Number(r.e1.value || 0),
          t2: Number(r.e2.value || 0),
          t3: Number(r.e3.value || 0),
        },
        weekly: Number(r.weekly.value || 0),
        crown: Number(r.crown.value || 0),
      });
    });
    return out;
  }

  if (charSearch) charSearch.addEventListener("input", renderCharList);

  [charKey, charElement, pickBossNormal, pickLocal, pickEnemiesAsc, pickBooks, pickEnemiesTal, pickBossWeekly]
    .filter(Boolean)
    .forEach((el) => el.addEventListener("input", enableCharSaveIfValid));

    if (charKey) {
      charKey.addEventListener("input", () => updateCharacterPortrait(charPreviewImg, charKey.value));
    }

  if (charAdd) {
    charAdd.addEventListener("click", () => {
      selectedCharKey = null;

      charKey.value = "";
      if (charElement) charElement.value = "";

      if (pickBossNormal) pickBossNormal.value = "";
      if (pickLocal) pickLocal.value = "";
      if (pickEnemiesAsc) pickEnemiesAsc.value = "";
      if (pickBooks) pickBooks.value = "";
      if (pickEnemiesTal) pickEnemiesTal.value = "";
      if (pickBossWeekly) pickBossWeekly.value = "";

      const tmp = ensureCharShape({ element: "", picks: {}, asc: deepClone(SHARED_ASC), tal: deepClone(SHARED_TAL) });
      renderAscTable(tmp);
      renderTalTable(tmp);

      charSave.disabled = false;
      charDelete.disabled = true;
      charKey.focus();
    });
  }

  if (charSave) {
    charSave.addEventListener("click", () => {
      const k = charKey.value.trim();
      if (!k) return;

      const base = selectedCharKey ? state.chars?.[selectedCharKey] : null;
      const def = ensureCharShape(base || {});

      def.element = (charElement ? charElement.value : "").trim();

      def.picks = {
        bossNormal: pickBossNormal ? pickBossNormal.value.trim() : "",
        local: pickLocal ? pickLocal.value.trim() : "",
        enemiesAsc: pickEnemiesAsc ? pickEnemiesAsc.value.trim() : "",
        books: pickBooks ? pickBooks.value.trim() : "",
        enemiesTal: pickEnemiesTal ? pickEnemiesTal.value.trim() : "",
        bossWeekly: pickBossWeekly ? pickBossWeekly.value.trim() : "",
      };

      def.asc = deepClone(SHARED_ASC);
      def.tal = deepClone(SHARED_TAL);

      state.chars[k] = def;

      // rename key if needed
      if (selectedCharKey && selectedCharKey !== k) {
        delete state.chars[selectedCharKey];
      }

      selectedCharKey = k;
      log(`Saved CHARACTER_COSTS["${k}"]`);
      renderCharList();
    });
  }

  if (charDelete) {
    charDelete.addEventListener("click", () => {
      if (!selectedCharKey) return;
      if (!confirm(`Delete character "${selectedCharKey}"?`)) return;
      delete state.chars[selectedCharKey];
      log(`Deleted CHARACTER_COSTS["${selectedCharKey}"]`);
      clearCharEditor();
    });
  }

  function initCharsExtras() {
    rebuildMaterialKeysDatalist();
  }

  // ---- MATERIALS UI ----
  const matCategory = $("#mat-category");
  const matList = $("#mat-list");
  const matAdd = $("#mat-add");

  const matKey = $("#mat-key");
  const matName = $("#mat-name");
  const matIcon = $("#mat-icon");
  const matTier = $("#mat-tier");
  const matGroup = $("#mat-group");
  const matPreview = $("#mat-preview");
  const matCatReadonly = $("#mat-cat-readonly");

  const matSave = $("#mat-save");
  const matDelete = $("#mat-delete");

  let selectedMat = { cat: null, idx: -1 };

  function getCatKeys() {
    return Object.keys(state.mats || {}).sort((a, b) => a.localeCompare(b));
  }

  function ensureMatShape() {
    // safety for missing structure
    if (!state.mats || typeof state.mats !== "object") state.mats = {};
    for (const [cat, def] of Object.entries(state.mats)) {
      if (!def || typeof def !== "object") continue;
      if (!Array.isArray(def.items)) def.items = [];
      if (!("groupLabel" in def)) def.groupLabel = cat;
    }
  }

  function renderCategorySelect() {
    ensureMatShape();
    const cats = getCatKeys();
    matCategory.innerHTML = "";
    cats.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = `${c} (${state.mats[c]?.items?.length || 0})`;
      matCategory.appendChild(opt);
    });
    if (!cats.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "(no categories)";
      matCategory.appendChild(opt);
    }
  }

  function renderMatList() {
    ensureMatShape();
    const cat = matCategory.value;
    const items = state.mats?.[cat]?.items || [];
    matList.innerHTML = "";

    items.forEach((it, idx) => {
      const row = document.createElement("div");
      row.className = "item" + (selectedMat.cat === cat && selectedMat.idx === idx ? " active" : "");

      const left = document.createElement("div");
      left.className = "left";

      const ico = createIcoBox((it.icon || "").trim(), it.name || it.key || "");
      left.appendChild(ico);

      const meta = document.createElement("div");
      meta.className = "meta";

      const line1 = document.createElement("div");
      line1.className = "k";
      line1.textContent = it.key || "(no key)";

      const line2 = document.createElement("div");
      line2.className = "s";
      line2.textContent = it.name || "";

      meta.appendChild(line1);
      meta.appendChild(line2);

      left.appendChild(meta);
      row.appendChild(left);

      row.addEventListener("click", () => {
        selectedMat = { cat, idx };
        fillMatEditor();
        renderMatList();
      });

      matList.appendChild(row);
    });
  }

  function setPreview(path) {
    if (!path) {
      matPreview.removeAttribute("src");
      matPreview.style.display = "none";
      return;
    }
    matPreview.style.display = "block";
    matPreview.src = path;
  }

  function clearMatEditor() {
    selectedMat = { cat: null, idx: -1 };
    matKey.value = "";
    matName.value = "";
    matIcon.value = "";
    matTier.value = "";
    matGroup.value = "";
    matCatReadonly.value = matCategory.value || "";
    setPreview("");
    matSave.disabled = true;
    matDelete.disabled = true;
  }

  function fillMatEditor() {
    const cat = selectedMat.cat;
    const idx = selectedMat.idx;
    const it = state.mats?.[cat]?.items?.[idx];
    if (!it) return;

    matCatReadonly.value = cat;
    matKey.value = it.key || "";
    matName.value = it.name || "";
    matIcon.value = it.icon || "";
    matTier.value = it.tier !== undefined && it.tier !== null ? String(it.tier) : "";
    matGroup.value = it.group !== undefined && it.group !== null ? String(it.group) : "";
    setPreview(it.icon || "");

    matSave.disabled = false;
    matDelete.disabled = false;
  }

  function enableMatSaveIfValid() {
    matSave.disabled = !matKey.value.trim() || !matName.value.trim();
  }

  matIcon.addEventListener("input", () => setPreview(matIcon.value.trim()));
  [matKey, matName, matTier, matGroup].forEach((el) => el.addEventListener("input", enableMatSaveIfValid));

  matCategory.addEventListener("change", () => {
    const keep = matCategory.value; // zapamiętaj wybór zanim przebudujesz <select>

    clearMatEditor();

    // jeśli chcesz odświeżać liczniki w opcjach, musisz przywrócić wybór po przebudowie
    renderCategorySelect(); // refresh counts
    matCategory.value = keep;

    matCatReadonly.value = keep || "";
    renderMatList();
  });

  matAdd.addEventListener("click", () => {
    const cat = matCategory.value;
    if (!cat) return;

    ensureMatShape();
    state.mats[cat].items.push({ key: "", name: "", icon: "" });
    selectedMat = { cat, idx: state.mats[cat].items.length - 1 };
    fillMatEditor();
    renderCategorySelect();
    renderMatList();
    matKey.focus();

    // uzupełnienia dla picks
    rebuildMaterialKeysDatalist();
  });

  matSave.addEventListener("click", () => {
    const cat = matCategory.value;
    const idx = selectedMat.idx;
    if (!cat || idx < 0) return;

    const it = state.mats[cat].items[idx];
    it.key = matKey.value.trim();
    it.name = matName.value.trim();
    it.icon = matIcon.value.trim();

    const tierRaw = matTier.value.trim();
    if (tierRaw === "") delete it.tier;
    else it.tier = Number(tierRaw);

    const groupRaw = matGroup.value.trim();
    if (groupRaw === "") delete it.group;
    else it.group = groupRaw;

    log(`Saved MATERIALS.${cat}.items[${idx}] (${it.key})`);
    renderCategorySelect();
    renderMatList();

    // uzupełnienia dla picks
    rebuildMaterialKeysDatalist();

    rebuildMaterialIndex();
    updateAllPickIcons();
  });

  matDelete.addEventListener("click", () => {
    const cat = matCategory.value;
    const idx = selectedMat.idx;
    if (!cat || idx < 0) return;

    const it = state.mats[cat].items[idx];
    if (!confirm(`Delete item "${it?.key || "(no key)"}" from ${cat}?`)) return;

    state.mats[cat].items.splice(idx, 1);
    log(`Deleted MATERIALS.${cat}.items[${idx}]`);
    clearMatEditor();
    renderCategorySelect();
    renderMatList();

    // uzupełnienia dla picks
    rebuildMaterialKeysDatalist();

    rebuildMaterialIndex();
    updateAllPickIcons();
  });

  // ---- EXPORT ----
  function jsKey(k) {
    // keep quoted keys always for safety (Twoje dane mają spacje w wielu miejscach)
    return JSON.stringify(k);
  }

  function toJs(val, indent = 0) {
    const pad = "  ".repeat(indent);
    const pad2 = "  ".repeat(indent + 1);

    if (val === null) return "null";
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "string") return JSON.stringify(val);
    if (Array.isArray(val)) {
      if (!val.length) return "[]";
      return "[\n" + val.map((v) => pad2 + toJs(v, indent + 1)).join(",\n") + "\n" + pad + "]";
    }
    if (typeof val === "object") {
      const keys = Object.keys(val);
      if (!keys.length) return "{}";
      return "{\n" + keys.map((k) => `${pad2}${jsKey(k)}: ${toJs(val[k], indent + 1)}`).join(",\n") + "\n" + pad + "}";
    }
    return "undefined";
  }

  function buildMaterialsJs() {
    const books = state.books || {};
    const chars = state.chars || {};
    const mats = state.mats || {};

    return [
      `// Generated by materials-editor.html`,
      `const BOOK_GROUP_DAYS = ${toJs(books, 0)};`,
      ``,
      `const CHARACTER_COSTS = ${toJs(chars, 0)};`,
      ``,
      `// Attach bookDays to each CHARACTER_COSTS entry based on picks.books (if present)`,
      `(function attachBookDays(){`,
      `  try {`,
      `    for (const [name, def] of Object.entries(CHARACTER_COSTS||{})){`,
      `      const grp = (def?.picks?.books || "").toLowerCase();`,
      `      const days = BOOK_GROUP_DAYS[grp] || ["Sunday"];`,
      `      def.bookDays = days.slice(); // store a copy`,
      `    }`,
      `  } catch(e){`,
      `    console.warn("[materials.js] attachBookDays failed:", e);`,
      `  }`,
      `})();`,
      ``,
      `const MATERIALS = ${toJs(mats, 0)};`,
      ``,
    ].join("\n");
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }

  $("#btn-export").addEventListener("click", () => {
    const out = buildMaterialsJs();
    downloadText("materials.js", out);
    log("Exported materials.js (download started)");
  });

  $("#btn-reset").addEventListener("click", () => {
    if (!confirm("Reload state from currently loaded js/materials.js? (Unsaved changes will be lost)")) return;
    loadFromGlobals();
    initAll();
  });

  // ---- INIT ----
  function initAll() {
    rebuildMaterialIndex();
    
    // BOOKS
    renderBookDaysChips();
    renderBookList();
    clearBookEditor();

    // CHARS
    initCharsExtras();
    renderCharList();
    clearCharEditor();

    // MATS
    renderCategorySelect();
    matCatReadonly.value = matCategory.value || "";
    renderMatList();
    clearMatEditor();

    log("UI ready");
  }

  // start
  loadFromGlobals();
  initAll();
})();
