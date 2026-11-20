/* ==========================================================================
   Vpis (vpis.html) – multi-step enrolment form. Prefix: enr-
   Steps: 1 Program · 2 Plavalec · 3 Kontakt · 4 Pregled
   - ?program=<id> preselects a programme; #korak-N deep-links a step
   - draft autosave in PKB.storage ("vpis-osnutek"), restore banner
   - live summary (sticky aside on desktop, bottom bar + sheet on mobile)
   - success state: reference number, ICS of the first training, mailto
   ========================================================================== */
(function () {
  "use strict";

  var PKB = window.PKB;
  if (!PKB) return;
  var D = PKB.data || {};
  var qs = PKB.qs, qsa = PKB.qsa, esc = PKB.escapeHTML;

  var root = qs("[data-enr]");
  var form = qs("[data-form]");
  if (!root || !form) return;

  /* ------------------------------------------------------------------
     Data
     ------------------------------------------------------------------ */
  var club = D.club || {};
  var pricing = D.pricing || {};
  var cats = Array.isArray(D.programCategories) ? D.programCategories.filter(function (c) { return c && c.id; }) : [];
  var programs = (Array.isArray(D.programs) ? D.programs : []).filter(function (p) { return p && p.id && p.name; });
  var DAYS_SHORT = Array.isArray(D.daysShort) && D.daysShort.length === 7 ? D.daysShort : ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];
  var STORE = "vpis-osnutek";
  var STEPS = 4;
  var STEP_NAMES = ["Program", "Plavalec", "Kontakt", "Pregled"];
  var DRAFT_FIELDS = ["program", "ime", "priimek", "rojstvo", "spol", "predznanje", "skrbnik", "email", "telefon", "naslov", "posta", "kraj", "sorojenec"];
  var CONTACT_FIELDS = ["priimek", "skrbnik", "email", "telefon", "naslov", "posta", "kraj"];
  var SKILLS = [
    { v: 0, key: "ne-plava", title: "Ne zna plavati" },
    { v: 1, key: "pripomocki", title: "Plava s pripomočki" },
    { v: 2, key: "10m", title: "Preplava 10 m" },
    { v: 3, key: "25m", title: "Preplava 25 m" },
    { v: 4, key: "tehnike", title: "Obvlada vse tehnike" }
  ];
  var SKILL_BY_KEY = { "ne-plava": 0, pripomocki: 1, "10m": 2, "25m": 3, tehnike: 4, tekmovalno: 6 };
  var siblingRate = typeof pricing.siblingDiscount === "number" && pricing.siblingDiscount > 0 && pricing.siblingDiscount < 1 ? pricing.siblingDiscount : 0;
  var enrollFee = typeof pricing.enrollmentFee === "number" ? pricing.enrollmentFee : null;
  var RECO_MIN = 3, RECO_MAX = 18;

  /* ------------------------------------------------------------------
     Elements
     ------------------------------------------------------------------ */
  var el = {
    panel: qs("[data-panel]", root),
    stepperWrap: qs("[data-stepper-wrap]", root),
    stepper: qs("[data-stepper]", root),
    stepperProgress: qs("[data-stepper-progress]", root),
    steps: qsa("[data-step]", form),
    back: qs("[data-back]", form),
    next: qs("[data-next]", form),
    nextLabel: qs("[data-next-label]", form),
    nextIcon: qs("[data-next-icon]", form),
    saveStatus: qs("[data-save-status]", form),
    programs: qs("[data-programs]", form),
    programsField: qs("[data-programs-field]", form),
    reco: qs("[data-reco]", form),
    recoToggle: qs("[data-reco-toggle]", form),
    recoPanel: qs("[data-reco-panel]", form),
    recoAge: qs("[data-reco-age]", form),
    recoAgeOut: qs("[data-reco-age-out]", form),
    recoSkills: qs("[data-reco-skills]", form),
    recoResult: qs("[data-reco-result]", form),
    recoForm: qs("#enr-reco-form"),
    birth: qs("[data-birth]", form),
    ageValue: qs("[data-age-value]", form),
    ageSub: qs("[data-age-sub]", form),
    ageCheck: qs("[data-age-check]", form),
    skillSelect: qs("[data-skill-select]", form),
    health: qs("#enr-zdravje", form),
    healthCount: qs("[data-count]", form),
    guardian: qs("[data-guardian]", form),
    guardianInput: qs("#enr-skrbnik", form),
    contactLegend: qs("[data-contact-legend]", form),
    contactDesc: qs("[data-contact-desc]", form),
    emailLabel: qs('label[for="enr-email"]', form),
    phoneLabel: qs('label[for="enr-telefon"]', form),
    sibling: qs("[data-sibling]", form),
    siblingHint: qs("[data-sibling-hint]", form),
    review: qs("[data-review]", form),
    price: qs("[data-price]", form),
    terms: qs("#enr-pogoji", form),
    done: qs("[data-done]", root),
    summaries: qsa("[data-summary]"),
    bar: qs("[data-bar]"),
    barToggle: qs("[data-bar-toggle]"),
    barTitle: qs("[data-bar-title]"),
    barMeta: qs("[data-bar-meta]"),
    barStep: qs("[data-bar-step]"),
    barDot: qs("[data-bar-dot]"),
    sheet: qs("[data-sheet]"),
    draft: qs("[data-draft]"),
    draftMeta: qs("[data-draft-meta]"),
    heroActions: qs("[data-hero-actions]"),
    overview: qsa(".enr-overview__item"),
    faq: qs("[data-faq]")
  };
  if (!el.panel || !el.steps.length || !el.next) return;

  var state = {
    step: 1,
    maxReached: 1,
    done: false,
    draftPending: false,
    draftRec: null,
    savedAt: null,
    recoAge: 6,
    recoAgeTouched: false,
    recoSkill: null,
    submitted: null,
    typing: false,
    barInView: false,
    sheetOpen: false
  };

  /* ------------------------------------------------------------------
     Small helpers
     ------------------------------------------------------------------ */
  function num(x) { return typeof x === "number" && isFinite(x); }
  function icon(n, c) { return PKB.icon(n, c); }
  function plural(n, f) { return PKB.plural(n, f); }
  function yearsLabel(n) { return n + " " + plural(n, ["leto", "leti", "leta", "let"]); }
  function monthsLabel(n) { return n + " " + plural(n, ["mesec", "meseca", "meseci", "mesecev"]); }
  function fmtPrice(v) { return PKB.formatPrice(v); }
  function pctText() { return Math.round(siblingRate * 100) + " %"; }
  function programById(id) { return id ? PKB.programById(id) : null; }
  function catName(p) { var c = p ? PKB.categoryById(p.category) : null; return c ? c.name : ""; }
  function stepEl(n) { return el.steps.filter(function (s) { return Number(s.getAttribute("data-step")) === n; })[0] || null; }
  function hhmm(d) { return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function reduced() { return PKB.prefersReducedMotion(); }
  function headerOffset() { return (qs(".site-header") || { offsetHeight: 76 }).offsetHeight + 12; }
  function control(name) {
    return qsa('[name="' + name + '"]', form).filter(function (c) { return c.form === form; });
  }
  function valueOf(name) {
    var cs = control(name);
    if (!cs.length) return "";
    if (cs[0].type === "radio") { var ch = cs.filter(function (c) { return c.checked; })[0]; return ch ? ch.value : ""; }
    if (cs[0].type === "checkbox") return cs[0].checked ? (cs[0].value || "da") : "";
    return String(cs[0].value || "").trim();
  }
  /** Program age window: minAge inclusive (may be fractional), maxAge inclusive by completed years. */
  function fitsAge(p, exact) {
    if (!p || !num(p.minAge) || !num(p.maxAge)) return true;
    return exact >= p.minAge && Math.floor(exact) <= p.maxAge;
  }
  function decimalAge(v) {
    if (v >= RECO_MAX) return RECO_MAX + " let ali več";
    if (v % 1) return PKB.formatNumber(v, 1) + " leta";
    return yearsLabel(v);
  }

  /* ------------------------------------------------------------------
     Age from birth date
     ------------------------------------------------------------------ */
  function ageInfo(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return null;
    var b = PKB.parseDate(iso);
    if (isNaN(b.getTime())) return null;
    var t = PKB.today();
    var months = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
    if (t.getDate() < b.getDate()) months--;
    return { birth: b, future: b > t, months: months, years: Math.floor(months / 12), rem: ((months % 12) + 12) % 12, exact: months / 12 };
  }
  function birthValidity() {
    if (!el.birth) return;
    var v = el.birth.value, msg = "";
    if (v) {
      var a = ageInfo(v);
      if (!a || a.birth.getFullYear() < 1900) msg = "Vnesite veljaven datum rojstva.";
      else if (a.future || a.months < 0) msg = "Datum rojstva ne more biti v prihodnosti.";
      else if (a.years > 100) msg = "Preverite letnico rojstva.";
    }
    el.birth.setCustomValidity(msg);
  }
  /** Valid age of the swimmer or null. */
  function currentAge() {
    if (!el.birth || !el.birth.value) return null;
    birthValidity();
    if (!el.birth.validity.valid) return null;
    return ageInfo(el.birth.value);
  }
  function isMinor() { var a = currentAge(); return a ? a.years < 18 : true; }
  function ageText(a) {
    if (!a) return "";
    if (a.years === 0) return monthsLabel(a.rem);
    return yearsLabel(a.years);
  }

  /* ------------------------------------------------------------------
     Programmes, sessions, prices
     ------------------------------------------------------------------ */
  function selectedProgram() { return programById(valueOf("program")); }
  function nowDate() {
    var t = PKB.today(), n = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), n.getHours(), n.getMinutes());
  }
  /** Next occurrence of any weekly session of the programme (from now). */
  function nextSession(pid) {
    var list = PKB.sessionsFor(pid) || [];
    if (!list.length) return null;
    var now = nowDate();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var wd = PKB.isoWeekday(today);
    var best = null;
    list.forEach(function (s) {
      if (!num(s.day) || !s.start) return;
      var diff = (s.day - wd + 7) % 7;
      var sm = PKB.timeToMinutes(s.start), em = PKB.timeToMinutes(s.end || s.start);
      var start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff, Math.floor(sm / 60), sm % 60);
      if (start <= now) start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, start.getHours(), start.getMinutes());
      var end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), Math.floor(em / 60), em % 60);
      if (!best || start < best.start) best = { s: s, start: start, end: end };
    });
    return best;
  }
  function sessionText(ns, long) {
    if (!ns) return "";
    var iso = PKB.toISODate(ns.start);
    var day = PKB.formatDate(iso, long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "numeric" });
    return day + " ob " + hhmm(ns.start);
  }
  /** "danes ob 17:00", "jutri ob 17:00", "pon ob 17:00" */
  function shortWhen(ns) {
    var n = PKB.daysUntil(PKB.toISODate(ns.start));
    var day = n === 0 ? "danes" : n === 1 ? "jutri" : (DAYS_SHORT[PKB.isoWeekday(ns.start) - 1] || "").toLowerCase();
    return day + " ob " + hhmm(ns.start);
  }
  function weeklyText(pid) {
    return (PKB.sessionsFor(pid) || []).map(function (s) {
      return (DAYS_SHORT[s.day - 1] || "") + " " + s.start + "–" + s.end;
    }).join(" · ");
  }
  function priceInfo(p, sibling) {
    if (!p) return null;
    var monthly = num(p.price) ? p.price : null;
    var useSib = !!sibling && siblingRate > 0;
    var disc = monthly != null && useSib ? Math.round(monthly * siblingRate * 100) / 100 : 0;
    return { monthly: monthly, discount: disc, total: monthly != null ? Math.round((monthly - disc) * 100) / 100 : null, sibling: useSib, fee: enrollFee };
  }

  /* ------------------------------------------------------------------
     Recommendation logic (age + ability) and alternatives for the age check
     ------------------------------------------------------------------ */
  function agedPrograms() { return programs.filter(function (p) { return num(p.minAge) && num(p.maxAge); }); }
  function recommend(age, skill) {
    var list = agedPrograms();
    if (!list.length) return null;
    var minAll = Math.min.apply(null, list.map(function (p) { return p.minAge; }));
    if (age < minAll) return { tooYoung: true, p: list.filter(function (p) { return p.minAge === minAll; })[0], minAge: minAll };
    var adult = age >= 18;
    var target = skill <= 0 ? 0.5 : skill >= 4 ? (age >= 13 ? 7 : 4.5) : skill;
    var scored = list.map(function (p) {
      var s = 0, out = false;
      if (age < p.minAge) { s += 4 + (p.minAge - age) * 1.5; out = true; }
      else if (Math.floor(age) > p.maxAge) { s += 4 + (age - p.maxAge) * 1.5; out = true; }
      var d = (num(p.skill) ? p.skill : 0) - target;
      s += Math.abs(d);
      if (d >= 1.5) s += 3 + (d - 1.5) * 2;
      if (adult && p.category !== "odrasli") s += 10;
      if (!adult && p.category === "odrasli") s += 3;
      var top = Math.min(p.maxAge, 40);
      var mid = (p.minAge + top) / 2, half = (top - p.minAge) / 2 + 1;
      s += Math.min(Math.abs(age - mid) / half, 1) * 0.5;
      return { p: p, s: s, out: out };
    }).sort(function (a, b) { return a.s - b.s; });
    return { p: scored[0].p, outOfAge: scored[0].out };
  }
  /** Better-fitting programme for a swimmer whose age is outside the selected one. */
  function suggestFor(age, cur, skill) {
    var target = num(skill) ? skill : (cur && num(cur.skill) ? Math.min(cur.skill, 4) : 0);
    var adult = age >= 18;
    var cands = agedPrograms().filter(function (p) { return p !== cur && fitsAge(p, age); });
    if (adult) { var o = cands.filter(function (p) { return p.category === "odrasli"; }); if (o.length) cands = o; }
    else cands = cands.filter(function (p) { return p.category !== "odrasli"; });
    var scored = cands.map(function (p) {
      var s = Math.abs((num(p.skill) ? p.skill : 0) - target);
      if (cur && p.category !== cur.category) s += 1;
      if (p.category === "tekmovalno" && target < 4) s += 3;
      return { p: p, s: s };
    }).sort(function (a, b) { return a.s - b.s; });
    return scored.length && scored[0].s <= 5 ? scored[0].p : null;
  }
  function skillFromSelect() {
    var k = el.skillSelect ? el.skillSelect.value : "";
    return Object.prototype.hasOwnProperty.call(SKILL_BY_KEY, k) ? SKILL_BY_KEY[k] : null;
  }

  /* ------------------------------------------------------------------
     Render: programme option cards
     ------------------------------------------------------------------ */
  function optionHTML(p) {
    var price = num(p.price) ? fmtPrice(p.price) + '<span class="enr-opt__per"> / mes.</span>' : "Po dogovoru";
    return '<label class="option-card enr-opt" id="enr-opt-' + esc(p.id) + '" style="--c:' + esc(p.color || "") + '">' +
      '<input type="radio" name="program" value="' + esc(p.id) + '" required data-msg="Izberite program, v katerega vpisujete plavalca.">' +
      '<span class="option-card__body enr-opt__body">' +
        '<span class="enr-opt__radio" aria-hidden="true"></span>' +
        '<span class="enr-opt__head"><span class="enr-dot" aria-hidden="true"></span><span class="enr-opt__name">' + esc(p.name) + "</span>" +
          '<span class="badge badge--solid enr-opt__reco" data-reco-badge hidden>Priporočeno</span></span>' +
        '<span class="enr-opt__meta">' + esc(p.level || "") + (p.ages ? " · " + esc(p.ages) : "") + "</span>" +
        '<span class="enr-opt__facts">' +
          (num(p.perWeek) ? "<span><b>" + p.perWeek + "×</b> na teden</span>" : "") +
          (num(p.duration) ? "<span><b>" + p.duration + "</b> min</span>" : "") +
          '<span class="enr-opt__price"><b>' + price + "</b></span>" +
        "</span>" +
      "</span></label>";
  }
  function renderPrograms() {
    if (!el.programs) return;
    var known = {};
    cats.forEach(function (c) { known[c.id] = true; });
    var groups = cats.slice();
    var other = programs.filter(function (p) { return !known[p.category]; });
    if (other.length) groups.push({ id: "drugo", name: "Drugi programi", icon: "waves" });
    var html = groups.map(function (c) {
      var list = c.id === "drugo" && !known.drugo ? other : programs.filter(function (p) { return p.category === c.id; });
      if (!list.length) return "";
      return '<fieldset class="enr-cat" id="enr-cat-' + esc(c.id) + '">' +
        '<legend class="enr-cat__title">' +
          (c.icon ? '<span class="icon-bubble icon-bubble--sm" aria-hidden="true">' + icon(c.icon) + "</span>" : "") +
          "<span>" + esc(c.name) + "</span>" +
          '<span class="enr-cat__count">' + list.length + " " + plural(list.length, ["skupina", "skupini", "skupine", "skupin"]) + "</span>" +
        "</legend>" +
        '<div class="enr-options">' + list.map(optionHTML).join("") + "</div>" +
      "</fieldset>";
    }).join("");
    el.programs.innerHTML = html || '<div class="empty-state"><span class="icon-bubble">' + icon("alert-circle") + "</span><p>Seznama programov trenutno ni mogoče naložiti. Pišite nam na " + esc(club.email || "") + ".</p></div>";
  }

  /* ------------------------------------------------------------------
     Stepper, overview, nav
     ------------------------------------------------------------------ */
  /** Silent validity check of one step (no UI). */
  function stepValid(n) {
    var s = stepEl(n);
    if (!s) return true;
    if (n === 2) birthValidity();
    return qsa("input, select, textarea", s).every(function (c) {
      if (c.form !== form || c.disabled || !c.willValidate || c.closest(".honeypot")) return true;
      if (c.closest("[hidden]") && c.closest("[hidden]") !== s) return true;
      return c.checkValidity();
    });
  }
  function validCount() {
    var n = 0;
    for (var i = 1; i < STEPS; i++) if (stepValid(i)) n++;
    return n + (state.done ? 1 : 0);
  }
  function updateStepper() {
    var n = state.step;
    var p = selectedProgram();
    var subs = {
      1: p ? p.name : "",
      2: valueOf("ime") ? valueOf("ime") + (currentAge() ? ", " + ageText(currentAge()) : "") : "",
      3: valueOf("email"),
      4: state.done ? "Oddano" : ""
    };
    qsa("[data-goto]", el.stepper).forEach(function (b) {
      var i = Number(b.getAttribute("data-goto"));
      var done = state.done || (i !== n && i <= state.maxReached && i < STEPS && stepValid(i));
      b.classList.toggle("is-done", done);
      b.classList.toggle("is-upcoming", i > n && !done);
      if (i === n && !state.done) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      var st = qs('[data-step-state="' + i + '"]', el.stepper);
      if (st) st.textContent = done ? " (izpolnjeno)" : "";
      var sub = qs('[data-step-sub="' + i + '"]', el.stepper);
      if (sub) sub.textContent = subs[i] || "";
    });
    if (el.stepperProgress) el.stepperProgress.style.setProperty("--p", (state.done ? 100 : ((n - 1) / (STEPS - 1)) * 100) + "%");
    el.overview.forEach(function (li, idx) {
      var i = idx + 1;
      li.classList.toggle("is-done", state.done || i < n);
      li.classList.toggle("is-current", !state.done && i === n);
    });
  }
  function updateNav() {
    var n = state.step;
    el.back.hidden = n === 1;
    if (n < STEPS) {
      el.nextLabel.textContent = "Naprej: " + STEP_NAMES[n];
      if (el.nextIcon) el.nextIcon.innerHTML = icon("arrow-right", "icon--move");
    } else {
      el.nextLabel.textContent = "Oddaj prijavo";
      if (el.nextIcon) el.nextIcon.innerHTML = icon("send");
    }
  }

  /* ------------------------------------------------------------------
     Step navigation (+ history / #korak-N)
     ------------------------------------------------------------------ */
  function setHash(n, mode) {
    if (!mode) return;
    var url = window.location.pathname + window.location.search + (n ? "#korak-" + n : "");
    try {
      if (mode === "push") history.pushState({ enrStep: n }, "", url);
      else history.replaceState({ enrStep: n }, "", url);
    } catch (e) { /* ignore */ }
  }
  function scrollToForm(target) {
    var t = target || el.stepperWrap || el.panel;
    var r = t.getBoundingClientRect();
    if (r.top < headerOffset() || r.top > window.innerHeight * 0.45) {
      t.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
    }
  }
  function focusHeading(n) {
    var s = stepEl(n);
    var h = s && qs(".enr-step__title", s);
    if (h) h.focus({ preventScroll: true });
  }
  function showStep(n, o) {
    o = o || {};
    var prev = state.step;
    state.step = n;
    state.maxReached = Math.max(state.maxReached, n);
    el.steps.forEach(function (s) {
      var on = Number(s.getAttribute("data-step")) === n;
      s.hidden = !on;
      if (on && prev !== n && o.animate !== false && !reduced()) {
        s.classList.remove("is-entering");
        void s.offsetWidth;
        s.classList.add("is-entering");
      }
    });
    if (n === 2) updateAgeUI();
    if (n === 3) updateContactUI();
    if (n === 4) { renderReview(); renderPrice(); }
    updateNav();
    updateStepper();
    renderSummary();
    setHash(n, o.history);
    if (o.scroll !== false && (o.focus || o.scroll)) scrollToForm();
    if (o.focus) focusHeading(n);
    if (prev !== n) scheduleSave();
  }
  /** Move to step n; moving forward validates every earlier step (errors shown on the first invalid one). */
  function goTo(n, o) {
    o = o || {};
    n = Math.max(1, Math.min(STEPS, Number(n) || 1));
    if (state.done) return false;
    if (n > state.step) {
      for (var i = 1; i < n; i++) {
        if (!stepValid(i)) {
          if (i !== state.step) showStep(i, { focus: !o.silent, history: o.history, scroll: !o.silent });
          if (!o.silent) {
            var res = PKB.validateForm(stepEl(i));
            if (!res.firstInvalid) focusHeading(i);
            PKB.toast({ type: "error", title: "Preverite podatke", message: "Korak »" + STEP_NAMES[i - 1] + "« še ni v celoti izpolnjen." });
          } else if (i === state.step) {
            setHash(i, o.history === "push" ? "replace" : o.history);
          }
          return false;
        }
      }
    }
    showStep(n, { focus: o.focus !== false, history: o.history, scroll: o.scroll });
    return true;
  }

  /* ------------------------------------------------------------------
     Step 2: age tile + age-vs-programme check
     ------------------------------------------------------------------ */
  function updateAgeUI() {
    if (!el.ageValue) return;
    var a = currentAge();
    var p = selectedProgram();
    if (!a) {
      el.ageValue.textContent = "–";
      el.ageSub.textContent = el.birth && el.birth.value && !el.birth.validity.valid ? "Preverite datum rojstva." : "Vnesite datum rojstva.";
      el.ageCheck.innerHTML = "";
      return;
    }
    el.ageValue.textContent = ageText(a);
    el.ageSub.textContent = (a.years > 0 && a.years < 10 && a.rem ? "in " + monthsLabel(a.rem) + " · " : "") + (a.years < 18 ? "mladoletni plavalec" : "polnoletni plavalec");
    el.ageCheck.innerHTML = ageCheckHTML(a, p, true);
  }
  function ageCheckHTML(a, p, withActions) {
    if (!a || !p) return "";
    var who = valueOf("ime") ? "<strong>" + esc(valueOf("ime")) + "</strong>" : "plavalec";
    var range = p.ages ? esc(p.ages) : "";
    if (fitsAge(p, a.exact)) {
      return '<div class="enr-note enr-note--ok"><span class="enr-note__icon" aria-hidden="true">' + icon("check") + "</span><div>" +
        '<p class="enr-note__title">Starost ustreza skupini ' + esc(p.name) + "</p>" +
        '<p class="enr-note__text">Skupina je namenjena plavalcem v starosti ' + range + ".</p></div></div>";
    }
    var alt = suggestFor(a.exact, p, skillFromSelect());
    var minAll = Math.min.apply(null, agedPrograms().map(function (x) { return x.minAge; }).concat([99]));
    var text = "Skupina <strong>" + esc(p.name) + "</strong> je namenjena plavalcem v starosti <strong>" + range + "</strong>, " + who + " pa ima <strong>" + esc(ageText(a)) + "</strong>. ";
    if (a.exact < minAll) text += "Vpis v plavalno šolo je mogoč od " + PKB.formatNumber(minAll, minAll % 1 ? 1 : 0) + ". leta naprej. ";
    else if (alt) text += "Predlagamo skupino <strong>" + esc(alt.name) + "</strong> (" + esc(alt.ages || "") + "). ";
    else text += "Najprimernejšo skupino bo ob poskusnem treningu predlagal trener. ";
    text += "Vpis lahko kljub temu nadaljujete – trener bo ob prvem treningu preveril znanje.";
    return '<div class="enr-note enr-note--warn"><span class="enr-note__icon" aria-hidden="true">' + icon("alert-triangle") + "</span><div>" +
      '<p class="enr-note__title">Starost ne ustreza izbrani skupini</p>' +
      '<p class="enr-note__text">' + text + "</p>" +
      (withActions && alt ? '<div class="enr-note__actions"><button type="button" class="btn btn--sm btn--primary" data-swap="' + esc(alt.id) + '">' + icon("refresh") + "Izberi skupino " + esc(alt.name) + "</button></div>" : "") +
      "</div></div>";
  }

  /* ------------------------------------------------------------------
     Step 3: guardian vs. adult contact
     ------------------------------------------------------------------ */
  function updateContactUI() {
    var minor = isMinor();
    if (el.guardian) el.guardian.hidden = !minor;
    if (el.guardianInput) el.guardianInput.disabled = !minor;
    if (el.contactLegend) el.contactLegend.textContent = minor ? "Starš/skrbnik" : "Vaši kontaktni podatki";
    if (el.contactDesc) {
      el.contactDesc.textContent = minor
        ? "Plavalec je mladoleten, zato potrebujemo podatke starša ali skrbnika. Nanje vam pošljemo potrditev vpisa in termin prvega treninga."
        : "Na te podatke vam pošljemo potrditev vpisa in termin prvega treninga.";
    }
    setLabel(el.emailLabel, minor ? "E-pošta starša/skrbnika" : "E-pošta");
    setLabel(el.phoneLabel, minor ? "Telefon starša/skrbnika" : "Telefon");
  }
  function setLabel(label, text) {
    if (!label) return;
    var first = label.firstChild;
    if (first && first.nodeType === 3) first.nodeValue = text + " ";
  }
  function updateSiblingHint() {
    if (!el.siblingHint) return;
    var p = selectedProgram();
    var pi = priceInfo(p, true);
    var t;
    if (!siblingRate) t = "Popust za brata ali sestro velja po veljavnem ceniku.";
    else if (pi && pi.monthly != null) t = "Popust " + pctText() + " pri mesečni članarini – za skupino " + p.name + " " + fmtPrice(pi.total) + " namesto " + fmtPrice(pi.monthly) + ".";
    else t = "Za drugega otroka velja " + pctText() + " popust pri mesečni članarini (po ceniku).";
    el.siblingHint.textContent = t;
  }
  function updateCount() {
    if (!el.health || !el.healthCount) return;
    el.healthCount.textContent = el.health.value.length + " / " + (el.health.maxLength > 0 ? el.health.maxLength : 600);
  }

  /* ------------------------------------------------------------------
     Step 4: review + price
     ------------------------------------------------------------------ */
  function row(label, value, raw) {
    if (!value) return "";
    return "<div><dt>" + esc(label) + "</dt><dd>" + (raw ? value : esc(value)) + "</dd></div>";
  }
  function skillTitle(key) {
    var o = el.skillSelect ? qsa("option", el.skillSelect).filter(function (x) { return x.value === key; })[0] : null;
    return o && key ? o.textContent : "";
  }
  function reviewHTML(edit) {
    var d = collect();
    var p = selectedProgram();
    var a = currentAge();
    var minor = isMinor();
    var editBtn = function (n) {
      return edit ? '<button type="button" class="btn btn--link enr-rev__edit" data-goto="' + n + '">Uredi<span class="visually-hidden">: ' + STEP_NAMES[n - 1] + "</span></button>" : "";
    };
    var ns = p ? nextSession(p.id) : null;
    var coaches = p ? (PKB.coachesFor(p.id) || []).map(function (c) { return c.name; }).join(", ") : "";
    var prog = '<article class="tile enr-rev enr-rev--wide" style="--c:' + esc(p ? p.color || "" : "") + '">' +
      '<div class="enr-rev__head"><h3 class="enr-rev__title">Program</h3>' + editBtn(1) + "</div>" +
      (p
        ? '<p class="enr-rev__main"><span class="enr-dot" aria-hidden="true"></span>' + esc(p.name) + "</p>" +
          '<dl class="enr-rev__list">' +
            row("Kategorija", catName(p) + (p.level ? " · " + p.level : "")) +
            row("Termini", weeklyText(p.id) || "po dogovoru") +
            row("Naslednji termin", ns ? sessionText(ns, true) + " · " + ns.s.pool : "") +
            row("Trenerji", coaches) +
          "</dl>" +
          (a && !fitsAge(p, a.exact) ? ageCheckHTML(a, p, false) : "")
        : '<p class="muted">Program ni izbran.</p>') +
      "</article>";
    var swimmer = '<article class="tile enr-rev">' +
      '<div class="enr-rev__head"><h3 class="enr-rev__title">Plavalec</h3>' + editBtn(2) + "</div>" +
      '<p class="enr-rev__main">' + esc((d.ime + " " + d.priimek).trim() || "—") + "</p>" +
      '<dl class="enr-rev__list">' +
        row("Datum rojstva", a ? PKB.formatDate(d.rojstvo) + " (" + ageText(a) + ")" : "") +
        row("Spol", d.spol ? d.spol.charAt(0).toUpperCase() + d.spol.slice(1) : "") +
        row("Predznanje", skillTitle(d.predznanje)) +
        row("Zdravstvene posebnosti", d.zdravje || "Brez posebnosti") +
      "</dl></article>";
    var addr = [d.naslov, [d.posta, d.kraj].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    var contact = '<article class="tile enr-rev">' +
      '<div class="enr-rev__head"><h3 class="enr-rev__title">Kontakt</h3>' + editBtn(3) + "</div>" +
      '<p class="enr-rev__main">' + esc(minor ? (d.skrbnik || "—") : (d.ime + " " + d.priimek).trim()) + "</p>" +
      '<dl class="enr-rev__list">' +
        (minor ? row("Vloga", "Starš/skrbnik") : "") +
        row("E-pošta", d.email) +
        row("Telefon", d.telefon) +
        row("Naslov", addr) +
        row("Brat ali sestra v klubu", d.sorojenec ? "Da" : "Ne") +
      "</dl></article>";
    return prog + swimmer + contact;
  }
  function priceHTML() {
    var p = selectedProgram();
    if (!p) return "";
    var pi = priceInfo(p, el.sibling && el.sibling.checked);
    var lines = '<dl class="enr-price__lines">' +
      (pi.monthly != null ? "<div><dt>Mesečna članarina</dt><dd>" + esc(fmtPrice(pi.monthly)) + "</dd></div>" : "") +
      (pi.sibling ? "<div><dt>Popust za brata ali sestro (" + pctText() + ")</dt><dd>" + (pi.monthly != null ? "−" + esc(fmtPrice(pi.discount)) : "po ceniku") + "</dd></div>" : "") +
      (pi.sibling && pi.monthly != null ? '<div class="is-total"><dt>Mesečno skupaj</dt><dd>' + esc(fmtPrice(pi.total)) + "</dd></div>" : "") +
      (pi.fee != null ? "<div><dt>Vpisnina (po ceniku)</dt><dd>" + esc(fmtPrice(pi.fee)) + ' <span class="soft">enkratno</span></dd></div>' : "") +
      "</dl>";
    var big = '<div class="enr-price__big"><span class="enr-kicker">' + (pi.total != null ? "Na mesec" : "Članarina") + "</span>" +
      '<span class="enr-price__value' + (pi.total != null ? "" : " enr-price__value--text") + '">' + (pi.total != null ? esc(fmtPrice(pi.total)) : "Po dogovoru") + "</span></div>";
    var note = pi.monthly != null ? (pricing.paymentNote || "") : (pricing.note || "");
    return '<div class="tile tile--raised enr-price__box">' + lines + big +
      (note ? '<p class="enr-price__note small soft">' + icon("info", "icon--sm") + "<span>" + esc(note) + "</span></p>" : "") + "</div>";
  }
  function renderReview() { if (el.review) el.review.innerHTML = reviewHTML(true); }
  function renderPrice() { if (el.price) el.price.innerHTML = priceHTML(); }

  /* ------------------------------------------------------------------
     Live summary (aside + mobile sheet + bottom bar)
     ------------------------------------------------------------------ */
  el.summaries.forEach(function (h) {
    h.innerHTML = '<div class="enr-sum__top" data-sum-top></div><div class="enr-sum__body" data-sum-body></div>';
  });
  function summaryTop(p) {
    if (!p) {
      return '<div class="tile enr-sum__empty"><span class="icon-bubble icon-bubble--sm" aria-hidden="true">' + icon("waves") + "</span>" +
        '<div><p class="enr-sum__empty-title">Program še ni izbran</p><p class="small muted">Izberite skupino v prvem koraku.</p></div></div>';
    }
    var img = p.image ? '<img src="' + esc(p.image) + '" alt="" width="720" height="480" loading="lazy" decoding="async">' : "";
    return '<div class="photo-card enr-sum__photo">' + img +
      '<div class="photo-card__glass"><span class="enr-sum__cap-k">' + esc(catName(p)) + '</span><strong class="enr-sum__cap-name">' + esc(p.name) + "</strong></div></div>";
  }
  function sumRow(ic, k, v, cls) {
    return '<li class="enr-sum__row' + (cls ? " " + cls : "") + '">' + icon(ic) + '<span class="enr-sum__row-text"><span class="enr-sum__row-k">' + esc(k) + '</span><span class="enr-sum__row-v">' + v + "</span></span></li>";
  }
  function summaryBody(p) {
    var a = currentAge();
    var sib = el.sibling && el.sibling.checked;
    var pi = priceInfo(p, sib);
    var html = "";
    if (p) {
      html += '<div class="enr-sum__price">' +
        (pi.total != null
          ? '<span class="enr-sum__price-v">' + esc(fmtPrice(pi.total)) + "</span>" +
            (pi.sibling ? '<span class="enr-sum__price-old"><span class="visually-hidden">namesto </span>' + esc(fmtPrice(pi.monthly)) + "</span>" : "") +
            '<span class="enr-sum__price-l">na mesec' + (pi.sibling ? " · s popustom " + pctText() : "") + "</span>"
          : '<span class="enr-sum__price-v enr-sum__price-v--text">Po dogovoru</span><span class="enr-sum__price-l">ločen cenik sekcije</span>') +
        "</div>";
    }
    var rows = "";
    if (p) {
      var ns = nextSession(p.id);
      rows += sumRow("calendar", "Naslednji trening", ns ? esc(sessionText(ns, false)) + ' <span class="soft">· ' + esc(PKB.relativeDay(PKB.toISODate(ns.start))) + "</span><br><span class=\"soft\">" + esc(ns.s.pool) + "</span>" : "Po dogovoru");
      rows += sumRow("clock", "Vadba", esc((num(p.perWeek) ? p.perWeek + "× na teden" : "") + (num(p.duration) ? " · " + p.duration + " min" : "")));
    }
    if (enrollFee != null) rows += sumRow("euro", "Vpisnina (po ceniku)", esc(fmtPrice(enrollFee)) + ' <span class="soft">· enkratno</span>');
    var name = (valueOf("ime") + " " + valueOf("priimek")).trim();
    if (name || a) rows += sumRow("user", "Plavalec", esc(name || "—") + (a ? ' <span class="soft">· ' + esc(ageText(a)) + "</span>" : ""));
    if (p && a && !fitsAge(p, a.exact)) rows += sumRow("alert-triangle", "Opozorilo", "Starost ne ustreza skupini", "enr-sum__row--warn");
    html += '<ul class="enr-sum__rows" role="list">' + rows + "</ul>";
    var vc = validCount();
    html += '<div class="enr-sum__progress"><div class="enr-sum__progress-text"><span>' +
      (state.done ? "Prijava je izpolnjena" : "Korak " + state.step + " od " + STEPS + " · " + STEP_NAMES[state.step - 1]) +
      '</span><span class="num">' + vc + "/" + STEPS + '</span></div><div class="progress" aria-hidden="true"><span style="--value:' + (vc / STEPS * 100) + '%"></span></div></div>';
    return html;
  }
  var sumRaf = 0;
  function renderSummary() {
    if (sumRaf) return;
    sumRaf = requestAnimationFrame(function () {
      sumRaf = 0;
      var p = selectedProgram();
      var pid = p ? p.id : "";
      var body = summaryBody(p);
      el.summaries.forEach(function (h) {
        var top = qs("[data-sum-top]", h), bd = qs("[data-sum-body]", h);
        if (top && h.getAttribute("data-pid") !== pid) { top.innerHTML = summaryTop(p); h.setAttribute("data-pid", pid); }
        if (bd && bd.__html !== body) { bd.innerHTML = body; bd.__html = body; }
      });
      renderBar(p);
    });
  }
  function renderBar(p) {
    if (!el.bar) return;
    var pi = priceInfo(p, el.sibling && el.sibling.checked);
    var ns = p ? nextSession(p.id) : null;
    el.barTitle.textContent = p ? p.name : "Program še ni izbran";
    el.barMeta.textContent = p
      ? (pi.total != null ? fmtPrice(pi.total) + " / mesec" : "Cena po dogovoru") + (ns ? " · " + shortWhen(ns) : "")
      : "Korak " + state.step + " od " + STEPS + " · izberite skupino";
    el.barStep.textContent = (state.done ? STEPS : state.step) + "/" + STEPS;
    if (el.barDot) el.barDot.style.setProperty("--c", p && p.color ? p.color : "");
  }

  /* bottom bar visibility + sheet */
  var mqDesktop = window.matchMedia ? window.matchMedia("(min-width: 1024px)") : { matches: true };
  function updateBar() {
    if (!el.bar) return;
    var show = !mqDesktop.matches && state.barInView && !state.done && !state.typing;
    el.bar.classList.toggle("is-visible", show);
    document.body.classList.toggle("enr-bar-on", show);
    if (!show) setSheet(false);
  }
  function setSheet(open) {
    if (!el.sheet || !el.barToggle) return;
    if (state.sheetOpen === open) return;
    state.sheetOpen = open;
    el.sheet.hidden = !open;
    el.barToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (el.bar) {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        state.barInView = en[0].isIntersecting;
        updateBar();
      }, { rootMargin: "0px 0px -12% 0px" }).observe(el.panel);
    } else state.barInView = true;
    if (mqDesktop.addEventListener) mqDesktop.addEventListener("change", updateBar);
    el.barToggle.addEventListener("click", function () { setSheet(!state.sheetOpen); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.sheetOpen) { setSheet(false); el.barToggle.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (state.sheetOpen && !el.bar.contains(e.target)) setSheet(false);
    });
    // hide the bar while typing on small screens (on-screen keyboard)
    form.addEventListener("focusin", function (e) {
      var t = e.target;
      if (mqDesktop.matches || !t.matches || !t.matches("input:not([type=radio]):not([type=checkbox]):not([type=range]), textarea, select")) return;
      state.typing = true;
      updateBar();
    });
    form.addEventListener("focusout", function () {
      setTimeout(function () {
        var a = document.activeElement;
        var still = a && form.contains(a) && a.matches("input:not([type=radio]):not([type=checkbox]):not([type=range]), textarea, select");
        if (!still && state.typing) { state.typing = false; updateBar(); }
      }, 120);
    });
  }

  /* ------------------------------------------------------------------
     Collect / restore form data
     ------------------------------------------------------------------ */
  function collect() {
    var o = {};
    Array.prototype.forEach.call(form.elements, function (c) {
      if (!c.name || c.disabled || c.name === "website" || c.tagName === "BUTTON" || c.tagName === "FIELDSET") return;
      if (c.type === "radio") { if (c.checked) o[c.name] = c.value; else if (!(c.name in o)) o[c.name] = ""; return; }
      if (c.type === "checkbox") { o[c.name] = c.checked ? (c.value || "da") : ""; return; }
      o[c.name] = String(c.value || "").trim();
    });
    if (!("skrbnik" in o)) o.skrbnik = "";
    return o;
  }
  function setData(o) {
    if (!o || typeof o !== "object") return;
    Object.keys(o).forEach(function (name) {
      if (DRAFT_FIELDS.indexOf(name) === -1) return;
      var v = o[name];
      if (v != null && typeof v !== "string") v = String(v);
      control(name).forEach(function (c) {
        if (c.type === "radio") c.checked = c.value === v;
        else if (c.type === "checkbox") c.checked = !!v;
        else if (c.tagName === "SELECT") { c.value = v || ""; if (c.value !== (v || "")) c.value = ""; }
        else c.value = v || "";
      });
    });
    birthValidity();
    afterDataChange();
  }
  function afterDataChange() {
    updateCount();
    updateContactUI();
    updateAgeUI();
    updateSiblingHint();
    syncUrlProgram();
    syncRecoFromBirth();
    renderReco();
    updateStepper();
    renderSummary();
    if (state.step === 4) { renderReview(); renderPrice(); }
  }
  function clearValidation() {
    qsa(".field.is-invalid, .field.is-valid", form).forEach(function (f) { f.classList.remove("is-invalid", "is-valid"); });
    qsa("[aria-invalid]", form).forEach(function (c) { c.removeAttribute("aria-invalid"); });
    qsa(".field-error", form).forEach(function (e) { e.textContent = ""; });
  }
  function syncUrlProgram() {
    try {
      var p = selectedProgram();
      var u = new URL(window.location.href);
      if (p) u.searchParams.set("program", p.id); else u.searchParams.delete("program");
      var next = u.pathname + u.search + u.hash;
      if (next !== window.location.pathname + window.location.search + window.location.hash) history.replaceState(history.state, "", next);
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------
     Draft autosave
     ------------------------------------------------------------------ */
  function draftData() {
    var all = collect(), d = {};
    DRAFT_FIELDS.forEach(function (k) { if (all[k]) d[k] = all[k]; });
    var g = el.guardianInput;
    if (g && g.disabled && g.value.trim()) d.skrbnik = g.value.trim();
    return d;
  }
  function hasContent(d) {
    return DRAFT_FIELDS.some(function (k) { return k !== "program" && k !== "sorojenec" && d && d[k]; });
  }
  function setSaveStatus(mode) {
    if (!el.saveStatus) return;
    if (mode === "paused") {
      el.saveStatus.classList.remove("is-saved");
      el.saveStatus.innerHTML = icon("info", "icon--sm") + "<span>Shranjevanje je ustavljeno – zgoraj izberite, ali nadaljujete shranjeni osnutek.</span>";
    } else if (mode instanceof Date) {
      el.saveStatus.classList.add("is-saved");
      el.saveStatus.innerHTML = icon("check", "icon--sm") + "<span>Osnutek shranjen ob " + hhmm(mode) + " (samo na tej napravi)</span>";
    } else {
      el.saveStatus.classList.remove("is-saved");
      el.saveStatus.innerHTML = icon("lock", "icon--sm") + "<span>Osnutek se shranjuje samo na tej napravi.</span>";
    }
  }
  function doSave() {
    if (state.done) return;
    if (state.draftPending) { setSaveStatus("paused"); return; }
    var d = draftData();
    if (!hasContent(d)) { PKB.storage.remove(STORE); setSaveStatus(null); return; }
    var now = new Date();
    if (PKB.storage.set(STORE, { v: 1, savedAt: now.toISOString(), step: state.step, data: d })) { state.savedAt = now; setSaveStatus(now); }
  }
  var scheduleSave = PKB.debounce(doSave, 450);
  function loadDraft() {
    var rec = PKB.storage.get(STORE, null);
    if (!rec || typeof rec !== "object" || !rec.data || typeof rec.data !== "object") return null;
    return hasContent(rec.data) ? rec : null;
  }
  function draftWhen(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var day = PKB.toISODate(d);
    var rel = PKB.daysUntil(day);
    var dayText = rel === 0 ? "danes" : rel === -1 ? "včeraj" : PKB.formatDate(day, { day: "numeric", month: "long" });
    return dayText + " ob " + hhmm(d);
  }
  function showDraftBanner(rec) {
    if (!el.draft) return;
    var p = programById(rec.data.program);
    var bits = [];
    var when = draftWhen(rec.savedAt);
    if (when) bits.push("Shranjeno " + when);
    if (p) bits.push(p.name);
    if (rec.data.ime) bits.push(rec.data.ime + (rec.data.priimek ? " " + rec.data.priimek : ""));
    var st = Math.max(1, Math.min(STEPS, Number(rec.step) || 1));
    bits.push("korak " + st + " od " + STEPS);
    el.draftMeta.textContent = bits.join(" · ");
    el.draft.hidden = false;
    if (el.heroActions) el.heroActions.hidden = true;
    state.draftPending = true;
    state.draftRec = rec;
    setSaveStatus("paused");
  }
  /** After load (scroll restoration, #vpis …): if the hero banner is out of view, move it to the top of the form panel. */
  function placeDraftBanner() {
    if (!state.draftPending || !el.draft || el.panel.contains(el.draft)) return;
    var r = el.draft.getBoundingClientRect();
    if (r.bottom > headerOffset() && r.top < window.innerHeight) return;
    el.panel.insertBefore(el.draft, el.panel.firstChild);
    el.draft.classList.add("enr-draft--panel");
    if (el.heroActions) el.heroActions.hidden = false;
    // the restored scroll position means nothing until the user decides (form is back at step 1)
    var h = window.location.hash;
    if (!h || /^#(vpis|korak-[1-4])$/.test(h)) el.draft.scrollIntoView({ block: "start", behavior: "auto" });
  }
  function hideDraftBanner() {
    if (el.draft) el.draft.hidden = true;
    if (el.heroActions) el.heroActions.hidden = false;
    state.draftPending = false;
  }
  function continueDraft() {
    var rec = state.draftRec;
    hideDraftBanner();
    if (!rec) return;
    var urlProg = paramProgram();
    setData(rec.data);
    var msg = "";
    if (urlProg && urlProg.id !== rec.data.program) {
      selectProgramById(urlProg.id, { silent: true });
      msg = " Program je nastavljen na " + urlProg.name + " (iz povezave).";
    }
    var target = Math.max(1, Math.min(STEPS, Number(rec.step) || 1));
    var t = 1;
    while (t < target && stepValid(t)) t++;
    state.maxReached = Math.max(state.maxReached, t);
    showStep(t, { focus: true, history: "replace", scroll: true });
    doSave();
    PKB.toast({ type: "success", title: "Osnutek je obnovljen", message: "Nadaljujete pri koraku " + t + ": " + STEP_NAMES[t - 1] + "." + msg });
  }
  function discardDraft() {
    PKB.storage.remove(STORE);
    hideDraftBanner();
    state.draftRec = null;
    doSave();
    showStep(state.step, { focus: true, scroll: true, history: null });
    PKB.toast({ type: "info", title: "Začenjate na novo", message: "Prejšnji osnutek je izbrisan s te naprave." });
  }

  /* ------------------------------------------------------------------
     Programme selection
     ------------------------------------------------------------------ */
  function paramProgram() {
    var id = null;
    try { id = PKB.params().get("program"); } catch (e) { id = null; }
    return programById(id);
  }
  function selectProgramById(id, o) {
    o = o || {};
    var r = control("program").filter(function (x) { return x.value === id; })[0];
    if (!r) return false;
    r.checked = true;
    if (!o.silent) PKB.validateField(r);
    onProgramChange();
    if (!o.silent) scheduleSave();
    return r;
  }
  function onProgramChange() {
    var f = el.programsField;
    if (f && f.classList.contains("is-invalid") && valueOf("program")) PKB.validateField(control("program")[0]);
    syncUrlProgram();
    updateAgeUI();
    updateSiblingHint();
    renderReco();
    updateStepper();
    renderSummary();
  }
  function pickProgram(id, scrollTo) {
    var r = selectProgramById(id);
    if (!r) return;
    var card = r.closest(".enr-opt");
    if (card) {
      if (scrollTo) card.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
      card.classList.remove("is-picked");
      void card.offsetWidth;
      card.classList.add("is-picked");
      setTimeout(function () { card.classList.remove("is-picked"); }, 1700);
    }
    r.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------
     Recommender ("Ne vem, kaj izbrati")
     ------------------------------------------------------------------ */
  function setRecoAge(v) {
    v = Math.max(RECO_MIN, Math.min(RECO_MAX, Math.round(v * 2) / 2));
    state.recoAge = v;
    if (el.recoAge) {
      el.recoAge.value = String(v);
      el.recoAge.style.setProperty("--pct", ((v - RECO_MIN) / (RECO_MAX - RECO_MIN) * 100) + "%");
      el.recoAge.setAttribute("aria-valuetext", decimalAge(v));
    }
    if (el.recoAgeOut) el.recoAgeOut.textContent = decimalAge(v);
  }
  function syncRecoFromBirth() {
    if (state.recoAgeTouched) return;
    var a = currentAge();
    if (a) setRecoAge(a.exact);
  }
  function setRecoOpen(open, focus) {
    if (!el.recoToggle || !el.recoPanel) return;
    el.recoToggle.setAttribute("aria-expanded", open ? "true" : "false");
    el.recoPanel.hidden = !open;
    if (open) {
      syncRecoFromBirth();
      renderReco();
      if (focus && el.recoAge) el.recoAge.focus({ preventScroll: true });
    }
  }
  function markRecommended(id) {
    qsa("[data-reco-badge]", form).forEach(function (b) {
      b.hidden = !id || b.closest(".enr-opt").id !== "enr-opt-" + id;
    });
  }
  function renderReco() {
    if (!el.recoResult) return;
    if (state.recoSkill == null) {
      el.recoResult.innerHTML = '<p class="small muted enr-reco__prompt">' + icon("info", "icon--sm") + "<span>Izberite še znanje plavanja – predlog se prikaže takoj.</span></p>";
      markRecommended(null);
      return;
    }
    var r = recommend(state.recoAge, state.recoSkill);
    if (!r || !r.p) { el.recoResult.innerHTML = ""; markRecommended(null); return; }
    var p = r.p;
    var picked = valueOf("program") === p.id;
    var meta = [p.ages, num(p.perWeek) ? p.perWeek + "× na teden" : "", num(p.price) ? fmtPrice(p.price) + " / mes." : "cena po dogovoru"].filter(Boolean).join(" · ");
    var note = "";
    if (r.tooYoung) note = "Vpis v plavalno šolo je mogoč od " + PKB.formatNumber(r.minAge, r.minAge % 1 ? 1 : 0) + ". leta. Ko bo otrok dovolj star, priporočamo to skupino.";
    else if (r.outOfAge) note = "Starost je zunaj priporočenega razpona skupine – trener bo ob poskusnem treningu predlagal najprimernejšo.";
    else if (p.category === "odrasli" && state.recoSkill >= 4) note = "Za tekmovalno plavanje odraslih se dogovorite s trenerjem.";
    el.recoResult.innerHTML =
      '<div class="enr-reco__card" style="--c:' + esc(p.color || "") + '">' +
        "<div>" +
          '<p class="enr-reco__kicker">' + (r.tooYoung ? "Ko bo čas" : "Predlagamo") + "</p>" +
          '<p class="enr-reco__name"><span class="enr-dot" aria-hidden="true"></span>' + esc(p.name) + "</p>" +
          '<p class="small muted enr-reco__meta">' + esc(meta) + "</p>" +
          (p.summary ? '<p class="small enr-reco__why">' + esc(p.summary) + "</p>" : "") +
          (note ? '<p class="small soft enr-reco__note">' + icon("info", "icon--sm") + "<span>" + esc(note) + "</span></p>" : "") +
        "</div>" +
        (picked
          ? '<span class="enr-reco__picked">' + icon("check-circle") + "Izbrano</span>"
          : '<button type="button" class="btn btn--primary btn--sm" data-reco-pick="' + esc(p.id) + '">Izberi to skupino ' + icon("arrow-right", "icon--move") + "</button>") +
      "</div>";
    markRecommended(r.tooYoung ? null : p.id);
  }
  function initReco() {
    if (!el.recoSkills) return;
    el.recoSkills.innerHTML = SKILLS.map(function (s) {
      return '<label class="enr-pill"><input type="radio" name="reco-skill" value="' + s.v + '" form="enr-reco-form"><span>' + esc(s.title) + "</span></label>";
    }).join("");
    setRecoAge(state.recoAge);
    if (el.recoToggle) el.recoToggle.addEventListener("click", function () {
      setRecoOpen(el.recoToggle.getAttribute("aria-expanded") !== "true", false);
    });
    if (el.recoAge) el.recoAge.addEventListener("input", function () {
      state.recoAgeTouched = true;
      setRecoAge(Number(el.recoAge.value) || 6);
      renderReco();
    });
    el.recoSkills.addEventListener("change", function (e) {
      if (e.target.name !== "reco-skill") return;
      state.recoSkill = Number(e.target.value);
      renderReco();
    });
    if (el.recoForm) el.recoForm.addEventListener("submit", function (e) { e.preventDefault(); });
    if (el.recoResult) el.recoResult.addEventListener("click", function (e) {
      var b = e.target.closest("[data-reco-pick]");
      if (!b) return;
      var id = b.getAttribute("data-reco-pick");
      // prefill the swimmer's ability for step 2 if still empty
      var sk = SKILLS.filter(function (s) { return s.v === state.recoSkill; })[0];
      if (sk && el.skillSelect && !el.skillSelect.value) el.skillSelect.value = sk.key;
      pickProgram(id, true);
      var p = programById(id);
      PKB.toast({ type: "success", message: "Izbrana skupina: " + (p ? p.name : id) + "." });
    });
  }
  function openRecoFromLink() {
    if (state.done) { scrollToForm(el.panel); return; }
    if (state.step !== 1) showStep(1, { history: "push", focus: false, scroll: false });
    setRecoOpen(true, true);
    el.reco.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
  }

  /* ------------------------------------------------------------------
     Terms modal
     ------------------------------------------------------------------ */
  function openTerms() {
    var items = [
      "Prvi trening je poskusni – za vpis se odločite po njem.",
      enrollFee != null ? "Ob prvem vpisu se poravna vpisnina po veljavnem ceniku (" + fmtPrice(enrollFee) + ")." : "Ob prvem vpisu se poravna vpisnina po veljavnem ceniku.",
      pricing.paymentNote || "",
      pricing.note || "",
      siblingRate ? "Za drugega otroka iz iste družine velja " + pctText() + " popust pri mesečni članarini." : "",
      "Plavalna šola poteka od sredine septembra do konca šolskega leta. Vpis med letom je mogoč, če so v skupini prosta mesta.",
      "Če trener oceni, da bi bila za otroka primernejša druga skupina, vas o tem obvestimo."
    ].filter(Boolean);
    var valid = pricing.validFrom ? '<p class="small soft mt-4">Cenik velja od ' + esc(PKB.formatDate(pricing.validFrom)) + ". Za vprašanja smo vam na voljo v pisarni kluba.</p>" : "";
    var m = PKB.modal.open({
      title: "Pogoji vpisa",
      size: "sm",
      content: '<ul class="list-check">' + items.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" + valid,
      footer: '<button type="button" class="btn btn--ghost" data-modal-close>Zapri</button><button type="button" class="btn btn--primary" data-terms-accept data-modal-close>' + icon("check") + "Strinjam se</button>"
    });
    var acc = qs("[data-terms-accept]", m.dialog);
    if (acc) acc.addEventListener("click", function () {
      if (el.terms) { el.terms.checked = true; PKB.validateField(el.terms); }
    });
  }

  /* ------------------------------------------------------------------
     Submit → success state
     ------------------------------------------------------------------ */
  function makeRef(d) {
    var str = DRAFT_FIELDS.concat(["zdravje"]).map(function (k) { return k + "=" + (d[k] || ""); }).join("|");
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    var A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", code = "";
    for (var j = 0; j < 4; j++) { code += A.charAt(h & 31); h = h >>> 5; }
    return "PKB-" + PKB.today().getFullYear() + "-" + code;
  }
  function buildMailto(s) {
    var d = s.data, p = s.program, a = s.age;
    var pi = priceInfo(p, !!d.sorojenec);
    var full = (d.ime + " " + d.priimek).trim();
    var L = [];
    L.push("Prijava v " + (club.name || "PK Branik Maribor"));
    L.push("Referenčna številka: " + s.ref);
    L.push("");
    L.push("PROGRAM");
    L.push("Skupina: " + p.name + (catName(p) ? " (" + catName(p) + ")" : ""));
    var wk = weeklyText(p.id);
    if (wk) L.push("Termini: " + wk);
    L.push("Mesečna članarina: " + (pi.monthly != null ? fmtPrice(pi.monthly) : "po dogovoru") + (pi.sibling ? " (popust za brata ali sestro " + pctText() + (pi.total != null ? " → " + fmtPrice(pi.total) : "") + ")" : ""));
    if (pi.fee != null) L.push("Vpisnina (po ceniku): " + fmtPrice(pi.fee));
    L.push("");
    L.push("PLAVALEC");
    L.push("Ime in priimek: " + full);
    L.push("Datum rojstva: " + PKB.formatDate(d.rojstvo) + (a ? " (" + ageText(a) + ")" : ""));
    if (d.spol) L.push("Spol: " + d.spol);
    if (d.predznanje) L.push("Predznanje: " + skillTitle(d.predznanje));
    L.push("Zdravstvene posebnosti: " + (d.zdravje || "—"));
    L.push("");
    L.push("KONTAKT");
    if (s.minor) L.push("Starš/skrbnik: " + (d.skrbnik || "—"));
    L.push("E-pošta: " + d.email);
    L.push("Telefon: " + d.telefon);
    var addr = [d.naslov, [d.posta, d.kraj].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    if (addr) L.push("Naslov: " + addr);
    L.push("Brat ali sestra že v klubu: " + (d.sorojenec ? "da" : "ne"));
    L.push("");
    L.push("SOGLASJA");
    L.push("Pogoji vpisa: " + (d.pogoji ? "da" : "ne"));
    L.push("Obdelava osebnih podatkov: " + (d.zasebnost ? "da" : "ne"));
    L.push("Objava fotografij: " + (d.fotografije ? "da" : "ne"));
    var subject = "Spletni vpis: " + p.name + " – " + full + " (" + s.ref + ")";
    return "mailto:" + (club.email || "") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(L.join("\r\n"));
  }
  function finalSubmit() {
    for (var i = 1; i < STEPS; i++) {
      if (!stepValid(i)) {
        showStep(i, { focus: true, history: "push", scroll: true });
        PKB.validateForm(stepEl(i));
        PKB.toast({ type: "error", title: "Preverite podatke", message: "Korak »" + STEP_NAMES[i - 1] + "« še ni v celoti izpolnjen." });
        return;
      }
    }
    var d = collect();
    var p = selectedProgram();
    if (!p) return;
    var s = { data: d, program: p, age: currentAge(), minor: isMinor() };
    s.ref = makeRef(d);
    s.reviewHTML = reviewHTML(false);
    s.priceHTML = priceHTML();
    state.submitted = s;
    state.done = true;
    PKB.storage.remove(STORE);
    renderDone();
  }
  function renderDone() {
    var s = state.submitted;
    var d = s.data, p = s.program;
    var full = (d.ime + " " + d.priimek).trim();
    var greet = s.minor && d.skrbnik ? d.skrbnik.split(/\s+/)[0] : d.ime;
    var ns = nextSession(p.id);
    var office = ((club.officeHours || [])[0] || {}).hours || "";
    var mailto = club.email ? buildMailto(s) : "";
    s.mailto = mailto;
    el.done.innerHTML =
      '<div class="enr-done__head">' +
        '<span class="icon-bubble enr-done__icon" aria-hidden="true">' + icon("check") + "</span>" +
        '<div><p class="eyebrow">Prijava izpolnjena</p>' +
        '<h2 class="enr-done__title" tabindex="-1" data-done-title>Hvala, ' + esc(greet) + '! <span class="gradient-text">Še zadnji korak.</span></h2></div>' +
      "</div>" +
      '<p class="lead enr-done__lead">Prijava v skupino <strong>' + esc(p.name) + "</strong> (plavalec: <strong>" + esc(full) + "</strong>) je pripravljena. " +
        (mailto ? "Da jo prejmemo, jo pošljite po e-pošti – sporočilo z vsemi podatki je že sestavljeno." : "Pokličite nas in navedite referenčno številko.") + "</p>" +
      '<div class="tile tile--raised enr-ref">' +
        '<div><span class="enr-ref__label">Referenčna številka</span><span class="enr-ref__code num" data-ref>' + esc(s.ref) + "</span></div>" +
        '<div class="enr-ref__actions"><button type="button" class="btn btn--sm" data-copy-ref>' + icon("copy") + "Kopiraj</button></div>" +
      "</div>" +
      '<div class="cluster enr-done__actions">' +
        (mailto ? '<a class="btn btn--primary btn--lg" href="' + esc(mailto) + '" data-mailto>' + icon("send") + "Pošlji prijavo po e-pošti</a>" : "") +
        (ns ? '<button type="button" class="btn btn--lg" data-ics>' + icon("calendar-plus") + "Dodaj prvi trening v koledar</button>" : "") +
      "</div>" +
      "<div>" +
        '<h3 class="enr-done__h">Kaj sledi</h3>' +
        '<ol class="enr-next" role="list">' +
          '<li class="tile enr-next__item"><span class="enr-next__n" aria-hidden="true">1</span><span class="enr-next__title">Pošljite prijavo</span><span class="enr-next__text">' +
            (mailto ? "Gumb zgoraj odpre e-poštno sporočilo za <strong>" + esc(club.email) + "</strong> z vsemi podatki in referenčno številko." : "Pokličite pisarno kluba na " + esc(club.phone || "") + ".") + "</span></li>" +
          '<li class="tile enr-next__item"><span class="enr-next__n" aria-hidden="true">2</span><span class="enr-next__title">Potrditev kluba</span><span class="enr-next__text">Pisarna na Pristanu' + (office ? " (pon–pet " + esc(office) + ")" : "") + " preveri prosta mesta in vam potrdi termin prvega treninga.</span></li>" +
          '<li class="tile enr-next__item"><span class="enr-next__n" aria-hidden="true">3</span><span class="enr-next__title">Poskusni trening</span><span class="enr-next__text">' +
            (ns ? "Naslednji termin skupine: <strong>" + esc(sessionText(ns, true)) + "</strong> (" + esc(ns.s.pool) + "). " : "") +
            "Prinesite kopalke, plavalno kapo, očala, brisačo in natikače.</span></li>" +
        "</ol>" +
      "</div>" +
      '<details class="accordion-item enr-done__details"><summary>Povzetek prijave</summary><div class="accordion-body"><div class="enr-review">' + s.reviewHTML + '</div><div class="enr-price">' + s.priceHTML + "</div></div></details>" +
      '<div class="enr-done__foot">' +
        '<p class="small soft">' + icon("lock", "icon--sm") + "<span>Osnutek prijave smo s te naprave izbrisali. Referenčno številko si zapišite.</span></p>" +
        '<div class="cluster">' +
          '<button type="button" class="btn btn--ghost" data-new="sibling">' + icon("users") + "Vpiši še brata ali sestro</button>" +
          '<button type="button" class="btn btn--ghost" data-new="fresh">' + icon("plus") + "Nov vpis</button>" +
        "</div>" +
      "</div>";
    form.hidden = true;
    if (el.stepperWrap) el.stepperWrap.hidden = true;
    el.done.hidden = false;
    setHash(null, "replace");
    updateStepper();
    renderSummary();
    updateBar();
    scrollToForm(el.panel);
    var t = qs("[data-done-title]", el.done);
    if (t) t.focus({ preventScroll: true });
  }
  function downloadFirstTraining() {
    var s = state.submitted;
    if (!s) return;
    var ns = nextSession(s.program.id);
    if (!ns) { PKB.toast({ type: "error", message: "Za to skupino termin še ni objavljen." }); return; }
    PKB.downloadICS([{
      title: "PK Branik – prvi trening: " + s.program.name,
      start: ns.start,
      end: ns.end,
      location: [(club.venue || "") + (ns.s.pool ? " (" + ns.s.pool + ")" : ""), club.address, club.postal].filter(Boolean).join(", "),
      description: "Poskusni trening skupine " + s.program.name + ". Referenčna številka prijave: " + s.ref + ". Prinesite kopalke, plavalno kapo, očala, brisačo in natikače."
    }], "pk-branik-prvi-trening-" + s.program.id + ".ics");
  }
  function startNew(sibling) {
    var keep = null;
    if (sibling && state.submitted) {
      keep = {};
      CONTACT_FIELDS.forEach(function (k) { if (state.submitted.data[k]) keep[k] = state.submitted.data[k]; });
      if (state.submitted.minor && !keep.skrbnik) delete keep.skrbnik;
      if (!state.submitted.minor) delete keep.priimek;
    }
    form.reset();
    if (el.recoForm) el.recoForm.reset();
    clearValidation();
    state.done = false;
    state.submitted = null;
    state.maxReached = 1;
    state.recoSkill = null;
    state.recoAgeTouched = false;
    setRecoAge(6);
    setRecoOpen(false);
    el.done.hidden = true;
    el.done.innerHTML = "";
    form.hidden = false;
    if (el.stepperWrap) el.stepperWrap.hidden = false;
    if (keep) {
      setData(keep);
      if (el.sibling) el.sibling.checked = true;
    }
    birthValidity();
    afterDataChange();
    state.step = 0;
    showStep(1, { focus: true, scroll: true, history: "replace" });
    setHash(null, "replace");
    updateBar();
    doSave();
    PKB.toast(keep
      ? { type: "success", title: "Nov vpis za brata ali sestro", message: "Kontaktne podatke smo prenesli, popust za sorojence je označen." }
      : { type: "info", message: "Začenjate nov vpis." });
  }

  /* ------------------------------------------------------------------
     FAQ + data-driven static bits
     ------------------------------------------------------------------ */
  function renderFAQ() {
    if (!el.faq) return;
    var faq = (Array.isArray(D.faq) ? D.faq : []).filter(function (f) { return f && f.q && f.a; });
    var list = faq.filter(function (f) { return f.topic === "vpis"; });
    faq.forEach(function (f) { if (f.topic !== "vpis" && /skupino|potrebuje/.test(f.q) && list.length < 6) list.push(f); });
    if (!list.length) return;
    el.faq.innerHTML = list.map(function (f, i) {
      return '<details class="accordion-item"' + (i === 0 ? " open" : "") + "><summary>" + esc(f.q) + '</summary><div class="accordion-body"><p>' + esc(f.a) + "</p></div></details>";
    }).join("");
  }
  function fillStatic() {
    var season = qs("[data-season]");
    if (season && club.season) season.textContent = club.season;
    var priced = programs.filter(function (p) { return num(p.price); }).map(function (p) { return p.price; });
    var fp = qs('[data-fact="price"]');
    if (fp && priced.length) fp.textContent = fmtPrice(Math.min.apply(null, priced));
    var fs = qs('[data-fact="sibling"]');
    if (fs) { if (siblingRate) fs.textContent = pctText(); else fs.closest("li").hidden = true; }
    var ages = agedPrograms().map(function (p) { return p.minAge; });
    var fa = qs('[data-fact="age"]');
    if (fa && ages.length) fa.textContent = Math.floor(Math.min.apply(null, ages)) + "+";
    var office = qs("[data-office]");
    var oh = ((club.officeHours || [])[0] || {}).hours;
    if (office && oh) office.textContent = oh;
    var ph = qs("[data-club-phone]");
    if (ph && club.phone) { ph.href = club.phoneHref || ("tel:" + club.phone.replace(/\s+/g, "")); qs("span", ph).textContent = club.phone; }
    var ml = qs("[data-club-mail]");
    if (ml && club.email) { ml.href = "mailto:" + club.email; qs("span", ml).textContent = club.email; }
  }

  /* ------------------------------------------------------------------
     Events
     ------------------------------------------------------------------ */
  // trim text values before the shared blur validation runs (registered before PKB.initForm)
  form.addEventListener("blur", function (e) {
    var t = e.target;
    if (t && t.matches && t.matches('input[type="text"], input[type="tel"], input[type="email"]') && t.value !== t.value.trim()) t.value = t.value.trim();
  }, true);
  if (el.birth) {
    el.birth.addEventListener("input", birthValidity);
    el.birth.addEventListener("change", birthValidity);
  }

  form.addEventListener("input", function (e) {
    var t = e.target;
    if (t.form !== form) return;
    if (t === el.health) updateCount();
    if (t === el.birth) { updateAgeUI(); updateContactUI(); syncRecoFromBirth(); }
    if (t.name === "ime") updateAgeUI();
    updateStepper();
    renderSummary();
    scheduleSave();
  });
  form.addEventListener("change", function (e) {
    var t = e.target;
    if (t.form !== form) return;
    if (t.name === "program") onProgramChange();
    if (t === el.birth) { updateAgeUI(); updateContactUI(); syncRecoFromBirth(); }
    if (t === el.skillSelect) updateAgeUI();
    if (t === el.sibling) updateSiblingHint();
    updateStepper();
    renderSummary();
    scheduleSave();
  });

  el.panel.addEventListener("click", function (e) {
    var g = e.target.closest("[data-goto]");
    if (g && !state.done) {
      e.preventDefault();
      var n = Number(g.getAttribute("data-goto"));
      if (n === state.step) { focusHeading(n); scrollToForm(); return; }
      goTo(n, { history: "push" });
      return;
    }
    var sw = e.target.closest("[data-swap]");
    if (sw) {
      var id = sw.getAttribute("data-swap");
      selectProgramById(id);
      var p = programById(id);
      PKB.toast({ type: "success", title: "Skupina je zamenjana", message: "Izbrana skupina: " + (p ? p.name : id) + "." });
      var h = qs(".enr-step__title", stepEl(state.step));
      if (h) h.focus({ preventScroll: true });
      return;
    }
    if (e.target.closest("[data-terms]")) { e.preventDefault(); openTerms(); return; }
    if (e.target.closest("[data-copy-ref]") && state.submitted) { PKB.copy(state.submitted.ref, "Referenčna številka je kopirana."); return; }
    if (e.target.closest("[data-ics]")) { downloadFirstTraining(); return; }
    var nw = e.target.closest("[data-new]");
    if (nw) { startNew(nw.getAttribute("data-new") === "sibling"); return; }
  });
  el.back.addEventListener("click", function () {
    if (state.step > 1) goTo(state.step - 1, { history: "push" });
  });

  // hero actions + draft banner
  var start = qs("[data-start]");
  if (start) start.addEventListener("click", function (e) {
    e.preventDefault();
    scrollToForm(state.done ? el.panel : null);
    if (state.done) { var t = qs("[data-done-title]", el.done); if (t) t.focus({ preventScroll: true }); }
    else focusHeading(state.step);
  });
  qsa("[data-open-reco]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); openRecoFromLink(); });
  });
  var dc = qs("[data-draft-continue]"), dd = qs("[data-draft-discard]");
  if (dc) dc.addEventListener("click", continueDraft);
  if (dd) dd.addEventListener("click", discardDraft);

  // history: back/forward between steps, manual hash edits
  window.addEventListener("hashchange", function () {
    var h = window.location.hash;
    var m = /^#korak-([1-4])$/.exec(h);
    if (m) {
      if (state.done) return;
      var n = Number(m[1]);
      if (n !== state.step) {
        if (!goTo(n, { history: null, focus: true })) setHash(state.step, "replace");
      }
      return;
    }
    if (h === "#pomoc-pri-izbiri") { openRecoFromLink(); return; }
    if (!h && !state.done && state.step !== 1) showStep(1, { focus: true, history: null });
  });

  /* ------------------------------------------------------------------
     Init
     ------------------------------------------------------------------ */
  fillStatic();
  renderPrograms();
  initReco();
  renderFAQ();
  updateCount();

  PKB.initForm(form, {
    onSubmit: function () {
      if (state.done) return;
      if (state.step < STEPS) goTo(state.step + 1, { history: "push" });
      else finalSubmit();
    }
  });

  var fromParam = paramProgram();
  if (fromParam) selectProgramById(fromParam.id, { silent: true });

  var rec = loadDraft();
  if (rec) showDraftBanner(rec);

  afterDataChange();
  var hashStep = /^#korak-([1-4])$/.exec(window.location.hash);
  if (hashStep && Number(hashStep[1]) > 1 && !state.draftPending) {
    if (goTo(Number(hashStep[1]), { history: "replace", silent: true, focus: false })) setHash(state.step, "replace");
    requestAnimationFrame(function () { scrollToForm(); });
  } else {
    showStep(1, { animate: false, focus: false, scroll: false, history: hashStep ? "replace" : null });
  }
  if (window.location.hash === "#pomoc-pri-izbiri") {
    setRecoOpen(true, false);
    requestAnimationFrame(function () { el.reco.scrollIntoView({ block: "start" }); });
  }
  setSaveStatus(state.draftPending ? "paused" : null);
  updateBar();
  if (state.draftPending) {
    var place = function () { setTimeout(placeDraftBanner, 60); setTimeout(placeDraftBanner, 450); };
    if (document.readyState === "complete") place(); else window.addEventListener("load", place, { once: true });
  }
})();
