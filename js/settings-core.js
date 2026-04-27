(function(){
  const KEY_SETTINGS = "appSettings_v1";
  const KEY_LAST_SAVED = "appSettings_lastSaved";
  const KEY_SNAP_LIST = "appSnapshots_v1";
  const SNAP_PREFIX = "appSnapshot::";
  const KEY_PROFILE_MAP = "appSettings_profiles_v1";

  const DEFAULTS = {
    theme: { mode: "auto", preset: "Default Dark" }, // auto/light/dark + preset (np. AMOLED)
    design: {
      contrast: 1,
      shadow: 1,
      radius: 12,
      colors: {
        accent: "#3252ff",
        bg: "#101014",
        card: "#171a20",
        text: "#dddddd",
        muted: "rgba(221,221,221,.72)"
      },
      cards: { density: "normal", borders: "on", sectionHeaders: "on" }
    },
    typography: {
      uiScale: 1,
      hSize: 1,
      baseSize: 1,
      smallSize: 1,
      compactSpacing: "off",
      font: "system",
      lineHeight: 1.35
    },
    nav: {
      sticky: "on",
      collapseMobile: "on",
      icons: "off",
      startPage: "index.html",
      rememberViews: "on",
      hiddenTabs: [],
      order: [] // jeśli puste: użyj kolejności z global-nav.js
    },
    ui: {
      tooltips: { enabled: "on", delayMs: 250, mode: "near" }, // near/cursor
      images: { preferGraphics: "on", portraitSize: 64, lazy: "on", placeholders: "on" },
      motion: { level: "full", reduce: "off" } // full/limited/off
    },
    shortcuts: {
      enabled: "on",
      smoothScroll: "on",
      backToTop: "off",
      map: {
        focusSearch: "/",
        closeModal: "Escape"
      }
    },
    notifications: { enabled: "on", verbosity: "normal", autoCloseMs: 3500 },
    performance: { mode: "off", pagination: "on", lazyData: "on" },
    advanced: { safeMode: "off", showIds: "off" },
    profiles: { active: "Default", list: ["Default","Minimal","AMOLED","Neon"] },

    modules: {
      today: {
        showOptional: "on",   // on/off
        highLimit: 0          // 0 = bez limitu
      },
      teamPlanner: {
        ownedOnlyDefault: "off", // on/off (używane tylko gdy brak ViewMemory)
        defaultTab: "owned"      // owned/imaginarium (na razie tylko zapis)
      }
    }
  };

  function deepMerge(base, extra){
    if (!extra || typeof extra !== "object") return base;
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(extra).forEach(k=>{
      const bv = out[k];
      const ev = extra[k];
      if (bv && typeof bv === "object" && !Array.isArray(bv) && ev && typeof ev === "object" && !Array.isArray(ev)){
        out[k] = deepMerge(bv, ev);
      } else {
        out[k] = ev;
      }
    });
    return out;
  }

  async function kvGet(key){
    if (window.IDB && IDB.kvGet) return await IDB.kvGet(key);
    return null;
  }
  async function kvSet(key, val){
    if (window.IDB && IDB.kvSet) return await IDB.kvSet(key, val);
  }

  const SEARCH_SELECTORS = [
    "#search",
    "#ta-search",
    "#global-search",
    "#inv-search",
    "#book-search",
    "#char-search",
    ".app-search-input",
    'input[type="search"]'
  ];

  const VERBOSITY_RANK = { minimal: 0, normal: 1, debug: 2 };

  let toastHost = null;
  let tooltipNode = null;
  let tooltipTimer = null;
  let tooltipTarget = null;
  let shortcutBindingsReady = false;
  let tooltipBindingsReady = false;
  let backToTopBtn = null;
  let systemThemeWatcherReady = false;

  function cloneValue(value){
    return JSON.parse(JSON.stringify(value));
  }

  function safeSettings(){
    return window.__APP_SETTINGS__ || DEFAULTS;
  }

  function prefersDarkMode(){
    try{
      return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }catch(e){
      return true;
    }
  }

  function normalizeProfileName(name){
    return String(name || "").trim();
  }

  async function loadProfilesMap(){
    const raw = await kvGet(KEY_PROFILE_MAP);
    const map = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};

    if (!map.Default){
      map.Default = deepMerge(DEFAULTS, {});
      await kvSet(KEY_PROFILE_MAP, map);
    }

    return map;
  }

  async function listProfiles(){
    const map = await loadProfilesMap();
    return Object.keys(map).sort((a,b)=>a.localeCompare(b, "pl", { sensitivity:"base" }));
  }

  async function getProfile(name){
    const clean = normalizeProfileName(name);
    if (!clean) return null;

    const map = await loadProfilesMap();
    if (!map[clean]) return null;

    const settings = deepMerge(DEFAULTS, cloneValue(map[clean]));
    settings.profiles = settings.profiles || {};
    settings.profiles.active = clean;
    settings.profiles.list = await listProfiles();
    return settings;
  }

  async function saveProfile(name, settings){
    const clean = normalizeProfileName(name);
    if (!clean) return false;

    const map = await loadProfilesMap();
    const snapshot = deepMerge(DEFAULTS, cloneValue(settings || window.__APP_SETTINGS__ || DEFAULTS));
    snapshot.profiles = snapshot.profiles || {};
    snapshot.profiles.active = clean;

    map[clean] = snapshot;
    await kvSet(KEY_PROFILE_MAP, map);
    return true;
  }

  async function deleteProfile(name){
    const clean = normalizeProfileName(name);
    if (!clean || clean === "Default") return false;

    const map = await loadProfilesMap();
    if (!map[clean]) return false;

    delete map[clean];
    await kvSet(KEY_PROFILE_MAP, map);
    return true;
  }

  function shouldNotify(level){
    const s = safeSettings();
    const notifications = s.notifications || {};
    if ((notifications.enabled || "on") !== "on") return false;

    const wanted = VERBOSITY_RANK[level || "normal"] ?? 1;
    const current = VERBOSITY_RANK[notifications.verbosity || "normal"] ?? 1;
    return wanted <= current;
  }

  function ensureToastHost(){
    if (toastHost && document.body.contains(toastHost)) return toastHost;

    toastHost = document.getElementById("app-toast-stack");
    if (toastHost) return toastHost;

    toastHost = document.createElement("div");
    toastHost.id = "app-toast-stack";
    document.body.appendChild(toastHost);
    return toastHost;
  }

  function notify(message, opts){
    opts = opts || {};
    if (!message || !shouldNotify(opts.level || "normal")) return null;

    const host = ensureToastHost();
    const toast = document.createElement("div");
    toast.className = "app-toast app-toast--" + (opts.type || "info");
    toast.textContent = String(message);
    host.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("is-visible"));

    const autoClose = Number((safeSettings().notifications || {}).autoCloseMs || 0);
    if (autoClose > 0){
      window.setTimeout(() => {
        toast.classList.remove("is-visible");
        window.setTimeout(() => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 180);
      }, autoClose);
    }

    return toast;
  }

  function ensureTooltipNode(){
    if (tooltipNode && document.body.contains(tooltipNode)) return tooltipNode;

    tooltipNode = document.getElementById("app-ui-tooltip");
    if (tooltipNode) return tooltipNode;

    tooltipNode = document.createElement("div");
    tooltipNode.id = "app-ui-tooltip";
    document.body.appendChild(tooltipNode);
    return tooltipNode;
  }

  function restoreTooltipTitle(target){
    if (!target || !target.dataset) return;
    if (!target.dataset.appTitleBackup) return;
    target.setAttribute("title", target.dataset.appTitleBackup);
    delete target.dataset.appTitleBackup;
  }

  function hideTooltip(){
    if (tooltipTimer){
      clearTimeout(tooltipTimer);
      tooltipTimer = null;
    }

    if (tooltipTarget){
      restoreTooltipTitle(tooltipTarget);
      tooltipTarget = null;
    }

    if (tooltipNode){
      tooltipNode.classList.remove("is-visible");
      tooltipNode.textContent = "";
    }
  }

  function placeTooltip(target, clientX, clientY){
    const node = ensureTooltipNode();
    const settings = safeSettings();
    const tooltipSettings = (settings.ui && settings.ui.tooltips) ? settings.ui.tooltips : {};
    const mode = tooltipSettings.mode || "near";

    if (mode === "cursor"){
      node.style.left = (clientX + 16) + "px";
      node.style.top = (clientY + 18) + "px";
      node.style.transform = "translate(0, 0)";
      return;
    }

    const rect = target.getBoundingClientRect();
    node.style.left = (rect.left + rect.width / 2) + "px";
    node.style.top = Math.max(12, rect.top - 10) + "px";
    node.style.transform = "translate(-50%, -100%)";
  }

  function bindTooltipLayer(){
    if (tooltipBindingsReady) return;
    tooltipBindingsReady = true;

    document.addEventListener("mouseover", function(e){
      const settings = safeSettings();
      const tooltipSettings = (settings.ui && settings.ui.tooltips) ? settings.ui.tooltips : {};
      if ((tooltipSettings.enabled || "on") !== "on") return;

      const target = e.target && e.target.closest ? e.target.closest("[title]") : null;
      if (!target) return;

      const title = target.getAttribute("title");
      if (!title) return;

      hideTooltip();
      tooltipTarget = target;
      target.dataset.appTitleBackup = title;
      target.removeAttribute("title");

      const delay = Number(tooltipSettings.delayMs || 0);
      tooltipTimer = window.setTimeout(() => {
        const node = ensureTooltipNode();
        node.textContent = title;
        placeTooltip(target, e.clientX, e.clientY);
        node.classList.add("is-visible");
      }, delay);
    });

    document.addEventListener("mousemove", function(e){
      if (!tooltipNode || !tooltipTarget || !tooltipNode.classList.contains("is-visible")) return;
      const settings = safeSettings();
      const tooltipSettings = (settings.ui && settings.ui.tooltips) ? settings.ui.tooltips : {};
      if ((tooltipSettings.mode || "near") !== "cursor") return;
      placeTooltip(tooltipTarget, e.clientX, e.clientY);
    });

    document.addEventListener("mouseout", function(e){
      if (!tooltipTarget) return;
      if (e.relatedTarget && tooltipTarget.contains && tooltipTarget.contains(e.relatedTarget)) return;
      hideTooltip();
    });

    document.addEventListener("focusin", function(e){
      const settings = safeSettings();
      const tooltipSettings = (settings.ui && settings.ui.tooltips) ? settings.ui.tooltips : {};
      if ((tooltipSettings.enabled || "on") !== "on") return;

      const target = e.target && e.target.closest ? e.target.closest("[title]") : null;
      if (!target) return;

      const title = target.getAttribute("title");
      if (!title) return;

      hideTooltip();
      tooltipTarget = target;
      target.dataset.appTitleBackup = title;
      target.removeAttribute("title");

      const delay = Number(tooltipSettings.delayMs || 0);
      tooltipTimer = window.setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const node = ensureTooltipNode();
        node.textContent = title;
        placeTooltip(target, rect.left + rect.width / 2, rect.top);
        node.classList.add("is-visible");
      }, delay);
    });

    document.addEventListener("focusout", function(){
      hideTooltip();
    });
  }

  function firstVisibleSearchInput(){
    for (let i=0;i<SEARCH_SELECTORS.length;i++){
      const el = document.querySelector(SEARCH_SELECTORS[i]);
      if (!el) continue;
      if (el.disabled) continue;
      if (el.offsetParent === null) continue;
      return el;
    }
    return null;
  }

  function ensureBackToTopButton(){
    if (backToTopBtn && document.body.contains(backToTopBtn)) return backToTopBtn;

    backToTopBtn = document.getElementById("app-back-to-top");
    if (backToTopBtn) return backToTopBtn;

    backToTopBtn = document.createElement("button");
    backToTopBtn.id = "app-back-to-top";
    backToTopBtn.type = "button";
    backToTopBtn.setAttribute("aria-label", "Przewiń do góry");
    backToTopBtn.textContent = "↑";
    backToTopBtn.addEventListener("click", () => {
      const settings = safeSettings();
      const smooth = !!(settings.shortcuts && settings.shortcuts.smoothScroll === "on");
      window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    });
    document.body.appendChild(backToTopBtn);
    return backToTopBtn;
  }

  function syncBackToTopButton(settings){
    const button = ensureBackToTopButton();
    const shortcuts = settings.shortcuts || {};
    const enabled = (shortcuts.enabled || "on") === "on" && (shortcuts.backToTop || "off") === "on";

    button.hidden = !enabled;
    if (!enabled){
      button.classList.remove("is-visible");
      return;
    }

    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    button.classList.toggle("is-visible", scrollTop > 240);
  }

  function bindGlobalShortcuts(){
    if (shortcutBindingsReady) return;
    shortcutBindingsReady = true;

    document.addEventListener("keydown", function(e){
      const settings = safeSettings();
      const shortcuts = settings.shortcuts || {};
      if ((shortcuts.enabled || "on") !== "on") return;

      const tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : "";
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(e.target && e.target.isContentEditable);
      const map = shortcuts.map || {};
      const focusKey = map.focusSearch || "/";
      const closeKey = map.closeModal || "Escape";

      if (!isTyping && e.key === focusKey){
        const input = firstVisibleSearchInput();
        if (input){
          e.preventDefault();
          input.focus();
          if (typeof input.select === "function") input.select();
        }
        return;
      }

      if (e.key === closeKey){
        hideTooltip();

        const fsEl = document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement ||
          null;

        if (fsEl){
          e.preventDefault();
          if (document.exitFullscreen) document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
          else if (document.msExitFullscreen) document.msExitFullscreen();
        }
      }
    });

    window.addEventListener("scroll", function(){
      syncBackToTopButton(safeSettings());
    }, { passive:true });
  }

  function syncDebugIds(enabled){
    document.querySelectorAll("[data-app-debug-id]").forEach(el => {
      if (!enabled) el.removeAttribute("data-app-debug-id");
    });

    if (!enabled) return;

    const selectors = [
      "main [id]",
      ".settings-shell [id]",
      ".tab-container [id]",
      ".tab-content[id]",
      ".today-main [id]",
      ".home-main [id]",
      ".tier-grid-container [id]",
      "#global-nav [id]"
    ];

    const seen = new Set();
    document.querySelectorAll(selectors.join(",")).forEach(el => {
      if (!el.id || seen.has(el.id)) return;
      seen.add(el.id);
      el.setAttribute("data-app-debug-id", "#" + el.id);
    });
  }

  function bindSystemThemeWatcher(){
    if (systemThemeWatcherReady) return;
    if (!window.matchMedia) return;
    systemThemeWatcherReady = true;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const s = safeSettings();
      if (s.theme && s.theme.mode === "auto"){
        applyToDom(s);
      }
    };

    if (mq.addEventListener) mq.addEventListener("change", handler);
    else if (mq.addListener) mq.addListener(handler);
  }

  function applyToDom(settings){
    const s = settings || DEFAULTS;
    const html = document.documentElement;
    const body = document.body;

    bindSystemThemeWatcher();
    bindTooltipLayer();
    bindGlobalShortcuts();

    const theme = s.theme || {};
    const mode = theme.mode || "auto";
    const prefersDark = prefersDarkMode();

    if (theme.preset === "AMOLED"){
      html.setAttribute("data-theme", "amoled");
    } else if (mode === "light") {
      html.setAttribute("data-theme", "light");
    } else if (mode === "dark") {
      html.setAttribute("data-theme", "dark");
    } else {
      html.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }

    html.setAttribute("data-theme-preset", String(theme.preset || "Default Dark").toLowerCase().replace(/\s+/g, "-"));

    const d = s.design || {};
    const colors = d.colors || {};
    html.style.setProperty("--app-accent", colors.accent || "#3252ff");
    html.style.setProperty("--app-bg", colors.bg || "#101014");
    html.style.setProperty("--app-card", colors.card || "#171a20");
    html.style.setProperty("--app-text", colors.text || "#dddddd");
    html.style.setProperty("--app-text-muted", colors.muted || "rgba(221,221,221,.72)");

    const contrast = (d.contrast != null) ? d.contrast : 1;
    html.style.setProperty("--app-contrast", String(contrast));

    const radius = (d.radius != null) ? d.radius : 12;
    html.style.setProperty("--app-radius", radius + "px");

    const sh = (d.shadow != null) ? d.shadow : 1;
    if (sh <= 0) html.style.setProperty("--app-shadow", "0 0 0 rgba(0,0,0,0)");
    else if (sh < 0.5) html.style.setProperty("--app-shadow", "0 6px 16px rgba(0,0,0,.18)");
    else if (sh < 1) html.style.setProperty("--app-shadow", "0 10px 24px rgba(0,0,0,.25)");
    else html.style.setProperty("--app-shadow", "0 12px 32px rgba(0,0,0,.32)");

    const cards = d.cards || {};
    html.setAttribute("data-card-borders", cards.borders || "on");
    html.setAttribute("data-density", cards.density || "normal");
    html.setAttribute("data-section-headers", cards.sectionHeaders || "on");

    const nav = s.nav || {};
    html.setAttribute("data-nav-sticky", nav.sticky || "on");

    const ui = s.ui || {};
    const motion = ui.motion || {};
    if (motion.level === "off" || motion.reduce === "on") html.setAttribute("data-motion","off");
    else if (motion.level === "limited") html.setAttribute("data-motion","limited");
    else html.removeAttribute("data-motion");

    const tooltipSettings = ui.tooltips || {};
    html.setAttribute("data-tooltips", tooltipSettings.enabled || "on");
    html.setAttribute("data-tooltip-mode", tooltipSettings.mode || "near");
    html.style.setProperty("--app-tooltip-delay", String(Number(tooltipSettings.delayMs || 250)) + "ms");

    const imageSettings = ui.images || {};
    html.style.setProperty("--app-portrait-size", String(Number(imageSettings.portraitSize || 64)) + "px");

    const t = s.typography || {};
    html.setAttribute("data-compact-spacing", t.compactSpacing || "off");

    if (body){
      const scale = (t.uiScale != null) ? t.uiScale : 1;
      body.style.fontSize = (16 * scale) + "px";
      body.style.lineHeight = String(t.lineHeight || 1.35);

      const font = t.font || "system";
      if (font === "Inter") body.style.fontFamily = "Inter, system-ui, Segoe UI, Arial, sans-serif";
      else if (font === "Roboto") body.style.fontFamily = "Roboto, system-ui, Segoe UI, Arial, sans-serif";
      else body.style.fontFamily = "system-ui, Segoe UI, Arial, sans-serif";
    }

    const shortcuts = s.shortcuts || {};
    html.style.scrollBehavior = (shortcuts.smoothScroll || "on") === "on" ? "smooth" : "auto";
    syncBackToTopButton(s);

    const notifications = s.notifications || {};
    html.setAttribute("data-notifications", notifications.enabled || "on");

    const performance = s.performance || {};
    html.setAttribute("data-performance-mode", performance.mode || "off");
    html.setAttribute("data-performance-pagination", performance.pagination || "on");

    const advanced = s.advanced || {};
    html.setAttribute("data-safe-mode", advanced.safeMode || "off");
    html.setAttribute("data-show-ids", advanced.showIds || "off");
    syncDebugIds((advanced.showIds || "off") === "on");
  }

  async function loadSettings(){
    const saved = await kvGet(KEY_SETTINGS);
    const merged = deepMerge(DEFAULTS, saved || {});
    const names = await listProfiles();

    merged.profiles = merged.profiles || {};
    merged.profiles.list = names;
    if (!names.includes(merged.profiles.active)) merged.profiles.active = names[0] || "Default";

    return merged;
  }

  async function saveSettings(settings){
    const normalized = deepMerge(DEFAULTS, settings || {});
    const names = await listProfiles();

    normalized.profiles = normalized.profiles || {};
    normalized.profiles.list = names;
    if (!names.includes(normalized.profiles.active)) normalized.profiles.active = names[0] || "Default";

    await kvSet(KEY_SETTINGS, normalized);
    await kvSet(KEY_LAST_SAVED, Date.now());
    window.__APP_SETTINGS__ = normalized;
    applyToDom(normalized);
    document.dispatchEvent(new CustomEvent("appsettings:changed", { detail: normalized }));
  }

  async function init(){
    const s = await loadSettings();
    window.__APP_SETTINGS__ = s;
    applyToDom(s);
    document.dispatchEvent(new CustomEvent("appsettings:ready", { detail: s }));
  }

  // Export/Import helpers (dla settings-page.js)
  async function exportStore(store){
    if (!window.IDB) return [];

    if (store === "progress"){
      return (await IDB.all(store)) || [];
    }

    const keys = (window.IDB && IDB.keys) ? await IDB.keys(store) : [];
    const out = [];

    for (let i=0;i<keys.length;i++){
      const key = keys[i];
      let value = null;

      if (store === "kv") value = await IDB.kvGet(key);
      else value = await IDB.get(store, key);

      out.push({ key, value });
    }

    return out;
  }

  async function exportAllData(){
    const stores = ["inventory","progress","meta","todayTasks","kv"];
    const out = { ts: Date.now(), stores: {} };

    for (let i=0;i<stores.length;i++){
      out.stores[stores[i]] = await exportStore(stores[i]);
    }

    return out;
  }

  async function clearStore(store){
    if (!(window.IDB && IDB.keys)) return;
    const keys = await IDB.keys(store);
    if (!Array.isArray(keys)) return;

    for (let i=0;i<keys.length;i++){
      if (store === "kv" && IDB.kvDel) await IDB.kvDel(keys[i]);
      else await IDB.del(store, keys[i]);
    }
  }

  async function importAllData(payload, mode){
    const stores = payload && payload.stores ? payload.stores : {};
    const names = Object.keys(stores);

    for (let i=0;i<names.length;i++){
      const st = names[i];
      const arr = Array.isArray(stores[st]) ? stores[st] : [];

      if (mode === "overwrite"){
        await clearStore(st);
      }

      for (let j=0;j<arr.length;j++){
        const item = arr[j];

        if (st === "progress"){
          await IDB.put(st, item);
          continue;
        }

        if (item && typeof item === "object" && "key" in item){
          if (st === "kv") await IDB.kvSet(item.key, item.value);
          else await IDB.set(st, item.key, item.value);
          continue;
        }

        await IDB.put(st, item);
      }
    }

    await init();
  }

  async function listSnapshots(){
    const list = await kvGet(KEY_SNAP_LIST);
    return Array.isArray(list) ? list : [];
  }

  async function createSnapshot(label){
    const id = String(Date.now());
    const data = await exportAllData();
    const entry = { id, label: label || ("Snapshot " + id), ts: Date.now() };

    await kvSet(SNAP_PREFIX + id, { entry, data });

    const list = await listSnapshots();
    list.unshift(entry);
    await kvSet(KEY_SNAP_LIST, list.slice(0, 50));
    return entry;
  }

  async function restoreSnapshot(id, mode){
    const snap = await kvGet(SNAP_PREFIX + id);
    if (!snap || !snap.data) return false;
    await importAllData(snap.data, mode || "overwrite");
    await init(); // przeładuj settings i zastosuj
    return true;
  }

  async function deleteSnapshot(id){
    const list = await listSnapshots();
    const next = list.filter(x => String(x.id) !== String(id));
    await kvSet(KEY_SNAP_LIST, next);
    if (window.IDB && IDB.kvDel) await IDB.kvDel(SNAP_PREFIX + id);
  }

  window.AppSettings = {
    DEFAULTS,
    load: loadSettings,
    save: saveSettings,
    apply: (s)=>{ window.__APP_SETTINGS__ = s; applyToDom(s); },
    exportAllData,
    importAllData,
    notify,
    listProfiles,
    getProfile,
    saveProfile,
    deleteProfile,
    listSnapshots,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    keys: { KEY_SETTINGS, KEY_LAST_SAVED }
  };

  // init ASAP (po załadowaniu)
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
