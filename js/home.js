// home.js (Dashboard)
// Założenia:
// - Nie dublujemy logiki today.html, tylko robimy mini podgląd z danych w IDB.
// - Wszystko działa nawet, gdy brak danych (placeholdery).

(function(){
  "use strict";

  const RECENT_PAGES_KEY = "dashboard_recentPages";       // zapisuje global-nav.js
  const RECENT_CHARS_KEY = "dashboard_recentCharacters";  // zapisuje global-nav.js
  const MAX_RECENT = 8;

  const DAY_NAMES_PL = ["Niedziela","Poniedziałek","Wtorek","Środa","Czwartek","Piątek","Sobota"];

  function el(tag, cls, text){
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function safeJsonParse(raw, fallback){
    try { return JSON.parse(raw); } catch(e){ return fallback; }
  }

  function pad2(n){ return String(n).padStart(2,"0"); }
  function todayDateStr(){
    const d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth()+1) + "-" + pad2(d.getDate());
  }
  function weekdayPL(){
    const d = new Date();
    return DAY_NAMES_PL[d.getDay()] || "";
  }

  function linkBtn(href, label, primary){
    const a = document.createElement("a");
    a.href = href;
    a.className = "home-btn" + (primary ? " home-btn--primary" : "");
    a.textContent = label;
    return a;
  }

  function buildHero(){
    const root = document.getElementById("home-hero");
    if (!root) return;

    root.innerHTML = "";

    const top = el("div","home-hero__top");
    const title = el("h1","home-hero__title","Genshin Tracker • Dashboard");
    const subtitle = el("p","home-hero__subtitle","Control center: szybki start do modułów, skrót Today, ostatnio używane i mini-statystyki bazy.");
    top.appendChild(title);
    top.appendChild(subtitle);

    const actions = el("div","home-hero__actions");
    actions.appendChild(linkBtn("today.html","Today", true));
    actions.appendChild(linkBtn("index.html","Characters", true));
    actions.appendChild(linkBtn("materials.html","Materials", true));
    actions.appendChild(linkBtn("tier-list.html","Tier list / Teams", false));

    top.appendChild(actions);
    root.appendChild(top);
  }

  async function loadTodayMini(){
    const root = document.getElementById("home-today");
    if (!root) return;

    root.innerHTML = "";
    root.appendChild(el("h2","", "Today – skrót"));

    const metaRow = el("div","home-muted", `${weekdayPL()} • ${todayDateStr()}`);
    root.appendChild(metaRow);

    const list = el("div","home-today__list");
    root.appendChild(list);

    function placeholder(){
      list.innerHTML = "";
      const item = el("div","home-today__item");
      item.appendChild(el("div","", "Brak podglądu (uzupełnij Today lub uruchom go przynajmniej raz)."));
      item.appendChild(el("span","home-pill","—"));
      list.appendChild(item);
    }

    try{
      if (!window.IDB || typeof window.IDB.all !== "function"){
        placeholder();
      } else {
        const dateStr = todayDateStr();
        const all = (await window.IDB.all("todayTasks")) || [];

        let done = 0;
        let total = 0;
        for (const rec of all){
          if (!rec || rec.date !== dateStr) continue;
          total += 1;
          if (rec.done) done += 1;
        }

        const progress = (await window.IDB.all("progress")) || [];
        const owned = progress.filter(r => r && r.character).length;

        list.innerHTML = "";

        const a = el("div","home-today__item");
        a.appendChild(el("div","", "Zadania Today ukończone (dzisiaj)"));
        a.appendChild(el("span","home-pill", `${done}/${total || 0}`));
        list.appendChild(a);

        const b = el("div","home-today__item");
        b.appendChild(el("div","", "Postacie w progress (Owned/Tracked)"));
        b.appendChild(el("span","home-pill", String(owned)));
        list.appendChild(b);

        const c = el("div","home-today__item");
        const lastChar = (window.IDB && IDB.kvGet) ? (await IDB.kvGet("lastCharacter")) : "";
        c.appendChild(el("div","", lastChar ? `Ostatnio oglądana postać: ${lastChar}` : "Ostatnio oglądana postać: —"));
        c.appendChild(el("span","home-pill", "Character"));
        list.appendChild(c);
      }
    }catch(e){
      console.warn("[home] Today mini error:", e);
      placeholder();
    }

    const open = el("div","");
    open.style.marginTop = "10px";
    open.appendChild(linkBtn("today.html","Open Today", true));
    root.appendChild(open);
  }

  function buildLauncher(){
    const root = document.getElementById("home-launcher");
    if (!root) return;

    root.innerHTML = "";
    root.appendChild(el("h2","", "Moduły aplikacji (Launcher)"));

    const tiles = el("div","home-tiles");

    const items = [
      { href:"index.html", title:"Characters", icon:"👥", desc:"Lista postaci i szybkie wejście do detali." },
      { href:"character.html", title:"Character details", icon:"🧾", desc:"Szczegóły postaci (zapamiętuje lastCharacter)." },
      { href:"materials.html", title:"Materials", icon:"🧱", desc:"Baza materiałów i przegląd." },
      { href:"materials-editor.html", title:"Materials editor", icon:"🛠️", desc:"Edycja materiałów." },
      { href:"materials-character.html", title:"Char costs", icon:"💸", desc:"Koszty rozwoju postaci." },
      { href:"planner.html", title:"Mat planner", icon:"🗺️", desc:"Planer farmienia / materiałów." },
      { href:"bosses.html", title:"Bosses", icon:"👹", desc:"Lista bossów i informacje." },
      { href:"guide.html", title:"Boss guide", icon:"📘", desc:"Przewodnik bossów." },
      { href:"tier-list.html", title:"Tier list", icon:"🏆", desc:"Oceny postaci + filtry (w pasku nawigacji)." },
      { href:"tier-analytics.html", title:"Tier analytics", icon:"📊", desc:"Analiza danych tier." },
      { href:"team-planner.html", title:"Team planner", icon:"🧩", desc:"Planowanie drużyn i trybów." },
      { href:"tier-history-raport.html", title:"Tier history raport", icon:"🧠", desc:"Raport historii zmian tierów." }
    ];

    items.forEach(it=>{
      const a = document.createElement("a");
      a.className = "home-tile";
      a.href = it.href;

      const name = el("div","home-tile__name");
      const ic = el("span","home-icon", it.icon);
      name.appendChild(ic);
      name.appendChild(el("span","", it.title));

      a.appendChild(name);
      a.appendChild(el("p","home-tile__desc", it.desc));

      tiles.appendChild(a);
    });

    root.appendChild(tiles);
  }

  function buildShortcuts(){
    const root = document.getElementById("home-shortcuts");
    if (!root) return;

    root.innerHTML = "";
    root.appendChild(el("h2","", "Quick shortcuts"));

    const wrap = el("div","home-tiles");
    const items = [
      { href:"tier-list.html", title:"Tier list", icon:"🏆", desc:"Otwórz tier listę (filtry są w górnym pasku)." },
      { href:"planner.html", title:"Materials planner", icon:"🗺️", desc:"Szybki start do planera materiałów." },
      { href:"team-planner.html", title:"Team planner modes", icon:"🧩", desc:"Tryby i konfiguracje drużyn." },
      { href:"character.html", title:"Last character", icon:"🧾", desc:"Otwórz ostatnio oglądaną postać." }
    ];

    items.forEach(it=>{
      const a = document.createElement("a");
      a.className = "home-tile";
      a.href = it.href;

      const name = el("div","home-tile__name");
      name.appendChild(el("span","home-icon", it.icon));
      name.appendChild(el("span","", it.title));
      a.appendChild(name);
      a.appendChild(el("p","home-tile__desc", it.desc));
      wrap.appendChild(a);
    });

    root.appendChild(wrap);
  }

  function timeAgo(ts){
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "teraz";
    if (min < 60) return min + " min";
    const h = Math.floor(min/60);
    if (h < 24) return h + " h";
    const d = Math.floor(h/24);
    return d + " d";
  }

  async function buildRecent(){
    const root = document.getElementById("home-recent");
    if (!root) return;

    root.innerHTML = "";
    root.appendChild(el("h2","", "Ostatnio używane"));

    const list = el("div","home-recent__list");
    root.appendChild(list);

    const pages = (window.IDB && IDB.kvGet) ? (await IDB.kvGet(RECENT_PAGES_KEY)) : [];
    const chars = (window.IDB && IDB.kvGet) ? (await IDB.kvGet(RECENT_CHARS_KEY)) : [];

    const safePages = Array.isArray(pages) ? pages : [];
    const safeChars = Array.isArray(chars) ? chars : [];

    const merged = [];
    safePages.slice(0, MAX_RECENT).forEach(p=> merged.push({type:"page", ...p}));
    safeChars.slice(0, MAX_RECENT).forEach(c=> merged.push({type:"char", ...c}));

    merged.sort((a,b)=> (b.ts||0) - (a.ts||0));
    const show = merged.slice(0, MAX_RECENT);

    if (!show.length){
      const row = el("div","home-recent__row");
      row.appendChild(el("div","", "Brak historii. Otwórz kilka modułów, a dashboard zacznie to zapamiętywać."));
      row.appendChild(el("span","home-recent__meta","—"));
      list.appendChild(row);
      return;
    }

    show.forEach(item=>{
      const row = el("div","home-recent__row");

      if (item.type === "char"){
        const left = el("div","");
        const a = document.createElement("a");
        const name = item.name || "Character";
        a.href = "character.html?character=" + encodeURIComponent(name);
        a.textContent = "🧾 " + name;
        left.appendChild(a);
        row.appendChild(left);
        row.appendChild(el("div","home-recent__meta", timeAgo(item.ts || 0)));
      } else {
        const left = el("div","");
        const a = document.createElement("a");
        a.href = item.href || "home.html";
        a.textContent = "🧭 " + (item.title || item.href || "Page");
        left.appendChild(a);
        row.appendChild(left);
        row.appendChild(el("div","home-recent__meta", timeAgo(item.ts || 0)));
      }

      list.appendChild(row);
    });
  }

  async function buildStats(){
    const root = document.getElementById("home-stats");
    if (!root) return;

    root.innerHTML = "";
    root.appendChild(el("h2","", "Mini statystyki bazy"));

    const kpis = el("div","home-kpis");
    root.appendChild(kpis);

    function addKpi(value, label){
      const box = el("div","home-kpi");
      box.appendChild(el("div","home-kpi__value", String(value)));
      box.appendChild(el("div","home-kpi__label", label));
      kpis.appendChild(box);
    }

    const charCount = window.characterData ? Object.keys(window.characterData).length : 0;

    let teamCount = 0;
    if (window.characterData){
      for (const ch of Object.values(window.characterData)){
        if (Array.isArray(ch.teams)) teamCount += ch.teams.length;
      }
    }

    let tierEntries = 0;
    let tierVersions = 0;
    if (window.tierHistory){
      const versionSet = new Set();
      for (const v of Object.values(window.tierHistory)){
        const h = v && v.history ? v.history : {};
        const keys = Object.keys(h);
        tierEntries += keys.length;
        keys.forEach(k=>versionSet.add(k));
      }
      tierVersions = versionSet.size;
    }

    let progressRows = 0;
    try{
      if (window.IDB && typeof window.IDB.all === "function"){
        const rows = (await window.IDB.all("progress")) || [];
        progressRows = rows.filter(r => r && r.character).length;
      }
    }catch(e){}

    addKpi(charCount, "Liczba postaci (characterData)");
    addKpi(teamCount, "Liczba teamów (suma w characterData)");
    addKpi(tierEntries, "Wpisy tier-history (rating per wersja)");
    addKpi(tierVersions, "Unikalne wersje w tier-history");
    addKpi(progressRows, "Postacie w progress (IDB)");
  }

  document.addEventListener("DOMContentLoaded", async function(){
    buildHero();
    buildLauncher();
    buildShortcuts();
    await buildRecent();
    await loadTodayMini();
    await buildStats();
  });

})();
