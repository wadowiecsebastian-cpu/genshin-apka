(function(){
    const NAV_TABS = [
    { href:"home.html",                    text:"Home" },
    { href:"index.html",                   text:"Characters" },
    { href:"today.html",                   text:"Today" },
    { href:"pity.html",                    text:"Pity" },
    { href:"team-planner.html",            text:"Team planner" },
    { href:"imaginarium-theater.html",     text:"Imaginarium Theater" },
    { href:"character.html",               text:"Character" },
    { href:"materials.html",               text:"Materials" },
    { href:"materials-editor.html",        text:"Materials editor" },
    { href:"bosses.html",                  text:"Bosses" },
    { href:"materials-character.html",     text:"Char costs" },
    { href:"planner.html",                 text:"Mat planner" },
    { href:"guide.html",                   text:"Boss guide" },
    { href:"tier-list.html",               text:"Tier list" },
    { href:"tier-analytics.html",          text:"Tier analytics" },
    { href:"tier-history-editor.html",     text:"Tier history editor" },
    { href:"settings.html",                text:"Ustawienia" },
  ];

  const SECTIONS = [
    { id:"appearance",                     title:"Wygląd aplikacji" },
    { id:"typography",                     title:"Typografia i czytelność" },
    { id:"nav",                            title:"Układ i nawigacja" },
    { id:"ui",                             title:"Komponenty UI" },
    { id:"shortcuts",                      title:"Skróty klawiszowe i sterowanie" },
    { id:"data",                           title:"Dane i pamięć (IndexedDB)" },
    { id:"modules",                        title:"Ustawienia modułów" },
    { id:"notifications",                  title:"Powiadomienia i komunikaty" },
    { id:"performance",                    title:"Wydajność" },
    { id:"advanced",                       title:"Zaawansowane / Debug" },
    { id:"profiles",                       title:"Profile ustawień" },
  ];

  const THEME_PRESETS = {
    "Default Dark": {
      mode: "dark",
      colors: {
        accent: "#3252ff",
        bg: "#101014",
        card: "#171a20",
        text: "#dddddd",
        muted: "rgba(221,221,221,.72)"
      }
    },
    "AMOLED": {
      mode: "dark",
      colors: {
        accent: "#4d7cff",
        bg: "#000000",
        card: "#090909",
        text: "#f2f2f2",
        muted: "rgba(242,242,242,.72)"
      }
    },
    "Light Clean": {
      mode: "light",
      colors: {
        accent: "#2f62ff",
        bg: "#f6f7fb",
        card: "#ffffff",
        text: "#10141f",
        muted: "rgba(16,20,31,.66)"
      }
    },
    "Minimal Gray": {
      mode: "dark",
      colors: {
        accent: "#8aa0b8",
        bg: "#14161a",
        card: "#1c2026",
        text: "#e3e7ec",
        muted: "rgba(227,231,236,.66)"
      }
    },
    "Synthwave": {
      mode: "dark",
      colors: {
        accent: "#ff4fd8",
        bg: "#12081f",
        card: "#201133",
        text: "#f7ebff",
        muted: "rgba(247,235,255,.70)"
      }
    }
  };

  let original = null;
  let draft = null;

  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

  function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

  function activeSectionId(){
    const btn = document.querySelector("#settingsSections button.active");
    return btn ? btn.getAttribute("data-sec") : "appearance";
  }

  function rerenderCardsKeepSection(){
    const sectionId = activeSectionId();
    renderCards();
    showSection(sectionId);
  }

  function applyPresetToDraft(presetName){
    const preset = THEME_PRESETS[presetName] || THEME_PRESETS["Default Dark"];
    draft.theme = draft.theme || {};
    draft.design = draft.design || {};
    draft.design.colors = draft.design.colors || {};

    draft.theme.preset = presetName;
    draft.theme.mode = preset.mode;
    draft.design.colors = Object.assign({}, draft.design.colors, preset.colors);

    window.AppSettings.apply(draft);
  }

  async function refreshProfilesDraft(){
    const list = await window.AppSettings.listProfiles();
    draft.profiles = draft.profiles || {};
    draft.profiles.list = list;
    if (!list.includes(draft.profiles.active)) draft.profiles.active = list[0] || "Default";
  }

  function currentProfileName(){
    const select = document.getElementById("profileSelect");
    return select ? String(select.value || "").trim() : String((draft.profiles && draft.profiles.active) || "Default");
  }

  function renderLeft(){
    const box = $("settingsSections");
    box.innerHTML = SECTIONS.map((s,i)=>(
      `<button type="button" data-sec="${esc(s.id)}" class="${i===0?"active":""}">${esc(s.title)}</button>`
    )).join("");

    box.onclick = (e)=>{
      const btn = e.target.closest("button[data-sec]");
      if (!btn) return;
      const id = btn.getAttribute("data-sec");
      [...box.querySelectorAll("button")].forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      showSection(id);
    };
  }

  function showSection(id){
    const cards = $("settingsCards");
    [...cards.querySelectorAll("[data-section]")].forEach(el=>{
      el.style.display = (el.getAttribute("data-section") === id) ? "" : "none";
    });
  }

  function setDraft(path, value){
    const parts = path.split(".");
    let cur = draft;
    for (let i=0;i<parts.length-1;i++){
      const k = parts[i];
      if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
      cur = cur[k];
    }
    cur[parts[parts.length-1]] = value;

    // Live preview
    window.AppSettings.apply(draft);
  }

  function renderCards(){
    const cards = $("settingsCards");
    cards.innerHTML = [
      cardAppearance(),
      cardTypography(),
      cardNav(),
      cardUI(),
      cardShortcuts(),
      cardData(),
      cardModules(),
      cardNotifications(),
      cardPerformance(),
      cardAdvanced(),
      cardProfiles()
    ].join("");

    // default: pokaż pierwszą sekcję
    showSection("appearance");

    bindNavControls();

    // bind inputs (delegacja)
      cards.onchange = async (e)=>{
      const el = e.target;
      const path = el.getAttribute("data-path");
      if (!path) return;

      let val;
      if (el.type === "checkbox") val = el.checked ? "on" : "off";
      else val = el.value;

      if (el.getAttribute("data-type") === "number"){
        val = Number(val);
        if (Number.isNaN(val)) val = 0;
      }

      if (path === "theme.preset"){
        applyPresetToDraft(val);
        rerenderCardsKeepSection();
        return;
      }

      setDraft(path, val);
    };

    cards.onclick = async (e)=>{
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");

      if (action === "export-json"){
        const data = await window.AppSettings.exportAllData();
        downloadJson("genshin-app-export.json", data);
        window.AppSettings.notify("Wyeksportowano dane aplikacji.", { type:"success", level:"minimal" });
        return;
      }

      if (action === "import-merge" || action === "import-overwrite"){
        pickJsonFile(async (payload)=>{
          await window.AppSettings.importAllData(payload, action === "import-merge" ? "merge" : "overwrite");
          await boot();
          window.AppSettings.notify("Import zakończony.", { type:"success", level:"normal" });
        });
        return;
      }

      if (action === "snapshot-create"){
        const label = prompt("Nazwa snapshotu:", "Backup " + new Date().toLocaleString());
        if (!label) return;
        await window.AppSettings.createSnapshot(label);
        await refreshSnapshots();
        await refreshDataStatus();
        window.AppSettings.notify("Utworzono snapshot danych.", { type:"success", level:"normal" });
        return;
      }

      if (action === "snapshot-restore"){
        const id = btn.getAttribute("data-id");
        if (!id) return;
        const ok = confirm("Przywrócić snapshot? (overwrite całej bazy)");
        if (!ok) return;
        await window.AppSettings.restoreSnapshot(id, "overwrite");
        await boot();
        window.AppSettings.notify("Przywrócono snapshot.", { type:"success", level:"normal" });
        return;
      }

      if (action === "snapshot-delete"){
        const id = btn.getAttribute("data-id");
        if (!id) return;
        const ok = confirm("Usunąć snapshot?");
        if (!ok) return;
        await window.AppSettings.deleteSnapshot(id);
        await refreshSnapshots();
        await refreshDataStatus();
        window.AppSettings.notify("Usunięto snapshot.", { type:"success", level:"minimal" });
        return;
      }

      if (action === "nav-clear-remembered"){
        if (window.IDB && IDB.kvDel){
          await IDB.kvDel("app_lastPage_v1").catch(()=>{});
          await IDB.kvDel("dashboard_recentPages").catch(()=>{});
          await IDB.kvDel("dashboard_recentCharacters").catch(()=>{});
        }
        window.AppSettings.notify("Wyczyszczono zapamiętane widoki.", { type:"success", level:"minimal" });
        return;
      }

      if (action === "notify-demo"){
        window.AppSettings.notify("To jest przykładowy komunikat ustawień.", { type:"success", level:"normal" });
        window.AppSettings.notify("Ten komunikat zobaczysz tylko przy poziomie Debug.", { type:"info", level:"debug" });
        return;
      }

      if (action === "profile-apply"){
        const name = currentProfileName();
        const profile = await window.AppSettings.getProfile(name);
        if (!profile){
          window.AppSettings.notify("Nie znaleziono wskazanego profilu.", { type:"error", level:"minimal" });
          return;
        }
        draft = deepClone(profile);
        await refreshProfilesDraft();
        window.AppSettings.apply(draft);
        rerenderCardsKeepSection();
        window.AppSettings.notify(`Wczytano profil: ${name}.`, { type:"success", level:"normal" });
        return;
      }

      if (action === "profile-save-current"){
        const name = currentProfileName();
        draft.profiles = draft.profiles || {};
        draft.profiles.active = name;
        await window.AppSettings.saveProfile(name, draft);
        await refreshProfilesDraft();
        rerenderCardsKeepSection();
        window.AppSettings.notify(`Zapisano profil: ${name}.`, { type:"success", level:"normal" });
        return;
      }

      if (action === "profile-save-as"){
        const input = document.getElementById("profileName");
        const name = input ? String(input.value || "").trim() : "";
        if (!name){
          window.AppSettings.notify("Podaj nazwę nowego profilu.", { type:"error", level:"minimal" });
          return;
        }
        draft.profiles = draft.profiles || {};
        draft.profiles.active = name;
        await window.AppSettings.saveProfile(name, draft);
        await refreshProfilesDraft();
        rerenderCardsKeepSection();
        window.AppSettings.notify(`Utworzono profil: ${name}.`, { type:"success", level:"normal" });
        return;
      }

      if (action === "profile-delete"){
        const name = currentProfileName();
        if (name === "Default"){
          window.AppSettings.notify("Profil Default jest chroniony.", { type:"error", level:"minimal" });
          return;
        }
        const ok = confirm(`Usunąć profil "${name}"?`);
        if (!ok) return;
        await window.AppSettings.deleteProfile(name);
        const fallback = await window.AppSettings.getProfile("Default") || await window.AppSettings.load();
        draft = deepClone(fallback);
        await refreshProfilesDraft();
        window.AppSettings.apply(draft);
        rerenderCardsKeepSection();
        window.AppSettings.notify(`Usunięto profil: ${name}.`, { type:"success", level:"normal" });
        return;
      }

      if (action === "profile-export"){
        const name = currentProfileName();
        downloadJson(`genshin-settings-profile-${name}.json`, {
          name,
          settings: draft
        });
        window.AppSettings.notify(`Wyeksportowano profil: ${name}.`, { type:"success", level:"minimal" });
        return;
      }

      if (action === "profile-import"){
        pickJsonFile(async (payload)=>{
          if (!payload || !payload.name || !payload.settings){
            window.AppSettings.notify("Plik profilu ma nieprawidłowy format.", { type:"error", level:"minimal" });
            return;
          }

          await window.AppSettings.saveProfile(String(payload.name), payload.settings);
          const imported = await window.AppSettings.getProfile(String(payload.name));
          draft = deepClone(imported);
          await refreshProfilesDraft();
          window.AppSettings.apply(draft);
          rerenderCardsKeepSection();
          window.AppSettings.notify(`Zaimportowano profil: ${payload.name}.`, { type:"success", level:"normal" });
        });
      }
    };

    cards.addEventListener("click", async (e)=>{
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");

      if (action === "export-json"){
        const data = await window.AppSettings.exportAllData();
        downloadJson("genshin-app-export.json", data);
      }
      if (action === "import-merge" || action === "import-overwrite"){
        pickJsonFile(async (payload)=>{
          await window.AppSettings.importAllData(payload, action === "import-merge" ? "merge" : "overwrite");
          // przeładuj settings i odśwież UI
          await boot();
          alert("Import zakończony.");
        });
      }
      if (action === "snapshot-create"){
        const label = prompt("Nazwa snapshotu:", "Backup " + new Date().toLocaleString());
        if (!label) return;
        await window.AppSettings.createSnapshot(label);
        await refreshSnapshots();
      }
      if (action === "snapshot-restore"){
        const id = btn.getAttribute("data-id");
        if (!id) return;
        const ok = confirm("Przywrócić snapshot? (overwrite całej bazy)");
        if (!ok) return;
        await window.AppSettings.restoreSnapshot(id, "overwrite");
        await boot();
      }
      if (action === "snapshot-delete"){
        const id = btn.getAttribute("data-id");
        if (!id) return;
        const ok = confirm("Usunąć snapshot?");
        if (!ok) return;
        await window.AppSettings.deleteSnapshot(id);
        await refreshSnapshots();
      }
      if (action === "nav-clear-remembered"){
        if (window.IDB && IDB.kvDel){
          await IDB.kvDel("app_lastPage_v1").catch(()=>{});
          await IDB.kvDel("dashboard_recentPages").catch(()=>{});
          await IDB.kvDel("dashboard_recentCharacters").catch(()=>{});
        }
        alert("Wyczyszczono zapamiętane widoki.");
      }
    });
  }

  function cardAppearance(){
    const s = draft;
    return `
<div class="set-card" data-section="appearance">
  <h3>Wygląd aplikacji (Theme & Design System)</h3>
  <div class="set-grid">
    <div class="set-row">
      <label>Motyw</label>
      <select data-path="theme.mode">
        <option value="auto" ${s.theme.mode==="auto"?"selected":""}>Auto (system)</option>
        <option value="light" ${s.theme.mode==="light"?"selected":""}>Jasny</option>
        <option value="dark" ${s.theme.mode==="dark"?"selected":""}>Ciemny</option>
      </select>
      <div class="set-hint">Domyślnie: auto = brak zmian zachowania.</div>
    </div>

    <div class="set-row">
      <label>Preset</label>
      <select data-path="theme.preset">
        <option ${s.theme.preset==="Default Dark"?"selected":""}>Default Dark</option>
        <option ${s.theme.preset==="AMOLED"?"selected":""}>AMOLED</option>
        <option ${s.theme.preset==="Light Clean"?"selected":""}>Light Clean</option>
        <option ${s.theme.preset==="Minimal Gray"?"selected":""}>Minimal Gray</option>
        <option ${s.theme.preset==="Synthwave"?"selected":""}>Synthwave</option>
      </select>
      <div class="set-hint">W tej wersji pełny preset działa dla AMOLED; resztę dopniemy mapowaniem kolorów.</div>
    </div>

    <div class="set-row">
      <label>Kontrast</label>
      <input data-path="design.contrast" data-type="number" type="number" step="0.05" min="0.8" max="1.4" value="${s.design.contrast}">
    </div>

    <div class="set-row">
      <label>Intensywność cieni</label>
      <input data-path="design.shadow" data-type="number" type="number" step="0.1" min="0" max="1" value="${s.design.shadow}">
    </div>

    <div class="set-row">
      <label>Zaokrąglenia (px)</label>
      <input data-path="design.radius" data-type="number" type="number" step="1" min="0" max="30" value="${s.design.radius}">
    </div>

    <div class="set-row">
      <label>Accent</label>
      <input data-path="design.colors.accent" type="color" value="${s.design.colors.accent}">
    </div>

    <div class="set-row">
      <label>Tło</label>
      <input data-path="design.colors.bg" type="color" value="${s.design.colors.bg}">
    </div>

    <div class="set-row">
      <label>Karty</label>
      <input data-path="design.colors.card" type="color" value="${s.design.colors.card}">
    </div>

    <div class="set-row">
      <label>Tekst</label>
      <input data-path="design.colors.text" type="color" value="${s.design.colors.text}">
    </div>

    <div class="set-row">
      <label>Obramowania kart</label>
      <select data-path="design.cards.borders">
        <option value="on" ${s.design.cards.borders==="on"?"selected":""}>On</option>
        <option value="off" ${s.design.cards.borders==="off"?"selected":""}>Off</option>
      </select>
    </div>

    <div class="set-row">
      <label>Gęstość kart</label>
      <select data-path="design.cards.density">
        <option value="compact" ${s.design.cards.density==="compact"?"selected":""}>Kompaktowe</option>
        <option value="normal" ${s.design.cards.density==="normal"?"selected":""}>Normalne</option>
        <option value="large" ${s.design.cards.density==="large"?"selected":""}>Duże</option>
      </select>
    </div>
  </div>
</div>`;
  }

  function cardTypography(){
    const s = draft;
    return `
<div class="set-card" data-section="typography">
  <h3>Typografia i czytelność</h3>
  <div class="set-grid">
    <div class="set-row">
      <label>Skala UI</label>
      <input data-path="typography.uiScale" data-type="number" type="number" step="0.05" min="0.8" max="1.4" value="${s.typography.uiScale}">
    </div>
    <div class="set-row">
      <label>Font</label>
      <select data-path="typography.font">
        <option value="system" ${s.typography.font==="system"?"selected":""}>Systemowy</option>
        <option value="Inter" ${s.typography.font==="Inter"?"selected":""}>Inter</option>
        <option value="Roboto" ${s.typography.font==="Roboto"?"selected":""}>Roboto</option>
      </select>
      <div class="set-hint">Jeśli nie masz fontów lokalnie, system użyje fallback.</div>
    </div>
    <div class="set-row">
      <label>Line-height</label>
      <input data-path="typography.lineHeight" data-type="number" type="number" step="0.05" min="1.1" max="1.8" value="${s.typography.lineHeight}">
    </div>
    <div class="set-row">
      <label>Kompaktowe odstępy</label>
      <select data-path="typography.compactSpacing">
        <option value="off" ${s.typography.compactSpacing==="off"?"selected":""}>Off</option>
        <option value="on" ${s.typography.compactSpacing==="on"?"selected":""}>On</option>
      </select>
    </div>
  </div>
</div>`;
  }

    function cardNav(){
    const s = draft;

    const hidden = Array.isArray(s.nav.hiddenTabs) ? s.nav.hiddenTabs.slice() : [];
    const order = Array.isArray(s.nav.order) ? s.nav.order.slice() : [];

    // zbuduj listę wg order (a resztę dopnij na koniec)
    const idx = {};
    order.forEach((h,i)=> idx[String(h).toLowerCase()] = i);

    const list = NAV_TABS.slice().sort((a,b)=>{
      const ia = (idx[String(a.href).toLowerCase()] != null) ? idx[String(a.href).toLowerCase()] : 9999;
      const ib = (idx[String(b.href).toLowerCase()] != null) ? idx[String(b.href).toLowerCase()] : 9999;
      if (ia !== ib) return ia - ib;
      return a.text.localeCompare(b.text);
    });

    function isHidden(href){
      const f = String(href).toLowerCase();
      return hidden.map(x=>String(x).toLowerCase()).includes(f);
    }

    const itemsHtml = list.map(t => `
      <div class="nav-item" draggable="true" data-href="${esc(t.href)}">
        <span class="drag-handle" title="Przeciągnij">⠿</span>
        <label class="nav-check">
          <input type="checkbox" data-action="nav-toggle-visible" data-href="${esc(t.href)}" ${isHidden(t.href) ? "" : "checked"}>
          <span>${esc(t.text)}</span>
        </label>
      </div>
    `).join("");

    return `
<div class="set-card" data-section="nav">
  <h3>Układ i nawigacja</h3>

  <div class="set-grid">
    <div class="set-row">
      <label>Sticky nav</label>
      <select data-path="nav.sticky">
        <option value="on" ${s.nav.sticky==="on"?"selected":""}>On</option>
        <option value="off" ${s.nav.sticky==="off"?"selected":""}>Off</option>
      </select>
    </div>

    <div class="set-row">
      <label>Zwijanie na małych ekranach</label>
      <select data-path="nav.collapseMobile">
        <option value="on" ${s.nav.collapseMobile==="on"?"selected":""}>On</option>
        <option value="off" ${s.nav.collapseMobile==="off"?"selected":""}>Off</option>
      </select>
    </div>

    <div class="set-row">
      <label>Ikony przy nazwach zakładek</label>
      <select data-path="nav.icons">
        <option value="off" ${s.nav.icons==="off"?"selected":""}>Off</option>
        <option value="on" ${s.nav.icons==="on"?"selected":""}>On</option>
      </select>
    </div>

    <div class="set-row">
      <label>Zapamiętywanie widoków</label>
      <select data-path="nav.rememberViews">
        <option value="on" ${s.nav.rememberViews==="on"?"selected":""}>On</option>
        <option value="off" ${s.nav.rememberViews==="off"?"selected":""}>Off</option>
      </select>
    </div>

    <div class="set-row">
      <label>Strona startowa</label>
      <select data-path="nav.startPage">
        <option value="home.html" ${s.nav.startPage==="home.html"?"selected":""}>Home</option>
        <option value="index.html" ${s.nav.startPage==="index.html"?"selected":""}>Characters</option>
        <option value="today.html" ${s.nav.startPage==="today.html"?"selected":""}>Today</option>
        <option value="last" ${s.nav.startPage==="last"?"selected":""}>Ostatnio używana</option>
      </select>
      <div class="set-hint">
        Działa tylko przy starcie aplikacji (index/home). Nie powoduje pętli.
      </div>
    </div>
  </div>

  <div style="margin-top:12px;">
    <button class="btn" type="button" data-action="nav-clear-remembered">Wyczyść zapamiętane widoki</button>
    <div class="set-hint" style="margin-top:6px;">
      Czyści: ostatnio używaną stronę (dla startPage=last) + listy „ostatnio używane” na Home.
    </div>
  </div>

  <div style="margin-top:14px;">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:700;">Widoczność i kolejność zakładek</div>
      <div class="set-hint">Drag & drop zmienia kolejność. Checkbox ukrywa/pokazuje.</div>
    </div>

    <div id="navList" class="nav-list" style="margin-top:10px;">
      ${itemsHtml}
    </div>
  </div>
</div>`;
  }

    function bindNavControls(){
    const cards = $("settingsCards");
    const navList = document.getElementById("navList");
    if (!cards || !navList) return;

    // checkbox: widoczność
    cards.addEventListener("click", async (e)=>{
      const t = e.target;
      if (!(t && t.matches && t.matches("input[data-action='nav-toggle-visible']"))) return;

      const href = t.getAttribute("data-href");
      if (!href) return;

      const hidden = Array.isArray(draft.nav.hiddenTabs) ? draft.nav.hiddenTabs.slice() : [];
      const f = String(href).toLowerCase();

      if (t.checked){
        // pokaz → usuń z hidden
        const next = hidden.filter(x => String(x).toLowerCase() !== f);
        setDraft("nav.hiddenTabs", next);
      } else {
        // ukryj → dodaj do hidden (ale nie pozwalaj ukryć settings)
        if (f === "settings.html"){
          t.checked = true;
          return;
        }
        hidden.push(href);
        setDraft("nav.hiddenTabs", hidden);
      }
    }, { capture:true });

    // drag & drop: kolejność
    let dragEl = null;

    navList.addEventListener("dragstart", (e)=>{
      const item = e.target.closest(".nav-item");
      if (!item) return;
      dragEl = item;
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try{ e.dataTransfer.setData("text/plain", item.getAttribute("data-href") || ""); }catch(_){}
    });

    navList.addEventListener("dragend", ()=>{
      if (dragEl) dragEl.classList.remove("dragging");
      dragEl = null;

      // zapis kolejności do settings.nav.order
      const items = [...navList.querySelectorAll(".nav-item[data-href]")];
      const order = items.map(x => x.getAttribute("data-href")).filter(Boolean);
      setDraft("nav.order", order);
    });

    navList.addEventListener("dragover", (e)=>{
      e.preventDefault();
      const over = e.target.closest(".nav-item");
      if (!over || !dragEl || over === dragEl) return;

      const rect = over.getBoundingClientRect();
      const after = (e.clientY - rect.top) > (rect.height / 2);
      if (after){
        over.after(dragEl);
      } else {
        over.before(dragEl);
      }
    });
  }

  function cardUI(){
    const s = draft;
    return `
<div class="set-card" data-section="ui">
  <h3>Komponenty UI</h3>
  <div class="set-grid">
    <div class="set-row">
      <label>Animacje</label>
      <select data-path="ui.motion.level">
        <option value="full" ${s.ui.motion.level==="full"?"selected":""}>Pełne</option>
        <option value="limited" ${s.ui.motion.level==="limited"?"selected":""}>Ograniczone</option>
        <option value="off" ${s.ui.motion.level==="off"?"selected":""}>Wyłączone</option>
      </select>
    </div>

    <div class="set-row">
      <label>Reduce motion</label>
      <select data-path="ui.motion.reduce">
        <option value="off" ${s.ui.motion.reduce==="off"?"selected":""}>Off</option>
        <option value="on" ${s.ui.motion.reduce==="on"?"selected":""}>On</option>
      </select>
    </div>

    <div class="set-row">
      <label>Tooltipy</label>
      <select data-path="ui.tooltips.enabled">
        <option value="on" ${s.ui.tooltips.enabled==="on"?"selected":""}>On</option>
        <option value="off" ${s.ui.tooltips.enabled==="off"?"selected":""}>Off</option>
      </select>
    </div>

    <div class="set-row">
      <label>Delay tooltip (ms)</label>
      <input data-path="ui.tooltips.delayMs" data-type="number" type="number" step="50" min="0" max="2000" value="${s.ui.tooltips.delayMs}">
    </div>

    <div class="set-row">
      <label>Tryb tooltip</label>
      <select data-path="ui.tooltips.mode">
        <option value="near" ${s.ui.tooltips.mode==="near"?"selected":""}>Przy elemencie</option>
        <option value="cursor" ${s.ui.tooltips.mode==="cursor"?"selected":""}>Pod kursorem</option>
      </select>
    </div>

    <div class="set-row">
      <label>Rozmiar portretów (px)</label>
      <input data-path="ui.images.portraitSize" data-type="number" type="number" step="1" min="32" max="140" value="${s.ui.images.portraitSize}">
    </div>
  </div>
</div>`;
  }

  function cardShortcuts(){
    const s = draft;
    return `
<div class="set-card" data-section="shortcuts">
  <h3>Skróty klawiszowe i sterowanie</h3>
  <div class="set-grid">
    <div class="set-row">
      <label>Skróty globalnie</label>
      <select data-path="shortcuts.enabled">
        <option value="on" ${s.shortcuts.enabled==="on"?"selected":""}>On</option>
        <option value="off" ${s.shortcuts.enabled==="off"?"selected":""}>Off</option>
      </select>
    </div>
    <div class="set-row">
      <label>Smooth scroll</label>
      <select data-path="shortcuts.smoothScroll">
        <option value="on" ${s.shortcuts.smoothScroll==="on"?"selected":""}>On</option>
        <option value="off" ${s.shortcuts.smoothScroll==="off"?"selected":""}>Off</option>
      </select>
    </div>
    <div class="set-row">
      <label>Przycisk „do góry”</label>
      <select data-path="shortcuts.backToTop">
        <option value="off" ${s.shortcuts.backToTop==="off"?"selected":""}>Off</option>
        <option value="on" ${s.shortcuts.backToTop==="on"?"selected":""}>On</option>
      </select>
    </div>
  </div>
  <div class="set-hint" style="margin-top:10px;">
    Edytowalną mapę skrótów dopniemy w kolejnej iteracji (żeby nie naruszyć istniejących skrótów modułów).
  </div>
</div>`;
  }

  function cardData(){
    return `
<div class="set-card" data-section="data">
  <h3>Dane i pamięć (IndexedDB)</h3>
  <div class="set-hint" id="dataStatus">Ładowanie statusu…</div>

  <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
    <button class="btn" type="button" data-action="export-json">Eksport danych (JSON)</button>
    <button class="btn" type="button" data-action="import-merge">Import (merge)</button>
    <button class="btn" type="button" data-action="import-overwrite">Import (overwrite)</button>
  </div>

  <div style="margin-top:12px;">
    <button class="btn" type="button" data-action="snapshot-create">Utwórz snapshot</button>
  </div>

  <div id="snapList" style="margin-top:10px;"></div>
</div>`;
  }

    function cardModules(){
    const s = draft;
    const mod = s.modules || {};
    const t = mod.today || {};
    const tp = mod.teamPlanner || {};

    return `
<div class="set-card" data-section="modules">
  <h3>Ustawienia modułów aplikacji</h3>

  <div class="set-subtitle" style="margin-top:6px;">Today</div>
  <div class="set-grid">
    <div class="set-row">
      <label>Pokazuj sekcję „Optional farm”</label>
      <select data-path="modules.today.showOptional">
        <option value="on" ${t.showOptional==="on"?"selected":""}>On</option>
        <option value="off" ${t.showOptional==="off"?"selected":""}>Off</option>
      </select>
    </div>
    <div class="set-row">
      <label>Limit zadań w „High value” (0 = bez limitu)</label>
      <input data-path="modules.today.highLimit" data-type="number" type="number" step="1" min="0" max="50" value="${Number(t.highLimit||0)}">
    </div>
  </div>

  <div class="set-subtitle" style="margin-top:14px;">Team Planner</div>
  <div class="set-grid">
    <div class="set-row">
      <label>Domyślnie „Tylko posiadane”</label>
      <select data-path="modules.teamPlanner.ownedOnlyDefault">
        <option value="off" ${tp.ownedOnlyDefault==="off"?"selected":""}>Off</option>
        <option value="on" ${tp.ownedOnlyDefault==="on"?"selected":""}>On</option>
      </select>
    </div>
    <div class="set-row">
      <label>Domyślna zakładka</label>
      <select data-path="modules.teamPlanner.defaultTab">
        <option value="owned" ${tp.defaultTab==="owned"?"selected":""}>Owned</option>
        <option value="imaginarium" ${tp.defaultTab==="imaginarium"?"selected":""}>Imaginarium</option>
      </select>
    </div>
  </div>

  <div class="set-hint" style="margin-top:10px;">
    Uwaga: ustawienia Team Planner nie nadpisują ViewMemory — jeśli masz zapamiętany widok, on ma pierwszeństwo.
  </div>
</div>`;
  }

  function cardNotifications(){
    const s = draft;
    return `
<div class="set-card" data-section="notifications">
  <h3>Powiadomienia i komunikaty</h3>
  <div class="set-grid">
    <div class="set-row">
      <label>Komunikaty</label>
      <select data-path="notifications.enabled">
        <option value="on" ${s.notifications.enabled==="on"?"selected":""}>On</option>
        <option value="off" ${s.notifications.enabled==="off"?"selected":""}>Off</option>
      </select>
    </div>
    <div class="set-row">
      <label>Szczegółowość</label>
      <select data-path="notifications.verbosity">
        <option value="minimal" ${s.notifications.verbosity==="minimal"?"selected":""}>Minimal</option>
        <option value="normal" ${s.notifications.verbosity==="normal"?"selected":""}>Normal</option>
        <option value="debug" ${s.notifications.verbosity==="debug"?"selected":""}>Debug</option>
      </select>
    </div>
    <div class="set-row">
      <label>Auto-close toast (ms)</label>
      <input data-path="notifications.autoCloseMs" data-type="number" type="number" step="250" min="0" max="30000" value="${s.notifications.autoCloseMs}">
    </div>
  </div>

  <div style="margin-top:12px;">
    <button class="btn" type="button" data-action="notify-demo">Pokaż przykładowy toast</button>
  </div>

</div>`;
  }

  function cardPerformance(){
    const s = draft;
    return `
<div class="set-card" data-section="performance">
  <h3>Wydajność</h3>
  <div class="set-grid">
    <div class="set-row">
      <label>Tryb wydajności</label>
      <select data-path="performance.mode">
        <option value="off" ${s.performance.mode==="off"?"selected":""}>Off</option>
        <option value="on" ${s.performance.mode==="on"?"selected":""}>On</option>
      </select>
    </div>
    <div class="set-row">
      <label>Paginacja dużych list</label>
      <select data-path="performance.pagination">
        <option value="on" ${s.performance.pagination==="on"?"selected":""}>On</option>
        <option value="off" ${s.performance.pagination==="off"?"selected":""}>Off</option>
      </select>
    </div>
  </div>
  <div class="set-hint" style="margin-top:10px;">
    Panel diagnostyczny dopniemy jako opcjonalny overlay (czas renderu / ilość elementów).
  </div>
</div>`;
  }

  function cardAdvanced(){
    const s = draft;
    return `
<div class="set-card" data-section="advanced">
  <h3>Zaawansowane / Debug</h3>
  <div class="set-grid">
    <div class="set-row">
      <label>Tryb bezpieczny (core-only)</label>
      <select data-path="advanced.safeMode">
        <option value="off" ${s.advanced.safeMode==="off"?"selected":""}>Off</option>
        <option value="on" ${s.advanced.safeMode==="on"?"selected":""}>On</option>
      </select>
    </div>
    <div class="set-row">
      <label>Pokazuj identyfikatory danych</label>
      <select data-path="advanced.showIds">
        <option value="off" ${s.advanced.showIds==="off"?"selected":""}>Off</option>
        <option value="on" ${s.advanced.showIds==="on"?"selected":""}>On</option>
      </select>
    </div>
  </div>
  <div class="set-hint" style="margin-top:10px;">
    Sekcja ukryta „power-user” – w tej wersji UI jest jawne, ale funkcje debug dopniemy bezpiecznie (bez wpływu na zwykłe użycie).
  </div>
</div>`;
  }

  function cardProfiles(){
    const list = (draft.profiles && Array.isArray(draft.profiles.list) && draft.profiles.list.length)
      ? draft.profiles.list
      : ["Default"];
    const active = (draft.profiles && draft.profiles.active && list.includes(draft.profiles.active))
      ? draft.profiles.active
      : list[0];

    return `
      <div class="set-card" data-section="profiles">
        <h3>Profile ustawień</h3>

        <div class="profile-grid">
          <div class="set-row">
            <label>Aktywny profil</label>
            <select id="profileSelect">
              ${list.map(name => `<option value="${esc(name)}" ${name===active ? "selected" : ""}>${esc(name)}</option>`).join("")}
            </select>
          </div>

          <div class="set-row">
            <label>Nowa nazwa profilu</label>
            <input id="profileName" type="text" placeholder="Np. Mobile Minimal / Synthwave" />
          </div>
        </div>

        <div class="profile-actions">
          <button class="btn primary" type="button" data-action="profile-apply">Wczytaj profil</button>
          <button class="btn" type="button" data-action="profile-save-current">Zapisz do wybranego</button>
          <button class="btn" type="button" data-action="profile-save-as">Zapisz jako nowy</button>
          <button class="btn" type="button" data-action="profile-export">Eksport profilu</button>
          <button class="btn" type="button" data-action="profile-import">Import profilu</button>
          <button class="btn danger" type="button" data-action="profile-delete">Usuń profil</button>
        </div>

        <div class="set-hint profile-note">
          Profile zapisują wyłącznie ustawienia UI i zachowania aplikacji. Dane z IndexedDB zostają w zakładce „Dane i pamięć”.
        </div>
      </div>`;
  }

  function downloadJson(filename, obj){
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function pickJsonFile(cb){
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try{
        const text = await file.text();
        const payload = JSON.parse(text);
        cb(payload);
      }catch(e){
        window.AppSettings.notify("Nie udało się odczytać pliku JSON.", { type:"error", level:"minimal" });
      }
    };
    input.click();
  }

  async function refreshDataStatus(){
    const migrated = (window.IDB && IDB.kvGet) ? await IDB.kvGet("__migrated_from_localstorage_v1") : null;
    const lastSaved = (window.IDB && IDB.kvGet) ? await IDB.kvGet(window.AppSettings.keys.KEY_LAST_SAVED) : null;

    // zlicz rekordy (bez ciężkich iteracji na wielkich store’ach – i tak masz małe)
    let counts = {};
    const stores = ["inventory","progress","meta","todayTasks","kv"];
    for (let i=0;i<stores.length;i++){
      const st = stores[i];
      try{
        const arr = await IDB.all(st);
        counts[st] = Array.isArray(arr) ? arr.length : 0;
      }catch(e){
        counts[st] = "?";
      }
    }

    $("dataStatus").innerHTML =
      `Migracja z localStorage: <b>${migrated ? "TAK" : "NIE / brak flagi"}</b><br>`+
      `Ostatni zapis settings: <b>${lastSaved ? new Date(lastSaved).toLocaleString() : "brak"}</b><br>`+
      `Rekordy: <code>${esc(JSON.stringify(counts))}</code>`;
  }

  async function refreshSnapshots(){
    const list = await window.AppSettings.listSnapshots();
    const box = $("snapList");
    if (!list.length){
      box.innerHTML = `<div class="set-hint">Brak snapshotów.</div>`;
      return;
    }
    box.innerHTML = list.map(x=>(
      `<div style="display:flex; gap:8px; align-items:center; justify-content:space-between; padding:8px 0; border-top:1px solid rgba(255,255,255,.08);">
        <div>
          <div><b>${esc(x.label)}</b></div>
          <div class="set-hint">${new Date(x.ts).toLocaleString()} (id: ${esc(x.id)})</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn" type="button" data-action="snapshot-restore" data-id="${esc(x.id)}">Przywróć</button>
          <button class="btn danger" type="button" data-action="snapshot-delete" data-id="${esc(x.id)}">Usuń</button>
        </div>
      </div>`
    )).join("");
  }

  async function boot(){
    original = await window.AppSettings.load();
    draft = deepClone(original);
    await refreshProfilesDraft();
    renderLeft();
    renderCards();
    await refreshDataStatus();
    await refreshSnapshots();
  }

  document.addEventListener("DOMContentLoaded", async ()=>{
    await boot();

    $("btnApply").addEventListener("click", async ()=>{
      await window.AppSettings.save(draft);
      original = deepClone(draft);
      await refreshProfilesDraft();
      rerenderCardsKeepSection();
      window.AppSettings.notify("Zastosowano ustawienia.", { type:"success", level:"normal" });
    });

    $("btnUndo").addEventListener("click", async ()=>{
      draft = deepClone(original);
      window.AppSettings.apply(draft);
      await refreshProfilesDraft();
      rerenderCardsKeepSection();
      window.AppSettings.notify("Cofnięto zmiany do ostatnio zapisanych.", { type:"success", level:"normal" });
    });

    $("btnReset").addEventListener("click", async ()=>{
      const ok = confirm("Przywrócić domyślne ustawienia UI?");
      if (!ok) return;
      draft = deepClone(window.AppSettings.DEFAULTS);
      window.AppSettings.apply(draft);
      await refreshProfilesDraft();
      rerenderCardsKeepSection();
    });
  });
})();
