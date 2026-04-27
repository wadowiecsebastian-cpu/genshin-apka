/* App logic (no modules). Uses: IDB, MATERIALS, CHARACTER_COSTS */

(function(){
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  /* ---------- TABs ---------- */
  $$('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $$('.tab').forEach(s=>s.classList.remove('active'));
      $('#tab-'+tab).classList.add('active');
    });
  });

  /* ---------- Character Progress ---------- */
  /* ---------- Dni książek: ustalenie dzisiejszego dnia (EN) + filtr ---------- */
  const TODAY_EN = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  let FILTER_TODAY = false;
  const filterTodayEl = document.querySelector('#filter-today');
  if (filterTodayEl){
    FILTER_TODAY = !!filterTodayEl.checked;
    filterTodayEl.addEventListener('change', ()=>{
      FILTER_TODAY = !!filterTodayEl.checked;
      renderProgress();
    });
  }

  // Helper: status farmienia książek w danym dniu
  function getBookFarmStatus(item){
    // interesują nas tylko materiały typu "books"
    if (!item || item._type !== 'books') return null;

    const grp = (item.group || '').toLowerCase();

    // BOOK_GROUP_DAYS jest zdefiniowane w materials.js
    const days = (typeof BOOK_GROUP_DAYS !== 'undefined' && BOOK_GROUP_DAYS[grp])
      ? BOOK_GROUP_DAYS[grp]
      : null;

    if (!days) return null;

    const farmable = days.includes(TODAY_EN);
    return { farmable, days };
  }

  // Helper: tworzy gotowy element <span> z zielonym ptaszkiem / czerwonym X
  function createBookFarmIndicator(item){
    const status = getBookFarmStatus(item);
    if (!status) return null;

    const span = document.createElement('span');
    span.className = 'farm-indicator ' +
      (status.farmable ? 'farm-indicator--ok' : 'farm-indicator--bad');
    span.textContent = status.farmable ? '✔' : '✖';
    span.title = status.farmable
      ? `Farmable today (${status.days.join(', ')})`
      : `Not farmable today (${status.days.join(', ')})`;
    return span;
  }

  const PROGRESS_STORE = 'progress';

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

  function normalizeLevelCur(row){
    const val = parseInt(row?.levelCur, 10);
    return LEVEL_MILESTONES.includes(val) ? val : fallbackLevelCur(row);
  }

  function normalizeLevelTarget(row){
    const val = parseInt(row?.levelTarget, 10);
    return LEVEL_MILESTONES.includes(val) ? val : fallbackLevelTarget(row);
  }

  let FILTER_ELEMENT = '';
  const INVENTORY_STORE = 'inventory';
  const progressBody = $('#progress-body');
  
  // === Bulk targets ===
    async function applyBulkTargets(){
      const ascSel   = document.getElementById('bulk-asc');
      const naSel    = document.getElementById('bulk-na');
      const skillSel = document.getElementById('bulk-skill');
      const burstSel = document.getElementById('bulk-burst');
      const scopeSel = document.getElementById('bulk-scope');

      if(!ascSel || !naSel || !skillSel || !burstSel || !scopeSel) return;

      const ascVal   = ascSel.value === '' ? null : parseInt(ascSel.value,10);
      const naVal    = naSel.value === '' ? null : parseInt(naSel.value,10);
      const skillVal = skillSel.value === '' ? null : parseInt(skillSel.value,10);
      const burstVal = burstSel.value === '' ? null : parseInt(burstSel.value,10);
      const scope    = scopeSel.value || 'visible';

      // Load rows
      let rows = await IDB.all(PROGRESS_STORE) || [];

      // Determine target set
      let targetRows = rows;
      if(scope === 'visible'){
        // apply current filters
        targetRows = rows;
        if (typeof FILTER_TODAY !== 'undefined' && FILTER_TODAY){
          targetRows = targetRows.filter(r => {
            const days = (CHARACTER_COSTS[r.character]?.bookDays)||[];
            return days.includes(TODAY_EN);
          });
        }
        if (typeof FILTER_ELEMENT !== 'undefined' && FILTER_ELEMENT){
          targetRows = targetRows.filter(r => (r.element||'') === FILTER_ELEMENT);
        }
      }

      // Update rows
      const toSave = new Map(rows.map(r=>[r.id, r]));
      for(const r of targetRows){
        if (ascVal   !== null) r.ascTarget   = ascVal;
        if (naVal    !== null) r.naTarget    = naVal;
        if (skillVal !== null) r.skillTarget = skillVal;
        if (burstVal !== null) r.burstTarget = burstVal;
        toSave.set(r.id, r);
      }

      // Persist
      for (const r of toSave.values()){
        await IDB.put(PROGRESS_STORE, r);
      }

      // Rerender
      await renderProgress();
      await renderGlobalDemand();
    }

    document.addEventListener('DOMContentLoaded', ()=>{
      const btn = document.getElementById('bulk-apply');
      if(btn) btn.addEventListener('click', applyBulkTargets);
    });
$('#add-row').addEventListener('click', addProgressRow);
  $('#clear-progress').addEventListener('click', async ()=>{
    const keys = await IDB.keys(PROGRESS_STORE) || [];
    await Promise.all(keys.map(k=>IDB.del(PROGRESS_STORE,k)));
    renderProgress();
    renderGlobalDemand();
  });

  function sortedCharacterNames(){
    return Object.keys(CHARACTER_COSTS)
      .sort((a,b)=>a.localeCompare(b,'pl',{sensitivity:'base'}));
  }

  function newRowData(){
    const defaultChar = sortedCharacterNames()[0] || 'Aino';
    return {
      id: 'row_'+Math.random().toString(36).slice(2),
      character: defaultChar,
      element: CHARACTER_COSTS[defaultChar]?.element || '',
      levelCur: 1, levelTarget: 90,
      ascCur: 0, ascTarget: 6,
      naCur: 1, naTarget: 10,
      skillCur: 1, skillTarget: 10,
      burstCur: 1, burstTarget: 10,
      notes: ''
    };
  }

  function characterImagePath(name){
    // Obrazki: images/characters/<Imię>.png
    // Fallback: jeśli plik nie istnieje, chowamy <img>.
    return `images/characters/${name}.png`;
  }

  async function addProgressRow(){
    const row = newRowData();
    await IDB.put(PROGRESS_STORE, row);
    renderProgress();
    renderGlobalDemand();
  }

  async function renderProgress(){
    const rows = await IDB.all(PROGRESS_STORE) || [];
    // sortowanie wierszy tabeli po nazwie postaci
    rows.sort((a,b)=> (a.character||'').localeCompare(b.character||'', 'pl', {sensitivity:'base'}));
    // Mini-filtr: pokaż tylko postacie z farmą dziś
    let rowsFiltered = FILTER_TODAY ? rows.filter(r => {
      const days = (CHARACTER_COSTS[r.character]?.bookDays)||[];
      return days.includes(TODAY_EN);
    }) : rows;

    // Filtr wg Elementu (jeśli wybrano)
    if(FILTER_ELEMENT){ rowsFiltered = rowsFiltered.filter(r => (r.element||'') === FILTER_ELEMENT); }

    progressBody.innerHTML = '';
    // sortowanie listy opcji w selekcie postaci
    const charNames = sortedCharacterNames();

    rowsFiltered.forEach(async (row)=>{
      const tr = document.createElement('tr');

      // === Character (miniatura + select) ===
      const tdChar = document.createElement('td');

      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '8px';

      const link = document.createElement('a');
      link.href = `character.html?row=${row.id}`;
      link.title = 'Open character view';

      const avatar = document.createElement('img');
      avatar.alt = row.character;
      avatar.width = 32;
      avatar.height = 32;
      avatar.style.width = '32px';
      avatar.style.height = '32px';
      avatar.style.borderRadius = '8px';
      avatar.style.border = '1px solid var(--border)';
      avatar.style.objectFit = 'cover';
      avatar.src = characterImagePath(row.character);
      avatar.onerror = ()=>{ avatar.style.display='none'; };

      const sel = document.createElement('select');
      charNames.forEach(n=>{
        const opt = document.createElement('option');
        opt.value=n; opt.textContent=n; if(n===row.character) opt.selected=true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', async ()=>{
        row.character = sel.value;
        row.element = CHARACTER_COSTS[row.character]?.element || '';
        avatar.src = characterImagePath(row.character);
        avatar.style.display = ''; // spróbuj ponownie pokazać
        await IDB.put(PROGRESS_STORE,row);
        renderProgress(); // odśwież, by ujednolicić wiersz (np. zmiana elementu)
        renderGlobalDemand();
      });

      link.appendChild(avatar);
      wrap.append(link, sel); // zamiast wrap.append(avatar, sel);
      tdChar.appendChild(wrap);
      tr.appendChild(tdChar);

      // Element (auto, ale edytowalny)
      tr.appendChild(cellInput(row,'element','text'));

      row.levelCur = normalizeLevelCur(row);
      row.levelTarget = normalizeLevelTarget(row);

      // ---------- Level ----------
      const tdLevelCur    = cellSelectList(row, 'levelCur', LEVEL_MILESTONES);
      const tdLevelTarget = cellSelectList(row, 'levelTarget', LEVEL_MILESTONES);
      tr.appendChild(tdLevelCur);
      tr.appendChild(tdLevelTarget);

      // ---------- Ascensions ----------
      const tdAscCur    = cellSelectNumber(row,'ascCur',0,6);
      const tdAscTarget = cellSelectNumber(row,'ascTarget',0,6);
      tr.appendChild(tdAscCur);
      tr.appendChild(tdAscTarget);

      // ---------- Talents ----------
      const tdNaCur     = cellSelectNumber(row,'naCur',1,10);
      const tdNaTarget  = cellSelectNumber(row,'naTarget',1,10);
      tr.appendChild(tdNaCur);
      tr.appendChild(tdNaTarget);

      const tdSkillCur   = cellSelectNumber(row,'skillCur',1,10);
      const tdSkillTgt   = cellSelectNumber(row,'skillTarget',1,10);
      tr.appendChild(tdSkillCur);
      tr.appendChild(tdSkillTgt);

      const tdBurstCur   = cellSelectNumber(row,'burstCur',1,10);
      const tdBurstTgt   = cellSelectNumber(row,'burstTarget',1,10);
      tr.appendChild(tdBurstCur);
      tr.appendChild(tdBurstTgt);

      // --- referencje do inputów ---
      const $levelCur    = tdLevelCur.querySelector('input, select');
      const $levelTarget = tdLevelTarget.querySelector('input, select');

      const $ascCur    = tdAscCur.querySelector('input, select');
      const $ascTarget = tdAscTarget.querySelector('input, select');

      const $naCur     = tdNaCur.querySelector('input, select');
      const $naTarget  = tdNaTarget.querySelector('input, select');

      const $skillCur  = tdSkillCur.querySelector('input, select');
      const $skillTgt  = tdSkillTgt.querySelector('input, select');

      const $burstCur  = tdBurstCur.querySelector('input, select');
      const $burstTgt  = tdBurstTgt.querySelector('input, select');

      // --- helper: kolorowanie par (Cur/Target) ---
      function paintPair(tdCur, tdTgt, curInput, tgtInput){
        const cv = parseInt(curInput.value || 0, 10);
        const tv = parseInt(tgtInput.value || 0, 10);
        const equal = (cv === tv);

        const shadow = equal
          ? 'inset 0 0 0 2px var(--ok)'
          : 'inset 0 0 0 2px var(--bad)';

        const bgOk  = 'color-mix(in srgb, var(--ok) 15%, transparent)';
        const bgBad = 'color-mix(in srgb, var(--bad) 15%, transparent)';

        function applyBG(td, wantOk){
          const desired = wantOk ? bgOk : bgBad;
          td.style.background = desired;
          const applied = td.style.background;
          if (!applied || applied === '') {
            td.style.background = wantOk
              ? 'rgba(54, 179, 126, 0.12)'
              : 'rgba(220, 53, 69, 0.14)';
          }
        }

        [tdCur, tdTgt].forEach(td=>{
          td.style.boxShadow   = shadow;
          td.style.borderRadius = '8px';
        });

        applyBG(tdCur,  equal);
        applyBG(tdTgt,  equal);
      }
      
      function refreshAllPaint(){
        paintPair(tdLevelCur, tdLevelTarget, $levelCur, $levelTarget);
        paintPair(tdAscCur, tdAscTarget, $ascCur, $ascTarget);
        paintPair(tdNaCur,  tdNaTarget,  $naCur,  $naTarget);
        paintPair(tdSkillCur, tdSkillTgt, $skillCur, $skillTgt);
        paintPair(tdBurstCur, tdBurstTgt, $burstCur, $burstTgt);
      }

      // --- funkcja pomocnicza do klamrowania pary (cur<=target) ---
      async function enforcePair(curInput, tgtInput, curKey, tgtKey, minCur, maxTgt) {
        curInput.min = String(minCur);
        curInput.max = String(parseInt(tgtInput.value || minCur, 10));

        tgtInput.min = String(minCur);
        tgtInput.max = String(maxTgt);

        let curVal = parseInt(curInput.value || minCur, 10);
        let tgtVal = parseInt(tgtInput.value || minCur, 10);
        if (curVal > tgtVal) {
          curVal = tgtVal;
          curInput.value = String(curVal);
          row[curKey] = curVal;
          await IDB.put(PROGRESS_STORE, row);
          renderGlobalDemand();
        }
      }

      await enforcePair($levelCur, $levelTarget, 'levelCur', 'levelTarget', 1, 90);
      await enforcePair($ascCur,  $ascTarget, 'ascCur',  'ascTarget', 0,  6);
      await enforcePair($naCur,   $naTarget,  'naCur',   'naTarget',  1, 10);
      await enforcePair($skillCur,$skillTgt,  'skillCur','skillTarget',1,10);
      await enforcePair($burstCur,$burstTgt,  'burstCur','burstTarget',1,10);
      refreshAllPaint();

      $levelTarget.addEventListener('change', async ()=>{
        await enforcePair($levelCur, $levelTarget, 'levelCur', 'levelTarget', 1, 90);
        refreshAllPaint();
      });

      $ascTarget.addEventListener('change', async ()=>{
        await enforcePair($ascCur, $ascTarget, 'ascCur','ascTarget',0,6);
        refreshAllPaint();
      });
      $naTarget.addEventListener('change', async ()=>{
        await enforcePair($naCur, $naTarget, 'naCur','naTarget',1,10);
        refreshAllPaint();
      });
      $skillTgt.addEventListener('change', async ()=>{
        await enforcePair($skillCur,$skillTgt,'skillCur','skillTarget',1,10);
        refreshAllPaint();
      });
      $burstTgt.addEventListener('change', async ()=>{
        await enforcePair($burstCur,$burstTgt,'burstCur','burstTarget',1,10);
        refreshAllPaint();
      });

      [$levelCur,$ascCur,$naCur,$skillCur,$burstCur].forEach(inp=>{
        inp.addEventListener('change', refreshAllPaint);
      });

      {
      const td = document.createElement('td');
      const days = (CHARACTER_COSTS[row.character]?.bookDays)||[];
      td.textContent = days.length ? days.join(', ') : '—';
      tr.appendChild(td);
    }

      const tdActions = document.createElement('td');
      tdActions.className='row-actions';
      const del = document.createElement('button');
      del.textContent='Delete';
      del.addEventListener('click', async ()=>{
        await IDB.del(PROGRESS_STORE, row.id);
        renderProgress();
        renderGlobalDemand();
      });
      tdActions.appendChild(del);
      tr.appendChild(tdActions);

      progressBody.appendChild(tr);
    });
  }

  
function cellSelectNumber(row, field, min, max){
    const td = document.createElement('td');
    const select = document.createElement('select');
    for(let v=min; v<=max; v++){
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.textContent = String(v);
      if ((row[field] ?? '') === v || String(row[field] ?? '') === String(v)) opt.selected = true;
      select.appendChild(opt);
    }
    // Fallback if value is empty/null -> pick min
    if(!select.value) select.value = String(row[field] ?? min);

    select.addEventListener('change', async ()=>{
      let val = parseInt(select.value, 10);
      // clamp defensively
      if(Number.isFinite(min)) val = Math.max(min, val);
      if(Number.isFinite(max)) val = Math.min(max, val);
      row[field] = val;
      await IDB.put(PROGRESS_STORE, row);
      renderGlobalDemand();
    });
    td.appendChild(select);
    return td;
  }

  function cellSelectList(row, field, values){
    const td = document.createElement('td');
    const select = document.createElement('select');

    values.forEach(v=>{
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.textContent = String(v);
      if (String(row[field] ?? '') === String(v)) opt.selected = true;
      select.appendChild(opt);
    });

    if(!select.value && values.length) {
      select.value = String(values[0]);
    }

    select.addEventListener('change', async ()=>{
      row[field] = parseInt(select.value, 10);
      await IDB.put(PROGRESS_STORE, row);
      renderGlobalDemand();
    });

    td.appendChild(select);
    return td;
  }

  function cellInput(row, field, type='text', min=null, max=null){
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = type;
    input.value = row[field] ?? '';
    if(min!==null) input.min=min;
    if(max!==null) input.max=max;
    input.addEventListener('change', async ()=>{
      let val = (type==='number') ? (parseInt(input.value||0,10)) : input.value;
      if(type==='number'){
        if(min!==null) val = Math.max(min, val);
        if(max!==null) val = Math.min(max, val);
      }
      row[field] = val;
      await IDB.put(PROGRESS_STORE,row);
      renderGlobalDemand();
    });
    td.appendChild(input);
    return td;
  }

  /* ---------- Inventory (cards + filters) ---------- */
  const invGrid = $('#inventory-cards');
  const invFilter = $('#inv-filter');
  const invSearch = $('#inv-search');
  const invReset  = $('#inv-reset');

  const invUsedByCharsBtn = $('#inv-used-by-chars');
  let INV_ONLY_DATA_CHARS = false;

  invFilter.addEventListener('change', renderInventory);
  invSearch.addEventListener('input', renderInventory);
  invReset.addEventListener('click', ()=>{ invFilter.value='all'; invSearch.value=''; renderInventory(); });

  if (invUsedByCharsBtn) {
    invUsedByCharsBtn.addEventListener('click', () => {
      INV_ONLY_DATA_CHARS = !INV_ONLY_DATA_CHARS;
      invUsedByCharsBtn.classList.toggle('active', INV_ONLY_DATA_CHARS);
      renderInventory();
    });
  }

  async function getInventoryCount(key){
    return await IDB.get(INVENTORY_STORE, key) ?? 0;
  }
  async function setInventoryCount(key, val){
    await IDB.set(INVENTORY_STORE, key, val);
  }

  function flatMaterials(filterType='all'){
    const out=[];
    Object.entries(MATERIALS).forEach(([groupKey,def])=>{
      if(filterType!=='all' && filterType!==groupKey) return;
      (def.items||[]).forEach(it=> out.push({...it, _type:groupKey, _groupLabel:def.groupLabel}));
    });
    return out;
  }

  // --- anty-duplikacja: wersja renderu Inventory ---
  let INV_RENDER_VERSION = 0;

  async function renderInventory(){
    const type = invFilter.value;
    const q = invSearch.value.trim().toLowerCase();
    let items = flatMaterials(type).filter(it=>{
      return !q || it.name.toLowerCase().includes(q) || it.key.toLowerCase().includes(q);
    });

    // [NOWE] jeśli włączony filtr „tylko z characterData.js”
    if (INV_ONLY_DATA_CHARS) {
      // weź listę postaci z characterData.js
      const dataChars = new Set(Object.keys(window.characterData || {}));

      // i przefiltruj tylko te materiały, które w USAGE_INDEX mają kogoś z powyższej listy
      items = items.filter(it => {
        const usedBy = (USAGE_INDEX && USAGE_INDEX[it.key]) ? USAGE_INDEX[it.key] : [];
        return usedBy.some(name => dataChars.has(name));
      });
    }

    const myV = ++INV_RENDER_VERSION; // „token” dla tej instancji renderu

    // Pobierz liczniki w 1 przebiegu – żeby skrócić okno na reentrancy
    const counts = await Promise.all(items.map(it=> getInventoryCount(it.key)));

    // Jeśli w międzyczasie uruchomiono nowszy render – przerwij bez dotykania DOM
    if (myV !== INV_RENDER_VERSION) return;

    const frag = document.createDocumentFragment();

    const showTypeInHeader = (type === "all");
    const prettyGroup = (it)=>{
      const g = (it.group || "").toString();
      if (!g) return it._groupLabel || "Group";
      return g.replace(/[_-]+/g," ").trim();
    };

    let lastGroupId = null;
    let currentBlock = null;
    let currentGrid = null;

    items.forEach((it, idx)=>{
      const groupId = `${it._type}__${it.group || ""}`;

      if (groupId !== lastGroupId){
        currentBlock = document.createElement("div");
        currentBlock.className = "group-block";

        const head = document.createElement("div");
        head.className = "group-head";

        const title = document.createElement("div");
        title.className = "title";
        title.textContent = showTypeInHeader
          ? `${it._groupLabel} • ${prettyGroup(it)}`
          : prettyGroup(it);

        head.appendChild(title);

        currentGrid = document.createElement("div");
        currentGrid.className = "card-grid";

        currentBlock.appendChild(head);
        currentBlock.appendChild(currentGrid);

        frag.appendChild(currentBlock);
        lastGroupId = groupId;
      }

      const count = counts[idx] ?? 0;

      currentGrid.appendChild(
        invCard(it, count, async (delta)=>{
          const now = Math.max(0, (await getInventoryCount(it.key)) + delta);
          await setInventoryCount(it.key, now);
          await renderInventory();     // to zainkrementuje INV_RENDER_VERSION
          await renderGlobalDemand();  // aktualizacja pasków
        })
      );
    });

    // Ponowny check przed modyfikacją DOM
    if (myV !== INV_RENDER_VERSION) return;

    invGrid.innerHTML = "";
    invGrid.appendChild(frag);
  }

  function invCard(it, count, onDelta){
    const card = document.createElement('div'); card.className='card';
    const img = document.createElement('img'); img.src=it.icon; img.alt=it.name;
    const meta = document.createElement('div'); meta.className='meta';

    const h4 = document.createElement('h4');
    h4.textContent = it.name;

    // zielony ptaszek / czerwony X dla książek
    const farmIndicator = createBookFarmIndicator(it);

    const badge = document.createElement('span'); badge.className='badge';
    badge.textContent = it._groupLabel + (it.tier?` • T${it.tier}`:'');
    
    const row = document.createElement('div'); row.className='row';


    const minus = document.createElement('button'); minus.textContent='−1';
    const plus  = document.createElement('button'); plus.textContent='+1';

    // Pole liczby (direct edit)
    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'numeric';
    input.min = '0';
    input.step = '1';
    input.value = String(count);
    input.style.width = '80px';
    input.style.textAlign = 'center';

    async function commitDirect(){
      let v = parseInt(input.value || '0', 10);
      if (Number.isNaN(v) || v < 0) v = 0;
      const current = parseInt(input.getAttribute('data-current') || String(count), 10);
      const delta = v - current;
      if (delta !== 0){
        await onDelta(delta);
      } else {
        input.value = String(current);
      }
    }
    input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ input.blur(); }});
    input.addEventListener('change', commitDirect);
    input.addEventListener('blur', commitDirect);

    minus.addEventListener('click', async ()=>{ await onDelta(-1); });
    plus .addEventListener('click', async ()=>{ await onDelta(+1); });

    queueMicrotask(()=>{ input.setAttribute('data-current', String(count)); input.value = String(count); });

    row.append(minus, input, plus);

    // wiersz z ikonką i badge’em (między nazwą a tierem)
    const subRow = document.createElement('div');
    subRow.className = 'meta-subrow';
    if (farmIndicator) subRow.appendChild(farmIndicator);
    subRow.appendChild(badge);

    meta.append(h4, subRow, row);
    card.append(img, meta);
    return card;
  }

  /* ---------- Global Materials Demand (cards + filters + sorting) ---------- */
  const globGrid   = $('#global-cards');
  const globFilter = $('#global-filter');
  const globSearch = $('#global-search');
  $('#global-recalc').addEventListener('click', renderGlobalDemand);
  globFilter.addEventListener('change', renderGlobalDemand);
  globSearch.addEventListener('input', renderGlobalDemand);

  const globUsedByCharsBtn = $('#global-used-by-chars');
  let GLOB_ONLY_DATA_CHARS = false;
  
  if (globUsedByCharsBtn) {
    globUsedByCharsBtn.addEventListener('click', () => {
      GLOB_ONLY_DATA_CHARS = !GLOB_ONLY_DATA_CHARS;
      globUsedByCharsBtn.classList.toggle('active', GLOB_ONLY_DATA_CHARS);
      renderGlobalDemand();
    });
  }

  // [NEW] Select sortowania
  let GLOB_SORT = 'default'; // 'default' | 'missing_desc' | 'missing_asc'
  (function injectGlobalSortControl(){
    const filters = $('#tab-global .panel-head .filters');
    if (!filters) return;
    const label = document.createElement('label');
    label.style.marginLeft = '8px';
    label.textContent = 'Sort by:';

    const sel = document.createElement('select');
    sel.id = 'global-sort';
    const opts = [
      {v:'default',       t:'Default'},
      {v:'missing_desc',  t:'Missing ↓ (Most)'},
      {v:'missing_asc',   t:'Missing ↑ (Least)'},
    ];
    opts.forEach(o=>{
      const op = document.createElement('option');
      op.value = o.v; op.textContent = o.t;
      sel.appendChild(op);
    });
    sel.value = GLOB_SORT;
    sel.addEventListener('change', ()=>{
      GLOB_SORT = sel.value;
      renderGlobalDemand();
    });

    filters.appendChild(label);
    filters.appendChild(sel);
  })();

  // --- anty-duplikacja: wersja renderu Global ---
  let GLOB_RENDER_VERSION = 0;

  async function renderGlobalDemand(){
    const rows = await IDB.all(PROGRESS_STORE) || [];
    const demand = computeDemand(rows);
    const type = globFilter.value;
    const q = globSearch.value.trim().toLowerCase();

    // najpierw podstawowa lista
    let baseItems = flatMaterials(type).filter(it=>{
      return !q || it.name.toLowerCase().includes(q) || it.key.toLowerCase().includes(q);
    });

    // [NOWE] jeśli włączony filtr „tylko z characterData.js”, odrzuć materiały
    // niezwiązane z postaciami, które naprawdę są w window.characterData
    if (GLOB_ONLY_DATA_CHARS) {
      const dataChars = new Set(Object.keys(window.characterData || {}));
      baseItems = baseItems.filter(it => {
        const usedBy = (USAGE_INDEX && USAGE_INDEX[it.key]) ? USAGE_INDEX[it.key] : [];
        return usedBy.some(name => dataChars.has(name));
      });
    }

    // a dopiero potem dorabiamy indeks
    baseItems = baseItems.map((it, idx)=> ({it, idx}));

    const myV = ++GLOB_RENDER_VERSION;

    // Pobieramy „have” hurtowo
    const haveArr = await Promise.all(baseItems.map(x=> getInventoryCount(x.it.key)));

    if (myV !== GLOB_RENDER_VERSION) return;

    // Przygotuj rekordy z missing do sortowania
    const records = baseItems.map((x, i)=>{
      const need = demand[x.it.key] ?? 0;
      const have = haveArr[i] ?? 0;
      const missing = Math.max(need - have, 0);
      const haveClamped = Math.min(have, need);
      const pct = need>0 ? Math.round((haveClamped/need)*100) : 0;
      return { it:x.it, idx:x.idx, need, have, missing, pct };
    });

    // [NEW] Sortowanie wg GLOB_SORT
    if (GLOB_SORT === 'missing_desc'){
      records.sort((a,b)=>{
        if (b.missing !== a.missing) return b.missing - a.missing;
        // tie-break: nazwa, potem oryginalna kolejność
        const byName = a.it.name.localeCompare(b.it.name, 'pl', {sensitivity:'base'});
        if (byName !== 0) return byName;
        return a.idx - b.idx;
      });
    } else if (GLOB_SORT === 'missing_asc'){
      records.sort((a,b)=>{
        if (a.missing !== b.missing) return a.missing - b.missing;
        const byName = a.it.name.localeCompare(b.it.name, 'pl', {sensitivity:'base'});
        if (byName !== 0) return byName;
        return a.idx - b.idx;
      });
    } // 'default' → bez zmian (oryginalna kolejność po filtrach)

    const frag = document.createDocumentFragment();

    const showTypeInHeader = (type === "all");
    const prettyGroup = (it)=>{
      const g = (it.group || "").toString();
      if (!g) return it._groupLabel || "Group";
      return g.replace(/[_-]+/g," ").trim();
    };

    let lastGroupId = null;
    let currentBlock = null;
    let currentGrid = null;

    records.forEach(r=>{
      const groupId = `${r.it._type}__${r.it.group || ""}`;

      if (groupId !== lastGroupId){
        // nowy blok grupy
        currentBlock = document.createElement("div");
        currentBlock.className = "group-block";

        const head = document.createElement("div");
        head.className = "group-head";

        const title = document.createElement("div");
        title.className = "title";
        title.textContent = showTypeInHeader
          ? `${r.it._groupLabel} • ${prettyGroup(r.it)}`
          : prettyGroup(r.it);

        head.appendChild(title);

        currentGrid = document.createElement("div");
        currentGrid.className = "card-grid";

        currentBlock.appendChild(head);
        currentBlock.appendChild(currentGrid);

        frag.appendChild(currentBlock);
        lastGroupId = groupId;
      }

      // karty do aktualnej grupy
      currentGrid.appendChild(globalCard(r.it, r.have, r.need, r.pct));
    });

    if (myV !== GLOB_RENDER_VERSION) return;

    globGrid.innerHTML = "";
    globGrid.appendChild(frag);
  }

  // === Reverse index: materiał -> lista postaci korzystających z niego (do tooltips)
  let USAGE_INDEX = null;
  function buildUsageIndex(){
    const index = {}; // key -> Set(names)

    const allItems = flatMaterials('all');
    const allKeys = new Set(allItems.map(i=>i.key));
    const keyExists = (k)=> !!k && allKeys.has(k);
    const firstExistingGemKey = (tier)=>{
      const it = (MATERIALS.gems?.items||[]).find(x=>x.tier===tier);
      return it?.key || null;
    };
    const gemKey = (element, tier)=>{
      const map = {
        Pyro:['gem_pyro_t1','gem_pyro_t2','gem_pyro_t3','gem_pyro_t4'],
        Hydro:['gem_hydro_t1','gem_hydro_t2','gem_hydro_t3','gem_hydro_t4'],
        Cryo:['gem_cryo_t1','gem_cryo_t2','gem_cryo_t3','gem_cryo_t4'],
        Electro:['gem_electro_t1','gem_electro_t2','gem_electro_t3','gem_electro_t4'],
        Anemo:['gem_anemo_t1','gem_anemo_t2','gem_anemo_t3','gem_anemo_t4'],
        Geo:['gem_geo_t1','gem_geo_t2','gem_geo_t3','gem_geo_t4'],
        Dendro:['gem_dendro_t1','gem_dendro_t2','gem_dendro_t3','gem_dendro_t4'],
      };
      const arr = map[element] || [];
      const k = arr[tier-1];
      if (keyExists(k)) return k;
      return firstExistingGemKey(tier);
    };
    const enemyKey = (group, tier)=>{
      const k = `enemy_${group}_t${tier}`;
      return keyExists(k) ? k : null;
    };
    const bookKey = (family, tier)=>{
      const k = `book_${family}_t${tier}`;
      if (keyExists(k)) return k;
      const it = (MATERIALS.books?.items||[]).find(x=>x.tier===tier);
      return it?.key || null;
    };
    const findLocalKey = (nameKey)=>{
      const it = (MATERIALS.local?.items||[]).find(i=>i.key===nameKey);
      return it?.key || null;
    };
    const ensureExistsKey = (k)=> keyExists(k) ? k : null;

    const addUse = (key, who)=>{
      if(!key) return;
      if(!index[key]) index[key] = new Set();
      index[key].add(who);
    };

    Object.entries(CHARACTER_COSTS).forEach(([name, c])=>{
      (c.asc||[]).forEach(step=>{
        for(let t=1;t<=4;t++){
          const n = step.gems?.['t'+t]||0;
          if(n>0){ const k = gemKey(c.element, t); addUse(k, name); }
        }
        for(let t=1;t<=3;t++){
          const n = step.enemy?.['t'+t]||0;
          if(n>0){ const k = enemyKey(c.picks.enemiesAsc, t); addUse(k, name); }
        }
        if((step.local||0)>0){ const k = findLocalKey(c.picks.local); addUse(k, name); }
        if((step.boss||0)>0){ const k = ensureExistsKey(c.picks.bossNormal); addUse(k, name); }
      });

      (c.tal||[]).forEach(step=>{
        for(let t=1;t<=3;t++){
          const nb = step.books?.['t'+t]||0; if(nb>0){ const k = bookKey(c.picks.books, t); addUse(k, name); }
          const ne = step.enemy?.['t'+t]||0; if(ne>0){ const k = enemyKey(c.picks.enemiesTal, t); addUse(k, name); }
        }
        if((step.weekly||0)>0){ const k = ensureExistsKey(c.picks.bossWeekly); addUse(k, name); }
      });

      (LEVEL_UP_COSTS || []).forEach(step=>{
        if ((step.hero || 0) > 0) addUse('levelup_hero_wit', name);
        if ((step.adventurer || 0) > 0) addUse('levelup_adventurer_experience', name);
        if ((step.wanderer || 0) > 0) addUse('levelup_wanderers_advice', name);
      });
    });

    const out = {};
    Object.keys(index).forEach(k=>{
      out[k] = Array.from(index[k]).sort((a,b)=>a.localeCompare(b,'pl',{sensitivity:'base'}));
    });
    USAGE_INDEX = out;
  }

  function globalCard(it, have, need, pct){
    const card = document.createElement('div'); card.className='card';
    const img = document.createElement('img'); img.src=it.icon; img.alt=it.name;

    // Tooltip: lista postaci korzystających z materiału
    const usedBy = (USAGE_INDEX?.[it.key] || []);
    if (usedBy.length){
      img.title = `Used by: ${usedBy.join(', ')}`;
      img.setAttribute('aria-label', img.title);
    } else {
      img.title = 'Used by: —';
      img.setAttribute('aria-label', img.title);
    }

    const meta = document.createElement('div'); meta.className='meta';
    const h4 = document.createElement('h4');
    h4.textContent = it.name;

    // zielony ptaszek / czerwony X dla książek
    const farmIndicator = createBookFarmIndicator(it);

    const badge = document.createElement('span'); badge.className='badge';
    badge.textContent = it._groupLabel + (it.tier?` • T${it.tier}`:'');

    const missing = Math.max(need - have, 0);


    /* --- KOLOROWANIE KAFELKA WG WARUNKÓW Need/Missing --- */
    card.classList.remove('card--ok','card--partial');
    if (need > 0) {
      if (missing === 0) {
        // Need > 0 i Missing = 0 → zielone tło i ramka
        card.classList.add('card--ok');
      } else if (missing > 0) {
        // Need > 0 i 0 < Missing ≤ Need → czerwone tło i ramka
        card.classList.add('card--partial');
      }
      // w każdym innym wypadku: brak zmian (domyślne style)
    }

    const row = document.createElement('div'); row.className='row';
    const spanHave = document.createElement('span'); spanHave.textContent = `Have: ${have}`;
    const spanNeed = document.createElement('span'); spanNeed.textContent = `Need: ${need}`;
    const spanMissing = document.createElement('span');
    spanMissing.textContent = `Missing: ${missing}`;
    spanMissing.style.color = 'var(--bad)';
    spanMissing.style.fontWeight = '700';

    row.append(spanHave, spanNeed, spanMissing);

    const bar = document.createElement('div'); bar.className='progressbar';
    const fill = document.createElement('span'); fill.style.width = (need>0? pct : 0)+'%';
    bar.append(fill);

    const subRow = document.createElement('div');
    subRow.className = 'meta-subrow';
    if (farmIndicator) subRow.appendChild(farmIndicator);
    subRow.appendChild(badge);

    meta.append(h4, subRow, row, bar);
    card.append(img, meta);
    return card;
  }

  /* ---------- Demand calculation ---------- */
  function computeDemand(rows){
    const out = {}; // key -> needed total
    const WARN_PREFIX = '[Demand]';

    function add(key, n){ if(!key || !n) return; out[key]=(out[key]||0)+n; }

    function keyExists(k){
      if(!k) return false;
      return flatMaterials('all').some(i=>i.key===k);
    }
    function firstExistingGemKey(tier){
      const it = (MATERIALS.gems?.items||[]).find(x=>x.tier===tier);
      return it?.key || null;
    }

    function gemKey(element, tier){
      const map = {
        Pyro:   ['gem_pyro_t1','gem_pyro_t2','gem_pyro_t3','gem_pyro_t4'],
        Hydro:  ['gem_hydro_t1','gem_hydro_t2','gem_hydro_t3','gem_hydro_t4'],
        Cryo:   ['gem_cryo_t1','gem_cryo_t2','gem_cryo_t3','gem_cryo_t4'],
        Electro:['gem_electro_t1','gem_electro_t2','gem_electro_t3','gem_electro_t4'],
        Anemo:  ['gem_anemo_t1','gem_anemo_t2','gem_anemo_t3','gem_anemo_t4'],
        Geo:    ['gem_geo_t1','gem_geo_t2','gem_geo_t3','gem_geo_t4'],
        Dendro: ['gem_dendro_t1','gem_dendro_t2','gem_dendro_t3','gem_dendro_t4'],
      };
      const arr = map[element] || [];
      const k = arr[tier-1];
      if (keyExists(k)) return k;
      const fb = firstExistingGemKey(tier);
      if (!fb) console.warn(WARN_PREFIX, 'Missing gem for', element, 'T'+tier);
      return fb; // może być null
    }

    function enemyKey(group, tier){
      const k = `enemy_${group}_t${tier}`;
      if (keyExists(k)) return k;
      console.warn(WARN_PREFIX, 'Missing enemy key:', k);
      return null;
    }

    function bookKey(family, tier){
      const k = `book_${family}_t${tier}`;
      if (keyExists(k)) return k;
      const it = (MATERIALS.books?.items||[]).find(x=>x.tier===tier);
      if (!it) console.warn(WARN_PREFIX, 'Missing books family:', family, 'T'+tier);
      return it?.key || null;
    }

    function findLocalKey(nameKey){
      const it = (MATERIALS.local?.items||[]).find(i=>i.key===nameKey);
      if (!it) console.warn(WARN_PREFIX, 'Missing local:', nameKey);
      return it?.key || null;
    }

    function ensureExistsKey(key){
      if (keyExists(key)) return key;
      console.warn(WARN_PREFIX, 'Missing direct key:', key);
      return null;
    }

    function addLevelingDemand(row){
      const levelCur = normalizeLevelCur(row);
      const levelTarget = normalizeLevelTarget(row);

      (LEVEL_UP_COSTS || []).forEach(step=>{
        if (step.from >= levelCur && step.to <= levelTarget) {
          add('levelup_hero_wit', step.hero || 0);
          add('levelup_adventurer_experience', step.adventurer || 0);
          add('levelup_wanderers_advice', step.wanderer || 0);
          add('Mora', step.mora || 0);
        }
      });
    }

    rows.forEach(r=>{
      const c = CHARACTER_COSTS[r.character];
      if(!c) return;

      // ---------- LEVEL ----------
      addLevelingDemand(r);

      // ---------- ASC ----------
      const ascStart = Math.max(0, Math.min(6, r.ascCur|0));
      const ascEnd   = Math.max(0, Math.min(6, r.ascTarget|0));
      for(let i=ascStart; i<ascEnd; i++){
        const step = c.asc[i]; if(!step) continue;

        for(let t=1; t<=4; t++){
          const n = step.gems?.['t'+t]||0;
          const k = gemKey(c.element, t);
          if (k) add(k, n);
        }
        for(let t=1; t<=3; t++){
          const n = step.enemy?.['t'+t]||0;
          const k = enemyKey(c.picks.enemiesAsc, t);
          if (k) add(k, n);
        }
        { const k = findLocalKey(c.picks.local); if (k) add(k, step.local||0); }
        { const k = ensureExistsKey(c.picks.bossNormal); if (k) add(k, step.boss||0); }

        // --- MORA z asc ---
        add('Mora', step.mora || 0);
      }

      // ---------- TALENTS ----------
      function talentRange(cur, tar){ return [Math.max(1,cur|0), Math.max(1,tar|0)]; }
      const parts = [
        talentRange(r.naCur, r.naTarget),
        talentRange(r.skillCur, r.skillTarget),
        talentRange(r.burstCur, r.burstTarget),
      ];
      parts.forEach(([cur,tar])=>{
        for(let lvl=cur; lvl<tar; lvl++){
          const idx = Math.max(1, Math.min(9, lvl)) - 1; // 1→2 ... 9→10
          const step = c.tal[idx]; if(!step) continue;

          for(let t=1; t<=3; t++){
            const nb = step.books?.['t'+t]||0;
            const kb = bookKey(c.picks.books, t);
            if (kb) add(kb, nb);

            const ne = step.enemy?.['t'+t]||0;
            const ke = enemyKey(c.picks.enemiesTal, t);
            if (ke) add(ke, ne);
          }
          { const k = ensureExistsKey(c.picks.bossWeekly); if (k) add(k, step.weekly||0); }

          // --- MORA z talents (NEW) ---
          add('Mora', step.mora || 0);
        }
      });
    });

    return out;
  }

  // === Auto-seed wszystkich postaci, gdy tabela jest pusta ===
  async function seedAllCharactersIfEmpty(){
    const existing = await IDB.all(PROGRESS_STORE) || [];
    if (existing.length > 0) return;

    const names = sortedCharacterNames(); // posortowane alfabetycznie (PL)
    const rows = names.map(name => ({
      id: 'row_'+Math.random().toString(36).slice(2),
      character: name,
      element: CHARACTER_COSTS[name]?.element || '',
      levelCur: 1, levelTarget: 90,
      ascCur: 0,  ascTarget: 6,
      naCur: 1,   naTarget: 10,
      skillCur: 1,skillTarget: 10,
      burstCur: 1,burstTarget: 10,
      notes: ''
    }));

    await Promise.all(rows.map(r => IDB.put(PROGRESS_STORE, r)));
  }

  /* ---------- Init ---------- */
  async function init(){
    buildUsageIndex();              // tooltipy "Used by"
    await seedAllCharactersIfEmpty();
    await renderProgress();
    await renderInventory();
    await renderGlobalDemand();
  }
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('DOMContentLoaded', ()=>{
    const el = document.querySelector('#filter-element');
    if(el){ el.addEventListener('change', ()=>{ FILTER_ELEMENT = el.value || ''; renderProgress(); }); }
  });
})();


  
