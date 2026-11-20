/* ==========================================================================
   PK Branik Maribor – shared site runtime
   Loaded with `defer` after data.js and before the page script, so by the
   time a page script runs, window.PKB is fully initialised and the DOM is parsed.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var D = window.PKB_DATA || {};
  var PKB = (window.PKB = window.PKB || {});
  PKB.data = D;
  root.classList.add("js");

  /* ------------------------------------------------------------------
     1. Utilities
     ------------------------------------------------------------------ */
  var qs = function (s, r) { return (r || doc).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  PKB.qs = qs;
  PKB.qsa = qsa;

  PKB.escapeHTML = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  PKB.debounce = function (fn, ms) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms == null ? 200 : ms);
    };
  };
  PKB.normalize = function (s) {
    return String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };
  PKB.slugify = function (s) {
    return PKB.normalize(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  };
  PKB.storage = {
    get: function (k, fallback) {
      try { var v = localStorage.getItem("pkb:" + k); return v === null ? (fallback === undefined ? null : fallback) : JSON.parse(v); }
      catch (e) { return fallback === undefined ? null : fallback; }
    },
    set: function (k, v) { try { localStorage.setItem("pkb:" + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    remove: function (k) { try { localStorage.removeItem("pkb:" + k); } catch (e) { /* ignore */ } }
  };
  PKB.prefersReducedMotion = function () {
    return root.classList.contains("reduce-motion") ||
      (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };
  /** Slovenian plural: forms = [ena, dve, tri/štiri, pet+]  e.g. ["dan","dneva","dnevi","dni"] */
  PKB.plural = function (n, forms) {
    var m = Math.abs(n) % 100;
    if (m === 1) return forms[0];
    if (m === 2) return forms[1];
    if (m === 3 || m === 4) return forms[2];
    return forms[3];
  };
  PKB.params = function () { return new URLSearchParams(window.location.search); };

  /* ---------- dates (all ISO dates are YYYY-MM-DD, treated as local dates) ---------- */
  PKB.parseDate = function (iso) {
    if (iso instanceof Date) return new Date(iso.getFullYear(), iso.getMonth(), iso.getDate());
    var p = String(iso).split("-").map(Number);
    return new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
  };
  /** Today's date at local midnight. Can be overridden for testing with ?danes=YYYY-MM-DD */
  PKB.today = function () {
    var o = PKB.params().get("danes");
    if (o && /^\d{4}-\d{2}-\d{2}$/.test(o)) return PKB.parseDate(o);
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  };
  PKB.toISODate = function (d) {
    var pad = function (x) { return String(x).padStart(2, "0"); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };
  PKB.formatDate = function (iso, opts) {
    var d = PKB.parseDate(iso);
    var o = opts || { day: "numeric", month: "long", year: "numeric" };
    try { return new Intl.DateTimeFormat("sl-SI", o).format(d); } catch (e) { return d.toLocaleDateString(); }
  };
  PKB.formatDateRange = function (start, end) {
    if (!end || end === start) return PKB.formatDate(start);
    var a = PKB.parseDate(start), b = PKB.parseDate(end);
    if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
      return a.getDate() + ".–" + PKB.formatDate(end);
    }
    return PKB.formatDate(start, { day: "numeric", month: "long" }) + " – " + PKB.formatDate(end);
  };
  PKB.daysUntil = function (iso) {
    return Math.round((PKB.parseDate(iso) - PKB.today()) / 86400000);
  };
  /** "danes", "jutri", "včeraj", "čez 5 dni", "pred 3 dnevi" */
  PKB.relativeDay = function (iso) {
    var n = PKB.daysUntil(iso);
    if (n === 0) return "danes";
    if (n === 1) return "jutri";
    if (n === -1) return "včeraj";
    if (n > 0) return "čez " + n + " " + PKB.plural(n, ["dan", "dneva", "dni", "dni"]);
    var a = -n;
    return "pred " + a + " " + PKB.plural(a, ["dnem", "dnevoma", "dnevi", "dnevi"]);
  };
  /** ISO weekday 1 = ponedeljek … 7 = nedelja */
  PKB.isoWeekday = function (d) { var w = (d || PKB.today()).getDay(); return w === 0 ? 7 : w; };
  PKB.timeToMinutes = function (t) { var p = String(t).split(":").map(Number); return p[0] * 60 + (p[1] || 0); };
  PKB.minutesToTime = function (m) { return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };

  /** Swim time "1:02,45" | "58,47" → seconds (number). Returns Infinity for invalid input. */
  PKB.parseSwimTime = function (t) {
    if (!t) return Infinity;
    var s = String(t).trim().replace(",", ".");
    var parts = s.split(":");
    var v = parts.length === 2 ? Number(parts[0]) * 60 + Number(parts[1]) : Number(parts[0]);
    return isNaN(v) ? Infinity : v;
  };
  PKB.formatPrice = function (eur) {
    if (eur == null) return "Po ceniku sekcije";
    try { return new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR", maximumFractionDigits: eur % 1 ? 2 : 0 }).format(eur); }
    catch (e) { return eur + " €"; }
  };
  PKB.formatNumber = function (n, decimals) {
    try { return new Intl.NumberFormat("sl-SI", { minimumFractionDigits: decimals || 0, maximumFractionDigits: decimals || 0 }).format(n); }
    catch (e) { return String(n); }
  };

  /* ---------- data helpers ---------- */
  PKB.programById = function (id) { return (D.programs || []).filter(function (p) { return p.id === id; })[0] || null; };
  PKB.categoryById = function (id) { return (D.programCategories || []).filter(function (c) { return c.id === id; })[0] || null; };
  PKB.sessionsFor = function (programId) {
    return (D.schedule || []).filter(function (s) { return s.program === programId; })
      .sort(function (a, b) { return a.day - b.day || PKB.timeToMinutes(a.start) - PKB.timeToMinutes(b.start); });
  };
  PKB.coachesFor = function (programId) { return (D.coaches || []).filter(function (c) { return c.programs.indexOf(programId) > -1; }); };
  PKB.competitionById = function (id) { return (D.competitions || []).filter(function (c) { return c.id === id; })[0] || null; };
  /** Competition status computed from today's date (ignores the static `status` field). */
  PKB.competitionStatus = function (c) {
    var end = c.endDate || c.date;
    if (PKB.daysUntil(end) < 0) return "past";
    if (PKB.daysUntil(c.date) <= 0) return "live";
    return "upcoming";
  };
  PKB.upcomingCompetitions = function () {
    return (D.competitions || []).filter(function (c) { return PKB.competitionStatus(c) !== "past"; })
      .sort(function (a, b) { return PKB.parseDate(a.date) - PKB.parseDate(b.date); });
  };
  PKB.sortedNews = function () {
    return (D.news || []).slice().sort(function (a, b) { return PKB.parseDate(b.date) - PKB.parseDate(a.date); });
  };
  PKB.initials = function (name) {
    return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
  };

  /* ------------------------------------------------------------------
     2. Icons (Lucide-style, 24×24, stroke = currentColor)
     ------------------------------------------------------------------ */
  var ICONS = {
    menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "arrow-left": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    "arrow-up": '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    "arrow-up-right": '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "chevron-up": '<path d="m18 15-6-6-6 6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    "calendar-plus": '<path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M19 16v6"/><path d="M16 19h6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    "map-pin": '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    medal: '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
    waves: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
    timer: '<path d="M10 2h4"/><path d="m12 14 3-3"/><circle cx="12" cy="14" r="8"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    "check-circle": '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    "alert-circle": '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    "alert-triangle": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    instagram: '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/>',
    youtube: '<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    newspaper: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    sparkles: '<path d="m12 3-1.91 5.81a2 2 0 0 1-1.28 1.28L3 12l5.81 1.91a2 2 0 0 1 1.28 1.28L12 21l1.91-5.81a2 2 0 0 1 1.28-1.28L21 12l-5.81-1.91a2 2 0 0 1-1.28-1.28L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    play: '<path d="M6 3l14 9-14 9V3z"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    minus: '<path d="M5 12h14"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    euro: '<path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
    graduation: '<path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>',
    "zoom-in": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    sort: '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
    "book-open": '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    navigation: '<path d="M3 11l19-9-9 19-2-8-8-2z"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    bus: '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
    bike: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
    command: '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
    "corner-down-left": '<path d="M9 10l-5 5 5 5"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>',
    "message-circle": '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    "file-text": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "refresh": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    "help-circle": '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    "life-buoy": '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/>',
    "thumbs-up": '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
    dumbbell: '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/>',
    "party": '<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98-.7.1-1.22.72-1.22 1.43V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>'
  };
  PKB.iconNames = Object.keys(ICONS);
  /** Returns an inline SVG string. cls is added to class="icon …". */
  PKB.icon = function (name, cls) {
    var body = ICONS[name] || ICONS.info;
    return '<svg class="icon' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + body + "</svg>";
  };
  /** Replace <i data-icon="name" class="..."></i> placeholders with SVG icons. */
  PKB.hydrateIcons = function (scope) {
    qsa("[data-icon]", scope).forEach(function (el) {
      if (el.tagName.toLowerCase() === "svg") return;
      var tmp = doc.createElement("span");
      tmp.innerHTML = PKB.icon(el.getAttribute("data-icon"), el.getAttribute("class") || "");
      el.replaceWith(tmp.firstChild);
    });
  };

  /* ------------------------------------------------------------------
     3. Theme
     ------------------------------------------------------------------ */
  PKB.theme = {
    get: function () { return root.getAttribute("data-theme") || "dark"; },
    /** persist=false only applies the theme (boot); toggling/explicit choice stores it */
    set: function (t, persist) {
      root.setAttribute("data-theme", t);
      if (persist !== false) { try { localStorage.setItem("pkb-theme", t); } catch (e) { /* ignore */ } }
      var meta = qs('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", t === "light" ? "#e9ecef" : "#0e1013");
      qsa(".theme-toggle").forEach(function (b) {
        b.setAttribute("aria-label", t === "light" ? "Vklopi temni način" : "Vklopi svetli način");
        b.removeAttribute("aria-pressed");
      });
      doc.dispatchEvent(new CustomEvent("pkb:themechange", { detail: { theme: t } }));
    },
    toggle: function () {
      var next = PKB.theme.get() === "light" ? "dark" : "light";
      var apply = function () { PKB.theme.set(next); };
      if (doc.startViewTransition && !PKB.prefersReducedMotion()) doc.startViewTransition(apply);
      else apply();
    }
  };
  if (!root.getAttribute("data-theme")) {
    var stored = null;
    try { stored = localStorage.getItem("pkb-theme"); } catch (e) { /* ignore */ }
    root.setAttribute("data-theme", stored || (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  }

  /* ------------------------------------------------------------------
     4. Navigation config, header, drawer, footer
     ------------------------------------------------------------------ */
  var NAV = [
    { id: "domov", href: "index.html", label: "Domov", icon: "home", desc: "Domača stran kluba", keywords: "zacetna domov branik" },
    { id: "o-klubu", href: "o-klubu.html", label: "O klubu", icon: "shield", desc: "Zgodovina, olimpijci, trenerji in vrednote", keywords: "zgodovina olimpijci trenerji ekipa pristan vrednote" },
    { id: "programi", href: "programi.html", label: "Programi", icon: "waves", desc: "Plavalna šola, tekmovalno plavanje in odrasli", keywords: "skupine plavalna sola tecaj cenik clanarina zvezdice rakci zelvice" },
    { id: "urnik", href: "urnik.html", label: "Urnik", icon: "calendar", desc: "Tedenski urnik treningov vseh skupin", keywords: "termini treningi ure koledar" },
    { id: "tekmovanja", href: "tekmovanja.html", label: "Tekmovanja", icon: "trophy", desc: "Koledar tekem, rezultati in klubski rekordi", keywords: "rezultati rekordi miting prvenstvo dp koledar" },
    { id: "novice", href: "novice.html", label: "Novice", icon: "newspaper", desc: "Aktualno dogajanje v klubu", keywords: "obvestila clanki dogodki" },
    { id: "galerija", href: "galerija.html", label: "Galerija", icon: "image", desc: "Utrinki s treningov in tekem", keywords: "slike fotografije album" },
    { id: "kontakt", href: "kontakt.html", label: "Kontakt", icon: "mail", desc: "Naslov, telefon, e-pošta in zemljevid", keywords: "naslov telefon email lokacija pisarna zemljevid" }
  ];
  var CTA = { id: "vpis", href: "vpis.html", label: "Vpis", icon: "sparkles", desc: "Spletna prijava v plavalno šolo ali skupino", keywords: "prijava vpis registracija vpisnina poskusni trening" };
  PKB.nav = NAV.concat([CTA]);

  var currentPage = (doc.body && doc.body.getAttribute("data-page")) || "";
  var C = D.club || {};

  /* Monochrome mark that follows the theme (currentColor) – frosted badge with a "B" and a wave */
  function logoSVG() {
    return '<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
      '<rect x="1.5" y="1.5" width="45" height="45" rx="14" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-opacity=".32"/>' +
      '<path fill="currentColor" fill-rule="evenodd" d="M15 8.5h10.4c4.5 0 7.1 2.2 7.1 5.6 0 2.2-1.1 3.7-2.9 4.5 2.5.7 4.1 2.6 4.1 5.3 0 3.9-2.9 6.5-7.6 6.5H15Zm5 4.2v4.6h5.1c1.8 0 2.8-.8 2.8-2.3s-1-2.3-2.8-2.3Zm0 8.4v5.5h5.7c2 0 3.2-1 3.2-2.75s-1.2-2.75-3.2-2.75Z"/>' +
      '<path d="M9 37.5c2.5-2.4 5-2.4 7.5 0s5 2.4 7.5 0 5-2.4 7.5 0 5 2.4 7.5 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>";
  }
  PKB.logoSVG = logoSVG;

  function renderHeader() {
    var host = qs("[data-site-header]");
    if (!host) return;
    host.classList.add("site-header");
    var links = NAV.filter(function (n) { return n.id !== "domov"; }).map(function (n) {
      var cur = n.id === currentPage ? ' aria-current="page"' : "";
      return '<li><a class="nav-link" href="' + n.href + '"' + cur + ">" + n.label + "</a></li>";
    }).join("");
    host.innerHTML =
      '<div class="nav-shell">' +
        '<a class="brand" href="index.html" aria-label="PK Branik Maribor – domov">' + logoSVG() +
          '<span class="brand-text"><span class="brand-name">PK Branik</span> <span class="brand-sub">Maribor</span></span></a>' +
        '<nav class="nav-primary" aria-label="Glavna navigacija"><ul class="nav-links" role="list">' + links + "</ul></nav>" +
        '<div class="nav-actions">' +
          '<button type="button" class="btn btn--icon search-btn" data-search-open aria-label="Iskanje po strani" aria-keyshortcuts="Control+K">' +
            PKB.icon("search") + '<span class="search-btn__label">Iskanje</span><kbd class="search-btn__kbd" aria-hidden="true">Ctrl K</kbd></button>' +
          '<button type="button" class="btn btn--icon theme-toggle" data-theme-toggle>' +
            PKB.icon("moon", "icon-moon") + PKB.icon("sun", "icon-sun") + "</button>" +
          '<a class="btn btn--primary btn--sm nav-cta" href="' + CTA.href + '"' + (currentPage === "vpis" ? ' aria-current="page"' : "") + ">" + CTA.label + PKB.icon("arrow-right", "icon--move") + "</a>" +
          '<button type="button" class="btn btn--icon menu-toggle" aria-expanded="false" aria-controls="nav-drawer" aria-label="Odpri meni">' + PKB.icon("menu") + "</button>" +
        "</div>" +
      "</div>";

    // drawer
    var overlay = doc.createElement("div");
    overlay.className = "nav-overlay";
    overlay.setAttribute("data-drawer-close", "");
    var drawer = doc.createElement("div");
    drawer.className = "nav-drawer";
    drawer.id = "nav-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-label", "Meni");
    drawer.innerHTML =
      '<div class="nav-drawer__head"><a class="brand" href="index.html" aria-label="PK Branik Maribor – domov">' + logoSVG() +
        '<span class="brand-text"><span class="brand-name">PK Branik</span> <span class="brand-sub">Maribor</span></span></a>' +
        '<button type="button" class="btn btn--icon" data-drawer-close aria-label="Zapri meni">' + PKB.icon("x") + "</button></div>" +
      '<nav aria-label="Mobilna navigacija"><ul class="nav-drawer__links" role="list">' +
        NAV.concat([CTA]).map(function (n) {
          var cur = n.id === currentPage ? ' aria-current="page"' : "";
          return '<li><a href="' + n.href + '"' + cur + ">" + PKB.icon(n.icon) + "<span>" + n.label + "</span></a></li>";
        }).join("") +
      "</ul></nav>" +
      '<div class="nav-drawer__foot">' +
        '<a class="btn btn--primary btn--block" href="vpis.html">' + PKB.icon("sparkles") + "Vpis v plavalno šolo</a>" +
        '<div class="nav-drawer__contact">' +
          '<a href="' + C.phoneHref + '">' + PKB.icon("phone", "icon--sm") + PKB.escapeHTML(C.phone) + "</a>" +
          '<a href="mailto:' + C.email + '">' + PKB.icon("mail", "icon--sm") + PKB.escapeHTML(C.email) + "</a>" +
        "</div>" +
      "</div>";
    doc.body.appendChild(overlay);
    doc.body.appendChild(drawer);

    var toggle = qs(".menu-toggle", host);
    var lastFocus = null;
    function openDrawer() {
      lastFocus = doc.activeElement;
      drawer.classList.add("is-open");
      overlay.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      doc.body.classList.add("is-locked");
      var f = qs('[aria-current="page"]', drawer) || qs("a, button", drawer);
      if (f) f.focus({ preventScroll: true });
    }
    function closeDrawer() {
      if (!drawer.classList.contains("is-open")) return;
      drawer.classList.remove("is-open");
      overlay.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      doc.body.classList.remove("is-locked");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    PKB.closeDrawer = closeDrawer;
    toggle.addEventListener("click", openDrawer);
    qsa("[data-drawer-close]").forEach(function (el) { el.addEventListener("click", closeDrawer); });
    doc.addEventListener("keydown", function (e) {
      if (!drawer.classList.contains("is-open")) return;
      if (e.key === "Escape") { e.preventDefault(); closeDrawer(); }
      else if (e.key === "Tab") {
        if (!drawer.contains(doc.activeElement)) { e.preventDefault(); var f = qs("a, button", drawer); if (f) f.focus(); }
        else trapFocus(e, drawer);
      }
    });
    window.addEventListener("resize", PKB.debounce(function () { if (window.innerWidth >= 1180) closeDrawer(); }, 150));

    // scroll state
    var lastY = window.scrollY;
    var ticking = false;
    function onScroll() {
      var y = window.scrollY;
      host.classList.toggle("is-scrolled", y > 12);
      var goingDown = y > lastY + 4;
      var goingUp = y < lastY - 4;
      if (goingDown && y > 420 && !host.contains(doc.activeElement)) host.classList.add("is-hidden");
      else if (goingUp || y < 200) host.classList.remove("is-hidden");
      lastY = y;
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    host.addEventListener("focusin", function () { host.classList.remove("is-hidden"); });
    onScroll();
  }

  function trapFocus(e, container) {
    var f = qsa('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', container)
      .filter(function (el) { return el.offsetParent !== null || el === doc.activeElement; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  PKB.trapFocus = trapFocus;

  function renderFooter() {
    var host = qs("[data-site-footer]");
    if (!host) return;
    host.classList.add("site-footer");
    var social = C.social || {};
    var socialHTML = ["facebook", "instagram", "youtube"].filter(function (k) { return social[k]; }).map(function (k) {
      var label = { facebook: "Facebook", instagram: "Instagram", youtube: "YouTube" }[k];
      return '<a class="btn btn--icon" href="' + social[k] + '" target="_blank" rel="noopener" aria-label="' + label + ' (odpre se v novem zavihku)">' + PKB.icon(k) + "</a>";
    }).join("");
    var year = new Date().getFullYear();
    host.innerHTML =
      '<div class="container"><div class="footer-panel glass glass--lg">' +
        '<div class="footer-grid">' +
          "<div>" +
            '<a class="brand" href="index.html" aria-label="PK Branik Maribor – domov">' + logoSVG() +
              '<span class="brand-text"><span class="brand-name">PK Branik</span> <span class="brand-sub">Maribor</span></span></a>' +
            '<p class="muted small mt-4" style="max-width:34ch">' + PKB.escapeHTML(C.official || C.name) + ". Plavalna šola, tekmovalno plavanje in rekreacija na Kopališču Pristan.</p>" +
            '<div class="footer-social">' + socialHTML + "</div>" +
          "</div>" +
          "<div>" +
            '<h2 class="footer-title">Klub</h2><ul class="footer-links" role="list">' +
              NAV.concat([CTA]).filter(function (n) { return n.id !== "domov"; }).map(function (n) {
                return '<li><a href="' + n.href + '">' + n.label + "</a></li>";
              }).join("") +
              '<li><a href="zasebnost.html">Varstvo osebnih podatkov</a></li>' +
            "</ul>" +
          "</div>" +
          "<div>" +
            '<h2 class="footer-title">Kontakt</h2>' +
            '<address class="footer-contact">' +
              '<a href="' + C.mapsUrl + '" target="_blank" rel="noopener">' + PKB.icon("map-pin") + "<span>" + PKB.escapeHTML(C.venue) + "<br>" + PKB.escapeHTML(C.address) + ", " + PKB.escapeHTML(C.postal) + "</span></a>" +
              '<a href="' + C.phoneHref + '">' + PKB.icon("phone") + "<span>" + PKB.escapeHTML(C.phone) + "</span></a>" +
              '<a href="mailto:' + C.email + '">' + PKB.icon("mail") + "<span>" + PKB.escapeHTML(C.email) + "</span></a>" +
              "<span>" + PKB.icon("clock") + "<span>Pisarna: pon–pet " + PKB.escapeHTML(((C.officeHours || [])[0] || {}).hours || "") + "</span></span>" +
            "</address>" +
          "</div>" +
          "<div>" +
            '<h2 class="footer-title">Klubske novice</h2>' +
            '<p class="muted small">Enkrat na mesec: rezultati, vpisi in dogodki. Brez neželene pošte.</p>' +
            '<form class="newsletter-form" novalidate data-newsletter>' +
              '<div class="field">' +
                '<label class="visually-hidden" for="nl-email">E-poštni naslov</label>' +
                '<input class="input" id="nl-email" name="email" type="email" required autocomplete="email" placeholder="vas@email.si">' +
                '<p class="field-error" role="alert"></p>' +
              "</div>" +
              '<button class="btn btn--primary" type="submit">' + PKB.icon("send") + "Prijava</button>" +
            "</form>" +
          "</div>" +
        "</div>" +
        '<div class="footer-bottom">' +
          "<span>© " + year + " " + PKB.escapeHTML(C.name) + ". Vse pravice pridržane.</span>" +
          '<span>Sezona ' + PKB.escapeHTML(C.season) + ' · <a href="zasebnost.html">Zasebnost</a> · <a href="#main" data-scroll-top>Na vrh ↑</a></span>' +
        "</div>" +
      "</div></div>";

    var nl = qs("[data-newsletter]", host);
    if (nl) {
      PKB.initForm(nl, {
        onSubmit: function (form) {
          var email = form.email.value.trim();
          // No newsletter backend yet: prepare an e-mail to the club so the sign-up actually reaches someone.
          var subject = "Prijava na klubske novice";
          var body = "Pozdravljeni,\n\nprosim, uvrstite naslov " + email + " na seznam prejemnikov klubskih novic PK Branik.\n\nHvala!";
          form.reset();
          PKB.toast({ type: "success", title: "Skoraj končano", message: "Odprli smo e-poštno sporočilo za prijavo. Pošljite ga in uvrstili vas bomo na seznam." });
          window.location.href = "mailto:" + (C.email || "") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        }
      });
    }
    qsa("[data-scroll-top]", host).forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: PKB.prefersReducedMotion() ? "auto" : "smooth" }); });
    });
  }

  /* ------------------------------------------------------------------
     5. Background scene
     ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------
     Liquid glass refraction: SVG displacement "lens" used by backdrop-filter.
     Only Chromium renders url() backdrop filters, so other engines keep the blur fallback.
     ------------------------------------------------------------------ */
  function lensMap() {
    // R = horizontal, G = vertical displacement; neutral grey (128) in the middle, pushed at the edges
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>" +
      "<defs><linearGradient id='x'><stop offset='0' stop-color='#000'/><stop offset='.09' stop-color='#808080'/><stop offset='.91' stop-color='#808080'/><stop offset='1' stop-color='#f00'/></linearGradient>" +
      "<linearGradient id='y' x2='0' y2='1'><stop offset='0' stop-color='#000'/><stop offset='.13' stop-color='#808080'/><stop offset='.87' stop-color='#808080'/><stop offset='1' stop-color='#0f0'/></linearGradient></defs>" +
      "<rect width='100' height='100' fill='#808080'/><rect width='100' height='100' fill='url(#x)'/>" +
      "<rect width='100' height='100' fill='url(#y)' style='mix-blend-mode:lighten'/></svg>";
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }
  function setupLiquidGlass() {
    var ua = navigator.userAgentData;
    var chromium = !!(ua && ua.brands && ua.brands.some(function (b) { return /Chromium/i.test(b.brand); }));
    var lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory < 4;
    var reduceTransparency = window.matchMedia && window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
    if (!chromium || lowMemory || reduceTransparency || PKB.params().get("lg") === "0") return;
    var map = lensMap();
    var ns = "http://www.w3.org/2000/svg";
    var host = doc.createElementNS(ns, "svg");
    host.setAttribute("width", "0"); host.setAttribute("height", "0"); host.setAttribute("aria-hidden", "true");
    host.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    host.innerHTML =
      '<filter id="pkb-lens" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
        '<feImage href="' + map + '" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" scale="38" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="pkb-lens-sm" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
        '<feImage href="' + map + '" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="map" scale="12" xChannelSelector="R" yChannelSelector="G"/></filter>';
    doc.body.insertBefore(host, doc.body.firstChild);
    root.classList.add("lg-refract");
  }
  PKB.setupLiquidGlass = setupLiquidGlass;

  /** Full-bleed photo behind the frosted glass. Photo = body[data-photo] || pagePhotos[page] || default. */
  function renderBackground() {
    if (qs(".bg-scene")) return;
    var photos = D.pagePhotos || {};
    var src = (doc.body && doc.body.getAttribute("data-photo")) || photos[currentPage] || photos["default"] || "";
    var pos = (doc.body && doc.body.getAttribute("data-photo-pos")) || "";
    var scene = doc.createElement("div");
    scene.className = "bg-scene";
    scene.setAttribute("aria-hidden", "true");
    scene.innerHTML = '<div class="bg-photo"></div><div class="bg-shade"></div><div class="bg-grain"></div>';
    doc.body.insertBefore(scene, doc.body.firstChild);
    var photo = qs(".bg-photo", scene);
    if (pos) photo.style.setProperty("--page-photo-pos", pos);
    if (!src) return;
    // absolute URL: a relative url() inside a custom property would resolve against the stylesheet folder
    var abs = function (u) { try { return new URL(u, doc.baseURI).href; } catch (e) { return u; } };
    var url = 'url("' + abs(src).replace(/"/g, "%22") + '")';
    var img = new Image();
    img.decoding = "async";
    img.onload = function () {
      photo.style.setProperty("--page-photo", url);
      requestAnimationFrame(function () { photo.classList.add("is-loaded"); });
    };
    img.onerror = function () { photo.classList.add("is-loaded"); };
    img.src = src;
    PKB.setBackground = function (newSrc, newPos) {
      var im = new Image();
      im.onload = function () {
        photo.style.setProperty("--page-photo", 'url("' + abs(newSrc).replace(/"/g, "%22") + '")');
        if (newPos) photo.style.setProperty("--page-photo-pos", newPos);
      };
      im.src = newSrc;
    };
  }

  /* ------------------------------------------------------------------
     6. Toasts
     ------------------------------------------------------------------ */
  var toastRegion = null;
  /** PKB.toast("msg") | PKB.toast({ title, message, type: info|success|error|warning, timeout }) */
  PKB.toast = function (opts, type) {
    if (typeof opts === "string") opts = { message: opts, type: type || "info" };
    opts = opts || {};
    if (!toastRegion) {
      toastRegion = doc.createElement("div");
      toastRegion.className = "toast-region";
      toastRegion.setAttribute("role", "status");
      toastRegion.setAttribute("aria-live", "polite");
      doc.body.appendChild(toastRegion);
    }
    var t = opts.type || "info";
    var iconName = { success: "check-circle", error: "alert-circle", warning: "alert-triangle", info: "info" }[t] || "info";
    var el = doc.createElement("div");
    el.className = "toast toast--" + t;
    el.innerHTML =
      '<span class="toast__icon">' + PKB.icon(iconName) + "</span>" +
      '<div class="toast__body">' + (opts.title ? '<div class="toast__title">' + PKB.escapeHTML(opts.title) + "</div>" : "") +
        (opts.message ? "<div>" + PKB.escapeHTML(opts.message) + "</div>" : "") + "</div>" +
      '<button type="button" class="toast__close" aria-label="Zapri obvestilo">' + PKB.icon("x", "icon--sm") + "</button>";
    toastRegion.appendChild(el);
    var remove = function () {
      if (!el.isConnected) return;
      el.classList.add("is-leaving");
      setTimeout(function () { el.remove(); }, 300);
    };
    qs(".toast__close", el).addEventListener("click", remove);
    setTimeout(remove, opts.timeout || 5000);
    return { close: remove, el: el };
  };

  /* ------------------------------------------------------------------
     7. Modal (native <dialog>)
     ------------------------------------------------------------------ */
  var modalCount = 0;
  /**
   * PKB.modal.open({ title, content: string|Node, footer: string|Node, size: "sm"|"lg"|"full",
   *                  className, onClose, ariaLabel, initialFocus: selector|Element }) → { dialog, body, close }
   */
  PKB.modal = {
    open: function (opts) {
      opts = opts || {};
      var id = "modal-" + (++modalCount);
      var dlg = doc.createElement("dialog");
      dlg.className = "modal" + (opts.size ? " modal--" + opts.size : "") + (opts.className ? " " + opts.className : "");
      if (opts.title) dlg.setAttribute("aria-labelledby", id + "-title");
      else if (opts.ariaLabel) dlg.setAttribute("aria-label", opts.ariaLabel);
      dlg.innerHTML =
        (opts.title || opts.showHead !== false ?
          '<div class="modal__head">' + (opts.title ? '<h2 class="modal__title" id="' + id + '-title">' + PKB.escapeHTML(opts.title) + "</h2>" : "<span></span>") +
          '<button type="button" class="btn btn--icon btn--sm" data-modal-close aria-label="Zapri">' + PKB.icon("x") + "</button></div>" : "") +
        '<div class="modal__body"></div>' + (opts.footer ? '<div class="modal__foot"></div>' : "");
      var body = qs(".modal__body", dlg);
      if (typeof opts.content === "string") body.innerHTML = opts.content;
      else if (opts.content) body.appendChild(opts.content);
      if (opts.footer) {
        var foot = qs(".modal__foot", dlg);
        if (typeof opts.footer === "string") foot.innerHTML = opts.footer;
        else foot.appendChild(opts.footer);
      }
      doc.body.appendChild(dlg);
      var opener = doc.activeElement;
      var closed = false;
      function close() {
        if (closed) return;
        closed = true;
        var finish = function () {
          if (dlg.open) dlg.close();
          dlg.remove();
          if (!qs("dialog.modal[open]")) doc.body.classList.remove("is-locked");
          if (opener && opener.focus && opener.isConnected) opener.focus();
          if (typeof opts.onClose === "function") opts.onClose();
        };
        if (PKB.prefersReducedMotion()) finish();
        else { dlg.classList.add("is-closing"); setTimeout(finish, 200); }
      }
      dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
      dlg.addEventListener("click", function (e) {
        if (e.target.closest("[data-modal-close]")) { close(); return; }
        if (e.target === dlg) {
          var r = dlg.getBoundingClientRect();
          var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
          if (!inside || (e.clientX === 0 && e.clientY === 0)) close();
        }
      });
      doc.body.classList.add("is-locked");
      if (typeof dlg.showModal === "function") dlg.showModal();
      else dlg.setAttribute("open", "");
      PKB.hydrateIcons(dlg);
      if (opts.initialFocus) {
        var target = typeof opts.initialFocus === "string" ? qs(opts.initialFocus, dlg) : opts.initialFocus;
        if (target && target.focus) target.focus();
      }
      return { dialog: dlg, body: body, close: close };
    }
  };

  /* ------------------------------------------------------------------
     8. Forms & validation (Slovenian messages)
     ------------------------------------------------------------------ */
  function messageFor(el) {
    var v = el.validity;
    if (el.dataset.msg && !v.valid) return el.dataset.msg;
    if (v.valueMissing) {
      if (el.type === "checkbox") return "Potrebna je vaša potrditev.";
      if (el.type === "radio") return "Izberite eno od možnosti.";
      if (el.tagName === "SELECT") return "Izberite eno od možnosti.";
      return "To polje je obvezno.";
    }
    if (v.typeMismatch && el.type === "email") return "Vnesite veljaven e-poštni naslov (npr. ime@domena.si).";
    if (v.typeMismatch && el.type === "url") return "Vnesite veljaven spletni naslov.";
    if (v.tooShort) return "Vnesite vsaj " + el.minLength + " znakov (trenutno " + el.value.length + ").";
    if (v.tooLong) return "Vnesite največ " + el.maxLength + " znakov.";
    if (v.patternMismatch) return el.dataset.patternMsg || "Vnesena vrednost ni v pravilni obliki.";
    if (v.rangeUnderflow) return "Najmanjša dovoljena vrednost je " + el.min + ".";
    if (v.rangeOverflow) return "Največja dovoljena vrednost je " + el.max + ".";
    if (v.badInput) return "Vnesite veljavno vrednost.";
    if (v.customError) return el.validationMessage;
    return "";
  }
  /** Validate one control; shows/hides the message in its .field. Returns true when valid. */
  PKB.validateField = function (el) {
    if (!el || !el.willValidate) return true;
    var field = el.closest(".field");
    var valid = el.checkValidity();
    if (el.type === "radio" && el.name && el.form) {
      var group = el.form.querySelectorAll('input[type="radio"][name="' + el.name + '"]');
      valid = Array.prototype.some.call(group, function (r) { return r.checked; }) || !Array.prototype.some.call(group, function (r) { return r.required; });
    }
    el.setAttribute("aria-invalid", valid ? "false" : "true");
    if (field) {
      field.classList.toggle("is-invalid", !valid);
      field.classList.toggle("is-valid", valid && (el.type === "checkbox" || el.type === "radio" ? el.checked : !!el.value));
      var err = qs(".field-error", field);
      if (!err) {
        err = doc.createElement("p");
        err.className = "field-error";
        field.appendChild(err);
      }
      if (!err.id) err.id = (el.id || el.name || "f") + "-error";
      var describedBy = (el.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
      if (!valid) {
        err.innerHTML = PKB.icon("alert-circle", "icon--sm") + "<span>" + PKB.escapeHTML(messageFor(el)) + "</span>";
        if (describedBy.indexOf(err.id) === -1) { describedBy.push(err.id); el.setAttribute("aria-describedby", describedBy.join(" ")); }
      } else {
        err.textContent = "";
      }
    }
    return valid;
  };
  /** Validate a whole form or a container (e.g. one step of a multi-step form). */
  PKB.validateForm = function (scope) {
    var controls = qsa("input, select, textarea", scope).filter(function (el) { return el.willValidate && !el.closest("[hidden]") && !el.closest(".honeypot"); });
    var firstInvalid = null;
    controls.forEach(function (el) {
      var ok = PKB.validateField(el);
      if (!ok && !firstInvalid) firstInvalid = el;
    });
    if (firstInvalid) firstInvalid.focus({ preventScroll: false });
    return { valid: !firstInvalid, firstInvalid: firstInvalid };
  };
  /**
   * Wire live validation + submit. opts.onSubmit(form, data) is called only when valid.
   * Honeypot: any input inside .honeypot that is filled silently aborts.
   */
  PKB.initForm = function (form, opts) {
    opts = opts || {};
    form.setAttribute("novalidate", "");
    form.addEventListener("blur", function (e) {
      var el = e.target;
      if (el.matches && el.matches("input, select, textarea") && (el.value || el.closest(".field.is-invalid"))) PKB.validateField(el);
    }, true);
    form.addEventListener("input", function (e) {
      var el = e.target;
      if (el.closest && el.closest(".field.is-invalid")) PKB.validateField(el);
    });
    form.addEventListener("change", function (e) {
      var el = e.target;
      if (el.type === "checkbox" || el.type === "radio" || el.tagName === "SELECT") PKB.validateField(el);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var hp = qs(".honeypot input", form);
      if (hp && hp.value) return;
      var res = PKB.validateForm(form);
      if (!res.valid) {
        PKB.toast({ type: "error", title: "Preverite obrazec", message: "Nekatera polja niso pravilno izpolnjena." });
        return;
      }
      if (typeof opts.onSubmit === "function") opts.onSubmit(form, Object.fromEntries(new FormData(form).entries()));
    });
  };

  /* ------------------------------------------------------------------
     9. Clipboard, sharing, calendar export
     ------------------------------------------------------------------ */
  PKB.copy = function (text, okMsg) {
    var done = function () { PKB.toast({ type: "success", message: okMsg || "Kopirano v odložišče." }); };
    var fail = function () { PKB.toast({ type: "error", message: "Kopiranje ni uspelo." }); };
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(done, fail);
    }
    try {
      var ta = doc.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      doc.body.appendChild(ta);
      ta.select();
      doc.execCommand("copy");
      ta.remove();
      done();
    } catch (e) { fail(); }
    return Promise.resolve();
  };
  PKB.share = function (data) {
    if (navigator.share) return navigator.share(data).catch(function () { /* cancelled */ });
    return PKB.copy(data.url || window.location.href, "Povezava je kopirana v odložišče.");
  };
  PKB.download = function (filename, content, mime) {
    var blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = doc.createElement("a");
    a.href = url;
    a.download = filename;
    doc.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
  };

  function icsDate(d) {
    var pad = function (x) { return String(x).padStart(2, "0"); };
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "T" + pad(d.getHours()) + pad(d.getMinutes()) + "00";
  }
  function icsEscape(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }
  /* RFC 5545 line folding at 75 octets (UTF-8 aware, never splits a character) */
  function icsFold(line) {
    var out = [], cur = "", bytes = 0, limit = 75;
    Array.from(line).forEach(function (ch) {
      var b = unescape(encodeURIComponent(ch)).length;
      if (bytes + b > limit) { out.push(cur); cur = " "; bytes = 1; limit = 75; }
      cur += ch; bytes += b;
    });
    out.push(cur);
    return out.join("\r\n");
  }
  /**
   * events: [{ title, start: Date, end: Date, location, description, allDay?: bool, rrule?: "FREQ=WEEKLY;UNTIL=..." }]
   * Downloads an .ics file (Europe/Ljubljana).
   */
  PKB.downloadICS = function (events, filename) {
    var stamp = icsDate(new Date());
    var lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PK Branik Maribor//Spletna stran//SL", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VTIMEZONE", "TZID:Europe/Ljubljana",
      "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
      "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
      "END:VTIMEZONE"
    ];
    events.forEach(function (ev, i) {
      lines.push("BEGIN:VEVENT");
      lines.push("UID:" + stamp + "-" + i + "-" + PKB.slugify(ev.title) + "@pkbranik");
      lines.push("DTSTAMP:" + stamp);
      if (ev.allDay) {
        var s = PKB.toISODate(ev.start).replace(/-/g, "");
        var endD = new Date((ev.end || ev.start).getTime());
        endD.setDate(endD.getDate() + 1);
        lines.push("DTSTART;VALUE=DATE:" + s);
        lines.push("DTEND;VALUE=DATE:" + PKB.toISODate(endD).replace(/-/g, ""));
      } else {
        lines.push("DTSTART;TZID=Europe/Ljubljana:" + icsDate(ev.start));
        lines.push("DTEND;TZID=Europe/Ljubljana:" + icsDate(ev.end || ev.start));
      }
      if (ev.rrule) lines.push("RRULE:" + ev.rrule);
      lines.push(icsFold("SUMMARY:" + icsEscape(ev.title)));
      if (ev.location) lines.push(icsFold("LOCATION:" + icsEscape(ev.location)));
      if (ev.description) lines.push(icsFold("DESCRIPTION:" + icsEscape(ev.description)));
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    PKB.download(filename || "pk-branik.ics", lines.join("\r\n"), "text/calendar;charset=utf-8");
    PKB.toast({ type: "success", title: "Koledar je pripravljen", message: "Datoteko .ics odprite, da termine dodate v svoj koledar." });
  };
  /** Turn a weekly schedule entry into an ICS event recurring until the end of the school year (24 June). */
  PKB.sessionToEvent = function (session) {
    var p = PKB.programById(session.program) || { name: session.program };
    var today = PKB.today();
    var diff = (session.day - PKB.isoWeekday(today) + 7) % 7;
    var date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
    var sm = PKB.timeToMinutes(session.start), em = PKB.timeToMinutes(session.end);
    var start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(sm / 60), sm % 60);
    var end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(em / 60), em % 60);
    var seasonEndYear = today.getMonth() >= 6 ? today.getFullYear() + 1 : today.getFullYear();
    return {
      title: "PK Branik – " + p.name,
      start: start, end: end,
      location: (C.venue || "") + " (" + session.pool + "), " + (C.address || "") + ", " + (C.postal || ""),
      description: "Trening skupine " + p.name + " (" + session.pool + "). Plavalni klub Branik Maribor.",
      rrule: "FREQ=WEEKLY;UNTIL=" + seasonEndYear + "0624T235959Z"
    };
  };

  /* ------------------------------------------------------------------
     10. Reveal-on-scroll, counters, tabs (auto-init + MutationObserver)
     ------------------------------------------------------------------ */
  var io = null;
  function revealEl(el) {
    el.classList.add("is-revealed");
    qsa("[data-count-to]", el).forEach(countUp);
    if (el.hasAttribute("data-count-to")) countUp(el);
  }
  function setupReveal(scope) {
    var groups = qsa("[data-reveal-stagger]", scope);
    if (scope && scope.nodeType === 1 && scope.matches("[data-reveal-stagger]")) groups.unshift(scope);
    groups.forEach(function (group) {
      var step = Number(group.getAttribute("data-reveal-stagger")) || 80;
      qsa(":scope > [data-reveal]", group).forEach(function (child, i) {
        if (!child.style.getPropertyValue("--reveal-delay")) child.style.setProperty("--reveal-delay", Math.min(i * step, 600) + "ms");
      });
    });
    var els = qsa("[data-reveal]:not(.is-revealed)", scope);
    if (scope && scope.nodeType === 1 && scope.matches("[data-reveal]:not(.is-revealed)")) els.unshift(scope);
    if (PKB.prefersReducedMotion() || !("IntersectionObserver" in window)) { els.forEach(revealEl); return; }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { revealEl(en.target); io.unobserve(en.target); }
        });
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0 });
    }
    els.forEach(function (el) { io.observe(el); });
  }
  PKB.reveal = setupReveal;

  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = "1";
    var to = Number(el.getAttribute("data-count-to")) || 0;
    var dec = Number(el.getAttribute("data-count-decimals")) || 0;
    var pre = el.getAttribute("data-count-prefix") || "";
    var suf = el.getAttribute("data-count-suffix") || "";
    var dur = Number(el.getAttribute("data-count-duration")) || 1600;
    var render = function (v) { el.textContent = pre + PKB.formatNumber(v, dec) + suf; };
    if (PKB.prefersReducedMotion()) { render(to); return; }
    var t0 = null;
    var step = function (ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      render(to * eased);
      if (p < 1) requestAnimationFrame(step); else render(to);
    };
    requestAnimationFrame(step);
  }
  PKB.countUp = countUp;
  function setupCounters(scope) {
    qsa("[data-count-to]", scope).forEach(function (el) {
      var revealAncestor = el.closest("[data-reveal]");
      if (revealAncestor && revealAncestor.classList.contains("is-revealed")) { countUp(el); return; }
      if (!revealAncestor) {
        if (!("IntersectionObserver" in window)) { countUp(el); return; }
        var o = new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) { countUp(el); o.disconnect(); }
        }, { threshold: 0.4 });
        o.observe(el);
      }
    });
  }

  /**
   * Tabs: <div data-tabs [data-tabs-hash]> <div role="tablist"> <button role="tab" aria-controls="p1">…</button>…</div>
   *        <div role="tabpanel" id="p1">…</div> … </div>
   * Fires "tabchange" (detail: { tab, panel, id }) on the container.
   */
  PKB.initTabs = function (container) {
    if (container.dataset.tabsReady) return;
    container.dataset.tabsReady = "1";
    var tabs = qsa('[role="tab"]', container).filter(function (t) { return t.closest("[data-tabs]") === container; });
    if (!tabs.length) return;
    var useHash = container.hasAttribute("data-tabs-hash");
    var list = tabs[0].closest(".tabs-list");
    var lens = null;
    if (list && !qs(":scope > .tabs-lens", list)) {
      lens = doc.createElement("span");
      lens.className = "tabs-lens";
      lens.setAttribute("aria-hidden", "true");
      list.insertBefore(lens, list.firstChild);
      list.classList.add("has-lens");
    }
    function moveLens() {
      if (!lens) return;
      var cur = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0];
      if (!cur || !cur.offsetWidth) return;
      lens.style.width = cur.offsetWidth + "px";
      lens.style.transform = "translateX(" + cur.offsetLeft + "px)";
    }
    if (lens && "ResizeObserver" in window) new ResizeObserver(moveLens).observe(list);
    function select(tab, focus, silent) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.setAttribute("tabindex", on ? "0" : "-1");
        var panel = doc.getElementById(t.getAttribute("aria-controls"));
        if (panel) {
          panel.hidden = !on;
          if (on) { panel.classList.remove("is-entering"); void panel.offsetWidth; panel.classList.add("is-entering"); }
        }
      });
      if (focus) tab.focus();
      moveLens();
      var pid = tab.getAttribute("aria-controls");
      if (useHash && !silent && history.replaceState) history.replaceState(null, "", "#" + pid);
      container.dispatchEvent(new CustomEvent("tabchange", { bubbles: true, detail: { tab: tab, panel: doc.getElementById(pid), id: pid } }));
    }
    tabs.forEach(function (t, i) {
      var panel = doc.getElementById(t.getAttribute("aria-controls"));
      if (panel) {
        panel.setAttribute("role", "tabpanel");
        if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "0");
        if (t.id) panel.setAttribute("aria-labelledby", t.id);
      }
      t.addEventListener("click", function () { select(t, false); });
      t.addEventListener("keydown", function (e) {
        var idx = tabs.indexOf(t), next = null;
        if (e.key === "ArrowRight") next = tabs[(idx + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(idx - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
    var initial = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0];
    if (useHash && window.location.hash) {
      var fromHash = tabs.filter(function (t) { return "#" + t.getAttribute("aria-controls") === window.location.hash; })[0];
      if (fromHash) initial = fromHash;
    }
    select(initial, false, true);
    container.selectTab = function (panelId) {
      var t = tabs.filter(function (x) { return x.getAttribute("aria-controls") === panelId; })[0];
      if (t) select(t, false);
    };
  };

  /* Ripple + spotlight micro-interactions */
  function setupMicroInteractions() {
    doc.addEventListener("pointerdown", function (e) {
      var btn = e.target.closest && e.target.closest(".btn:not(.btn--link)");
      if (!btn || PKB.prefersReducedMotion()) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height);
      var s = doc.createElement("span");
      s.className = "btn-ripple";
      s.style.width = s.style.height = size + "px";
      s.style.left = e.clientX - r.left - size / 2 + "px";
      s.style.top = e.clientY - r.top - size / 2 + "px";
      btn.appendChild(s);
      setTimeout(function () { s.remove(); }, 650);
    });
    var raf = 0;
    doc.addEventListener("pointermove", function (e) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var card = e.target.closest && e.target.closest(".card, .btn, .glass");
        if (!card) return;
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     11. Back-to-top with progress ring
     ------------------------------------------------------------------ */
  function setupToTop() {
    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "to-top";
    btn.setAttribute("aria-label", "Nazaj na vrh strani");
    var R = 25, CIRC = 2 * Math.PI * R;
    btn.innerHTML = '<svg class="ring" viewBox="0 0 54 54" aria-hidden="true"><circle class="ring-track" cx="27" cy="27" r="' + R + '"/>' +
      '<circle class="ring-bar" cx="27" cy="27" r="' + R + '" stroke-dasharray="' + CIRC + '" stroke-dashoffset="' + CIRC + '"/></svg>' + PKB.icon("arrow-up");
    doc.body.appendChild(btn);
    var bar = qs(".ring-bar", btn);
    var update = function () {
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? window.scrollY / max : 0;
      bar.setAttribute("stroke-dashoffset", String(CIRC * (1 - p)));
      btn.classList.toggle("is-visible", window.scrollY > 700);
    };
    window.addEventListener("scroll", update, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: PKB.prefersReducedMotion() ? "auto" : "smooth" });
      var skip = qs("#main");
      if (skip) { skip.setAttribute("tabindex", "-1"); skip.focus({ preventScroll: true }); }
    });
    update();
  }

  /* ------------------------------------------------------------------
     12. Site search (command palette) – Ctrl/⌘+K or "/"
     ------------------------------------------------------------------ */
  function buildIndex() {
    var idx = [];
    PKB.nav.forEach(function (n) {
      idx.push({ group: "Strani", title: n.label, sub: n.desc, href: n.href, icon: n.icon, keys: n.keywords || "" });
    });
    (D.programs || []).forEach(function (p) {
      idx.push({ group: "Programi", title: p.name, sub: p.level + " · " + p.ages, href: "programi.html#" + p.id, icon: p.icon, keys: (p.summary || "") + " " + (PKB.categoryById(p.category) || {}).name });
    });
    PKB.sortedNews().forEach(function (n) {
      idx.push({ group: "Novice", title: n.title, sub: PKB.formatDate(n.date) + " · " + n.category, href: "novice.html?clanek=" + n.id, icon: "newspaper", keys: n.excerpt });
    });
    (D.competitions || []).forEach(function (c) {
      idx.push({ group: "Tekmovanja", title: c.name, sub: PKB.formatDateRange(c.date, c.endDate) + " · " + c.city, href: "tekmovanja.html#" + c.id, icon: "trophy", keys: c.venue + " " + c.level });
    });
    (D.coaches || []).forEach(function (c) {
      idx.push({ group: "Trenerji", title: c.name, sub: c.role, href: "o-klubu.html#trener-" + c.id, icon: "user", keys: c.bio });
    });
    (D.faq || []).forEach(function (f, i) {
      idx.push({ group: "Pogosta vprašanja", title: f.q, sub: f.a, href: (f.topic === "kontakt" ? "kontakt.html" : "programi.html") + "#faq", icon: "help-circle", keys: f.a });
    });
    idx.push({ group: "Hitra dejanja", title: "Preklopi svetli/temni način", sub: "Spremeni videz strani", action: "theme", icon: "moon", keys: "tema dark light temni svetli" });
    idx.push({ group: "Hitra dejanja", title: "Pokliči klub", sub: C.phone, href: C.phoneHref, icon: "phone", keys: "telefon klic" });
    idx.push({ group: "Hitra dejanja", title: "Kopiraj e-poštni naslov", sub: C.email, action: "copy-email", icon: "copy", keys: "email mail posta" });
    idx.forEach(function (it) { it._t = PKB.normalize(it.title); it._k = PKB.normalize(it.sub + " " + it.keys); });
    return idx;
  }
  function highlight(text, q) {
    if (!q) return PKB.escapeHTML(text);
    var chars = Array.from(text);
    var normChars = chars.map(function (ch) { var n = PKB.normalize(ch); return n.length === 1 ? n : ch.toLowerCase(); });
    var hay = normChars.join("");
    if (hay.length !== chars.length) return PKB.escapeHTML(text);
    var i = hay.indexOf(q);
    if (i < 0) return PKB.escapeHTML(text);
    return PKB.escapeHTML(chars.slice(0, i).join("")) + "<mark>" + PKB.escapeHTML(chars.slice(i, i + q.length).join("")) + "</mark>" + PKB.escapeHTML(chars.slice(i + q.length).join(""));
  }
  /** Diacritics-insensitive highlighter: returns escaped HTML with the first match of normalized query q in <mark>. */
  PKB.highlight = function (text, q) { return highlight(String(text == null ? "" : text), PKB.normalize(q || "").trim()); };

  function setupSearch() {
    var index = null;
    var dlg = null, input, list, empty, items = [], active = 0;

    function search(qRaw) {
      var q = PKB.normalize(qRaw.trim());
      if (!q) {
        return index.filter(function (it) { return it.group === "Strani" || it.group === "Hitra dejanja"; });
      }
      var terms = q.split(/\s+/);
      return index.map(function (it) {
        var score = 0;
        var all = true;
        terms.forEach(function (t) {
          if (it._t.indexOf(t) === 0) score += 6;
          else if (it._t.indexOf(" " + t) > -1) score += 4;
          else if (it._t.indexOf(t) > -1) score += 3;
          else if (it._k.indexOf(t) > -1) score += 1;
          else all = false;
        });
        return { it: it, score: all ? score : 0 };
      }).filter(function (r) { return r.score > 0; })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, 14).map(function (r) { return r.it; });
    }
    function render() {
      var q = input.value;
      items = search(q);
      var qn = PKB.normalize(q.trim()).split(/\s+/)[0] || "";
      if (!items.length) {
        list.innerHTML = "";
        list.hidden = true;
        empty.hidden = false;
        empty.innerHTML = 'Ni zadetkov za »' + PKB.escapeHTML(q) + '«.<br><span class="small soft">Poskusite z drugo besedo, npr. »urnik« ali »vpis«.</span>';
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
        return;
      }
      list.hidden = false;
      empty.hidden = true;
      input.setAttribute("aria-expanded", "true");
      var html = "", lastGroup = null;
      items.forEach(function (it, i) {
        if (it.group !== lastGroup) { html += '<li class="cmdk__group" role="presentation">' + PKB.escapeHTML(it.group) + "</li>"; lastGroup = it.group; }
        html += '<li class="cmdk__item" role="option" id="cmdk-opt-' + i + '" aria-selected="' + (i === active) + '" data-i="' + i + '">' +
          '<div class="cmdk__link"><span class="icon-bubble" aria-hidden="true">' + PKB.icon(it.icon) + "</span>" +
          '<span class="cmdk__item-text"><span class="cmdk__item-title">' + highlight(it.title, qn) + '</span><span class="cmdk__item-sub">' + PKB.escapeHTML(it.sub || "") + "</span></span></div></li>";
      });
      list.innerHTML = html;
      input.setAttribute("aria-activedescendant", "cmdk-opt-" + active);
    }
    function setActive(i) {
      if (!items.length) return;
      active = (i + items.length) % items.length;
      qsa(".cmdk__item", list).forEach(function (li) { li.setAttribute("aria-selected", String(Number(li.dataset.i) === active)); });
      input.setAttribute("aria-activedescendant", "cmdk-opt-" + active);
      var el = doc.getElementById("cmdk-opt-" + active);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
    function run(it, m) {
      if (!it) return;
      if (it.action === "theme") { m.close(); PKB.theme.toggle(); return; }
      if (it.action === "copy-email") { m.close(); PKB.copy(C.email, "E-poštni naslov je kopiran."); return; }
      m.close();
      var url = new URL(it.href, window.location.href);
      var samePage = url.pathname === window.location.pathname && url.search === window.location.search;
      window.location.href = it.href;
      if (samePage && url.hash) {
        // same-page hash navigation: let page scripts react
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    }
    function open() {
      if (dlg) return;
      if (!index) index = buildIndex();
      PKB.closeDrawer && PKB.closeDrawer();
      var wrap = doc.createElement("div");
      wrap.innerHTML =
        '<div class="cmdk__input-wrap">' + PKB.icon("search") +
          '<input class="cmdk__input" type="text" enterkeyhint="go" placeholder="Iščite strani, programe, novice …" aria-label="Iskanje po strani" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" autocomplete="off" spellcheck="false">' +
          '<button type="button" class="btn btn--icon btn--sm" data-modal-close aria-label="Zapri iskanje">' + PKB.icon("x") + "</button></div>" +
        '<ul class="cmdk__results" id="cmdk-list" role="listbox" aria-label="Rezultati iskanja"></ul>' +
        '<div class="cmdk__empty" role="status" hidden></div>' +
        '<div class="cmdk__foot"><span><kbd>↑</kbd><kbd>↓</kbd> premik</span><span><kbd>Enter</kbd> odpri</span><span><kbd>Esc</kbd> zapri</span></div>';
      var m = PKB.modal.open({ content: wrap, className: "cmdk", ariaLabel: "Iskanje po strani", showHead: false, onClose: function () { dlg = null; } });
      dlg = m.dialog;
      input = qs(".cmdk__input", wrap);
      list = qs(".cmdk__results", wrap);
      empty = qs(".cmdk__empty", wrap);
      active = 0;
      render();
      input.focus();
      input.addEventListener("input", function () { active = 0; render(); });
      input.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
        else if (e.key === "Enter") { e.preventDefault(); run(items[active], m); }
        else if (e.key === "Escape") { e.preventDefault(); m.close(); }
      });
      list.addEventListener("click", function (e) {
        var li = e.target.closest(".cmdk__item");
        if (!li) return;
        e.preventDefault();
        run(items[Number(li.dataset.i)], m);
      });
      list.addEventListener("mousemove", function (e) {
        var li = e.target.closest(".cmdk__item");
        if (li && Number(li.dataset.i) !== active) setActive(Number(li.dataset.i));
      });
    }
    PKB.openSearch = open;
    doc.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("[data-search-open]")) { e.preventDefault(); open(); }
    });
    doc.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || "") || (e.target && e.target.isContentEditable);
      var otherDialog = !dlg && qs("dialog.modal[open]");
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { if (!otherDialog) { e.preventDefault(); open(); } }
      else if (e.key === "/" && !typing && !dlg && !otherDialog) { e.preventDefault(); open(); }
    });
  }

  /* ------------------------------------------------------------------
     13. Boot
     ------------------------------------------------------------------ */
  function boot() {
    setupLiquidGlass();
    renderBackground();
    renderHeader();
    renderFooter();
    PKB.theme.set(PKB.theme.get(), false);
    qsa("[data-theme-toggle]").forEach(function (b) { b.addEventListener("click", PKB.theme.toggle); });
    PKB.hydrateIcons(doc);
    setupMicroInteractions();
    setupToTop();
    setupSearch();
    setupReveal(doc);
    setupCounters(doc);
    qsa("[data-tabs]").forEach(PKB.initTabs);

    // Auto-handle dynamically inserted content
    if ("MutationObserver" in window) {
      var mo = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType !== 1) return;
            if (n.hasAttribute("data-icon") || qs("[data-icon]", n)) PKB.hydrateIcons(n.parentNode || n);
            if (n.matches("[data-reveal], [data-reveal-stagger]") || qs("[data-reveal]", n)) setupReveal(n.parentNode || n);
            if (n.matches("[data-count-to]") || qs("[data-count-to]", n)) setupCounters(n.parentNode || n);
            if (n.matches("[data-tabs]")) PKB.initTabs(n);
            qsa("[data-tabs]", n).forEach(PKB.initTabs);
          });
        });
      });
      mo.observe(doc.body, { childList: true, subtree: true });
    }

    // Respond to OS-level reduced motion changes
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      var onMq = function () { if (mq.matches) qsa("[data-reveal]").forEach(revealEl); };
      if (mq.addEventListener) mq.addEventListener("change", onMq);
    }
    doc.dispatchEvent(new CustomEvent("pkb:ready"));
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
