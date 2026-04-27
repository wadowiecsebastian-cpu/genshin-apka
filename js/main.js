function renderRotation(rotation, container) {
  const rotationContainer = document.createElement("div");
  rotationContainer.className = "rotation-container";

  rotation.forEach(step => {
    const stepDiv = document.createElement("div");
    stepDiv.className = "rotation-step";

    const skillTitle = document.createElement("div");
    skillTitle.className = "rotation-skill-title";
    skillTitle.textContent = `${step.character} ${step.skill}`;
    stepDiv.appendChild(skillTitle);

    const icon = document.createElement("img");
    icon.src = step.icon;
    icon.alt = `${step.character} ${step.skill}`;
    icon.className = "rotation-icon";
    stepDiv.appendChild(icon);

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

const STAT_GOAL_ROWS = [
  { label: "Max HP", min: "hpMin", rec: "hpRecommended" },
  { label: "ATK", min: "atkMin", rec: "atkRecommended" },
  { label: "DEF", min: "defMin", rec: "defRecommended" },
  { label: "CRIT Rate", min: "crMin", rec: "crRecommended" },
  { label: "CRIT DMG", min: "cdMin", rec: "cdRecommended" },
  { label: "Energy Recharge", min: "erMin", rec: "erRecommended" },
  { label: "Elemental Mastery", min: "emMin", rec: "emRecommended" }
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function formatNumber(value) {
  return typeof value === "number" ? value.toLocaleString("en-US") : value;
}

function rarityStars(value) {
  const count = (String(value || "").match(/★/g) || []).length;
  return count ? "★".repeat(count) : String(value || "-");
}

function shortText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > 190 ? text.slice(0, 187).trim() + "..." : text;
}

function imgMarkup(src, alt, className = "") {
  if (!src) {
    return `<span class="${escapeHtml(className)} is-missing" aria-label="${escapeHtml(alt)}">${escapeHtml(String(alt || "?").slice(0, 1))}</span>`;
  }
  return `<img class="${escapeHtml(className)}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.classList.add('is-missing'); this.removeAttribute('src');">`;
}

function getFullscreenElement() {
  return document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null;
}

function requestElementFullscreen(element) {
  if (!element) return;
  if (element.requestFullscreen) element.requestFullscreen();
  else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
  else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
  else if (element.msRequestFullscreen) element.msRequestFullscreen();
}

function materialByKey(key) {
  if (typeof MATERIALS === "undefined") return null;
  return Object.values(MATERIALS)
    .flatMap(section => section?.items || [])
    .find(item => item.key === key) || null;
}

function gemBy(group, tier) {
  if (typeof MATERIALS === "undefined") return null;
  return (MATERIALS.gems?.items || []).find(item => item.group === group && item.tier === tier) || null;
}

function bookBy(group, tier) {
  if (typeof MATERIALS === "undefined") return null;
  return (MATERIALS.books?.items || []).find(item => item.group === group && item.tier === tier) || null;
}

function enemyBy(group, tier) {
  if (typeof MATERIALS === "undefined") return null;
  return (MATERIALS.enemies?.items || []).find(item => item.group === group && item.tier === tier) || null;
}

function materialPreview(characterName) {
  if (typeof CHARACTER_COSTS === "undefined") return [];
  const costs = CHARACTER_COSTS[characterName];
  if (!costs) return [];

  const picks = costs.picks || {};
  const element = String(costs.element || "").toLowerCase();

  return [
    gemBy(element, 4),
    materialByKey(picks.bossNormal),
    materialByKey(picks.local),
    bookBy(picks.books, 3),
    enemyBy(picks.enemiesTal, 3),
    materialByKey(picks.bossWeekly)
  ].filter(Boolean);
}

function uniqueTeamMates(characterName, teams) {
  const seen = new Set();
  return (teams || [])
    .flatMap(team => team.members || [])
    .filter(member => member.name && member.name !== characterName)
    .filter(member => {
      const key = member.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function renderCharacterChrome(characterName, data, roleName, role) {
  const stats = data.stats || {};
  const bestWeapon = role?.weapons?.best;
  const bestArtifact = role?.artifacts?.best;
  const subStats = Array.isArray(role?.subStats) ? role.subStats : [];
  const materials = materialPreview(characterName);
  const mates = uniqueTeamMates(characterName, data.teams || []);
  const summary = role?.weapons?.["Weapons Summary"] || role?.artifacts?.["Artifacts Summary"] || data.strengths?.[0] || "";

  document.getElementById("character-name").textContent = characterName;
  document.getElementById("character-role-kicker").textContent = roleName || "Character";
  document.getElementById("character-meta").innerHTML = `
    <span class="element-pill element-${escapeHtml(String(data.element || "").toLowerCase())}">${escapeHtml(data.element || "-")}</span>
    <span class="star-text">${escapeHtml(rarityStars(data.rarity))}</span>
    <span>${escapeHtml(data.rating || "-")}</span>
  `;
  document.getElementById("character-summary").textContent = shortText(summary);
  document.getElementById("character-tags").innerHTML = [data.weapon, data.element, roleName].filter(Boolean).map(tag => `<span>${escapeHtml(tag)}</span>`).join("");

  const statRows = [
    ["Max HP", stats.hp],
    ["ATK", stats.atk],
    ["DEF", stats.def],
    [stats.extra?.name, stats.extra?.value]
  ].filter(row => row[0]);

  document.getElementById("character-base-stats").innerHTML = statRows.map(([label, value]) => `
    <div class="base-stat-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(formatNumber(value || 0))}</strong></div>
  `).join("");

  document.getElementById("character-featured-weapon").innerHTML = bestWeapon ? `
    <div class="featured-weapon-card">
      ${imgMarkup(bestWeapon.image, bestWeapon.name, "featured-weapon-card__img")}
      <div>
        <h3>${escapeHtml(bestWeapon.name)}</h3>
        <p>Best weapon</p>
        <strong class="star-text">${escapeHtml(rarityStars(data.rarity))}</strong>
      </div>
    </div>
  ` : "";

  document.getElementById("character-side-panel").innerHTML = `
    <section class="side-card">
      <h3>Build Summary</h3>
      <ul class="side-list">${(data.strengths || []).slice(0, 5).map(item => `<li>${escapeHtml(item)}</li>`).join("") || "<li>Brak danych.</li>"}</ul>
    </section>

    <section class="side-card">
      <h3>Artifact Stats</h3>
      <div class="side-stat"><span>Sands</span><strong>${escapeHtml(role?.mainStats?.sands || "-")}</strong></div>
      <div class="side-stat"><span>Goblet</span><strong>${escapeHtml(role?.mainStats?.goblet || "-")}</strong></div>
      <div class="side-stat"><span>Circlet</span><strong>${escapeHtml(role?.mainStats?.circlet || "-")}</strong></div>
      <div class="side-substats">${subStats.map((stat, index) => `<span>${index + 1}. ${escapeHtml(stat)}</span>`).join("")}</div>
    </section>

    <section class="side-card">
      <h3>Best Teammates</h3>
      <div class="mini-character-grid">${mates.map(member => `
        <a class="mini-character" href="character.html?character=${encodeURIComponent(member.name)}">
          ${imgMarkup(`Portrety/${member.name}.png`, member.name, "mini-character__img")}
          <span>${escapeHtml(member.name)}</span>
        </a>
      `).join("") || "<p>Brak danych.</p>"}</div>
    </section>

    <section class="side-card">
      <h3>Materials</h3>
      <div class="mini-material-grid">${materials.map(item => `
        <div class="mini-material">
          ${imgMarkup(item.icon, item.name, "mini-material__img")}
          <span>${escapeHtml(item.name)}</span>
        </div>
      `).join("") || "<p>Brak danych materiałów.</p>"}</div>
    </section>
  `;
}

function renderRecommendedStats(containerId, stats, role = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const rows = STAT_GOAL_ROWS
    .map(row => ({
      label: row.label,
      min: stats?.[row.min] || "",
      rec: stats?.[row.rec] || ""
    }))
    .filter(row => row.min || row.rec);

  const subStats = Array.isArray(role?.subStats) ? role.subStats : [];

  container.innerHTML = `
    <section class="character-panel stats-goals-panel">
      <div class="character-panel__head">
        <h2>Recommended Stats</h2>
        <p>Stat goals zapisane w aktualnym pliku danych.</p>
      </div>

      <table class="recommended-stats-table">
        <thead>
          <tr>
            <th>Stat</th>
            <th>Minimum</th>
            <th>Recommended</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map(row => `
            <tr>
              <td>${escapeHtml(row.label)}</td>
              <td>${escapeHtml(row.min || "-")}</td>
              <td>${escapeHtml(row.rec || "-")}</td>
            </tr>
          `).join("") : `<tr><td colspan="3">Brak uzupełnionych progów statystyk dla tej postaci.</td></tr>`}
        </tbody>
      </table>

      <div class="stat-priority-card">
        <h3>Substat Priority</h3>
        ${subStats.length ? subStats.map((stat, index) => `
          <div class="priority-row"><span>${index + 1}</span><strong>${escapeHtml(stat)}</strong></div>
        `).join("") : `<p>Brak priorytetu substatów w danych.</p>`}
      </div>
    </section>
  `;
}

function renderSummary(containerId, characterName, data, roleName, role = {}, recommendedStats = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const sanitizeAsset = (value) => {
    const path = String(value || "").trim();
    return path && !/[\\/]$/.test(path) ? path : "";
  };

  const summaryText =
    role?.artifacts?.["Artifacts Summary"] ||
    role?.weapons?.["Weapons Summary"] ||
    data.strengths?.[0] ||
    "No build summary available.";

  const weapons = [
    role?.weapons?.best ? { ...role.weapons.best, label: "Best in Slot" } : null,
    ...(role?.weapons?.alternatives || []).map((item, index) => ({
      ...item,
      label: `Alternative ${index + 1}`
    }))
  ]
    .filter(Boolean)
    .map(item => ({ ...item, image: sanitizeAsset(item.image) }))
    .slice(0, 4);

  const artifacts = ["best", "secondary", "third"]
    .map((key) => {
      const item = role?.artifacts?.[key];
      if (!item) return null;

      const image = sanitizeAsset(item.image || (Array.isArray(item.images) ? item.images.find(Boolean) : ""));
      const cleanedName = String(item.name || "").replace(/\+/g, "").trim();
      if (!cleanedName && !image) return null;

      const labels = {
        best: "Best Set",
        secondary: "Secondary",
        third: "Third Set"
      };

      return {
        label: labels[key] || key,
        name: String(item.name || "").trim(),
        image
      };
    })
    .filter(item => item && item.name && item.name !== "+");

  const mainStats = [
    { label: "Sands", value: role?.mainStats?.sands || "-" },
    { label: "Goblet", value: role?.mainStats?.goblet || "-" },
    { label: "Circlet", value: role?.mainStats?.circlet || "-" }
  ];

  const subStats = Array.isArray(role?.subStats) ? role.subStats.slice(0, 5) : [];

  const targetRows = STAT_GOAL_ROWS
    .map(row => ({
      label: row.label,
      min: recommendedStats?.[row.min] || "",
      rec: recommendedStats?.[row.rec] || ""
    }))
    .filter(row => row.min || row.rec);

  const teams = (data.teams || []).slice(0, 4);

  const iconBadges = [
    data.element ? { src: `Element Icons/${data.element}.png`, alt: data.element, label: data.element } : null,
    data.weapon ? { src: `Weapon Icons/${data.weapon}.png`, alt: data.weapon, label: data.weapon } : null,
    data.rating ? { src: `Rating Icons/${data.rating}.png`, alt: `${data.rating} rating`, label: `${data.rating} rating` } : null
  ].filter(Boolean);

  container.innerHTML = `
    <section class="character-panel summary-panel summary-panel--zoomable" tabindex="0" role="button" aria-label="Otwórz zakładkę Summary na pełnym ekranie" title="Kliknij, aby otworzyć ten widok na pełnym ekranie">

      <header class="summary-fullscreen-hero">
        <div class="summary-fullscreen-hero__art">
          ${imgMarkup(`Splash Arts/${characterName}_Wish.webp`, characterName, "summary-fullscreen-hero__img")}
        </div>
        <div class="summary-fullscreen-hero__copy">
          <span class="summary-fullscreen-hero__eyebrow">Character</span>
          <h2>${escapeHtml(characterName)}</h2>
        </div>
      </header>

      <div class="summary-dashboard">
        <div class="summary-column">
          <section class="summary-card">
            <div class="summary-card__head">
              <h3>Weapons</h3>
              <p>Best option plus the most relevant alternatives.</p>
            </div>
            <div class="summary-option-grid">
              ${weapons.length ? weapons.map(item => `
                <article class="summary-option">
                  <span class="summary-option__label">${escapeHtml(item.label)}</span>
                  ${imgMarkup(item.image, item.name, "summary-option__media")}
                  <strong class="summary-option__name">${escapeHtml(item.name)}</strong>
                </article>
              `).join("") : `<p class="summary-empty">No weapon data available.</p>`}
            </div>
          </section>

          <section class="summary-card">
            <div class="summary-card__head">
              <h3>Artifacts</h3>
              <p>Recommended sets for the selected build role.</p>
            </div>
            <div class="summary-option-grid">
              ${artifacts.length ? artifacts.map(item => `
                <article class="summary-option">
                  <span class="summary-option__label">${escapeHtml(item.label)}</span>
                  ${imgMarkup(item.image, item.name, "summary-option__media")}
                  <strong class="summary-option__name">${escapeHtml(item.name)}</strong>
                </article>
              `).join("") : `<p class="summary-empty">No artifact data available.</p>`}
            </div>
          </section>

          <div class="summary-stat-grid">
            <section class="summary-card">
              <div class="summary-card__head">
                <h3>Main Stats</h3>
                <p>Primary artifact pieces for this build.</p>
              </div>
              <div class="summary-stat-list">
                ${mainStats.map(row => `
                  <div class="summary-stat-pill">
                    <span>${escapeHtml(row.label)}</span>
                    <strong>${escapeHtml(row.value)}</strong>
                  </div>
                `).join("")}
              </div>
            </section>

            <section class="summary-card">
              <div class="summary-card__head">
                <h3>Substats</h3>
                <p>Priority order from the current role data.</p>
              </div>
              <ol class="summary-substat-list">
                ${subStats.length ? subStats.map(stat => `<li>${escapeHtml(stat)}</li>`).join("") : `<li>No substat priority available.</li>`}
              </ol>
            </section>
          </div>
        </div>

        <div class="summary-column summary-column--side">
          <section class="summary-card summary-card--teams">
            <div class="summary-card__head">
              <h3>Team Comps</h3>
              <p>Top four teams already stored for this character.</p>
            </div>
            <div class="summary-team-list">
              ${teams.length ? teams.map(team => `
                <article class="summary-team-card">
                  <div class="summary-team-card__top">
                    <h4>${escapeHtml(team.name || "Team")}</h4>
                    <span>${escapeHtml(String((team.members || []).length || 0))} slots</span>
                  </div>
                  <div class="summary-team-members">
                    ${(team.members || []).map(member => `
                      <div class="summary-team-member">
                        ${imgMarkup(`Portrety/${member.name}.png`, member.name, "summary-team-member__img")}
                        <span>${escapeHtml(member.name)}</span>
                      </div>
                    `).join("")}
                  </div>
                  <p>${escapeHtml(shortText(team.comment || "No team comment available."))}</p>
                </article>
              `).join("") : `<p class="summary-empty">No team data available.</p>`}
            </div>
          </section>

        </div>
      </div>
    </section>
  `;

  const summaryTab = document.getElementById("summary");
  const summaryPanel = container.querySelector(".summary-panel--zoomable");

  const openSummaryFullscreen = () => {
    if (!summaryTab || getFullscreenElement() === summaryTab) return;
    requestElementFullscreen(summaryTab);
  };

  if (summaryTab && summaryPanel) {
    summaryPanel.addEventListener("click", (event) => {
      if (event.target.closest("a, button, input, select, textarea, label")) return;
      openSummaryFullscreen();
    });

    summaryPanel.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openSummaryFullscreen();
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!document.getElementById("character-name")) return;

  const urlParams = new URLSearchParams(window.location.search);
  let characterName = urlParams.get("character");

  if (!characterName && window.IDB && IDB.kvGet) {
    const last = await IDB.kvGet("lastCharacter");
    if (last) characterName = last;
  }

  if (!characterName || !characterData[characterName]) {
    document.getElementById("character-name").textContent = "Nie znaleziono postaci.";
    return;
  }

  // --- Nawigacja między postaciami (przyciski + klawiatura) ---
  // Lista wszystkich postaci z characterData (posortowana alfabetycznie)
  const characterNames = Object.keys(characterData).sort();

  // Aktualny indeks postaci w tej liście
  let currentIndex = characterNames.indexOf(characterName);
  if (currentIndex === -1) {
    currentIndex = 0;
  }

  const prevBtn = document.getElementById("prev-character");
  const nextBtn = document.getElementById("next-character");

  function goToCharacterByIndex(index) {
    if (!characterNames.length) return;

    // Zapętlamy listę (po wyjściu poza zakres przechodzimy na początek/koniec)
    if (index < 0) index = characterNames.length - 1;
    if (index >= characterNames.length) index = 0;

    const targetName = characterNames[index];

    // Ustawiamy parametr ?character=... i przeładowujemy character.html
    const url = new URL(window.location.href);
    url.searchParams.set("character", targetName);
    window.location.href = url.toString();
  }

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => {
      goToCharacterByIndex(currentIndex - 1);
    });

    nextBtn.addEventListener("click", () => {
      goToCharacterByIndex(currentIndex + 1);
    });
  }

  // Strzałki na klawiaturze: lewo / prawo
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToCharacterByIndex(currentIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToCharacterByIndex(currentIndex + 1);
    }
  });
  // --- koniec nowej nawigacji ---

  if (window.IDB && IDB.kvSet) await IDB.kvSet("lastCharacter", characterName);
  const data = characterData[characterName];
  document.getElementById("character-name").textContent = characterName;

  // Poprawiony dostęp do recommendedStats
  const recommendedStats = data.stats?.recommendedStats || data.stats?.extra?.recommendedStats || {};

  const roleSelect = document.getElementById("roleSelect");
  const roles = Object.keys(data.roles || {});
  if (roles.length > 0) {
    roles.forEach(role => {
      const option = document.createElement("option");
      option.value = role;
      option.textContent = role;
      roleSelect.appendChild(option);
    });
    roleSelect.addEventListener("change", () => renderRole(roleSelect.value));
    renderRole(roleSelect.value || roles[0]);
  }

  function renderRole(roleName) {
    const role = data.roles[roleName] || {};

    const portrait = document.getElementById("portrait");
    if (portrait) {
      portrait.classList.remove("is-missing");
      portrait.src = `Splash Arts/${characterName}_Wish.webp`;
      portrait.alt = characterName;
      portrait.onerror = () => {
        portrait.onerror = () => portrait.classList.add("is-missing");
        portrait.src = `Portrety/${characterName}.png`;
      };
    }

    const stats = data.stats || {};
    const summary = role?.artifacts?.["Artifacts Summary"] || role?.weapons?.["Weapons Summary"] || data.strengths?.[0] || "Brak opisu w danych.";
    const info = document.getElementById("info-content");

    info.innerHTML = `
      <section class="character-panel character-info-panel">
        <div class="character-panel__head">
          <h2>Character Info</h2>
          <p>Podstawowe informacje z aktualnych danych aplikacji.</p>
        </div>
        <div class="character-info-grid">
          <div class="character-facts">
            <div><span>Role</span><strong>${escapeHtml(roleName)}</strong></div>
            <div><span>Rating</span><strong>${escapeHtml(data.rating || "-")}</strong></div>
            <div><span>Rarity</span><strong class="star-text">${escapeHtml(rarityStars(data.rarity))}</strong></div>
            <div><span>Weapon</span><strong>${escapeHtml(data.weapon || "-")}</strong></div>
            <div><span>Element</span><strong>${escapeHtml(data.element || "-")}</strong></div>
            <div><span>Max HP</span><strong>${escapeHtml(formatNumber(stats.hp || 0))}</strong></div>
            <div><span>ATK</span><strong>${escapeHtml(formatNumber(stats.atk || 0))}</strong></div>
            <div><span>DEF</span><strong>${escapeHtml(formatNumber(stats.def || 0))}</strong></div>
          </div>
          <article class="character-description-card">
            <h3>Build Description</h3>
            <p>${escapeHtml(summary)}</p>
          </article>
        </div>
      </section>
    `;

    renderCharacterChrome(characterName, data, roleName, role);
    renderSummary("summary-content", characterName, data, roleName, role, recommendedStats);
    renderRecommendedStats("recommendedStats-content", recommendedStats, role);
    renderWeapons("weapons-content", role?.weapons);
    renderArtifacts("artifacts-content", role?.artifacts, role);
  }

  function renderWeapons(containerId, weapons) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    if (!weapons) {
      container.textContent = "Brak danych o broni.";
      return;
    }

    if (weapons["Weapons Summary"]) {
      const summary = document.createElement("p");
      summary.className = "summary-text";
      summary.textContent = weapons["Weapons Summary"];
      container.appendChild(summary);
    }

    const best = weapons.best;
    const alternatives = weapons.alternatives || [];

    if (best) {
      container.appendChild(createItemCard("Najlepsza broń", best));
    }

    if (alternatives.length > 0) {
      const altGroup = document.createElement("div");
      const altHeader = document.createElement("h4");
      altHeader.textContent = "Alternatywy:";
      altGroup.appendChild(altHeader);
      alternatives.forEach(alt => {
        altGroup.appendChild(createItemCard(null, alt));
      });
      container.appendChild(altGroup);
    }
  }

  function renderArtifacts(containerId, artifacts, role) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    if (!artifacts && !role?.mainStats && !role?.subStats) {
      container.textContent = "Brak danych o artefaktach.";
      return;
    }

    if (artifacts?.["Artifacts Summary"]) {
      const summary = document.createElement("p");
      summary.className = "summary-text";
      summary.textContent = artifacts["Artifacts Summary"];
      container.appendChild(summary);
    }

    const sets = ["best", "secondary", "third"];
    sets.forEach(key => {
      if (artifacts[key]) {
        container.appendChild(createArtifactCard(key, artifacts[key]));
      }
    });
    renderStatsTable(container, role);
  }

  function createItemCard(title, item) {
    const wrapper = document.createElement("div");
    wrapper.className = `item-card${title ? "" : " item-card--no-title"}`;

    wrapper.innerHTML = `
      ${title ? `<h3>${escapeHtml(title)}</h3>` : ""}
      <div class="item-card__content${item.image ? "" : " item-card__content--no-media"}">
        ${item.image ? `<div class="item-card__media"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" style="max-width: 120px;"></div>` : ""}
        <div class="item-card__text">
          <strong>${escapeHtml(item.name)}</strong>
          <div class="item-card__description">${item.description || ""}</div>
        </div>
      </div>
    `;

    return wrapper;
  }

  function createArtifactCard(key, artifact) {
    const wrapper = document.createElement("div");
    wrapper.className = "artifact-card";

    const label = {
      best: "Best Set",
      secondary: "Secondary Set",
      third: "Third Set"
    };

    let mediaHtml = "";
    if (Array.isArray(artifact.images) && artifact.images.length > 0) {
      mediaHtml = `<div class="artifact-card__media">${artifact.images.map(src => `<img src="${escapeHtml(src)}" alt="${escapeHtml(artifact.name)}" style="max-width: 100px; border-radius: 8px;">`).join("")}</div>`;
    } else if (artifact.image) {
      mediaHtml = `<div class="artifact-card__media"><img src="${escapeHtml(artifact.image)}" alt="${escapeHtml(artifact.name)}" style="max-width: 120px;"></div>`;
    }

    let descriptionHtml = "";
    if (typeof artifact.description === "string") {
      descriptionHtml = escapeHtml(artifact.description);
    } else if (artifact.description && typeof artifact.description === "object") {
      Object.entries(artifact.description).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          let inferredNames = [];
          if (artifact.name.includes("Mix")) {
            inferredNames = artifact.name.replace("Mix:", "").split("+").map(n => n.trim());
          }

          v.forEach((descText, index) => {
            const setName = inferredNames[index] || `Set ${index + 1}`;
            descriptionHtml += `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(setName)} &mdash; ${escapeHtml(descText)}</div>`;
          });
        } else {
          descriptionHtml += `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</div>`;
        }
      });
    }

    wrapper.innerHTML = `
      <h3>${escapeHtml(label[key] || key)}</h3>
      <div class="artifact-card__content${mediaHtml ? "" : " artifact-card__content--no-media"}">
        ${mediaHtml}
        <div class="artifact-card__text">
          <strong>${escapeHtml(artifact.name)}</strong>
          <div class="artifact-card__description">${descriptionHtml}</div>
        </div>
      </div>
    `;

    return wrapper;
  }

  function renderTeams(containerId, teams) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    if (!teams || teams.length === 0) {
      container.textContent = "Brak danych.";
      return;
    }

    teams.forEach(team => {
      const teamBlock = document.createElement("div");
      teamBlock.className = "team-block";

      const teamName = document.createElement("h3");
      teamName.textContent = team.name;
      teamBlock.appendChild(teamName);

      if (team.comment) {
        const comment = document.createElement("p");
        comment.className = "team-comment";
        comment.textContent = team.comment;
        teamBlock.appendChild(comment);
      }

      const membersWrapper = document.createElement("div");
      membersWrapper.className = "team-members";

      team.members?.forEach(member => {
        const memberDiv = document.createElement("div");
        memberDiv.className = "member";

        const img = document.createElement("img");
        img.src = `images/characters/${member.name}.png`;
        img.alt = member.name;
        img.onerror = () => {
          img.onerror = null;
          img.src = `Portrety/${member.name}.png`;
        };

        const name = document.createElement("strong");
        name.textContent = member.name;

        if (member.name === characterName) {
          name.classList.add("highlighted-character");
        }

        const role = document.createElement("div");
        role.textContent = member.role;

        memberDiv.appendChild(img);
        memberDiv.appendChild(name);
        memberDiv.appendChild(role);

        membersWrapper.appendChild(memberDiv);
      });
      teamBlock.appendChild(membersWrapper);
      container.appendChild(teamBlock);
      if (Array.isArray(team.rotationIcons)) {
        renderRotation(team.rotationIcons, teamBlock);
      }
    });
  }

  function renderList(containerId, list) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    if (!list || list.length === 0) {
      container.textContent = "Brak danych.";
      return;
    }
    const ul = document.createElement("ul");
    list.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }

  renderTeams("teams-content", data.teams || []);
  renderList("strengths-content", data.strengths || []);
  renderList("weaknesses-content", data.weaknesses || []);

  document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));

      button.classList.add("active");
      const tabId = button.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });
});

function renderStatsTable(container, role) {
  if (!role.mainStats && !role.subStats) return;

  const table = document.createElement("table");
  table.className = "artifact-stats-table";

  if (role.mainStats) {
    const mainRow = table.insertRow();
    const cellTitle = mainRow.insertCell();
    cellTitle.textContent = "Artifact Main Stats";
    cellTitle.rowSpan = 3;

    const cellSands = mainRow.insertCell();
    cellSands.innerHTML = `<b>⏳ Sands:</b> ${role.mainStats.sands}`;

    const gobletRow = table.insertRow();
    const cellGoblet = gobletRow.insertCell();
    cellGoblet.colSpan = 1;
    cellGoblet.innerHTML = `<b>🏺 Goblet:</b> ${role.mainStats.goblet}`;

    const circletRow = table.insertRow();
    const cellCirclet = circletRow.insertCell();
    cellCirclet.colSpan = 1;
    cellCirclet.innerHTML = `<b>👑 Circlet:</b> ${role.mainStats.circlet}`;
  }

  if (role.subStats) {
    const subRow = table.insertRow();
    const cellTitle = subRow.insertCell();
    cellTitle.textContent = "Artifact Sub Stats";
    const cellValue = subRow.insertCell();
    cellValue.textContent = role.subStats.join(", ");
  }

  container.appendChild(table);
}
