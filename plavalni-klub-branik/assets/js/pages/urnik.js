/* ==========================================================================
   Urnik (urnik.html) – tedenski urnik treningov
   Pogledi: Teden (časovna mreža), Seznam (po dnevih), Dan (zavihki).
   Filtri: skupine, kategorije, lokacija, »Samo danes« – shranjeni v PKB.storage,
   ?skupina=<id> izbere skupino (in prepiše shranjene filtre).
   Testni parametri: ?danes=YYYY-MM-DD (PKB.today) in ?ura=HH:MM (trenutni čas).
   ========================================================================== */
(function () {
  "use strict";

  var PKB = window.PKB;
  if (!PKB || !PKB.data) return;
  var root = PKB.qs("[data-sched]");
  if (!root) return;

  var D = PKB.data;
  var qs = PKB.qs, qsa = PKB.qsa, esc = PKB.escapeHTML;

  /* ------------------------------------------------------------------
     Constants & helpers
     ------------------------------------------------------------------ */
  var DAYS = Array.isArray(D.days) && D.days.length === 7 ? D.days : ["Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota", "Nedelja"];
  var DAYS_SHORT = Array.isArray(D.daysShort) && D.daysShort.length === 7 ? D.daysShort : ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];
  var DAYS_IN = ["v ponedeljek", "v torek", "v sredo", "v četrtek", "v petek", "v soboto", "v nedeljo"];
  var T0 = 5 * 60 + 30;   // 05:30
  var T1 = 21 * 60 + 30;  // 21:30
  var SPAN = T1 - T0;
  var VIEWS = ["teden", "seznam", "dan"];
  var VIEW_LABEL = { teden: "Teden", seznam: "Seznam", dan: "Dan" };
  var STORE_KEY = "urnik";
  var F_TERMIN = ["termin", "termina", "termini", "terminov"];
  var F_TRENING = ["trening", "treninga", "treningi", "treningov"];
  var F_SKUPINA = ["skupina", "skupini", "skupine", "skupin"];
  var F_LOKACIJA = ["lokacija", "lokaciji", "lokacije", "lokacij"];
  var F_FILTER = ["aktiven filter", "aktivna filtra", "aktivni filtri", "aktivnih filtrov"];
  var F_VSI = ["ves", "vsa", "vsi", "vseh"];

  function num(n, forms) { return n + " " + PKB.plural(n, forms); }
  function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  function safeColor(c) { return /^#[0-9a-f]{3,8}$/i.test(String(c || "")) ? c : "#c9d0d8"; }
  function uniq(arr) { return arr.filter(function (v, i) { return arr.indexOf(v) === i; }); }
  function timeRange(s) { return s.start + "–" + s.end; }
  function fmtDur(m) {
    m = Math.max(0, Math.round(m));
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60), r = m % 60;
    return h + " h" + (r ? " " + r + " min" : "");
  }
  function relIn(m) { return m <= 0 ? "zdaj" : "čez " + fmtDur(m); }
  function shortDate(d) { return d.getDate() + ". " + (d.getMonth() + 1) + "."; }

  /* ------------------------------------------------------------------
     Data (validated copies – never mutate PKB.data)
     ------------------------------------------------------------------ */
  var PROGRAMS = (D.programs || []).filter(function (p) { return p && p.id && p.name; });
  var PMAP = {}, ORDER = {};
  PROGRAMS.forEach(function (p, i) { PMAP[p.id] = p; ORDER[p.id] = i; });

  var SESSIONS = [];
  (D.schedule || []).forEach(function (s, i) {
    if (!s || !PMAP[s.program]) return;
    var day = Number(s.day);
    var sm = PKB.timeToMinutes(s.start), em = PKB.timeToMinutes(s.end);
    if (!(day >= 1 && day <= 7) || !isFinite(sm) || !isFinite(em) || em <= sm) return;
    SESSIONS.push({
      id: i, raw: s, program: s.program, prog: PMAP[s.program], day: day,
      start: PKB.minutesToTime(sm), end: PKB.minutesToTime(em), sm: sm, em: em, dur: em - sm,
      pool: String(s.pool || "")
    });
  });
  SESSIONS.sort(function (a, b) { return a.day - b.day || a.sm - b.sm || a.em - b.em || ORDER[a.program] - ORDER[b.program]; });
  var BYID = {};
  SESSIONS.forEach(function (s) { BYID[s.id] = s; });

  var SCHED_PROGRAMS = PROGRAMS.filter(function (p) { return SESSIONS.some(function (s) { return s.program === p.id; }); });

  var POOLS = (D.pools || []).filter(function (p) { return p && p.name; }).map(function (p) { return { name: String(p.name), desc: String(p.desc || "") }; });
  SESSIONS.forEach(function (s) {
    if (s.pool && !POOLS.some(function (p) { return p.name === s.pool; })) POOLS.push({ name: s.pool, desc: "" });
  });

  /* category groups (programs with an unknown category go to "Ostalo") */
  var GROUPS = (D.programCategories || []).filter(function (c) { return c && c.id; }).map(function (c) {
    return { id: c.id, name: c.name || c.id, label: c.id === "sola" ? (c.name || c.short) : (c.short || c.name), icon: c.icon || "waves",
      ids: SCHED_PROGRAMS.filter(function (p) { return p.category === c.id; }).map(function (p) { return p.id; }) };
  });
  var orphan = SCHED_PROGRAMS.filter(function (p) { return !GROUPS.some(function (g) { return g.id === p.category; }); });
  if (orphan.length) GROUPS.push({ id: "ostalo", name: "Ostalo", label: "Ostalo", icon: "waves", ids: orphan.map(function (p) { return p.id; }) });
  GROUPS = GROUPS.filter(function (g) { return g.ids.length; });

  /* ------------------------------------------------------------------
     Clock (honours ?danes=YYYY-MM-DD via PKB.today and ?ura=HH:MM)
     ------------------------------------------------------------------ */
  function readClock() {
    var date = PKB.today();
    var mins = null;
    var u = PKB.params().get("ura");
    if (u && /^([01]?\d|2[0-3]):[0-5]\d$/.test(u.trim())) mins = PKB.timeToMinutes(u.trim());
    if (mins === null) { var n = new Date(); mins = n.getHours() * 60 + n.getMinutes(); }
    return { date: date, iso: PKB.toISODate(date), wd: PKB.isoWeekday(date), mins: mins };
  }
  var clock = readClock();
  function dateOfDay(d) {
    return new Date(clock.date.getFullYear(), clock.date.getMonth(), clock.date.getDate() + (d - clock.wd));
  }

  /* ------------------------------------------------------------------
     State (storage + ?skupina)
     ------------------------------------------------------------------ */
  var mqNarrow = window.matchMedia ? window.matchMedia("(max-width: 759.98px)") : { matches: false };
  var state = { programs: [], pool: "", today: false, view: mqNarrow.matches ? "dan" : "teden", day: clock.wd };
  (function initState() {
    var s = PKB.storage.get(STORE_KEY, null);
    if (s && typeof s === "object") {
      if (Array.isArray(s.programs)) state.programs = uniq(s.programs.filter(function (id) { return typeof id === "string" && PMAP[id] && SCHED_PROGRAMS.indexOf(PMAP[id]) > -1; }));
      if (typeof s.pool === "string" && POOLS.some(function (p) { return p.name === s.pool; })) state.pool = s.pool;
      state.today = s.today === true;
      if (VIEWS.indexOf(s.view) > -1) state.view = s.view;
    }
    var sk = PKB.params().get("skupina");
    if (sk) {
      sk = sk.trim().toLowerCase();
      /* a link to a group overrides the stored filters – unless it is the page's own URL
         (state already shows exactly that group), so a reload keeps the pool / "Samo danes" choice */
      var same = state.programs.length === 1 && state.programs[0] === sk;
      if (PMAP[sk] && SCHED_PROGRAMS.indexOf(PMAP[sk]) > -1 && !same) {
        state.programs = [sk];
        state.pool = "";
        state.today = false;
      }
    }
  })();

  function save() {
    PKB.storage.set(STORE_KEY, { programs: state.programs.slice(), pool: state.pool, today: state.today, view: state.view });
  }
  function syncURL() {
    try {
      var url = new URL(window.location.href);
      if (state.programs.length === 1) url.searchParams.set("skupina", state.programs[0]);
      else url.searchParams.delete("skupina");
      if (url.href !== window.location.href && window.history && history.replaceState) {
        history.replaceState(history.state, "", url.pathname + url.search + url.hash);
      }
    } catch (e) { /* ignore */ }
  }

  function matches(s, ignorePrograms) {
    if (!ignorePrograms && state.programs.length && state.programs.indexOf(s.program) < 0) return false;
    if (state.pool && s.pool !== state.pool) return false;
    if (state.today && s.day !== clock.wd) return false;
    return true;
  }
  function filtered() { return SESSIONS.filter(function (s) { return matches(s, false); }); }
  function activeCount() { return state.programs.length + (state.pool ? 1 : 0) + (state.today ? 1 : 0); }

  /* ------------------------------------------------------------------
     Live status (zdaj / naslednji)
     ------------------------------------------------------------------ */
  function statusOf(list) {
    var todays = list.filter(function (s) { return s.day === clock.wd; });
    var current = todays.filter(function (s) { return s.sm <= clock.mins && clock.mins < s.em; });
    var later = todays.filter(function (s) { return s.sm > clock.mins; });
    var nextStart = later.length ? Math.min.apply(null, later.map(function (s) { return s.sm; })) : null;
    var next = later.filter(function (s) { return s.sm === nextStart; });
    return { todays: todays, current: current, next: next, nextStart: nextStart, remaining: current.length + later.length };
  }
  function nextAfterToday(list) {
    for (var k = 1; k <= 7; k++) {
      var d = ((clock.wd - 1 + k) % 7) + 1;
      var ds = list.filter(function (s) { return s.day === d; });
      if (ds.length) {
        var st = Math.min.apply(null, ds.map(function (s) { return s.sm; }));
        return { k: k, day: d, start: st, items: ds.filter(function (s) { return s.sm === st; }) };
      }
    }
    return null;
  }
  function whenLabel(nx) {
    if (!nx) return "";
    return (nx.k === 1 ? "jutri" : nx.k === 7 ? "naslednji " + DAYS[nx.day - 1].toLowerCase() : DAYS_IN[nx.day - 1]) + " ob " + PKB.minutesToTime(nx.start);
  }
  function liveOf(s, st) {
    if (s.day !== clock.wd) return "";
    if (st.current.indexOf(s) > -1) return "now";
    if (st.next.indexOf(s) > -1) return "next";
    return "";
  }
  function liveBadge(live) {
    if (live === "now") return '<span class="badge badge--success badge-live">Zdaj</span>';
    if (live === "next") return '<span class="badge">Naslednji</span>';
    return "";
  }
  function names(items) { return items.map(function (s) { return s.prog.name; }).join(", "); }

  /* ------------------------------------------------------------------
     Hero – today's day + "zdaj" status + stats
     ------------------------------------------------------------------ */
  var H = {
    day: qs("[data-now-day]"), date: qs("[data-now-date]"), clock: qs("[data-now-clock]"),
    status: qs("[data-now-status]"), rel: qs("[data-now-rel]"),
    progLabel: qs("[data-now-progress-label]"), progCount: qs("[data-now-progress-count]"), progBar: qs("[data-now-progress]"),
    goLabel: qs("[data-goto-label]")
  };
  /* the hero button opens today's day view – or the next training day when today is free */
  function targetDay() {
    if (SESSIONS.some(function (s) { return s.day === clock.wd; })) return { day: clock.wd, label: "Današnji termini" };
    var nx = nextAfterToday(SESSIONS);
    if (!nx) return { day: clock.wd, label: "Današnji termini" };
    return { day: nx.day, label: nx.k === 1 ? "Jutrišnji termini" : "Termini " + DAYS_IN[nx.day - 1] };
  }
  var lastStatusHTML = "";

  function nowListHTML(items, mode) {
    return '<ul class="sched-now__list" role="list">' + items.map(function (s) {
      var meta = mode === "end" ? "do " + s.end : timeRange(s);
      return '<li class="sched-now__item" style="--c:' + safeColor(s.prog.color) + '">' +
        '<span class="sched-dot" aria-hidden="true"></span>' +
        '<span class="sched-now__name">' + esc(s.prog.name) + "</span>" +
        '<span class="sched-now__meta">' + esc(meta) + " · " + esc(s.pool) + "</span></li>";
    }).join("") + "</ul>";
  }

  function renderHero() {
    if (H.day) H.day.textContent = DAYS[clock.wd - 1];
    if (H.date) H.date.textContent = PKB.formatDate(clock.iso);
    if (H.clock) H.clock.textContent = "Zdaj · " + PKB.minutesToTime(clock.mins);

    var st = statusOf(SESSIONS);
    var html, rel = "";
    if (st.current.length) {
      html = '<p class="sched-now__label">Trenutno v vodi</p>' + nowListHTML(st.current, "end");
      if (st.next.length) rel = "Nato ob " + PKB.minutesToTime(st.nextStart) + ": " + names(st.next) + ".";
    } else if (st.next.length) {
      html = '<p class="sched-now__label">Naslednji trening</p>' +
        '<p class="sched-now__big">ob ' + PKB.minutesToTime(st.nextStart) + "</p>" + nowListHTML(st.next, "range");
      rel = cap(relIn(st.nextStart - clock.mins)) + ".";
    } else {
      var nx = nextAfterToday(SESSIONS);
      html = '<p class="sched-now__label">Naslednji trening</p>' +
        (nx ? '<p class="sched-now__big">' + esc(cap(whenLabel(nx))) + "</p>" + nowListHTML(nx.items, "range") : '<p class="small muted">Urnik je trenutno prazen.</p>');
      rel = st.todays.length ? "Današnji treningi so končani." : (clock.wd === 7 ? "Nedelja je prosta – ob nedeljah ni rednih treningov." : "Danes ni treningov.");
    }
    if (H.status && html !== lastStatusHTML) { H.status.innerHTML = html; lastStatusHTML = html; }
    if (H.rel) H.rel.textContent = rel;

    var total = st.todays.length, done = total - st.remaining;
    if (H.progLabel) {
      H.progLabel.textContent = !total ? "Danes je prosto" :
        st.remaining ? "Še " + num(st.remaining, F_TRENING) + " danes" : "Vsi današnji treningi so končani";
    }
    if (H.progCount) H.progCount.textContent = total ? done + "/" + total : "";
    if (H.progBar) H.progBar.parentNode.style.setProperty("--value", (total ? Math.round(done / total * 100) : 0) + "%");

    setStat("sessions", SESSIONS.length, PKB.plural(SESSIONS.length, F_TERMIN) + " na teden");
    var progCount = SCHED_PROGRAMS.length;
    setStat("programs", progCount, PKB.plural(progCount, F_SKUPINA));
    setStat("today", total, PKB.plural(total, F_TRENING) + " danes");
    var goDay = targetDay();
    if (H.goLabel) H.goLabel.textContent = goDay.label;
    var poolCount = uniq(SESSIONS.map(function (s) { return s.pool; }).filter(Boolean)).length;
    setStat("pools", poolCount, PKB.plural(poolCount, F_LOKACIJA) + " na Pristanu");
  }
  function setStat(key, value, label) {
    var v = qs('[data-stat="' + key + '"]'), l = qs('[data-stat-label="' + key + '"]');
    if (v) v.textContent = String(value);
    if (l) l.textContent = label;
  }

  /* ------------------------------------------------------------------
     Toolbar
     ------------------------------------------------------------------ */
  var T = {
    cats: qs("[data-cats]"), progs: qs("[data-programs]"), pool: qs("[data-pool]"), today: qs("[data-today]"),
    clear: qs("[data-clear]"), activeText: qs("[data-active-text]"), results: qs("[data-results]"),
    views: qsa("[data-view]"), filterToggle: qs("[data-filter-toggle]"), filterN: qs("[data-filter-n]"),
    filters: qs("[data-filters]"), exportBtn: qs("[data-export]"), printBtn: qs("[data-print]")
  };

  function buildToolbar() {
    if (T.cats) {
      T.cats.innerHTML = GROUPS.map(function (g) {
        return '<button type="button" class="chip sched-cat" data-cat="' + esc(g.id) + '" aria-pressed="false">' +
          PKB.icon(g.icon, "icon--sm") + "<span>" + esc(g.label) + "</span></button>";
      }).join("");
    }
    if (T.progs) {
      T.progs.innerHTML = SCHED_PROGRAMS.map(function (p) {
        return '<button type="button" class="chip sched-chip" data-prog="' + esc(p.id) + '" aria-pressed="false" style="--dot:' + safeColor(p.color) + '">' +
          '<span class="dot" aria-hidden="true"></span><span>' + esc(p.name) + "</span>" +
          '<span class="count" aria-hidden="true" data-count></span><span class="visually-hidden" data-count-sr></span></button>';
      }).join("");
    }
    if (T.pool) {
      T.pool.innerHTML = '<option value="">Vse lokacije</option>' + POOLS.map(function (p) {
        return '<option value="' + esc(p.name) + '">' + esc(p.name) + "</option>";
      }).join("");
    }
  }

  function syncToolbar() {
    qsa("[data-prog]", T.progs).forEach(function (b) {
      var id = b.getAttribute("data-prog");
      b.setAttribute("aria-pressed", state.programs.indexOf(id) > -1 ? "true" : "false");
      var cnt = SESSIONS.filter(function (s) { return s.program === id && matches(s, true); }).length;
      var c = qs("[data-count]", b), sr = qs("[data-count-sr]", b);
      if (c) c.textContent = String(cnt);
      if (sr) sr.textContent = ", " + num(cnt, F_TERMIN);
      b.classList.toggle("is-empty", cnt === 0);
    });
    qsa("[data-cat]", T.cats).forEach(function (b) {
      var g = GROUPS.filter(function (x) { return x.id === b.getAttribute("data-cat"); })[0];
      var on = !!g && g.ids.every(function (id) { return state.programs.indexOf(id) > -1; });
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (T.pool) T.pool.value = state.pool;
    if (T.today) T.today.checked = state.today;

    var active = activeCount();
    if (T.activeText) T.activeText.textContent = active ? num(active, F_FILTER) : "Brez filtrov";
    if (T.clear) T.clear.setAttribute("aria-disabled", active ? "false" : "true");
    if (T.filterN) { T.filterN.textContent = active ? String(active) : ""; T.filterN.hidden = !active; }
    if (T.filterToggle) T.filterToggle.setAttribute("aria-label", "Filtri" + (active ? " (" + num(active, F_FILTER) + ")" : ""));
    T.views.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-view") === state.view ? "true" : "false"); });

    var list = filtered(), total = SESSIONS.length;
    if (T.results) {
      T.results.innerHTML = active ?
        "Prikazano: <strong>" + list.length + "</strong> od " + num(total, F_TERMIN) :
        "Prikazano: " + PKB.plural(total, F_VSI) + " <strong>" + total + "</strong> " + PKB.plural(total, F_TERMIN) + " v tednu";
    }
    if (T.exportBtn) T.exportBtn.setAttribute("aria-disabled", list.length ? "false" : "true");
  }

  /* ------------------------------------------------------------------
     Views
     ------------------------------------------------------------------ */
  var host = qs("[data-view-host]");
  var board = qs("[data-board]");
  var pendingRender = false;

  function emptyHTML() {
    return '<div class="empty-state sched-empty">' +
      '<span class="icon-bubble">' + PKB.icon("calendar") + "</span>" +
      '<h3 class="sched-empty__title">Ni terminov za izbrane filtre</h3>' +
      '<p class="small">' + (state.today ? "Danes ni treningov, ki bi ustrezali izbranim filtrom." : "Poskusite z drugo skupino ali lokacijo.") + "</p>" +
      '<button type="button" class="btn btn--sm" data-clear-inline data-key="clear">' + PKB.icon("refresh") + "Počisti filtre</button></div>";
  }

  /* Lane assignment: overlapping sessions sit side by side; a block widens into free lanes to its right. */
  function layoutDay(list) {
    var items = list.slice().sort(function (a, b) { return a.sm - b.sm || b.em - a.em || ORDER[a.program] - ORDER[b.program]; });
    var out = [], cluster = [], clusterEnd = -1;
    function flush() {
      if (!cluster.length) return;
      var lanes = [];
      var placed = cluster.map(function (s) {
        var k = 0;
        for (; k < lanes.length; k++) {
          if (lanes[k][lanes[k].length - 1].em <= s.sm) break;
        }
        if (k === lanes.length) lanes.push([]);
        lanes[k].push(s);
        return { s: s, lane: k };
      });
      var n = lanes.length;
      placed.forEach(function (p) {
        var span = 1;
        for (var k = p.lane + 1; k < n; k++) {
          var clash = lanes[k].some(function (o) { return o.sm < p.s.em && p.s.sm < o.em; });
          if (clash) break;
          span++;
        }
        out.push({ s: p.s, lane: p.lane, lanes: n, span: span });
      });
      cluster = [];
      clusterEnd = -1;
    }
    items.forEach(function (s) {
      if (cluster.length && s.sm >= clusterEnd) flush();
      cluster.push(s);
      clusterEnd = Math.max(clusterEnd, s.em);
    });
    flush();
    return out.sort(function (a, b) { return a.s.sm - b.s.sm || a.lane - b.lane; });
  }

  function pct(m) { return ((Math.min(Math.max(m, T0), T1) - T0) / SPAN * 100).toFixed(4); }

  /* compact label for narrow lanes in the week grid */
  var SHORT = { zvezdice: "Zvezdice", mlajsi: "Mlajši", starejsi: "Starejši", kadeti: "Kadeti", prehodna: "Prehodna", odrasli: "Odrasli" };
  function shortName(p) {
    if (SHORT[p.id]) return SHORT[p.id];
    return String(p.name).split(/\s+/)[0].replace(/[,.;:]+$/, "");
  }

  function blockHTML(L, st) {
    var s = L.s, p = s.prog, live = liveOf(s, st);
    var top = pct(s.sm), height = (pct(s.em) - pct(s.sm)).toFixed(4);
    var label = p.name + ", " + timeRange(s) + ", " + s.pool + ", " + DAYS[s.day - 1].toLowerCase() +
      (live === "now" ? " – poteka zdaj" : live === "next" ? " – naslednji trening" : "");
    var flip = s.day >= 6 && L.lane + L.span === L.lanes && L.lanes > 1;
    return '<button type="button" class="sched-block' + (live ? " is-" + live : "") + (flip ? " is-flip" : "") + '" data-session="' + s.id + '" data-key="b' + s.id + '"' +
      ' style="top:' + top + "%;height:" + height + "%;--lane:" + L.lane + ";--lanes:" + L.lanes + ";--span:" + L.span + ";--c:" + safeColor(p.color) + '"' +
      ' aria-label="' + esc(label) + '">' +
      '<span class="sched-block__in">' +
        '<span class="sched-block__name"><span class="sched-block__full">' + esc(p.name) + '</span><span class="sched-block__short">' + esc(shortName(p)) + "</span></span>" +
        '<span class="sched-block__time num">' + s.start + '<span class="sched-block__end">–' + s.end + "</span></span>" +
        '<span class="sched-block__pool">' + esc(s.pool) + "</span>" +
      "</span>" +
      (live === "now" ? '<span class="sched-block__live" aria-hidden="true"></span>' : "") +
      "</button>";
  }

  function weekHTML(list) {
    var st = statusOf(list);
    var dataDays = uniq(SESSIONS.map(function (s) { return s.day; }));
    var head = '<div class="sched-week__corner" aria-hidden="true"></div>';
    var cols = "";
    for (var d = 1; d <= 7; d++) {
      var dt = dateOfDay(d), isToday = d === clock.wd;
      var ds = list.filter(function (s) { return s.day === d; });
      head += '<div class="sched-week__dh' + (isToday ? " is-today" : "") + '" id="sw-h-' + d + '">' +
        '<span class="sched-week__dh-name">' + esc(DAYS_SHORT[d - 1]) + "</span>" +
        '<span class="sched-week__dh-date">' + shortDate(dt) + "</span>" +
        '<span class="visually-hidden">' + esc(DAYS[d - 1]) + (isToday ? ", danes" : "") + ", " + num(ds.length, F_TERMIN) + "</span></div>";
      var free = dataDays.indexOf(d) < 0;
      cols += '<div class="sched-week__col' + (isToday ? " is-today" : "") + (free ? " is-free" : "") + '" role="group" aria-labelledby="sw-h-' + d + '" data-day="' + d + '">' +
        layoutDay(ds).map(function (L) { return blockHTML(L, st); }).join("") +
        (free ? '<div class="sched-week__free"><span class="sched-week__free-pill">Prosto</span></div>' : "") +
        (isToday ? '<div class="sched-now-line" data-now-line aria-hidden="true" hidden></div>' : "") +
        "</div>";
    }
    /* days without any training in the season (Sunday) get a narrower column */
    var colsTpl = [1, 2, 3, 4, 5, 6, 7].map(function (x) { return dataDays.indexOf(x) < 0 ? "minmax(0, .55fr)" : "minmax(0, 1fr)"; }).join(" ");
    var lines = "", axis = "";
    for (var h = Math.ceil(T0 / 60); h * 60 <= T1; h++) {
      var p = pct(h * 60);
      lines += '<span style="top:' + p + '%"></span>';
      axis += '<span class="sched-week__tick" style="top:' + p + '%">' + PKB.minutesToTime(h * 60) + "</span>";
    }
    return '<p class="sched-week__hint small soft">' + PKB.icon("arrow-right", "icon--sm") + "Povlecite vodoravno za ves teden</p>" +
      '<div class="sched-week-scroll" tabindex="0" role="region" aria-label="Tedenski urnik, ' + esc(num(list.length, F_TERMIN)) + '">' +
      '<div class="sched-week" style="--cols:' + colsTpl + '">' +
        '<div class="sched-week__head">' + head + "</div>" +
        '<div class="sched-week__body">' +
          '<div class="sched-week__lines" aria-hidden="true">' + lines + "</div>" +
          '<div class="sched-week__axis" aria-hidden="true">' + axis + '<span class="sched-week__now-label" data-now-label hidden></span></div>' +
          cols +
        "</div>" +
      "</div></div>";
  }

  function rowHTML(s, st) {
    var p = s.prog, live = liveOf(s, st);
    return '<li><button type="button" class="sched-row' + (live ? " is-" + live : "") + '" data-session="' + s.id + '" data-key="r' + s.id + '" style="--c:' + safeColor(p.color) + '">' +
      '<span class="sched-row__time num"><strong>' + s.start + '</strong><span><span class="sched-row__dash">–</span><span class="sched-row__do">do </span>' + s.end + "</span></span>" +
      '<span class="sched-row__prog"><span class="sched-row__name"><span class="sched-dot" aria-hidden="true"></span>' + esc(p.name) + "</span>" +
        '<span class="sched-row__level">' + esc(p.level || "") + "</span></span>" +
      '<span class="sched-row__pool">' + PKB.icon("map-pin", "icon--sm") + esc(s.pool) + "</span>" +
      '<span class="sched-row__dur num">' + PKB.icon("clock", "icon--sm") + s.dur + " min</span>" +
      '<span class="sched-row__state">' + liveBadge(live) + "</span>" +
      PKB.icon("chevron-right", "sched-row__chev") +
      "</button></li>";
  }

  function listHTML(list) {
    var st = statusOf(list);
    var dataDays = uniq(SESSIONS.map(function (s) { return s.day; }));
    var out = '<div class="sched-list">' +
      '<div class="sched-list__cols" aria-hidden="true"><span>Čas</span><span>Skupina</span><span>Lokacija</span><span>Trajanje</span></div>';
    for (var d = 1; d <= 7; d++) {
      var ds = list.filter(function (s) { return s.day === d; });
      var isToday = d === clock.wd;
      var dateTxt = PKB.formatDate(PKB.toISODate(dateOfDay(d)), { day: "numeric", month: "long" });
      if (!ds.length) {
        if (dataDays.indexOf(d) < 0 && (!state.today || isToday)) {
          out += '<section class="sched-list__day sched-list__day--free' + (isToday ? " is-today" : "") + '" aria-labelledby="sl-h-' + d + '">' +
            '<div class="sched-list__head"><h3 id="sl-h-' + d + '">' + esc(DAYS[d - 1]) + "</h3>" +
            '<span class="sched-list__date">' + esc(dateTxt) + "</span>" +
            (isToday ? '<span class="badge badge--solid">Danes</span>' : "") +
            '<span class="sched-list__n">Prosto · ni rednih treningov</span></div></section>';
        }
        continue;
      }
      out += '<section class="sched-list__day' + (isToday ? " is-today" : "") + '" aria-labelledby="sl-h-' + d + '">' +
        '<div class="sched-list__head"><h3 id="sl-h-' + d + '">' + esc(DAYS[d - 1]) + "</h3>" +
        '<span class="sched-list__date">' + esc(dateTxt) + "</span>" +
        (isToday ? '<span class="badge badge--solid">Danes</span>' : "") +
        '<span class="sched-list__n">' + num(ds.length, F_TERMIN) + "</span></div>" +
        '<ul class="sched-list__rows" role="list">' + ds.map(function (s) { return rowHTML(s, st); }).join("") + "</ul></section>";
    }
    return out + "</div>";
  }

  function cardHTML(s, st, isToday) {
    var p = s.prog, live = liveOf(s, st), rel = "", bar = "";
    if (isToday) {
      if (live === "now") {
        rel = "še " + fmtDur(s.em - clock.mins);
        bar = '<span class="sched-card__bar" aria-hidden="true"><span style="width:' + Math.round((clock.mins - s.sm) / s.dur * 100) + '%"></span></span>';
      } else if (s.sm > clock.mins) rel = relIn(s.sm - clock.mins);
      else rel = "končano";
    }
    return '<li><button type="button" class="sched-card' + (live ? " is-" + live : "") + '" data-session="' + s.id + '" data-key="c' + s.id + '" style="--c:' + safeColor(p.color) + '">' +
      '<span class="sched-card__time"><span class="sched-card__start num">' + s.start + '</span><span class="sched-card__end num">do ' + s.end + "</span></span>" +
      '<span class="sched-card__main">' +
        '<span class="sched-card__name"><span class="sched-dot" aria-hidden="true"></span>' + esc(p.name) + "</span>" +
        '<span class="sched-card__meta">' + esc(s.pool) + '<span class="dot-sep" aria-hidden="true"></span>' + s.dur + " min" +
          (p.level ? '<span class="sched-card__level"><span class="dot-sep" aria-hidden="true"></span>' + esc(p.level) + "</span>" : "") + "</span>" +
        bar +
      "</span>" +
      '<span class="sched-card__aside">' + liveBadge(live) + (rel ? '<span class="sched-card__rel">' + esc(rel) + "</span>" : "") + "</span>" +
      PKB.icon("chevron-right", "sched-card__chev") +
      "</button></li>";
  }

  function dayPanelHTML(list, d) {
    var ds = list.filter(function (s) { return s.day === d; });
    var isToday = d === clock.wd;
    var st = statusOf(list);
    var head = '<div class="sched-daypanel__head">' +
      '<div><h3 class="sched-daypanel__title">' + esc(DAYS[d - 1]) + "</h3>" +
      '<p class="small soft">' + esc(PKB.formatDate(PKB.toISODate(dateOfDay(d)))) + "</p></div>" +
      (isToday ? '<span class="badge badge--solid">Danes</span>' : "") +
      (ds.length ? '<span class="sched-daypanel__n small muted">' + num(ds.length, F_TERMIN) + "</span>" : "") +
      "</div>";
    if (!ds.length) {
      if (!SESSIONS.some(function (s) { return s.day === d; })) {
        var after = SESSIONS.filter(function (s) { return s.day > d; })[0] || SESSIONS[0];
        return head + '<div class="empty-state sched-empty sched-empty--free">' +
          '<span class="icon-bubble">' + PKB.icon("sun") + "</span>" +
          '<p class="sched-empty__title">Prosto</p>' +
          '<p class="small">Ta dan ni rednih treningov.' + (after ? " Naslednji trening je " + esc(DAYS_IN[after.day - 1]) + " ob " + after.start + "." : "") + "</p></div>";
      }
      return head + '<div class="empty-state sched-empty">' +
        '<span class="icon-bubble">' + PKB.icon("calendar") + "</span>" +
        '<p class="sched-empty__title">Ta dan ni terminov za izbrane filtre</p>' +
        '<p class="small">Izberite drug dan ali počistite filtre.</p>' +
        '<button type="button" class="btn btn--sm" data-clear-inline data-key="clear">' + PKB.icon("refresh") + "Počisti filtre</button></div>";
    }
    return head + '<ol class="sched-cards" role="list">' + ds.map(function (s) { return cardHTML(s, st, isToday); }).join("") + "</ol>";
  }

  function dayHTML(list) {
    var tabs = "";
    for (var d = 1; d <= 7; d++) {
      var sel = d === state.day, isToday = d === clock.wd;
      var cnt = list.filter(function (s) { return s.day === d; }).length;
      tabs += '<button type="button" role="tab" class="sched-daytab' + (isToday ? " is-today" : "") + (cnt ? "" : " is-empty") + '"' +
        ' id="sd-tab-' + d + '" data-daytab="' + d + '" data-key="t' + d + '" aria-selected="' + sel + '" aria-controls="sd-panel" tabindex="' + (sel ? "0" : "-1") + '">' +
        '<span class="sched-daytab__d">' + esc(DAYS_SHORT[d - 1]) + "</span>" +
        '<span class="sched-daytab__date">' + dateOfDay(d).getDate() + '.<span class="sched-daytab__m"> ' + (dateOfDay(d).getMonth() + 1) + ".</span></span>" +
        '<span class="visually-hidden">, ' + num(cnt, F_TERMIN) + (isToday ? ", danes" : "") + "</span></button>";
    }
    return '<div class="sched-daytabs" role="tablist" aria-label="Dan v tednu">' + tabs + "</div>" +
      '<div class="sched-daypanel" id="sd-panel" role="tabpanel" aria-labelledby="sd-tab-' + state.day + '" tabindex="0" data-daypanel>' +
      dayPanelHTML(list, state.day) + "</div>";
  }

  function withFocus(scope, fn) {
    var ae = document.activeElement;
    var key = ae && scope.contains(ae) ? ae.getAttribute("data-key") : null;
    fn();
    if (key) {
      var el = qs('[data-key="' + key + '"]', scope);
      if (el) el.focus({ preventScroll: true });
    }
  }

  function renderView() {
    if (!host) return;
    if (qs("dialog.modal[open]")) { pendingRender = true; return; }
    pendingRender = false;
    var list = filtered();
    var prevView = host.getAttribute("data-view");
    var prevScroller = qs(".sched-week-scroll", host);
    var prevLeft = prevScroller ? prevScroller.scrollLeft : null;
    withFocus(host, function () {
      host.setAttribute("data-view", state.view);
      if (board) board.setAttribute("data-view", state.view);
      if (!list.length && state.view !== "dan") host.innerHTML = emptyHTML();
      else if (state.view === "teden") host.innerHTML = weekHTML(list);
      else if (state.view === "seznam") host.innerHTML = listHTML(list);
      else host.innerHTML = dayHTML(list);
    });
    updateNowLine();
    if (state.view === "teden") {
      /* keep the user's horizontal position on re-render; jump to today only when the week view opens */
      var sc = qs(".sched-week-scroll", host);
      if (prevView === "teden" && prevLeft !== null && sc) sc.scrollLeft = prevLeft;
      else scrollWeekToToday();
    }
  }

  /* On narrow screens the week grid scrolls inside its container – bring today's column into view. */
  function scrollWeekToToday() {
    var sc = qs(".sched-week-scroll", host);
    var col = qs(".sched-week__col.is-today", host);
    if (!sc || !col || sc.scrollWidth <= sc.clientWidth + 2) return;
    var axis = qs(".sched-week__axis", host);
    var left = col.offsetLeft - (axis ? axis.offsetWidth : 0) - 8;
    sc.scrollLeft = Math.max(0, left);
  }

  function selectDay(d, focus) {
    state.day = d;
    qsa("[data-daytab]", host).forEach(function (t) {
      var on = Number(t.getAttribute("data-daytab")) === d;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    var panel = qs("[data-daypanel]", host);
    if (!panel) return;
    panel.setAttribute("aria-labelledby", "sd-tab-" + d);
    panel.innerHTML = dayPanelHTML(filtered(), d);
    if (!PKB.prefersReducedMotion()) {
      panel.classList.remove("is-entering");
      void panel.offsetWidth;
      panel.classList.add("is-entering");
    }
  }

  function updateNowLine() {
    var line = qs("[data-now-line]", host), label = qs("[data-now-label]", host);
    if (!line) { if (label) label.hidden = true; return; }
    var inRange = clock.mins >= T0 && clock.mins <= T1;
    line.hidden = !inRange;
    if (label) label.hidden = !inRange;
    if (!inRange) return;
    var top = pct(clock.mins) + "%";
    line.style.top = top;
    if (label) { label.style.top = top; label.textContent = PKB.minutesToTime(clock.mins); }
  }

  /* ------------------------------------------------------------------
     Session details (modal)
     ------------------------------------------------------------------ */
  function openSession(id) {
    var s = BYID[id];
    if (!s) return;
    var p = s.prog;
    var cat = PKB.categoryById(p.category);
    var coaches = PKB.coachesFor(p.id) || [];
    var all = SESSIONS.filter(function (x) { return x.program === p.id; });
    var poolInfo = POOLS.filter(function (x) { return x.name === s.pool; })[0];
    var live = liveOf(s, statusOf(SESSIONS));
    var color = safeColor(p.color);

    var facts = [
      ["Raven", esc(p.level || "—")],
      ["Starost", esc(p.ages || "—")],
      ["Lokacija", esc(s.pool) + (poolInfo && poolInfo.desc ? '<span class="sched-modal__sub">' + esc(poolInfo.desc) + "</span>" : "")],
      ["Treningi na teden", all.length + "× na teden"],
      ["Članarina", p.price != null ? esc(PKB.formatPrice(p.price)) + " / mesec" : "Na povpraševanje"]
    ];

    var content =
      '<div class="sched-modal" style="--c:' + color + '">' +
        '<div class="sched-modal__tags">' +
          (cat ? '<span class="badge sched-modal__cat"><span class="sched-dot" aria-hidden="true"></span>' + esc(cat.name) + "</span>" : "") +
          liveBadge(live) +
          (s.day === clock.wd && !live ? '<span class="badge">Danes</span>' : "") +
        "</div>" +
        '<div class="tile sched-modal__when">' +
          '<span class="sched-modal__day">' + esc(DAYS[s.day - 1]) + "</span>" +
          '<span class="sched-modal__time num">' + esc(timeRange(s)) + "</span>" +
          '<span class="small muted">' + s.dur + " min · " + esc(s.pool) + " · Kopališče Pristan</span>" +
        "</div>" +
        (p.summary ? '<p class="sched-modal__summary muted">' + esc(p.summary) + "</p>" : "") +
        '<div class="sched-modal__grid">' +
          '<dl class="sched-modal__facts">' + facts.map(function (f) {
            return "<div><dt>" + f[0] + "</dt><dd>" + f[1] + "</dd></div>";
          }).join("") + "</dl>" +
          '<div class="sched-modal__side">' +
            '<h3 class="sched-modal__h">Vsi termini skupine</h3>' +
            '<ul class="sched-modal__sessions" role="list">' + all.map(function (x) {
              return '<li class="' + (x === s ? "is-current" : "") + '"><span class="sched-modal__sd">' + esc(DAYS_SHORT[x.day - 1]) + "</span>" +
                '<span class="num">' + esc(timeRange(x)) + "</span>" +
                '<span class="soft">' + esc(x.pool) + "</span>" +
                (x === s ? '<span class="visually-hidden">(izbrani termin)</span>' : "") + "</li>";
            }).join("") + "</ul>" +
            (coaches.length ?
              '<h3 class="sched-modal__h">' + (coaches.length === 1 ? "Trener" : "Trenerji") + "</h3>" +
              '<ul class="sched-modal__coaches" role="list">' + coaches.map(function (c) {
                return '<li><a href="o-klubu.html#trener-' + encodeURIComponent(c.id) + '">' +
                  '<span class="avatar" aria-hidden="true">' + esc(PKB.initials(c.name)) + "</span>" +
                  '<span><span class="sched-modal__cname">' + esc(c.name) + '</span><span class="sched-modal__crole">' + esc(c.role || "") + "</span></span></a></li>";
              }).join("") + "</ul>" : "") +
          "</div>" +
        "</div>" +
      "</div>";

    var footer =
      '<a class="btn" href="programi.html#' + encodeURIComponent(p.id) + '"><i data-icon="book-open"></i>Program</a>' +
      '<a class="btn" href="vpis.html?program=' + encodeURIComponent(p.id) + '"><i data-icon="sparkles"></i>Vpis</a>' +
      '<button type="button" class="btn btn--primary" data-ics><i data-icon="calendar-plus"></i>Dodaj v koledar</button>';

    var m = PKB.modal.open({
      title: p.name, content: content, footer: footer, className: "sched-modal-dlg",
      onClose: function () { if (pendingRender) renderView(); }
    });
    var icsBtn = qs("[data-ics]", m.dialog);
    if (icsBtn) {
      icsBtn.addEventListener("click", function () {
        PKB.downloadICS([PKB.sessionToEvent(s.raw)], "pk-branik-" + PKB.slugify(p.id) + "-" + PKB.slugify(DAYS[s.day - 1]) + "-" + s.start.replace(":", "") + ".ics");
      });
    }
  }

  /* ------------------------------------------------------------------
     Legend, pools
     ------------------------------------------------------------------ */
  function renderLegend() {
    var el = qs("[data-legend]");
    if (!el) return;
    el.innerHTML = GROUPS.map(function (g) {
      return '<div class="sched-legend__group"><h3 class="sched-legend__title">' + esc(g.name) + "</h3>" +
        '<ul class="sched-legend__list" role="list">' + g.ids.map(function (id) {
          var p = PMAP[id];
          var ss = SESSIONS.filter(function (s) { return s.program === id; });
          var pools = uniq(ss.map(function (s) { return s.pool; }).filter(Boolean));
          return '<li><a class="sched-legend__item" href="programi.html#' + encodeURIComponent(id) + '" style="--c:' + safeColor(p.color) + '">' +
            '<span class="sched-swatch" aria-hidden="true"></span>' +
            '<span class="sched-legend__text"><span class="sched-legend__name">' + esc(p.name) + "</span>" +
            '<span class="sched-legend__meta">' + ss.length + "× na teden · " + esc(pools.join(", ")) + "</span></span>" +
            PKB.icon("arrow-up-right", "icon--sm sched-legend__arrow") + "</a></li>";
        }).join("") + "</ul></div>";
    }).join("");
  }

  function renderPools() {
    var el = qs("[data-pools]");
    if (!el) return;
    el.innerHTML = POOLS.map(function (p) {
      var cnt = SESSIONS.filter(function (s) { return s.pool === p.name; }).length;
      var dry = /suh/i.test(p.name);
      return '<li><button type="button" class="sched-pool-item" data-pool-pick="' + esc(p.name) + '" aria-pressed="false">' +
        '<span class="icon-bubble icon-bubble--sm" aria-hidden="true">' + PKB.icon(dry ? "dumbbell" : "waves") + "</span>" +
        '<span class="sched-pool-item__text"><span class="sched-pool-item__name">' + esc(p.name) + "</span>" +
        (p.desc ? '<span class="sched-pool-item__desc">' + esc(p.desc) + "</span>" : "") + "</span>" +
        '<span class="sched-pool-item__n">' + num(cnt, F_TERMIN) + "</span></button></li>";
    }).join("");
  }
  function syncPools() {
    qsa("[data-pool-pick]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-pool-pick") === state.pool ? "true" : "false");
    });
  }

  /* ------------------------------------------------------------------
     Print header
     ------------------------------------------------------------------ */
  function preparePrint() {
    var meta = qs("[data-print-meta]");
    if (!meta) return;
    var parts = [];
    parts.push(state.programs.length ? state.programs.map(function (id) { return PMAP[id].name; }).join(", ") : "Vse skupine");
    parts.push(state.pool || "vse lokacije");
    if (state.today) parts.push("samo " + DAYS[clock.wd - 1].toLowerCase());
    if (state.view === "dan") parts.push("dan: " + DAYS[state.day - 1].toLowerCase());
    meta.textContent = parts.join(" · ") + " – " + num(filtered().length, F_TERMIN) + " · Natisnjeno " + PKB.formatDate(clock.iso) + ". Urnik se lahko med počitnicami in prazniki spremeni.";
  }

  /* ------------------------------------------------------------------
     Commit
     ------------------------------------------------------------------ */
  function commit(opts) {
    opts = opts || {};
    if (opts.persist !== false) save();
    syncURL();
    syncToolbar();
    syncPools();
    renderView();
  }

  function toggleProgram(id) {
    var i = state.programs.indexOf(id);
    if (i > -1) state.programs.splice(i, 1);
    else state.programs.push(id);
    state.programs.sort(function (a, b) { return ORDER[a] - ORDER[b]; });
  }
  function toggleGroup(gid) {
    var g = GROUPS.filter(function (x) { return x.id === gid; })[0];
    if (!g) return;
    var all = g.ids.every(function (id) { return state.programs.indexOf(id) > -1; });
    if (all) state.programs = state.programs.filter(function (id) { return g.ids.indexOf(id) < 0; });
    else state.programs = uniq(state.programs.concat(g.ids));
    if (state.programs.length === SCHED_PROGRAMS.length) state.programs = [];
    state.programs.sort(function (a, b) { return ORDER[a] - ORDER[b]; });
  }
  function clearFilters() {
    state.programs = [];
    state.pool = "";
    state.today = false;
    commit();
    PKB.toast({ type: "info", message: "Filtri so počiščeni – prikazani so vsi termini." , timeout: 3000 });
  }
  function scrollToBoard() {
    var target = qs("#termini");
    if (!target) return;
    target.scrollIntoView({ behavior: PKB.prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }

  /* ------------------------------------------------------------------
     Events
     ------------------------------------------------------------------ */
  function bind() {
    if (T.progs) T.progs.addEventListener("click", function (e) {
      var b = e.target.closest("[data-prog]");
      if (!b) return;
      toggleProgram(b.getAttribute("data-prog"));
      commit();
    });
    if (T.cats) T.cats.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]");
      if (!b) return;
      toggleGroup(b.getAttribute("data-cat"));
      commit();
    });
    if (T.pool) T.pool.addEventListener("change", function () {
      state.pool = T.pool.value;
      commit();
    });
    if (T.today) T.today.addEventListener("change", function () {
      state.today = T.today.checked;
      if (state.today) state.day = clock.wd;
      commit();
    });
    T.views.forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-view");
        if (VIEWS.indexOf(v) < 0) return;
        state.view = v;
        commit();
      });
    });
    if (T.clear) T.clear.addEventListener("click", function () {
      if (T.clear.getAttribute("aria-disabled") === "true") return;
      clearFilters();
    });
    if (T.filterToggle && T.filters) T.filterToggle.addEventListener("click", function () {
      var open = T.filterToggle.getAttribute("aria-expanded") !== "true";
      T.filterToggle.setAttribute("aria-expanded", open ? "true" : "false");
      T.filters.classList.toggle("is-open", open);
    });
    if (T.exportBtn) T.exportBtn.addEventListener("click", function () {
      var list = filtered();
      if (!list.length) {
        PKB.toast({ type: "warning", title: "Ni terminov za izvoz", message: "Spremenite filtre, da bo urnik vseboval vsaj en termin." });
        return;
      }
      var fname = state.programs.length === 1 ? "pk-branik-urnik-" + PKB.slugify(state.programs[0]) + ".ics" : "pk-branik-urnik.ics";
      PKB.downloadICS(list.map(function (s) { return PKB.sessionToEvent(s.raw); }), fname);
    });
    if (T.printBtn) T.printBtn.addEventListener("click", function () {
      preparePrint();
      window.print();
    });
    window.addEventListener("beforeprint", preparePrint);

    if (host) {
      host.addEventListener("click", function (e) {
        var sb = e.target.closest("[data-session]");
        if (sb) { openSession(Number(sb.getAttribute("data-session"))); return; }
        var tab = e.target.closest("[data-daytab]");
        if (tab) { selectDay(Number(tab.getAttribute("data-daytab")), false); return; }
        if (e.target.closest("[data-clear-inline]")) {
          clearFilters();
          var first = qs("[data-session], [data-daytab]", host);
          if (first) first.focus({ preventScroll: true });
        }
      });
      host.addEventListener("keydown", function (e) {
        var tab = e.target.closest && e.target.closest("[data-daytab]");
        if (!tab) return;
        var d = Number(tab.getAttribute("data-daytab")), next = null;
        if (e.key === "ArrowRight") next = d % 7 + 1;
        else if (e.key === "ArrowLeft") next = (d + 5) % 7 + 1;
        else if (e.key === "Home") next = 1;
        else if (e.key === "End") next = 7;
        if (next) { e.preventDefault(); selectDay(next, true); }
      });
    }

    var pools = qs("[data-pools]");
    if (pools) pools.addEventListener("click", function (e) {
      var b = e.target.closest("[data-pool-pick]");
      if (!b) return;
      var name = b.getAttribute("data-pool-pick");
      state.pool = state.pool === name ? "" : name;
      commit();
      if (state.pool) {
        PKB.toast({ type: "info", message: "V urniku so prikazani termini: " + name + ".", timeout: 3000 });
        scrollToBoard();
      }
    });

    var go = qs("[data-goto-today]");
    if (go) go.addEventListener("click", function () {
      var target = targetDay().day;
      state.view = "dan";
      state.day = target;
      commit();
      scrollToBoard();
      var t = qs('[data-daytab="' + target + '"]', host);
      if (t) t.focus({ preventScroll: true });
    });

    /* live clock – every 15 s check whether the minute (or the day) changed */
    var statusSig = signature();
    function tick() {
      var prev = clock;
      clock = readClock();
      if (prev.iso !== clock.iso) {
        if (state.day === prev.wd) state.day = clock.wd;
        renderHero();
        syncToolbar();
        renderView();
        statusSig = signature();
        return;
      }
      if (prev.mins === clock.mins) return;
      renderHero();
      updateNowLine();
      var sig = signature();
      if (sig !== statusSig) {
        statusSig = sig;
        renderView();
      } else if (state.view === "dan" && state.day === clock.wd) {
        var panel = qs("[data-daypanel]", host);
        if (panel && !qs("dialog.modal[open]")) withFocus(panel, function () { panel.innerHTML = dayPanelHTML(filtered(), state.day); });
      }
    }
    setInterval(tick, 15000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });
  }

  function signature() {
    var a = statusOf(SESSIONS), b = statusOf(filtered());
    var ids = function (arr) { return arr.map(function (s) { return s.id; }).join(","); };
    return clock.iso + "|" + ids(a.current) + "|" + ids(a.next) + "|" + ids(b.current) + "|" + ids(b.next);
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  buildToolbar();
  renderLegend();
  renderPools();
  renderHero();
  bind();
  commit({ persist: false });
  if (PKB.params().get("skupina") && state.programs.length === 1) {
    /* deep link: show the board straight away */
    var tgt = qs("#termini");
    if (tgt && !window.location.hash) {
      requestAnimationFrame(function () { tgt.scrollIntoView({ behavior: "instant", block: "start" }); });
    }
  }
  PKB.hydrateIcons(root);
})();
