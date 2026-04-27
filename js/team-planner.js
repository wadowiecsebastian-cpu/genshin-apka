function renderRotation(rotation, container) {
  const rotationContainer = document.createElement("div");
  rotationContainer.className = "rotation-container";

  rotation.forEach(step => {
    const stepDiv = document.createElement("div");
    stepDiv.className = "rotation-step";

    // Opis: kto i jaki skill
    const skillTitle = document.createElement("div");
    skillTitle.className = "rotation-skill-title";
    skillTitle.textContent = `${step.character} - Skill ${step.skill}`;
    stepDiv.appendChild(skillTitle);

    // Ikona
    const icon = document.createElement("img");
    icon.src = step.icon;
    icon.alt = `${step.character} ${step.skill}`;
    icon.className = "rotation-icon";
    stepDiv.appendChild(icon);

    // Notatka
    if (step.note) {
      const note = document.createElement("div");
      note.className = "rotation-note";
      note.textContent = step.note;
      stepDiv.appendChild(note);
    }

    rotationContainer.appendChild(stepDiv);
  });

  container.appendChild(rotationContainer);
}

document.addEventListener("DOMContentLoaded", async () => {
  const tabs = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      tabContents.forEach(tc => tc.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");

      if (btn.dataset.tab === "imaginarium") {
        renderElementIcons();
      }

      scheduleSaveTeamPlanner();
    });
  });

  const ownedContainer = document.getElementById("owned-characters");
  const teamsContainer = document.getElementById("teams-container");
  const elementFilterDiv = document.getElementById("element-filters");
  const ownedFilter = document.getElementById("owned-filter");

  // --- Remember Views (optional) ---
  const VM_KEY = "view:team-planner:v1";
  let vmEnabled = false;
  let vmLoaded = false;
  let vmState = null;
  let vmSaveT = null;

  // enable + load remembered view state (RUN ONCE, outside tabs.forEach)
  try{
    vmEnabled = (window.ViewMemory && ViewMemory.isEnabled) ? await ViewMemory.isEnabled() : false;
  }catch(e){ vmEnabled = false; }

  if (ownedFilter){
    ownedFilter.addEventListener("change", () => {
      scheduleSaveTeamPlanner();
    });
  }

  if (vmEnabled){
    vmState = await ViewMemory.getObj(VM_KEY, null);
    vmLoaded = true;

    // restore owned filter FIRST (so renderTeams uses correct state)
    if (ownedFilter && typeof vmState.ownedOnly === "boolean"){
      ownedFilter.checked = vmState.ownedOnly;
    }
  }

  // --- module defaults (Team Planner) ---
  // Nie nadpisuj ViewMemory: ustaw domyślne tylko, jeśli ViewMemory nie dało ownedOnly
  const appS = window.__APP_SETTINGS__ || {};
  const tpS = (appS.modules && appS.modules.teamPlanner) ? appS.modules.teamPlanner : null;

  const hasVmOwned = !!(vmEnabled && vmLoaded && vmState && typeof vmState.ownedOnly === "boolean");
  if (!hasVmOwned && ownedFilter && tpS) {
    if ((tpS.ownedOnlyDefault || "off") === "on") {
      ownedFilter.checked = true;
    }
  }

  const perfS = (appS.performance && typeof appS.performance === "object") ? appS.performance : {};
  const paginationEnabled = (perfS.pagination || "on") === "on";
  const performanceMode = (perfS.mode || "off") === "on";

  const ownedPageSize = performanceMode ? 24 : 36;
  const teamsPageSize = performanceMode ? 6 : 9;

  let ownedPage = 1;
  let teamsPage = 1;

  function renderPager(id, afterEl, page, totalPages, onChange){
    let pager = document.getElementById(id);
    if (!pager){
      pager = document.createElement("div");
      pager.id = id;
      pager.className = "tp-pager";
      afterEl.insertAdjacentElement("afterend", pager);
    }

    if (!paginationEnabled || totalPages <= 1){
      pager.innerHTML = "";
      pager.style.display = "none";
      return;
    }

    pager.style.display = "flex";
    pager.innerHTML = `
      <button type="button" class="btn" data-page-action="prev" ${page <= 1 ? "disabled" : ""}>← Poprzednia</button>
      <span class="tp-pager__label">Strona ${page} / ${totalPages}</span>
      <button type="button" class="btn" data-page-action="next" ${page >= totalPages ? "disabled" : ""}>Następna →</button>
    `;

    pager.querySelector('[data-page-action="prev"]').onclick = () => onChange(page - 1);
    pager.querySelector('[data-page-action="next"]').onclick = () => onChange(page + 1);
  }

  function scheduleSaveTeamPlanner(){
    if (!vmEnabled) return;
    if (vmSaveT) clearTimeout(vmSaveT);
    vmSaveT = setTimeout(async () => {
      try{
        // vmState is built on demand (see buildTeamPlannerViewState)
        const st = buildTeamPlannerViewState();
        await ViewMemory.set(VM_KEY, st);
      }catch(e){}
    }, 200);
  }

  function buildTeamPlannerViewState(){
    // active tab
    const activeTabBtn = document.querySelector(".tab-button.active");
    const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : "owned";

    // selected elements (Set -> Array)
    const elements = (typeof selectedElements !== "undefined" && selectedElements instanceof Set)
      ? Array.from(selectedElements)
      : [];

    // filter characters (array of 4)
    const chars = Array.isArray(selectedFilterCharacters) ? selectedFilterCharacters.slice(0,4) : [null,null,null,null];

    // owned filter
    const ownedOnly = ownedFilter ? !!ownedFilter.checked : false;

    const rotationFilter = document.getElementById("rotation-filter");
    const rotationOnly = rotationFilter ? !!rotationFilter.checked : false;

    return { activeTab, elements, chars, ownedOnly, rotationOnly };
  }

  // Nowe kafelki filtrowania drużyn po postaciach (Imaginarium)
  const characterFilterRow = document.getElementById("character-filter-row");
  // maksymalnie 4 sloty jak na screenie
  const selectedFilterCharacters = [null, null, null, null];

  if (vmLoaded && vmEnabled && vmState && Array.isArray(vmState.chars)){
    for (let i=0;i<4;i++){
      selectedFilterCharacters[i] = (vmState.chars[i] ?? null);
    }
  }

  // indeks kafelka, dla którego jest aktualnie otwarte menu wyboru postaci (albo null)
  let openDropdownTileIndex = null;

  const allCharacters = window.characterData;
    const owned = ((window.IDB && IDB.kvGet) ? (await IDB.kvGet("ownedCharacters_v1")) : null) || {};

  // Lista wszystkich unikalnych drużyn (tylko nazwy postaci) – do logiki podpowiedzi w kafelkach
  const allTeams = [];
  (function buildAllTeams() {
    const map = new Map();

    for (const [, charData] of Object.entries(allCharacters)) {
      if (!Array.isArray(charData.teams)) continue;

      for (const team of charData.teams) {
        if (!team.members || team.members.length !== 4) continue;

        const key = team.members
          .map(m => m.name)
          .sort()
          .join(",");

        if (!map.has(key)) {
          // przechowujemy tylko listę nazw postaci
          map.set(key, team.members.map(m => m.name));
        }
      }
    }

    allTeams.push(...map.values());
  })();

  // Prosta etykieta roli do pokazania na kafelku (Main DPS / Sub-DPS / Support / itp.)
  function getSimpleRoleLabelForCharacter(name) {
    const charData = allCharacters[name];
    if (!charData || !charData.roles) return "";

    const roleKeys = Object.keys(charData.roles);
    if (!roleKeys.length) return "";

    const key = roleKeys[0]; // bierzemy pierwszy build z listy, jako reprezentacyjny

    if (/Main DPS/i.test(key)) return "Main DPS";
    if (/Sub-DPS/i.test(key) && /Support/i.test(key)) return "Sub-DPS/Support";
    if (/Sub-DPS/i.test(key)) return "Sub-DPS";
    if (/Support/i.test(key)) return "Support";
    if (/Healer/i.test(key)) return "Healer";
    if (/Shielder/i.test(key)) return "Shielder";

    // fallback – pełna nazwa buildu
    return key;
  }


  async function saveOwned() {
    if (window.IDB && IDB.kvSet) await IDB.kvSet("ownedCharacters_v1", owned);
    console.log("[SAVE] Owned Characters:", owned);
  }

  function renderOwnedCharacters() {
    ownedContainer.innerHTML = "";

    const entries = Object.entries(allCharacters);
    const totalPages = paginationEnabled ? Math.max(1, Math.ceil(entries.length / ownedPageSize)) : 1;
    if (ownedPage > totalPages) ownedPage = totalPages;

    const visibleEntries = paginationEnabled
      ? entries.slice((ownedPage - 1) * ownedPageSize, ownedPage * ownedPageSize)
      : entries;

    visibleEntries.forEach(([name]) => {
      const wrapper = document.createElement("div");
      wrapper.className = "owned-character-entry";

      const img = document.createElement("img");
      img.src = `images/characters/${name}.png`;
      img.alt = name;
      img.className = "owned-character-image";

      const label = document.createElement("label");
      label.className = "character-label";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!owned[name];
      checkbox.addEventListener("change", async () => {
        owned[name] = checkbox.checked;
        await saveOwned();
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(name));

      wrapper.addEventListener("click", async (e) => {
        if (e.target === checkbox) return;
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        owned[name] = checkbox.checked;
        await saveOwned();
      });

      wrapper.appendChild(img);
      wrapper.appendChild(label);
      ownedContainer.appendChild(wrapper);
    });

    renderPager("ownedPager", ownedContainer, ownedPage, totalPages, (nextPage) => {
      ownedPage = Math.max(1, Math.min(totalPages, nextPage));
      renderOwnedCharacters();
    });
  }

  // Zwraca listę nazw postaci, które można wybrać w danym slocie,
  // biorąc pod uwagę wcześniej wybrane postacie (muszą mieć z nimi wspólną drużynę)
  function getAllowedCharactersForSlot(slotIndex) {
    // postacie wybrane w slotach 0..slotIndex-1
    const alreadySelectedBefore = selectedFilterCharacters
      .slice(0, slotIndex)
      .filter(Boolean);

    // jeśli to pierwszy slot (brak wybranych wcześniej) → wszystkie postacie
    if (alreadySelectedBefore.length === 0) {
      return Object.keys(allCharacters);
    }

    // drużyny, które zawierają wszystkie wcześniej wybrane postacie
    const matchingTeams = allTeams.filter(teamNames =>
      alreadySelectedBefore.every(name => teamNames.includes(name))
    );

    const allowed = new Set();

    matchingTeams.forEach(teamNames => {
      teamNames.forEach(name => allowed.add(name));
    });

    // nie proponujemy postaci, które już są ustawione w jakimkolwiek slocie
    selectedFilterCharacters.forEach(name => {
      if (name) allowed.delete(name);
    });

    // jeśli nic nie pasuje – zwrócimy pustą listę;
    // dropdown pokaże wtedy tylko opcję "Wyczyść slot"
    return Array.from(allowed);
  }

  // Zamyka ewentualne otwarte menu wyboru postaci
  function closeCharacterDropdown() {
    const existing = document.querySelector(".character-filter-dropdown");
    if (existing && existing.parentElement) {
      existing.parentElement.removeChild(existing);
    }
    openDropdownTileIndex = null;
  }

  // Otwiera listę postaci dla konkretnego kafelka
  function openCharacterDropdown(slotIndex, tile) {
    // jeśli już mamy otwarte menu dla tego samego kafelka – po prostu je zamknij
    if (openDropdownTileIndex === slotIndex) {
      closeCharacterDropdown();
      return;
    }

    // usuń poprzednie menu (jeśli było)
    closeCharacterDropdown();

    const dropdown = document.createElement("div");
    dropdown.className = "character-filter-dropdown";

    // DODATKOWO: opcja szybkiego wyczyszczenia tego slotu
    const clearOption = document.createElement("div");
    clearOption.className = "character-filter-option character-filter-option-clear";
    clearOption.textContent = "✕ Wyczyść ten slot";
    clearOption.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedFilterCharacters[slotIndex] = null;
      scheduleSaveTeamPlanner();
      refreshCharacterFilterTiles();
      renderTeams();
      closeCharacterDropdown();
    });
    dropdown.appendChild(clearOption);

    // Lista dostępnych postaci dla tego slotu (zależnie od wcześniej wybranych)
    const allowedNames = getAllowedCharactersForSlot(slotIndex);

    if (allowedNames.length === 0) {
      const info = document.createElement("div");
      info.className = "character-filter-option";
      info.textContent = "Brak postaci z wspólnymi drużynami";
      info.style.fontSize = "12px";
      info.style.justifyContent = "center";
      dropdown.appendChild(info);
    } else {
      allowedNames.forEach((name) => {
        const charData = allCharacters[name];
        if (!charData) return;

        const option = document.createElement("div");
        option.className = "character-filter-option";

        const avatar = document.createElement("img");
        avatar.className = "character-filter-option-avatar";
        avatar.src = `images/characters/${name}.png`;
        avatar.alt = name;
        option.appendChild(avatar);

        const textWrapper = document.createElement("div");
        textWrapper.className = "character-filter-option-text";

        const nameDiv = document.createElement("div");
        nameDiv.className = "character-filter-option-name";
        nameDiv.textContent = name;
        textWrapper.appendChild(nameDiv);

        const subLine = document.createElement("div");
        subLine.className = "character-filter-option-sub";

        const roleLabel = getSimpleRoleLabelForCharacter(name);
        if (roleLabel) {
          const roleSpan = document.createElement("span");
          roleSpan.textContent = roleLabel;
          subLine.appendChild(roleSpan);
        }

        if (charData.element) {
          const elIcon = document.createElement("img");
          elIcon.className = "character-filter-option-element";
          elIcon.src = `Element Icons/${charData.element}.png`;
          elIcon.alt = charData.element;
          subLine.appendChild(elIcon);
        }

        textWrapper.appendChild(subLine);
        option.appendChild(textWrapper);

        option.addEventListener("click", (e) => {
          e.stopPropagation();
          selectedFilterCharacters[slotIndex] = name;
          scheduleSaveTeamPlanner();
          refreshCharacterFilterTiles();
          renderTeams();
          closeCharacterDropdown();
        });

        dropdown.appendChild(option);
      });
    }

    tile.appendChild(dropdown);
    openDropdownTileIndex = slotIndex;
  }

  // Odświeża wygląd wszystkich 4 kafelków na podstawie tablicy selectedFilterCharacters
  function refreshCharacterFilterTiles() {
    if (!characterFilterRow) return;

    // przy odrysowaniu kafelków zamykamy ewentualne otwarte menu
    closeCharacterDropdown();

    const tiles = characterFilterRow.querySelectorAll(".character-filter-tile");

    tiles.forEach((tile, index) => {
      const name = selectedFilterCharacters[index];
      const charData = name ? allCharacters[name] : null;

      tile.innerHTML = "";
      tile.classList.toggle("empty", !charData);

      const inner = document.createElement("div");
      tile.appendChild(inner);

      if (!charData) {
        const placeholder = document.createElement("div");
        placeholder.className = "character-filter-placeholder";
        placeholder.textContent = "Kliknij, aby wybrać postać";
        inner.appendChild(placeholder);
        return;
      }

      const avatar = document.createElement("img");
      avatar.className = "character-filter-avatar";
      avatar.src = `images/characters/${name}.png`;
      avatar.alt = name;
      inner.appendChild(avatar);

      const nameDiv = document.createElement("div");
      nameDiv.className = "character-filter-name";
      nameDiv.textContent = name;
      inner.appendChild(nameDiv);

      const roleLabel = getSimpleRoleLabelForCharacter(name);
      if (roleLabel) {
        const roleDiv = document.createElement("div");
        roleDiv.className = "character-filter-role";
        roleDiv.textContent = roleLabel;
        inner.appendChild(roleDiv);
      }

      const element = charData.element;
      if (element) {
        const elIcon = document.createElement("img");
        elIcon.className = "character-filter-element";
        elIcon.src = `Element Icons/${element}.png`;
        elIcon.alt = element;
        inner.appendChild(elIcon);
      }

      // Mały przycisk „X” do szybkiego wyczyszczenia pojedynczego slotu
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "character-filter-clear";
      clearBtn.textContent = "×";

      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedFilterCharacters[index] = null;
        scheduleSaveTeamPlanner();
        refreshCharacterFilterTiles();
        renderTeams();
      });

      tile.appendChild(clearBtn);
    });
  }

  // Tworzy 4 „puste” kafelki i podpina obsługę kliknięcia
  function initCharacterFilterTiles() {
    if (!characterFilterRow) return;

    characterFilterRow.innerHTML = "";

    for (let i = 0; i < 4; i++) {
      const tile = document.createElement("div");
      tile.className = "character-filter-tile empty";
      tile.dataset.slotIndex = String(i);

      tile.addEventListener("click", (e) => {
        // kliknięcie w X ma już swoje stopPropagation, więc tutaj obsługujemy resztę
        openCharacterDropdown(i, tile);
      });

      characterFilterRow.appendChild(tile);
    }

    // pierwszy raz narysuj placeholdery
    refreshCharacterFilterTiles();
  }

  const elementList = ["Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo"];  
  const selectedElements = new Set();

  if (vmLoaded && vmEnabled && vmState && Array.isArray(vmState.elements)){
    vmState.elements.forEach(el => selectedElements.add(el));
  }

  let iconsInitialized = false;

  function renderElementIcons() {
  if (iconsInitialized) return;
  iconsInitialized = true;

  elementFilterDiv.innerHTML = "";

  elementList.forEach(element => {
    const icon = document.createElement("img");
    icon.src = `Element Icons/${element}.png`;
    icon.alt = element;
    icon.title = element;
    icon.className = "element-icon";

    if (selectedElements.has(element)) icon.classList.add("selected");

    icon.addEventListener("click", () => {
      if (selectedElements.has(element)) {
        selectedElements.delete(element);
        icon.classList.remove("selected");
      } else {
        selectedElements.add(element);
        icon.classList.add("selected");
      }
      renderTeams();

      scheduleSaveTeamPlanner();
    });

    elementFilterDiv.appendChild(icon);
  });

  // Utwórz kontener filtrów
  const filterOptions = document.createElement("div");
  filterOptions.className = "filter-options";

  // Tryb kompaktowy
  const compactLabel = document.createElement("label");
  compactLabel.className = "compact-toggle";
  const compactInput = document.createElement("input");
  compactInput.type = "checkbox";
  compactInput.id = "compactMode";
  compactLabel.appendChild(compactInput);
  compactLabel.appendChild(document.createTextNode(" Tryb kompaktowy"));
  filterOptions.appendChild(compactLabel);

  compactInput.addEventListener("change", () => {
    const isCompact = compactInput.checked;
    document.querySelectorAll(".team-card").forEach(team => {
      const comments = team.querySelector('.team-comments');
      if (isCompact) {
        team.classList.add("compact");
        if (comments) comments.style.display = 'none';
      } else {
        team.classList.remove("compact");
        if (comments) comments.style.display = 'block';
      }
    });
  });

  // 🔥 Checkbox: tylko z rotacją
  const rotationLabel = document.createElement("label");
  const rotationInput = document.createElement("input");
  rotationInput.type = "checkbox";
  rotationInput.id = "rotation-filter";

  if (vmEnabled && vmLoaded && vmState && typeof vmState.rotationOnly === "boolean"){
    rotationInput.checked = vmState.rotationOnly;
  }

  rotationLabel.appendChild(rotationInput);
  rotationLabel.appendChild(document.createTextNode(" Tylko drużyny z rotacją"));
  filterOptions.appendChild(rotationLabel);

  // Reaguj na zmianę stanu filtra rotacji
  rotationInput.addEventListener("change", () => {
    renderTeams();
    scheduleSaveTeamPlanner();
  });


  elementFilterDiv.appendChild(filterOptions);
}

  function renderTeams() {
    teamsContainer.innerHTML = "";

    const teamMap = new Map();

    for (const [charName, charData] of Object.entries(allCharacters)) {
      if (!Array.isArray(charData.teams)) continue;

      for (const team of charData.teams) {
        if (!team.members || team.members.length !== 4) continue;

        const teamKey = team.members.map(m => m.name).sort().join(",");

        if (!teamMap.has(teamKey)) {
          teamMap.set(teamKey, {
            members: team.members,
            name: team.name || "Unnamed Team",
            comments: [],
            rotationIcons: null
          });
        }

        if (team.comment) {
          teamMap.get(teamKey).comments.push({
            author: charName,
            text: team.comment
          });
        }

        if (team.rotationIcons && !teamMap.get(teamKey).rotationIcons) {
          teamMap.get(teamKey).rotationIcons = team.rotationIcons;
        }
      }
    }

    const rotationFilter = document.getElementById("rotation-filter");
    const showOnlyWithRotation = rotationFilter ? rotationFilter.checked : false;
    const filteredTeams = [];

    for (const [, teamData] of teamMap.entries()) {
      const activeFilterChars = selectedFilterCharacters.filter(Boolean);
      if (activeFilterChars.length > 0) {
        const teamCharNames = teamData.members.map(m => m.name);
        const containsAll = activeFilterChars.every(name => teamCharNames.includes(name));
        if (!containsAll) continue;
      }

      const elements = teamData.members.map(m => allCharacters[m.name]?.element).filter(Boolean);
      if (selectedElements.size > 0) {
        const allElementsValid = elements.every(el => selectedElements.has(el));
        if (!allElementsValid) continue;
      }

      if (ownedFilter.checked && !teamData.members.every(m => owned[m.name])) continue;
      if (showOnlyWithRotation && !teamData.rotationIcons) continue;

      filteredTeams.push(teamData);
    }

    const totalPages = paginationEnabled ? Math.max(1, Math.ceil(filteredTeams.length / teamsPageSize)) : 1;
    if (teamsPage > totalPages) teamsPage = totalPages;

    const visibleTeams = paginationEnabled
      ? filteredTeams.slice((teamsPage - 1) * teamsPageSize, teamsPage * teamsPageSize)
      : filteredTeams;

    visibleTeams.forEach((teamData) => {
      const teamBlock = document.createElement("div");
      teamBlock.className = "team-card";

      const header = document.createElement("h3");
      header.textContent = teamData.name;
      teamBlock.appendChild(header);

      if (!performanceMode && teamData.comments.length > 0) {
        const commentContainer = document.createElement("div");
        commentContainer.className = "team-comments";

        teamData.comments.forEach(c => {
          const p = document.createElement("p");
          p.className = "team-comment-block";
          p.innerHTML = `<strong>${c.author}:</strong> ${c.text}`;
          commentContainer.appendChild(p);
        });

        teamBlock.appendChild(commentContainer);
      }

      const membersDiv = document.createElement("div");
      membersDiv.className = "team-members";

      teamData.members.forEach(member => {
        const charData = allCharacters[member.name];
        if (!charData) return;

        const memberDiv = document.createElement("div");
        memberDiv.className = "team-member";

        const img = document.createElement("img");
        img.src = `images/characters/${member.name}.png`;
        img.alt = member.name;
        memberDiv.appendChild(img);

        const nameDiv = document.createElement("div");
        nameDiv.className = "member-name";
        nameDiv.textContent = member.name;
        memberDiv.appendChild(nameDiv);

        const roleDiv = document.createElement("div");
        roleDiv.className = "member-role";
        roleDiv.textContent = member.role;
        roleDiv.classList.add(`role-${member.role.replace(/\s+/g, "-").toLowerCase()}`);
        memberDiv.appendChild(roleDiv);

        const element = charData.element;
        if (element) {
          const elIcon = document.createElement("img");
          elIcon.src = `Element Icons/${element}.png`;
          elIcon.alt = element;
          elIcon.className = "element-icon-under";
          memberDiv.appendChild(elIcon);
        }

        membersDiv.appendChild(memberDiv);
      });

      teamBlock.appendChild(membersDiv);

      if (teamData.rotationIcons) {
        const rotationHeaderContainer = document.createElement("div");
        rotationHeaderContainer.className = "rotation-header-container";

        const rotationHeader = document.createElement("h4");
        rotationHeader.textContent = "Rotacja drużyny";
        rotationHeaderContainer.appendChild(rotationHeader);

        const toggleButton = document.createElement("button");
        toggleButton.textContent = "Pokaż rotację";
        toggleButton.className = "toggle-rotation-button";
        rotationHeaderContainer.appendChild(toggleButton);

        teamBlock.appendChild(rotationHeaderContainer);

        const rotationContainer = document.createElement("div");
        rotationContainer.className = "team-rotation";
        rotationContainer.style.display = "none";

        renderRotation(teamData.rotationIcons, rotationContainer);
        teamBlock.appendChild(rotationContainer);

        toggleButton.addEventListener("click", () => {
          if (rotationContainer.style.display === "none") {
            rotationContainer.style.display = "block";
            toggleButton.textContent = "Ukryj rotację";
          } else {
            rotationContainer.style.display = "none";
            toggleButton.textContent = "Pokaż rotację";
          }
        });
      }

      teamsContainer.appendChild(teamBlock);
    });

    renderPager("teamsPager", teamsContainer, teamsPage, totalPages, (nextPage) => {
      teamsPage = Math.max(1, Math.min(totalPages, nextPage));
      renderTeams();
    });
  }

  // Kliknięcie poza kafelkami zamyka menu wyboru postaci
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".character-filter-tile")) {
      closeCharacterDropdown();
    }
  });

  renderOwnedCharacters();
  initCharacterFilterTiles();   // ← nowe kafelki
  renderTeams();

  const hasVmActiveTab = !!(vmEnabled && vmLoaded && vmState && vmState.activeTab);
  if (!hasVmActiveTab && tpS && tpS.defaultTab === "imaginarium"){
    const imagBtn = Array.from(tabs).find(b => b.dataset.tab === "imaginarium");
    if (imagBtn) imagBtn.click();
  }

  // restore active tab AFTER initial render (safe)
  if (vmEnabled && vmLoaded && vmState && vmState.activeTab){
    const targetBtn = Array.from(tabs).find(b => (b.dataset.tab === vmState.activeTab));
    if (targetBtn) targetBtn.click();
  }

  ownedFilter.addEventListener("change", renderTeams);
});