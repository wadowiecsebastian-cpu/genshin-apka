// Zakładam, że window.tierHistory jest już wczytane z tier-history.js

(function () {
  
  // Proste porównanie wersji w formacie "X.Y"
  function compareVersions(a, b) {
    const [aMajor, aMinor] = a.split(".").map(Number);
    const [bMajor, bMinor] = b.split(".").map(Number);

    if (aMajor !== bMajor) {
      return aMajor - bMajor;
    }
    return (aMinor || 0) - (bMinor || 0);
  }

  if (!window.tierHistory) {
    alert("Nie znaleziono window.tierHistory. Upewnij się, że tier-history.js jest poprawnie załączony.");
    return;
  }

  const tierHistory = window.tierHistory;

  const versionSelect = document.getElementById("versionSelect");
  const newVersionInput = document.getElementById("newVersionInput");
  const addVersionBtn = document.getElementById("addVersionBtn");

  const nameFilterInput = document.getElementById("nameFilter");
  const elementFilterSelect = document.getElementById("elementFilter");
  const rarityFilterSelect = document.getElementById("rarityFilter");
  const roleFilterInput = document.getElementById("roleFilter");

  const charactersTableBody = document.querySelector("#charactersTable tbody");
  const ratingHeader = document.getElementById("ratingHeader");
  const visualBoard = document.getElementById("visualBoard");

  const tablePanel = document.querySelector(".panel-table");
  const toggleTableBtn = document.getElementById("toggleTableBtn");

  const generateBtn = document.getElementById("generateBtn");
  const outputArea = document.getElementById("outputArea");

  const visualPanel = document.querySelector(".panel-visual");
  const fullscreenBtn = document.getElementById("toggleFullscreenBtn");

  const fullscreenVersionLabel = document.getElementById("fullscreenVersionLabel");

  const tierHint = document.getElementById("tierHint");


  const AVAILABLE_RATINGS = ["SS", "S", "A", "B", "C", "D"];

  // Grupowanie ról do 3 kolumn
  function getRoleGroup(role) {
    const text = (role || "").toLowerCase();

    if (text.includes("main dps")) {
      return "Main DPS";
    }
    if (text.includes("sub-dps") || text.includes("sub dps") || text.includes("off-field") || text.includes("off field")) {
      return "Sub-DPS";
    }
    if (text.includes("support")) {
      return "Support";
    }
    // domyślnie traktujemy jako Support, żeby nic nie znikało
    return "Support";
  }

  let versions = [];
  let currentVersion = "";
  let allElements = new Set();
  let selectedRow = null;
  let currentlyDraggedName = null;


  // --- Inicjalizacja: znajdź wszystkie wersje i żywioły ---
  function initFromTierHistory() {
    const versionSet = new Set();

    Object.values(tierHistory).forEach(char => {
      if (char.element) {
        allElements.add(char.element);
      }
      const history = char.history || {};
      Object.keys(history).forEach(v => versionSet.add(v));
    });

    versions = Array.from(versionSet).sort(); // proste sortowanie po stringach

    if (versions.length === 0) {
      // Brak wersji – utwórz domyślną 1.0
      versions = ["1.0"];
    }

    currentVersion = versions[versions.length - 1]; // ostatnia (najwyższa) jako domyślna

    // Uzupełnij select z wersjami
    fillVersionSelect();
    updateRatingHeader();

    // Uzupełnij select żywiołów
    fillElementFilter();

    // Narysuj tabelę
    renderTable();

    // Przygotuj obsługę drag & drop w widoku graficznym (jeśli istnieje)
    if (visualBoard) {
      setupVisualBoardDnD();
    }
  }

  function fillVersionSelect() {
    versionSelect.innerHTML = "";
    versions.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = "Wersja " + v;
      if (v === currentVersion) opt.selected = true;
      versionSelect.appendChild(opt);
    });
  }

  function fillElementFilter() {
    // Usuwamy poprzednie opcje poza "Wszystkie"
    while (elementFilterSelect.options.length > 1) {
      elementFilterSelect.remove(1);
    }

    Array.from(allElements).sort().forEach(el => {
      const opt = document.createElement("option");
      opt.value = el;
      opt.textContent = el;
      elementFilterSelect.appendChild(opt);
    });
  }

  function updateRatingHeader() {
    ratingHeader.textContent = "Ocena (wersja " + currentVersion + ")";
  }

  // --- Rysowanie tabeli ---
  function renderTable() {
    charactersTableBody.innerHTML = "";

    const nameFilter = nameFilterInput.value.trim().toLowerCase();
    const elementFilter = elementFilterSelect.value;
    const rarityFilter = rarityFilterSelect.value;
    const roleFilter = roleFilterInput.value.trim().toLowerCase();

    const entries = Object.entries(tierHistory);

    entries.forEach(([name, data]) => {
      const rarity = data.rarity || "";
      const weapon = data.weapon || "";
      const element = data.element || "";
      const role = data.role || "";
      const history = data.history || {};
      const debutVersion = data.debiut || null;

      // Filtrowanie
      if (nameFilter && !name.toLowerCase().includes(nameFilter)) {
        return;
      }
      if (elementFilter && element !== elementFilter) {
        return;
      }
      if (rarityFilter && rarity !== rarityFilter) {
        return;
      }
      if (roleFilter && !role.toLowerCase().includes(roleFilter)) {
        return;
      }

      // Czy w tej wersji postać powinna być dostępna?
      // Jeśli brak debiutu -> traktujemy jak "zawsze dostępna".
      let isLockedByDebut = false;
      if (debutVersion) {
        // Jeśli aktualnie edytowana wersja jest NIŻSZA niż wersja debiutu,
        // postać jeszcze nie istnieje w grze → blokujemy ocenę.
        if (compareVersions(currentVersion, debutVersion) < 0) {
          isLockedByDebut = true;
        }
      }

      const currentRating = history[currentVersion]?.rating || "";

      const tr = document.createElement("tr");
      if (isLockedByDebut) {
        tr.classList.add("debut-locked-row");
        tr.title = `Postać debiutuje w wersji ${debutVersion}. Nie można jej oceniać w wersji ${currentVersion}.`;
      }

      // Postać
      const tdName = document.createElement("td");
      tdName.textContent = name;
      tr.appendChild(tdName);

      // Debiut
      const tdDebut = document.createElement("td");
      // Jeśli z jakiegoś powodu nie ma pola "debiut", pokazujemy "-"
      tdDebut.textContent = debutVersion || "-";
      tr.appendChild(tdDebut);

      // Rzadkość
      const tdRarity = document.createElement("td");
      tdRarity.textContent = rarity;
      tr.appendChild(tdRarity);

      // Broń
      const tdWeapon = document.createElement("td");
      tdWeapon.textContent = weapon;
      tr.appendChild(tdWeapon);

      // Żywioł
      const tdElement = document.createElement("td");
      tdElement.textContent = element;
      tr.appendChild(tdElement);

      // Rola – edytowalna
      const tdRole = document.createElement("td");
      const roleInput = document.createElement("input");
      roleInput.type = "text";
      roleInput.value = role;

      roleInput.addEventListener("input", () => {
        // Aktualizujemy rolę bezpośrednio w obiekcie tierHistory
        tierHistory[name].role = roleInput.value.trim();
      });

      tdRole.appendChild(roleInput);
      tr.appendChild(tdRole);

      // Ocena dla aktualnej wersji
      const tdRating = document.createElement("td");
      const select = document.createElement("select");

      // Pusta opcja – oznacza "brak ratingu dla tej wersji"
      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "- brak -";
      select.appendChild(emptyOpt);

      AVAILABLE_RATINGS.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = r;
        select.appendChild(opt);
      });

      select.value = currentRating || "";

      if (isLockedByDebut) {
        // Blokada: nie można ustawić oceny, select wyszarzony
        select.disabled = true;
        // Opcjonalnie można wymusić wyczyszczenie lokalnej wartości:
        // select.value = "";
      } else {
        select.addEventListener("change", () => {
          const value = select.value;
          if (!tierHistory[name].history) {
            tierHistory[name].history = {};
          }

          if (!value) {
            // Usuwamy wpis dla tej wersji – brak ratingu = brak postaci w tej wersji
            delete tierHistory[name].history[currentVersion];
          } else {
            tierHistory[name].history[currentVersion] = { rating: value };
          }
        });
      }

      tdRating.appendChild(select);
      tr.appendChild(tdRating);

      // Kliknięcie wiersza – zaznaczenie
      tr.addEventListener("click", () => {
        if (selectedRow && selectedRow !== tr) {
          selectedRow.classList.remove("selected-row");
        }
        tr.classList.add("selected-row");
        selectedRow = tr;
      });

      charactersTableBody.appendChild(tr);
    });

    // Po odświeżeniu tabeli odświeżamy też widok graficzny
    if (visualBoard) {
      renderVisualBoard();
    }

  }

  // --- Widok graficzny: drag & drop portretów ---

  function setupVisualBoardDnD() {
    const zones = visualBoard.querySelectorAll(".visual-dropzone");
    zones.forEach(zone => {
      const rating = zone.dataset.rating || "";
      // Wiersz "Niedostępne" (rating = "locked") jest tylko informacyjny – bez DnD
      if (rating === "locked") {
        return;
      }

      zone.addEventListener("dragover", handleZoneDragOver);
      zone.addEventListener("dragleave", handleZoneDragLeave);
      zone.addEventListener("drop", handleZoneDrop);
    });
  }

  function renderVisualBoard() {
    if (!visualBoard) return;

    const nameFilter = nameFilterInput.value.trim().toLowerCase();
    const elementFilter = elementFilterSelect.value;
    const rarityFilter = rarityFilterSelect.value;
    const roleFilter = roleFilterInput.value.trim().toLowerCase();

    // Dropzony indeksujemy po "rating|rolegroup"
    const dropzones = {};
    visualBoard.querySelectorAll(".visual-dropzone").forEach(zone => {
      const rating = zone.dataset.rating || "";
      const group = zone.dataset.rolegroup || "";
      const key = rating + "|" + group;
      dropzones[key] = zone;
      zone.innerHTML = "";
    });

    const entries = Object.entries(tierHistory);

    entries.forEach(([name, data]) => {
      const rarity = data.rarity || "";
      const weapon = data.weapon || "";
      const element = data.element || "";
      const role = data.role || "";
      const history = data.history || {};
      const debutVersion = data.debiut || null;

      // Te same filtry, co w tabeli
      if (nameFilter && !name.toLowerCase().includes(nameFilter)) {
        return;
      }
      if (elementFilter && element !== elementFilter) {
        return;
      }
      if (rarityFilter && rarity !== rarityFilter) {
        return;
      }
      if (roleFilter && !role.toLowerCase().includes(roleFilter)) {
        return;
      }

      // Blokada debiutu
      let isLockedByDebut = false;
      if (debutVersion) {
        if (compareVersions(currentVersion, debutVersion) < 0) {
          isLockedByDebut = true;
        }
      }

      // Czy postać debiutuje dokładnie w aktualnie edytowanej wersji?
      let isDebutThisVersion = false;
      if (debutVersion && compareVersions(currentVersion, debutVersion) === 0) {
        isDebutThisVersion = true;
      }

      const currentRating = history[currentVersion]?.rating || "";

      // Jeśli postać jest niedostępna w tej wersji (debiut później),
      // kierujemy ją do wiersza "locked" niezależnie od ratingu.
      let ratingKey;
      if (isLockedByDebut) {
        ratingKey = "locked";
      } else {
        ratingKey = currentRating || "";
      }

      const group = getRoleGroup(role);
      const zoneKey = ratingKey + "|" + group;
      const zone = dropzones[zoneKey];

      if (!zone) {
        return;
      }

      // Kafelek postaci
      const tile = document.createElement("div");
      tile.classList.add("character-tile");
      tile.dataset.name = name;

      const img = document.createElement("img");
      img.src = `images/characters/${name}.png`;
      img.alt = name;

      const label = document.createElement("span");
      label.textContent = name;

      tile.appendChild(img);
      tile.appendChild(label);

      if (isLockedByDebut) {
        tile.classList.add("debut-locked");
        tile.draggable = false;
        tile.title = `Postać debiutuje w wersji ${debutVersion}. Nie można jej oceniać w wersji ${currentVersion}.`;
      } else {
        // Jeśli postać debiutuje dokładnie w tej wersji – podświetl kafelek na jasnozielono
        if (isDebutThisVersion) {
          tile.classList.add("debut-current");
          tile.title = `Postać debiutuje w wersji ${currentVersion}.`;
        }

        tile.draggable = true;
        tile.addEventListener("dragstart", handleTileDragStart);
        tile.addEventListener("dragend", handleTileDragEnd);
      }

      zone.appendChild(tile);
    });
  }

  function handleTileDragStart(e) {
    currentlyDraggedName = this.dataset.name;
    this.classList.add("dragging");
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", currentlyDraggedName);
    }
  }

  function handleTileDragEnd() {
    this.classList.remove("dragging");
    currentlyDraggedName = null;

    if (tierHint) {
      tierHint.style.display = "none";
    }
  }

  function handleZoneDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    this.classList.add("drag-over");

    // >>> NOWY KOD – napis z nazwą tieru przy przeciąganym obrazku
    if (tierHint) {
      const rating = this.dataset.rating || "";
      // Jeśli chcesz mieć dokładnie literę tieru (SS, S, A, ...):
      tierHint.textContent = rating || "–";

      tierHint.style.display = "block";
      // Ustawiamy pozycję przy kurszorze, CSS przesuwa napis w LEWO od kursora
      tierHint.style.left = e.clientX + "px";
      tierHint.style.top = e.clientY + "px";
    }
    // <<< KONIEC NOWEGO KODU

  }

  function handleZoneDragLeave() {
    this.classList.remove("drag-over");

    if (tierHint) {
      tierHint.style.display = "none";
    }
  }

  function handleZoneDrop(e) {
    e.preventDefault();
    this.classList.remove("drag-over");

    if (tierHint) {
      tierHint.style.display = "none";
    }

    const fromData = e.dataTransfer ? e.dataTransfer.getData("text/plain") : "";
    const name = fromData || currentlyDraggedName;
    if (!name) return;

    const targetRating = this.dataset.rating || "";
    const targetRoleGroup = this.dataset.rolegroup || "";

    const data = tierHistory[name];
    if (!data) return;

    const debutVersion = data.debiut || null;
    if (debutVersion && compareVersions(currentVersion, debutVersion) < 0) {
      // Bezpieczeństwo: nie pozwalamy na zmianę ratingu przed debiutem
      return;
    }

    if (!data.history) {
      data.history = {};
    }

    if (!targetRating) {
      // Przeciągnięcie do wiersza "brak oceny" usuwa rating z tej wersji
      delete data.history[currentVersion];
    } else {
      data.history[currentVersion] = { rating: targetRating };
    }

    // Zmiana roli zgodnie z kolumną
    if (targetRoleGroup) {
      data.role = targetRoleGroup;
    }

    // Odśwież tabelę + widok graficzny
    renderTable();
  }

  // --- Obsługa zdarzeń ---

  // Zmiana wersji
  versionSelect.addEventListener("change", () => {
    currentVersion = versionSelect.value;
    updateRatingHeader();
    renderTable();

    // Jeśli jesteśmy w fullscreenie, odśwież tekst napisu
    if (document.fullscreenElement === visualPanel && fullscreenVersionLabel) {
      fullscreenVersionLabel.textContent = "Wersja " + currentVersion;
    }
  });

  // Dodawanie nowej wersji
  addVersionBtn.addEventListener("click", () => {
    const raw = newVersionInput.value.trim();
    if (!raw) {
      alert("Podaj numer wersji, np. 6.2.");
      return;
    }

    // Proste czyszczenie formatu – usuwamy spacje
    const newVersion = raw.replace(/\s+/g, "");

    if (versions.includes(newVersion)) {
      alert("Wersja " + newVersion + " już istnieje na liście.");
      return;
    }

    versions.push(newVersion);
    versions.sort();
    currentVersion = newVersion;
    newVersionInput.value = "";

    fillVersionSelect();
    updateRatingHeader();
    renderTable();
  });

  // Filtry – każdy triggeruje render
  nameFilterInput.addEventListener("input", renderTable);
  elementFilterSelect.addEventListener("change", renderTable);
  rarityFilterSelect.addEventListener("change", renderTable);
  roleFilterInput.addEventListener("input", renderTable);

  // Zwijanie / rozwijanie panelu tabeli
  if (tablePanel && toggleTableBtn) {
    toggleTableBtn.addEventListener("click", () => {
      const isCollapsed = tablePanel.classList.toggle("collapsed");
      toggleTableBtn.textContent = isCollapsed ? "Rozwiń tabelę" : "Zwiń tabelę";
    });
  }

  // Przycisk pełnego ekranu dla widoku graficznego
  if (visualPanel && fullscreenBtn) {
    function updateFullscreenButton() {
      const isFullscreen = document.fullscreenElement === visualPanel;

      // Tekst przycisku
      fullscreenBtn.textContent = isFullscreen ? "Zamknij pełny ekran" : "Pełny ekran";

      // Napis z wersją w fullscreenie
      if (fullscreenVersionLabel) {
        if (isFullscreen) {
          fullscreenVersionLabel.textContent = "Wersja " + currentVersion;
          fullscreenVersionLabel.classList.add("visible");
        } else {
          fullscreenVersionLabel.classList.remove("visible");
        }
      }
    }

    fullscreenBtn.addEventListener("click", () => {
      if (document.fullscreenElement) {
        // Jeśli już jesteśmy w trybie pełnoekranowym – wyjdź
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      } else {
        // Wejdź w pełny ekran tylko dla panelu graficznego
        if (visualPanel.requestFullscreen) {
          visualPanel.requestFullscreen();
        }
      }
    });

    // Reakcja na wejście/wyjście z pełnego ekranu (np. ESC, F11, klik przycisku)
    document.addEventListener("fullscreenchange", updateFullscreenButton);
  }

  // Generowanie kodu
  generateBtn.addEventListener("click", () => {
    // Tworzymy kopię obiektu z posortowanymi wersjami w polu "history"
    const sortedTierHistory = {};

    Object.entries(tierHistory).forEach(([name, data]) => {
      // Płytka kopia danych postaci (rarity, weapon, element, role, debiut itd.)
      const copy = { ...data };

      if (data.history) {
        // Posortowane wpisy history po wersji (od najstarszej do najnowszej)
        const historyEntries = Object.entries(data.history).sort(
          ([va], [vb]) => compareVersions(va, vb)
        );

        const sortedHistory = {};
        historyEntries.forEach(([version, versionData]) => {
          sortedHistory[version] = versionData;
        });

        copy.history = sortedHistory;
      }

      sortedTierHistory[name] = copy;
    });

    let objString = JSON.stringify(sortedTierHistory, null, 2);

    // Zamiana obiektów history z wielolinijkowych na jednolinijkowe
    objString = objString.replace(
      /"(\d+\.\d+)": {\s+"rating": "([A-Z]+)"\s+}/g,
      '"$1": { "rating": "$2" }'
    );

    const output = "window.tierHistory = " + objString + ";\n";
    outputArea.value = output;
    outputArea.focus();
    outputArea.select();
  });

  // Start
  initFromTierHistory();
})();
