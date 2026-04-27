document.addEventListener('DOMContentLoaded', async function() {
    const tierGrid = document.getElementById('tier-grid');
    const tierGridContainer = document.querySelector('.tier-grid-container');
    const tiers = ['SS', 'S', 'A', 'B', 'C', 'D'];
    const elements = ['Anemo', 'Geo', 'Electro', 'Dendro', 'Hydro', 'Pyro', 'Cryo'];

    let versionSelect = null;

    // --- DODANE: kolumny dla widoku po rolach i aktualny tryb widoku ---
    const roleViewColumns = ['Main DPS', 'Sub-DPS', 'Support'];
    let currentViewMode = 'element'; // domyślnie jak dotychczas

    // Select z paska nawigacji (By element / By role)
    let viewModeSelect = null;

    // --- DODANE: referencje do filtrów w pasku nawigacji ---
    let raritySelect = null;
    let weaponSelect = null;
    let elementFilterSelect = null;
    let roleSelect = null;
    let ownedSelect = null;

    // inne kontrolki z nav (też są tworzone przez global-nav.js)
    let debutCheckbox = null;
    let tierFilterContainer = null;
    let fullscreenButton = null;
    let fullscreenFitRaf = null;

    function refreshNavRefs(){
        versionSelect = document.getElementById('version-select');
        viewModeSelect = document.getElementById('tier-view-mode');

        raritySelect = document.getElementById('filter-rarity');
        weaponSelect = document.getElementById('filter-weapon');
        elementFilterSelect = document.getElementById('filter-element');
        roleSelect = document.getElementById('filter-role');
        ownedSelect = document.getElementById('filter-owned');

        debutCheckbox = document.getElementById('filter-debut');
        tierFilterContainer = document.getElementById('filter-tiers');

        fullscreenButton = document.getElementById('nav-fullscreen-toggle');
    }

    // pierwsze pobranie referencji (na start)
    refreshNavRefs();

        // --- Remember Views (optional) ---
    const VM_KEY = "view:tier-list:v1";
    let vmEnabled = false;

    try{
      vmEnabled = (window.ViewMemory && ViewMemory.isEnabled) ? await ViewMemory.isEnabled() : false;
    }catch(e){ vmEnabled = false; }

    function readSelect(sel){
      if (!sel) return null;
      return sel.value;
    }
    function writeSelect(sel, val){
      if (!sel) return;
      if (val === null || val === undefined) return;
      sel.value = val;
      // jeśli logika renderuje po change, to wyślij event:
      sel.dispatchEvent(new Event("change", { bubbles:true }));
    }

    function collectTierViewState(){
      return {
        version: readSelect(versionSelect),
        viewMode: readSelect(viewModeSelect),
        rarity: readSelect(raritySelect),
        weapon: readSelect(weaponSelect),
        element: readSelect(elementFilterSelect),
        role: readSelect(roleSelect),
        owned: readSelect(ownedSelect)
      };
    }

    let saveT = null;
    function scheduleSaveTier(){
      if (!vmEnabled) return;
      if (saveT) clearTimeout(saveT);
      saveT = setTimeout(async () => {
        try{
          await ViewMemory.set(VM_KEY, collectTierViewState());
        }catch(e){}
      }, 200);
    }

    if (vmEnabled){
      const st = await ViewMemory.getObj(VM_KEY, null);

      // restore (order matters a bit: viewMode may change which filters are shown)
      if (st){
        writeSelect(versionSelect, st.version);
        writeSelect(viewModeSelect, st.viewMode);
        writeSelect(raritySelect, st.rarity);
        writeSelect(weaponSelect, st.weapon);
        writeSelect(elementFilterSelect, st.element);
        writeSelect(roleSelect, st.role);
        writeSelect(ownedSelect, st.owned);
      }
    }

    // bind
    [versionSelect, viewModeSelect, raritySelect, weaponSelect, elementFilterSelect, roleSelect, ownedSelect]
      .forEach(sel => {
        if (!sel) return;
        sel.addEventListener("change", scheduleSaveTier);
      });


    	// --- NOWE: filtr "Owned" – posiadane postacie bierzemy z IndexedDB (store: progress) ---
	    let ownedCharactersSet = null;

	    function normalizeName(name) {
	        if (!name) return "";
	        let s = String(name).trim();
	        s = s.replace(/\s*\([^)]*\)\s*$/g, ""); // usuń dopisek w nawiasie na końcu (jeśli występuje)
	        s = s.replace(/\s+/g, " ");
	        return s;
	    }

	    async function loadOwnedCharactersSet() {

            // 0) Preferowane źródło dla Owned: checkboxy z Team Planner / Imaginarium Theater
	        try {
	            if (window.IDB && typeof IDB.kvGet === "function") {
	                const ownedMap = await IDB.kvGet("ownedCharacters_v1");
	                if (ownedMap && typeof ownedMap === "object" && !Array.isArray(ownedMap)) {
	                    const entries = Object.entries(ownedMap);
	                    if (entries.length) {
	                        return new Set(
	                            entries
	                                .filter(([, value]) => !!value)
	                                .map(([name]) => normalizeName(name))
	                                .filter(Boolean)
	                        );
	                    }
	                }
	            }
	        } catch (e) {}

	        // 1) Preferowane źródło: IndexedDB -> store "progress"
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
	        } catch (e) {
	            // nic – polecimy fallbackiem
	        }

	        // 2) Fallback: IDB.kv (po migracji z localStorage)
	        try {
	            if (window.IDB && typeof IDB.kvGet === "function") {
	                const arr = await IDB.kvGet("progress_legacy_characters_v1");
	                if (Array.isArray(arr) && arr.length) {
	                    return new Set(arr.map(normalizeName).filter(Boolean));
	                }
	            }
	        } catch (e) {}

	        return new Set(); // brak danych = nikt nieposiadany
	    }

        ownedCharactersSet = await loadOwnedCharactersSet();

    function getAllVersions() {
        const versionsSet = new Set();

        for (const data of Object.values(window.tierHistory || {})) {
            const history = data.history || {};
            Object.keys(history).forEach(v => versionsSet.add(v));
        }

        // sortowanie wersji typu "5.2", "6.0" rosnąco
        return Array.from(versionsSet).sort((a, b) => {
            const [aMaj, aMin] = a.split('.').map(Number);
            const [bMaj, bMin] = b.split('.').map(Number);
            if (aMaj !== bMaj) return aMaj - bMaj;
            return (aMin || 0) - (bMin || 0);
        });
    }

    function initVersionSelect() {
        if (!versionSelect) return;

        const versions = getAllVersions();
        if (!versions.length) return;

        // wyczyść na wszelki wypadek
        versionSelect.innerHTML = "";

        versions.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v; // np. "5.2"
            versionSelect.appendChild(opt);
        });

        // domyślnie ostatnia (najwyższa) wersja
        versionSelect.value = versions[versions.length - 1];
    }

    // --- DODANE: inicjalizacja filtrów na pasku nawigacji ---
    function initFilters() {
        if (!raritySelect || !weaponSelect || !elementFilterSelect || !roleSelect || !tierFilterContainer) {
            return;
        }

        const source = window.tierHistory || {};

        const raritySet = new Set();
        const weaponSet = new Set();
        const roleSet = new Set();

        for (const data of Object.values(source)) {
            if (!data) continue;
            if (data.rarity) raritySet.add(data.rarity);
            if (data.weapon) weaponSet.add(data.weapon);
            if (data.role) roleSet.add(data.role);
        }

        function fillSelect(selectEl, values, labelAll) {
            if (!selectEl) return;
            selectEl.innerHTML = "";

            const allOpt = document.createElement('option');
            allOpt.value = "";
            allOpt.textContent = labelAll;
            selectEl.appendChild(allOpt);

            values.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = v;
                selectEl.appendChild(opt);
            });
        }

        // Rzadkość – sortujemy tak, by ★★★★★ było wyżej niż ★★★★
        const rarityOrder = ['★★★★★', '★★★★', '★★★', '★★', '★'];
        const rarityValues = Array.from(raritySet).sort((a, b) => {
            return (rarityOrder.indexOf(a) === -1 ? 999 : rarityOrder.indexOf(a)) -
                   (rarityOrder.indexOf(b) === -1 ? 999 : rarityOrder.indexOf(b));
        });
        fillSelect(raritySelect, rarityValues, 'All');

        // Broń – alfabetycznie
        const weaponValues = Array.from(weaponSet).sort();
        fillSelect(weaponSelect, weaponValues, 'All');

        // Żywioł – w kolejności jak w siatce
        fillSelect(elementFilterSelect, elements, 'All');

        // Role – alfabetycznie
        const roleValues = Array.from(roleSet).sort();
        fillSelect(roleSelect, roleValues, 'All');

        // Owned – stałe opcje (All / Owned / Not owned)
	    if (ownedSelect) {
	        ownedSelect.innerHTML = "";

	        const optAll = document.createElement('option');
	        optAll.value = "";
	        optAll.textContent = "All";
	        ownedSelect.appendChild(optAll);

	        const optOwned = document.createElement('option');
	        optOwned.value = "owned";
	        optOwned.textContent = "Owned";
	        ownedSelect.appendChild(optOwned);

	        const optNotOwned = document.createElement('option');
	        optNotOwned.value = "not-owned";
	        optNotOwned.textContent = "Not owned";
	        ownedSelect.appendChild(optNotOwned);
	    }

        // Tiers – checkboxy SS/S/A/B/C/D
        tierFilterContainer.innerHTML = "";
        tiers.forEach(tier => {
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = tier;
            cb.className = 'filter-tier-checkbox';
            label.appendChild(cb);
            label.appendChild(document.createTextNode(' ' + tier));
            tierFilterContainer.appendChild(label);
        });

        // Funkcja do odświeżania siatki po zmianie filtrów
        function reRenderWithCurrentVersion() {
            const selectedVersion = versionSelect ? versionSelect.value : null;
            if (selectedVersion) {
                generateTierList(selectedVersion);
            }
        }

        [raritySelect, weaponSelect, elementFilterSelect, roleSelect, ownedSelect].forEach(sel => {
            if (sel) {
                sel.addEventListener('change', reRenderWithCurrentVersion);
            }
        });

        if (debutCheckbox) {
            debutCheckbox.addEventListener('change', reRenderWithCurrentVersion);
        }

        const tierCheckboxes = tierFilterContainer.querySelectorAll('.filter-tier-checkbox');
        tierCheckboxes.forEach(cb => {
            cb.addEventListener('change', reRenderWithCurrentVersion);
        });
    }

    // --- DODANE: odczyt aktualnych filtrów ---
    function getActiveFilters() {
        const rarity = raritySelect ? raritySelect.value : "";
        const weapon = weaponSelect ? weaponSelect.value : "";
        const elementFilter = elementFilterSelect ? elementFilterSelect.value : "";
        const role = roleSelect ? roleSelect.value : "";
        const ownedMode = ownedSelect ? ownedSelect.value : "";
        const debutHighlight = debutCheckbox ? debutCheckbox.checked : false;

        const tierCheckboxes = tierFilterContainer
            ? Array.from(tierFilterContainer.querySelectorAll('.filter-tier-checkbox:checked'))
            : [];
        const selectedTiers = tierCheckboxes.map(cb => cb.value);

        return {
            rarity,
            weapon,
            elementFilter,
            role,
            ownedMode,
            debutHighlight,
            selectedTiers
        };
    }

    function clearTierGrid() {
        tierGrid.innerHTML = "";
    }

    function generateTierList(selectedVersion) {
        if (!selectedVersion) return;

        const filters = getActiveFilters();

        // --- WIDOK ALTERNATYWNY: po rolach (Main DPS / Sub-DPS / Support) ---
        if (currentViewMode === 'role') {
            clearTierGrid();
            tierGrid.classList.add('role-view');

            // lewy górny narożnik pusty
            const emptyHeader = document.createElement('div');
            emptyHeader.className = 'tier-grid-header';
            tierGrid.appendChild(emptyHeader);

            // nagłówki kolumn: role
            roleViewColumns.forEach(roleName => {
                const header = document.createElement('div');
                header.className = 'tier-grid-header role-header';
                header.textContent = roleName;
                tierGrid.appendChild(header);
            });

            // wiersze dla poszczególnych tierów
            tiers.forEach(tier => {
                // etykieta tieru (jak dotychczas – ikona z Rating Icons)
                const tierLabel = document.createElement('div');
                tierLabel.className = `tier-label ${tier.toLowerCase()}`;

                const tierIcon = document.createElement('img');
                tierIcon.src = `Rating Icons/${tier}.png`;
                tierIcon.alt = tier;
                tierIcon.className = 'tier-icon';

                tierLabel.appendChild(tierIcon);
                tierGrid.appendChild(tierLabel);

                // kolumny: Main DPS / Sub-DPS / Support
                roleViewColumns.forEach(roleName => {
                    const cell = document.createElement('div');
                    cell.className = 'element-cell role-cell';

                    const characters = getCharactersByTierRoleAndVersion(
                        tier,
                        roleName,
                        selectedVersion,
                        filters
                    );

                    characters.forEach(characterName => {
                        const characterDiv = document.createElement('div');
                        characterDiv.className = 'character-compact';

                        const data = (window.tierHistory || {})[characterName] || {};
                        const element = data.element || '';
                        const elementClass = element ? element.toLowerCase() : '';

                        const portrait = document.createElement('img');
                        portrait.src = `images/characters/${characterName}.png`;
                        portrait.alt = characterName;
                        portrait.className = `character-portrait-small ${elementClass}`;

                        // wyróżnianie debiutów w tej wersji – tak samo jak w widoku elementowym
                        const isDebutThisVersion = data && data.debiut === selectedVersion;
                        if (filters.debutHighlight && isDebutThisVersion) {
                            characterDiv.classList.add('debut-highlight');
                        }

                        portrait.onerror = function() {
                            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiMzMzMiLz4KPC9zdmc+';
                        };

                        const nameSpan = document.createElement('span');
                        nameSpan.className = 'character-name-small';
                        nameSpan.textContent = characterName;

                        characterDiv.appendChild(portrait);
                        characterDiv.appendChild(nameSpan);
                        cell.appendChild(characterDiv);
                    });

                    tierGrid.appendChild(cell);
                });
            });

            scheduleTierGridFullscreenFit();

            return; // koniec wariantu role-view
        }

        // --- DOMYŚLNY WIDOK: po żywiołach (to co miałeś do tej pory) ---
        clearTierGrid();
        tierGrid.classList.remove('role-view');

        // Pusta komórka w lewym górnym rogu
        const emptyHeader = document.createElement('div');
        emptyHeader.className = 'tier-grid-header';
        tierGrid.appendChild(emptyHeader);

        // Nagłówki żywiołów – ikony z folderu "Element Icons"
        elements.forEach(element => {
            const elementHeader = document.createElement('div');
            elementHeader.className = 'tier-grid-header';

            const elementIcon = document.createElement('img');
            elementIcon.src = `Element Icons/${element}.png`;
            elementIcon.alt = element;
            elementIcon.className = 'element-icon';

            elementHeader.appendChild(elementIcon);
            tierGrid.appendChild(elementHeader);
        });

        // Wiersze z tierami i komórkami elementów – dokładnie jak wcześniej
        tiers.forEach(tier => {
            const tierLabel = document.createElement('div');
            tierLabel.className = `tier-label ${tier.toLowerCase()}`;

            const tierIcon = document.createElement('img');
            tierIcon.src = `Rating Icons/${tier}.png`;
            tierIcon.alt = tier;
            tierIcon.className = 'tier-icon';

            tierLabel.appendChild(tierIcon);
            tierGrid.appendChild(tierLabel);

            elements.forEach(element => {
                const elementCell = document.createElement('div');
                elementCell.className = 'element-cell';

                const characters = getCharactersByTierElementAndVersion(
                    tier,
                    element,
                    selectedVersion,
                    filters
                );

                characters.forEach(characterName => {
                    const characterDiv = document.createElement('div');
                    characterDiv.className = 'character-compact';

                    const portrait = document.createElement('img');
                    portrait.src = `images/characters/${characterName}.png`;
                    portrait.alt = characterName;
                    portrait.className = `character-portrait-small ${element.toLowerCase()}`;

                    const data = (window.tierHistory || {})[characterName];
                    const isDebutThisVersion = data && data.debiut === selectedVersion;
                    if (filters.debutHighlight && isDebutThisVersion) {
                        characterDiv.classList.add('debut-highlight');
                    }

                    portrait.onerror = function() {
                        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiMzMzMiLz4KPC9zdmc+';
                    };

                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'character-name-small';
                    nameSpan.textContent = characterName;

                    characterDiv.appendChild(portrait);
                    characterDiv.appendChild(nameSpan);
                    elementCell.appendChild(characterDiv);
                });

                tierGrid.appendChild(elementCell);
            });
        });

        scheduleTierGridFullscreenFit();
    }

    function getCharactersByTierElementAndVersion(tier, element, version, filters) {
        const characters = [];
        const source = window.tierHistory || {};
        filters = filters || getActiveFilters();

        const selectedTiers = filters.selectedTiers || [];

        // Jeśli wybrano konkretne tiery i bieżący tier nie jest na liście – ta komórka będzie pusta
        if (selectedTiers.length && !selectedTiers.includes(tier)) {
            return characters;
        }

        for (const [name, data] of Object.entries(source)) {
            if (!data || !data.history) continue;

            const historyEntry = data.history[version];
            // jeśli w danej wersji nie ma ratingu – postać nie istnieje w tej wersji
            if (!historyEntry || historyEntry.rating !== tier) continue;

            // element zgodny z komórką siatki
            if (data.element !== element) continue;

            // Filtr rzadkości (★★★★★ / ★★★★ itd.)
            if (filters.rarity && data.rarity !== filters.rarity) continue;

            // Filtr broni
            if (filters.weapon && data.weapon !== filters.weapon) continue;

            // Filtr żywiołu – działa globalnie (kombinacja rzadkość + broń + żywioł)
            if (filters.elementFilter && data.element !== filters.elementFilter) continue;

            // Filtr roli
            if (filters.role && data.role !== filters.role) continue;

            // Filtr posiadania (Owned / Not owned)
	        if (filters.ownedMode && ownedCharactersSet) {
	            const isOwned = ownedCharactersSet.has(normalizeName(name));
	            if (filters.ownedMode === 'owned' && !isOwned) continue;
	            if (filters.ownedMode === 'not-owned' && isOwned) continue;
	        }

            characters.push(name);
        }

        return characters;
    }

    // --- DODANE: pomocnicza funkcja dla widoku po rolach ---
    function getCharactersByTierRoleAndVersion(tier, roleName, version, filters) {
        const characters = [];
        const source = window.tierHistory || {};
        filters = filters || getActiveFilters();

        const selectedTiers = filters.selectedTiers || [];

        // Jeśli wybrano konkretne tiery i bieżący tier nie jest na liście – nic nie pokazujemy
        if (selectedTiers.length && !selectedTiers.includes(tier)) {
            return characters;
        }

        // Jeśli filtr „Role” jest ustawiony i nie pasuje do tej kolumny – komórka pusta
        if (filters.role && filters.role !== roleName) {
            return characters;
        }

        for (const [name, data] of Object.entries(source)) {
            if (!data || !data.history) continue;

            const historyEntry = data.history[version];
            if (!historyEntry || historyEntry.rating !== tier) continue;

            // musi pasować rola kolumny
            if (data.role !== roleName) continue;

            // Filtr rzadkości
            if (filters.rarity && data.rarity !== filters.rarity) continue;

            // Filtr broni
            if (filters.weapon && data.weapon !== filters.weapon) continue;

            // Filtr żywiołu (globalny)
            if (filters.elementFilter && data.element !== filters.elementFilter) continue;

            // Filtr posiadania (Owned / Not owned)
	        if (filters.ownedMode && ownedCharactersSet) {
	            const isOwned = ownedCharactersSet.has(normalizeName(name));
	            if (filters.ownedMode === 'owned' && !isOwned) continue;
	            if (filters.ownedMode === 'not-owned' && isOwned) continue;
	        }

            characters.push(name);
        }

        return characters;
    }

    // --- NOWE: obsługa systemowego fullscreen + ukrywanie filtrów klawiszem G ---

    function getFullscreenElement() {
        return document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            null;
    }

    function isFullscreen() {
        return getFullscreenElement() === (tierGridContainer || document.documentElement);
    }

    function enterFullscreen() {
        const docEl = tierGridContainer || document.documentElement;
        if (docEl.requestFullscreen) {
            docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
            docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
            docEl.msRequestFullscreen();
        }
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    function updateFullscreenButton() {
        if (!fullscreenButton) return;
        fullscreenButton.textContent = isFullscreen()
            ? "Exit full screen"
            : "Full screen";
    }

    function scheduleTierGridFullscreenFit() {
        if (fullscreenFitRaf) {
            cancelAnimationFrame(fullscreenFitRaf);
        }
        fullscreenFitRaf = requestAnimationFrame(fitTierGridToFullscreen);
    }

    function fitTierGridToFullscreen() {
        fullscreenFitRaf = null;

        if (!tierGridContainer || !tierGrid) return;

        const active = isFullscreen();
        tierGridContainer.classList.toggle('is-tier-fullscreen', active);

        if (!active) {
            tierGrid.style.removeProperty('--tier-fullscreen-scale');
            return;
        }

        tierGrid.style.setProperty('--tier-fullscreen-scale', '1');

        const px = value => parseFloat(value) || 0;
        const containerStyles = window.getComputedStyle(tierGridContainer);
        const availableWidth = tierGridContainer.clientWidth
            - px(containerStyles.paddingLeft)
            - px(containerStyles.paddingRight);
        const availableHeight = tierGridContainer.clientHeight
            - px(containerStyles.paddingTop)
            - px(containerStyles.paddingBottom);
        const naturalWidth = tierGrid.offsetWidth || tierGrid.scrollWidth;
        const naturalHeight = tierGrid.offsetHeight || tierGrid.scrollHeight;

        if (!availableWidth || !availableHeight || !naturalWidth || !naturalHeight) return;

        const scale = Math.min(1.15, availableWidth / naturalWidth, availableHeight / naturalHeight);
        tierGrid.style.setProperty('--tier-fullscreen-scale', String(scale));
    }

    function bindFullscreenButton() {
        if (!fullscreenButton) return;

        if (fullscreenButton.dataset.tierFullscreenBound !== '1') {
            fullscreenButton.dataset.tierFullscreenBound = '1';
            fullscreenButton.addEventListener('click', function () {
                if (!isFullscreen()) {
                    enterFullscreen();
                } else {
                    exitFullscreen();
                }
            });
        }

        updateFullscreenButton();
    }

    bindFullscreenButton();


    function handleFullscreenChange() {
        updateFullscreenButton();

        scheduleTierGridFullscreenFit();

        // Po wyjściu z fullscreen przywróć widoczność filtrów
        if (!isFullscreen()) {
            document.body.classList.remove('nav-hidden');
        }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('resize', scheduleTierGridFullscreenFit);

    // Klawisz G – chowanie/pokazywanie filtrów tylko w trybie fullscreen
    document.addEventListener('keydown', function (e) {
        if (e.key === 'g' || e.key === 'G') {
            if (isFullscreen()) {
                document.body.classList.toggle('nav-hidden');
            }
        }
    });


        function setupTierNavBindings(){
        // po każdym renderze nav trzeba pobrać nowe elementy
        refreshNavRefs();

        bindFullscreenButton();

        // uzupełnij opcje
        initVersionSelect();
        initFilters();

        // ustaw + podepnij view mode
        if (viewModeSelect) {
            currentViewMode = viewModeSelect.value === 'role' ? 'role' : 'element';

            viewModeSelect.addEventListener('change', () => {
                currentViewMode = viewModeSelect.value === 'role' ? 'role' : 'element';

                const selectedVersion = versionSelect ? versionSelect.value : null;
                if (selectedVersion) generateTierList(selectedVersion);
            });
        }

        // podepnij zmianę wersji
        if (versionSelect) {
            versionSelect.addEventListener('change', () => {
                const selectedVersion = versionSelect.value;
                if (selectedVersion) generateTierList(selectedVersion);
            });
        }

        // wyrenderuj na start (jeśli mamy wersję)
        const v = versionSelect ? versionSelect.value : null;
        if (v) generateTierList(v);
    }

    // 1) start (pierwsze podpięcie)
    setupTierNavBindings();

    // 2) NAJWAŻNIEJSZE: global-nav może się prze-renderować po appsettings:ready/changed
    document.addEventListener("globalnav:rendered", () => {
        setupTierNavBindings();
    });
});
