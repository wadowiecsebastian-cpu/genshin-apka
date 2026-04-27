// global-nav.js
(function(){
  function settingsSnapshot(){
    if (window.__APP_SETTINGS__) return window.__APP_SETTINGS__;
    if (window.AppSettings && window.AppSettings.DEFAULTS) return window.AppSettings.DEFAULTS;
    return null;
  }

  function syncCompanionTheme(settings){
    var current = document.getElementById("companion-theme-css");
    var safeMode = !!(settings && settings.advanced && settings.advanced.safeMode === "on");

    if (safeMode){
      if (current && current.parentNode) current.parentNode.removeChild(current);
      return;
    }

    if (current) return;

    var head = document.head || document.getElementsByTagName("head")[0];
    if (!head) return;

    var link = document.createElement("link");
    link.id = "companion-theme-css";
    link.rel = "stylesheet";
    link.href = "css/companion-theme.css";
    head.appendChild(link);
  }

  function removeTopbar(){
    var bar = document.getElementById("app-chrome-topbar");
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
  }

  syncCompanionTheme(settingsSnapshot());

  // where to mount
  function ensureNavContainer(){
    var existing = document.getElementById("global-nav");
    if (existing) return existing;
    var nav = document.createElement("nav");
    nav.id = "global-nav";
    // insert at top of body
    var body = document.body || document.getElementsByTagName("body")[0];
    if (body.firstChild) body.insertBefore(nav, body.firstChild);
    else body.appendChild(nav);
    return nav;
  }

  function pageFileName(){
    try{
      var path = window.location.pathname || "";
      var file = path.split("/").pop();
      // Fallback for file:///C:/... cases where pathname might end with folder
      if (!file || !/\.(html?|htm)$/i.test(file)){
        // try from document URL
        var url = (document.URL || "").split("?")[0].split("#")[0];
        file = url.split("/").pop();
      }
      return (file || "").toLowerCase();
    }catch(e){ return ""; }
  }

  var LINKS = [
    { href:"home.html",                       text:"Home" },
    { href:"index.html",                      text:"Characters" },
    { href:"materials.html",                  text:"Materials" },
    { href:"bosses.html",                     text:"Bosses" },
    { href:"planner.html",                    text:"Planner" },
    { href:"team-planner.html",               text:"Team Planner" },
    { href:"imaginarium-theater.html",        text:"Imaginarium Theater" },
    { href:"tier-list.html",                  text:"Tier List" },
    { href:"tier-analytics.html",             text:"Analytics" },
    { href:"today.html",                      text:"Today" },
    { href:"pity.html",                       text:"Pity Calculator" },
    { href:"settings.html",                   text:"Settings" },
    { href:"guide.html",                      text:"Guide" },
    { href:"character.html",                  text:"Character Details" },
    { href:"materials-character.html",        text:"Character Materials" },
    { href:"materials-editor.html",           text:"Materials Editor" },
    { href:"tier-history-editor.html",        text:"Tier History Editor" }
  ];

    // --- SETTINGS (nav visibility/order/icons/collapse/startPage) ---
    var NAV_COLLAPSE_STATE_KEY = "nav_collapsed_state_v1";
    var LAST_PAGE_KEY = "app_lastPage_v1";

    var START_REDIRECT_DONE_KEY = "startpage_redirect_done_v1";

    function getStartTarget(settings, currentFile){
      if (!settings || !settings.nav) return null;

      var sp = settings.nav.startPage || "index.html";
      if (sp === "last"){
        // only if rememberViews enabled
        if (!shouldRememberViews(settings)) return null;

        // we try to read last page from IDB kv (async will be handled elsewhere)
        return "last";
     }
      return sp;
   }

    function isEntryPoint(file){
      // Redirect only when user opens "entry pages" to avoid surprising redirects mid-work.
      // These are the pages users most often open to start the app.
      return (file === "index.html" || file === "home.html");
    }

    function hasNoRedirectFlag(){
      try{
        var u = new URL(location.href);
        return u.searchParams.get("noredirect") === "1";
      }catch(e){
        return false;
      }
    }

    function getAppSettingsSafe(){
      // settings-core.js ustawia window.__APP_SETTINGS__ + window.AppSettings.DEFAULTS
      if (window.__APP_SETTINGS__) return window.__APP_SETTINGS__;
      if (window.AppSettings && window.AppSettings.DEFAULTS) return window.AppSettings.DEFAULTS;
      return null;
    }

    function normalizeHref(href){
      return String(href || "").toLowerCase().split("/").pop();
    }

    function getEffectiveLinks(settings){
      var list = LINKS.slice();

      if (!settings || !settings.nav) return list;

      // hidden tabs
      var hidden = Array.isArray(settings.nav.hiddenTabs) ? settings.nav.hiddenTabs : [];
      var hiddenSet = {};
      hidden.forEach(function(h){ hiddenSet[normalizeHref(h)] = true; });

      list = list.filter(function(l){
        return !hiddenSet[normalizeHref(l.href)];
      });

      // order
      var order = Array.isArray(settings.nav.order) ? settings.nav.order : [];
      if (order.length){
        var index = {};
        order.forEach(function(h, i){ index[normalizeHref(h)] = i; });

        list.sort(function(a,b){
          var ia = (index[normalizeHref(a.href)] != null) ? index[normalizeHref(a.href)] : 9999;
          var ib = (index[normalizeHref(b.href)] != null) ? index[normalizeHref(b.href)] : 9999;
          if (ia !== ib) return ia - ib;
          return a.text.localeCompare(b.text);
        });
      }

      return list;
    }

    function navIconFor(href){
      var f = normalizeHref(href);
      if (f === "home.html") return "\u2302";
      if (f === "index.html") return "\u25C9";
      if (f === "materials.html" || f === "materials-editor.html" || f === "materials-character.html") return "\u25A6";
      if (f === "bosses.html") return "\u2726";
      if (f === "planner.html") return "\u25A3";
      if (f === "team-planner.html") return "\u25C8";
      if (f === "imaginarium-theater.html") return "\u25CE";
      if (f === "tier-list.html" || f === "tier-history-editor.html") return "\u25A5";
      if (f === "tier-analytics.html") return "\u2301";
      if (f === "today.html") return "\u25A4";
      if (f === "pity.html") return "\u25D4";
      if (f === "settings.html") return "\u2699";
      if (f === "guide.html") return "\u25E7";
      if (f === "character.html") return "\u25C7";
      return "\u2022";
    }

    function formatTopbarDate(){
      var d = new Date();
      try{
        var date = new Intl.DateTimeFormat("en-US", {
          month:"short",
          day:"numeric",
          year:"numeric"
        }).format(d);
        var weekday = new Intl.DateTimeFormat("en-US", {
          weekday:"long"
        }).format(d);
        return date + " (" + weekday + ")";
      }catch(e){
        return d.toLocaleDateString();
      }
    }

    function ensureTopbar(){
      var bar = document.getElementById("app-chrome-topbar");
      if (!bar){
        bar = document.createElement("div");
        bar.id = "app-chrome-topbar";
        document.body.appendChild(bar);
      }

      bar.innerHTML = "";

      var date = document.createElement("div");
      date.className = "app-chrome-date";
      var dateIcon = document.createElement("span");
      dateIcon.className = "app-chrome-date-icon";
      dateIcon.textContent = "\u25A3";
      date.appendChild(dateIcon);
      date.appendChild(document.createTextNode(formatTopbarDate()));
      bar.appendChild(date);

      var bookmark = document.createElement("button");
      bookmark.type = "button";
      bookmark.className = "app-chrome-icon";
      bookmark.setAttribute("aria-label", "Bookmark");
      bookmark.textContent = "\u25B1";
      bar.appendChild(bookmark);

      var bell = document.createElement("button");
      bell.type = "button";
      bell.className = "app-chrome-icon";
      bell.setAttribute("aria-label", "Notifications");
      bell.textContent = "\u25CB";
      bar.appendChild(bell);

      var avatar = document.createElement("img");
      avatar.className = "app-chrome-avatar";
      avatar.alt = "Traveler";
      avatar.src = "Portrety/Bennett.png";
      bar.appendChild(avatar);
    }

    function renderSidebarRecent(nav){
      var recent = document.createElement("div");
      recent.className = "nav-recent";

      var title = document.createElement("div");
      title.className = "nav-recent__title";
      title.textContent = "Recently Viewed";
      recent.appendChild(title);

      ["Raiden", "Nahida", "Zhongli", "Yelan", "Bennett"].forEach(function(name){
        var a = document.createElement("a");
        a.className = "nav-recent__item";
        a.href = "character.html?character=" + encodeURIComponent(name);

        var img = document.createElement("img");
        img.alt = name;
        img.src = "Portrety/" + name + ".png";
        a.appendChild(img);

        var span = document.createElement("span");
        span.textContent = name;
        a.appendChild(span);
        recent.appendChild(a);
      });

      var all = document.createElement("a");
      all.className = "nav-recent__all";
      all.href = "home.html";
      all.textContent = "View All History";
      recent.appendChild(all);

      nav.appendChild(recent);
    }

    function ensureTierToolbar(){
      var toolbar = document.getElementById("tier-list-toolbar");
      if (!toolbar){
        toolbar = document.createElement("div");
        toolbar.id = "tier-list-toolbar";
        toolbar.className = "tier-list-toolbar";

        var grid = document.querySelector(".tier-grid-container");
        if (grid && grid.parentNode){
          grid.parentNode.insertBefore(toolbar, grid);
        } else {
          document.body.appendChild(toolbar);
        }
      }
      toolbar.innerHTML = "";
      return toolbar;
    }

    function removeTierToolbar(){
      var toolbar = document.getElementById("tier-list-toolbar");
      if (toolbar && toolbar.parentNode){
        toolbar.parentNode.removeChild(toolbar);
      }
    }

    function notifyRendered(){
      try{
        document.dispatchEvent(new CustomEvent("globalnav:rendered"));
      }catch(e){
        var ev = document.createEvent("Event");
        ev.initEvent("globalnav:rendered", true, true);
        document.dispatchEvent(ev);
      }
    }

    function shouldShowIcons(settings){
      return !!(settings && settings.nav && settings.nav.icons === "on");
    }

    function shouldCollapseMobile(settings){
      return !!(settings && settings.nav && settings.nav.collapseMobile === "on");
    }

    function shouldRememberViews(settings){
      return !!(settings && settings.nav && settings.nav.rememberViews === "on");
    }

    // --- HOME DASHBOARD: ostatnio używane (bez wpływu na istniejące strony) ---
    var RECENT_PAGES_KEY = "dashboard_recentPages";
    var RECENT_CHARS_KEY = "dashboard_recentCharacters";
    var RECENT_MAX = 10;

    function safeJsonParse(raw, fallback){
      try{ return JSON.parse(raw); }catch(e){ return fallback; }
    }


    function loadRecent(key){
      if (window.IDB && IDB.kvGet){
        return IDB.kvGet(key).then(function(v){
          if (Array.isArray(v)) return v;
          // awaryjnie: jeśli ktoś kiedyś zapisał string
          if (typeof v === "string") return safeJsonParse(v || "[]", []);
          return [];
        }).catch(function(){ return []; });
      }
      return Promise.resolve([]);
    }

    function saveRecent(key, arr){
      if (window.IDB && IDB.kvSet){
        return IDB.kvSet(key, arr.slice(0, RECENT_MAX)).catch(function(){});
      }
      return Promise.resolve();
    }

    function upsertRecent(key, entry, matchFn){
      loadRecent(key).then(function(list){
        list = (list || []).filter(function(x){ return !matchFn(x); });
        list.unshift(entry);
        saveRecent(key, list);
      });
    }


    function linkTextByFile(file){
      file = String(file || "").toLowerCase();
      for (var i=0;i<LINKS.length;i++){
        var lf = String(LINKS[i].href || "").toLowerCase().split("/").pop();
        if (lf === file) return LINKS[i].text || file;
      }
      return file || "page";
    }
    function recordRecentPage(currentFile){
      var file = String(currentFile || "").toLowerCase();
      if (!file) return;
      upsertRecent(RECENT_PAGES_KEY,
        { href:file, title: linkTextByFile(file), ts: Date.now() },
        function(x){ return x && String(x.href||"").toLowerCase() === file; }
      );
    }
    function recordRecentCharacterIfAny(){
      // main.js zapisuje lastCharacter na character.html – wykorzystujemy to bez ingerencji w main.js
      if (!(window.IDB && IDB.kvGet)) return;

      IDB.kvGet("lastCharacter").then(function(name){
        name = String(name || "").trim();
        if (!name) return;

        upsertRecent(RECENT_CHARS_KEY,
          { name:name, ts: Date.now() },
          function(x){ return x && String(x.name||"").toLowerCase() === name.toLowerCase(); }
        );
      }).catch(function(){});
      return;

      upsertRecent(RECENT_CHARS_KEY,
        { name:name, ts: Date.now() },
        function(x){ return x && String(x.name||"").toLowerCase() === name.toLowerCase(); }
      );
    }

    function resolveRelative(href){
      // Make href relative to current document directory
      try{
        var a = document.createElement("a");
        a.href = href;
        return a.getAttribute("href");
      }catch(e){
        return href;
      }
    }

    function render(){
      var nav = ensureNavContainer();
      var current = pageFileName();
      // normalize potential uppercase/lowercase
      current = (current || "").toLowerCase();
      nav.innerHTML = ""; // clear

      var brand = document.createElement("span");
      brand.className = "brand";
      brand.textContent = "Genshin Companion";
      nav.appendChild(brand);

      var settings = getAppSettingsSafe();
      var safeMode = !!(settings && settings.advanced && settings.advanced.safeMode === "on");
      var performanceMode = !!(settings && settings.performance && settings.performance.mode === "on");

      syncCompanionTheme(settings);
      if (safeMode || performanceMode) removeTopbar();
      else ensureTopbar();

      var effectiveLinks = getEffectiveLinks(settings);

      // --- Start page redirect (optional & safe) ---
      (function(){
        if (!settings || !settings.nav) return;

        // do not redirect from settings page
        if (current === "settings.html") return;

        // only entrypoints
        if (!isEntryPoint(current)) return;

        // allow manual opt-out (useful for debugging)
        if (hasNoRedirectFlag()) return;

        // Chrome treats file:// pages as unique origins, so skip automatic redirects locally.
        try{
          if (window.location.protocol === "file:") return;
        }catch(e){}

        // prevent loops within this tab/session
        try{
          if (sessionStorage.getItem(START_REDIRECT_DONE_KEY) === "1") return;
        }catch(e){}

        var target = getStartTarget(settings, current);
        if (!target) return;

        function doRedirect(toFile){
          if (!toFile) return;
          toFile = normalizeHref(toFile);

          // never redirect to the same file
          if (toFile === current) return;

          // don't redirect to settings
          if (toFile === "settings.html") return;

          // allow redirect only to pages existing in LINKS (so we don't break)
          var ok = LINKS.some(function(l){ return normalizeHref(l.href) === toFile; });
          if (!ok) return;

          try{ sessionStorage.setItem(START_REDIRECT_DONE_KEY, "1"); }catch(e){}
          location.replace(resolveRelative(toFile));
        }

        if (target === "last"){
          // read from IDB (kv), fallback: do nothing
          if (window.IDB && IDB.kvGet){
            IDB.kvGet(LAST_PAGE_KEY).then(function(last){
              if (!last) return;
              doRedirect(last);
            }).catch(function(){});
          }
          return;
        }

        doRedirect(target);
      })();

      // optional: mobile collapse toggle
      var collapsible = shouldCollapseMobile(settings);
      if (collapsible){
        nav.classList.add("is-collapsible");

        var toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "nav-toggle";
        toggle.setAttribute("aria-label", "Toggle navigation");
        toggle.textContent = "☰";

        // state
        var collapsed = false;
        try{
          collapsed = (sessionStorage.getItem(NAV_COLLAPSE_STATE_KEY) === "1");
        }catch(e){}

        if (collapsed) nav.classList.add("nav-collapsed");

        toggle.addEventListener("click", function(){
          nav.classList.toggle("nav-collapsed");
          try{
            sessionStorage.setItem(NAV_COLLAPSE_STATE_KEY, nav.classList.contains("nav-collapsed") ? "1" : "0");
          }catch(e){}
        });

        nav.appendChild(toggle);
      } else {
        nav.classList.remove("is-collapsible");
        nav.classList.remove("nav-collapsed");
      }

      var iconsOn = shouldShowIcons(settings);

      effectiveLinks.forEach(function(link){
        var a = document.createElement("a");
        var linkFile = normalizeHref(link.href);
        var isCurrentLink = current === linkFile;
        if (isCurrentLink){
          a.classList.add("active");
          a.setAttribute("aria-current", "page");
          a.setAttribute("role", "link");
          a.tabIndex = -1;
        } else {
          a.href = resolveRelative(link.href);
        }
        if (["character.html", "materials-character.html", "materials-editor.html", "tier-history-editor.html"].indexOf(linkFile) !== -1){
          a.classList.add("nav-utility");
        }

        if (iconsOn){
          var icon = document.createElement("span");
          icon.className = "nav-icon";
          icon.textContent = navIconFor(link.href);

          var t = document.createElement("span");
          t.className = "nav-text";
          t.textContent = link.text;

          a.appendChild(icon);
          a.appendChild(t);
        } else {
          a.textContent = link.text;
        }

        // active state is assigned before href creation, so current page does not link to itself.

        nav.appendChild(a);
      });

      // remember last page (optional)
      if (shouldRememberViews(settings)){
        var curFile = (current || "").toLowerCase();
        if (curFile && curFile !== "settings.html"){
          if (window.IDB && IDB.kvSet){
            IDB.kvSet(LAST_PAGE_KEY, curFile).catch(function(){});
          }
        }
      }

      var spacer = document.createElement("div");
      spacer.className = "spacer";
      nav.appendChild(spacer);

      if (!safeMode && !performanceMode){
        renderSidebarRecent(nav);
      }

      // Selektor wersji gry – tylko na stronie tier-list.html
      var lfCurrent = current; // już jest znormalizowane na lowercase
      if (lfCurrent !== "tier-list.html") {
        removeTierToolbar();
      }

      if (lfCurrent === "tier-list.html") {
        var tierToolbar = ensureTierToolbar();
        var versionWrapper = document.createElement("div");
        versionWrapper.className = "nav-version-controls";

        var label = document.createElement("label");
        label.setAttribute("for", "version-select");
        label.textContent = "Wersja gry:";

        var select = document.createElement("select");
        select.id = "version-select";

        versionWrapper.appendChild(label);
        versionWrapper.appendChild(select);
        tierToolbar.appendChild(versionWrapper);

        // --- DODANE: kontener filtrów dla tier-listy ---
        var filtersWrapper = document.createElement("div");
        filtersWrapper.className = "nav-tier-filters";

        // Rzadkość
        var rarityLabel = document.createElement("label");
        rarityLabel.setAttribute("for", "filter-rarity");
        rarityLabel.textContent = "Rarity:";
        var raritySelect = document.createElement("select");
        raritySelect.id = "filter-rarity";
        filtersWrapper.appendChild(rarityLabel);
        filtersWrapper.appendChild(raritySelect);

        // Broń
        var weaponLabel = document.createElement("label");
        weaponLabel.setAttribute("for", "filter-weapon");
        weaponLabel.textContent = "Weapon:";
        var weaponSelect = document.createElement("select");
        weaponSelect.id = "filter-weapon";
        filtersWrapper.appendChild(weaponLabel);
        filtersWrapper.appendChild(weaponSelect);

        // Żywioł
        var elementLabel = document.createElement("label");
        elementLabel.setAttribute("for", "filter-element");
        elementLabel.textContent = "Element:";
        var elementSelect = document.createElement("select");
        elementSelect.id = "filter-element";
        filtersWrapper.appendChild(elementLabel);
        filtersWrapper.appendChild(elementSelect);

        // Rola
        var roleLabel = document.createElement("label");
        roleLabel.setAttribute("for", "filter-role");
        roleLabel.textContent = "Role:";
        var roleSelect = document.createElement("select");
        roleSelect.id = "filter-role";
        filtersWrapper.appendChild(roleLabel);
        filtersWrapper.appendChild(roleSelect);

        // Posiadanie (All / Owned / Not owned)
        var ownedLabel = document.createElement("label");
        ownedLabel.setAttribute("for", "filter-owned");
        ownedLabel.textContent = "Owned:";
        var ownedSelect = document.createElement("select");
        ownedSelect.id = "filter-owned";
        filtersWrapper.appendChild(ownedLabel);
        filtersWrapper.appendChild(ownedSelect);

        // Tiers (SS/S/A/...)
        var tiersLabel = document.createElement("label");
        tiersLabel.textContent = "Tier:";
        var tiersBox = document.createElement("div");
        tiersBox.id = "filter-tiers";
        tiersBox.className = "tier-checkboxes";
        filtersWrapper.appendChild(tiersLabel);
        filtersWrapper.appendChild(tiersBox);

        // Checkbox debiutów
        var debutLabel = document.createElement("label");
        var debutCheckbox = document.createElement("input");
        debutCheckbox.type = "checkbox";
        debutCheckbox.id = "filter-debut";
        debutLabel.appendChild(debutCheckbox);
        debutLabel.appendChild(document.createTextNode(" Debuts in this version"));
        filtersWrapper.appendChild(debutLabel);

        tierToolbar.appendChild(filtersWrapper);

        // --- DODANE: przełącznik widoku tier-listy ---
        var viewWrapper = document.createElement("div");
        viewWrapper.className = "nav-tier-view-toggle";

        var viewLabel = document.createElement("span");
        viewLabel.textContent = "View:";

        var viewSelect = document.createElement("select");
        viewSelect.id = "tier-view-mode";

        var optElement = document.createElement("option");
        optElement.value = "element";
        optElement.textContent = "By element";

        var optRole = document.createElement("option");
        optRole.value = "role";
        optRole.textContent = "By role";

        viewSelect.appendChild(optElement);
        viewSelect.appendChild(optRole);

        viewWrapper.appendChild(viewLabel);
        viewWrapper.appendChild(viewSelect);
        tierToolbar.appendChild(viewWrapper);

        // --- NOWE: przycisk systemowego fullscreen dla tier-listy ---
        var fullscreenBtn = document.createElement("button");
        fullscreenBtn.id = "nav-fullscreen-toggle";
        fullscreenBtn.className = "nav-fullscreen-toggle";
        fullscreenBtn.type = "button";
        fullscreenBtn.textContent = "Full screen";

        tierToolbar.appendChild(fullscreenBtn);

        // (dashboard) zapis wizyty strony do "ostatnio używane"
        recordRecentPage(current);

        // (dashboard) jeżeli to widok postaci, zapisz też ostatnią postać
        if (current === "character.html") {
          recordRecentCharacterIfAny();
        }

      }

      notifyRendered();
    }


    // Remove any old overlay menu we might have injected earlier
    (function cleanupOld(){
      var oldToggle = document.getElementById("global-nav-toggle");
      var oldPanel = document.getElementById("global-nav-panel");
      if (oldToggle && oldToggle.parentNode) oldToggle.parentNode.removeChild(oldToggle);
      if (oldPanel && oldPanel.parentNode) oldPanel.parentNode.removeChild(oldPanel);
      var oldStyle = document.getElementById("global-nav-style");
      if (oldStyle && oldStyle.parentNode) oldStyle.parentNode.removeChild(oldStyle);
      var oldScript = document.getElementById("global-nav-script");
      if (oldScript && oldScript.parentNode) oldScript.parentNode.removeChild(oldScript);
    })();

    // re-render when settings become ready / change
    document.addEventListener("appsettings:ready", function(){ render(); });
    document.addEventListener("appsettings:changed", function(){ render(); });

    if (document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", render);
    } else {
      render();
    }
})();
