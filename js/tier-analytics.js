document.addEventListener("DOMContentLoaded", function () {
  const TIER_SCORE = { "D": 1, "C": 2, "B": 3, "A": 4, "S": 5, "SS": 6 };
  const TIERS = ["SS","S","A","B","C","D"];
  const ELEMENTS = ["Anemo","Geo","Electro","Dendro","Hydro","Pyro","Cryo"];

  const el = {
    chipTotal: document.getElementById("ta-chip-total"),
    chipOwned: document.getElementById("ta-chip-owned"),
    chipDebuts: document.getElementById("ta-chip-debuts"),
    chipAvg: document.getElementById("ta-chip-avg"),

    subtitleDist: document.getElementById("ta-subtitle-dist"),

    canvasTierDist: document.getElementById("ta-canvas-tierdist"),
    legendTierDist: document.getElementById("ta-legend-tierdist"),

    canvasOwned: document.getElementById("ta-canvas-owned"),
    legendOwned: document.getElementById("ta-legend-owned"),

    canvasBreakdown: document.getElementById("ta-canvas-breakdown"),
    legendBreakdown: document.getElementById("ta-legend-breakdown"),

    listUp: document.getElementById("ta-list-up"),
    listDown: document.getElementById("ta-list-down"),
    stability: document.getElementById("ta-stability"),

    tbody: document.getElementById("ta-tbody"),
    search: document.getElementById("ta-search"),
    sort: document.getElementById("ta-sort"),
    onlyChanges: document.getElementById("ta-only-changes"),

    filterElement: document.getElementById("ta-filter-element"),
    filterRole: document.getElementById("ta-filter-role"),
    filterWeapon: document.getElementById("ta-filter-weapon"),
    filterRarity: document.getElementById("ta-filter-rarity"),
    btnClearFilters: document.getElementById("ta-btn-clear-filters"),

    btnCopyTSV: document.getElementById("ta-btn-copy-tsv"),
    btnCopyJSON: document.getElementById("ta-btn-copy-json"),

    drawer: document.getElementById("ta-drawer"),
    drawerTitle: document.getElementById("ta-drawer-title"),
    drawerSub: document.getElementById("ta-drawer-sub"),
    drawerClose: document.getElementById("ta-drawer-close"),
    canvasTrend: document.getElementById("ta-canvas-trend"),
  };

  const nav = {
    version: document.getElementById("analytics-version"),
    compare: document.getElementById("analytics-compare"),
    groupBy: document.getElementById("analytics-groupby"),
    scope: document.getElementById("analytics-scope"),
    fullscreenBtn: document.getElementById("nav-fullscreen-toggle"),
  };

  let activeTrendRow = null;
  let activeCharacterRow = null;
  let activeTrendName = "";

  // --- Owned: IndexedDB -> fallback localStorage ---
  let ownedCharactersSet = null;

  function normalizeName(name) {
    if (!name) return "";
    let s = String(name).trim();
    s = s.replace(/\s*\([^)]*\)\s*$/g, "");
    s = s.replace(/\s+/g, " ");
    return s;
  }

  async function loadOwnedCharactersSet() {
    try {
      if (window.IDB && typeof IDB.all === "function") {
        const rows = (await IDB.all("progress")) || [];
        const set = new Set();
        rows.forEach(r => {
          const n = normalizeName(r && r.character);
          if (n) set.add(n);
        });
        return set;
      }
    } catch (e) {}

    // fallback: IDB.kv (po migracji z localStorage)
    try {
      if (window.IDB && typeof IDB.kvGet === "function") {
        const arr = await IDB.kvGet("progress_legacy_characters_v1");
        if (Array.isArray(arr) && arr.length) {
          const set = new Set(arr.map(normalizeName).filter(Boolean));
          if (set.size) return set;
        }
      }
    } catch (e) {}

    return new Set();
  }

  function getAllVersions() {
    const versionsSet = new Set();
    const source = window.tierHistory || {};
    for (const data of Object.values(source)) {
      const history = (data && data.history) || {};
      Object.keys(history).forEach(v => versionsSet.add(v));
    }
    return Array.from(versionsSet).sort((a, b) => {
      const [aMaj, aMin] = a.split(".").map(Number);
      const [bMaj, bMin] = b.split(".").map(Number);
      if (aMaj !== bMaj) return aMaj - bMaj;
      return (aMin || 0) - (bMin || 0);
    });
  }

  function getRatingForVersion(data, version) {
    const h = data && data.history && data.history[version];
    return h && h.rating ? h.rating : null;
  }

  function isOwned(name) {
    if (!ownedCharactersSet) return false;
    return ownedCharactersSet.has(normalizeName(name));
  }

  function safeText(s) {
    return (s == null) ? "" : String(s);
  }

  // --- Icon helpers (paths are relative to app root) ---
  const ICONS = {
    elementsDir: "Element Icons",
    ratingsDir: "Rating Icons",
    weaponsDir: "Weapon Icons",
    charactersDir: "images/characters",
    raritiesDir: "Rarity Icons",
    rarityExt: "webp",
    // jeśli Twoje pliki mają inne rozszerzenie, zmień tutaj (np. "webp")
    ext: "png"
  };

  function escHtml(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function fileSafeName(name){
    // lekko “bezpieczne” pod ścieżki; nie ruszamy kropki/kresek.
    // jeśli Twoje nazwy ikon są 1:1 jak tekst (np. "Hydro.png"), to wystarczy.
    return String(name).trim();
  }

  function iconPathElement(element){
    if (!element) return "";
    return `${ICONS.elementsDir}/${fileSafeName(element)}.${ICONS.ext}`;
  }

  function iconPathWeapon(weapon){
    if (!weapon) return "";
    return `${ICONS.weaponsDir}/${fileSafeName(weapon)}.${ICONS.ext}`;
  }

  function iconPathRarity(rarity){
    if (!rarity) return "";
    return `${ICONS.raritiesDir}/${fileSafeName(rarity)}.${ICONS.rarityExt}`;
  }

  function iconPathRating(rating){
    if (!rating) return "";
    return `${ICONS.ratingsDir}/${fileSafeName(rating)}.${ICONS.ext}`;
  }

  function iconPathCharacter(name){
    if (!name) return "";
    // UWAGA: zakładam, że pliki w images/characters mają nazwę postaci (np. "Furina.png")
    return `${ICONS.charactersDir}/${fileSafeName(name)}.${ICONS.ext}`;
  }

  function imgIcon(src, alt, sizeClass){
    if (!src) return "";
    const a = escHtml(alt || "");
    const s = escHtml(src);
    const cls = sizeClass ? `ta-icon ${sizeClass}` : "ta-icon";
    return `<img class="${cls}" src="${s}" alt="${a}" loading="lazy" onerror="this.style.display='none'">`;
  }

  function labelWithIcon(iconSrc, text, sizeClass){
    return `<span class="ta-label">${imgIcon(iconSrc, text, sizeClass)}<span>${escHtml(text)}</span></span>`;
  }

  // --- Canvas icon cache (for drawing icons inside charts) ---
  const _iconImgCache = new Map();

  function getCachedIcon(src){
    if (!src) return null;
    if (_iconImgCache.has(src)) return _iconImgCache.get(src);

    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
    img.onload = () => { try { refresh(); } catch(e) {} };

    _iconImgCache.set(src, img);
    return img;
  }

  function drawIconAt(ctx, src, x, y, size){
    const img = getCachedIcon(src);
    if (!img) return false;

    // Jeśli jeszcze się nie załadował – spróbuj w następnych renderach
    if (!img.complete || !img.naturalWidth) return false;

    try {
      ctx.drawImage(img, x, y, size, size);
      return true;
    } catch (e) {
      return false;
    }
  }

  function drawIconAtSize(ctx, src, x, y, w, h){
    const img = getCachedIcon(src);
    if (!img) return false;

    if (!img.complete || !img.naturalWidth) return false;

    try {
      ctx.drawImage(img, x, y, w, h);
      return true;
    } catch (e) {
      return false;
    }
  }

  function iconForChartLabel(label, kind){
    // kind: "tier" | "element" | "weapon" | "rarity"
    if (!label) return "";
    if (kind === "tier") return iconPathRating(label);
    if (kind === "element") return iconPathElement(label);
    if (kind === "weapon") return iconPathWeapon(label);
    if (kind === "rarity") return iconPathRarity(label);
    return "";
  }

  // --- Fullscreen + G ---
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  }
  function enterFullscreen() {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) docEl.requestFullscreen();
    else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
    else if (docEl.mozRequestFullScreen) docEl.mozRequestFullScreen();
    else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen();
  }
  function exitFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }
  function updateFullscreenButton() {
    if (!nav.fullscreenBtn) return;
    nav.fullscreenBtn.textContent = isFullscreen() ? "Exit full screen" : "Full screen";
  }
  if (nav.fullscreenBtn) {
    nav.fullscreenBtn.addEventListener("click", function () {
      if (!isFullscreen()) enterFullscreen();
      else exitFullscreen();
    });
    updateFullscreenButton();
  }
  function handleFullscreenChange() {
    updateFullscreenButton();
    if (!isFullscreen()) document.body.classList.remove("nav-hidden");
  }
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  document.addEventListener("mozfullscreenchange", handleFullscreenChange);
  document.addEventListener("MSFullscreenChange", handleFullscreenChange);
  document.addEventListener("keydown", function (e) {
    if (e.key === "g" || e.key === "G") {
      if (isFullscreen()) document.body.classList.toggle("nav-hidden");
    }
  });

  // --- Canvas helpers ---
  function clearCanvas(c) {
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
  }

  function drawBarChart(canvas, labels, values, options) {
    const ctx = canvas.getContext("2d");
    clearCanvas(canvas);

    const padL = 46, padR = 14, padT = 18, padB = 34;
    const w = canvas.width, h = canvas.height;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    const maxV = Math.max(1, ...values);
    const barW = innerW / Math.max(1, values.length);
    const gap = Math.max(4, barW * 0.18);
    const bw = Math.max(8, barW - gap);

    ctx.fillStyle = "#bcbcbc";
    ctx.font = "12px Arial";

    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const t = (maxV * i) / ticks;
      const y = padT + innerH - (innerH * i) / ticks;
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#7a7a7a";
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();

      ctx.globalAlpha = 0.9;
      ctx.fillText(String(Math.round(t)), 10, y + 4);
    }

    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      const lab = labels[i];
      const x = padL + i * barW + gap / 2;
      const bh = (v / maxV) * innerH;
      const y = padT + innerH - bh;
      const barColor =
        (options && typeof options.barColorAt === "function")
          ? options.barColorAt(lab, i)
          : ((options && options.barColor) ? options.barColor : "#eaeaea");

      ctx.globalAlpha = 0.92;
      ctx.fillStyle = barColor;
      ctx.fillRect(x, y, bw, bh);

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#cfcfcf";
      ctx.font = "12px Arial";

      const yLab = h - 12;

      // Ikony w podpisach: zależnie od typu wykresu (options.labelIconKind)
      const kind = options && options.labelIconKind ? options.labelIconKind : null;
      const iconSrc = kind ? iconForChartLabel(lab, kind) : "";

      const iconSize = 14;
      const textGap = 6;

      // text mode: "icon+text" (domyślnie) | "icon-only" | "text-only"
      const textMode = (options && options.labelTextMode) ? options.labelTextMode : "icon+text";

      const textW = ctx.measureText(lab).width;
      const wantText = (textMode !== "icon-only");
      const wantIcon = (textMode !== "text-only") && !!iconSrc;

      // Rarity icons are wide strips (★★★★/★★★★★), so keep aspect ratio on canvas
      let iconW = iconSize;
      if (wantIcon && kind === "rarity") {
        const img = getCachedIcon(iconSrc);
        if (img && img.complete && img.naturalWidth && img.naturalHeight) {
          iconW = Math.round(iconSize * (img.naturalWidth / img.naturalHeight));
          // Bezpieczny limit, żeby nie rozwalało osi na bardzo szerokich plikach:
          iconW = Math.max(iconSize, Math.min(iconW, 90));
        } else {
          // Gdy jeszcze się ładuje – przyjmij sensowną szerokość startową
          iconW = 56;
        }
      }

      // Wycentruj całość zależnie od trybu
      const totalW =
        (wantIcon ? (kind === "rarity" ? iconW : iconSize) : 0) +
        (wantIcon && wantText ? textGap : 0) +
        (wantText ? textW : 0);

      let startX = x + bw / 2 - totalW / 2;

      if (wantIcon) {
        const drew = (kind === "rarity")
          ? drawIconAtSize(ctx, iconSrc, startX, yLab - 12, iconW, iconSize)
          : drawIconAt(ctx, iconSrc, startX, yLab - 12, iconSize);

        if (drew) startX += (kind === "rarity" ? iconW : iconSize) + (wantText ? textGap : 0);
      }

      if (wantText) {
        ctx.fillText(lab, startX, yLab);
      }

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#eaeaea";
      const vs = String(v);
      const vx = x + bw / 2 - ctx.measureText(vs).width / 2;
      ctx.fillText(vs, vx, Math.max(14, y - 6));
    }
  }

  function drawTwoSeriesBars(canvas, labels, aVals, bVals, options) {
    const ctx = canvas.getContext("2d");
    clearCanvas(canvas);

    const padL = 46, padR = 14, padT = 18, padB = 34;
    const w = canvas.width, h = canvas.height;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    const maxV = Math.max(1, ...aVals, ...bVals);
    const groupW = innerW / Math.max(1, labels.length);
    const gap = Math.max(4, groupW * 0.18);
    const bw = Math.max(6, (groupW - gap) / 2);

    ctx.fillStyle = "#bcbcbc";
    ctx.font = "12px Arial";
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const t = (maxV * i) / ticks;
      const y = padT + innerH - (innerH * i) / ticks;
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#7a7a7a";
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.fillText(String(Math.round(t)), 10, y + 4);
    }

    for (let i = 0; i < labels.length; i++) {
      const x0 = padL + i * groupW + gap / 2;
      const lab = labels[i];

      const v1 = aVals[i] || 0;
      const v2 = bVals[i] || 0;

      const h1 = (v1 / maxV) * innerH;
      const h2 = (v2 / maxV) * innerH;
      const baseColor =
        (options && typeof options.barColorAt === "function")
          ? options.barColorAt(lab, i)
          : tierColor(lab);

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = baseColor;
      ctx.fillRect(x0, padT + innerH - h1, bw, h1);

      ctx.globalAlpha = 0.45;
      ctx.fillStyle = baseColor;
      ctx.fillRect(x0 + bw + 6, padT + innerH - h2, bw, h2);

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#cfcfcf";
      ctx.font = "12px Arial";

      const yLab = h - 12;

      // Domyślnie: dla tego wykresu też chcemy ikony tierów
      const iconSrc = iconForChartLabel(lab, "tier");
      const iconSize = 14;
      const textGap = 6;

      const textW = ctx.measureText(lab).width;
      const totalW = iconSrc ? (iconSize + textGap + textW) : textW;
      let startX = x0 + (bw * 2 + 6) / 2 - totalW / 2;

      let drewIcon = false;
      if (iconSrc) {
        drewIcon = drawIconAt(ctx, iconSrc, startX, yLab - 12, iconSize);
        if (drewIcon) startX += (iconSize + textGap);
      }

      // Dla tierów w tym wykresie chcemy same ikony
      if (!drewIcon) {
        ctx.fillText(lab, startX, yLab);
      }
    }
  }

  function drawTrend(canvas, versions, ratings) {
    const ctx = canvas.getContext("2d");
    clearCanvas(canvas);

    const padL = 46, padR = 14, padT = 16, padB = 30;
    const w = canvas.width, h = canvas.height;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#7a7a7a";
    for (let s = 1; s <= 6; s++) {
      const y = padT + innerH - ((s - 1) / 5) * innerH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#bcbcbc";
    ctx.font = "12px Arial";
    ctx.fillText("SS", 12, padT + 10);
    ctx.fillText("D", 18, padT + innerH + 6);

    const n = versions.length;
    if (n < 2) return;

    function xAt(i) { return padL + (i / (n - 1)) * innerW; }
    function yAt(score) { return padT + innerH - ((score - 1) / 5) * innerH; }

    const trendGradient = ctx.createLinearGradient(padL, 0, w - padR, 0);
    trendGradient.addColorStop(0, "#74d7ff");
    trendGradient.addColorStop(0.5, "#ffd166");
    trendGradient.addColorStop(1, "#ff6bcb");

    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = trendGradient;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const s = ratings[i];
      if (s == null) continue;
      const x = xAt(i);
      const y = yAt(s);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#ffd166";
    for (let i = 0; i < n; i++) {
      const s = ratings[i];
      if (s == null) continue;
      const x = xAt(i);
      const y = yAt(s);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#cfcfcf";
    const showEvery = Math.ceil(n / 8);
    for (let i = 0; i < n; i += showEvery) {
      const x = xAt(i);
      const v = versions[i];
      ctx.fillText(v, x - ctx.measureText(v).width / 2, h - 10);
    }
    const vlast = versions[n - 1];
    ctx.fillText(vlast, xAt(n - 1) - ctx.measureText(vlast).width / 2, h - 10);
  }

  // --- Data build ---
  function buildRows(selectedVersion, compareVersion, scopeMode) {
    const source = window.tierHistory || {};
    const rows = [];

    for (const [name, data] of Object.entries(source)) {
      const rating = getRatingForVersion(data, selectedVersion);
      if (!rating) continue;

      const prev = compareVersion ? getRatingForVersion(data, compareVersion) : null;

      const owned = isOwned(name);
      if (scopeMode === "owned" && !owned) continue;
      if (scopeMode === "not-owned" && owned) continue;

      const delta = (prev && rating) ? (TIER_SCORE[rating] - TIER_SCORE[prev]) : null;

      rows.push({
        name,
        rating,
        prev,
        delta,
        element: data.element || "",
        role: data.role || "",
        weapon: data.weapon || "",
        rarity: data.rarity || "",
        debut: data.debiut || "",
        owned
      });
    }

    return rows;
  }

  function countByTier(rows) {
    const map = new Map(TIERS.map(t => [t, 0]));
    rows.forEach(r => map.set(r.rating, (map.get(r.rating) || 0) + 1));
    return TIERS.map(t => map.get(t) || 0);
  }

  function avgScore(rows) {
    if (!rows.length) return 0;
    const sum = rows.reduce((acc, r) => acc + (TIER_SCORE[r.rating] || 0), 0);
    return sum / rows.length;
  }

  function debutsInVersion(rows, version) {
    return rows.filter(r => r.debut === version).length;
  }

  function groupKey(row, groupBy) {
    if (groupBy === "element") return row.element || "—";
    if (groupBy === "role") return row.role || "—";
    if (groupBy === "weapon") return row.weapon || "—";
    if (groupBy === "rarity") return row.rarity || "—";
    return "All";
  }

  function breakdown(rows, groupBy) {
    const m = new Map();
    rows.forEach(r => {
      const k = groupKey(r, groupBy);
      if (!m.has(k)) m.set(k, new Map(TIERS.map(t => [t, 0])));
      const tm = m.get(k);
      tm.set(r.rating, (tm.get(r.rating) || 0) + 1);
    });

    let keys = Array.from(m.keys());
    if (groupBy === "element") {
      keys = ELEMENTS.filter(e => m.has(e)).concat(keys.filter(k => !ELEMENTS.includes(k)));
    } else {
      keys.sort((a,b) => String(a).localeCompare(String(b)));
    }

    const labels = keys;
    const totals = keys.map(k => {
      const tm = m.get(k);
      return TIERS.reduce((acc, t) => acc + (tm.get(t) || 0), 0);
    });

    return { labels, totals };
  }

  function getTopMovers(rows, dir) {
    const withDelta = rows.filter(r => typeof r.delta === "number");
    withDelta.sort((a,b) => (b.delta - a.delta));
    if (dir === "up") return withDelta.filter(r => r.delta > 0).slice(0, 10);
    return withDelta.filter(r => r.delta < 0).slice(-10).reverse();
  }

  function stabilityStats(rows) {
    const withDelta = rows.filter(r => typeof r.delta === "number");
    const unchanged = withDelta.filter(r => r.delta === 0).length;
    const up = withDelta.filter(r => r.delta > 0).length;
    const down = withDelta.filter(r => r.delta < 0).length;
    return { compared: withDelta.length, unchanged, up, down };
  }

  // --- UI helpers ---
  function renderLegend(container, items) {
    container.innerHTML = "";

    items.forEach(it => {
      const d = document.createElement("div");
      d.className = "ta-legend-item";

      // domyślnie: pokazujemy kropkę, ale można ją wyłączyć (np. gdy ikona już "robi robotę")
      if (it.dot !== false) {
        const dot = document.createElement("span");
        dot.className = "ta-dot";
        dot.style.background = it.color || "#777";
        d.appendChild(dot);
      }

      const tx = document.createElement("span");

      // jeśli podano html -> wstawiamy html, w przeciwnym wypadku tekst
      if (it.html != null) tx.innerHTML = it.html;
      else tx.textContent = it.text != null ? String(it.text) : "";

      d.appendChild(tx);
      container.appendChild(d);
    });
  }

  function tierColor(tier){
    if (tier === "SS") return "#ff6b6b";
    if (tier === "S") return "#ffa366";
    if (tier === "A") return "#ffd166";
    if (tier === "B") return "#a5d6a7";
    if (tier === "C") return "#81d4fa";
    if (tier === "D") return "#b39ddb";
    return "#eaeaea";
  }

  const GROUP_PALETTE = ["#74d7ff", "#ffd166", "#ff8fab", "#b39ddb", "#7bd88f", "#f6a15a", "#4cc9f0", "#c77dff"];
  const ELEMENT_COLORS = {
    Anemo: "#74d7a8",
    Geo: "#d6a84f",
    Electro: "#b39ddb",
    Dendro: "#8bd450",
    Hydro: "#4cc9f0",
    Pyro: "#ff7a59",
    Cryo: "#9be7ff"
  };

  function paletteColor(index){
    return GROUP_PALETTE[index % GROUP_PALETTE.length];
  }

  function chartColorForLabel(label, index, kind){
    if (kind === "tier") return tierColor(label);
    if (kind === "element") return ELEMENT_COLORS[label] || paletteColor(index);
    if (kind === "rarity") {
      const stars = (String(label).match(/★/g) || []).length;
      return stars >= 5 ? "#ffd166" : "#b39ddb";
    }
    return paletteColor(index);
  }

  function renderTierDist(rows, version, scopeLabel) {
    const counts = countByTier(rows);
    el.subtitleDist.textContent = `Wersja ${version} • ${scopeLabel} • N=${rows.length}`;
    drawBarChart(el.canvasTierDist, TIERS, counts, { barColorAt: (label, index) => chartColorForLabel(label, index, "tier"), labelIconKind: "tier", labelTextMode: "icon-only" });;
    renderLegend(
      el.legendTierDist,
      TIERS.map(t => ({
        html: `${imgIcon(iconPathRating(t), t, "sm")} <b>${counts[TIERS.indexOf(t)]}</b>`,
        color: tierColor(t),
      }))
    );
  }

  function renderOwnedChart(rowsAll) {
    const ownedRows = rowsAll.filter(r => r.owned);
    const notOwnedRows = rowsAll.filter(r => !r.owned);

    const a = countByTier(ownedRows);
    const b = countByTier(notOwnedRows);

    drawTwoSeriesBars(el.canvasOwned, TIERS, a, b, { barColorAt: (label, index) => chartColorForLabel(label, index, "tier") });
    renderLegend(el.legendOwned, [
      { text: "Owned (pełny kolor)", color: "#ffd166" },
      { text: "Not owned (ten sam kolor, półprzezroczysty)", color: "rgba(255, 209, 102, .45)" }
    ]);
  }

  function renderBreakdown(rows, groupBy) {
    const { labels, totals } = breakdown(rows, groupBy);
    const iconKind =
      (groupBy === "element") ? "element" :
      (groupBy === "weapon") ? "weapon" :
      (groupBy === "rarity") ? "rarity" :
      null;
    drawBarChart(
      el.canvasBreakdown,
      labels.slice(0, 16),
      totals.slice(0, 16),
      { barColorAt: (label, index) => chartColorForLabel(label, index, groupBy), labelIconKind: iconKind, labelTextMode: (iconKind ? "icon-only" : "icon+text") }
    );

    const top = labels
      .map((k,i) => ({ k, v: totals[i] }))
      .sort((a,b) => b.v - a.v)
      .slice(0, 10);

    renderLegend(
      el.legendBreakdown,
      top.map((x, index) => {
        // Domyślnie sama nazwa (role/rarity)
        let labelHTML = `<span>${escHtml(x.k)}</span>`;

        // Jeśli grupujesz po elemencie / broni — dodaj ikonę
        if (groupBy === "element") {
          labelHTML = labelWithIcon(iconPathElement(x.k), x.k, "sm");
        } else if (groupBy === "weapon") {
          labelHTML = labelWithIcon(iconPathWeapon(x.k), x.k, "sm");
        }
        else if (groupBy === "rarity") {
          labelHTML = imgIcon(iconPathRarity(x.k), x.k, "rarity");
        }

        return {
          html: `${labelHTML} <b>${x.v}</b>`,
          color: chartColorForLabel(x.k, index, groupBy)
        };
      })
    );
  }

  function renderMovers(rows, selectedVersion, compareVersion) {
    const up = getTopMovers(rows, "up");
    const down = getTopMovers(rows, "down");
    const st = stabilityStats(rows);

    el.listUp.innerHTML = "";
    up.forEach(r => {
      const li = document.createElement("li");
      const charIcon = iconPathCharacter(r.name);
      const prevIcon = r.prev ? iconPathRating(r.prev) : "";
      const curIcon  = iconPathRating(r.rating);

      li.innerHTML =
        `<span class="ta-label">` +
          `${imgIcon(charIcon, r.name, "sm")}` +
          `<b>${escHtml(r.name)}</b>` +
        `</span>` +
        `: ` +
        `${r.prev ? imgIcon(prevIcon, r.prev, "sm") : "—"} ` +
        `→ ` +
        `${imgIcon(curIcon, r.rating, "sm")}` +
        ` <span class="ta-delta pos">(Δ +${r.delta})</span>`;
      el.listUp.appendChild(li);
    });

    el.listDown.innerHTML = "";
    down.forEach(r => {
      const li = document.createElement("li");
      const charIcon = iconPathCharacter(r.name);
      const prevIcon = r.prev ? iconPathRating(r.prev) : "";
      const curIcon  = iconPathRating(r.rating);

      li.innerHTML =
        `<span class="ta-label">` +
          `${imgIcon(charIcon, r.name, "sm")}` +
          `<b>${escHtml(r.name)}</b>` +
        `</span>` +
        `: ` +
        `${r.prev ? imgIcon(prevIcon, r.prev, "sm") : "—"} ` +
        `→ ` +
        `${imgIcon(curIcon, r.rating, "sm")}` +
        ` <span class="ta-delta neg">(Δ ${r.delta})</span>`;
      el.listDown.appendChild(li);
    });

    el.stability.innerHTML =
      `Compared: <b>${st.compared}</b><br>` +
      `Unchanged: <b>${st.unchanged}</b><br>` +
      `Up: <b>${st.up}</b><br>` +
      `Down: <b>${st.down}</b><br>` +
      (compareVersion ? `Baseline: <b>${compareVersion}</b> → <b>${selectedVersion}</b>` : `Baseline: —`);
  }

  function renderChips(rows, selectedVersion) {
    const total = rows.length;
    const owned = rows.filter(r => r.owned).length;
    const debuts = debutsInVersion(rows, selectedVersion);
    const avg = avgScore(rows);

    el.chipTotal.textContent = `Total: ${total}`;
    el.chipOwned.textContent = `Owned: ${owned}`;
    el.chipDebuts.textContent = `Debuts: ${debuts}`;
    el.chipAvg.textContent = `Avg score: ${avg.toFixed(2)}`;
  }

  function deltaClass(v){
    if (typeof v !== "number") return "zero";
    if (v > 0) return "pos";
    if (v < 0) return "neg";
    return "zero";
  }

  // --- Dynamic dropdown filters (cascading) + counters ---
  function normalizeValue(v) {
    const s = (v == null) ? "" : String(v).trim();
    return s;
  }

  function uniqueSorted(values, preferredOrder) {
    const set = new Set(values.map(normalizeValue).filter(v => v !== ""));
    let arr = Array.from(set);

    if (preferredOrder && Array.isArray(preferredOrder) && preferredOrder.length) {
      const pref = preferredOrder.filter(p => set.has(p));
      const rest = arr.filter(x => !preferredOrder.includes(x)).sort((a,b) => a.localeCompare(b));
      return pref.concat(rest);
    }
    return arr.sort((a,b) => a.localeCompare(b));
  }

  function countByField(rows, field) {
    const m = new Map();
    rows.forEach(r => {
      const key = normalizeValue(r[field]);
      if (!key) return;
      m.set(key, (m.get(key) || 0) + 1);
    });
    return m;
  }

  function fillSelectWithCounts(selectEl, allLabelBase, valuesOrdered, countsMap, keepValue, totalCountForAll) {
    if (!selectEl) return;

    const current = keepValue != null ? String(keepValue) : selectEl.value;

    selectEl.innerHTML = "";

    const o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = `${allLabelBase} (${totalCountForAll || 0})`;
    selectEl.appendChild(o0);

    valuesOrdered.forEach(v => {
      const c = countsMap.get(v) || 0;
      const o = document.createElement("option");
      o.value = v; // wartość bez licznika
      o.textContent = `${v} (${c})`;
      selectEl.appendChild(o);
    });

    // przywróć jeśli nadal istnieje, inaczej wyczyść
    selectEl.value = valuesOrdered.includes(current) ? current : "";
  }

  function getFilterState() {
    return {
      element: el.filterElement ? el.filterElement.value : "",
      role: el.filterRole ? el.filterRole.value : "",
      weapon: el.filterWeapon ? el.filterWeapon.value : "",
      rarity: el.filterRarity ? el.filterRarity.value : "",
    };
  }

  function applyFilters(rows, state) {
    const fE = state.element || "";
    const fR = state.role || "";
    const fW = state.weapon || "";
    const fRa = state.rarity || "";

    return rows.filter(r => {
      if (fE && normalizeValue(r.element) !== fE) return false;
      if (fR && normalizeValue(r.role) !== fR) return false;
      if (fW && normalizeValue(r.weapon) !== fW) return false;
      if (fRa && normalizeValue(r.rarity) !== fRa) return false;
      return true;
    });
  }

  function applyFiltersExcept(rows, state, exceptKey) {
    const st = { ...state };
    st[exceptKey] = "";
    return applyFilters(rows, st);
  }

  function rebuildFilterOptionsCascading(baseRows) {
    const state = getFilterState();

    // Każdy dropdown dostaje "kontekst" = wiersze spełniające pozostałe filtry
    const rowsForElement = applyFiltersExcept(baseRows, state, "element");
    const rowsForRole    = applyFiltersExcept(baseRows, state, "role");
    const rowsForWeapon  = applyFiltersExcept(baseRows, state, "weapon");
    const rowsForRarity  = applyFiltersExcept(baseRows, state, "rarity");

    // Liczniki liczymy Z TEGO KONTEKSTU (czyli też dynamicznie się zmieniają)
    const elementCounts = countByField(rowsForElement, "element");
    const roleCounts    = countByField(rowsForRole, "role");
    const weaponCounts  = countByField(rowsForWeapon, "weapon");
    const rarityCounts  = countByField(rowsForRarity, "rarity");

    // Lista opcji (uporządkowana)
    const elements = uniqueSorted(Array.from(elementCounts.keys()), ELEMENTS);
    const roles    = uniqueSorted(Array.from(roleCounts.keys()));
    const weapons  = uniqueSorted(Array.from(weaponCounts.keys()));
    const rarities = uniqueSorted(Array.from(rarityCounts.keys()), ["★★★★★","★★★★"]);

    // Wartość "All" pokazuje liczbę wierszy w kontekście (czyli ile zostaje przy pozostałych filtrach)
    fillSelectWithCounts(el.filterElement, "Element: All", elements, elementCounts, state.element, rowsForElement.length);
    fillSelectWithCounts(el.filterRole,    "Role: All",    roles,    roleCounts,    state.role,    rowsForRole.length);
    fillSelectWithCounts(el.filterWeapon,  "Weapon: All",  weapons,  weaponCounts,  state.weapon,  rowsForWeapon.length);
    fillSelectWithCounts(el.filterRarity,  "Rarity: All",  rarities, rarityCounts,  state.rarity,  rowsForRarity.length);
  }

  // --- Table render ---
  function renderTable(baseRows, selectedVersion, compareVersion) {
    // 1) przebuduj dropdowny kaskadowo + liczniki
    rebuildFilterOptionsCascading(baseRows);

    // 2) zastosuj aktualny stan dropdownów
    const state = getFilterState();
    let out = applyFilters(baseRows, state);

    // 3) reszta filtrów tabeli
    const q = (el.search.value || "").trim().toLowerCase();
    const onlyChanges = !!el.onlyChanges.checked;
    const sortMode = el.sort.value;

    if (onlyChanges) out = out.filter(r => typeof r.delta === "number" && r.delta !== 0);

    if (q) {
      out = out.filter(r => {
        const blob = [
          r.name, r.rating, r.prev, r.element, r.role, r.weapon, r.rarity, r.debut,
          r.owned ? "owned" : "not owned"
        ].join(" ").toLowerCase();
        return blob.includes(q);
      });
    }

    out.sort((a,b) => {
      const aScore = TIER_SCORE[a.rating] || 0;
      const bScore = TIER_SCORE[b.rating] || 0;
      const ad = (typeof a.delta === "number") ? a.delta : -999;
      const bd = (typeof b.delta === "number") ? b.delta : -999;

      if (sortMode === "delta_desc") return (bd - ad);
      if (sortMode === "delta_asc") return (ad - bd);
      if (sortMode === "rating_desc") return (bScore - aScore);
      if (sortMode === "rating_asc") return (aScore - bScore);
      if (sortMode === "name_desc") return b.name.localeCompare(a.name);
      return a.name.localeCompare(b.name);
    });

    closeTrendRow();
    el.tbody.innerHTML = "";
    out.forEach(r => {
      const tr = document.createElement("tr");
      tr.className = "ta-character-row";

      const tdName = document.createElement("td");
      const charIcon = iconPathCharacter(r.name);
      const tierIcon = iconPathRating(r.rating);
      tdName.innerHTML =
        `<span class="ta-pill">` +
          `${imgIcon(charIcon, r.name, "sm")}` +
          `${imgIcon(tierIcon, r.rating, "sm")}` +
          `${escHtml(safeText(r.name))}` +
        `</span>`;
      tr.appendChild(tdName);

      const tdRating = document.createElement("td");
      tdRating.innerHTML = imgIcon(iconPathRating(r.rating), r.rating, "");
      tr.appendChild(tdRating);

      const tdPrev = document.createElement("td");
      tdPrev.innerHTML = r.prev ? imgIcon(iconPathRating(r.prev), r.prev, "") : "—";
      tr.appendChild(tdPrev);

      const tdDelta = document.createElement("td");
      const d = (typeof r.delta === "number") ? r.delta : null;
      const txt = (d == null) ? "—" : (d > 0 ? `+${d}` : String(d));
      tdDelta.innerHTML = `<span class="ta-delta ${deltaClass(d)}">${txt}</span>`;
      tr.appendChild(tdDelta);

      const tdEl = document.createElement("td");
      tdEl.innerHTML = r.element ? labelWithIcon(iconPathElement(r.element), r.element, "sm") : "—";
      tr.appendChild(tdEl);

      const tdRole = document.createElement("td");
      tdRole.textContent = r.role || "—";
      tr.appendChild(tdRole);

      const tdWeapon = document.createElement("td");
      tdWeapon.innerHTML = r.weapon ? labelWithIcon(iconPathWeapon(r.weapon), r.weapon, "sm") : "—";
      tr.appendChild(tdWeapon);

      const tdRarity = document.createElement("td");
      tdRarity.innerHTML = r.rarity ? imgIcon(iconPathRarity(r.rarity), r.rarity, "rarity") : "—";
      tr.appendChild(tdRarity);

      const tdDebut = document.createElement("td");
      tdDebut.textContent = r.debut || "—";
      tr.appendChild(tdDebut);

      const tdOwned = document.createElement("td");
      tdOwned.textContent = r.owned ? "Yes" : "No";
      tr.appendChild(tdOwned);

      tr.addEventListener("click", function(){
        if (activeTrendName === r.name && activeTrendRow && activeTrendRow.parentNode) {
          closeTrendRow();
          return;
        }

        openTrend(r.name, tr);
      });

      el.tbody.appendChild(tr);
    });

    return out;
  }

  function closeTrendRow() {
    if (el.drawer) el.drawer.setAttribute("aria-hidden", "true");

    if (activeCharacterRow) {
      activeCharacterRow.classList.remove("ta-row-active");
    }

    if (activeTrendRow && activeTrendRow.parentNode) {
      activeTrendRow.parentNode.removeChild(activeTrendRow);
    }

    activeTrendRow = null;
    activeCharacterRow = null;
    activeTrendName = "";
  }

  function showTrendBelowRow(hostRow, name) {
    if (activeTrendRow && activeTrendRow.parentNode) {
      activeTrendRow.parentNode.removeChild(activeTrendRow);
    }

    if (activeCharacterRow) {
      activeCharacterRow.classList.remove("ta-row-active");
    }

    const detailRow = document.createElement("tr");
    detailRow.className = "ta-trend-row";

    const detailCell = document.createElement("td");
    detailCell.colSpan = 10;
    detailCell.appendChild(el.drawer);

    detailRow.appendChild(detailCell);
    hostRow.insertAdjacentElement("afterend", detailRow);

    hostRow.classList.add("ta-row-active");
    activeTrendRow = detailRow;
    activeCharacterRow = hostRow;
    activeTrendName = name;
  }

  function openTrend(name, hostRow) {
    const data = (window.tierHistory || {})[name];
    if (!data) return;

    const versions = getAllVersions().filter(v => !!getRatingForVersion(data, v));
    const scores = versions.map(v => {
      const rt = getRatingForVersion(data, v);
      return rt ? (TIER_SCORE[rt] || null) : null;
    });

    el.drawerTitle.textContent = name;
    const e = data.element || "—";
    const w = data.weapon || "—";
    const ra = data.rarity || "—";
    const r = getRatingForVersion(data, nav.version ? nav.version.value : "") || "";

    const elementHTML = (e !== "—") ? labelWithIcon(iconPathElement(e), e, "sm") : "—";
    const weaponHTML  = (w !== "—") ? labelWithIcon(iconPathWeapon(w), w, "sm") : "—";
    const rarityHTML  = (ra !== "—") ? imgIcon(iconPathRarity(ra), ra, "rarity") : "—";
    const ratingHTML  = r ? imgIcon(iconPathRating(r), r, "sm") : "";

    el.drawerSub.innerHTML =
      `Debut: <b>${escHtml(data.debiut || "—")}</b> • ` +
      `${elementHTML} • ` +
      `<span class="ta-label tight"><span>${escHtml(data.role || "—")}</span></span> • ` +
      `${weaponHTML} • ` +
      `${rarityHTML} ` +
      `${ratingHTML ? " • " + ratingHTML : ""}`;

    if (hostRow) showTrendBelowRow(hostRow, name);
    el.drawer.setAttribute("aria-hidden", "false");

    drawTrend(el.canvasTrend, versions, scores);
  }

  el.drawerClose.addEventListener("click", function(){
    closeTrendRow();
  });

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  function rowsToTSV(rows) {
    const head = ["name","rating","prev","delta","element","role","weapon","rarity","debut","owned"].join("\t");
    const lines = rows.map(r => [
      r.name, r.rating, r.prev || "", (typeof r.delta==="number" ? r.delta : ""),
      r.element, r.role, r.weapon, r.rarity, r.debut, r.owned ? "1" : "0"
    ].map(safeText).join("\t"));
    return [head].concat(lines).join("\n");
  }

  // --- Main refresh ---
  let lastRenderedRows = [];

  function refresh() {
    const selectedVersion = nav.version ? nav.version.value : null;
    const compareVersion = nav.compare ? (nav.compare.value || null) : null;
    const groupBy = nav.groupBy ? nav.groupBy.value : "element";
    const scopeMode = nav.scope ? nav.scope.value : "";

    if (!selectedVersion) return;

    const scopeLabel = scopeMode === "owned" ? "Owned only" : (scopeMode === "not-owned" ? "Not owned only" : "All");

    const baseRows = buildRows(selectedVersion, compareVersion, scopeMode);

    renderChips(baseRows, selectedVersion);
    renderTierDist(baseRows, selectedVersion, scopeLabel);

    const rowsAll = buildRows(selectedVersion, compareVersion, "");
    renderOwnedChart(rowsAll);

    renderBreakdown(baseRows, groupBy);
    renderMovers(baseRows, selectedVersion, compareVersion);

    lastRenderedRows = renderTable(baseRows, selectedVersion, compareVersion);
  }

  function initNavSelects() {
    const versions = getAllVersions();
    if (!versions.length) return;

    function fill(select, values, allowEmpty, emptyLabel) {
      if (!select) return;
      select.innerHTML = "";
      if (allowEmpty) {
        const o = document.createElement("option");
        o.value = "";
        o.textContent = emptyLabel || "—";
        select.appendChild(o);
      }
      values.forEach(v => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        select.appendChild(o);
      });
    }

    fill(nav.version, versions, false);
    fill(nav.compare, versions, true, "None");

    const latest = versions[versions.length - 1];
    if (nav.version) nav.version.value = latest;

    const prev = versions.length >= 2 ? versions[versions.length - 2] : "";
    if (nav.compare) nav.compare.value = prev;

    if (nav.groupBy && !nav.groupBy.value) nav.groupBy.value = "element";
  }

  function wireEvents() {
    [nav.version, nav.compare, nav.groupBy, nav.scope].forEach(s => {
      if (!s) return;
      s.addEventListener("change", refresh);
    });

    el.search.addEventListener("input", refresh);
    el.sort.addEventListener("change", refresh);
    el.onlyChanges.addEventListener("change", refresh);

    if (el.filterElement) el.filterElement.addEventListener("change", refresh);
    if (el.filterRole) el.filterRole.addEventListener("change", refresh);
    if (el.filterWeapon) el.filterWeapon.addEventListener("change", refresh);
    if (el.filterRarity) el.filterRarity.addEventListener("change", refresh);

    if (el.btnClearFilters) {
      el.btnClearFilters.addEventListener("click", function () {
        if (el.filterElement) el.filterElement.value = "";
        if (el.filterRole) el.filterRole.value = "";
        if (el.filterWeapon) el.filterWeapon.value = "";
        if (el.filterRarity) el.filterRarity.value = "";
        refresh();
      });
    }

    el.btnCopyTSV.addEventListener("click", async function(){
      await copyToClipboard(rowsToTSV(lastRenderedRows));
    });

    el.btnCopyJSON.addEventListener("click", async function(){
      await copyToClipboard(JSON.stringify(lastRenderedRows, null, 2));
    });
  }

  // start
  loadOwnedCharactersSet().then(set => {
    ownedCharactersSet = set;

    initNavSelects();
    wireEvents();
    refresh();
  });
});
