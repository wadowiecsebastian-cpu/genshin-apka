// pity.js — wersja “od zera”, ale funkcjonalnie zgodna z Genshin Pity (tabs, tabele, paste, obliczenia, summary)
// Zapis: IndexedDB (IDB.kvSet/kvGet) z fallbackiem na localStorage.

(function(){
  "use strict";

  const KV_KEY = "pity_state_v1";
  const LEGACY_LS_KEY = "genshin_pity_multi_v3";

  // ===== Helpers =====
  const clamp = (x,min,max) => Math.max(min, Math.min(max, x));
  const fmtPct = (x) => (100 * x).toFixed(1).replace(".", ",") + "%";
  const fmtNum = (x) => new Intl.NumberFormat("pl-PL").format(Math.round(x));
  const fmt1 = (x) => new Intl.NumberFormat("pl-PL",{minimumFractionDigits:1,maximumFractionDigits:1}).format(x);

  const STANDARD_5STAR = new Set(["Diluc","Jean","Keqing","Mona","Qiqi","Tighnari","Dehya"]);

  function toDatetimeLocalValue(str){
    if(!str) return "";
    const s = String(str).trim();
    if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0,16);
    if(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) return s.replace(" ", "T").slice(0,16);
    const d = new Date(s);
    if(Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function fromDatetimeLocalValue(val){
    const v = String(val||"").trim();
    return v || null;
  }

  // linear soft pity ramp
  function linearSoftPityProb({n, base, softStart, hard}){
    if(n>=hard) return 1;
    if(n<softStart) return base;
    const t=(n-softStart)/(hard-softStart);
    return clamp(base + t*(1-base), 0, 1);
  }

  function distributionToNextFive({currentPity, base, softStart, hard}){
    const start = currentPity + 1;
    const last = hard;
    let S = 1;
    const pmf = [];
    for(let n=start, k=1; n<=last; n++, k++){
      const p = (n===hard) ? 1 : linearSoftPityProb({n, base, softStart, hard});
      const q = S * p;
      pmf.push({k, p:q});
      S *= (1-p);
    }
    const expected = pmf.reduce((acc, it) => acc + it.k * it.p, 0);
    function cdfWithin(x){ return pmf.filter(it=>it.k<=x).reduce((a,b)=>a+b.p,0); }
    return {pmf, expected, cdfWithin, hardRemaining: hard - currentPity};
  }

  function averagePity(rows){
    const vals = rows.map(r=>r.pity).filter(v=>Number.isFinite(v));
    if(!vals.length) return null;
    const sum = vals.reduce((a,b)=>a+b,0);
    return sum/vals.length;
  }

  // ===== Storage (IDB first) =====
  async function kvGet(key){
    if (window.IDB && typeof IDB.kvGet === "function"){
      try{ return await IDB.kvGet(key); }catch(e){ return null; }
    }
    return null;
  }
  async function kvSet(key, value){
    if (window.IDB && typeof IDB.kvSet === "function"){
      try{ await IDB.kvSet(key, value); return; }catch(e){}
    }
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }

  let saveTimer = null;
  function debounceSave(fn, ms){
    if(saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(fn, ms);
  }

  // ===== DOM =====
  const tabs = Array.from(document.querySelectorAll(".pity__tab"));
  const panels = Array.from(document.querySelectorAll(".pity__panel"));

  function setActiveTab(btn){
    tabs.forEach(b=>{
      b.classList.toggle("is-active", b===btn);
      b.setAttribute("aria-selected", b===btn ? "true" : "false");
    });
    const targetId = btn.getAttribute("aria-controls");
    panels.forEach(p=> p.classList.toggle("is-active", p.id === targetId));
  }

  tabs.forEach(btn=>{
    btn.addEventListener("click", ()=> setActiveTab(btn));
  });

  window.addEventListener("resize", ()=>{
    applyAutoThumbRatios();
  });

  // ===== Tables =====
  function addRow(tbody, name="", pity="", result="", obtainedAt=null){
    const isChar = tbody.id==="charRows";
    const isWp   = tbody.id==="wpRows";
    const isChro = tbody.id==="chroRows";
    const isStd  = tbody.id==="stdRows";

    const withResult = (isChar || isWp || isChro);
    const withDate   = (withResult || isStd);

    const tr = document.createElement("tr");
    const dtVal = withDate ? toDatetimeLocalValue(obtainedAt) : "";

    if(withResult){
      tr.innerHTML = `
        <td><input type="text" placeholder="Nazwa" value="${name??""}"></td>
        <td><input type="text" placeholder="np. 67 lub Nieznane" value="${pity??""}"></td>
        <td>
          <select class="result">
            <option value="">—</option>
            <option value="win">Wygrana</option>
            <option value="lose">Przegrana</option>
          </select>
        </td>
        <td><input type="datetime-local" class="obtainedAt" value="${dtVal}"></td>
        <td style="width:44px"><button class="pity__btn pity__btn--ghost" title="Usuń wiersz" type="button">✕</button></td>
      `;
    }else{
      // standard: brak wyniku, jest data
      tr.innerHTML = `
        <td><input type="text" placeholder="Nazwa" value="${name??""}"></td>
        <td><input type="text" placeholder="np. 81 lub Nieznane" value="${pity??""}"></td>
        <td><input type="datetime-local" class="obtainedAt" value="${dtVal}"></td>
        <td style="width:44px"><button class="pity__btn pity__btn--ghost" title="Usuń wiersz" type="button">✕</button></td>
      `;
    }

    const delBtn = tr.querySelector("button");
    delBtn.addEventListener("click", ()=>{
      tr.remove();
      scheduleSaveAndSummary();
    });

    if(withResult){
      const sel = tr.querySelector("select.result");
      sel.value = (result==="win"||result==="lose") ? result : "";
    }

    tr.querySelectorAll("input, select").forEach(inp=>{
      inp.addEventListener("input", scheduleSaveAndSummary);
      inp.addEventListener("change", scheduleSaveAndSummary);
    });

    tbody.appendChild(tr);
  }

  function normalizeResult(str){
    if(!str) return "";
    const s = String(str||"").trim().toLowerCase();
    if(/^(win|wygr|on|baner|banner|ok|wygrana)$/.test(s)) return "win";
    if(/^(lose|przeg|off|offbanner|x|przegrana)$/.test(s)) return "lose";
    return "";
  }

  function readRows(tbody){
    const isChar = tbody.id==="charRows";
    const isWp   = tbody.id==="wpRows";
    const isChro = tbody.id==="chroRows";
    const isStd  = tbody.id==="stdRows";

    const withResult = (isChar || isWp || isChro);
    const withDate   = (withResult || isStd);

    const rows = Array.from(tbody.querySelectorAll("tr")).map(tr=>{
      const nameInput = tr.querySelector("td:nth-child(1) input");
      const pityInput = tr.querySelector("td:nth-child(2) input");
      const resultSel = withResult ? tr.querySelector("select.result") : null;
      const dtInput   = withDate ? tr.querySelector("input.obtainedAt") : null;

      const name = (nameInput?.value||"").trim();
      const pityRaw = (pityInput?.value||"").trim();
      const isUnknown = /^nieznane$/i.test(pityRaw) || pityRaw==="";
      const pity = isUnknown ? null : Number(pityRaw.replace(",", "."));
      const result = resultSel ? (resultSel.value||"") : "";
      const obtainedAt = dtInput ? fromDatetimeLocalValue(dtInput.value) : null;

      return {name, pity, isUnknown, result, obtainedAt};
    }).filter(r=>r.name);

    return rows;
  }

  function pasteToggle(section, show){
    const el = document.getElementById(section + "Paste");
    el.hidden = !show;
    if(show){
      const ta = el.querySelector("textarea");
      if(ta) ta.focus();
    }
  }

  function parseMaybeDate(str){
    const s = String(str||"").trim();
    if(!s) return null;
    if(/^\d{4}-\d{2}-\d{2}(\s|T)\d{2}:\d{2}$/.test(s)) return s.replace(" ", "T");
    return null;
  }

  function applyPaste(section){
    const area = document.querySelector("#" + section + "Paste textarea");
    const tbody = document.getElementById(section + "Rows");
    const lines = (area.value||"").split(/\n+/).map(s=>s.trim()).filter(Boolean);

    const withResult = (section==="char" || section==="wp" || section==="chro");

    for(const line of lines){
      const parts = line.split(/\t|;|,/);
      const name = (parts[0]||"").trim();
      const pity = (parts[1]||"").trim();
      const res  = withResult ? normalizeResult(parts[2]||"") : "";
      const dt   = parseMaybeDate(parts[withResult ? 3 : 2]||"");
      if(name){
        addRow(tbody, name, pity, res, dt);
      }
    }

    area.value = "";
    pasteToggle(section, false);
    scheduleSaveAndSummary();
  }

  // init buttons per section
  ["char","wp","chro","std"].forEach(section=>{
    const addBtn = document.querySelector(`[data-add="${section}"]`);
    const clearBtn = document.querySelector(`[data-clear="${section}"]`);
    const pasteBtn = document.querySelector(`[data-paste-toggle="${section}"]`);
    const pasteApplyBtn = document.querySelector(`[data-paste-apply="${section}"]`);
    const pasteCancelBtn = document.querySelector(`[data-paste-cancel="${section}"]`);

    addBtn.addEventListener("click", ()=>{
      addRow(document.getElementById(section+"Rows"), "", "", "", null);
      scheduleSaveAndSummary();
    });

    clearBtn.addEventListener("click", ()=>{
      document.getElementById(section+"Rows").innerHTML = "";
      scheduleSaveAndSummary();
    });

    pasteBtn.addEventListener("click", ()=> pasteToggle(section, true));
    pasteApplyBtn.addEventListener("click", ()=> applyPaste(section));
    pasteCancelBtn.addEventListener("click", ()=> pasteToggle(section, false));
  });

  document.querySelectorAll(".pity__field input, .pity__field select, .pity__details input, .pity__details select").forEach(el=>{
    el.addEventListener("input", scheduleSaveAndSummary);
    el.addEventListener("change", scheduleSaveAndSummary);
  });


  // ===== Render helpers =====
  function statBox(title, val, small){
    const div = document.createElement("div");
    div.className = "pity__stat";
    div.innerHTML = `<b>${val}</b><small>${title}</small>${small ? `<div class="pity__help" style="margin-top:6px">${small}</div>` : ""}`;
    return div;
  }

  function renderStats(container, stats, extra){
    container.innerHTML = "";
    container.appendChild(statBox("Hard pity – maks. pozostało", fmtNum(stats.hardRemaining)));
    container.appendChild(statBox("Oczekiwane pull’e do 5★", fmtNum(stats.expected)));
    container.appendChild(statBox("P(5★ w ≤ 10 pullach)", fmtPct(stats.cdfWithin(Math.min(10, stats.hardRemaining)))));
    if(extra && extra.avgPity != null){
      container.appendChild(statBox("Średnie pity (historia)", fmt1(extra.avgPity), `na podstawie N=${extra.n} wyników`));
    }
  }

  function renderTable(tbody, stats){
    const rows=[10,20,30,40,50,60,70,80,90].filter(x=>x<=stats.hardRemaining);
    tbody.innerHTML = "";
    for(const x of rows){
      const tr = document.createElement("tr");
      const p = stats.cdfWithin(x);
      tr.innerHTML = `<td>${x}</td><td>${fmtPct(p)}</td><td>${fmtNum(stats.expected)}</td>`;
      tbody.appendChild(tr);
    }
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><b>Hard pity (${stats.hardRemaining})</b></td><td><b>${fmtPct(stats.cdfWithin(stats.hardRemaining))}</b></td><td>${fmtNum(stats.expected)}</td>`;
    tbody.appendChild(tr);
  }

  function chipRow(html){
    const row = document.createElement("div");
    row.className = "pity__chipRow";
    row.innerHTML = html;
    return row;
  }
  function chip(label, valueHtml){
    return `<span class="pity__chip">${label} <b>${valueHtml}</b></span>`;
  }

  // ===== Calculations (per panel) =====
  function infer5050FromHistory(rows){
    for(let i=rows.length-1; i>=0; i--){
      const r=rows[i];
      if(r.result==="win")  return "5050";
      if(r.result==="lose") return "guaranteed";
    }
    if(!rows.length) return "5050";
    const last = rows[rows.length-1];
    if(STANDARD_5STAR.has(last.name)) return "guaranteed";
    return "5050";
  }

  function deriveFateFromHistory(rows){
    let c=0;
    for(let i=rows.length-1;i>=0;i--){
      const r=rows[i];
      if(r.result==="lose") c++;
      else if(r.result==="win") break;
      else break;
    }
    return Math.min(c,1);
  }

  function calcChar(){
    const rows = readRows(document.getElementById("charRows"));
    let state = document.getElementById("char50").value;
    if(state==="auto") state = infer5050FromHistory(rows);

    const currentPity = clamp(parseInt(document.getElementById("charCurrentPity").value||"0",10),0,999);
    const base = parseFloat(document.getElementById("charBase").value||"0.006");
    const soft = clamp(parseInt(document.getElementById("charSoft").value||"74",10),1,999);
    const hard = clamp(parseInt(document.getElementById("charHard").value||"90",10),1,999);

    const dist = distributionToNextFive({currentPity, base, softStart:soft, hard});
    const avg = averagePity(rows);

    const statsEl = document.getElementById("charStats");
    renderStats(statsEl, dist, {avgPity: avg, n: rows.filter(r=>Number.isFinite(r.pity)).length});
    renderTable(document.getElementById("charTable"), dist);

    const desiredP = (state==="guaranteed") ? 1 : 0.5;
    const name = (document.getElementById("charTarget").value||"Twoja postać");
    const last = rows[rows.length-1];
    const dtTxt = last?.obtainedAt ? `, ${last.obtainedAt.replace("T"," ")}` : "";
    const lastTxt = last ? `${last.name}${last.pity!=null?` (${last.pity})`:``}${last.result?` — ${last.result==="win"?"wygrana":"przegrana"}`:``}${dtTxt}` : "brak danych";

    statsEl.appendChild(chipRow(
      chip("Ostatni 5★:", lastTxt) +
      chip("Stan 50/50:", state==="guaranteed" ? "Gwarant" : "50/50") +
      chip(`P(następny 5★ = ${name}):`, fmtPct(desiredP)) +
      chip(`≈ P(${name} w ≤ 20 pullach):`, fmtPct(desiredP * dist.cdfWithin(Math.min(20, dist.hardRemaining))))
    ));
  }

  function calcWeapon(prefix){
    const rows = readRows(document.getElementById(prefix+"Rows"));
    const currentPity = clamp(parseInt(document.getElementById(prefix+"CurrentPity").value||"0",10),0,999);
    const base = parseFloat(document.getElementById(prefix+"Base").value||"0.007");
    const soft = clamp(parseInt(document.getElementById(prefix+"Soft").value||"63",10),1,999);
    const hard = clamp(parseInt(document.getElementById(prefix+"Hard").value||"80",10),1,999);

    const dist = distributionToNextFive({currentPity, base, softStart:soft, hard});
    const avg = averagePity(rows);

    const statsEl = document.getElementById(prefix+"Stats");
    renderStats(statsEl, dist, {avgPity: avg, n: rows.filter(r=>Number.isFinite(r.pity)).length});
    renderTable(document.getElementById(prefix+"Table"), dist);

    const fateManual = parseInt(document.getElementById(prefix+"Fate").value,10);
    const autoFate = document.getElementById(prefix+"AutoFate")?.checked;
    const fate = autoFate ? deriveFateFromHistory(rows) : fateManual;

    const featuredP = clamp(parseFloat(document.getElementById(prefix+"Featured").value||"0.75"),0,1);
    const split = clamp(parseFloat(document.getElementById(prefix+"Split").value||"0.5"),0,1);
    const desiredPnext = (fate>=1) ? 1 : featuredP * split;

    const targetName = (document.getElementById(prefix+"Target").value || "docelowa broń");
    const last = rows[rows.length-1];
    const dtTxt = last?.obtainedAt ? `, ${last.obtainedAt.replace("T"," ")}` : "";
    const lastTxt = last ? `${last.name}${last.pity!=null?` (${last.pity})`:``}${last.result?` — ${last.result==="win"?"wygrana":"przegrana"}`:``}${dtTxt}` : "brak danych";

    statsEl.appendChild(chipRow(
      chip("Ostatni 5★:", lastTxt) +
      chip("Fate Points:", `${fate}${autoFate ? " (z historii)" : ""}`) +
      chip(`P(następny 5★ = ${targetName}):`, fmtPct(desiredPnext)) +
      chip("≈ P(w ≤ 20 pullach):", fmtPct(desiredPnext * dist.cdfWithin(Math.min(20, dist.hardRemaining))))
    ));
  }

  function calcStandard(){
    const rows = readRows(document.getElementById("stdRows"));
    const currentPity = clamp(parseInt(document.getElementById("stdCurrentPity").value||"0",10),0,999);
    const base = parseFloat(document.getElementById("stdBase").value||"0.006");
    const soft = clamp(parseInt(document.getElementById("stdSoft").value||"74",10),1,999);
    const hard = clamp(parseInt(document.getElementById("stdHard").value||"90",10),1,999);

    const dist = distributionToNextFive({currentPity, base, softStart:soft, hard});
    const avg = averagePity(rows);

    const statsEl = document.getElementById("stdStats");
    renderStats(statsEl, dist, {avgPity: avg, n: rows.filter(r=>Number.isFinite(r.pity)).length});
    renderTable(document.getElementById("stdTable"), dist);

    const last = rows[rows.length-1];
    const dtTxt = last?.obtainedAt ? `, ${last.obtainedAt.replace("T"," ")}` : "";
    const lastTxt = last ? `${last.name}${last.pity!=null?` (${last.pity})`:``}${dtTxt}` : "brak danych";

    statsEl.appendChild(chipRow(chip("Ostatni 5★:", lastTxt)));
  }

  // ===== Summary =====
  function toDate(dstr){
    if(!dstr) return null;
    const s = String(dstr).replace(" ", "T");
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  function median(nums){
    const a=nums.slice().sort((x,y)=>x-y);
    if(!a.length) return null;
    const m=Math.floor(a.length/2);
    return a.length%2? a[m] : (a[m-1]+a[m])/2;
  }
  function collectAll(){
    const map = [
      {banner:"Postać", rows: readRows(document.getElementById("charRows"))},
      {banner:"Broń", rows: readRows(document.getElementById("wpRows"))},
      {banner:"Chronicled", rows: readRows(document.getElementById("chroRows"))},
      {banner:"Standard", rows: readRows(document.getElementById("stdRows"))},
    ];
    const all=[];
    for(const {banner, rows} of map){
      for(const r of rows){
        all.push({
          banner,
          name: r.name,
          pity: r.pity,
          result: r.result||"",
          obtainedAt: toDate(r.obtainedAt),
          obtainedRaw: r.obtainedAt||null
        });
      }
    }
    return all;
  }
  function statsOf(list){
    const pityVals = list.map(x=>x.pity).filter(v=>Number.isFinite(v));
    const avg = pityVals.length? pityVals.reduce((a,b)=>a+b,0)/pityVals.length : null;
    const med = median(pityVals)||null;
    const best = pityVals.length? Math.min(...pityVals): null;
    const worst= pityVals.length? Math.max(...pityVals): null;

    const timelineSorted = list.slice().sort((a,b)=>{
      if(a.obtainedAt && b.obtainedAt) return b.obtainedAt - a.obtainedAt;
      if(a.obtainedAt) return -1;
      if(b.obtainedAt) return 1;
      return 0;
    });
    const last = timelineSorted.find(x=>x.obtainedAt);
    const now = new Date();
    const since = last?.obtainedAt ? Math.max(0, now - last.obtainedAt) : null;

    return {count:list.length, avg, med, best, worst, since};
  }
  function humanDuration(ms){
    if(ms==null) return "—";
    const d=Math.floor(ms/86400000), h=Math.floor((ms%86400000)/3600000);
    if(d>0) return `${d} d ${h} h`;
    const m=Math.floor((ms%3600000)/60000);
    return `${h} h ${m} min`;
  }

  function summaryStates(){
    const charRows = readRows(document.getElementById("charRows"));
    let charState = document.getElementById("char50").value;
    if(charState==="auto") charState = infer5050FromHistory(charRows);

    const fateWp = deriveFateFromHistory(readRows(document.getElementById("wpRows")));
    const fateChro = deriveFateFromHistory(readRows(document.getElementById("chroRows")));

    function nextExp({current, base, soft, hard}){
      const dist = distributionToNextFive({currentPity:current, base, softStart:soft, hard});
      return {expected: dist.expected, within20: dist.cdfWithin(Math.min(20, dist.hardRemaining)), hardRemaining: dist.hardRemaining};
    }

    const charExp = nextExp({
      current: parseInt(document.getElementById("charCurrentPity").value||"0",10),
      base: parseFloat(document.getElementById("charBase").value||"0.006"),
      soft: parseInt(document.getElementById("charSoft").value||"74",10),
      hard: parseInt(document.getElementById("charHard").value||"90",10),
    });
    const wpExp = nextExp({
      current: parseInt(document.getElementById("wpCurrentPity").value||"0",10),
      base: parseFloat(document.getElementById("wpBase").value||"0.007"),
      soft: parseInt(document.getElementById("wpSoft").value||"63",10),
      hard: parseInt(document.getElementById("wpHard").value||"80",10),
    });
    const chroExp = nextExp({
      current: parseInt(document.getElementById("chroCurrentPity").value||"0",10),
      base: parseFloat(document.getElementById("chroBase").value||"0.007"),
      soft: parseInt(document.getElementById("chroSoft").value||"63",10),
      hard: parseInt(document.getElementById("chroHard").value||"80",10),
    });

    return {charState, fateWp, fateChro, charExp, wpExp, chroExp};
  }

  function renderSummary(){
    const sumQuick = document.getElementById("sumQuick");
    const sumStates = document.getElementById("sumStates");
    const sumTimeline = document.getElementById("sumTimeline");
    const sumPace = document.getElementById("sumPace");
    const sumRecords = document.getElementById("sumRecords");

    if(!sumQuick || !sumStates || !sumTimeline || !sumPace || !sumRecords) return;

    const all = collectAll();

    const byBanner = {Postać:[], Broń:[], Chronicled:[], Standard:[]};
    for(const e of all) byBanner[e.banner].push(e);

    const timeline = all.slice().sort((a,b)=>{
      if(a.obtainedAt && b.obtainedAt) return b.obtainedAt - a.obtainedAt;
      if(a.obtainedAt) return -1;
      if(b.obtainedAt) return 1;
      return 0;
    });

    const sAll = statsOf(all);
    const sChar = statsOf(byBanner["Postać"]);
    const sWp   = statsOf(byBanner["Broń"]);
    const sChro = statsOf(byBanner["Chronicled"]);
    const sStd  = statsOf(byBanner["Standard"]);
    const states = summaryStates();

    // quick
    sumQuick.innerHTML = "";
    sumQuick.appendChild(statBox("Łącznie 5★", fmtNum(sAll.count)));
    sumQuick.appendChild(statBox("Postać • Śr. pity", sChar.avg!=null?fmt1(sChar.avg):"—", `mediana ${sChar.med!=null?fmt1(sChar.med):"—"}`));
    sumQuick.appendChild(statBox("Broń • Śr. pity", sWp.avg!=null?fmt1(sWp.avg):"—", `mediana ${sWp.med!=null?fmt1(sWp.med):"—"}`));
    sumQuick.appendChild(statBox("Chronicled • Śr. pity", sChro.avg!=null?fmt1(sChro.avg):"—", `mediana ${sChro.med!=null?fmt1(sChro.med):"—"}`));
    sumQuick.appendChild(statBox("Standard • Śr. pity", sStd.avg!=null?fmt1(sStd.avg):"—", `mediana ${sStd.med!=null?fmt1(sStd.med):"—"}`));
    sumQuick.appendChild(statBox("Czas od ostatniego 5★", humanDuration(sAll.since)));

    // states
    sumStates.innerHTML = "";
    sumStates.appendChild(statBox("Postać — stan 50/50", states.charState==="guaranteed" ? "Gwarant" : "50/50"));
    sumStates.appendChild(statBox("Postać — oczek. pull’e do 5★", fmt1(states.charExp.expected)));
    sumStates.appendChild(statBox("Broń — Fate Points", fmtNum(states.fateWp)));
    sumStates.appendChild(statBox("Broń — oczek. pull’e do 5★", fmt1(states.wpExp.expected)));
    sumStates.appendChild(statBox("Chronicled — Fate Points", fmtNum(states.fateChro)));
    sumStates.appendChild(statBox("Chronicled — oczek. pull’e do 5★", fmt1(states.chroExp.expected)));

    // timeline
    sumTimeline.innerHTML = "";
    for(const e of timeline){
      const tr = document.createElement("tr");
      const dateTxt = e.obtainedAt ? e.obtainedRaw.replace("T"," ") : "—";
      const resTxt  = e.result ? (e.result==="win" ? "wygrana" : "przegrana") : "—";
      tr.innerHTML = `<td>${dateTxt}</td><td>${e.banner}</td><td>${e.name}</td><td>${e.pity!=null?e.pity:"Nieznane"}</td><td>${resTxt}</td>`;
      sumTimeline.appendChild(tr);
    }

    // pace
    sumPace.innerHTML = "";
    const paceBox = (title, s) => {
      const div = document.createElement("div");
      div.className = "pity__stat";
      div.innerHTML = `<b>${fmtNum(s.count)}</b><small>${title} — łączna liczba 5★</small><div class="pity__help">Śr. pity: ${s.avg!=null?fmt1(s.avg):"—"} • Od ostatniego: ${humanDuration(s.since)}</div>`;
      return div;
    };
    sumPace.appendChild(paceBox("Wszystkie banery", sAll));
    sumPace.appendChild(paceBox("Postać", sChar));
    sumPace.appendChild(paceBox("Broń", sWp));
    sumPace.appendChild(paceBox("Chronicled", sChro));
    sumPace.appendChild(paceBox("Standard", sStd));

    // records
    sumRecords.innerHTML = "";
    const recBox = (title, s) => statBox(`${title} — min / max pity`, `${s.best!=null?fmt1(s.best):"—"} / ${s.worst!=null?fmt1(s.worst):"—"}`);
    sumRecords.appendChild(recBox("Postać", sChar));
    sumRecords.appendChild(recBox("Broń", sWp));
    sumRecords.appendChild(recBox("Chronicled", sChro));
    sumRecords.appendChild(recBox("Standard", sStd));
  }

  const DASHBOARD_PRESETS = {
    char: {
      label: "Character Event Wish",
      description: "Widok w stylu Companion dla zapisanej historii 5★ na banerze postaci.",
      lead: {src: "Portrety/Raiden.png", alt: "Raiden Shogun"},
      rail: [
        {src: "Portrety/Nahida.png", alt: "Nahida"},
        {src: "Portrety/Yelan.png", alt: "Yelan"},
        {src: "Portrety/Zhongli.png", alt: "Zhongli"},
        {src: "Portrety/Bennett.png", alt: "Bennett"}
      ]
    },
    wp: {
      label: "Weapon Event Wish",
      description: "Podgląd pity, statusu Fate Points i najnowszych trafień na banerze broni.",
      lead: {src: "Bronie/Engulfing Lightning.png", alt: "Engulfing Lightning"},
      rail: [
        {src: "Bronie/Aqua Simulacra.png", alt: "Aqua Simulacra"},
        {src: "Bronie/Favonius Lance.png", alt: "Favonius Lance"},
        {src: "Bronie/The Widsith.png", alt: "The Widsith"},
        {src: "Bronie/Slingshot.png", alt: "Slingshot"}
      ]
    },
    chro: {
      label: "Chronicled Wish",
      description: "Skrócony widok pity, statusu ścieżki i historii 5★ dla Chronicled Wish.",
      lead: {src: "Portrety/Keqing.png", alt: "Keqing"},
      rail: [
        {src: "Portrety/Mona.png", alt: "Mona"},
        {src: "Portrety/Qiqi.png", alt: "Qiqi"},
        {src: "Bronie/Engulfing Lightning.png", alt: "Engulfing Lightning"},
        {src: "Bronie/Favonius Sword.png", alt: "Favonius Sword"}
      ]
    },
    std: {
      label: "Standard Wish",
      description: "Stały baner z czytelniejszym układem historii, bieżącego pity i skrótu statystyk.",
      lead: {src: "Portrety/Keqing.png", alt: "Keqing"},
      rail: [
        {src: "Portrety/Mona.png", alt: "Mona"},
        {src: "Portrety/Qiqi.png", alt: "Qiqi"},
        {src: "Bronie/Skyward Harp.png", alt: "Skyward Harp"},
        {src: "Bronie/Lost Prayer to the Sacred Winds.png", alt: "Lost Prayer to the Sacred Winds"}
      ]
    }
  };

  function escapeHtml(value){
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function shortText(value, max){
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if(!text) return "";
    return text.length > max ? text.slice(0, max - 3).trim() + "..." : text;
  }

  function displayDate(value){
    return value ? String(value).replace("T", " ") : "—";
  }

  function sortedByNewest(rows){
    return rows.slice().sort((a,b)=>{
      const ad = toDate(a.obtainedAt);
      const bd = toDate(b.obtainedAt);
      if(ad && bd) return bd - ad;
      if(ad) return -1;
      if(bd) return 1;
      return 0;
    });
  }

  function winRate(rows){
    const decided = rows.filter(r=>r.result === "win" || r.result === "lose");
    if(!decided.length) return "—";
    const wins = decided.filter(r=>r.result === "win").length;
    return fmtPct(wins / decided.length);
  }

  function metricRow(label, value){
    return `<div class="pity__metricRow"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function statusBadge(result){
    if(result === "win") return '<span class="pity__statusBadge pity__statusBadge--win">Won</span>';
    if(result === "lose") return '<span class="pity__statusBadge pity__statusBadge--lose">Lost</span>';
    return '<span class="pity__statusBadge">Tracked</span>';
  }

  function mediaMarkup(src, alt, cls){
    return `<img class="${cls}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.style.display='none'">`;
  }

  function smartAssetMarkup(name, preferWeapon){
    const cleanName = String(name || "").trim();
    if(!cleanName){
      return '<span class="pity__historyThumb pity__historyThumb--empty">?</span>';
    }
    if(preferWeapon){
      return `<img class="pity__historyThumb" src="Bronie/${escapeHtml(cleanName)}.png" alt="${escapeHtml(cleanName)}" loading="lazy" onerror="this.onerror=null;this.src=&quot;Portrety/${escapeHtml(cleanName)}.png&quot;;">`;
    }
    return `<img class="pity__historyThumb" src="Portrety/${escapeHtml(cleanName)}.png" alt="${escapeHtml(cleanName)}" loading="lazy" onerror="this.onerror=null;this.src=&quot;Bronie/${escapeHtml(cleanName)}.png&quot;;">`;
  }

  function applyAutoThumbRatios(root = document){
    const thumbs = Array.from(root.querySelectorAll("img.pity__historyThumb"));

    thumbs.forEach(img => {
      const updateThumbSize = () => {
        const naturalW = img.naturalWidth || 0;
        const naturalH = img.naturalHeight || 0;

        if(!naturalW || !naturalH) return;

        const renderedWidth = Math.round(img.getBoundingClientRect().width) || 48;
        const renderedHeight = Math.max(1, Math.round((renderedWidth * naturalH) / naturalW));

        img.style.setProperty("--pity-thumb-height", renderedHeight + "px");
      };

      if(img.complete){
        updateThumbSize();
      }else{
        img.addEventListener("load", updateThumbSize, { once: true });
      }
    });
  }

  function readCurrentValue(id){
    const el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function panelRows(prefix){
    return readRows(document.getElementById(prefix + "Rows"));
  }

  function panelHard(prefix){
    if(prefix === "char") return clamp(parseInt(readCurrentValue("charHard") || "90", 10), 1, 999);
    if(prefix === "wp") return clamp(parseInt(readCurrentValue("wpHard") || "80", 10), 1, 999);
    if(prefix === "chro") return clamp(parseInt(readCurrentValue("chroHard") || "80", 10), 1, 999);
    return clamp(parseInt(readCurrentValue("stdHard") || "90", 10), 1, 999);
  }

  function panelCurrentPity(prefix){
    if(prefix === "char") return clamp(parseInt(readCurrentValue("charCurrentPity") || "0", 10), 0, 999);
    if(prefix === "wp") return clamp(parseInt(readCurrentValue("wpCurrentPity") || "0", 10), 0, 999);
    if(prefix === "chro") return clamp(parseInt(readCurrentValue("chroCurrentPity") || "0", 10), 0, 999);
    return clamp(parseInt(readCurrentValue("stdCurrentPity") || "0", 10), 0, 999);
  }

  function panelDistribution(prefix){
    if(prefix === "char"){
      return distributionToNextFive({
        currentPity: panelCurrentPity("char"),
        base: parseFloat(readCurrentValue("charBase") || "0.006"),
        softStart: clamp(parseInt(readCurrentValue("charSoft") || "74", 10), 1, 999),
        hard: panelHard("char")
      });
    }
    if(prefix === "wp"){
      return distributionToNextFive({
        currentPity: panelCurrentPity("wp"),
        base: parseFloat(readCurrentValue("wpBase") || "0.007"),
        softStart: clamp(parseInt(readCurrentValue("wpSoft") || "63", 10), 1, 999),
        hard: panelHard("wp")
      });
    }
    if(prefix === "chro"){
      return distributionToNextFive({
        currentPity: panelCurrentPity("chro"),
        base: parseFloat(readCurrentValue("chroBase") || "0.007"),
        softStart: clamp(parseInt(readCurrentValue("chroSoft") || "63", 10), 1, 999),
        hard: panelHard("chro")
      });
    }
    return distributionToNextFive({
      currentPity: panelCurrentPity("std"),
      base: parseFloat(readCurrentValue("stdBase") || "0.006"),
      softStart: clamp(parseInt(readCurrentValue("stdSoft") || "74", 10), 1, 999),
      hard: panelHard("std")
    });
  }

  function panelState(prefix, rows){
    if(prefix === "char"){
      let state = readCurrentValue("char50") || "auto";
      if(state === "auto") state = infer5050FromHistory(rows);
      return {
        subtitle: "Character Event Status",
        title: state === "guaranteed" ? "Guaranteed" : "50 / 50",
        detail: state === "guaranteed"
          ? "Następny 5★ jest gwarantem na postać z banera."
          : "Następny 5★ nadal jest w stanie 50 / 50.",
        oneLabel: "Win rate",
        oneValue: winRate(rows),
        twoLabel: "Tracked 5★",
        twoValue: fmtNum(rows.length)
      };
    }

    if(prefix === "wp"){
      const fate = document.getElementById("wpAutoFate")?.checked
        ? deriveFateFromHistory(rows)
        : parseInt(readCurrentValue("wpFate") || "0", 10);
      return {
        subtitle: "Epitomized Path",
        title: `Fate ${fate}/1`,
        detail: readCurrentValue("wpTarget") || "Brak ustawionej docelowej broni.",
        oneLabel: "Win rate",
        oneValue: winRate(rows),
        twoLabel: "Hard pity",
        twoValue: fmtNum(panelHard("wp"))
      };
    }

    if(prefix === "chro"){
      const fate = document.getElementById("chroAutoFate")?.checked
        ? deriveFateFromHistory(rows)
        : parseInt(readCurrentValue("chroFate") || "0", 10);
      return {
        subtitle: "Chronicled Path",
        title: `Fate ${fate}/1`,
        detail: readCurrentValue("chroTarget") || "Brak ustawionego celu w Chronicled.",
        oneLabel: "Win rate",
        oneValue: winRate(rows),
        twoLabel: "Hard pity",
        twoValue: fmtNum(panelHard("chro"))
      };
    }

    return {
      subtitle: "Standard Wish",
      title: "Permanent",
      detail: "Baner standardowy nie ma ograniczenia czasu i korzysta z przybliżonego modelu pity jak baner postaci.",
      oneLabel: "Average pity",
      oneValue: averagePity(rows) != null ? fmt1(averagePity(rows)) : "—",
      twoLabel: "Tracked 5★",
      twoValue: fmtNum(rows.length)
    };
  }

  function panelHeadline(prefix, rows){
    const newest = sortedByNewest(rows)[0];
    if(newest?.name) return newest.name;
    if(prefix === "char") return readCurrentValue("charTarget") || DASHBOARD_PRESETS.char.lead.alt;
    if(prefix === "wp") return readCurrentValue("wpTarget") || DASHBOARD_PRESETS.wp.lead.alt;
    if(prefix === "chro") return readCurrentValue("chroTarget") || DASHBOARD_PRESETS.chro.lead.alt;
    return DASHBOARD_PRESETS.std.lead.alt;
  }

  function historyRowsHtml(prefix, rows){
    if(!rows.length){
      return '<tr><td colspan="5" class="pity__emptyCell">Brak zapisanych 5★. Rozwiń edytor poniżej, żeby dodać dane.</td></tr>';
    }
    const preferWeapon = prefix === "wp";
    return rows.slice(0, 8).map(row=>`
      <tr>
        <td>
          <div class="pity__historyItem">
            ${smartAssetMarkup(row.name, preferWeapon)}
            <div class="pity__historyCopy">
              <strong>${escapeHtml(row.name)}</strong>
              <span class="pity__historyStars">★★★★★</span>
            </div>
          </div>
        </td>
        <td>${escapeHtml(DASHBOARD_PRESETS[prefix].label)}</td>
        <td>${row.pity != null ? fmtNum(row.pity) : "—"}</td>
        <td>${prefix === "std" ? "—" : statusBadge(row.result)}</td>
        <td>${escapeHtml(displayDate(row.obtainedAt))}</td>
      </tr>
    `).join("");
  }

  function recentDropsHtml(prefix, rows){
    if(!rows.length){
      return '<div class="pity__emptyBlock">Brak zapisanych 5★ w tej sekcji.</div>';
    }
    const preferWeapon = prefix === "wp";
    return rows.slice(0, 4).map(row=>`
      <div class="pity__dropItem">
        ${smartAssetMarkup(row.name, preferWeapon)}
        <div class="pity__dropCopy">
          <strong>${escapeHtml(row.name)}</strong>
          <span>${escapeHtml(displayDate(row.obtainedAt))}</span>
        </div>
        <div class="pity__dropMeta">
          ${prefix === "std" ? "" : statusBadge(row.result)}
          <span>${row.pity != null ? `${fmtNum(row.pity)} pity` : "—"}</span>
        </div>
      </div>
    `).join("");
  }

  function renderBannerDashboard(prefix){
    const containerId = {
      char: "charDashboard",
      wp: "weaponDashboard",
      chro: "chroDashboard",
      std: "standardDashboard"
    }[prefix];
    const container = document.getElementById(containerId);
    if(!container) return;

    const rows = panelRows(prefix);
    const newest = sortedByNewest(rows);
    const dist = panelDistribution(prefix);
    const preset = DASHBOARD_PRESETS[prefix];
    const state = panelState(prefix, rows);
    const currentPity = panelCurrentPity(prefix);
    const headline = panelHeadline(prefix, rows);
    const latest = newest[0];
    const latestText = latest
      ? `${latest.name}${latest.pity != null ? ` • pity ${latest.pity}` : ""}${latest.obtainedAt ? ` • ${displayDate(latest.obtainedAt)}` : ""}`
      : "Brak danych w historii 5★.";

    container.innerHTML = `
      <div class="pity__dashboardGrid">
        <div class="pity__mainStack">
          <section class="pity__card pity__showcase pity__showcase--${prefix}">
            <div class="pity__showcaseCopy">
              <div class="pity__showcaseKicker">${escapeHtml(preset.label)}</div>
              <h2 class="pity__showcaseTitle">${escapeHtml(headline)}</h2>
              <p class="pity__showcaseText">${escapeHtml(shortText(latestText || preset.description, 180))}</p>
              <div class="pity__showcaseFacts">
                <span>Current pity <strong>${fmtNum(currentPity)}</strong></span>
                <span>Next 5★ <strong>${fmtNum(dist.hardRemaining)}</strong></span>
                <span>Tracked 5★ <strong>${fmtNum(rows.length)}</strong></span>
              </div>
              <div class="pity__showcaseActions">
                <button class="pity__btn pity__btn--primary" data-run-calc="${prefix}" type="button">Przelicz</button>
                <button class="pity__btn" data-open-editor="${prefix}" type="button">Otwórz edytor</button>
              </div>
            </div>
            <div class="pity__heroMedia">
              ${mediaMarkup(preset.lead.src, preset.lead.alt, "pity__heroLead")}
              <div class="pity__heroRail">
                ${preset.rail.map(item=>mediaMarkup(item.src, item.alt, "pity__heroMini")).join("")}
              </div>
            </div>
          </section>

          <section class="pity__card">
            <div class="pity__sectionHead">
              <div>
                <h2 class="pity__h2">Wish History</h2>
                <div class="pity__help">Nowy układ jest tylko warstwą prezentacji. Dane nadal pochodzą z Twoich zapisanych 5★.</div>
              </div>
              <span class="pity__mutedLabel">${escapeHtml(preset.label)}</span>
            </div>
            <div class="pity__tableWrap pity__tableWrap--history">
              <table class="pity__table pity__table--history">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Wish Type</th>
                    <th>Pity</th>
                    <th>Status</th>
                    <th>Time Received</th>
                  </tr>
                </thead>
                <tbody>${historyRowsHtml(prefix, newest)}</tbody>
              </table>
            </div>
          </section>
        </div>

        <aside class="pity__sideStack">
          <section class="pity__card pity__sideCard">
            <div class="pity__sideKicker">Pity Summary</div>
            <div class="pity__sideValue">${fmtNum(currentPity)}</div>
            <p class="pity__sideText">Bieżący pity 5★ dla tej sekcji.</p>
            <div class="pity__sideMeta">
              ${metricRow("Next 5★", fmtNum(dist.hardRemaining))}
              ${metricRow("Hard pity", fmtNum(panelHard(prefix)))}
              ${metricRow("Expected", fmt1(dist.expected))}
            </div>
          </section>

          <section class="pity__card pity__sideCard">
            <div class="pity__sideKicker">${escapeHtml(state.subtitle)}</div>
            <div class="pity__sideState">${escapeHtml(state.title)}</div>
            <p class="pity__sideText">${escapeHtml(state.detail)}</p>
            <div class="pity__sideMeta">
              ${metricRow(state.oneLabel, state.oneValue)}
              ${metricRow(state.twoLabel, state.twoValue)}
            </div>
          </section>

          <section class="pity__card pity__sideCard">
            <div class="pity__sectionHead">
              <div class="pity__sideKicker">5★ Drop History</div>
              <span class="pity__mutedLabel">${fmtNum(rows.length)}</span>
            </div>
            <div class="pity__dropList">
              ${recentDropsHtml(prefix, newest)}
            </div>
          </section>
        </aside>
      </div>
    `;
  }

  function renderSummaryDashboard(){
    const container = document.getElementById("summaryDashboard");
    if(!container) return;

    const all = collectAll();
    const byBanner = {Postać:[], Broń:[], Chronicled:[], Standard:[]};
    for(const entry of all) byBanner[entry.banner].push(entry);

    const timeline = all.slice().sort((a,b)=>{
      if(a.obtainedAt && b.obtainedAt) return b.obtainedAt - a.obtainedAt;
      if(a.obtainedAt) return -1;
      if(b.obtainedAt) return 1;
      return 0;
    });

    const sAll = statsOf(all);
    const sChar = statsOf(byBanner["Postać"]);
    const sWp   = statsOf(byBanner["Broń"]);
    const sChro = statsOf(byBanner["Chronicled"]);
    const sStd  = statsOf(byBanner["Standard"]);

    const charRows = panelRows("char");
    const wpRows = panelRows("wp");
    const chroRows = panelRows("chro");

    let charState = readCurrentValue("char50") || "auto";
    if(charState === "auto") charState = infer5050FromHistory(charRows);
    const wpFate = document.getElementById("wpAutoFate")?.checked
      ? deriveFateFromHistory(wpRows)
      : parseInt(readCurrentValue("wpFate") || "0", 10);
    const chroFate = document.getElementById("chroAutoFate")?.checked
      ? deriveFateFromHistory(chroRows)
      : parseInt(readCurrentValue("chroFate") || "0", 10);

    const overviewCards = [
      {
        label: "Character Event",
        icon: "Portrety/Raiden.png",
        current: panelCurrentPity("char"),
        next: panelDistribution("char").hardRemaining,
        meta: charState === "guaranteed" ? "Guaranteed" : "50 / 50"
      },
      {
        label: "Weapon Event",
        icon: "Bronie/Engulfing Lightning.png",
        current: panelCurrentPity("wp"),
        next: panelDistribution("wp").hardRemaining,
        meta: `Fate ${wpFate}/1`
      },
      {
        label: "Standard",
        icon: "Portrety/Keqing.png",
        current: panelCurrentPity("std"),
        next: panelDistribution("std").hardRemaining,
        meta: "Permanent"
      },
      {
        label: "Chronicled",
        icon: "Portrety/Mona.png",
        current: panelCurrentPity("chro"),
        next: panelDistribution("chro").hardRemaining,
        meta: `Fate ${chroFate}/1`
      }
    ];

    const overviewHtml = overviewCards.map(card=>`
      <div class="pity__summaryCard">
        <img class="pity__summaryIcon" src="${card.icon}" alt="${escapeHtml(card.label)}" loading="lazy" onerror="this.style.display='none'">
        <div>
          <div class="pity__summaryLabel">${escapeHtml(card.label)}</div>
          <div class="pity__summaryNumber">${fmtNum(card.current)}</div>
          <div class="pity__summaryMeta">Next 5★: ${fmtNum(card.next)} • ${escapeHtml(card.meta)}</div>
        </div>
      </div>
    `).join("");

    const nextOverviewRows = overviewCards.map(card=>`
      <tr>
        <td>${escapeHtml(card.label)}</td>
        <td>${fmtNum(card.current)}</td>
        <td>${fmtNum(card.next)}</td>
        <td>${escapeHtml(card.meta)}</td>
      </tr>
    `).join("");

    const recentPulls = timeline.length
      ? timeline.slice(0, 5).map(entry=>`
          <div class="pity__dropItem">
            ${smartAssetMarkup(entry.name, entry.banner === "Broń")}
            <div class="pity__dropCopy">
              <strong>${escapeHtml(entry.name)}</strong>
              <span>${escapeHtml(displayDate(entry.obtainedRaw))}</span>
            </div>
            <div class="pity__dropMeta">
              ${entry.banner !== "Standard" ? statusBadge(entry.result) : ""}
              <span>${entry.pity != null ? `${fmtNum(entry.pity)} pity` : "—"}</span>
            </div>
          </div>
        `).join("")
      : '<div class="pity__emptyBlock">Brak zapisanych 5★ we wszystkich sekcjach.</div>';

    const summaryTimelineRows = timeline.length
      ? timeline.slice(0, 8).map(entry=>`
          <tr>
            <td>${escapeHtml(displayDate(entry.obtainedRaw))}</td>
            <td>${escapeHtml(entry.banner)}</td>
            <td>${escapeHtml(entry.name)}</td>
            <td>${entry.pity != null ? fmtNum(entry.pity) : "—"}</td>
            <td>${entry.banner === "Standard" ? "—" : statusBadge(entry.result)}</td>
          </tr>
        `).join("")
      : '<tr><td colspan="5" class="pity__emptyCell">Brak danych do osi czasu. Dodaj wpisy w edytorze poniżej.</td></tr>';

    container.innerHTML = `
      <div class="pity__summaryLayout">
        <div class="pity__mainStack">
          <section class="pity__card">
            <div class="pity__sectionHead">
              <div>
                <h2 class="pity__h2">Pity Summary</h2>
                <div class="pity__help">Cztery skróty banerów w układzie zbliżonym do przesłanych makiet.</div>
              </div>
            </div>
            <div class="pity__summaryCards">${overviewHtml}</div>
          </section>

          <section class="pity__card">
            <div class="pity__sectionHead">
              <div>
                <h2 class="pity__h2">Pity Details</h2>
                <div class="pity__help">Bieżący pity, następny 5★ i status dla każdej sekcji.</div>
              </div>
            </div>
            <div class="pity__tableWrap">
              <table class="pity__table">
                <thead>
                  <tr>
                    <th>Banner</th>
                    <th>Current Pity</th>
                    <th>Next 5★</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>${nextOverviewRows}</tbody>
              </table>
            </div>
          </section>

          <section class="pity__card">
            <div class="pity__sectionHead">
              <div>
                <h2 class="pity__h2">Pity History (All Banners)</h2>
                <div class="pity__help">Oś czasu 5★ ze wszystkich sekcji w nowym layoucie.</div>
              </div>
            </div>
            <div class="pity__tableWrap pity__summaryTimeline">
              <table class="pity__table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Banner</th>
                    <th>Name</th>
                    <th>Pity</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>${summaryTimelineRows}</tbody>
              </table>
            </div>
          </section>
        </div>

        <aside class="pity__sideStack">
          <section class="pity__card pity__sideCard">
            <div class="pity__sideKicker">Next 5★ Overview</div>
            <div class="pity__sideText">Char average pity: ${sChar.avg != null ? fmt1(sChar.avg) : "—"}</div>
            <div class="pity__sideMeta">
              ${metricRow("Weapon average pity", sWp.avg != null ? fmt1(sWp.avg) : "—")}
              ${metricRow("Chronicled average pity", sChro.avg != null ? fmt1(sChro.avg) : "—")}
              ${metricRow("Standard average pity", sStd.avg != null ? fmt1(sStd.avg) : "—")}
            </div>
          </section>

          <section class="pity__card pity__sideCard">
            <div class="pity__sectionHead">
              <div class="pity__sideKicker">Recent 5★ Pulls</div>
              <span class="pity__mutedLabel">${fmtNum(sAll.count)}</span>
            </div>
            <div class="pity__dropList">${recentPulls}</div>
          </section>

          <section class="pity__card pity__sideCard">
            <div class="pity__sideKicker">Overall Statistics</div>
            <div class="pity__sideMeta">
              ${metricRow("Tracked 5★", fmtNum(sAll.count))}
              ${metricRow("Average pity", sAll.avg != null ? fmt1(sAll.avg) : "—")}
              ${metricRow("Best pity", sAll.best != null ? fmt1(sAll.best) : "—")}
              ${metricRow("Worst pity", sAll.worst != null ? fmt1(sAll.worst) : "—")}
              ${metricRow("Character win rate", winRate(charRows))}
            </div>
          </section>

          <section class="pity__card pity__sideCard">
            <div class="pity__sideKicker">Pity Calculator</div>
            <p class="pity__sideText">Edytor danych i obecny kalkulator nie znikają. Są po prostu schowane pod spodem, żeby główny widok był bliższy makietom.</p>
            <div class="pity__showcaseActions">
              <button class="pity__btn pity__btn--primary" data-open-editor="char" type="button">Otwórz kalkulator</button>
            </div>
          </section>
        </aside>
      </div>
    `;
  }

  function renderDashboards(){
    try{
      renderBannerDashboard("char");
      renderBannerDashboard("wp");
      renderBannerDashboard("chro");
      renderBannerDashboard("std");
      renderSummaryDashboard();
      applyAutoThumbRatios();
    }catch(error){
      const target = document.getElementById("charDashboard");
      if(target){
        target.innerHTML = `<div class="pity__card"><pre style="white-space:pre-wrap;margin:0">${escapeHtml(error && (error.stack || error.message || String(error)))}</pre></div>`;
      }
    }
  }

  // ===== Save / Load state =====
  function buildState(){
    return {
      char:{
        rows: readRows(document.getElementById("charRows")),
        current: document.getElementById("charCurrentPity").value,
        fifty: document.getElementById("char50").value,
        target: document.getElementById("charTarget").value,
        base: document.getElementById("charBase").value,
        soft: document.getElementById("charSoft").value,
        hard: document.getElementById("charHard").value
      },
      wp:{
        rows: readRows(document.getElementById("wpRows")),
        current: document.getElementById("wpCurrentPity").value,
        fate: document.getElementById("wpFate").value,
        autoFate: !!document.getElementById("wpAutoFate").checked,
        target: document.getElementById("wpTarget").value,
        base: document.getElementById("wpBase").value,
        soft: document.getElementById("wpSoft").value,
        hard: document.getElementById("wpHard").value,
        featured: document.getElementById("wpFeatured").value,
        split: document.getElementById("wpSplit").value
      },
      chro:{
        rows: readRows(document.getElementById("chroRows")),
        current: document.getElementById("chroCurrentPity").value,
        fate: document.getElementById("chroFate").value,
        autoFate: !!document.getElementById("chroAutoFate").checked,
        target: document.getElementById("chroTarget").value,
        base: document.getElementById("chroBase").value,
        soft: document.getElementById("chroSoft").value,
        hard: document.getElementById("chroHard").value,
        featured: document.getElementById("chroFeatured").value,
        split: document.getElementById("chroSplit").value
      },
      std:{
        rows: readRows(document.getElementById("stdRows")),
        current: document.getElementById("stdCurrentPity").value,
        base: document.getElementById("stdBase").value,
        soft: document.getElementById("stdSoft").value,
        hard: document.getElementById("stdHard").value
      }
    };
  }

  async function saveState(){
    const data = buildState();
    await kvSet(KV_KEY, data);
  }

  async function loadState(){
    // 1) IDB
    let d = await kvGet(KV_KEY);

    // 2) legacy localStorage (jeśli migrator nie poleciał / użytkownik odpalił pity samodzielnie)
    if(!d){
      try{
        const raw = localStorage.getItem(LEGACY_LS_KEY);
        if(raw) d = JSON.parse(raw);
      }catch(e){}
    }

    if(!d || typeof d !== "object") return;

    // CHAR
    if(d.char){
      const tb = document.getElementById("charRows");
      tb.innerHTML = "";
      (d.char.rows||[]).forEach(r=> addRow(tb, r.name, r.pity==null?"Nieznane":r.pity, r.result||"", r.obtainedAt||null));
      document.getElementById("charCurrentPity").value = d.char.current || 0;
      document.getElementById("char50").value = d.char.fifty || "auto";
      document.getElementById("charTarget").value = d.char.target || "";
      document.getElementById("charBase").value = d.char.base || 0.006;
      document.getElementById("charSoft").value = d.char.soft || 74;
      document.getElementById("charHard").value = d.char.hard || 90;
    }

    // WP
    if(d.wp){
      const tb = document.getElementById("wpRows");
      tb.innerHTML = "";
      (d.wp.rows||[]).forEach(r=> addRow(tb, r.name, r.pity==null?"Nieznane":r.pity, r.result||"", r.obtainedAt||null));
      document.getElementById("wpCurrentPity").value = d.wp.current || 0;
      document.getElementById("wpFate").value = d.wp.fate || 0;
      document.getElementById("wpAutoFate").checked = !!d.wp.autoFate;
      document.getElementById("wpTarget").value = d.wp.target || "";
      document.getElementById("wpBase").value = d.wp.base || 0.007;
      document.getElementById("wpSoft").value = d.wp.soft || 63;
      document.getElementById("wpHard").value = d.wp.hard || 80;
      document.getElementById("wpFeatured").value = d.wp.featured || 0.75;
      document.getElementById("wpSplit").value = d.wp.split || 0.5;
    }

    // CHRO
    if(d.chro){
      const tb = document.getElementById("chroRows");
      tb.innerHTML = "";
      (d.chro.rows||[]).forEach(r=> addRow(tb, r.name, r.pity==null?"Nieznane":r.pity, r.result||"", r.obtainedAt||null));
      document.getElementById("chroCurrentPity").value = d.chro.current || 0;
      document.getElementById("chroFate").value = d.chro.fate || 0;
      document.getElementById("chroAutoFate").checked = !!d.chro.autoFate;
      document.getElementById("chroTarget").value = d.chro.target || "";
      document.getElementById("chroBase").value = d.chro.base || 0.007;
      document.getElementById("chroSoft").value = d.chro.soft || 63;
      document.getElementById("chroHard").value = d.chro.hard || 80;
      document.getElementById("chroFeatured").value = d.chro.featured || 0.75;
      document.getElementById("chroSplit").value = d.chro.split || 0.5;
    }

    // STD
    if(d.std){
      const tb = document.getElementById("stdRows");
      tb.innerHTML = "";
      (d.std.rows||[]).forEach(r=> addRow(tb, r.name, r.pity==null?"Nieznane":r.pity, "", r.obtainedAt||null));
      document.getElementById("stdCurrentPity").value = d.std.current || 0;
      document.getElementById("stdBase").value = d.std.base || 0.006;
      document.getElementById("stdSoft").value = d.std.soft || 74;
      document.getElementById("stdHard").value = d.std.hard || 90;
    }
  }

  function scheduleSaveAndSummary(){
    debounceSave(async ()=>{
      await saveState();
      // lekkie odświeżenie wyników:
      calcChar();
      calcWeapon("wp");
      calcWeapon("chro");
      calcStandard();
      renderSummary();
      renderDashboards();
    }, 160);
  }

  // ===== Buttons: calc + import/export =====
  document.getElementById("charCalc").addEventListener("click", ()=>{
    calcChar(); renderSummary(); renderDashboards(); debounceSave(saveState, 0);
  });
  document.getElementById("wpCalc").addEventListener("click", ()=>{
    calcWeapon("wp"); renderSummary(); renderDashboards(); debounceSave(saveState, 0);
  });
  document.getElementById("chroCalc").addEventListener("click", ()=>{
    calcWeapon("chro"); renderSummary(); renderDashboards(); debounceSave(saveState, 0);
  });
  document.getElementById("stdCalc").addEventListener("click", ()=>{
    calcStandard(); renderSummary(); renderDashboards(); debounceSave(saveState, 0);
  });

  document.getElementById("btnExport").addEventListener("click", async ()=>{
    const data = buildState();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "genshin_pity_data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById("btnImport").addEventListener("click", ()=>{
    document.getElementById("fileImport").click();
  });

  document.getElementById("fileImport").addEventListener("change", async (ev)=>{
    const file = ev.target.files && ev.target.files[0];
    if(!file) return;
    const text = await file.text();
    try{
      const parsed = JSON.parse(text);
      await kvSet(KV_KEY, parsed);
      await loadState();
      calcChar();
      calcWeapon("wp");
      calcWeapon("chro");
      calcStandard();
      renderSummary();
      renderDashboards();
    }catch(e){
      alert("Nie udało się wczytać pliku JSON");
    }finally{
      ev.target.value = "";
    }
  });

  document.addEventListener("click", (event)=>{
    const calcBtn = event.target.closest("[data-run-calc]");
    if(calcBtn){
      const prefix = calcBtn.getAttribute("data-run-calc");
      if(prefix === "char") calcChar();
      if(prefix === "wp") calcWeapon("wp");
      if(prefix === "chro") calcWeapon("chro");
      if(prefix === "std") calcStandard();
      renderSummary();
      renderDashboards();
      debounceSave(saveState, 0);
      return;
    }

    const openBtn = event.target.closest("[data-open-editor]");
    if(openBtn){
      const prefix = openBtn.getAttribute("data-open-editor");
      const panelId = prefix === "wp"
        ? "panel-weapon"
        : prefix === "chro"
          ? "panel-chro"
          : prefix === "std"
            ? "panel-standard"
            : "panel-char";
      const details = document.querySelector(`#${panelId} .pity__editorShell`);
      if(details){
        details.open = true;
        details.scrollIntoView({behavior: "smooth", block: "start"});
      }
    }
  });

  // ===== Init =====
  async function init(){
    try{
      // jeżeli nic nie ma, startowo dodaj 1 pusty wiersz w każdej tabeli (bardziej “gotowe do użycia”)
      await loadState();

      if(document.getElementById("charRows").children.length === 0) addRow(document.getElementById("charRows"), "", "", "", null);
      if(document.getElementById("wpRows").children.length === 0) addRow(document.getElementById("wpRows"), "", "", "", null);
      if(document.getElementById("chroRows").children.length === 0) addRow(document.getElementById("chroRows"), "", "", "", null);
      if(document.getElementById("stdRows").children.length === 0) addRow(document.getElementById("stdRows"), "", "", "", null);

      // przelicz na starcie
      calcChar();
      calcWeapon("wp");
      calcWeapon("chro");
      calcStandard();
      renderSummary();
      renderDashboards();

      // zapisz po init (żeby IDB miało aktualny format)
      debounceSave(saveState, 0);
    }catch(error){
      const target = document.getElementById("charDashboard");
      if(target){
        target.innerHTML = `<div class="pity__card"><pre style="white-space:pre-wrap;margin:0">${escapeHtml(error && (error.stack || error.message || String(error)))}</pre></div>`;
      }
    }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})();
