function detectDeviceMode() {
  const isSmallScreen = window.matchMedia("(max-width: 900px)").matches;
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
  const forceMobile = new URLSearchParams(window.location.search).get("mobile") === "1";

  const isMobile = (isSmallScreen && isTouch) || forceMobile;

  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  const isLandscape = window.matchMedia("(orientation: landscape)").matches;

  document.body.classList.toggle("is-mobile", isMobile);
  document.body.classList.toggle("is-desktop", !isMobile);

  document.body.classList.toggle("is-portrait", isMobile && isPortrait);
  document.body.classList.toggle("is-landscape", isMobile && isLandscape);

  syncMobileChrome(isMobile);
  if (isMobile) updateMobileChrome();
}

const MOBILE_PAGE_META = {
  "home.html": ["Genshin Companion", "Dashboard mobilny"],
  "index.html": ["Biblioteka postaci", "index.html mobile"],
  "character.html": ["Raiden Shogun", "character.html"],
  "materials.html": ["Materials", "materials.html"],
  "materials-character.html": ["Character Materials", "materials-character.html"],
  "bosses.html": ["Bosses", "bosses.html"],
  "guide.html": ["Boss Guide", "guide.html?id=shogun"],
  "planner.html": ["Farm Planner", "planner.html"],
  "team-planner.html": ["Team Planner", "team-planner.html"],
  "imaginarium-theater.html": ["Imaginarium Theater", "imaginarium-theater.html"],
  "tier-list.html": ["Tier List", "tier-list.html"],
  "tier-analytics.html": ["Tier Analytics", "tier-analytics.html"],
  "pity.html": ["Pity", "pity.html"],
  "settings.html": ["Ustawienia", "settings.html"]
};

const MOBILE_BOTTOM_SETS = {
  home: [
    ["home.html", "Home", "⌂"],
    ["index.html", "Postacie", "◉"],
    ["materials.html", "Maty", "▦"],
    ["settings.html", "Ustaw.", "⚙"]
  ],
  character: [
    ["home.html", "Home", "⌂"],
    ["character.html", "Info", "◉"],
    ["character.html#summary", "Build", "▦"],
    ["team-planner.html", "Teams", "◇"]
  ],
  materials: [
    ["home.html", "Home", "⌂"],
    ["materials.html", "Materials", "▦"],
    ["materials.html#demand", "Demand", "◇"],
    ["settings.html", "Settings", "⚙"]
  ],
  tiers: [
    ["home.html", "Home", "⌂"],
    ["tier-analytics.html", "Analytics", "▥"],
    ["tier-list.html", "Tiers", "★"],
    ["settings.html", "More", "⚙"]
  ],
  teams: [
    ["home.html", "Home", "⌂"],
    ["today.html", "Today", "◴"],
    ["team-planner.html", "Teams", "◆"],
    ["settings.html", "More", "⚙"]
  ],
  pity: [
    ["home.html", "Home", "⌂"],
    ["pity.html", "Pity", "✦"],
    ["tier-list.html", "Tiers", "★"],
    ["settings.html", "More", "⚙"]
  ],
  planner: [
    ["home.html", "Home", "⌂"],
    ["today.html", "Today", "✓"],
    ["planner.html", "Planner", "▤"],
    ["settings.html", "Settings", "⚙"]
  ],
  bosses: [
    ["home.html", "Home", "⌂"],
    ["materials.html", "Materials", "▦"],
    ["bosses.html", "Bosses", "◆"],
    ["settings.html", "Settings", "⚙"]
  ]
};

function mobileFileName() {
  const path = window.location.pathname || "";
  const file = path.split("/").pop() || "home.html";
  return file.toLowerCase();
}

function mobileGroup(file) {
  if (file === "character.html") return "character";
  if (file === "materials.html" || file === "materials-character.html") return "materials";
  if (file === "tier-list.html" || file === "tier-analytics.html") return "tiers";
  if (file === "team-planner.html" || file === "imaginarium-theater.html") return "teams";
  if (file === "pity.html") return "pity";
  if (file === "planner.html" || file === "today.html") return "planner";
  if (file === "bosses.html" || file === "guide.html") return "bosses";
  return "home";
}

function mobileLabelFromActiveTab() {
  const active = document.querySelector(".tab-button.active, .tab-btn.active, .pity__tab.is-active, .tp__segBtn.is-active");
  return active ? active.textContent.trim() : "";
}

function syncMobileChrome(isMobile) {
  let chrome = document.querySelector(".mobile-chrome");
  let bottom = document.querySelector(".mobile-bottom-nav");

  if (!isMobile) {
    if (chrome) chrome.remove();
    if (bottom) bottom.remove();
    return;
  }

  if (!chrome) {
    chrome = document.createElement("header");
    chrome.className = "mobile-chrome";
    chrome.innerHTML = `
      <div class="mobile-status"><span>9:41</span><span>5G 84%</span></div>
      <div class="mobile-titlebar">
        <button type="button" class="mobile-icon-btn" aria-label="Back">‹</button>
        <div class="mobile-title-copy">
          <strong class="mobile-title">Genshin Companion</strong>
          <span class="mobile-subtitle">Dashboard mobilny</span>
        </div>
        <button type="button" class="mobile-icon-btn mobile-menu-btn" aria-label="Menu">☰</button>
      </div>
    `;
    document.body.insertBefore(chrome, document.body.firstChild);
    chrome.querySelector(".mobile-icon-btn").addEventListener("click", () => {
      if (history.length > 1) history.back();
    });
  }

  if (!bottom) {
    bottom = document.createElement("nav");
    bottom.className = "mobile-bottom-nav";
    bottom.setAttribute("aria-label", "Mobile navigation");
    document.body.appendChild(bottom);
  }
}

function updateMobileChrome() {
  const file = mobileFileName();
  const meta = MOBILE_PAGE_META[file] || ["Genshin Companion", file];
  const pageClass = "mobile-page-" + file.replace(/[^a-z0-9]/g, "-");

  Array.from(document.body.classList)
    .filter((name) => name.startsWith("mobile-page-"))
    .forEach((name) => document.body.classList.remove(name));
  document.body.classList.add(pageClass);

  const title = document.querySelector(".mobile-title");
  const subtitle = document.querySelector(".mobile-subtitle");
  if (title) title.textContent = meta[0];
  if (subtitle) {
    const tab = mobileLabelFromActiveTab();
    subtitle.textContent = tab ? `${meta[1]} · ${tab}` : meta[1];
  }

  const menu = document.querySelector(".mobile-menu-btn");
  if (menu) menu.textContent = file === "settings.html" || file === "team-planner.html" || file === "imaginarium-theater.html" || file === "tier-list.html" || file === "tier-analytics.html" || file === "pity.html" ? "⚙" : "⋯";

  const bottom = document.querySelector(".mobile-bottom-nav");
  if (!bottom) return;
  const set = MOBILE_BOTTOM_SETS[mobileGroup(file)] || MOBILE_BOTTOM_SETS.home;
  bottom.innerHTML = set.map(([href, label, icon]) => {
    const active = href.split("#")[0] === file;
    return `<a class="${active ? "active" : ""}" href="${href}"><span>${icon}</span><strong>${label}</strong></a>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", detectDeviceMode);
document.addEventListener("globalnav:rendered", () => {
  if (document.body.classList.contains("is-mobile")) updateMobileChrome();
});
document.addEventListener("click", (event) => {
  if (event.target.closest(".tab-button, .tab-btn, .pity__tab, .tp__segBtn")) {
    window.setTimeout(updateMobileChrome, 0);
  }
});
window.addEventListener("resize", detectDeviceMode);
window.addEventListener("orientationchange", detectDeviceMode);
