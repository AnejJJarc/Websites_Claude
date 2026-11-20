/* ==========================================================================
   O klubu (o-klubu.html) – page script
   Scrollspy quick nav, values, interactive timeline, olympians, interactive
   pool schematic (Kopališče Pristan), coach cards with filter + dialog with
   deep links (#trener-<id>), partner block. Runs after site.js (defer).
   ========================================================================== */
(function () {
  "use strict";

  var PKB = window.PKB;
  if (!PKB || !PKB.data) return;

  var D = PKB.data;
  var doc = document;
  var qs = PKB.qs, qsa = PKB.qsa, esc = PKB.escapeHTML;
  var C = D.club || {};
  var PROGRAMS = Array.isArray(D.programs) ? D.programs : [];
  var SCHEDULE = Array.isArray(D.schedule) ? D.schedule : [];
  var COACHES = Array.isArray(D.coaches) ? D.coaches.filter(function (c) { return c && c.id && c.name; }) : [];
  var DAYS = Array.isArray(D.days) && D.days.length === 7 ? D.days : ["Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota", "Nedelja"];
  var DAYS_SHORT = Array.isArray(D.daysShort) && D.daysShort.length === 7 ? D.daysShort : ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];

  var FORMS = {
    termin: ["termin", "termina", "termini", "terminov"],
    weekly: ["tedenski termin", "tedenska termina", "tedenski termini", "tedenskih terminov"],
    skupina: ["skupina", "skupini", "skupine", "skupin"],
    skupinaVadi: ["skupina vadi tukaj", "skupini vadita tukaj", "skupine vadijo tukaj", "skupin vadi tukaj"],
    leto: ["leto", "leti", "leta", "let"],
    nastopOI: ["nastop na OI", "nastopa na OI", "nastopi na OI", "nastopov na OI"]
  };
  function count(n, forms) { return n + " " + PKB.plural(n, forms); }
  function smooth() { return PKB.prefersReducedMotion() ? "auto" : "smooth"; }
  function safeColor(c) { return /^#[0-9a-f]{3,8}$/i.test(String(c || "")) ? c : "currentColor"; }
  function unique(arr) { return arr.filter(function (v, i) { return v != null && arr.indexOf(v) === i; }); }
  function sessionsFor(id) { return PKB.sessionsFor ? PKB.sessionsFor(id) : []; }
  function dayIndex(d) { var n = Number(d); return n >= 1 && n <= 7 ? n - 1 : -1; }

  /* ---------- shared rAF-throttled scroll / resize ---------- */
  var scrollTasks = [], resizeTasks = [], ticking = false;
  function runScrollTasks() { ticking = false; scrollTasks.forEach(function (fn) { fn(); }); }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(runScrollTasks); }
  }, { passive: true });
  window.addEventListener("resize", PKB.debounce(function () {
    resizeTasks.forEach(function (fn) { fn(); });
    runScrollTasks();
  }, 120));

  /* ---------- 0. data-driven static bits ---------- */
  function fillStatic() {
    if (C.official) qsa("[data-club-official], .club-sponsor__official").forEach(function (el) { el.textContent = C.official; });
    var phone = qs("[data-club-phone]");
    if (phone && C.phone && C.phoneHref) {
      phone.setAttribute("href", C.phoneHref);
      var span = qs("span", phone);
      if (span) span.textContent = C.phone;
      phone.setAttribute("aria-label", "Pokličite klub: " + C.phone);
    }
  }

  /* ---------- 1. Scrollspy quick nav (IntersectionObserver) ---------- */
  function initScrollspy() {
    var bar = qs("[data-quicknav]");
    if (!bar) return;
    var map = qsa(".club-quicknav__link", bar).map(function (a) {
      var id = "";
      try { id = decodeURIComponent((a.getAttribute("href") || "").replace(/^#/, "")); } catch (e) { id = ""; }
      return { a: a, sec: id ? doc.getElementById(id) : null };
    }).filter(function (x) { return x.sec; });
    if (!map.length) return;
    var inBand = {};
    var activeId = null;

    function keepInView(a) {
      if (bar.scrollWidth <= bar.clientWidth + 1) return;
      var target = a.offsetLeft - (bar.clientWidth - a.offsetWidth) / 2;
      bar.scrollTo({ left: Math.max(0, target), behavior: smooth() });
    }
    function setActive(id) {
      if (id === activeId) return;
      activeId = id;
      map.forEach(function (x) {
        var on = x.sec.id === id;
        x.a.classList.toggle("is-active", on);
        if (on) { x.a.setAttribute("aria-current", "true"); keepInView(x.a); }
        else x.a.removeAttribute("aria-current");
      });
    }
    function pick() {
      var found = null;
      for (var i = 0; i < map.length; i++) { if (inBand[map[i].sec.id]) { found = map[i].sec.id; break; } }
      if (!found) {
        // at the very bottom the last (short) section may never cross the band
        var last = map[map.length - 1].sec;
        var atBottom = window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 2;
        if (atBottom && last.getBoundingClientRect().bottom > 0) found = last.id;
      }
      setActive(found);
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { inBand[en.target.id] = en.isIntersecting; });
        pick();
      }, { rootMargin: "-32% 0px -60% 0px", threshold: 0 });
      map.forEach(function (x) { io.observe(x.sec); });
    } else {
      scrollTasks.push(function () {
        var line = window.innerHeight * 0.36;
        map.forEach(function (x) { var r = x.sec.getBoundingClientRect(); inBand[x.sec.id] = r.top <= line && r.bottom > line; });
      });
    }
    scrollTasks.push(pick);
    PKB.clubScrollspy = { active: function () { return activeId; } };
  }

  /* ---------- 2. Values ---------- */
  function renderValues() {
    var host = qs("[data-club-values]");
    if (!host) return;
    var vals = (Array.isArray(D.values) ? D.values : []).filter(function (v) { return v && v.title; });
    if (!vals.length) {
      host.innerHTML = '<div class="empty-state"><span class="icon-bubble">' + PKB.icon("heart") + "</span><p>Vrednote kluba bodo kmalu objavljene.</p></div>";
      return;
    }
    host.innerHTML = vals.map(function (v, i) {
      return '<article class="card club-value" data-reveal style="--reveal-delay:' + Math.min(i * 90, 450) + 'ms">' +
        '<div class="club-value__top"><span class="icon-bubble">' + PKB.icon(v.icon || "star") + "</span>" +
        '<span class="club-value__num" aria-hidden="true">' + String(i + 1).padStart(2, "0") + "</span></div>" +
        '<h3 class="club-value__title">' + esc(v.title) + "</h3>" +
        '<p class="muted">' + esc(v.text || "") + "</p>" +
        "</article>";
    }).join("");
  }

  /* ---------- 3. Timeline ---------- */
  function initTimeline() {
    var root = qs("[data-club-timeline]");
    if (!root) return;
    var list = qs(".club-tl__list", root);
    var track = qs(".club-tl__track", root);
    var fill = qs(".club-tl__fill", root);
    var chipsHost = qs("[data-club-years]");
    var hist = (Array.isArray(D.history) ? D.history : []).filter(function (h) { return h && h.year != null && h.title; })
      .map(function (h, i) { return { h: h, i: i, y: parseInt(h.year, 10) }; })
      .sort(function (a, b) { return ((isNaN(a.y) ? 0 : a.y) - (isNaN(b.y) ? 0 : b.y)) || a.i - b.i; })
      .map(function (x) { return x.h; });

    if (!hist.length) {
      root.innerHTML = '<div class="empty-state"><span class="icon-bubble">' + PKB.icon("clock") + "</span><p>Zgodovina kluba bo kmalu objavljena.</p></div>";
      if (chipsHost) chipsHost.hidden = true;
      return;
    }

    var used = {};
    var model = hist.map(function (h, i) {
      var year = String(h.year);
      var id = "leto-" + (PKB.slugify(year) || i);
      if (used[id]) id += "-" + i;
      used[id] = true;
      return { h: h, year: year, id: id, i: i };
    });

    list.innerHTML = model.map(function (m) {
      var dt = /^\d{4}$/.test(m.year) ? ' datetime="' + m.year + '"' : "";
      return '<li class="club-tl__item" id="' + esc(m.id) + '">' +
        '<span class="club-tl__side" aria-hidden="true">' + esc(m.year) + "</span>" +
        '<span class="club-tl__dot" aria-hidden="true"></span>' +
        '<article class="club-tl__card" tabindex="0" aria-labelledby="club-tl-y-' + m.i + " club-tl-t-" + m.i + '">' +
          '<div class="club-tl__head"><span class="icon-bubble icon-bubble--sm">' + PKB.icon(m.h.icon || "flag") + "</span>" +
          '<time class="club-tl__year" id="club-tl-y-' + m.i + '"' + dt + ">" + esc(m.year) + "</time></div>" +
          '<h3 class="club-tl__title" id="club-tl-t-' + m.i + '">' + esc(m.h.title) + "</h3>" +
          (m.h.text ? '<p class="club-tl__text">' + esc(m.h.text) + "</p>" : "") +
        "</article></li>";
    }).join("");

    if (chipsHost) {
      chipsHost.innerHTML = model.map(function (m) {
        return '<button type="button" class="chip" data-tl-target="' + esc(m.id) + '" aria-label="Skoči na leto ' + esc(m.year) + '">' + esc(m.year) + "</button>";
      }).join("");
    }

    var items = qsa(".club-tl__item", list).map(function (el) {
      return { el: el, dot: qs(".club-tl__dot", el), card: qs(".club-tl__card", el) };
    });
    var cards = items.map(function (it) { return it.card; });
    var chips = chipsHost ? qsa("[data-tl-target]", chipsHost) : [];
    var centers = [];
    var current = -2;

    function layout() {
      var listTop = list.offsetTop;
      var cs = items.map(function (it) { return listTop + it.dot.offsetTop + it.dot.offsetHeight / 2; });
      var top = cs[0], bottom = cs[cs.length - 1];
      track.style.top = top + "px";
      track.style.height = Math.max(0, bottom - top) + "px";
      centers = cs.map(function (c) { return c - top; });
    }
    function update() {
      if (!centers.length) return;
      var r = track.getBoundingClientRect();
      var anchor = window.innerHeight * 0.58;
      var h = centers[centers.length - 1];
      var p = h > 0 ? Math.min(1, Math.max(0, (anchor - r.top) / h)) : (anchor >= r.top ? 1 : 0);
      fill.style.transform = "scaleY(" + p.toFixed(4) + ")";
      var cur = -1;
      items.forEach(function (it, i) {
        var passed = r.top + centers[i] <= anchor;
        it.el.classList.toggle("is-passed", passed);
        if (passed) cur = i;
      });
      if (cur === current) return;
      current = cur;
      items.forEach(function (it, i) { it.el.classList.toggle("is-current", i === cur); });
      chips.forEach(function (c, i) {
        var on = i === cur;
        c.classList.toggle("is-active", on);
        if (on) c.setAttribute("aria-current", "true"); else c.removeAttribute("aria-current");
      });
    }
    function highlight(it) {
      it.el.classList.remove("is-highlight");
      void it.el.offsetWidth;
      it.el.classList.add("is-highlight");
      window.setTimeout(function () { it.el.classList.remove("is-highlight"); }, 2300);
    }
    function goTo(i, opts) {
      var it = items[i];
      if (!it) return;
      opts = opts || {};
      if (opts.focus !== false) it.card.focus({ preventScroll: true });
      it.el.scrollIntoView({ behavior: smooth(), block: "center" });
      if (opts.highlight) highlight(it);
    }

    if (chipsHost) {
      chipsHost.addEventListener("click", function (e) {
        var b = e.target.closest("[data-tl-target]");
        if (!b) return;
        var idx = items.map(function (it) { return it.el.id; }).indexOf(b.getAttribute("data-tl-target"));
        if (idx > -1) goTo(idx, { highlight: true });
      });
    }
    list.addEventListener("keydown", function (e) {
      var card = e.target;
      var idx = cards.indexOf(card);
      if (idx < 0) return;
      var next = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") next = idx + 1;
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = idx - 1;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = cards.length - 1;
      if (next === null) return;
      e.preventDefault();
      if (next >= 0 && next < cards.length) goTo(next);
    });

    layout();
    update();
    scrollTasks.push(update);
    resizeTasks.push(layout);
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () { layout(); update(); });
      ro.observe(list);
    }
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { layout(); update(); });
  }

  /* ---------- 4. Olympians ---------- */
  var OLY_PHOTOS = [
    { src: "assets/img/photos/delfin-trening-sm.jpg", large: "assets/img/photos/delfin-trening.jpg", w: 720, h: 480, pos: "center 42%" },
    { src: "assets/img/photos/delfin-plavalka-sm.jpg", large: "assets/img/photos/delfin-plavalka.jpg", w: 720, h: 405, pos: "62% 40%" }
  ];
  function renderOlympians() {
    var host = qs("[data-club-olympians]");
    if (!host) return;
    var list = (Array.isArray(D.olympians) ? D.olympians : []).filter(function (o) { return o && o.name; });
    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><span class="icon-bubble">' + PKB.icon("medal") + "</span><p>Podatki o olimpijcih bodo kmalu dodani.</p></div>";
      return;
    }
    host.innerHTML = list.map(function (o, i) {
      var photo = OLY_PHOTOS[i % OLY_PHOTOS.length];
      var games = Array.isArray(o.games) ? o.games.filter(Boolean) : [];
      var years = games.map(function (g) { var m = /(\d{4})/.exec(g); return m ? Number(m[1]) : null; }).filter(function (y) { return y; }).sort();
      var stats = [];
      if (games.length) stats.push({ v: String(games.length), l: PKB.plural(games.length, FORMS.nastopOI) });
      if (years.length > 1) {
        stats.push({ v: String(years[0]), l: "prvi nastop" });
        stats.push({ v: String(years[years.length - 1]), l: "zadnji nastop" });
      } else if (years.length === 1) {
        stats.push({ v: String(years[0]), l: "leto nastopa" });
      }
      return '<article class="photo-card club-olympian" aria-labelledby="club-oly-' + i + '" data-reveal style="--reveal-delay:' + (i * 120) + 'ms;--obj-pos:' + photo.pos + '">' +
        '<img src="' + photo.src + '" srcset="' + photo.src + " 720w, " + photo.large + ' 1920w" sizes="(min-width: 900px) 64vw, 135vw" alt="" width="' + photo.w + '" height="' + photo.h + '" loading="lazy" decoding="async">' +
        '<div class="photo-card__glass club-olympian__glass">' +
          (o.discipline ? '<p class="eyebrow club-olympian__disc">' + esc(o.discipline) + "</p>" : "") +
          '<h3 class="club-olympian__name" id="club-oly-' + i + '">' + esc(o.name) + "</h3>" +
          (games.length ? '<ul class="club-olympian__games" role="list" aria-label="Olimpijske igre">' + games.map(function (g) {
            return '<li class="badge">' + PKB.icon("medal") + esc(g) + "</li>";
          }).join("") + "</ul>" : "") +
          (o.note ? '<p class="club-olympian__note">' + esc(o.note) + "</p>" : "") +
          (stats.length ? '<dl class="club-olympian__stats" style="grid-template-columns:repeat(' + stats.length + ',minmax(0,1fr))">' + stats.map(function (s) {
            return '<div class="club-olympian__stat"><dt class="club-olympian__stat-label">' + esc(s.l) + '</dt><dd class="club-olympian__stat-value">' + esc(s.v) + "</dd></div>";
          }).join("") + "</dl>" : "") +
        "</div></article>";
    }).join("");
  }

  /* ---------- 5. Venue: interactive pool schematic ---------- */
  var FALLBACK_POOLS = [
    { id: "mali", name: "Mali bazen", desc: "" }, { id: "25", name: "25 m bazen", desc: "" },
    { id: "50", name: "50 m bazen", desc: "" }, { id: "suho", name: "Suha vadba", desc: "" }
  ];
  function poolStats(pool) {
    var key = PKB.normalize(pool.name);
    var perDay = [0, 0, 0, 0, 0, 0, 0];
    var byProgram = {};
    var total = 0;
    SCHEDULE.forEach(function (s) {
      if (!s || PKB.normalize(s.pool) !== key) return;
      total++;
      var d = dayIndex(s.day);
      if (d > -1) perDay[d]++;
      byProgram[s.program] = (byProgram[s.program] || 0) + 1;
    });
    var progs = Object.keys(byProgram).map(function (pid) {
      var p = PKB.programById(pid);
      return { id: pid, name: p ? p.name : pid, color: p ? p.color : null, count: byProgram[pid], order: p ? PROGRAMS.indexOf(p) : 999 };
    }).sort(function (a, b) { return a.order - b.order; });
    return { total: total, perDay: perDay, programs: progs };
  }
  function initVenue() {
    var plan = qs("[data-pool-plan]");
    var tile = qs("[data-pool-tile]");
    if (!plan || !tile) return;
    var chipsHost = qs("[data-pool-chips]");
    var status = qs("[data-pool-status]");
    var pools = (Array.isArray(D.pools) && D.pools.length ? D.pools : FALLBACK_POOLS).filter(function (p) { return p && p.id != null && p.name; });
    var byId = {}, stats = {}, cache = {};
    pools.forEach(function (p) { byId[String(p.id)] = p; stats[String(p.id)] = poolStats(p); });

    var groups = qsa(".club-pool", plan).filter(function (g) {
      var id = g.getAttribute("data-pool");
      if (!byId[id]) { g.setAttribute("hidden", ""); g.removeAttribute("tabindex"); return false; }
      var s = stats[id];
      var countEl = qs("[data-pool-count]", g);
      if (countEl) countEl.textContent = s.total + "× na teden";
      g.setAttribute("aria-label", byId[id].name + ", " + count(s.total, FORMS.weekly));
      return true;
    });
    if (chipsHost) {
      chipsHost.innerHTML = pools.map(function (p) {
        return '<button type="button" class="chip" data-pool-select="' + esc(p.id) + '" aria-pressed="false">' + esc(p.name) +
          ' <span class="count" aria-hidden="true">' + stats[String(p.id)].total + "</span></button>";
      }).join("");
    }
    var chips = chipsHost ? qsa("[data-pool-select]", chipsHost) : [];
    tile.setAttribute("role", "region");
    tile.setAttribute("aria-label", "Podrobnosti izbranega prostora");

    function tileHTML(id) {
      var p = byId[id], s = stats[id];
      var max = Math.max.apply(null, s.perDay.concat([1]));
      var days = s.perDay.map(function (n, i) {
        return '<li class="club-days__col">' +
          '<span class="club-days__n" aria-hidden="true">' + (n || "") + "</span>" +
          '<span class="club-days__bar" aria-hidden="true"><span' + (n ? "" : ' class="is-zero"') + ' style="--h:' + (n ? Math.round((n / max) * 100) : 0) + '%"></span></span>' +
          '<span class="club-days__lbl" aria-hidden="true">' + esc(DAYS_SHORT[i]) + "</span>" +
          '<span class="visually-hidden">' + esc(DAYS[i]) + ": " + count(n, FORMS.termin) + "</span>" +
          "</li>";
      }).join("");
      var progs = s.programs.length ?
        '<ul class="club-pooltile__list" role="list">' + s.programs.map(function (x) {
          return '<li><a href="programi.html#' + encodeURIComponent(x.id) + '">' +
            '<span class="club-pooltile__dot" style="--dot:' + safeColor(x.color) + '" aria-hidden="true"></span>' +
            '<span class="club-pooltile__name">' + esc(x.name) + "</span>" +
            '<span class="club-pooltile__n">' + x.count + '×<span class="club-pooltile__nw"> na teden</span></span>' + PKB.icon("chevron-right") +
            "</a></li>";
        }).join("") + "</ul>" :
        '<p class="club-pooltile__empty">V tem prostoru trenutno ni rednih terminov.</p>';
      return '<div class="club-pooltile__body is-entering" data-pool-shown="' + esc(id) + '">' +
        "<div>" +
          '<p class="club-pooltile__kicker">' + esc(C.venue || "Kopališče Pristan") + "</p>" +
          '<h3 class="club-pooltile__title">' + esc(p.name) + "</h3>" +
          (p.desc ? '<p class="club-pooltile__desc">' + esc(p.desc) + "</p>" : "") +
        "</div>" +
        '<div class="club-pooltile__stats">' +
          '<div class="club-pooltile__stat"><span class="stat-value">' + s.total + '</span><span class="stat-label">' + PKB.plural(s.total, FORMS.weekly) + "</span></div>" +
          '<div class="club-pooltile__stat"><span class="stat-value">' + s.programs.length + '</span><span class="stat-label">' + PKB.plural(s.programs.length, FORMS.skupinaVadi) + "</span></div>" +
        "</div>" +
        '<div><p class="club-pooltile__sub" id="club-days-' + esc(id) + '">Termini po dnevih</p><ul class="club-days" role="list" aria-labelledby="club-days-' + esc(id) + '">' + days + "</ul></div>" +
        '<div><p class="club-pooltile__sub">Skupine v tem prostoru</p>' + progs + "</div>" +
      "</div>";
    }

    var selected = byId["50"] ? "50" : String(pools[0].id);
    var shown = null;
    function show(id) {
      if (!byId[id] || id === shown) return;
      shown = id;
      tile.innerHTML = cache[id] || (cache[id] = tileHTML(id));
      groups.forEach(function (g) { g.classList.toggle("is-preview", g.getAttribute("data-pool") === id && id !== selected); });
    }
    function select(id, announce) {
      if (!byId[id]) return;
      var changed = id !== selected;
      selected = id;
      groups.forEach(function (g) { g.setAttribute("aria-pressed", String(g.getAttribute("data-pool") === id)); });
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-pool-select") === id)); });
      if (shown !== id) show(id);
      else groups.forEach(function (g) { g.classList.remove("is-preview"); });
      if (announce && changed && status) {
        var s = stats[id];
        status.textContent = byId[id].name + ": " + count(s.total, FORMS.weekly) + ", " + count(s.programs.length, FORMS.skupina) + ".";
      }
    }

    groups.forEach(function (g, i) {
      var id = g.getAttribute("data-pool");
      g.addEventListener("mouseenter", function () { show(id); });
      g.addEventListener("mouseleave", function () { show(selected); });
      g.addEventListener("click", function () { select(id, true); });
      g.addEventListener("focus", function () { select(id, true); });
      g.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); select(id, true); return; }
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = groups[(i + 1) % groups.length];
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = groups[(i - 1 + groups.length) % groups.length];
        if (next) { e.preventDefault(); next.focus(); }
      });
    });
    chips.forEach(function (c) {
      c.addEventListener("click", function () { select(c.getAttribute("data-pool-select"), true); });
    });
    select(selected, false);
    PKB.clubVenue = { select: function (id) { select(String(id), true); }, selected: function () { return selected; } };
  }

  /* ---------- 6. Coaches: cards, filter, dialog, deep links ---------- */
  var FILTER_LABELS = { sola: "Plavalna šola", tekmovalno: "Tekmovalno", odrasli: "Odrasli" };
  var FILTER_KEY = "o-klubu:trenerji-filter";
  function initCoaches() {
    var grid = qs("[data-coach-grid]");
    if (!grid) return;
    var filterHost = qs("[data-coach-filter]");
    var countEl = qs("[data-coach-count]");

    if (!COACHES.length) {
      grid.innerHTML = '<div class="empty-state"><span class="icon-bubble">' + PKB.icon("users") + "</span><p>Predstavitev trenerjev bo kmalu objavljena.</p></div>";
      if (filterHost) filterHost.hidden = true;
      return;
    }

    var info = COACHES.map(function (c) {
      var progs = (Array.isArray(c.programs) ? c.programs : []).map(PKB.programById).filter(Boolean);
      var sessions = progs.reduce(function (n, p) { return n + sessionsFor(p.id).length; }, 0);
      return { c: c, progs: progs, cats: unique(progs.map(function (p) { return p.category; })), sessions: sessions };
    });
    var infoById = {};
    info.forEach(function (x) { infoById[String(x.c.id)] = x; });

    grid.innerHTML = info.map(function (x, i) {
      var c = x.c;
      var badges = x.progs.map(function (p) {
        return '<li class="badge badge-dot" style="--badge-c:' + safeColor(p.color) + '">' + esc(p.name) + "</li>";
      }).join("");
      var stats = [];
      var yrs = Number(c.years) || 0;
      if (yrs) stats.push({ v: yrs, l: PKB.plural(yrs, ["leto izkušenj", "leti izkušenj", "leta izkušenj", "let izkušenj"]) });
      stats.push({ v: x.sessions, l: PKB.plural(x.sessions, ["termin na teden", "termina na teden", "termini na teden", "terminov na teden"]) });
      return '<article class="card card--hover club-coach" id="trener-' + esc(c.id) + '" data-coach-card="' + esc(c.id) + '" data-cats="' + esc(x.cats.join(" ")) + '" data-reveal style="--reveal-delay:' + Math.min(i * 70, 420) + 'ms">' +
        '<div class="club-coach__head"><span class="avatar" aria-hidden="true">' + esc(PKB.initials(c.name)) + "</span>" +
          '<div class="club-coach__id"><h3 class="club-coach__name"><button type="button" class="club-coach__btn" data-coach-open="' + esc(c.id) + '" aria-haspopup="dialog">' + esc(c.name) + "</button></h3>" +
          (c.role ? '<p class="club-coach__role">' + esc(c.role) + "</p>" : "") + "</div></div>" +
        (badges ? '<ul class="club-coach__badges" role="list" aria-label="Skupine">' + badges + "</ul>" : "") +
        '<div class="club-coach__foot"><dl class="club-coach__stats">' + stats.map(function (s) {
            return '<div><dt>' + esc(s.l) + "</dt><dd>" + s.v + "</dd></div>";
          }).join("") + "</dl>" +
          '<span class="club-coach__more" aria-hidden="true">' + PKB.icon("arrow-up-right") + "</span></div>" +
        "</article>";
    }).join("") + '<div class="empty-state" data-coach-empty hidden><span class="icon-bubble">' + PKB.icon("users") + "</span><p>V tej kategoriji ni trenerjev.</p></div>";

    var cards = qsa("[data-coach-card]", grid);
    var emptyEl = qs("[data-coach-empty]", grid);

    /* filter */
    var cats = Array.isArray(D.programCategories) ? D.programCategories : [];
    var filters = [{ id: "vsi", label: "Vsi" }].concat(cats.map(function (cat) {
      return { id: cat.id, label: FILTER_LABELS[cat.id] || cat.short || cat.name };
    }));
    if (filterHost) {
      filterHost.innerHTML = filters.map(function (f) {
        var n = f.id === "vsi" ? info.length : info.filter(function (x) { return x.cats.indexOf(f.id) > -1; }).length;
        return '<button type="button" class="chip" data-coach-cat="' + esc(f.id) + '" aria-pressed="false">' + esc(f.label) + ' <span class="count" aria-hidden="true">' + n + "</span></button>";
      }).join("");
    }
    var chips = filterHost ? qsa("[data-coach-cat]", filterHost) : [];
    var validFilter = function (id) { return filters.some(function (f) { return f.id === id; }); };
    var currentFilter = "vsi";

    function applyFilter(cat, fromUser) {
      if (!validFilter(cat)) cat = "vsi";
      currentFilter = cat;
      chips.forEach(function (ch) { ch.setAttribute("aria-pressed", String(ch.getAttribute("data-coach-cat") === cat)); });
      var shownN = 0;
      cards.forEach(function (card) {
        var match = cat === "vsi" || (card.getAttribute("data-cats") || "").split(" ").indexOf(cat) > -1;
        var wasHidden = card.hidden;
        card.hidden = !match;
        if (match) {
          shownN++;
          if (wasHidden && fromUser && !PKB.prefersReducedMotion()) {
            card.classList.remove("is-entering");
            void card.offsetWidth;
            card.classList.add("is-entering");
          }
        }
      });
      if (emptyEl) emptyEl.hidden = shownN > 0;
      if (countEl) {
        countEl.textContent = shownN === cards.length ?
          "Prikazani so vsi trenerji (" + cards.length + ")." :
          "Prikazano: " + shownN + " od " + cards.length + " trenerjev.";
      }
      if (fromUser) PKB.storage.set(FILTER_KEY, cat);
    }
    chips.forEach(function (ch) {
      ch.addEventListener("click", function () { applyFilter(ch.getAttribute("data-coach-cat"), true); });
    });
    applyFilter(String(PKB.storage.get(FILTER_KEY, "vsi") || "vsi"), false);

    /* dialog */
    var openState = null;
    function modalHTML(x) {
      var c = x.c;
      var badges = [];
      if (c.years) badges.push('<span class="badge">' + count(Number(c.years) || 0, FORMS.leto) + " izkušenj</span>");
      badges.push('<span class="badge">' + count(x.progs.length, FORMS.skupina) + "</span>");
      badges.push('<span class="badge">' + count(x.sessions, FORMS.termin) + " na teden</span>");
      var quals = Array.isArray(c.quals) && c.quals.length ?
        '<ul class="list-check">' + c.quals.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ul>" :
        '<p class="muted small">Podatki o usposobljenosti bodo dodani.</p>';
      var programs = x.progs.length ? '<ul class="club-cm__programs" role="list">' + x.progs.map(function (p) {
        var sess = sessionsFor(p.id);
        var cat = PKB.categoryById(p.category);
        var pid = encodeURIComponent(p.id);
        return '<li class="club-cm__program">' +
          '<div class="club-cm__ptop"><span class="club-pooltile__dot" style="--dot:' + safeColor(p.color) + '" aria-hidden="true"></span>' +
            '<a class="club-cm__pname" href="programi.html#' + pid + '">' + esc(p.name) + "</a>" +
            (cat ? '<span class="badge">' + esc(cat.short || cat.name) + "</span>" : "") + "</div>" +
          (sess.length ? '<ul class="club-cm__sessions" role="list" aria-label="Tedenski termini skupine ' + esc(p.name) + '">' + sess.map(function (s) {
            var d = dayIndex(s.day);
            return "<li>" +
              '<span class="club-cm__day"><span aria-hidden="true">' + esc(d > -1 ? DAYS_SHORT[d] : "") + '</span><span class="visually-hidden">' + esc(d > -1 ? DAYS[d] : "") + "</span></span>" +
              "<span>" + esc(s.start) + "–" + esc(s.end) + "</span>" +
              "<span>" + esc(s.pool || "") + "</span></li>";
          }).join("") + "</ul>" : '<p class="small muted">Termini bodo objavljeni naknadno.</p>') +
          '<div class="club-cm__plinks"><a href="urnik.html?skupina=' + pid + '">Urnik skupine</a><a href="vpis.html?program=' + pid + '">Vpis v skupino</a></div>' +
          "</li>";
      }).join("") + "</ul>" : '<p class="muted small">Trener trenutno ne vodi rednih skupin.</p>';

      return '<div class="club-cm__head"><span class="avatar" aria-hidden="true">' + esc(PKB.initials(c.name)) + "</span>" +
          '<div><p class="club-cm__role">' + esc(c.role || "Trener") + '</p><div class="club-cm__meta">' + badges.join("") + "</div></div></div>" +
        (c.bio ? '<p class="club-cm__bio">' + esc(c.bio) + "</p>" : "") +
        '<div class="club-cm__grid">' +
          '<section class="tile" aria-labelledby="club-cm-q"><h3 class="club-cm__h" id="club-cm-q">Usposobljenost</h3>' + quals + "</section>" +
          '<section class="tile" aria-labelledby="club-cm-p"><h3 class="club-cm__h" id="club-cm-p">Skupine in tedenski termini</h3>' + programs + "</section>" +
        "</div>";
    }

    function cleanUrl(hash) {
      return window.location.pathname + window.location.search + (hash || "");
    }
    function openCoach(id, fromHash) {
      var x = infoById[id];
      if (!x) return false;
      if (openState && openState.id === id) return true;
      if (openState) openState.m.close();
      var card = doc.getElementById("trener-" + id);
      if (card && card.hidden) applyFilter("vsi", false);
      if (fromHash && card) {
        card.scrollIntoView({ block: "center", behavior: "auto" });
        var btn = qs(".club-coach__btn", card);
        if (btn) btn.focus({ preventScroll: true });
      }
      var targetHash = "#trener-" + id;
      var prevHash = window.location.hash;
      if (prevHash !== targetHash && history.replaceState) history.replaceState(history.state, "", cleanUrl(targetHash));
      var m = PKB.modal.open({
        title: x.c.name,
        size: "lg",
        className: "club-coach-modal",
        content: modalHTML(x),
        footer: '<button type="button" class="btn btn--ghost" data-coach-copy>' + PKB.icon("link") + "Kopiraj povezavo</button>" +
          '<button type="button" class="btn btn--primary" data-modal-close>Zapri</button>',
        onClose: function () {
          if (openState && openState.m === m) openState = null;
          // e.g. opened from the site search: the original opener is gone → return focus to the coach card
          var ae = doc.activeElement;
          if (card && !card.hidden && (!ae || ae === doc.body || !ae.isConnected) && !qs("dialog.modal[open]")) {
            var b = qs(".club-coach__btn", card);
            if (b) b.focus({ preventScroll: true });
          }
          if (window.location.hash === targetHash && history.replaceState) {
            var back = prevHash && prevHash !== targetHash && !/^#trener-/.test(prevHash) ? prevHash : "";
            history.replaceState(history.state, "", cleanUrl(back));
          }
        }
      });
      openState = { id: id, m: m };
      var copyBtn = qs("[data-coach-copy]", m.dialog);
      if (copyBtn) copyBtn.addEventListener("click", function () {
        PKB.copy(window.location.origin + window.location.pathname + targetHash, "Povezava do predstavitve trenerja je kopirana.");
      });
      return true;
    }

    grid.addEventListener("click", function (e) {
      var b = e.target.closest("[data-coach-open]");
      if (b) openCoach(b.getAttribute("data-coach-open"), false);
    });

    function handleHash(initial) {
      var raw = window.location.hash.slice(1);
      var h = "";
      try { h = decodeURIComponent(raw); } catch (e) { h = raw; }
      var m = /^trener-(.+)$/.exec(h);
      if (m) {
        if (!openCoach(m[1], true)) {
          var sec = doc.getElementById("trenerji");
          if (sec) sec.scrollIntoView({ behavior: initial ? "auto" : smooth(), block: "start" });
          PKB.toast({ type: "info", title: "Trenerja nismo našli", message: "Povezava je morda zastarela. Prikazujemo celotno trenersko ekipo." });
        }
      } else if (openState) {
        openState.m.close();
      }
    }
    window.addEventListener("hashchange", function () { handleHash(false); });
    handleHash(true);

    PKB.clubCoaches = { filter: function () { return currentFilter; }, open: function (id) { return openCoach(String(id), false); } };
  }

  /* ---------- boot ---------- */
  function boot() {
    fillStatic();
    renderValues();
    initTimeline();
    renderOlympians();
    initVenue();
    initCoaches();
    initScrollspy();
    runScrollTasks();
  }
  try { boot(); }
  catch (err) {
    if (window.console && console.error) console.error("o-klubu:", err);
  }
})();
