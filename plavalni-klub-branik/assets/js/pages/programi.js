/* ==========================================================================
   Programi (programi.html) – page script
   Category filter + program cards with details, group finder (quiz),
   comparison table, pricing, equipment checklist and FAQ search.
   Runs after data.js and site.js (all deferred), so PKB is ready.
   ========================================================================== */
(function () {
  "use strict";

  var PKB = window.PKB;
  if (!PKB || !PKB.qs) return;
  var D = PKB.data || {};
  var qs = PKB.qs, qsa = PKB.qsa, esc = PKB.escapeHTML;
  var doc = document;

  var programs = (Array.isArray(D.programs) ? D.programs : []).filter(function (p) { return p && p.id && p.name; });
  var cats = (Array.isArray(D.programCategories) ? D.programCategories : []).filter(function (c) { return c && c.id; });
  var DAYS = D.daysShort || ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];
  var STORE_QUIZ = "programi-izbirnik";
  var STORE_GEAR = "programi-oprema";
  var reduce = function () { return PKB.prefersReducedMotion(); };

  /* Pixel sizes of the -sm photos used here (for width/height attributes) */
  var IMG_SIZES = {
    "sola-lebdenje-sm.jpg": [720, 478], "sola-ucenje-sm.jpg": [720, 480], "sola-otroci-sm.jpg": [720, 481],
    "sola-plavanje-sm.jpg": [720, 481], "delfin-plavalka-sm.jpg": [720, 405], "kravl-proga-sm.jpg": [720, 480],
    "start-tekma-sm.jpg": [720, 480], "start-hrbtno-sm.jpg": [560, 840], "tekma-delfin-sm.jpg": [720, 480],
    "odrasli-rekreacija-sm.jpg": [720, 540]
  };
  var IMG_POS = { "start-hrbtno-sm.jpg": "50% 30%", "delfin-plavalka-sm.jpg": "50% 45%" };
  function imgFile(src) { return String(src || "").split("/").pop(); }
  function imgAttrs(src) {
    var s = IMG_SIZES[imgFile(src)] || [720, 480];
    var pos = IMG_POS[imgFile(src)];
    return ' width="' + s[0] + '" height="' + s[1] + '"' + (pos ? ' style="object-position:' + pos + '"' : "");
  }

  /* ---------- small helpers ---------- */
  var plural = PKB.plural;
  function decimal(n) { return String(n).replace(".", ","); }
  function ageLabel(a) {
    if (a == null || isNaN(a)) return "";
    if (Math.floor(a) !== a) return decimal(a) + " leta";
    return a + " " + plural(a, ["leto", "leti", "leta", "let"]);
  }
  function fmtMinutes(m) {
    var h = Math.floor(m / 60), mm = m % 60;
    return (h ? h + " h" : "") + (h && mm ? " " : "") + (mm ? mm + " min" : "");
  }
  function catOf(p) {
    return PKB.categoryById(p.category) || { id: p.category || "drugo", name: "Drugi programi", short: "Drugo", icon: "waves", desc: "" };
  }
  function dot(color, cls) {
    return '<span class="prog-dot' + (cls ? " " + cls : "") + '" style="--dot:' + esc(color || "") + '" aria-hidden="true"></span>';
  }
  function safeColor(c) { return /^#[0-9a-f]{3,8}$/i.test(String(c || "")) ? c : ""; }
  function perWeekText(p) {
    if (!p.perWeek || !p.duration) return "—";
    return p.perWeek + " × " + p.duration + " min";
  }
  function priceBlock(p) {
    if (typeof p.price !== "number") {
      return '<p class="prog-price"><span class="prog-price__value prog-price__value--text">' + esc(PKB.formatPrice(null)) + "</span></p>";
    }
    return '<p class="prog-price"><span class="prog-price__value">' + esc(PKB.formatPrice(p.price)) + '</span><span class="prog-price__per">/ mesec</span></p>';
  }
  function scrollBehavior() { return reduce() ? "instant" : "smooth"; }

  /* ==================================================================
     1. Hero quick-link values (from data)
     ================================================================== */
  (function heroValues() {
    var school = programs.filter(function (p) { return p.category === "sola"; });
    var prices = programs.map(function (p) { return p.price; }).filter(function (v) { return typeof v === "number"; });
    var faqN = (D.faq || []).length;
    var set = function (key, text) { var el = qs('[data-quick="' + key + '"]'); if (el && text) el.textContent = text; };
    if (school.length) set("primerjava", school.length + " " + plural(school.length, ["skupina", "skupini", "skupine", "skupin"]));
    if (prices.length) set("cenik", "od " + PKB.formatPrice(Math.min.apply(null, prices)));
    if (faqN) set("faq", faqN + " " + plural(faqN, ["odgovor", "odgovora", "odgovori", "odgovorov"]));
  })();

  /* ==================================================================
     2. Program list: groups, cards, details, category filter
     ================================================================== */
  var groupsHost = qs("[data-prog-groups]");
  var statusEl = qs("[data-prog-status]");
  var filterGroup = qs("[data-prog-filter]");
  var filterBtns = filterGroup ? qsa("[data-cat]", filterGroup) : [];
  var cards = {};          // id -> { card, btn, panel }
  var groupEls = [];
  var current = "all";

  function detailsHTML(p) {
    var goals = Array.isArray(p.goals) ? p.goals : [];
    var sessions = PKB.sessionsFor(p.id);
    var coaches = PKB.coachesFor(p.id);
    var html = "";
    if (p.desc) html += '<p class="prog-details__desc">' + esc(p.desc) + "</p>";
    if (goals.length) {
      html += '<div><p class="prog-details__label">' + PKB.icon("target") + "Cilji programa</p>" +
        '<ul class="list-check">' + goals.map(function (g) { return "<li>" + esc(g) + "</li>"; }).join("") + "</ul></div>";
    }
    if (p.requirements) {
      html += '<div><p class="prog-details__label">' + PKB.icon("check-circle") + "Pogoji za vključitev</p>" +
        '<p class="prog-details__req">' + esc(p.requirements) + "</p></div>";
    }
    html += '<div><p class="prog-details__label">' + PKB.icon("clock") + "Tedenski termini</p>" +
      (sessions.length
        ? '<ul class="prog-sessions" role="list">' + sessions.map(function (s) {
            return '<li><span class="prog-sessions__day">' + esc(DAYS[s.day - 1] || "") + '</span> <span class="prog-sessions__time">' +
              esc(s.start) + "–" + esc(s.end) + '</span> <span class="prog-sessions__pool">· ' + esc(s.pool || "") + "</span></li>";
          }).join("") + "</ul>"
        : '<p class="small muted">Termini bodo objavljeni v urniku.</p>') + "</div>";
    html += '<div><p class="prog-details__label">' + PKB.icon("users") + "Kdo vodi vadbo</p>" +
      (coaches.length
        ? '<ul class="prog-coaches" role="list">' + coaches.map(function (c) {
            return '<li><a class="prog-coach" href="o-klubu.html#trener-' + encodeURIComponent(c.id) + '">' +
              '<span class="avatar" aria-hidden="true">' + esc(PKB.initials(c.name)) + "</span>" +
              '<span><span class="prog-coach__name">' + esc(c.name) + '</span><span class="prog-coach__role">' + esc(c.role || "") + "</span></span></a></li>";
          }).join("") + "</ul>"
        : '<p class="small muted">Trenerja bomo objavili ob začetku sezone.</p>') + "</div>";
    html += '<div class="prog-details__actions">' +
      '<a class="btn btn--sm" href="urnik.html?skupina=' + encodeURIComponent(p.id) + '">' + PKB.icon("calendar") + "Urnik skupine</a>" +
      '<a class="btn btn--sm btn--primary" href="vpis.html?program=' + encodeURIComponent(p.id) + '">Vpis' + PKB.icon("arrow-right", "icon--move") + "</a></div>";
    return html;
  }

  function cardHTML(p, i) {
    var color = safeColor(p.color);
    var detId = p.id + "-podrobnosti";
    return '<article class="card card--media prog-card" id="' + esc(p.id) + '" style="--i:' + i + '" aria-labelledby="' + esc(p.id) + '-ime">' +
      '<div class="card-media">' +
        (p.image ? '<img src="' + esc(p.image) + '" alt=""' + imgAttrs(p.image) + ' loading="lazy" decoding="async">' : "") +
        '<span class="badge">' + dot(color) + esc(p.level || catOf(p).name) + "</span>" +
      "</div>" +
      '<div class="card-body">' +
        '<h4 class="card-title prog-card__title" id="' + esc(p.id) + '-ime">' + esc(p.name) + "</h4>" +
        (p.summary ? '<p class="prog-card__summary">' + esc(p.summary) + "</p>" : "") +
        '<dl class="prog-facts tile">' +
          "<div><dt>Starost</dt><dd>" + esc(p.ages || "—") + "</dd></div>" +
          "<div><dt>Na teden</dt><dd>" + esc(perWeekText(p)) + "</dd></div>" +
          "<div><dt>Bazen</dt><dd>" + esc(p.pool || "—") + "</dd></div>" +
        "</dl>" +
        '<div class="prog-card__foot">' + priceBlock(p) +
          '<button type="button" class="btn btn--sm prog-toggle" aria-expanded="false" aria-controls="' + esc(detId) + '" data-toggle="' + esc(p.id) + '">' +
            'Podrobnosti<span class="visually-hidden">: ' + esc(p.name) + "</span>" + PKB.icon("chevron-down") + "</button>" +
        "</div>" +
        '<div class="prog-details" id="' + esc(detId) + '" role="region" aria-labelledby="' + esc(p.id) + '-ime" data-details="' + esc(p.id) + '">' +
          '<div class="prog-details__inner"><div class="prog-details__body">' + detailsHTML(p) + "</div></div>" +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function helpTileHTML(n) {
    var school = programs.filter(function (p) { return p.category === "sola"; });
    var minAge = (school.length ? school : programs).reduce(function (m, p) { return typeof p.minAge === "number" ? Math.min(m, p.minAge) : m; }, Infinity);
    var catN = cats.filter(function (c) { return programs.some(function (p) { return p.category === c.id; }); }).length;
    var stats = [
      [String(programs.length), plural(programs.length, ["program", "programa", "programi", "programov"])],
      [String(catN), plural(catN, ["kategorija", "kategoriji", "kategorije", "kategorij"])]
    ];
    if (isFinite(minAge)) stats.push([ageLabel(minAge), "najnižja starost za vpis v plavalno šolo"]);
    return '<aside class="prog-help glass glass--strong' + (n === 1 ? " prog-help--wide" : "") + '" aria-label="Pomoč pri izbiri programa">' +
      '<div class="prog-help__main">' +
        '<span class="icon-bubble" aria-hidden="true">' + PKB.icon("help-circle") + "</span>" +
        '<p class="prog-help__title">Ne veste, kje začeti?</p>' +
        '<p class="prog-help__text">Odgovorite na tri kratka vprašanja v izbirniku skupine ali nam pišite – pomagali vam bomo izbrati pravi program. Prvi trening je poskusni.</p>' +
        '<div class="cluster"><a class="btn btn--sm btn--primary" href="#izbirnik">Izbirnik skupine' + PKB.icon("arrow-right", "icon--move") + "</a>" +
        '<a class="btn btn--sm" href="kontakt.html?zadeva=vpis#obrazec">' + PKB.icon("mail") + "Pišite nam</a></div>" +
      "</div>" +
      '<dl class="prog-help__stats tile">' + stats.map(function (x) { return "<div><dt>" + esc(x[1]) + "</dt><dd>" + esc(x[0]) + "</dd></div>"; }).join("") + "</dl>" +
    "</aside>";
  }

  function renderGroups() {
    if (!groupsHost) return;
    var known = cats.slice();
    // programs with a category that is not listed still get rendered
    programs.forEach(function (p) {
      if (!known.some(function (c) { return c.id === p.category; })) known.push(catOf(p));
    });
    var html = known.map(function (c) {
      var list = programs.filter(function (p) { return p.category === c.id; });
      if (!list.length) return "";
      return '<section class="prog-group" data-cat="' + esc(c.id) + '" aria-labelledby="grp-' + esc(c.id) + '">' +
        '<header class="prog-group__head prog-halo prog-halo--sm">' +
          '<span class="icon-bubble" aria-hidden="true">' + PKB.icon(c.icon || "waves") + "</span>" +
          '<div class="prog-group__titles"><h3 class="prog-group__title" id="grp-' + esc(c.id) + '">' + esc(c.name) + "</h3>" +
            (c.desc ? '<p class="prog-group__desc">' + esc(c.desc) + "</p>" : "") + "</div>" +
          '<span class="badge prog-group__count">' + list.length + " " + plural(list.length, ["program", "programa", "programi", "programov"]) + "</span>" +
        "</header>" +
        '<div class="prog-grid">' + list.map(cardHTML).join("") + (list.length < 3 ? helpTileHTML(list.length) : "") + "</div>" +
      "</section>";
    }).join("");
    if (!html) {
      groupsHost.innerHTML = '<div class="empty-state glass"><span class="icon-bubble">' + PKB.icon("info") + "</span><p>Programi trenutno niso na voljo. Pišite nam na <a href=\"kontakt.html\">strani Kontakt</a>.</p></div>";
      return;
    }
    groupsHost.innerHTML = html;
    groupEls = qsa(".prog-group", groupsHost);
    programs.forEach(function (p) {
      var card = doc.getElementById(p.id);
      if (!card || !card.classList.contains("prog-card")) return;
      cards[p.id] = { card: card, btn: qs("[data-toggle]", card), panel: qs("[data-details]", card) };
    });
    // counts on the segmented control
    qsa("[data-count]").forEach(function (el) {
      var k = el.getAttribute("data-count");
      el.textContent = String(k === "all" ? programs.length : programs.filter(function (p) { return p.category === k; }).length);
    });
    // hide filter buttons for empty categories
    filterBtns.forEach(function (b) {
      var k = b.getAttribute("data-cat");
      if (k !== "all" && !programs.some(function (p) { return p.category === k; })) b.hidden = true;
    });
  }

  function setDetails(id, open) {
    var c = cards[id];
    if (!c || !c.btn || !c.panel) return;
    c.btn.setAttribute("aria-expanded", open ? "true" : "false");
    c.panel.classList.toggle("is-open", open);
  }

  function validCat(cat) { return cat === "all" || groupEls.some(function (g) { return g.getAttribute("data-cat") === cat; }); }
  function countFor(cat) { return cat === "all" ? programs.length : programs.filter(function (p) { return p.category === cat; }).length; }

  function updateStatus() {
    if (!statusEl) return;
    var n = countFor(current);
    var c = current === "all" ? null : PKB.categoryById(current);
    statusEl.textContent = plural(n, ["Prikazan je", "Prikazana sta", "Prikazani so", "Prikazanih je"]) + " " + n + " " +
      plural(n, ["program", "programa", "programi", "programov"]) + (c ? " · " + c.name : "") + ".";
  }

  var animTimer = 0, enterTimer = 0;
  function applyGroups(instant) {
    clearTimeout(animTimer);
    var plan = groupEls.map(function (g) { return { g: g, show: current === "all" || g.getAttribute("data-cat") === current }; });
    if (instant || reduce()) {
      plan.forEach(function (x) { x.g.classList.remove("is-leaving", "is-entering"); x.g.hidden = !x.show; });
      return;
    }
    var leaving = plan.filter(function (x) { return !x.show && !x.g.hidden; });
    leaving.forEach(function (x) { x.g.classList.add("is-leaving"); });
    var enter = function () {
      plan.forEach(function (x) {
        x.g.classList.remove("is-leaving");
        if (!x.show) { x.g.hidden = true; x.g.classList.remove("is-entering"); return; }
        if (x.g.hidden) {
          x.g.hidden = false;
          x.g.classList.remove("is-entering");
          void x.g.offsetWidth;
          x.g.classList.add("is-entering");
        }
      });
      clearTimeout(enterTimer);
      enterTimer = setTimeout(function () { groupEls.forEach(function (g) { g.classList.remove("is-entering"); }); }, 1300);
    };
    if (leaving.length) animTimer = setTimeout(enter, 200);
    else enter();
  }

  function setFilter(cat, opts) {
    opts = opts || {};
    if (!validCat(cat)) cat = "all";
    current = cat;
    filterBtns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-cat") === cat ? "true" : "false"); });
    applyGroups(!!opts.instant);
    updateStatus();
    if (opts.hash && window.history && history.replaceState) {
      try { history.replaceState(null, "", window.location.pathname + window.location.search + (cat === "all" ? "" : "#" + cat)); } catch (e) { /* ignore */ }
    }
    if (opts.keepInView && groupsHost) {
      var top = groupsHost.getBoundingClientRect().top;
      if (top < 110) {
        window.scrollTo({ top: Math.max(0, window.scrollY + top - 150), behavior: scrollBehavior() });
      }
    }
  }

  function pulse(el) {
    el.classList.remove("highlight-pulse");
    void el.offsetWidth;
    el.classList.add("highlight-pulse");
    clearTimeout(el._pulseT);
    el._pulseT = setTimeout(function () { el.classList.remove("highlight-pulse"); }, 2400);
  }

  function initPrograms() {
    renderGroups();
    if (!groupEls.length) return;
    updateStatus();
    groupsHost.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-toggle]");
      if (!btn) return;
      var id = btn.getAttribute("data-toggle");
      setDetails(id, btn.getAttribute("aria-expanded") !== "true");
    });
    if (filterGroup) {
      filterGroup.addEventListener("click", function (e) {
        var b = e.target.closest && e.target.closest("[data-cat]");
        if (!b) return;
        setFilter(b.getAttribute("data-cat"), { hash: true, keepInView: true });
      });
      filterGroup.addEventListener("keydown", function (e) {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(e.key) === -1) return;
        var vis = filterBtns.filter(function (b) { return !b.hidden; });
        var idx = vis.indexOf(doc.activeElement);
        if (idx === -1) return;
        e.preventDefault();
        var next = e.key === "Home" ? 0 : e.key === "End" ? vis.length - 1 : (idx + (e.key === "ArrowRight" ? 1 : -1) + vis.length) % vis.length;
        vis[next].focus();
        setFilter(vis[next].getAttribute("data-cat"), { hash: true, keepInView: true });
      });
    }
  }

  /* ==================================================================
     3. Group finder (izbirnik)
     ================================================================== */
  var SKILLS = [
    { v: 0, title: "Ne zna plavati", desc: "V vodi se še ne počuti povsem varno." },
    { v: 1, title: "Plava s pripomočki", desc: "Z desko, rokavčki ali ob pomoči odraslega." },
    { v: 2, title: "Preplava 10 m", desc: "Samostojno, brez pripomočkov." },
    { v: 3, title: "Preplava 25 m", desc: "Brez postanka, pozna osnove več tehnik." },
    { v: 4, title: "Obvlada vse tehnike", desc: "Kravl, hrbtno, prsno in delfin." }
  ];
  var GOALS = [
    { v: "ucenje", title: "Učenje", desc: "Naučiti se plavati ali izpopolniti tehniko.", icon: "graduation" },
    { v: "tekmovanje", title: "Tekmovanje", desc: "Redni treningi in nastopi na tekmah.", icon: "trophy" },
    { v: "rekreacija", title: "Rekreacija", desc: "Gibanje, kondicija in dobro počutje.", icon: "heart" }
  ];
  var AGE_MIN = 1, AGE_MAX = 99;
  var quiz = { age: null, skill: null, goal: null, done: false };
  var quizStep = 1;
  var recommendedId = null;

  function skillBy(v) { return SKILLS.filter(function (s) { return s.v === v; })[0] || null; }
  function goalBy(v) { return GOALS.filter(function (g) { return g.v === v; })[0] || null; }
  function validAge(a) { return typeof a === "number" && !isNaN(a) && a >= AGE_MIN && a <= AGE_MAX; }
  function roundAge(a) { return Math.round(a * 2) / 2; }

  /** Scores every program for the answers (lower = better). Uses minAge/maxAge/skill/category from data. */
  function recommend(a) {
    var minAll = programs.reduce(function (m, p) { return typeof p.minAge === "number" ? Math.min(m, p.minAge) : m; }, Infinity);
    if (!isFinite(minAll) || !programs.length) return null;
    if (a.age < minAll) {
      var first = programs.filter(function (p) { return p.minAge === minAll; })[0];
      return { tooYoung: true, first: first, minAge: minAll };
    }
    var adult = a.age >= 18;
    var pref = a.goal === "tekmovanje" ? (a.skill >= 4 ? ["tekmovalno"] : ["sola"]) : (adult ? ["odrasli"] : ["sola"]);
    var target = a.skill === 0 ? 0.5 : (a.skill >= 4 ? (a.goal === "tekmovanje" ? 8 : 4.5) : a.skill);
    var scored = programs.filter(function (p) { return typeof p.minAge === "number" && typeof p.maxAge === "number"; }).map(function (p) {
      var s = 0, flags = [];
      if (a.age < p.minAge) { s += 4 + (p.minAge - a.age) * 1.5; flags.push("age"); }
      else if (a.age > p.maxAge) { s += 4 + (a.age - p.maxAge) * 1.5; flags.push("age"); }
      var d = (typeof p.skill === "number" ? p.skill : 0) - target;
      s += Math.abs(d);
      if (d >= 1.5) { s += 6 + (d - 1.5) * 3; flags.push("advanced"); }
      if (d <= -2.5 && p.category === "sola") s += 2;
      if (pref.indexOf(p.category) === -1) { s += 3; flags.push("category"); }
      var mid = (p.minAge + p.maxAge) / 2, half = (p.maxAge - p.minAge) / 2 + 1;
      s += Math.min(Math.abs(a.age - mid) / half, 1) * 0.5;
      return { p: p, s: s, flags: flags };
    }).sort(function (x, y) { return x.s - y.s; });
    if (!scored.length) return null;
    var best = scored[0];
    var alts = scored.slice(1).filter(function (x) {
      return x.flags.indexOf("age") === -1 && x.flags.indexOf("advanced") === -1 && x.s <= best.s + 12;
    }).slice(0, 2);
    return { best: best, alts: alts, pref: pref, adult: adult };
  }

  function quizEls() {
    var root = qs("[data-quiz]");
    if (!root) return null;
    return {
      root: root,
      form: qs("[data-quiz-form]", root),
      result: qs("[data-quiz-result]", root),
      steps: qsa("[data-qstep]", root),
      back: qs("[data-quiz-back]", root),
      next: qs("[data-quiz-next]", root),
      ageRange: qs("[data-age-range]", root),
      ageInput: qs("[data-age-input]", root),
      ageOut: qs("[data-age-out]", root),
      ageHint: qs("[data-age-hint]", root),
      skillHost: qs("[data-skill-options]", root),
      goalHost: qs("[data-goal-options]", root),
      progress: qs("[data-quiz-progress]", root),
      progressLabel: qs("[data-quiz-progress-label]", root)
    };
  }
  var Q = null;

  function saveQuiz() { PKB.storage.set(STORE_QUIZ, { age: quiz.age, skill: quiz.skill, goal: quiz.goal, done: quiz.done }); }

  function setAgeUI(a) {
    if (!Q) return;
    var v = validAge(a) ? a : 7;
    var rMin = Number(Q.ageRange.min) || 3, rMax = Number(Q.ageRange.max) || 70;
    var rv = Math.min(rMax, Math.max(rMin, v));
    Q.ageRange.value = String(rv);
    Q.ageRange.style.setProperty("--fill", ((rv - rMin) / (rMax - rMin) * 100).toFixed(2) + "%");
    Q.ageRange.setAttribute("aria-valuetext", ageLabel(v));
    Q.ageOut.textContent = ageLabel(v);
  }

  function renderQuizOptions() {
    Q.skillHost.innerHTML = SKILLS.map(function (s) {
      var bars = "";
      for (var i = 0; i < 5; i++) bars += '<span class="' + (i <= s.v ? "is-on" : "") + '"></span>';
      return '<label class="option-card"><input type="radio" name="skill" value="' + s.v + '" required>' +
        '<span class="option-card__body"><span class="prog-level" aria-hidden="true">' + bars + "</span>" +
        '<span class="prog-opt__text"><span class="prog-opt__title">' + esc(s.title) + '</span><span class="prog-opt__desc">' + esc(s.desc) + "</span></span>" +
        '<span class="prog-opt__check" aria-hidden="true">' + PKB.icon("check") + "</span></span></label>";
    }).join("");
    Q.goalHost.innerHTML = GOALS.map(function (g) {
      return '<label class="option-card"><input type="radio" name="goal" value="' + g.v + '" required>' +
        '<span class="option-card__body"><span class="icon-bubble icon-bubble--sm" aria-hidden="true">' + PKB.icon(g.icon) + "</span>" +
        '<span class="prog-opt__text"><span class="prog-opt__title">' + esc(g.title) + '</span><span class="prog-opt__desc">' + esc(g.desc) + "</span></span>" +
        '<span class="prog-opt__check" aria-hidden="true">' + PKB.icon("check") + "</span></span></label>";
    }).join("");
    // age hint from data (school start age, adult age)
    var school = programs.filter(function (p) { return p.category === "sola" && typeof p.minAge === "number"; });
    var adults = programs.filter(function (p) { return p.category === "odrasli" && typeof p.minAge === "number"; });
    if (Q.ageHint && school.length) {
      var sMin = Math.min.apply(null, school.map(function (p) { return p.minAge; }));
      var aMin = adults.length ? Math.min.apply(null, adults.map(function (p) { return p.minAge; })) : null;
      Q.ageHint.textContent = "V plavalno šolo vpisujemo od " + decimal(sMin) + ". leta" +
        (aMin === null ? "." : aMin === 18 ? ", plavanje za odrasle je namenjeno polnoletnim (18 let in več)." :
          ", plavanje za odrasle je namenjeno plavalcem od " + decimal(aMin) + ". leta naprej.");
    }
  }

  function syncInputsFromState() {
    setAgeUI(quiz.age);
    if (validAge(quiz.age)) Q.ageInput.value = String(quiz.age);
    qsa('input[name="skill"]', Q.form).forEach(function (r) { r.checked = quiz.skill !== null && Number(r.value) === quiz.skill; });
    qsa('input[name="goal"]', Q.form).forEach(function (r) { r.checked = r.value === quiz.goal; });
  }

  function updateAside() {
    var answered = [validAge(quiz.age), quiz.skill !== null, !!quiz.goal];
    var values = [quiz.age !== null ? ageLabel(quiz.age) : null, quiz.skill !== null ? (skillBy(quiz.skill) || {}).title : null, quiz.goal ? (goalBy(quiz.goal) || {}).title : null];
    var showingResult = Q.result && !Q.result.hidden;
    qsa("[data-step-ind]", Q.root).forEach(function (li) {
      var n = Number(li.getAttribute("data-step-ind"));
      var isCur = !showingResult && n === quizStep;
      var done = answered[n - 1] && !isCur;
      li.classList.toggle("is-current", isCur);
      li.classList.toggle("is-done", !!done);
      var btn = qs("button", li);
      var reachable = n === 1 || answered.slice(0, n - 1).every(Boolean);
      btn.disabled = !reachable || isCur;
      if (isCur) btn.setAttribute("aria-current", "step"); else btn.removeAttribute("aria-current");
      var num = qs(".prog-step__num", li);
      num.innerHTML = done ? PKB.icon("check") : String(n);
      var val = qs("[data-step-value]", li);
      val.textContent = values[n - 1] || "Še ni izbrano";
    });
    var count = answered.filter(Boolean).length;
    var pct = showingResult ? 100 : Math.round(((quizStep - 1) / 3) * 100);
    if (Q.progress) {
      Q.progress.style.setProperty("--value", pct + "%");
      Q.progress.setAttribute("aria-valuenow", String(showingResult ? 3 : quizStep - 1));
    }
    if (Q.progressLabel) Q.progressLabel.textContent = showingResult ? "Priporočilo je pripravljeno." : "Korak " + quizStep + " od 3" + (count === 3 ? " · vsi odgovori so izpolnjeni" : "");
  }

  function animateIn(el, cls) {
    if (reduce()) return;
    el.classList.remove("is-entering", "is-entering-back");
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 500);
  }

  function ensureQuizVisible() {
    var r = Q.root.getBoundingClientRect();
    if (r.top < 70 || r.top > window.innerHeight * 0.6) {
      Q.root.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    }
  }

  function showStep(n, opts) {
    opts = opts || {};
    var dir = n < quizStep ? "is-entering-back" : "is-entering";
    quizStep = n;
    Q.form.hidden = false;
    Q.result.hidden = true;
    Q.steps.forEach(function (fs) {
      var on = Number(fs.getAttribute("data-qstep")) === n;
      fs.hidden = !on;
      if (on && opts.animate) animateIn(fs, dir);
    });
    Q.back.hidden = n === 1;
    Q.next.innerHTML = n === 3 ? "Pokaži priporočilo " + PKB.icon("sparkles") : "Naprej " + PKB.icon("arrow-right", "icon--move");
    updateAside();
    if (opts.focus) {
      var legend = qs('[data-qstep="' + n + '"] .prog-qstep__legend', Q.form);
      if (legend) legend.focus({ preventScroll: true });
      ensureQuizVisible();
    }
  }

  function reasonList(r, a) {
    var p = r.best.p, c = catOf(p), items = [];
    var ageOk = r.best.flags.indexOf("age") === -1;
    items.push("<strong>Starost " + esc(ageLabel(a.age)) + "</strong> – skupina je " + (ageOk ? "" : "sicer ") + "namenjena starosti " + esc(p.ages || "") + ".");
    var sk = skillBy(a.skill);
    if (sk) items.push("<strong>" + esc(sk.title) + "</strong> – raven skupine je »" + esc(p.level || c.name) + "«.");
    var g = goalBy(a.goal);
    if (g) {
      var goalText;
      if (a.goal === "tekmovanje" && p.category !== "tekmovalno") {
        goalText = "do tekmovalne skupine vodi pot skozi plavalno šolo, kjer vsaka skupina gradi na znanju prejšnje.";
      } else if (a.goal === "rekreacija" && p.category === "sola") {
        goalText = "v plavalni šoli otroci skozi igro pridobijo kondicijo in varnost v vodi.";
      } else {
        goalText = String(c.desc || "").replace(/^./, function (ch) { return ch.toLowerCase(); });
      }
      items.push("<strong>Cilj: " + esc(g.title.toLowerCase()) + "</strong> – " + esc(goalText));
    }
    if (p.requirements) items.push("<strong>Pogoj za vključitev:</strong> " + esc(p.requirements));
    return '<ul class="list-check prog-rec__reasons">' + items.map(function (t) { return "<li><span>" + t + "</span></li>"; }).join("") + "</ul>";
  }

  function answersBadges(a) {
    return '<div class="prog-result__answers" aria-label="Vaši odgovori">' +
      '<span class="badge">' + esc(ageLabel(a.age)) + "</span>" +
      '<span class="badge">' + esc((skillBy(a.skill) || {}).title || "") + "</span>" +
      '<span class="badge">' + esc((goalBy(a.goal) || {}).title || "") + "</span></div>";
  }

  function resultTools() {
    return '<div class="prog-result__tools">' +
      '<button type="button" class="btn btn--sm btn--ghost" data-quiz-edit>' + PKB.icon("arrow-left") + "Spremeni odgovore</button>" +
      '<button type="button" class="btn btn--sm" data-quiz-reset>' + PKB.icon("refresh") + "Začni znova</button></div>";
  }

  function renderResult(fromStore) {
    var a = { age: quiz.age, skill: quiz.skill, goal: quiz.goal };
    var r = recommend(a);
    var html = '<div class="prog-result__head">' + answersBadges(a) + resultTools() + "</div>";
    recommendedId = null;
    if (!r) {
      html += '<div class="empty-state tile"><span class="icon-bubble">' + PKB.icon("alert-circle") + "</span><p>Priporočila trenutno ni mogoče pripraviti. Pišite nam in pomagali vam bomo izbrati skupino.</p>" +
        '<a class="btn btn--primary btn--sm" href="kontakt.html?zadeva=vpis#obrazec">Pišite nam</a></div>';
    } else if (r.tooYoung) {
      var f = r.first;
      html += '<article class="prog-rec tile tile--raised">' +
        (f && f.image ? '<div class="prog-rec__media"><img src="' + esc(f.image) + '" alt=""' + imgAttrs(f.image) + ' loading="lazy" decoding="async"></div>' : "") +
        '<div class="prog-rec__body">' +
          '<p class="prog-rec__kicker">Še malo potrpljenja</p>' +
          '<h3 class="prog-rec__title" id="quiz-result-title">Vpis je mogoč od ' + esc(decimal(r.minAge)) + ". leta</h3>" +
          '<p class="muted">' + (f ? "Ko bo otrok dopolnil " + esc(ageLabel(r.minAge)) + ", je prva skupina <strong>" + esc(f.name) + "</strong> – " + esc((f.summary || "").replace(/^./, function (ch) { return ch.toLowerCase(); })) : "Pišite nam za informacije o vpisu.") + "</p>" +
          '<div class="prog-rec__actions">' +
            (f ? '<a class="btn btn--primary btn--sm" href="#' + esc(f.id) + '">Spoznajte skupino ' + esc(f.name) + PKB.icon("arrow-right", "icon--move") + "</a>" : "") +
            '<a class="btn btn--sm" href="kontakt.html?zadeva=vpis#obrazec">' + PKB.icon("mail") + "Pišite nam</a>" +
          "</div>" +
        "</div></article>";
    } else {
      var p = r.best.p, c = catOf(p);
      recommendedId = p.id;
      var sessions = PKB.sessionsFor(p.id);
      var approx = r.best.flags.length > 0;
      html += '<article class="prog-rec tile tile--raised">' +
        '<div class="prog-rec__media">' + (p.image ? '<img src="' + esc(p.image) + '" alt=""' + imgAttrs(p.image) + ' loading="lazy" decoding="async">' : "") +
          '<span class="badge">' + esc(c.short || c.name) + "</span></div>" +
        '<div class="prog-rec__body">' +
          '<p class="prog-rec__kicker">' + (approx ? "Najbližja možnost" : "Priporočamo") + "</p>" +
          '<h3 class="prog-rec__title" id="quiz-result-title">' + dot(safeColor(p.color)) + esc(p.name) + "</h3>" +
          '<p class="prog-rec__meta">' + esc([p.level, p.ages].filter(Boolean).join(" · ")) + "</p>" +
          reasonList(r, a) +
          '<p class="prog-rec__facts">' +
            "<span>" + PKB.icon("clock", "icon--sm") + "<strong>" + esc(perWeekText(p)) + "</strong> na teden</span>" +
            "<span>" + PKB.icon("map-pin", "icon--sm") + esc(p.pool || "") + "</span>" +
            "<span>" + PKB.icon("euro", "icon--sm") + "<strong>" + esc(PKB.formatPrice(typeof p.price === "number" ? p.price : null)) + "</strong>" + (typeof p.price === "number" ? " / mesec" : "") + "</span>" +
            (sessions.length ? "<span>" + PKB.icon("calendar", "icon--sm") + esc(sessions.map(function (s) { return DAYS[s.day - 1]; }).filter(function (d, i, arr) { return arr.indexOf(d) === i; }).join(", ")) + "</span>" : "") +
          "</p>" +
          (approx ? '<p class="prog-rec__note">' + PKB.icon("info", "icon--sm") + "<span>Za to kombinacijo odgovorov nimamo povsem ujemajoče se skupine, zato predlagamo najbližjo. <a href=\"kontakt.html?zadeva=vpis#obrazec\">Pišite nam</a> in skupaj bomo našli najboljšo rešitev.</span></p>" : "") +
          '<div class="prog-rec__actions">' +
            '<a class="btn btn--primary btn--sm" href="vpis.html?program=' + encodeURIComponent(p.id) + '">Vpis v skupino' + PKB.icon("arrow-right", "icon--move") + "</a>" +
            '<a class="btn btn--sm" href="#' + esc(p.id) + '">' + PKB.icon("info") + 'Podrobnosti<span class="visually-hidden">: ' + esc(p.name) + "</span></a>" +
            '<a class="btn btn--sm btn--ghost" href="urnik.html?skupina=' + encodeURIComponent(p.id) + '">' + PKB.icon("calendar") + "Urnik skupine</a>" +
          "</div>" +
        "</div></article>";
      if (r.alts.length) {
        html += '<div class="prog-alts"><h4 class="prog-alts__title">Druge možnosti</h4><ul class="prog-alts__list" role="list">' +
          r.alts.map(function (x) {
            var q = x.p;
            return '<li><a class="prog-alt" href="#' + esc(q.id) + '">' +
              (q.image ? '<img src="' + esc(q.image) + '" alt=""' + imgAttrs(q.image) + ' loading="lazy" decoding="async">' : "") +
              '<span class="prog-alt__text"><span class="prog-alt__name">' + dot(safeColor(q.color)) + esc(q.name) + '</span><span class="prog-alt__why">' +
              esc([q.level, q.ages].filter(Boolean).join(" · ")) + "</span></span>" + PKB.icon("arrow-up-right") + "</a></li>";
          }).join("") + "</ul></div>";
      }
    }
    html += '<p class="prog-result__disclaimer">' + PKB.icon("info", "icon--sm") + "<span>Priporočilo je informativno. Na poskusnem treningu trener preveri znanje in potrdi najprimernejšo skupino.</span></p>";
    Q.result.innerHTML = html;
    if (qs("#quiz-result-title", Q.result)) {
      Q.result.setAttribute("aria-labelledby", "quiz-result-title");
      Q.result.removeAttribute("aria-label");
    } else {
      Q.result.removeAttribute("aria-labelledby");
      Q.result.setAttribute("aria-label", "Priporočilo izbirnika");
    }
    Q.form.hidden = true;
    Q.result.hidden = false;
    markRecommended(recommendedId);
    updateAside();
    if (!fromStore) {
      animateIn(Q.result, "is-entering");
      Q.result.focus({ preventScroll: true });
      ensureQuizVisible();
    }
  }

  function readAgeInput() {
    var raw = String(Q.ageInput.value || "").replace(",", ".");
    var v = parseFloat(raw);
    return isNaN(v) ? null : roundAge(v);
  }

  function validateStep(n) {
    if (n === 1) {
      var v = readAgeInput();
      if (v === null || !validAge(v)) {
        Q.ageInput.setCustomValidity("Vnesite starost med " + AGE_MIN + " in " + AGE_MAX + " let.");
        PKB.validateField(Q.ageInput);
        Q.ageInput.focus();
        return false;
      }
      Q.ageInput.setCustomValidity("");
      PKB.validateField(Q.ageInput);
      quiz.age = v;
      Q.ageInput.value = String(v);
      setAgeUI(v);
      return true;
    }
    var name = n === 2 ? "skill" : "goal";
    var checked = qs('input[name="' + name + '"]:checked', Q.form);
    var first = qs('input[name="' + name + '"]', Q.form);
    if (!checked) {
      if (first) { PKB.validateField(first); first.focus(); }
      return false;
    }
    PKB.validateField(checked);
    if (n === 2) quiz.skill = Number(checked.value);
    else quiz.goal = checked.value;
    return true;
  }

  function resetQuiz() {
    quiz = { age: null, skill: null, goal: null, done: false };
    PKB.storage.remove(STORE_QUIZ);
    Q.form.reset();
    Q.ageInput.value = "7";
    Q.ageInput.setCustomValidity("");
    qsa(".field", Q.form).forEach(function (f) { f.classList.remove("is-invalid", "is-valid"); });
    qsa("[aria-invalid]", Q.form).forEach(function (el) { el.removeAttribute("aria-invalid"); });
    setAgeUI(7);
    markRecommended(null);
    showStep(1, { animate: true, focus: true });
  }

  function initQuiz() {
    Q = quizEls();
    if (!Q || !Q.form || !Q.result) return;
    renderQuizOptions();

    // restore last answers
    var saved = PKB.storage.get(STORE_QUIZ, null);
    if (saved && typeof saved === "object") {
      if (validAge(Number(saved.age))) quiz.age = roundAge(Number(saved.age));
      if (skillBy(Number(saved.skill)) && saved.skill !== null && saved.skill !== "") quiz.skill = Number(saved.skill);
      if (goalBy(saved.goal)) quiz.goal = saved.goal;
      quiz.done = !!saved.done && quiz.age !== null && quiz.skill !== null && !!quiz.goal;
    }
    syncInputsFromState();

    // age controls
    Q.ageRange.addEventListener("input", function () {
      var v = roundAge(Number(Q.ageRange.value));
      Q.ageInput.value = String(v);
      Q.ageInput.setCustomValidity("");
      if (Q.ageInput.closest(".field.is-invalid")) PKB.validateField(Q.ageInput);
      setAgeUI(v);
    });
    Q.ageInput.addEventListener("input", function () {
      var v = readAgeInput();
      Q.ageInput.setCustomValidity("");
      if (v !== null && validAge(v)) setAgeUI(v);
      if (Q.ageInput.closest(".field.is-invalid")) PKB.validateField(Q.ageInput);
    });
    qsa("[data-age-step]", Q.root).forEach(function (b) {
      b.addEventListener("click", function () {
        var cur = readAgeInput();
        if (cur === null || !validAge(cur)) cur = Number(Q.ageRange.value) || 7;
        var v = Math.min(AGE_MAX, Math.max(AGE_MIN, Math.round(cur) + Number(b.getAttribute("data-age-step"))));
        Q.ageInput.value = String(v);
        Q.ageInput.setCustomValidity("");
        PKB.validateField(Q.ageInput);
        setAgeUI(v);
      });
    });

    // option changes are saved right away
    Q.form.addEventListener("change", function (e) {
      var t = e.target;
      if (t.name === "skill") { quiz.skill = Number(t.value); PKB.validateField(t); }
      else if (t.name === "goal") { quiz.goal = t.value; PKB.validateField(t); }
      else return;
      quiz.done = false;
      saveQuiz();
      updateAside();
    });

    Q.form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validateStep(quizStep)) return;
      quiz.done = false;
      if (quizStep < 3) {
        saveQuiz();
        showStep(quizStep + 1, { animate: true, focus: true });
      } else {
        quiz.done = true;
        saveQuiz();
        renderResult(false);
      }
    });
    Q.back.addEventListener("click", function () {
      if (quizStep > 1) showStep(quizStep - 1, { animate: true, focus: true });
    });
    qsa("[data-goto]", Q.root).forEach(function (b) {
      b.addEventListener("click", function () {
        var n = Number(b.getAttribute("data-goto"));
        if (!Q.result.hidden || n !== quizStep) showStep(n, { animate: true, focus: true });
      });
    });
    Q.result.addEventListener("click", function (e) {
      if (e.target.closest("[data-quiz-reset]")) { resetQuiz(); return; }
      if (e.target.closest("[data-quiz-edit]")) { showStep(3, { animate: true, focus: true }); }
    });

    if (quiz.done) {
      quizStep = 3;
      renderResult(true);
    } else {
      var first = quiz.age === null ? 1 : quiz.skill === null ? 2 : 3;
      showStep(first, {});
    }
  }

  /* ==================================================================
     4. Comparison table (school groups)
     ================================================================== */
  var compareTable = null;
  function markRecommended(id) {
    if (!compareTable) return;
    qsa(".prog-compare__rec", compareTable).forEach(function (b) { b.remove(); });
    if (!id) return;
    var th = qs('thead th[data-pid="' + id + '"] .prog-compare__group', compareTable);
    if (th) th.insertAdjacentHTML("beforeend", '<span class="badge badge--solid prog-compare__rec">Vaše priporočilo</span>');
  }

  function initCompare() {
    var host = qs("[data-compare]");
    if (!host) return;
    var list = programs.filter(function (p) { return p.category === "sola"; });
    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><span class="icon-bubble">' + PKB.icon("info") + "</span><p>Podatki o skupinah plavalne šole trenutno niso na voljo.</p></div>";
      return;
    }
    var weekly = function (p) { return (p.perWeek || 0) * (p.duration || 0); };
    var maxWeek = Math.max.apply(null, list.map(weekly)) || 1;
    var rows = [
      { label: "Starost", cell: function (p) { return esc(p.ages || "—"); } },
      { label: "Raven", cell: function (p) { return esc(p.level || "—"); } },
      { label: "Treningi na teden", strong: true, cell: function (p) { return p.perWeek ? p.perWeek + "×" : "—"; } },
      { label: "Trajanje treninga", strong: true, cell: function (p) { return p.duration ? p.duration + " min" : "—"; } },
      { label: "Skupaj na teden", cell: function (p) {
          var w = weekly(p);
          if (!w) return "—";
          return '<div class="prog-week"><span class="prog-strong">' + esc(fmtMinutes(w)) + '</span><span class="stat-bar" aria-hidden="true"><span style="--value:' + Math.round(w / maxWeek * 100) + '%"></span></span></div>';
        } },
      { label: "Bazen", cell: function (p) { return esc(p.pool || "—"); } },
      { label: "Članarina", strong: true, nowrap: true, cell: function (p) { return typeof p.price === "number" ? esc(PKB.formatPrice(p.price)) + ' <span class="small soft">/ mesec</span>' : esc(PKB.formatPrice(null)); } }
    ];
    var html = '<table class="table">' +
      '<caption class="visually-hidden">Primerjava skupin plavalne šole po starosti, ravni, številu in trajanju treningov, bazenu in članarini</caption>' +
      '<colgroup><col class="prog-col-label">' + list.map(function () { return "<col>"; }).join("") + "</colgroup>" +
      '<thead><tr><th scope="col" class="prog-corner" data-col="0">Skupina</th>' +
        list.map(function (p, i) {
          return '<th scope="col" data-col="' + (i + 1) + '" data-pid="' + esc(p.id) + '"><div class="prog-compare__group"><span class="prog-compare__name">' + dot(safeColor(p.color)) + esc(p.name) + "</span></div></th>";
        }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) {
        return '<tr><th scope="row" data-col="0">' + esc(r.label) + "</th>" +
          list.map(function (p, i) {
            var cls = [r.strong ? "prog-strong" : "", r.nowrap ? "prog-nowrap" : ""].filter(Boolean).join(" ");
            return '<td data-col="' + (i + 1) + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + r.cell(p) + "</td>";
          }).join("") + "</tr>";
      }).join("") + "</tbody>" +
      '<tfoot><tr><th scope="row" data-col="0"><span class="visually-hidden">Povezave</span></th>' +
        list.map(function (p, i) {
          return '<td data-col="' + (i + 1) + '"><a class="prog-compare__link" href="#' + esc(p.id) + '">Podrobnosti<span class="visually-hidden">: ' + esc(p.name) + "</span>" + PKB.icon("arrow-right") + "</a></td>";
        }).join("") + "</tr></tfoot></table>";
    host.innerHTML = html;
    compareTable = qs("table", host);
    markRecommended(recommendedId);

    var hlCol = 0;
    var cells = qsa("[data-col]", compareTable);
    function hl(col) {
      if (col === hlCol) return;
      hlCol = col;
      cells.forEach(function (c) { c.classList.toggle("is-col", col > 0 && Number(c.getAttribute("data-col")) === col); });
    }
    compareTable.addEventListener("mouseover", function (e) {
      var c = e.target.closest && e.target.closest("[data-col]");
      hl(c ? Number(c.getAttribute("data-col")) : 0);
    });
    compareTable.addEventListener("mouseleave", function () { hl(0); });
    compareTable.addEventListener("focusin", function (e) {
      var c = e.target.closest && e.target.closest("[data-col]");
      hl(c ? Number(c.getAttribute("data-col")) : 0);
    });
    compareTable.addEventListener("focusout", function (e) { if (!compareTable.contains(e.relatedTarget)) hl(0); });

    var hint = qs(".prog-compare__hint");
    var checkOverflow = function () { if (hint) hint.classList.toggle("is-visible", host.scrollWidth > host.clientWidth + 2); };
    checkOverflow();
    window.addEventListener("resize", PKB.debounce(checkOverflow, 150));
  }

  /* ==================================================================
     5. Pricing
     ================================================================== */
  function initPricing() {
    var host = qs("[data-pricing-tiles]");
    var notesHost = qs("[data-pricing-notes]");
    var P = D.pricing || {};
    var lead = qs("[data-pricing-lead]");
    // data note still says "ločen cenik"; the static lead uses the site-wide "po ceniku sekcije" wording
    if (lead && P.note && !/ločen cenik/i.test(P.note)) lead.textContent = P.note;
    if (host) {
      var priced = programs.filter(function (p) { return typeof p.price === "number"; });
      var byPrice = {};
      priced.forEach(function (p) { (byPrice[p.price] = byPrice[p.price] || []).push(p); });
      var keys = Object.keys(byPrice).map(Number).sort(function (a, b) { return a - b; });
      var range = function (vals, suffix) {
        var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
        return (lo === hi ? lo : lo + "–" + hi) + suffix;
      };
      var chips = function (ps) {
        return '<ul class="prog-price-tile__names" role="list">' + ps.map(function (p) {
          return '<li><a href="#' + esc(p.id) + '">' + dot(safeColor(p.color)) + esc(p.name) + "</a></li>";
        }).join("") + "</ul>";
      };
      var tiles = keys.map(function (price) {
        var ps = byPrice[price];
        var pw = ps.map(function (p) { return p.perWeek; }).filter(Boolean);
        var du = ps.map(function (p) { return p.duration; }).filter(Boolean);
        var meta = pw.length && du.length ? range(pw, "× na teden") + " · " + range(du, " min") : "";
        var head;
        if (ps.length === 1) {
          var one = ps[0];
          head = '<h3 class="prog-price-tile__label"><a class="prog-price-tile__name" href="#' + esc(one.id) + '">' + dot(safeColor(one.color)) + esc(one.name) + "</a></h3>" +
            '<p class="prog-price-tile__sub">' + esc([one.ages, one.level].filter(Boolean).join(" · ")) + "</p>";
        } else {
          var allSchool = ps.every(function (p) { return p.category === "sola"; });
          head = '<h3 class="prog-price-tile__label">' + esc((keys.length > 1 ? "Ostale skupine" : "Skupine") + (allSchool ? " plavalne šole" : "")) + "</h3>" +
            '<p class="prog-price-tile__sub">' + ps.length + " " + plural(ps.length, ["skupina", "skupini", "skupine", "skupin"]) + "</p>";
        }
        return '<article class="tile prog-price-tile">' + head +
          '<p class="prog-price-tile__value"><span class="prog-price-tile__num">' + esc(PKB.formatPrice(price)) + '</span><span class="prog-price-tile__per">/ mesec</span></p>' +
          '<span class="stat-bar" aria-hidden="true"><span style="--value:100%"></span></span>' +
          // several groups → links to them; one group → its short description (keeps the tiles balanced)
          (ps.length > 1 ? chips(ps) : ps[0].summary ? '<p class="prog-price-tile__list">' + esc(ps[0].summary) + "</p>" : "") +
          (meta ? '<p class="prog-price-tile__meta">' + esc(meta) + "</p>" : "") +
        "</article>";
      });
      var unpriced = programs.filter(function (p) { return typeof p.price !== "number"; });
      if (unpriced.length) {
        var catIds = unpriced.map(function (p) { return p.category; }).filter(function (c, i, a) { return a.indexOf(c) === i; });
        var label = catIds.map(function (id, i) { var c = catOf({ category: id }); var n = c.short || c.name; return i ? n.toLowerCase() : n; }).join(" in ");
        tiles.push('<article class="tile tile--raised prog-price-tile">' +
          '<h3 class="prog-price-tile__label">' + esc(label) + "</h3>" +
          '<p class="prog-price-tile__sub">' + unpriced.length + " " + plural(unpriced.length, ["program", "programa", "programi", "programov"]) + "</p>" +
          '<p class="prog-price-tile__value"><span class="prog-price-tile__num prog-price-tile__num--text">' + esc(PKB.formatPrice(null)) + "</span></p>" +
          '<span class="stat-bar" aria-hidden="true"><span style="--value:100%"></span></span>' +
          '<p class="prog-price-tile__list">' + unpriced.map(function (p) { return esc(p.name); }).join(" · ") + "</p>" +
          '<p class="prog-price-tile__meta">Za cenik sekcije <a href="kontakt.html?zadeva=vpis#obrazec">nam pišite</a>.</p>' +
        "</article>");
      }
      host.innerHTML = tiles.length ? tiles.join("") : '<p class="muted">Cenik bo objavljen kmalu.</p>';
      host.style.setProperty("--prog-tiles", String(Math.max(1, Math.min(tiles.length, 4))));
    }
    if (notesHost) {
      var notes = [];
      if (P.validFrom) {
        notes.push({ icon: "calendar", title: "Cenik velja od " + PKB.formatDate(P.validFrom, { day: "numeric", month: "numeric", year: "numeric" }), text: "Cene so navedene za mesečno članarino prvega otroka." });
      }
      if (P.enrollmentFee != null) notes.push({ icon: "file-text", title: "Vpisnina", text: "Ob prvem vpisu se poravna vpisnina po veljavnem ceniku." });
      if (P.siblingDiscount) notes.push({ icon: "users", title: "Popust za brate in sestre", text: "Za drugega otroka iz iste družine velja popust po veljavnem ceniku." });
      if (P.paymentNote) notes.push({ icon: "euro", title: "Plačilo", text: P.paymentNote });
      notesHost.innerHTML = notes.map(function (n) {
        return '<li><span class="icon-bubble icon-bubble--sm" aria-hidden="true">' + PKB.icon(n.icon) + "</span><span><strong>" + esc(n.title) + "</strong>" + esc(n.text) + "</span></li>";
      }).join("");
      notesHost.hidden = !notes.length;
      notesHost.style.setProperty("--prog-notes", String(Math.max(1, Math.min(notes.length, 4))));
    }
  }

  /* ==================================================================
     6. Equipment checklist
     ================================================================== */
  function initGear() {
    var list = qs("[data-gear-list]");
    if (!list) return;
    var inputs = qsa('input[type="checkbox"]', list);
    var num = qs("[data-gear-num]"), of = qs("[data-gear-of]"), status = qs("[data-gear-status]");
    var bar = qs("[data-gear-progress]"), resetBtn = qs("[data-gear-reset]");
    var panel = list.closest(".prog-gear__panel");
    var saved = PKB.storage.get(STORE_GEAR, []);
    if (!Array.isArray(saved)) saved = [];
    inputs.forEach(function (i) { i.checked = saved.indexOf(i.value) > -1; });
    var nameOf = function (i) { var n = qs(".prog-gear__name", i.closest("label")); return n ? n.textContent.trim() : i.value; };
    function update() {
      var total = inputs.length;
      var on = inputs.filter(function (i) { return i.checked; });
      var n = on.length;
      if (num) num.textContent = String(n);
      if (of) of.textContent = "/ " + total;
      if (bar) {
        bar.style.setProperty("--value", (total ? n / total * 100 : 0).toFixed(1) + "%");
        bar.setAttribute("aria-valuenow", String(n));
        bar.setAttribute("aria-valuemax", String(total));
      }
      if (status) {
        if (n === 0) status.textContent = "Torba je še prazna.";
        else if (n === total) status.textContent = "Vse je pripravljeno – se vidimo v vodi!";
        else {
          var missing = inputs.filter(function (i) { return !i.checked; }).map(function (i) { return nameOf(i).toLowerCase(); });
          status.textContent = "Manjka še: " + missing.join(", ") + ".";
        }
      }
      if (resetBtn) resetBtn.disabled = n === 0;
      if (panel) panel.classList.toggle("is-complete", n === total && total > 0);
    }
    list.addEventListener("change", function () {
      PKB.storage.set(STORE_GEAR, inputs.filter(function (i) { return i.checked; }).map(function (i) { return i.value; }));
      update();
    });
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        inputs.forEach(function (i) { i.checked = false; });
        PKB.storage.remove(STORE_GEAR);
        update();
        if (inputs[0]) inputs[0].focus();
      });
    }
    update();
  }

  /* ==================================================================
     7. FAQ with diacritics-insensitive search
     ================================================================== */
  function highlight(text, terms) {
    var src = String(text == null ? "" : text);
    if (!terms.length) return esc(src);
    var chars = Array.from(src);
    var norm = chars.map(function (ch) { var n = PKB.normalize(ch); return n.length === 1 ? n : ch.toLowerCase().charAt(0) || ch; });
    var hay = norm.join("");
    if (hay.length !== chars.length) return esc(src);
    var marks = chars.map(function () { return false; });
    terms.forEach(function (t) {
      if (!t) return;
      var from = 0, k;
      while ((k = hay.indexOf(t, from)) > -1) {
        var end = k + t.length;
        while (end < hay.length && /[a-z0-9]/.test(hay.charAt(end))) end++; // mark the rest of the word (inflected endings)
        for (var j = k; j < end; j++) marks[j] = true;
        from = end;
      }
    });
    var out = "", open = false;
    chars.forEach(function (ch, i) {
      if (marks[i] && !open) { out += "<mark>"; open = true; }
      if (!marks[i] && open) { out += "</mark>"; open = false; }
      out += esc(ch);
    });
    if (open) out += "</mark>";
    return out;
  }

  /** Very light Slovenian stemming so "kapa" also finds "kapo", "odrasle" finds "odraslih" … */
  function stem(t) {
    if (t.length < 4) return t;
    var s = t.replace(/[aeiou]+$/, "");
    return s.length >= 3 ? s : t;
  }

  function initFaq() {
    var host = qs("[data-faq-list]");
    if (!host) return;
    var faqs = (Array.isArray(D.faq) ? D.faq : []).filter(function (f) { return f && f.q && f.a; });
    var input = qs("[data-faq-search]"), countEl = qs("[data-faq-count]"), clearBtn = qs("[data-faq-clear]");
    var empty = qs("[data-faq-empty]"), emptyText = qs("[data-faq-empty-text]"), resetBtn = qs("[data-faq-reset]");
    var phone = qs("[data-faq-phone]"), phoneText = qs("[data-faq-phone-text]");
    var club = D.club || {};
    if (phone && club.phoneHref) phone.setAttribute("href", club.phoneHref);
    if (phoneText && club.phone) phoneText.textContent = club.phone;

    if (!faqs.length) {
      host.innerHTML = '<div class="empty-state glass"><span class="icon-bubble">' + PKB.icon("help-circle") + '</span><p>Vprašanja bodo objavljena kmalu. Medtem nam pišite prek <a href="kontakt.html">strani Kontakt</a>.</p></div>';
      if (input) input.disabled = true;
      return;
    }
    host.innerHTML = faqs.map(function (f, i) {
      return '<details class="accordion-item" id="faq-' + (i + 1) + '" data-faq-item>' +
        '<summary><span data-faq-q>' + esc(f.q) + "</span></summary>" +
        '<div class="accordion-body"><p data-faq-a>' + esc(f.a) + "</p></div></details>";
    }).join("");
    var items = qsa("[data-faq-item]", host).map(function (el, i) {
      return { el: el, f: faqs[i], qEl: qs("[data-faq-q]", el), aEl: qs("[data-faq-a]", el), norm: PKB.normalize(faqs[i].q + " " + faqs[i].a) };
    });
    var snapshot = null;

    function run() {
      var raw = input ? input.value.trim() : "";
      var terms = PKB.normalize(raw).split(/\s+/).filter(Boolean).map(stem);
      if (terms.length && !snapshot) snapshot = items.map(function (it) { return it.el.open; });
      var n = 0;
      items.forEach(function (it, i) {
        var match = !terms.length || terms.every(function (t) { return it.norm.indexOf(t) > -1; });
        it.el.hidden = !match;
        if (match) n++;
        it.qEl.innerHTML = highlight(it.f.q, terms);
        it.aEl.innerHTML = highlight(it.f.a, terms);
        if (terms.length) it.el.open = match;
        else if (snapshot) it.el.open = !!snapshot[i];
      });
      if (!terms.length) snapshot = null;
      if (countEl) {
        countEl.textContent = !terms.length
          ? faqs.length + " " + plural(faqs.length, ["vprašanje", "vprašanji", "vprašanja", "vprašanj"]) + "."
          : n === 0 ? "Ni zadetkov za »" + raw + "«."
          : n + " " + plural(n, ["zadetek", "zadetka", "zadetki", "zadetkov"]) + " za »" + raw + "«.";
      }
      if (empty) {
        empty.hidden = n !== 0;
        if (emptyText) emptyText.textContent = "Ni zadetkov za »" + raw + "«.";
      }
      if (clearBtn) clearBtn.hidden = !raw;
    }
    var runDebounced = PKB.debounce(run, 120);
    function clear(focus) {
      if (!input) return;
      input.value = "";
      run();
      if (focus) input.focus();
    }
    if (input) {
      input.addEventListener("input", runDebounced);
      input.addEventListener("search", run);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && input.value) { e.preventDefault(); e.stopPropagation(); clear(true); }
        if (e.key === "Enter") { e.preventDefault(); run(); }
      });
    }
    if (clearBtn) clearBtn.addEventListener("click", function () { clear(true); });
    if (resetBtn) resetBtn.addEventListener("click", function () { clear(true); });
    run();
  }

  /* ==================================================================
     8. Hash routing: #sola / #tekmovalno / #odrasli / #<programId> / sections
     ================================================================== */
  var userScrolled = false;
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (ev) {
    window.addEventListener(ev, function () { userScrolled = true; }, { passive: true, once: true });
  });

  function readHash() {
    var h = (window.location.hash || "").slice(1);
    try { h = decodeURIComponent(h); } catch (e) { /* keep raw */ }
    return h;
  }

  function handleHash(isLoad) {
    var h = readHash();
    if (!h) return;
    var isCat = cats.some(function (c) { return c.id === h; }) && groupEls.some(function (g) { return g.getAttribute("data-cat") === h; });
    var prog = cards[h] ? PKB.programById(h) : null;
    var behavior = isLoad ? "instant" : scrollBehavior();
    if (isCat || prog) {
      if (isCat) setFilter(h, { instant: true });
      else setFilter(prog.category, { instant: true });
      var target = prog ? cards[h].card : qs("#skupine");
      var go = function () {
        if (!target) return;
        target.scrollIntoView({ behavior: behavior, block: "start" });
      };
      requestAnimationFrame(function () {
        go();
        if (prog) {
          setDetails(h, true);
          pulse(cards[h].card);
        }
      });
      if (isLoad) {
        window.addEventListener("load", function () { if (!userScrolled) setTimeout(go, 60); }, { once: true });
      }
      return;
    }
    // other in-page sections: re-align after JS rendering on first load
    if (isLoad) {
      var el = doc.getElementById(h);
      if (el && el.closest("main")) {
        var align = function () { el.scrollIntoView({ behavior: "instant", block: "start" }); };
        requestAnimationFrame(align);
        window.addEventListener("load", function () { if (!userScrolled) setTimeout(align, 60); }, { once: true });
      }
    }
  }

  /* links to the current hash do not fire hashchange – handle them directly */
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var id = a.getAttribute("href").slice(1);
    if (!id || "#" + id !== window.location.hash) return;
    if (cards[id] || cats.some(function (c) { return c.id === id; })) {
      e.preventDefault();
      handleHash(false);
    }
  });

  /* ---------- boot ---------- */
  initPrograms();
  initCompare();
  initQuiz();
  initPricing();
  initGear();
  initFaq();
  handleHash(true);
  window.addEventListener("hashchange", function () { handleHash(false); });
})();
