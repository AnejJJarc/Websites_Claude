/* ==========================================================================
   Domov (index.html) – live hero tiles, overview sections, progression stepper
   Runs after data.js + site.js (all deferred): PKB and PKB.data are ready.
   ========================================================================== */
(function () {
  "use strict";

  var PKB = window.PKB;
  if (!PKB || !PKB.data) return;
  var D = PKB.data;
  var qs = PKB.qs, qsa = PKB.qsa, esc = PKB.escapeHTML;
  var C = D.club || {};

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  /** "Now" on the (possibly overridden, ?danes=) day, with the real clock time. */
  function now() {
    var t = PKB.today();
    var n = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), n.getHours(), n.getMinutes(), n.getSeconds());
  }
  function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  function num(n) { return String(n).replace(".", ","); }
  function addDays(d, k) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + k); }
  function sessionsOnDay(day) {
    return (D.schedule || []).filter(function (s) { return s.day === day; })
      .sort(function (a, b) { return PKB.timeToMinutes(a.start) - PKB.timeToMinutes(b.start) || PKB.timeToMinutes(a.end) - PKB.timeToMinutes(b.end); });
  }
  /** "čez 35 min", "čez 2 h 15 min" */
  function inTime(min) {
    if (min < 60) return "čez " + min + " min";
    var h = Math.floor(min / 60), m = min % 60;
    return "čez " + h + " h" + (m && h < 3 ? " " + m + " min" : "");
  }
  function ageRange(list) {
    var min = Math.min.apply(null, list.map(function (p) { return p.minAge || 0; }));
    var max = Math.max.apply(null, list.map(function (p) { return p.maxAge || 0; }));
    if (!isFinite(min)) return "";
    if (!max || max >= 99) return "od " + num(min) + " let";
    return num(min) + "–" + num(max) + " let";
  }
  var IMG_DIMS = {
    "sola-lebdenje-sm.jpg": [720, 478], "sola-ucenje-sm.jpg": [720, 480], "sola-otroci-sm.jpg": [720, 481],
    "sola-plavanje-sm.jpg": [720, 481], "delfin-plavalka-sm.jpg": [720, 405], "kravl-proga-sm.jpg": [720, 480],
    "start-tekma-sm.jpg": [720, 480], "start-hrbtno-sm.jpg": [560, 840], "tekma-delfin-sm.jpg": [720, 480],
    "odrasli-rekreacija-sm.jpg": [720, 540], "tekma-proge-sm.jpg": [720, 481], "startni-bloki-hala-sm.jpg": [560, 702],
    "gozd-sm.jpg": [720, 480], "proga-vrv-sm.jpg": [720, 405], "morje-sm.jpg": [720, 479], "skok-v-bazen-sm.jpg": [720, 480]
  };
  function dims(src, fw, fh) {
    var f = String(src || "").split("/").pop();
    var d = IMG_DIMS[f];
    return d ? 'width="' + d[0] + '" height="' + d[1] + '"' : 'width="' + (fw || 720) + '" height="' + (fh || 480) + '"';
  }
  /** Slovenian typography: keep one-letter words and number+unit pairs on one line. */
  function nb(s) {
    return String(s == null ? "" : s)
      .replace(/(^|[\s(»„])([vzskaiouVZSKAIOU])\s+/g, "$1$2\u00a0")
      .replace(/(\d)\s+(m|€|min|let|leta|h)(?=[\s.,;)]|$)/g, "$1\u00a0$2");
  }
  function t(s) { return esc(nb(s)); }
  /** "še 1 termin", "še 2 termina", "še 3 termini", "še 5 terminov" (capitalised for a link label) */
  function moreSessions(n) {
    return "Še " + n + " " + PKB.plural(n, ["termin", "termina", "termini", "terminov"]);
  }
  function revealDelay(i, step) { return "--reveal-delay:" + Math.min(i * (step || 90), 600) + "ms"; }

  /* ------------------------------------------------------------------
     1. Stats strip (count-up numbers)
     ------------------------------------------------------------------ */
  function renderStats() {
    var host = qs("[data-home-stats]");
    var stats = D.stats || [];
    if (!host || !stats.length) return;
    host.innerHTML = stats.map(function (s) {
      var val = Number(s.value) || 0;
      return '<li class="home-stat">' +
        '<span class="home-stat__value" data-count-to="' + val + '" data-count-suffix="' + esc(s.suffix || "") + '" data-count-duration="1400">' +
          esc(PKB.formatNumber(val) + (s.suffix || "")) + "</span>" +
        '<span class="home-stat__label">' + (s.icon ? PKB.icon(s.icon, "icon--sm") : "") + "<span>" + esc(s.label) + "</span></span>" +
        '<span class="home-stat__bar" aria-hidden="true"></span></li>';
    }).join("");
    var shell = host.closest("[data-reveal]");
    if (shell && shell.classList.contains("is-revealed")) qsa("[data-count-to]", host).forEach(PKB.countUp);
  }

  /* ------------------------------------------------------------------
     2. "Danes na Pristanu" – live tile (refreshes every 30 s)
     ------------------------------------------------------------------ */
  var todayBody = qs("[data-today-body]");
  var wideMQ = window.matchMedia ? window.matchMedia("(min-width: 1080px)") : null;
  var todayDate = qs("[data-today-date]");
  var todayBadge = qs("[data-today-badge]");

  function nextTrainingInfo(fromDate) {
    for (var k = 1; k <= 7; k++) {
      var d = addDays(fromDate, k);
      var list = sessionsOnDay(PKB.isoWeekday(d));
      if (list.length) {
        var when = k === 1 ? "jutri" : (D.days || [])[PKB.isoWeekday(d) - 1].toLowerCase() + ", " + PKB.formatDate(d, { day: "numeric", month: "long" }) + ",";
        return { text: when + " ob " + list[0].start, date: d, session: list[0] };
      }
    }
    return null;
  }

  function renderToday() {
    if (!todayBody) return;
    var today = PKB.today();
    var n = now();
    var nowM = n.getHours() * 60 + n.getMinutes();
    var list = sessionsOnDay(PKB.isoWeekday(today));
    if (todayDate) todayDate.textContent = cap(PKB.formatDate(today, { weekday: "long", day: "numeric", month: "long" }));

    if (!(D.schedule || []).length) {
      todayBadge.innerHTML = "";
      todayBody.innerHTML = '<p class="small muted home-tile__note">Urnik za novo sezono bo objavljen kmalu.</p>';
      return;
    }

    if (!list.length) {
      var nx = nextTrainingInfo(today);
      todayBadge.innerHTML = "";
      todayBody.innerHTML =
        '<div class="home-today__empty" data-today-empty>' +
          '<span class="icon-bubble icon-bubble--sm">' + PKB.icon("sun") + "</span>" +
          '<p class="home-today__empty-title">Danes ni treningov. Lep dan vam želimo!</p>' +
          (nx ? '<p class="small muted">Naslednji trening: ' + esc(nx.text) + ".</p>" : "") +
          '<a class="btn btn--sm" href="urnik.html">' + PKB.icon("calendar") + "Tedenski urnik</a>" +
        "</div>";
      return;
    }

    var items = list.map(function (s) {
      var a = PKB.timeToMinutes(s.start), b = PKB.timeToMinutes(s.end);
      var st = nowM >= b ? "done" : nowM >= a ? "live" : "upcoming";
      return { s: s, a: a, b: b, st: st, p: PKB.programById(s.program) || { name: s.program, color: "" } };
    });
    var live = items.filter(function (x) { return x.st === "live"; });
    var upcoming = items.filter(function (x) { return x.st === "upcoming"; });
    var next = upcoming[0] || null;

    // up to 3–4 rows, by priority: running sessions, the next one, the latest finished one
    // (context), later sessions, earlier finished ones – then shown in chronological order
    var MAX = wideMQ && wideMQ.matches ? 3 : 4;
    var done = items.filter(function (x) { return x.st === "done"; });
    var pick = [];
    var add = function (x) { if (x && pick.length < MAX && pick.indexOf(x) === -1) pick.push(x); };
    live.slice(0, next ? MAX - 1 : MAX).forEach(add);
    add(next);
    add(done[done.length - 1]);
    upcoming.forEach(add);
    done.slice().reverse().forEach(add);
    var shown = items.filter(function (x) { return pick.indexOf(x) > -1; });
    var hidden = items.length - shown.length;

    var rows = shown.map(function (x) {
      var cls = "home-sess__item is-" + x.st + (x === next ? " is-next" : "");
      var status, extra = "";
      if (x.st === "live") {
        var pct = Math.round(((nowM - x.a) / (x.b - x.a)) * 100);
        status = '<span class="badge badge-live">v teku</span>';
        extra = '<span class="home-sess__progress" role="progressbar" aria-label="Potek treninga" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="--value:' + pct + '%"></span></span>';
      } else if (x.st === "upcoming") {
        status = x === next ? '<span class="badge badge--solid">' + esc(inTime(x.a - nowM)) + "</span>" : "<span>" + esc(inTime(x.a - nowM)) + "</span>";
      } else {
        status = PKB.icon("check") + "<span>končano</span>";
      }
      var poolLine = esc(x.s.pool) + (x.st === "live" ? " · še " + (x.b - nowM) + " min" : "");
      return '<li class="' + cls + '" data-session="' + esc(x.s.program) + '" data-state="' + x.st + '">' +
        '<span class="home-sess__time"><span class="home-sess__start">' + esc(x.s.start) + '</span><span class="home-sess__end">do ' + esc(x.s.end) + "</span></span>" +
        '<span class="home-sess__main"><span class="home-sess__name"><span class="home-sess__dot" style="--dot:' + esc(x.p.color || "") + '" aria-hidden="true"></span>' + esc(x.p.name) + "</span>" +
          '<span class="home-sess__pool">' + poolLine + "</span></span>" +
        '<span class="home-sess__status">' + status + "</span>" + extra +
      "</li>";
    }).join("");

    var summary;
    if (live.length) summary = "V teku: " + live.length + " · " + (upcoming.length ? "še " + upcoming.length + " danes" : "zadnji termini dneva");
    else if (next) summary = "Naslednji ob " + next.s.start + " · " + (upcoming.length + " " + PKB.plural(upcoming.length, ["trening", "treninga", "treningi", "treningov"]) + " še danes");
    else {
      var nt = nextTrainingInfo(today);
      summary = "Današnji treningi so končani" + (nt ? ". Naslednji: " + nt.text : "") + ".";
    }

    todayBadge.innerHTML = live.length
      ? '<span class="badge badge-live" data-today-live>V živo</span>'
      : '<span class="badge">' + items.length + " " + PKB.plural(items.length, ["termin", "termina", "termini", "terminov"]) + "</span>";
    todayBody.innerHTML =
      '<ol class="home-sess" role="list" aria-label="Današnji treningi">' + rows + "</ol>" +
      '<div class="home-today__foot"><span aria-live="polite" data-today-summary>' + esc(summary) + "</span>" +
        '<a href="urnik.html">' + (hidden > 0 ? esc(moreSessions(hidden)) + " · " : "") + "Urnik" + PKB.icon("arrow-right", "icon--sm") + "</a></div>";
  }

  /* ------------------------------------------------------------------
     3. Next competition – ticking countdown
     ------------------------------------------------------------------ */
  var nextBody = qs("[data-next-body]");
  var nextWhen = qs("[data-next-when]");
  var nextComp = (PKB.upcomingCompetitions() || [])[0] || null;
  var tickTimer = 0;
  var lastAria = "";

  function levelBadge(level) {
    var map = { "Državno prvenstvo": "badge--gold", "Pokal": "badge--violet", "Miting": "badge--blue", "Interni miting": "badge--teal" };
    return '<span class="badge ' + (map[level] || "badge-dot") + '">' + esc(level || "Tekma") + "</span>";
  }

  function renderNext() {
    if (!nextBody) return;
    var c = nextComp;
    if (!c) {
      if (nextWhen) nextWhen.textContent = "Sezona " + (C.season || "");
      nextBody.innerHTML = '<p class="small muted home-tile__note">Novi termini tekem bodo objavljeni kmalu. <a href="tekmovanja.html#koledar">Koledar tekmovanj</a></p>';
      return;
    }
    var status = PKB.competitionStatus(c);
    if (nextWhen) nextWhen.textContent = PKB.formatDateRange(c.date, c.endDate) + " · " + PKB.relativeDay(c.date);
    var head =
      '<h3 class="home-next__name"><a href="tekmovanja.html#' + encodeURIComponent(c.id) + '">' + esc(c.name) + "</a></h3>" +
      '<p class="home-next__meta">' + PKB.icon("map-pin") + "<span>" + esc(c.city) + " · " + esc(c.venue) + "</span></p>";
    var badges = '<div class="home-next__badges">' + levelBadge(c.level) + (c.host ? '<span class="badge badge--solid">Domači miting</span>' : "") + "</div>";
    if (status === "live") {
      nextBody.innerHTML = head +
        '<div class="home-next__live"><span class="badge badge-live">Poteka zdaj</span>' +
        '<span class="small muted">Tekma je v teku – rezultate objavimo sproti.</span></div>' +
        '<div class="home-next__foot">' + badges +
          '<a class="btn btn--sm" href="tekmovanja.html?tekma=' + encodeURIComponent(c.id) + '#rezultati">Rezultati</a></div>';
      return;
    }
    nextBody.innerHTML = head +
      '<div class="home-count" role="timer" aria-live="off" data-countdown>' +
        ["d", "h", "m", "s"].map(function (k) {
          return '<div class="home-count__unit"><span class="home-count__num" data-cd="' + k + '">0</span><span class="home-count__lbl" data-cdl="' + k + '"></span></div>';
        }).join("") +
      "</div>" +
      '<div class="home-next__foot">' + badges +
        '<button type="button" class="btn btn--sm" data-next-ics>' + PKB.icon("calendar-plus") + "V koledar</button></div>";
    var ics = qs("[data-next-ics]", nextBody);
    if (ics) ics.addEventListener("click", function () {
      PKB.downloadICS([{
        title: c.name, start: PKB.parseDate(c.date), end: PKB.parseDate(c.endDate || c.date), allDay: true,
        location: c.venue + ", " + c.city,
        description: (c.level || "Tekma") + " · " + (c.course || "") + " bazen. Plavalni klub Branik Maribor."
      }], PKB.slugify(c.name) + ".ics");
    });
    tick();
    clearInterval(tickTimer);
    tickTimer = setInterval(tick, 1000);
  }

  var UNIT_FORMS = {
    d: ["dan", "dneva", "dnevi", "dni"],
    h: ["ura", "uri", "ure", "ur"],
    m: ["minuta", "minuti", "minute", "minut"],
    s: ["sekunda", "sekundi", "sekunde", "sekund"]
  };
  function tick() {
    var c = nextComp;
    var box = qs("[data-countdown]", nextBody);
    if (!c || !box) { clearInterval(tickTimer); return; }
    var diff = PKB.parseDate(c.date) - now();
    if (diff <= 0) {
      // the competition has started: re-evaluate and show the live state
      clearInterval(tickTimer);
      nextComp = (PKB.upcomingCompetitions() || [])[0] || null;
      renderNext();
      return;
    }
    var totalS = Math.floor(diff / 1000);
    var v = { d: Math.floor(totalS / 86400), h: Math.floor((totalS % 86400) / 3600), m: Math.floor((totalS % 3600) / 60), s: totalS % 60 };
    Object.keys(v).forEach(function (k) {
      var el = qs('[data-cd="' + k + '"]', box);
      var lb = qs('[data-cdl="' + k + '"]', box);
      var txt = k === "d" ? String(v[k]) : String(v[k]).padStart(2, "0");
      if (el && el.textContent !== txt) el.textContent = txt;
      var l = PKB.plural(v[k], UNIT_FORMS[k]);
      if (lb && lb.textContent !== l) lb.textContent = l;
    });
    var aria = "Do začetka tekme še " + v.d + " " + PKB.plural(v.d, UNIT_FORMS.d) + ", " + v.h + " " + PKB.plural(v.h, UNIT_FORMS.h) + " in " + v.m + " " + PKB.plural(v.m, UNIT_FORMS.m);
    if (aria !== lastAria) { box.setAttribute("aria-label", aria); lastAria = aria; }
  }

  /* ------------------------------------------------------------------
     4. Pointer parallax on the hero tiles (mouse only, no reduced motion)
     ------------------------------------------------------------------ */
  function setupParallax() {
    var shell = qs("[data-home-shell]");
    if (!shell || !window.matchMedia) return;
    var coarse = window.matchMedia("(hover: none), (pointer: coarse)");
    var raf = 0, tx = 0, ty = 0;
    function enabled() { return !PKB.prefersReducedMotion() && !coarse.matches; }
    function apply() {
      raf = 0;
      shell.style.setProperty("--hx", tx.toFixed(3));
      shell.style.setProperty("--hy", ty.toFixed(3));
    }
    shell.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || !enabled()) return;
      var r = shell.getBoundingClientRect();
      tx = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
      ty = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
      shell.classList.add("is-parallax");
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    shell.addEventListener("pointerleave", function () {
      if (!shell.classList.contains("is-parallax")) return;
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
      shell.classList.remove("is-parallax");
    });
  }

  /* ------------------------------------------------------------------
     5. Program categories
     ------------------------------------------------------------------ */
  function renderCategories() {
    var host = qs("[data-home-cats]");
    var cats = D.programCategories || [];
    if (!host || !cats.length) return;
    host.innerHTML = cats.map(function (cat, i) {
      var progs = (D.programs || []).filter(function (p) { return p.category === cat.id; })
        .sort(function (a, b) { return (a.skill || 0) - (b.skill || 0); });
      var img = (progs[0] && progs[0].image) || "assets/img/photos/bazen-hala-sm.jpg";
      var prices = progs.map(function (p) { return p.price; }).filter(function (p) { return typeof p === "number"; });
      var price = prices.length
        ? "od <strong>" + esc(PKB.formatPrice(Math.min.apply(null, prices))) + "</strong> / mesec"
        : "Cena: <strong>" + esc(PKB.formatPrice(null).toLowerCase()) + "</strong>";
      var count = progs.length + " " + PKB.plural(progs.length, ["skupina", "skupini", "skupine", "skupin"]);
      return '<article class="card card--hover home-cat" data-reveal data-cat="' + esc(cat.id) + '" style="' + revealDelay(i) + '">' +
        '<div class="photo-card">' +
          '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async" ' + dims(img) + ">" +
          '<div class="photo-card__glass home-cat__cap"><span>' + esc(count) + " · " + esc(ageRange(progs)) + "</span>" +
            '<span class="icon-bubble">' + PKB.icon(cat.icon || "waves") + "</span></div>" +
        "</div>" +
        '<div class="home-cat__body">' +
          '<h3 class="card-title"><a href="programi.html#' + encodeURIComponent(cat.id) + '">' + esc(cat.name) + "</a></h3>" +
          '<p class="muted small">' + t(cat.desc) + "</p>" +
          '<ul class="home-cat__groups" role="list" aria-label="Skupine">' + progs.map(function (p) {
            return '<li><span class="dot" style="--dot:' + esc(p.color || "") + '" aria-hidden="true"></span>' + esc(p.name) + "</li>";
          }).join("") + "</ul>" +
          '<div class="card-footer"><span class="home-cat__price">' + price + '</span><span class="home-cat__go" aria-hidden="true">Odpri' + PKB.icon("arrow-right") + "</span></div>" +
        "</div></article>";
    }).join("");

    var sola = (D.programs || []).filter(function (p) { return p.category === "sola"; });
    var meta = qs("[data-sola-meta]");
    if (meta && sola.length) meta.textContent = "Od " + num(Math.min.apply(null, sola.map(function (p) { return p.minAge; }))) + ". leta naprej · " + sola.length + " " + PKB.plural(sola.length, ["skupina", "skupini", "skupine", "skupin"]);
  }

  /* ------------------------------------------------------------------
     6. "Pot napredovanja" – keyboard-accessible stepper (tablist)
     ------------------------------------------------------------------ */
  function setupPath() {
    var tabsHost = qs("[data-path-tabs]");
    var panel = qs("[data-path-panel]");
    var scroller = qs("[data-path-scroll]");
    var nav = qs("[data-path-nav]");
    if (!tabsHost || !panel) return;
    var steps = (D.programs || []).filter(function (p) { return p.category === "sola"; })
      .sort(function (a, b) { return (a.skill || 0) - (b.skill || 0); });
    if (!steps.length) {
      panel.innerHTML = '<p class="muted">Skupine plavalne šole bodo objavljene kmalu.</p>';
      return;
    }
    tabsHost.style.setProperty("--steps", steps.length);
    tabsHost.innerHTML = steps.map(function (p, i) {
      return '<button type="button" role="tab" class="home-step" id="home-step-' + esc(p.id) + '" aria-controls="home-path-panel" aria-selected="false" tabindex="-1" data-step="' + i + '" style="--dot:' + esc(p.color || "") + '">' +
        '<span class="home-step__node" aria-hidden="true"><span class="home-step__dot"></span></span>' +
        '<span class="home-step__num" aria-hidden="true">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<span class="home-step__name">' + esc(p.name) + "</span>" +
        '<span class="home-step__age">' + esc(p.ages) + "</span></button>";
    }).join("");
    var tabs = qsa('[role="tab"]', tabsHost);
    var current = -1;
    var prevBtn = qs("[data-path-prev]"), nextBtn = qs("[data-path-next]");
    if (nav) nav.hidden = false;

    function detailHTML(p, i) {
      var sessions = PKB.sessionsFor(p.id);
      var days = [];
      sessions.forEach(function (s) { var d = (D.daysShort || [])[s.day - 1]; if (d && days.indexOf(d) === -1) days.push(d); });
      var price = typeof p.price === "number" ? PKB.formatPrice(p.price) : PKB.formatPrice(null);
      return '<div class="home-path__detail is-entering">' +
        '<div class="photo-card home-path__photo">' +
          '<img src="' + esc(p.image || "assets/img/photos/bazen-hala-sm.jpg") + '" alt="" decoding="async" ' + dims(p.image) + ">" +
          '<div class="photo-card__glass"><span>' + esc(p.pool) + "</span><span>" + (i + 1) + " / " + steps.length + "</span></div>" +
        "</div>" +
        '<div class="home-path__info">' +
          '<p class="home-path__kicker"><span class="dot" style="--dot:' + esc(p.color || "") + '" aria-hidden="true"></span>Korak ' + (i + 1) + " od " + steps.length + "</p>" +
          '<h3 class="home-path__name">' + esc(p.name) + "</h3>" +
          '<p class="home-path__level">' + esc(p.level) + "</p>" +
          '<p class="home-path__desc">' + t(p.summary) + "</p>" +
          '<dl class="home-facts">' +
            '<div class="home-fact"><dt>Starost</dt><dd class="home-fact__value">' + esc(p.ages) + "</dd></div>" +
            '<div class="home-fact"><dt>Treningi</dt><dd class="home-fact__value">' + esc(p.perWeek) + "× na teden</dd><dd class=\"home-fact__sub\">po " + esc(p.duration) + " min" + (days.length ? " · " + esc(days.join(", ")) : "") + "</dd></div>" +
            '<div class="home-fact"><dt>Raven</dt><dd class="home-fact__value">' + esc(p.level) + "</dd></div>" +
            '<div class="home-fact"><dt>Članarina</dt><dd class="home-fact__value">' + esc(price) + "</dd><dd class=\"home-fact__sub\">" + (typeof p.price === "number" ? "na mesec, prvi otrok" : "pišite nam") + "</dd></div>" +
          "</dl>" +
        "</div>" +
        // goals tile + actions share the right column on wide screens (heights stay balanced);
        // below 1100 px the wrapper is display: contents and the actions sit right under the facts
        '<div class="home-path__side">' +
          '<div class="tile tile--raised home-path__goals">' +
            "<h4>Kaj otrok osvoji</h4>" +
            '<ul class="list-check">' + (p.goals || []).map(function (g) { return "<li>" + t(g) + "</li>"; }).join("") + "</ul>" +
            (p.requirements ? '<p class="home-path__req"><strong>Pogoj za vpis:</strong> ' + t(p.requirements) + "</p>" : "") +
          "</div>" +
          '<div class="cluster home-path__actions">' +
            '<a class="btn btn--primary" href="vpis.html?program=' + encodeURIComponent(p.id) + '" data-path-enrol>Vpis v skupino' + PKB.icon("arrow-right", "icon--move") + "</a>" +
            '<a class="btn" href="programi.html#' + encodeURIComponent(p.id) + '" data-path-more>Več o skupini</a>' +
          "</div>" +
        "</div>" +
      "</div>";
    }

    function updateEdges() {
      if (!scroller) return;
      var max = scroller.scrollWidth - scroller.clientWidth;
      scroller.classList.toggle("can-left", max > 1 && scroller.scrollLeft > 2);
      scroller.classList.toggle("can-right", max > 1 && scroller.scrollLeft < max - 2);
    }
    if (scroller) {
      var edgeRaf = 0;
      scroller.addEventListener("scroll", function () {
        if (!edgeRaf) edgeRaf = requestAnimationFrame(function () { edgeRaf = 0; updateEdges(); });
      }, { passive: true });
      window.addEventListener("resize", PKB.debounce(updateEdges, 120));
    }

    function keepTabVisible(tab, smooth) {
      if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 1) return;
      var left = tab.offsetLeft - (scroller.clientWidth - tab.offsetWidth) / 2;
      scroller.scrollTo({ left: Math.max(0, left), behavior: smooth && !PKB.prefersReducedMotion() ? "smooth" : "auto" });
    }

    function select(i, opts) {
      opts = opts || {};
      i = Math.max(0, Math.min(steps.length - 1, i));
      var p = steps[i];
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.setAttribute("tabindex", on ? "0" : "-1");
        t.classList.toggle("is-past", k < i);
      });
      panel.setAttribute("aria-labelledby", tabs[i].id);
      if (i !== current) {
        panel.innerHTML = detailHTML(p, i);
        if (PKB.prefersReducedMotion()) { var det = qs(".home-path__detail", panel); if (det) det.classList.remove("is-entering"); }
      }
      current = i;
      if (opts.focus) tabs[i].focus({ preventScroll: true });
      keepTabVisible(tabs[i], !opts.instant);
      if (prevBtn) {
        prevBtn.disabled = i === 0;
        // visible text = neighbour name (or "Nazaj"); the accessible name starts with exactly that text (WCAG 2.5.3)
        var prevTxt = i > 0 ? steps[i - 1].name : "Nazaj";
        qs("[data-path-prev-label]", prevBtn).textContent = prevTxt;
        prevBtn.setAttribute("aria-label", prevTxt + ", prejšnji korak");
      }
      if (nextBtn) {
        nextBtn.disabled = i === steps.length - 1;
        var nextTxt = i < steps.length - 1 ? steps[i + 1].name : "Naprej";
        qs("[data-path-next-label]", nextBtn).textContent = nextTxt;
        nextBtn.setAttribute("aria-label", nextTxt + ", naslednji korak");
      }
      var count = qs("[data-path-count]");
      if (count) count.textContent = (i + 1) + " / " + steps.length;
      if (!opts.silent) PKB.storage.set("home:pot", p.id);
    }

    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i); });
    });
    tabsHost.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var to = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") to = Math.min(tabs.length - 1, i + 1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = Math.max(0, i - 1);
      else if (e.key === "Home") to = 0;
      else if (e.key === "End") to = tabs.length - 1;
      if (to === null) return;
      e.preventDefault();
      select(to, { focus: true });
    });
    function stepBy(delta, btn, other) {
      select(current + delta);
      // keep focus on a usable control when a nav button becomes disabled at either end
      if (btn.disabled) (other && !other.disabled ? other : tabs[current]).focus();
    }
    if (prevBtn) prevBtn.addEventListener("click", function () { stepBy(-1, prevBtn, nextBtn); });
    if (nextBtn) nextBtn.addEventListener("click", function () { stepBy(1, nextBtn, prevBtn); });

    var saved = PKB.storage.get("home:pot", null);
    var start = 0;
    steps.forEach(function (p, i) { if (p.id === saved) start = i; });
    select(start, { silent: true, instant: true });
    updateEdges();
  }

  /* ------------------------------------------------------------------
     7. Upcoming competitions + medal chart
     ------------------------------------------------------------------ */
  function renderCompetitions() {
    var host = qs("[data-home-comps]");
    if (!host) return;
    var comps = (PKB.upcomingCompetitions() || []).slice(0, 3);
    if (!comps.length) {
      host.innerHTML = '<li class="glass home-comps__empty empty-state"><span class="icon-bubble">' + PKB.icon("calendar") + "</span>" +
        "<p>Novi termini tekem bodo objavljeni kmalu.</p><a class=\"btn btn--sm\" href=\"tekmovanja.html#koledar\">Koledar tekmovanj</a></li>";
      return;
    }
    host.innerHTML = comps.map(function (c, i) {
      var a = PKB.parseDate(c.date), b = c.endDate ? PKB.parseDate(c.endDate) : null;
      var range = b && (b - a) > 0;
      var dayTxt = range && a.getMonth() === b.getMonth() ? a.getDate() + "–" + b.getDate() : String(a.getDate());
      var month = PKB.formatDate(c.date, { month: "short" }).replace(".", "");
      var status = PKB.competitionStatus(c);
      var rel = status === "live" ? '<span class="badge badge-live">V teku</span>' : "<span>" + esc(PKB.relativeDay(c.date)) + "</span>";
      return '<li data-reveal style="' + revealDelay(i) + '">' +
        '<article class="card card--hover home-comp" data-comp="' + esc(c.id) + '">' +
          '<div class="home-comp__date" aria-hidden="true"><span class="home-comp__day' + (range && a.getMonth() === b.getMonth() ? " is-range" : "") + '">' + esc(dayTxt) + '</span><span class="home-comp__month">' + esc(month) + "</span></div>" +
          '<div class="home-comp__main">' +
            '<h3 class="card-title"><a href="tekmovanja.html#' + encodeURIComponent(c.id) + '">' + esc(c.name) + "</a></h3>" +
            '<div class="home-comp__meta"><span>' + PKB.icon("calendar", "icon--sm") + esc(PKB.formatDateRange(c.date, c.endDate)) + "</span>" +
              "<span>" + PKB.icon("map-pin", "icon--sm") + esc(c.city) + " · " + esc(c.venue) + "</span>" +
              (c.course ? "<span>" + PKB.icon("waves", "icon--sm") + esc(c.course) + " bazen</span>" : "") + "</div>" +
            '<div class="home-comp__badges">' + levelBadge(c.level) + (c.host ? '<span class="badge badge--solid" data-host>Domači miting</span>' : "") + "</div>" +
          "</div>" +
          '<div class="home-comp__side">' + rel + '<span class="home-comp__go" aria-hidden="true">' + PKB.icon("arrow-right") + "</span></div>" +
        "</article></li>";
    }).join("");
    renderCompsMore();
  }

  /** Summary under the rows: how many meets remain + export all of them to a calendar. */
  function renderCompsMore() {
    var box = qs("[data-comps-more]");
    var all = PKB.upcomingCompetitions() || [];
    if (!box) return;
    if (!all.length) { box.hidden = true; return; }
    var hosts = all.filter(function (c) { return c.host; }).length;
    var hostTxt = hosts
      ? ", od tega <strong>" + hosts + " " + PKB.plural(hosts, ["domači miting", "domača mitinga", "domači mitingi", "domačih mitingov"]) + "</strong> na Pristanu"
      : "";
    box.innerHTML =
      '<div class="home-comps__more-text"><span class="icon-bubble icon-bubble--sm">' + PKB.icon("calendar") + "</span>" +
        "<p>Do konca sezone še <strong>" + all.length + " " + PKB.plural(all.length, ["tekma", "tekmi", "tekme", "tekem"]) + "</strong>" + hostTxt + ".</p></div>" +
      '<div class="cluster">' +
        '<button type="button" class="btn btn--sm" data-comps-ics>' + PKB.icon("download") + "Vse v koledar (.ics)</button>" +
      "</div>";
    box.hidden = false;
    qs("[data-comps-ics]", box).addEventListener("click", function () {
      PKB.downloadICS(all.map(function (c) {
        return {
          title: c.name, start: PKB.parseDate(c.date), end: PKB.parseDate(c.endDate || c.date), allDay: true,
          location: c.venue + ", " + c.city,
          description: (c.level || "Tekma") + " · " + (c.course || "") + " bazen. Plavalni klub Branik Maribor."
        };
      }), "pk-branik-tekme.ics");
    });
  }

  function renderChart() {
    var plot = qs("[data-home-chart]");
    if (!plot) return;
    var byComp = {};
    (D.results || []).forEach(function (r) {
      if (!r || !r.competition || [1, 2, 3].indexOf(r.place) === -1) return;
      var c = PKB.competitionById(r.competition);
      if (!c || PKB.competitionStatus(c) !== "past") return;
      var o = byComp[c.id] || (byComp[c.id] = { c: c, g: 0, s: 0, b: 0 });
      if (r.place === 1) o.g++; else if (r.place === 2) o.s++; else o.b++;
    });
    var rows = Object.keys(byComp).map(function (k) { return byComp[k]; })
      .sort(function (a, b) { return PKB.parseDate(a.c.date) - PKB.parseDate(b.c.date); }).slice(-6);
    var totalEl = qs("[data-chart-total]"), legend = qs("[data-chart-legend]"), tableHost = qs("[data-chart-table]"), sub = qs("[data-chart-sub]");
    if (!rows.length) {
      plot.innerHTML = '<p class="home-chart__empty">Rezultati sezone bodo objavljeni po prvi tekmi.</p>';
      if (totalEl) totalEl.innerHTML = "";
      return;
    }
    var sum = { g: 0, s: 0, b: 0 };
    rows.forEach(function (r) { sum.g += r.g; sum.s += r.s; sum.b += r.b; r.t = r.g + r.s + r.b; });
    var total = sum.g + sum.s + sum.b;
    if (sub) sub.textContent = rows.length + " " + PKB.plural(rows.length, ["tekma", "tekmi", "tekme", "tekem"]) + " sezone " + (C.season || "");
    if (totalEl) totalEl.innerHTML = '<span class="stat-value" data-count-to="' + total + '">' + total + "</span><span>" + PKB.plural(total, ["medalja", "medalji", "medalje", "medalj"]) + " skupaj</span>";

    // SVG: grouped thin bars per competition + a thin white line through the totals
    var W = 360, H = 210, L = 26, R = 10, T = 30, B = 44;
    var pw = W - L - R, ph = H - T - B;
    var maxT = Math.max.apply(null, rows.map(function (r) { return r.t; }));
    var top = Math.max(4, Math.ceil(maxT / 4) * 4);
    var y = function (v) { return T + ph - (v / top) * ph; };
    var gw = pw / rows.length;
    var bw = 7, gap = 5;
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" aria-hidden="true" focusable="false">';
    [0, top / 2, top].forEach(function (v) {
      svg += '<line class="' + (v === 0 ? "home-chart__base" : "home-chart__grid") + '" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>';
      svg += '<text class="home-chart__axis" x="' + (L - 8) + '" y="' + (y(v) + 3.5) + '" text-anchor="end">' + v + "</text>";
    });
    var pts = [];
    rows.forEach(function (r, i) {
      var cx = L + gw * (i + 0.5);
      var x0 = cx - (bw * 3 + gap * 2) / 2;
      [["g", r.g], ["s", r.s], ["b", r.b]].forEach(function (m, j) {
        var x = x0 + j * (bw + gap);
        var h = Math.max(0, y(0) - y(m[1]));
        if (m[1] > 0) svg += '<rect class="home-bar home-bar--' + m[0] + '" x="' + x.toFixed(1) + '" y="' + y(m[1]).toFixed(1) + '" width="' + bw + '" height="' + h.toFixed(1) + '" rx="2" style="transition-delay:' + (i * 120 + j * 60) + 'ms"/>';
        if (m[1] > 0) svg += '<text class="home-chart__val" x="' + (x + bw / 2).toFixed(1) + '" y="' + (y(m[1]) - 5).toFixed(1) + '" text-anchor="middle">' + m[1] + "</text>";
      });
      pts.push([cx, y(r.t)]);
      var short = r.c.city || r.c.name;
      svg += '<text class="home-chart__xl" x="' + cx.toFixed(1) + '" y="' + (H - B + 18) + '" text-anchor="middle">' + esc(short) + "</text>";
      svg += '<text class="home-chart__xs" x="' + cx.toFixed(1) + '" y="' + (H - B + 33) + '" text-anchor="middle">' + esc(PKB.formatDate(r.c.date, { day: "numeric", month: "short" })) + "</text>";
    });
    if (pts.length > 1) svg += '<polyline class="home-chart__line" points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>';
    pts.forEach(function (p, i) {
      svg += '<circle class="home-chart__pt" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5"/>';
      svg += '<text class="home-chart__ptl" x="' + p[0].toFixed(1) + '" y="' + (p[1] - 9).toFixed(1) + '" text-anchor="middle">' + rows[i].t + "</text>";
    });
    svg += "</svg>";
    plot.innerHTML = svg;

    if (legend) legend.innerHTML =
      '<li><span class="dot" style="--dot:var(--c-gold)" aria-hidden="true"></span>Zlato <strong>' + sum.g + "</strong></li>" +
      '<li><span class="dot" style="--dot:var(--c-silver)" aria-hidden="true"></span>Srebro <strong>' + sum.s + "</strong></li>" +
      '<li><span class="dot" style="--dot:var(--c-bronze)" aria-hidden="true"></span>Bron <strong>' + sum.b + "</strong></li>" +
      '<li><span class="home-chart__key" aria-hidden="true"></span>Črta: skupno število medalj na tekmo</li>';
    if (tableHost) tableHost.innerHTML =
      '<div class="visually-hidden"><table><caption>Medalje po tekmah v sezoni ' + esc(C.season || "") + "</caption>" +
      '<thead><tr><th scope="col">Tekma</th><th scope="col">Datum</th><th scope="col">Zlato</th><th scope="col">Srebro</th><th scope="col">Bron</th><th scope="col">Skupaj</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><th scope="row">' + esc(r.c.name) + "</th><td>" + esc(PKB.formatDateRange(r.c.date, r.c.endDate)) + "</td><td>" + r.g + "</td><td>" + r.s + "</td><td>" + r.b + "</td><td>" + r.t + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  /* ------------------------------------------------------------------
     8. Latest news
     ------------------------------------------------------------------ */
  function renderNews() {
    var host = qs("[data-home-news]");
    if (!host) return;
    var news = (PKB.sortedNews() || []).slice(0, 3);
    if (!news.length) {
      host.innerHTML = '<div class="glass empty-state">' + '<span class="icon-bubble">' + PKB.icon("newspaper") + "</span><p>Novice bodo kmalu objavljene.</p></div>";
      return;
    }
    host.innerHTML = news.map(function (n, i) {
      return '<article class="card card--media card--hover" data-reveal style="' + revealDelay(i) + '" data-news="' + esc(n.id) + '">' +
        '<div class="card-media"><img src="' + esc(n.image || "assets/img/photos/pod-vodo-sm.jpg") + '" alt="" loading="lazy" decoding="async" ' + dims(n.image) + '><span class="badge">' + esc(n.category) + "</span></div>" +
        '<div class="card-body">' +
          '<div class="card-meta"><span>' + PKB.icon("calendar", "icon--sm") + '<time datetime="' + esc(n.date) + '">' + esc(PKB.formatDate(n.date)) + "</time></span>" +
            (n.readMins ? "<span>" + PKB.icon("clock", "icon--sm") + esc(n.readMins) + " min branja</span>" : "") + "</div>" +
          '<h3 class="card-title"><a href="novice.html?clanek=' + encodeURIComponent(n.id) + '">' + t(n.title) + "</a></h3>" +
          '<p class="muted small">' + t(n.excerpt) + "</p>" +
          '<div class="card-footer"><span class="home-news__more" aria-hidden="true">Preberi' + PKB.icon("arrow-right") + "</span></div>" +
        "</div></article>";
    }).join("");
  }

  /* ------------------------------------------------------------------
     9. Olympians
     ------------------------------------------------------------------ */
  function renderOlympians() {
    var host = qs("[data-home-oly]");
    var list = D.olympians || [];
    if (!host || !list.length) return;
    host.innerHTML = list.map(function (o) {
      return '<article class="tile tile--raised home-oly__card">' +
        '<div class="home-oly__who"><span class="avatar" aria-hidden="true">' + esc(PKB.initials(o.name)) + "</span>" +
          '<div><h3 class="home-oly__name">' + esc(o.name) + '</h3><p class="home-oly__disc">' + esc(o.discipline) + "</p></div></div>" +
        '<div class="home-oly__games" aria-label="Olimpijske igre">' + (o.games || []).map(function (g) {
          return '<span class="badge badge--gold">' + esc(g) + "</span>";
        }).join("") + "</div>" +
        (o.note ? '<p class="home-oly__note">' + t(o.note) + "</p>" : "") +
      "</article>";
    }).join("");
    var games = [];
    list.forEach(function (o) { (o.games || []).forEach(function (g) { games.push(g); }); });
    var tot = qs("[data-oly-total]");
    if (tot && games.length) tot.textContent = games.length + " " + PKB.plural(games.length, ["nastop", "nastopa", "nastopi", "nastopov"]) + " na olimpijskih igrah";
    var cap2 = qs("[data-oly-games]");
    if (cap2 && games.length) {
      cap2.textContent = games.slice().sort(function (a, b) { return (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0); }).join(" · ");
    }
  }

  /* ------------------------------------------------------------------
     10. Gallery teaser (5 photos, asymmetric grid)
     ------------------------------------------------------------------ */
  function renderGallery() {
    var host = qs("[data-home-gallery]");
    var all = D.gallery || [];
    if (!host || !all.length) return;
    var picks = ["g10", "g20", "g3", "g16", "g11"].map(function (id) {
      return all.filter(function (g) { return g.id === id; })[0];
    }).filter(Boolean);
    all.forEach(function (g) { if (picks.length < 5 && picks.indexOf(g) === -1) picks.push(g); });
    host.innerHTML = picks.slice(0, 5).map(function (g, i) {
      var landscape = (g.w || 3) >= (g.h || 2);
      var tw = landscape ? 720 : 560, th = Math.round(tw * (g.h || 2) / (g.w || 3));
      return '<li data-reveal="zoom" style="' + revealDelay(i, 70) + '">' +
        '<a class="home-gal__link" href="galerija.html#' + encodeURIComponent(g.id) + '" aria-label="' + esc(g.title) + ' – odpri v galeriji">' +
          '<img src="' + esc(g.thumb || g.src) + '" alt="" loading="lazy" decoding="async" width="' + tw + '" height="' + th + '">' +
          '<span class="photo-card__glass home-gal__cap" aria-hidden="true"><span>' + esc(g.title) + "</span>" + PKB.icon("maximize") + "</span>" +
        "</a></li>";
    }).join("");
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  function safe(fn) {
    try { fn(); } catch (e) { if (window.console && console.error) console.error("[domov]", e); }
  }
  safe(renderStats);
  safe(renderToday);
  safe(renderNext);
  safe(setupParallax);
  safe(renderCategories);
  safe(setupPath);
  safe(renderCompetitions);
  safe(renderChart);
  safe(renderNews);
  safe(renderOlympians);
  safe(renderGallery);
  var season = qs("[data-season]");
  if (season && C.season) season.textContent = "Vpis v sezono " + C.season;

  // desktop shows 3 rows (hero height), tablet/mobile 4
  if (wideMQ) {
    var onWide = function () { safe(renderToday); };
    if (wideMQ.addEventListener) wideMQ.addEventListener("change", onWide);
    else if (wideMQ.addListener) wideMQ.addListener(onWide);
  }
  // live tile: refresh every 30 s and when the tab becomes visible again
  setInterval(function () { safe(renderToday); }, 30000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") { safe(renderToday); safe(tick); }
  });
})();
