/* ==========================================================================
   Tekmovanja (tekmovanja.html) – odštevanje do naslednje tekme, koledar tekem
   s filtri, mesečni mini koledar, rezultati (filtri, razvrščanje, CSV),
   klubski rekordi in globoke povezave (#<id tekme>, ?tekma=<id>#rezultati).
   ========================================================================== */
(function () {
  "use strict";

  var PKB = window.PKB;
  if (!PKB || !PKB.data) return;
  var D = PKB.data;
  var doc = document;
  var qs = PKB.qs, qsa = PKB.qsa, esc = PKB.escapeHTML;
  var C = D.club || {};

  var MONTHS = ["januar", "februar", "marec", "april", "maj", "junij", "julij", "avgust", "september", "oktober", "november", "december"];
  var MONTHS_LOC = ["januarju", "februarju", "marcu", "aprilu", "maju", "juniju", "juliju", "avgustu", "septembru", "oktobru", "novembru", "decembru"];
  var MONTHS_SHORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];
  var DAYS = (Array.isArray(D.days) && D.days.length === 7) ? D.days : ["Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota", "Nedelja"];
  var DAYS_SHORT = (Array.isArray(D.daysShort) && D.daysShort.length === 7) ? D.daysShort : ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];
  var LEVEL_ORDER = ["Državno prvenstvo", "Pokal", "Miting", "Interni miting"];
  var LEVEL_TONE = { "Državno prvenstvo": "gold", "Pokal": "violet", "Miting": "blue", "Interni miting": "teal" };
  var TONE_COLOR = { gold: "var(--c-gold)", violet: "var(--c-lilac)", blue: "var(--c-sky)", teal: "var(--c-sage)" };
  var STROKES = ["prosto", "delfin", "hrbtno", "prsno", "mesano"];
  var STORE_SORT = "tekmovanja:sort";
  var STORE_REC = "tekmovanja:rekordi";

  /* ------------------------------------------------------------------
     0. Helpers
     ------------------------------------------------------------------ */
  function isISO(s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  function plural(n, forms) { return PKB.plural(n, forms); }
  function behavior() { return PKB.prefersReducedMotion() ? "auto" : "smooth"; }
  function pageBase() { return window.location.href.split("#")[0].split("?")[0]; }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function pulse(el) {
    if (!el) return;
    el.classList.remove("highlight-pulse");
    void el.offsetWidth;
    el.classList.add("highlight-pulse");
    clearTimeout(el._pulseT);
    el._pulseT = setTimeout(function () { el.classList.remove("highlight-pulse"); }, 2400);
  }
  /** "Now" for the countdown: honours ?danes=YYYY-MM-DD (keeps the real time of day). */
  function now() {
    var n = new Date();
    var o = PKB.params().get("danes");
    if (o && /^\d{4}-\d{2}-\d{2}$/.test(o)) {
      var d = PKB.parseDate(o);
      if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), n.getHours(), n.getMinutes(), n.getSeconds(), n.getMilliseconds());
    }
    return n;
  }

  /* ---------- data (validated) ---------- */
  var COMPS = (Array.isArray(D.competitions) ? D.competitions : [])
    .filter(function (c) { return c && c.id && c.name && isISO(c.date); })
    .slice()
    .sort(function (a, b) { return PKB.parseDate(a.date) - PKB.parseDate(b.date) || String(a.name).localeCompare(String(b.name), "sl"); });
  var COMP_MAP = {};
  COMPS.forEach(function (c) { COMP_MAP[c.id] = c; });
  function endISO(c) { return isISO(c.endDate) && c.endDate > c.date ? c.endDate : c.date; }
  function status(c) {
    if (PKB.daysUntil(endISO(c)) < 0) return "past";
    if (PKB.daysUntil(c.date) <= 0) return "live";
    return "upcoming";
  }
  function upcoming() { return COMPS.filter(function (c) { return status(c) !== "past"; }); }
  function catNames(c) {
    return (Array.isArray(c.categories) ? c.categories : []).map(function (id) {
      var p = PKB.programById(id);
      return p ? p.name : null;
    }).filter(Boolean);
  }
  function catName(id) { var p = PKB.programById(id); return p ? p.name : (id || ""); }

  function strokeIndex(ev) {
    var n = PKB.normalize(ev);
    for (var i = 0; i < STROKES.length; i++) if (n.indexOf(STROKES[i]) > -1) return i;
    return STROKES.length;
  }
  var RESULTS = (Array.isArray(D.results) ? D.results : [])
    .filter(function (r) { return r && r.athlete && r.event && r.competition; })
    .map(function (r, i) {
      var c = COMP_MAP[r.competition] || null;
      var place = Number(r.place);
      return {
        i: i,
        athlete: String(r.athlete),
        gender: r.gender === "Ž" ? "Ž" : (r.gender === "M" ? "M" : ""),
        year: r.year || "",
        category: r.category || "",
        event: String(r.event),
        time: String(r.time || ""),
        secs: PKB.parseSwimTime(r.time),
        place: isFinite(place) && place > 0 ? place : null,
        pb: !!r.pb,
        comp: c,
        compId: String(r.competition),
        compName: c ? c.name : String(r.competition),
        _n: PKB.normalize(r.athlete),
        _dist: parseInt(r.event, 10) || 0,
        _stroke: strokeIndex(r.event)
      };
    });
  function resultsFor(id) { return RESULTS.filter(function (r) { return r.compId === id; }); }

  var RECORDS = (Array.isArray(D.records) ? D.records : [])
    .filter(function (r) { return r && r.event && r.athlete && r.time && (r.gender === "M" || r.gender === "Ž"); })
    .map(function (r) {
      return { event: String(r.event), gender: r.gender, athlete: String(r.athlete), time: String(r.time), year: Number(r.year) || null,
        _dist: parseInt(r.event, 10) || 0, _stroke: strokeIndex(r.event) };
    })
    .sort(function (a, b) { return a._stroke - b._stroke || a._dist - b._dist; });

  /* ---------- season ---------- */
  function seasonRange() {
    var m = /^(\d{4})\s*\/\s*(\d{4})$/.exec(String(C.season || ""));
    var y;
    if (m) y = Number(m[1]);
    else { var t = PKB.today(); y = t.getMonth() >= 8 ? t.getFullYear() : t.getFullYear() - 1; }
    return { start: new Date(y, 8, 1), end: new Date(y + 1, 7, 31), y1: y, y2: y + 1, label: y + "/" + (y + 1) };
  }
  var SEASON = seasonRange();

  /* ---------- formatting ---------- */
  function dateTile(c) {
    var a = PKB.parseDate(c.date), b = PKB.parseDate(endISO(c));
    var range = b > a;
    var sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    var day = range ? a.getDate() + "–" + b.getDate() : String(a.getDate());
    var mon = range && !sameMonth ? MONTHS_SHORT[a.getMonth()] + "–" + MONTHS_SHORT[b.getMonth()] : MONTHS_SHORT[a.getMonth()];
    return { day: day, mon: mon, range: range };
  }
  function weekdaySpan(c) {
    var a = PKB.parseDate(c.date), b = PKB.parseDate(endISO(c));
    var wa = DAYS_SHORT[PKB.isoWeekday(a) - 1].toLowerCase();
    if (b <= a) return DAYS[PKB.isoWeekday(a) - 1].toLowerCase();
    return wa + "–" + DAYS_SHORT[PKB.isoWeekday(b) - 1].toLowerCase();
  }
  function shortRange(c) {
    var a = PKB.parseDate(c.date), b = PKB.parseDate(endISO(c));
    if (b <= a) return a.getDate() + ". " + MONTHS_SHORT[a.getMonth()] + ". " + a.getFullYear();
    if (a.getMonth() === b.getMonth()) return a.getDate() + ".–" + b.getDate() + ". " + MONTHS_SHORT[a.getMonth()] + ". " + b.getFullYear();
    return a.getDate() + ". " + MONTHS_SHORT[a.getMonth()] + ". – " + b.getDate() + ". " + MONTHS_SHORT[b.getMonth()] + ". " + b.getFullYear();
  }
  /** "13." or "8.–9." (or "30. 11.–2. 12." across months) */
  function dayDots(c) {
    var a = PKB.parseDate(c.date), b = PKB.parseDate(endISO(c));
    if (b <= a) return a.getDate() + ".";
    if (a.getMonth() === b.getMonth()) return a.getDate() + ".–" + b.getDate() + ".";
    return a.getDate() + ". " + (a.getMonth() + 1) + ".–" + b.getDate() + ". " + (b.getMonth() + 1) + ".";
  }
  function levelBadge(level) {
    var tone = LEVEL_TONE[level];
    return '<span class="badge ' + (tone ? "badge--" + tone : "badge-dot") + '">' + esc(level || "Tekma") + "</span>";
  }
  function statusBadge(c) {
    var s = status(c);
    if (s === "live") return '<span class="badge badge--success badge-live comp-status">V teku</span>';
    if (s === "past") return '<span class="badge comp-status comp-status--past">Zaključeno</span>';
    return '<span class="badge comp-status">Prihaja</span>';
  }
  function relText(c) {
    var s = status(c);
    if (s === "live") {
      var day = -PKB.daysUntil(c.date) + 1;
      var total = Math.round((PKB.parseDate(endISO(c)) - PKB.parseDate(c.date)) / 86400000) + 1;
      return total > 1 ? day + ". dan od " + total : "danes";
    }
    if (s === "past") return PKB.relativeDay(endISO(c));
    return PKB.relativeDay(c.date);
  }
  function compEvent(c) {
    var cats = catNames(c);
    var desc = [c.level, c.course ? "bazen " + c.course : "", cats.length ? "Nastopajo: " + cats.join(", ") : ""].filter(Boolean).join(" · ");
    return {
      title: c.name + (c.host ? " (domači miting)" : ""),
      start: PKB.parseDate(c.date),
      end: PKB.parseDate(endISO(c)),
      allDay: true,
      location: [c.venue, c.city].filter(Boolean).join(", "),
      description: desc + "\nPK Branik Maribor: " + pageBase() + "#" + c.id
    };
  }
  function addToCalendar(c) {
    if (!c) return;
    PKB.downloadICS([compEvent(c)], "pk-branik-" + PKB.slugify(c.id) + ".ics");
  }

  /* ------------------------------------------------------------------
     1. Hero: next competition countdown + season stats
     ------------------------------------------------------------------ */
  var hero = {
    body: qs("[data-next-body]"),
    badges: qs("[data-next-badges]"),
    label: qs("[data-next-label]"),
    comp: null,
    timer: 0,
    last: ""
  };

  function renderHero() {
    if (!hero.body) return;
    clearInterval(hero.timer);
    var list = upcoming();
    var c = hero.comp = list[0] || null;
    if (!c) {
      if (hero.label) hero.label.textContent = "Naslednja tekma";
      if (hero.badges) hero.badges.innerHTML = "";
      var last = COMPS.filter(function (x) { return status(x) === "past" && resultsFor(x.id).length; }).pop();
      var lastBlock = "";
      if (last) {
        var lr = resultsFor(last.id);
        var md = function (p) { return lr.filter(function (r) { return r.place === p; }).length; };
        lastBlock =
          '<p class="comp-next__cats"><span class="comp-next__cats-label">Zadnja tekma</span>' +
            '<a class="comp-next__last" href="#' + esc(last.id) + '" data-comp-link="' + esc(last.id) + '">' + esc(last.name) + "</a> · " + esc(PKB.formatDateRange(last.date, last.endDate)) + "</p>" +
          '<div class="comp-count">' +
            [["zlate", md(1)], ["srebrne", md(2)], ["bronaste", md(3)]].map(function (u) {
              return '<div class="comp-count__unit"><span class="comp-count__num">' + u[1] + '</span><span class="comp-count__lbl">' + u[0] + "</span></div>";
            }).join("") +
          "</div>" +
          '<div class="comp-next__foot"><button type="button" class="btn btn--sm" data-show-results="' + esc(last.id) + '">' + PKB.icon("medal") + "Zadnji rezultati</button></div>";
      }
      hero.body.innerHTML =
        '<div class="comp-next__empty">' +
          '<p class="comp-next__empty-title">Nove tekme bodo objavljene kmalu</p>' +
          '<p class="small muted">Koledar tekem bomo objavili, ko bodo termini potrjeni.</p>' +
        "</div>" + lastBlock;
      return;
    }
    var s = status(c);
    var home = !c.host ? list.filter(function (x) { return x.host; })[0] : null;
    if (hero.label) hero.label.textContent = s === "live" ? "Tekma poteka" : "Naslednja tekma";
    if (hero.badges) hero.badges.innerHTML = levelBadge(c.level) + (c.host ? '<span class="badge badge--solid">Domači miting</span>' : "");
    var cats = catNames(c);
    var head =
      '<h3 class="comp-next__name"><a href="#' + esc(c.id) + '" data-comp-link="' + esc(c.id) + '">' + esc(c.name) + "</a></h3>" +
      '<p class="comp-next__meta">' +
        "<span>" + PKB.icon("calendar", "icon--sm") + esc(PKB.formatDateRange(c.date, c.endDate)) + "</span>" +
        "<span>" + PKB.icon("map-pin", "icon--sm") + esc([c.city, c.venue].filter(Boolean).join(" · ")) + "</span>" +
        (c.course ? "<span>" + PKB.icon("waves", "icon--sm") + esc(c.course) + " bazen</span>" : "") +
      "</p>";
    var mid;
    if (s === "live") {
      mid = '<div class="comp-next__live"><span class="badge badge--success badge-live">V teku · ' + esc(relText(c)) + "</span>" +
        '<p class="small muted">Tekma poteka zdaj. Rezultate objavimo po zaključku tekmovanja.</p></div>';
    } else {
      mid =
        '<div class="comp-count" role="timer" aria-labelledby="comp-count-sr">' +
          ["d", "h", "m"].map(function (k) {
            return '<div class="comp-count__unit" aria-hidden="true"><span class="comp-count__num" data-cd="' + k + '">–</span><span class="comp-count__lbl" data-cdl="' + k + '"></span></div>';
          }).join("") +
          '<span class="visually-hidden" id="comp-count-sr" data-cd-sr></span>' +
        "</div>";
    }
    hero.body.innerHTML = head + mid +
      (cats.length ? '<p class="comp-next__cats"><span class="comp-next__cats-label">Nastopajo</span>' + esc(cats.join(" · ")) + "</p>" : "") +
      '<div class="comp-next__foot">' +
        (s === "live"
          ? '<a class="btn btn--sm" href="?tekma=' + encodeURIComponent(c.id) + '#rezultati" data-show-results="' + esc(c.id) + '">' + PKB.icon("medal") + "Rezultati</a>"
          : '<button type="button" class="btn btn--sm" data-ics="' + esc(c.id) + '">' + PKB.icon("calendar-plus") + "Dodaj v koledar</button>") +
        '<a class="btn btn--sm btn--ghost" href="#' + esc(c.id) + '" data-comp-link="' + esc(c.id) + '">Podrobnosti' + PKB.icon("arrow-right", "icon--move") + "</a>" +
      "</div>" +
      (home ? '<p class="comp-next__home">' + PKB.icon("home", "icon--sm") + '<span>Naslednji domači miting: <a href="#' + esc(home.id) + '" data-comp-link="' + esc(home.id) + '">' + esc(home.name) + "</a> · " + esc(PKB.formatDateRange(home.date, home.endDate)) + "</span></p>" : "");
    hero.last = "";
    if (s !== "live") {
      tick();
      hero.timer = setInterval(tick, 1000);
    }
  }

  function tick() {
    var c = hero.comp;
    if (!c) return;
    var target = PKB.parseDate(c.date);
    var diff = target - now();
    if (diff <= 0) {
      clearInterval(hero.timer);
      if (status(c) !== "upcoming") { renderHero(); renderCalendarAll(); }
      return;
    }
    var mins = Math.floor(diff / 60000);
    var d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
    var key = d + ":" + h + ":" + m;
    if (key === hero.last) return;
    hero.last = key;
    var set = function (k, v, forms) {
      var n = qs('[data-cd="' + k + '"]', hero.body), l = qs('[data-cdl="' + k + '"]', hero.body);
      if (n) n.textContent = String(v);
      if (l) l.textContent = plural(v, forms);
    };
    set("d", d, ["dan", "dneva", "dnevi", "dni"]);
    set("h", h, ["ura", "uri", "ure", "ur"]);
    set("m", m, ["minuta", "minuti", "minute", "minut"]);
    var sr = qs("[data-cd-sr]", hero.body);
    if (sr) sr.textContent = "Do začetka tekme: " + d + " " + plural(d, ["dan", "dneva", "dnevi", "dni"]) + ", " + h + " " + plural(h, ["ura", "uri", "ure", "ur"]) + " in " + m + " " + plural(m, ["minuta", "minuti", "minute", "minut"]) + ".";
  }

  function renderStats() {
    var inSeason = COMPS.filter(function (c) { var d = PKB.parseDate(c.date); return d >= SEASON.start && d <= SEASON.end; });
    var hosts = inSeason.filter(function (c) { return c.host; }).length;
    var res = RESULTS.filter(function (r) { return r.comp && inSeason.indexOf(r.comp) > -1; });
    var medals = res.filter(function (r) { return r.place && r.place <= 3; }).length;
    var pbs = res.filter(function (r) { return r.pb; }).length;
    var set = function (key, n, forms) {
      var v = qs('[data-stat="' + key + '"]'), l = qs('[data-stat-label="' + key + '"]');
      if (v) {
        v.setAttribute("data-count-to", String(n));
        if (v.dataset.counted) v.textContent = PKB.formatNumber(n);
      }
      if (l) l.textContent = plural(n, forms);
    };
    set("comps", inSeason.length, ["tekma v sezoni", "tekmi v sezoni", "tekme v sezoni", "tekem v sezoni"]);
    set("host", hosts, ["domači miting na Pristanu", "domača mitinga na Pristanu", "domači mitingi na Pristanu", "domačih mitingov na Pristanu"]);
    set("medals", medals, ["medalja v sezoni", "medalji v sezoni", "medalje v sezoni", "medalj v sezoni"]);
    set("pb", pbs, ["osebni rekord", "osebna rekorda", "osebni rekordi", "osebnih rekordov"]);
    var eb = qs("[data-season-eyebrow]");
    if (eb) eb.textContent = "Tekmovanja · sezona " + SEASON.label;
  }

  /* ------------------------------------------------------------------
     2. Competition calendar (list grouped by month + filters)
     ------------------------------------------------------------------ */
  var cal = { when: "upcoming", level: "", host: false };
  var listEl = qs("[data-list]");
  var whenGroup = qs("[data-when-group]");
  var levelsEl = qs("[data-levels]");
  var calCount = qs("[data-cal-count]");

  function matchesWhen(c, when) {
    var s = status(c);
    if (when === "upcoming") return s !== "past";
    if (when === "past") return s === "past";
    return true;
  }
  function matches(c, f) {
    f = f || cal;
    return matchesWhen(c, f.when) && (!f.level || c.level === f.level) && (!f.host || !!c.host);
  }
  function filteredComps() {
    var list = COMPS.filter(function (c) { return matches(c); });
    if (cal.when === "past") list = list.slice().reverse();
    return list;
  }
  function levels() {
    var seen = [];
    COMPS.forEach(function (c) { if (c.level && seen.indexOf(c.level) === -1) seen.push(c.level); });
    return seen.sort(function (a, b) {
      var ia = LEVEL_ORDER.indexOf(a), ib = LEVEL_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, "sl");
    });
  }

  function renderToolbar() {
    if (whenGroup) {
      qsa("[data-when]", whenGroup).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-when") === cal.when)); });
      ["upcoming", "past", "all"].forEach(function (w) {
        var el = qs('[data-when-n="' + w + '"]', whenGroup);
        if (el) el.textContent = String(COMPS.filter(function (c) { return matchesWhen(c, w); }).length);
      });
    }
    if (!levelsEl) return;
    var base = function (lvl, host) { return COMPS.filter(function (c) { return matches(c, { when: cal.when, level: lvl, host: host }); }).length; };
    var html = '<button type="button" class="chip comp-chip" data-level="" aria-pressed="' + (!cal.level) + '">Vse ravni <span class="count">' + base("", cal.host) + "</span></button>";
    html += levels().map(function (l) {
      var n = base(l, cal.host);
      var tone = LEVEL_TONE[l];
      return '<button type="button" class="chip comp-chip' + (n ? "" : " is-empty") + '" data-level="' + esc(l) + '" aria-pressed="' + (cal.level === l) + '">' +
        '<span class="dot" style="--dot:' + (tone ? TONE_COLOR[tone] : "currentColor") + '"></span>' + esc(l) + ' <span class="count">' + n + "</span></button>";
    }).join("");
    var hn = base(cal.level, true);
    html += '<span class="comp-levels__sep" aria-hidden="true"></span>' +
      '<button type="button" class="chip comp-chip comp-chip--host' + (hn ? "" : " is-empty") + '" data-host-toggle aria-pressed="' + cal.host + '">' + PKB.icon("home", "icon--sm") + 'Domači mitingi <span class="count">' + hn + "</span></button>";
    levelsEl.innerHTML = html;
  }

  function countPhrase(n, total) {
    var verb = plural(n, ["Prikazana", "Prikazani", "Prikazane", "Prikazanih"]);
    var noun = plural(n, ["tekma", "tekmi", "tekme", "tekem"]);
    return verb + " " + n + " " + noun + (total != null && total !== n ? " od " + total : "");
  }

  function rowHTML(c, nextId) {
    var s = status(c);
    var t = dateTile(c);
    var cats = catNames(c);
    var resN = resultsFor(c.id).length;
    var dateCls = "comp-date" + (c.id === nextId ? " is-next" : "") + (s === "live" ? " is-live" : "") + (s === "past" ? " is-past" : "");
    var actions;
    if (s === "past") {
      actions = resN
        ? '<button type="button" class="btn btn--sm" data-show-results="' + esc(c.id) + '">' + PKB.icon("medal") + 'Rezultati <span class="comp-btn-n">' + resN + '</span><span class="visually-hidden"> ' + plural(resN, ["rezultat", "rezultata", "rezultati", "rezultatov"]) + " – " + esc(c.name) + "</span></button>"
        : '<span class="comp-row__nores small soft">Rezultati še niso objavljeni</span>';
    } else {
      actions = '<button type="button" class="btn btn--sm" data-ics="' + esc(c.id) + '">' + PKB.icon("calendar-plus") + 'Dodaj v koledar<span class="visually-hidden"> – ' + esc(c.name) + "</span></button>";
    }
    actions += '<button type="button" class="btn btn--sm btn--icon comp-row__link" data-copy-link="' + esc(c.id) + '" aria-label="Kopiraj povezavo do tekme ' + esc(c.name) + '" data-tooltip="Kopiraj povezavo">' + PKB.icon("link") + "</button>";
    return '<li class="comp-month__item">' +
      '<article class="comp-row glass" id="' + esc(c.id) + '" tabindex="-1" data-status="' + s + '" aria-labelledby="' + esc(c.id) + '-name">' +
        '<div class="' + dateCls + '" aria-hidden="true"><span class="comp-date__day' + (t.range ? " is-range" : "") + '">' + esc(t.day) + '</span><span class="comp-date__mon">' + esc(t.mon) + "</span></div>" +
        '<div class="comp-row__main">' +
          '<div class="comp-row__badges">' + levelBadge(c.level) + (c.host ? '<span class="badge badge--solid">Domači miting</span>' : "") + statusBadge(c) + "</div>" +
          '<h4 class="comp-row__name" id="' + esc(c.id) + '-name">' + esc(c.name) + "</h4>" +
          '<p class="comp-row__meta">' +
            "<span>" + PKB.icon("calendar", "icon--sm") + '<span>' + esc(PKB.formatDateRange(c.date, c.endDate)) + '<span class="comp-row__wd">, ' + esc(weekdaySpan(c)) + "</span></span></span>" +
            "<span>" + PKB.icon("map-pin", "icon--sm") + esc([c.city, c.venue].filter(Boolean).join(" · ")) + "</span>" +
            (c.course ? "<span>" + PKB.icon("waves", "icon--sm") + esc(c.course) + " bazen</span>" : "") +
          "</p>" +
          (cats.length ? '<p class="comp-row__cats"><span class="visually-hidden">Nastopajo: </span>' + cats.map(function (n) { return "<span>" + esc(n) + "</span>"; }).join("") + "</p>" : "") +
        "</div>" +
        '<div class="comp-row__side">' +
          '<span class="comp-row__rel">' + (s === "live" ? PKB.icon("activity", "icon--sm") : PKB.icon("clock", "icon--sm")) + esc(relText(c)) + "</span>" +
          '<div class="comp-row__actions">' + actions + "</div>" +
        "</div>" +
      "</article></li>";
  }

  function renderList(animate) {
    if (!listEl) return;
    var items = filteredComps();
    var totalInWhen = COMPS.filter(function (c) { return matchesWhen(c, cal.when); }).length;
    if (calCount) calCount.textContent = countPhrase(items.length, (cal.level || cal.host) ? totalInWhen : null);
    if (!items.length) {
      var onlyWhen = !cal.level && !cal.host;
      listEl.innerHTML =
        '<div class="glass empty-state comp-list__empty">' +
          '<span class="icon-bubble">' + PKB.icon("calendar") + "</span>" +
          '<p class="comp-empty__title">' + (onlyWhen && cal.when === "upcoming" ? "Trenutno ni napovedanih tekem" : "Ni tekem za izbrane filtre") + "</p>" +
          '<p class="small muted">' + (onlyWhen && cal.when === "upcoming" ? "Nove tekme bodo objavljene kmalu. Medtem si oglejte pretekle tekme in rezultate." : "Izberite drugo raven tekmovanja ali prikažite vse tekme.") + "</p>" +
          '<button type="button" class="btn btn--sm" data-cal-reset>' + PKB.icon("refresh") + "Pokaži vse tekme</button>" +
        "</div>";
    } else {
      var nextComp = upcoming()[0];
      var nextId = nextComp ? nextComp.id : "";
      var today = PKB.today();
      var groups = [];
      items.forEach(function (c) {
        var d = PKB.parseDate(c.date);
        var key = d.getFullYear() + "-" + d.getMonth();
        var g = groups[groups.length - 1];
        if (!g || g.key !== key) { g = { key: key, y: d.getFullYear(), m: d.getMonth(), items: [] }; groups.push(g); }
        g.items.push(c);
      });
      listEl.innerHTML = groups.map(function (g) {
        var isNow = g.y === today.getFullYear() && g.m === today.getMonth();
        var hid = "comp-m-" + g.y + "-" + (g.m + 1);
        return '<section class="comp-month" aria-labelledby="' + hid + '">' +
          '<div class="comp-month__head">' +
            '<h3 class="comp-month__title" id="' + hid + '">' + esc(cap(MONTHS[g.m])) + ' <span class="gradient-text">' + g.y + "</span></h3>" +
            (isNow ? '<span class="badge badge-dot comp-month__now">Ta mesec</span>' : "") +
            '<span class="comp-month__n">' + g.items.length + " " + plural(g.items.length, ["tekma", "tekmi", "tekme", "tekem"]) + "</span>" +
          "</div>" +
          '<ol class="comp-month__list" role="list">' + g.items.map(function (c) { return rowHTML(c, nextId); }).join("") + "</ol>" +
        "</section>";
      }).join("");
    }
    if (animate && !PKB.prefersReducedMotion()) {
      listEl.classList.remove("is-entering");
      void listEl.offsetWidth;
      listEl.classList.add("is-entering");
    }
  }

  function setCal(patch, animate) {
    Object.keys(patch).forEach(function (k) { cal[k] = patch[k]; });
    renderToolbar();
    renderList(animate !== false);
  }

  function initCalendarList() {
    if (whenGroup) {
      whenGroup.addEventListener("click", function (e) {
        var b = e.target.closest("[data-when]");
        if (!b || b.getAttribute("data-when") === cal.when) return;
        setCal({ when: b.getAttribute("data-when") });
      });
    }
    if (levelsEl) {
      levelsEl.addEventListener("click", function (e) {
        var hb = e.target.closest("[data-host-toggle]");
        if (hb) { setCal({ host: !cal.host }); focusChip("[data-host-toggle]"); return; }
        var b = e.target.closest("[data-level]");
        if (!b) return;
        var lvl = b.getAttribute("data-level");
        setCal({ level: cal.level === lvl ? "" : lvl });
        focusChip('[data-level="' + (window.CSS && CSS.escape ? CSS.escape(lvl) : lvl) + '"]');
      });
    }
    var exportAll = qs("[data-export-all]");
    if (exportAll) {
      exportAll.addEventListener("click", function () {
        var list = upcoming();
        if (!list.length) { PKB.toast({ type: "info", title: "Ni prihajajočih tekem", message: "Ko bodo objavljene nove tekme, jih boste lahko dodali v koledar." }); return; }
        PKB.downloadICS(list.map(compEvent), "pk-branik-tekme-" + SEASON.label.replace("/", "-") + ".ics");
      });
    }
    renderToolbar();
    renderList(false);
  }
  /* chips are re-rendered on every change: keep keyboard focus on the chip that was pressed */
  function focusChip(sel) {
    if (!levelsEl) return;
    var b = qs(sel, levelsEl);
    if (b) b.focus({ preventScroll: true });
  }

  /** Make sure a competition is listed (relax filters if needed), then scroll to it and pulse. */
  function goToComp(id, opts) {
    opts = opts || {};
    var c = COMP_MAP[id];
    if (!c) return false;
    if (!matches(c)) {
      var patch = {};
      if (!matchesWhen(c, cal.when)) patch.when = "all";
      if (cal.level && c.level !== cal.level) patch.level = "";
      if (cal.host && !c.host) patch.host = false;
      setCal(patch, false);
    }
    var row = doc.getElementById(id);
    if (!row) return false;
    showMonth(PKB.parseDate(c.date), null);
    var go = function () { row.scrollIntoView({ behavior: opts.instant ? "instant" : behavior(), block: "center" }); };
    go();
    if (opts.focus) row.focus({ preventScroll: true });
    pulse(row);
    return true;
  }

  /* row + hero actions (delegated) */
  doc.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest) return;
    var ics = t.closest("[data-ics]");
    if (ics) { addToCalendar(COMP_MAP[ics.getAttribute("data-ics")]); return; }
    var sr = t.closest("[data-show-results]");
    if (sr) { e.preventDefault(); showResultsFor(sr.getAttribute("data-show-results")); return; }
    var cp = t.closest("[data-copy-link]");
    if (cp) { PKB.copy(pageBase() + "#" + cp.getAttribute("data-copy-link"), "Povezava do tekme je kopirana v odložišče."); return; }
    if (t.closest("[data-cal-reset]")) { setCal({ when: "all", level: "", host: false }); return; }
    var ath = t.closest("[data-athlete]");
    if (ath) { showAthlete(ath.getAttribute("data-athlete")); return; }
  });

  /* ------------------------------------------------------------------
     3. Mini month calendar (keyboard-operable grid)
     ------------------------------------------------------------------ */
  var mini = {
    root: qs("[data-cal]"),
    body: qs("[data-cal-body]"),
    month: qs("[data-cal-month]"),
    prev: qs("[data-cal-prev]"),
    next: qs("[data-cal-next]"),
    todayBtn: qs("[data-cal-today]"),
    list: qs("[data-cal-list]"),
    sub: qs("[data-cal-sub]"),
    y: 0, m: 0,
    focus: null,        // Date with the roving tabindex
    dayMap: {},
    min: null, max: null
  };

  function buildDayMap() {
    mini.dayMap = {};
    COMPS.forEach(function (c) {
      var d = PKB.parseDate(c.date), e = PKB.parseDate(endISO(c)), guard = 0;
      while (d <= e && guard++ < 60) {
        var k = PKB.toISODate(d);
        (mini.dayMap[k] = mini.dayMap[k] || []).push(c);
        d = addDays(d, 1);
      }
    });
    var today = PKB.today();
    var first = COMPS.length ? PKB.parseDate(COMPS[0].date) : today;
    var last = COMPS.length ? PKB.parseDate(endISO(COMPS[COMPS.length - 1])) : today;
    var lo = first < today ? first : today, hi = last > today ? last : today;
    mini.min = new Date(lo.getFullYear(), lo.getMonth() - 1, 1);
    mini.max = new Date(hi.getFullYear(), hi.getMonth() + 1, 1);
  }
  function monthIndex(y, m) { return y * 12 + m; }
  function clampMonth(d) {
    var i = monthIndex(d.getFullYear(), d.getMonth());
    if (i < monthIndex(mini.min.getFullYear(), mini.min.getMonth())) return new Date(mini.min);
    if (i > monthIndex(mini.max.getFullYear(), mini.max.getMonth())) return new Date(mini.max.getFullYear(), mini.max.getMonth(), 1);
    return d;
  }

  /** Show the month containing `date`; focusDate (optional) receives keyboard focus. */
  function showMonth(date, focusDate) {
    if (!mini.body) return;
    var d = clampMonth(date);
    var changed = d.getFullYear() !== mini.y || d.getMonth() !== mini.m;
    mini.y = d.getFullYear();
    mini.m = d.getMonth();
    if (focusDate && focusDate.getFullYear() === mini.y && focusDate.getMonth() === mini.m) mini.focus = focusDate;
    else if (!mini.focus || mini.focus.getFullYear() !== mini.y || mini.focus.getMonth() !== mini.m) mini.focus = defaultFocus();
    renderMini();
    if (focusDate) {
      var btn = qs('[data-day="' + PKB.toISODate(mini.focus) + '"]', mini.body);
      if (btn) btn.focus();
    }
    return changed;
  }
  function defaultFocus() {
    var today = PKB.today();
    if (today.getFullYear() === mini.y && today.getMonth() === mini.m) return today;
    var dim = new Date(mini.y, mini.m + 1, 0).getDate();
    for (var i = 1; i <= dim; i++) {
      if (mini.dayMap[PKB.toISODate(new Date(mini.y, mini.m, i))]) return new Date(mini.y, mini.m, i);
    }
    return new Date(mini.y, mini.m, 1);
  }

  function renderMini() {
    var today = PKB.today();
    var first = new Date(mini.y, mini.m, 1);
    var dim = new Date(mini.y, mini.m + 1, 0).getDate();
    var lead = PKB.isoWeekday(first) - 1;
    var label = cap(MONTHS[mini.m]) + " " + mini.y;
    if (mini.month) mini.month.textContent = label;
    var focusISO = mini.focus ? PKB.toISODate(mini.focus) : "";
    var cells = [];
    for (var i = 0; i < lead; i++) cells.push('<td class="comp-mcell is-blank"></td>');
    for (var day = 1; day <= dim; day++) {
      var date = new Date(mini.y, mini.m, day);
      var iso = PKB.toISODate(date);
      var comps = mini.dayMap[iso] || [];
      var isToday = sameDay(date, today);
      var cellCls = "comp-mcell";
      if (comps.length) {
        var multi = comps.some(function (c) { return endISO(c) !== c.date; });
        if (multi) {
          var starts = comps.some(function (c) { return c.date === iso; }), ends = comps.some(function (c) { return endISO(c) === iso && c.date !== iso; });
          cellCls += " is-range" + (starts ? " is-range-start" : "") + (ends ? " is-range-end" : "") +
            (comps.every(function (c) { return status(c) === "past"; }) ? " is-done" : "");
        }
      }
      var btnCls = "comp-mday" + (comps.length ? " is-comp" : "") + (isToday ? " is-today" : "") + (date < today ? " is-before" : "") +
        (comps.length && comps.every(function (c) { return status(c) === "past"; }) ? " is-done" : "");
      var aria = day + ". " + MONTHS[mini.m] + " " + mini.y + (isToday ? ", danes" : "") +
        (comps.length ? " – " + comps.map(function (c) { return c.name; }).join(", ") : "");
      cells.push('<td class="' + cellCls + '"><button type="button" class="' + btnCls + '" data-day="' + iso + '" tabindex="' + (iso === focusISO ? "0" : "-1") + '"' +
        (isToday ? ' aria-current="date"' : "") + (comps.length ? "" : ' aria-disabled="true"') + ' aria-label="' + esc(aria) + '">' +
        '<span class="comp-mday__n">' + day + "</span>" + (comps.length ? '<span class="comp-mday__dot" aria-hidden="true"></span>' : "") + "</button></td>");
    }
    while (cells.length % 7) cells.push('<td class="comp-mcell is-blank"></td>');
    var rows = [];
    for (var r = 0; r < cells.length; r += 7) rows.push("<tr>" + cells.slice(r, r + 7).join("") + "</tr>");
    mini.body.innerHTML = rows.join("");

    var idx = monthIndex(mini.y, mini.m);
    if (mini.prev) mini.prev.disabled = idx <= monthIndex(mini.min.getFullYear(), mini.min.getMonth());
    if (mini.next) mini.next.disabled = idx >= monthIndex(mini.max.getFullYear(), mini.max.getMonth());
    if (mini.todayBtn) mini.todayBtn.disabled = mini.y === today.getFullYear() && mini.m === today.getMonth();
    renderMonthList();
    syncAsideSticky();
  }

  /* The calendar aside sticks beside the list only while all of it fits below the fixed header
     (on a 1440×900 screen it is taller than the space, and its foot would never be reachable). */
  var calAside = qs(".comp-cal-aside");
  function syncAsideSticky() {
    if (!calAside) return;
    var headerH = parseFloat(getComputedStyle(doc.documentElement).getPropertyValue("--header-h")) || 76;
    calAside.classList.toggle("is-sticky", calAside.offsetHeight + headerH + 32 <= window.innerHeight);
  }
  var stickyRaf = 0;
  window.addEventListener("resize", function () {
    if (stickyRaf) return;
    stickyRaf = requestAnimationFrame(function () { stickyRaf = 0; syncAsideSticky(); });
  });

  function renderMonthList() {
    if (!mini.list) return;
    var start = new Date(mini.y, mini.m, 1), end = new Date(mini.y, mini.m + 1, 0);
    var inMonth = COMPS.filter(function (c) { return PKB.parseDate(c.date) <= end && PKB.parseDate(endISO(c)) >= start; });
    if (mini.sub) mini.sub.textContent = "Tekme v " + MONTHS_LOC[mini.m] + " " + mini.y;
    if (!inMonth.length) {
      var after = COMPS.filter(function (c) { return PKB.parseDate(c.date) > end; })[0];
      mini.list.innerHTML = '<li class="comp-mlist__empty small muted">Ta mesec ni tekem.' +
        (after ? ' Naslednja: <a href="#' + esc(after.id) + '" data-comp-link="' + esc(after.id) + '">' + esc(after.name) + "</a> (" + esc(shortRange(after)) + ")." : "") + "</li>";
      return;
    }
    mini.list.innerHTML = inMonth.map(function (c) {
      var t = dateTile(c);
      var s = status(c);
      return '<li><a class="comp-mlist__item" href="#' + esc(c.id) + '" data-comp-link="' + esc(c.id) + '">' +
        '<span class="comp-mlist__date">' + esc(dayDots(c)) + "</span>" +
        '<span class="comp-mlist__text"><span class="comp-mlist__name">' + esc(c.name) + '</span><span class="comp-mlist__meta">' + esc(c.city || "") + " · " + esc(c.level || "") + "</span></span>" +
        '<span class="comp-mlist__st comp-mlist__st--' + s + '">' + (s === "past" ? "zaključeno" : s === "live" ? "v teku" : esc(PKB.relativeDay(c.date))) + "</span>" +
      "</a></li>";
    }).join("");
  }

  function renderCalendarAll() {
    renderToolbar();
    renderList(false);
    if (mini.body) renderMini();
  }

  function moveFocus(days, months) {
    var f = mini.focus || defaultFocus();
    var nd;
    if (months) {
      var dim = new Date(f.getFullYear(), f.getMonth() + months + 1, 0).getDate();
      nd = new Date(f.getFullYear(), f.getMonth() + months, Math.min(f.getDate(), dim));
    } else nd = addDays(f, days);
    var clamped = clampMonth(new Date(nd.getFullYear(), nd.getMonth(), 1));
    if (clamped.getFullYear() !== nd.getFullYear() || clamped.getMonth() !== nd.getMonth()) return; // out of range
    mini.focus = nd;
    showMonth(nd, nd);
  }

  function activateDay(iso) {
    var comps = mini.dayMap[iso] || [];
    if (!comps.length) return;
    var c = comps[0];
    mini.focus = PKB.parseDate(iso);
    if (history.replaceState) { try { history.replaceState(history.state, "", "#" + c.id); } catch (e) { /* ignore */ } }
    goToComp(c.id, { focus: true });
  }

  function initMini() {
    if (!mini.body) return;
    buildDayMap();
    var today = PKB.today();
    mini.y = -1;
    showMonth(today, null);
    if (mini.prev) mini.prev.addEventListener("click", function () { showMonth(new Date(mini.y, mini.m - 1, 1), null); });
    if (mini.next) mini.next.addEventListener("click", function () { showMonth(new Date(mini.y, mini.m + 1, 1), null); });
    if (mini.todayBtn) mini.todayBtn.addEventListener("click", function () { mini.focus = PKB.today(); showMonth(PKB.today(), null); });
    mini.body.addEventListener("click", function (e) {
      var b = e.target.closest("[data-day]");
      if (!b) return;
      mini.focus = PKB.parseDate(b.getAttribute("data-day"));
      qsa("[data-day]", mini.body).forEach(function (x) { x.setAttribute("tabindex", x === b ? "0" : "-1"); });
      activateDay(b.getAttribute("data-day"));
    });
    mini.body.addEventListener("keydown", function (e) {
      var b = e.target.closest("[data-day]");
      if (!b) return;
      var f = PKB.parseDate(b.getAttribute("data-day"));
      mini.focus = f;
      var wd = PKB.isoWeekday(f);
      switch (e.key) {
        case "ArrowLeft": moveFocus(-1); break;
        case "ArrowRight": moveFocus(1); break;
        case "ArrowUp": moveFocus(-7); break;
        case "ArrowDown": moveFocus(7); break;
        case "Home": moveFocus(1 - wd); break;
        case "End": moveFocus(7 - wd); break;
        case "PageUp": moveFocus(0, -1); break;
        case "PageDown": moveFocus(0, 1); break;
        case "Enter": case " ": activateDay(b.getAttribute("data-day")); break;
        default: return;
      }
      e.preventDefault();
    });
  }

  /* host meet photo card */
  function renderHostCard() {
    var card = qs("[data-host-card]");
    if (!card) return;
    var h = upcoming().filter(function (c) { return c.host; })[0];
    var name = qs("[data-host-name]", card), meta = qs("[data-host-meta]", card);
    if (!h) {
      card.setAttribute("href", "#koledar");
      if (name) name.textContent = "Domači mitingi na Pristanu";
      if (meta) meta.textContent = "Nove termine objavimo v koledarju.";
      return;
    }
    card.setAttribute("href", "#" + h.id);
    card.setAttribute("data-comp-link", h.id);
    if (name) name.textContent = h.name;
    if (meta) meta.textContent = PKB.formatDateRange(h.date, h.endDate) + " · " + (h.venue || "Kopališče Pristan") + " · " + PKB.relativeDay(h.date);
  }

  /* ------------------------------------------------------------------
     4. Results (filters, sorting, summary, CSV)
     ------------------------------------------------------------------ */
  var R = {
    root: qs("[data-results]"),
    form: qs("[data-res-filters]"),
    comp: qs("[data-res-comp]"),
    cat: qs("[data-res-cat]"),
    gender: qs("[data-res-gender]"),
    q: qs("[data-res-q]"),
    body: qs("[data-res-body]"),
    wrap: qs("[data-res-wrap]"),
    empty: qs("[data-res-empty]"),
    count: qs("[data-res-count]"),
    caption: qs("[data-res-caption]"),
    clear: qs("[data-res-clear]"),
    csv: qs("[data-csv]"),
    sortSel: qs("[data-res-sort]"),
    strip: qs("[data-sum-strip]"),
    rows: []
  };
  var res = { comp: "", cat: "", gender: "", q: "", sort: { col: "competition", dir: "desc" } };
  var SORT_DEFAULT_DIR = { athlete: "asc", event: "asc", time: "asc", place: "asc", competition: "desc" };
  /* natural wording for the current order ("razvrščeno od najnovejše tekme") */
  var SORT_PHRASE = {
    "competition:desc": "od najnovejše tekme", "competition:asc": "od najstarejše tekme",
    "time:asc": "od najhitrejšega časa", "time:desc": "od najpočasnejšega časa",
    "place:asc": "od najboljše uvrstitve", "place:desc": "od najslabše uvrstitve",
    "athlete:asc": "po abecedi (A–Ž)", "athlete:desc": "po abecedi (Ž–A)",
    "event:asc": "po disciplini", "event:desc": "po disciplini, obratno"
  };
  function sortPhrase() { return SORT_PHRASE[res.sort.col + ":" + res.sort.dir] || "po tekmi"; }
  var SORT_OPTIONS = [
    ["competition:desc", "Najnovejše tekme"], ["competition:asc", "Najstarejše tekme"],
    ["time:asc", "Najhitrejši čas"], ["place:asc", "Najboljša uvrstitev"],
    ["athlete:asc", "Plavalec A–Ž"], ["event:asc", "Disciplina"]
  ];
  var sumAnimated = false;

  function cmpNum(a, b) {
    if (a === b) return 0;
    if (!isFinite(a)) return 1;
    if (!isFinite(b)) return -1;
    return a - b;
  }
  function compTime(r) { return r.comp ? PKB.parseDate(r.comp.date).getTime() : 0; }
  var SORTERS = {
    athlete: function (a, b) { return a.athlete.localeCompare(b.athlete, "sl"); },
    event: function (a, b) { return a._stroke - b._stroke || a._dist - b._dist || a.event.localeCompare(b.event, "sl"); },
    time: function (a, b) { return cmpNum(a.secs, b.secs); },
    place: function (a, b) { return cmpNum(a.place || Infinity, b.place || Infinity); },
    competition: function (a, b) { return compTime(a) - compTime(b) || a.compName.localeCompare(b.compName, "sl"); }
  };
  function tiebreak(a, b) {
    return cmpNum(a.place || Infinity, b.place || Infinity) || a._stroke - b._stroke || a._dist - b._dist || cmpNum(a.secs, b.secs) || a.athlete.localeCompare(b.athlete, "sl") || a.i - b.i;
  }
  function sortRows(rows) {
    var f = SORTERS[res.sort.col] || SORTERS.competition;
    var dir = res.sort.dir === "desc" ? -1 : 1;
    return rows.slice().sort(function (a, b) { return dir * f(a, b) || tiebreak(a, b); });
  }
  function terms() { return PKB.normalize(res.q.trim()).split(/\s+/).filter(Boolean); }
  function filterRows() {
    var t = terms();
    return RESULTS.filter(function (r) {
      if (res.comp && r.compId !== res.comp) return false;
      if (res.cat && r.category !== res.cat) return false;
      if (res.gender && r.gender !== res.gender) return false;
      if (t.length && !t.every(function (x) { return r._n.indexOf(x) > -1; })) return false;
      return true;
    });
  }
  /** Highlight search terms in a name (diacritics-insensitive, maps back to the original characters). */
  function mark(text) {
    var t = terms();
    if (!t.length) return esc(text);
    var chars = Array.from(text);
    var norm = chars.map(function (ch) { var n = PKB.normalize(ch); return n.length === 1 ? n : ch.toLowerCase(); }).join("");
    if (norm.length !== chars.length) return esc(text);
    var hit = new Array(chars.length).fill(false);
    t.forEach(function (x) {
      var i = norm.indexOf(x);
      while (i > -1) { for (var k = i; k < i + x.length; k++) hit[k] = true; i = norm.indexOf(x, i + x.length); }
    });
    var out = "", open = false;
    chars.forEach(function (ch, i) {
      if (hit[i] && !open) { out += "<mark>"; open = true; }
      if (!hit[i] && open) { out += "</mark>"; open = false; }
      out += esc(ch);
    });
    return out + (open ? "</mark>" : "");
  }

  function placeHTML(p) {
    if (!p) return '<span class="comp-place">–</span>';
    var tone = p === 1 ? "gold" : p === 2 ? "silver" : p === 3 ? "bronze" : "";
    if (tone) return '<span class="badge badge--' + tone + ' comp-medal">' + p + ". mesto</span>";
    return '<span class="comp-place">' + p + ". mesto</span>";
  }
  function resRowHTML(r) {
    return '<tr role="row" class="comp-res' + (r.place && r.place <= 3 ? " is-medal" : "") + '">' +
      '<th scope="row" role="rowheader" class="comp-res__ath"><span class="comp-res__name">' + mark(r.athlete) + "</span>" +
        '<span class="comp-res__sub">' + esc([r.year ? "letnik " + r.year : "", catName(r.category)].filter(Boolean).join(" · ")) + "</span></th>" +
      '<td role="cell" class="comp-res__event"><span class="comp-res__label" aria-hidden="true">Disciplina</span>' + esc(r.event) + "</td>" +
      '<td role="cell" class="num comp-res__time"><span class="comp-res__t">' + esc(r.time || "–") + "</span>" +
        (r.pb ? '<span class="comp-or" title="Osebni rekord">OR<span class="visually-hidden"> (osebni rekord)</span></span>' : "") + "</td>" +
      '<td role="cell" class="comp-res__place">' + placeHTML(r.place) + "</td>" +
      '<td role="cell" class="comp-res__comp">' +
        (r.comp ? '<a href="#' + esc(r.compId) + '" data-comp-link="' + esc(r.compId) + '">' + esc(r.compName) + '</a><span class="comp-res__sub">' + esc(shortRange(r.comp)) + (r.comp.city ? " · " + esc(r.comp.city) : "") + "</span>"
          : esc(r.compName)) +
      "</td></tr>";
  }

  function buildCompOptions(extraId) {
    if (!R.comp) return;
    var withRes = {};
    RESULTS.forEach(function (r) { withRes[r.compId] = (withRes[r.compId] || 0) + 1; });
    var opts = COMPS.filter(function (c) { return withRes[c.id] || status(c) !== "upcoming" || c.id === extraId; })
      .slice().sort(function (a, b) { return PKB.parseDate(b.date) - PKB.parseDate(a.date); });
    R.comp.innerHTML = '<option value="">Vse tekme (' + RESULTS.length + ")</option>" + opts.map(function (c) {
      var n = withRes[c.id] || 0;
      var tail = n ? " (" + n + ")" : status(c) === "upcoming" ? " – še ni bila izvedena" : " – brez rezultatov";
      return '<option value="' + esc(c.id) + '">' + esc(c.name + " · " + shortRange(c) + tail) + "</option>";
    }).join("");
  }
  function buildCatOptions() {
    if (!R.cat) return;
    var ids = [];
    RESULTS.forEach(function (r) { if (r.category && ids.indexOf(r.category) === -1) ids.push(r.category); });
    var order = (D.programs || []).map(function (p) { return p.id; });
    ids.sort(function (a, b) { var ia = order.indexOf(a), ib = order.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    R.cat.innerHTML = '<option value="">Vse kategorije</option>' + ids.map(function (id) {
      return '<option value="' + esc(id) + '">' + esc(catName(id)) + "</option>";
    }).join("");
  }
  function buildSortOptions() {
    if (!R.sortSel) return;
    R.sortSel.innerHTML = SORT_OPTIONS.map(function (o) { return '<option value="' + o[0] + '">Razvrsti: ' + esc(o[1]) + "</option>"; }).join("");
  }

  function syncURL() {
    if (!window.history || !history.replaceState) return;
    try {
      var url = new URL(window.location.href);
      if (res.comp) url.searchParams.set("tekma", res.comp);
      else url.searchParams.delete("tekma");
      if (url.href !== window.location.href) history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    } catch (e) { /* ignore */ }
  }

  function animateNum(el, to) {
    if (!el) return;
    var from = Number(el.getAttribute("data-v") || 0);
    el.setAttribute("data-v", String(to));
    cancelAnimationFrame(el._raf);
    if (from === to || PKB.prefersReducedMotion()) { el.textContent = String(to); return; }
    var t0 = null, dur = 650;
    var step = function (ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (to - from) * eased));
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }
  function renderSummary(rows) {
    var n = { gold: 0, silver: 0, bronze: 0, pb: 0 };
    rows.forEach(function (r) {
      if (r.place === 1) n.gold++;
      else if (r.place === 2) n.silver++;
      else if (r.place === 3) n.bronze++;
      if (r.pb) n.pb++;
    });
    var total = Math.max(rows.length, 1);
    Object.keys(n).forEach(function (k) {
      var v = qs('[data-sum="' + k + '"]', R.strip);
      var bar = qs('[data-sum-bar="' + k + '"]', R.strip);
      if (bar) bar.style.width = Math.round(n[k] / total * 100) + "%";
      if (!v) return;
      v.setAttribute("data-target", String(n[k]));
      if (sumAnimated) animateNum(v, n[k]);
    });
  }

  function applyResults() {
    if (!R.body) return;
    var rows = sortRows(filterRows());
    R.rows = rows;
    R.body.innerHTML = rows.map(resRowHTML).join("");
    var hasRows = rows.length > 0;
    if (R.wrap) R.wrap.hidden = !hasRows;
    if (R.empty) {
      R.empty.hidden = hasRows;
      if (!hasRows) {
        var c = res.comp ? COMP_MAP[res.comp] : null;
        var noneForComp = c && !resultsFor(c.id).length;
        var title = qs("[data-res-empty-title]", R.empty), text = qs("[data-res-empty-text]", R.empty), btn = qs("[data-res-reset]", R.empty);
        if (noneForComp) {
          var st = status(c);
          if (title) title.textContent = st === "past" ? "Rezultati še niso objavljeni" : st === "live" ? "Tekma še poteka" : "Tekma še ni bila izvedena";
          if (text) text.textContent = "»" + c.name + "« (" + PKB.formatDateRange(c.date, c.endDate) + ", " + (c.city || "") + "): rezultate objavimo po zaključku tekmovanja.";
          if (btn) btn.innerHTML = PKB.icon("refresh") + "Pokaži vse rezultate";
        } else {
          if (title) title.textContent = RESULTS.length ? "Ni rezultatov za izbrane filtre" : "Rezultati še niso objavljeni";
          if (text) text.textContent = RESULTS.length ? (res.q ? "Za »" + res.q.trim() + "« ni zadetkov. Preverite črkovanje ali izberite drugo tekmo." : "Poskusite z drugo tekmo, kategorijo ali spolom.") : "Rezultate tekem sezone bomo objavili po prvih tekmah.";
          if (btn) { btn.innerHTML = PKB.icon("x") + "Počisti filtre"; btn.hidden = !RESULTS.length; }
        }
      }
    }
    var filtered = !!(res.comp || res.cat || res.gender || res.q.trim());
    if (R.count) {
      var n = rows.length;
      R.count.innerHTML = plural(n, ["Prikazan", "Prikazana", "Prikazani", "Prikazanih"]) + " <strong>" + n + "</strong> " + plural(n, ["rezultat", "rezultata", "rezultati", "rezultatov"]) +
        (filtered ? " od " + RESULTS.length : "") + '<span class="comp-res-bar__sort"> · razvrščeno ' + sortPhrase() + "</span>";
    }
    if (R.caption) {
      var c2 = res.comp ? COMP_MAP[res.comp] : null;
      R.caption.textContent = "Rezultati plavalcev PK Branik" + (c2 ? " – " + c2.name : "") + ", razvrščeni " + sortPhrase();
    }
    if (R.clear) R.clear.disabled = !filtered;
    if (R.csv) R.csv.disabled = !hasRows;
    qsa("th[data-sort-col]", R.root).forEach(function (th) {
      var col = th.getAttribute("data-sort-col");
      th.setAttribute("aria-sort", col === res.sort.col ? (res.sort.dir === "asc" ? "ascending" : "descending") : "none");
    });
    if (R.sortSel) {
      var v = res.sort.col + ":" + res.sort.dir;
      if (!qs('option[value="' + v + '"]', R.sortSel)) {
        var o = doc.createElement("option");
        o.value = v;
        o.textContent = "Razvrsti: " + sortPhrase();
        R.sortSel.appendChild(o);
      }
      R.sortSel.value = v;
    }
    renderSummary(rows);
    syncURL();
  }

  function syncControls() {
    if (R.comp) R.comp.value = res.comp;
    if (R.cat) R.cat.value = res.cat;
    if (R.q && R.q.value !== res.q) R.q.value = res.q;
    if (R.gender) qsa("[data-gender]", R.gender).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-gender") === res.gender)); });
  }
  function setRes(patch) {
    Object.keys(patch).forEach(function (k) { res[k] = patch[k]; });
    syncControls();
    applyResults();
  }
  function setSort(col, dir) {
    if (!SORTERS[col]) return;
    res.sort = { col: col, dir: dir === "asc" || dir === "desc" ? dir : SORT_DEFAULT_DIR[col] };
    PKB.storage.set(STORE_SORT, res.sort);
    applyResults();
  }

  function scrollToResults() {
    var sec = qs("#rezultati");
    if (!sec) return;
    sec.scrollIntoView({ behavior: behavior(), block: "start" });
    var h = qs("#rezultati-title");
    if (h) h.focus({ preventScroll: true });
    if (R.root) pulse(R.root);
  }
  function showResultsFor(id) {
    var c = COMP_MAP[id];
    if (!c) return;
    if (R.comp && !qs('option[value="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]', R.comp)) buildCompOptions(id);
    setRes({ comp: id, cat: "", gender: "", q: "" });
    if (history.replaceState) {
      try {
        var url = new URL(window.location.href);
        url.searchParams.set("tekma", id);
        url.hash = "rezultati";
        history.replaceState(history.state, "", url.pathname + url.search + url.hash);
      } catch (e) { /* ignore */ }
    }
    scrollToResults();
  }
  function showAthlete(name) {
    setRes({ comp: "", cat: "", gender: "", q: name });
    scrollToResults();
  }

  function csvCell(v) {
    var s = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function exportCSV() {
    var rows = R.rows || [];
    if (!rows.length) { PKB.toast({ type: "warning", message: "Ni rezultatov za izvoz." }); return; }
    var head = ["Plavalec", "Letnik", "Spol", "Kategorija", "Disciplina", "Čas", "Mesto", "Osebni rekord", "Tekma", "Datum", "Kraj", "Bazen"];
    var lines = [head].concat(rows.map(function (r) {
      return [r.athlete, r.year, r.gender === "Ž" ? "Ž" : r.gender === "M" ? "M" : "", catName(r.category), r.event, r.time, r.place ? r.place + "." : "", r.pb ? "da" : "ne",
        r.compName, r.comp ? PKB.formatDateRange(r.comp.date, r.comp.endDate) : "", r.comp ? r.comp.city || "" : "", r.comp ? r.comp.course || "" : ""];
    }));
    var csv = "﻿" + lines.map(function (l) { return l.map(csvCell).join(";"); }).join("\r\n") + "\r\n";
    var name = "pk-branik-rezultati" + (res.comp ? "-" + PKB.slugify(res.comp) : "") + ".csv";
    PKB.download(name, csv, "text/csv;charset=utf-8");
    PKB.toast({ type: "success", title: "Preglednica je pripravljena", message: rows.length + " " + plural(rows.length, ["rezultat", "rezultata", "rezultati", "rezultatov"]) + " v datoteki " + name + "." });
  }

  function initResults() {
    if (!R.root || !R.body) return;
    buildCatOptions();
    buildSortOptions();
    var stored = PKB.storage.get(STORE_SORT, null);
    if (stored && SORTERS[stored.col] && (stored.dir === "asc" || stored.dir === "desc")) res.sort = { col: stored.col, dir: stored.dir };
    var p = PKB.params().get("tekma");
    var pid = p && COMP_MAP[p] ? p : "";
    buildCompOptions(pid);
    res.comp = pid;
    syncControls();
    applyResults();

    if (R.form) R.form.addEventListener("submit", function (e) { e.preventDefault(); });
    if (R.comp) R.comp.addEventListener("change", function () { setRes({ comp: R.comp.value }); });
    if (R.cat) R.cat.addEventListener("change", function () { setRes({ cat: R.cat.value }); });
    if (R.gender) R.gender.addEventListener("click", function (e) {
      var b = e.target.closest("[data-gender]");
      if (b) setRes({ gender: b.getAttribute("data-gender") });
    });
    if (R.q) {
      var onQ = PKB.debounce(function () { res.q = R.q.value; applyResults(); }, 140);
      R.q.addEventListener("input", onQ);
      R.q.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && R.q.value) { e.preventDefault(); R.q.value = ""; res.q = ""; applyResults(); }
      });
    }
    qsa("th[data-sort-col] button", R.root).forEach(function (b) {
      b.addEventListener("click", function () {
        var col = b.closest("th").getAttribute("data-sort-col");
        if (res.sort.col === col) setSort(col, res.sort.dir === "asc" ? "desc" : "asc");
        else setSort(col, SORT_DEFAULT_DIR[col]);
      });
    });
    if (R.sortSel) R.sortSel.addEventListener("change", function () {
      var pr = R.sortSel.value.split(":");
      setSort(pr[0], pr[1]);
    });
    /* results become cards below 720px: the column headers stay for screen readers (visually hidden),
       but their sort buttons leave the tab order – the "Razvrsti" select does the job there */
    var mqCards = window.matchMedia ? window.matchMedia("(max-width: 719.98px)") : null;
    var syncSortHeaders = function () {
      var cards = !!(mqCards && mqCards.matches);
      qsa("th[data-sort-col] button", R.root).forEach(function (b) {
        if (cards) b.setAttribute("tabindex", "-1");
        else b.removeAttribute("tabindex");
      });
    };
    syncSortHeaders();
    if (mqCards) {
      if (mqCards.addEventListener) mqCards.addEventListener("change", syncSortHeaders);
      else if (mqCards.addListener) mqCards.addListener(syncSortHeaders);
    }
    var reset = function () { setRes({ comp: "", cat: "", gender: "", q: "" }); if (R.q) R.q.focus({ preventScroll: true }); };
    if (R.clear) R.clear.addEventListener("click", reset);
    var rb = qs("[data-res-reset]", R.root);
    if (rb) rb.addEventListener("click", reset);
    if (R.csv) R.csv.addEventListener("click", exportCSV);

    // summary tiles count up the first time they are seen
    var startCount = function () {
      if (sumAnimated) return;
      sumAnimated = true;
      qsa("[data-sum]", R.strip).forEach(function (v) { animateNum(v, Number(v.getAttribute("data-target") || 0)); });
    };
    if (R.strip && "IntersectionObserver" in window && !PKB.prefersReducedMotion()) {
      var io = new IntersectionObserver(function (en) {
        if (en.some(function (x) { return x.isIntersecting; })) { startCount(); io.disconnect(); }
      }, { threshold: 0.3 });
      io.observe(R.strip);
    } else startCount();
  }

  /* ------------------------------------------------------------------
     5. Club records
     ------------------------------------------------------------------ */
  function renderRecords() {
    var athletesWithResults = {};
    RESULTS.forEach(function (r) { athletesWithResults[r.athlete] = (athletesWithResults[r.athlete] || 0) + 1; });
    /* records only carry a year, so "new" means set in the current calendar year (not the season) */
    var thisYear = PKB.today().getFullYear();
    var isNew = function (r) { return r.year === thisYear; };
    ["M", "Ž"].forEach(function (g) {
      var body = qs('[data-rec-body="' + g + '"]');
      var rows = RECORDS.filter(function (r) { return r.gender === g; });
      var nEl = qs('[data-rec-n="' + g + '"]');
      if (nEl) nEl.textContent = String(rows.length);
      if (!body) return;
      if (!rows.length) {
        body.innerHTML = '<tr role="row"><td role="cell" colspan="4" class="comp-rec__empty">Rekordi še niso vpisani.</td></tr>';
        return;
      }
      body.innerHTML = rows.map(function (r) {
        var n = athletesWithResults[r.athlete] || 0;
        var who = n
          ? '<button type="button" class="comp-athlink" data-athlete="' + esc(r.athlete) + '" title="Pokaži rezultate v tej sezoni">' + esc(r.athlete) + PKB.icon("arrow-up-right", "icon--sm") + '<span class="visually-hidden"> – pokaži ' + n + " " + plural(n, ["rezultat", "rezultata", "rezultate", "rezultatov"]) + "</span></button>"
          : '<span class="comp-rec__who">' + esc(r.athlete) + "</span>";
        return '<tr role="row" class="comp-rec' + (isNew(r) ? " is-new" : "") + '">' +
          '<th scope="row" role="rowheader" class="comp-rec__event">' + esc(r.event) + "</th>" +
          '<td role="cell" class="num comp-rec__time">' + esc(r.time) + "</td>" +
          '<td role="cell" class="comp-rec__athlete">' + who + "</td>" +
          '<td role="cell" class="num comp-rec__year">' + (isNew(r) ? '<span class="badge badge--solid comp-new">Nov</span>' : "") +
            '<span class="comp-rec__y">' + esc(r.year || "–") + "</span></td>" +
        "</tr>";
      }).join("");
    });

    var news = RECORDS.filter(isNew);
    var nv = qs("[data-rec-new]"), nl = qs("[data-rec-new-list]"), lab = qs("[data-rec-new-label]");
    if (lab) lab.textContent = "Novi rekordi v letu " + thisYear;
    if (nv) nv.textContent = String(news.length);
    if (nl) nl.innerHTML = news.length ? news.map(function (r) {
      return '<li><span class="comp-rec-tile__ev">' + esc(r.event) + " · " + (r.gender === "Ž" ? "Ž" : "M") + '</span><span class="comp-rec-tile__who">' + esc(r.athlete) + '</span><span class="comp-rec-tile__t">' + esc(r.time) + "</span></li>";
    }).join("") : '<li class="small muted">Letos še brez novih rekordov.</li>';
    var oldest = RECORDS.filter(function (r) { return r.year; }).slice().sort(function (a, b) { return a.year - b.year || a._stroke - b._stroke || a._dist - b._dist; })[0];
    var ot = qs("[data-rec-old-time]"), om = qs("[data-rec-old-meta]");
    if (oldest) {
      var years = PKB.today().getFullYear() - oldest.year;
      if (ot) ot.textContent = oldest.time;
      if (om) om.textContent = oldest.event + " (" + (oldest.gender === "Ž" ? "ženske" : "moški") + ") · " + oldest.athlete + ", " + oldest.year + (years > 0 ? " · velja " + years + " " + plural(years, ["leto", "leti", "leta", "let"]) : "");
    }

    var tabs = qs("[data-rec-tabs]");
    if (tabs) {
      var saved = PKB.storage.get(STORE_REC, null);
      if ((saved === "rec-z" || saved === "rec-m") && typeof tabs.selectTab === "function") {
        var cur = qs('[role="tab"][aria-selected="true"]', tabs);
        if (!cur || cur.getAttribute("aria-controls") !== saved) tabs.selectTab(saved);
      }
      tabs.addEventListener("tabchange", function (e) { if (e.detail && e.detail.id) PKB.storage.set(STORE_REC, e.detail.id); });
    }
  }

  /* ------------------------------------------------------------------
     6. Deep links: #<competitionId>, #koledar / #rezultati / #rekordi
     ------------------------------------------------------------------ */
  var userScrolled = false;
  ["wheel", "touchstart", "keydown"].forEach(function (ev) {
    window.addEventListener(ev, function () { userScrolled = true; }, { passive: true, once: true });
  });
  function readHash() {
    var h = window.location.hash.slice(1);
    try { h = decodeURIComponent(h); } catch (e) { /* keep raw */ }
    return h;
  }
  function handleHash(isLoad) {
    var h = readHash();
    if (!h) return;
    if (COMP_MAP[h]) {
      if (isLoad) {
        requestAnimationFrame(function () { goToComp(h, { instant: true }); });
        window.addEventListener("load", function () {
          if (!userScrolled) setTimeout(function () { var row = doc.getElementById(h); if (row) row.scrollIntoView({ behavior: "instant", block: "center" }); }, 60);
        }, { once: true });
      } else goToComp(h, { focus: true });
      return;
    }
    if (isLoad) {
      var el = doc.getElementById(h);
      if (el && el.closest("main")) {
        var align = function () { el.scrollIntoView({ behavior: "instant", block: "start" }); };
        requestAnimationFrame(align);
        window.addEventListener("load", function () { if (!userScrolled) setTimeout(align, 60); }, { once: true });
      }
    }
  }
  /* same-hash links do not fire hashchange; competition links get a smooth scroll + pulse */
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var id = a.getAttribute("href").slice(1);
    try { id = decodeURIComponent(id); } catch (err) { /* keep */ }
    if (!COMP_MAP[id]) return;
    e.preventDefault();
    if (readHash() !== id && history.pushState) { try { history.pushState(null, "", "#" + id); } catch (err) { /* ignore */ } }
    goToComp(id, { focus: true });
  });

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  renderStats();
  renderHero();
  initCalendarList();
  initMini();
  renderHostCard();
  initResults();
  renderRecords();
  handleHash(true);
  window.addEventListener("hashchange", function () { handleHash(false); });
})();
