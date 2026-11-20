/* ==========================================================================
   Kontakt (kontakt.html) — page script. Prefix: contact-
   - live office status (data.club.officeHours, Slovenian public holidays)
   - copy / call / mail / maps actions, social links from data
   - contact form: ?zadeva preselect, topic hints, live counter, draft autosave,
     success state with mailto fallback, last message kept in PKB.storage
   - privacy-friendly click-to-load Google map (+ remembered choice)
   - FAQ (topics kontakt + vpis), deep links #obrazec #zemljevid #faq #faq-<slug>
   Test parameters: ?danes=YYYY-MM-DD (PKB.today) and ?ura=HH:MM (clock).
   ========================================================================== */
(function () {
  "use strict";

  var PKB = window.PKB;
  if (!PKB) return;
  var main = PKB.qs("main.contact");
  if (!main) return;

  var D = PKB.data || {};
  var C = D.club || {};
  var qs = PKB.qs, qsa = PKB.qsa, esc = PKB.escapeHTML;
  var reduced = PKB.prefersReducedMotion;

  var KEY_DRAFT = "kontakt:osnutek";
  var KEY_LAST = "kontakt:zadnje";
  var KEY_MAP = "kontakt:zemljevid";
  var MSG_MIN = 20;

  var pad = function (n) { return String(n).padStart(2, "0"); };
  var hhmm = function (d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  var addDays = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
  var sameDay = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
  var str = function (v, max) { return typeof v === "string" ? v.slice(0, max || 2000) : ""; };

  /* ------------------------------------------------------------------
     1. Club data → page (single source of truth = data.js)
     ------------------------------------------------------------------ */
  var fullAddress = [C.venue, C.address, C.postal].filter(Boolean).join(", ");
  function fillClub() {
    qsa("[data-club]").forEach(function (el) {
      var k = el.getAttribute("data-club");
      if (!C[k]) return;
      if (k === "email") el.innerHTML = esc(C.email).replace("@", "@<wbr>");
      else el.textContent = C[k];
    });
    if (C.phoneHref) qsa("[data-club-tel]").forEach(function (a) { a.setAttribute("href", C.phoneHref); });
    if (C.email) qsa("[data-club-mailto]").forEach(function (a) { a.setAttribute("href", "mailto:" + C.email); });
    if (C.mapsUrl) qsa("[data-club-maps]").forEach(function (a) { a.setAttribute("href", C.mapsUrl); });
    if (fullAddress) {
      qsa("[data-route]").forEach(function (a) {
        a.setAttribute("href", "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(fullAddress) + "&travelmode=" + encodeURIComponent(a.getAttribute("data-route")));
      });
    }
    var host = qs("[data-social]");
    if (host) {
      var social = C.social || {};
      var labels = { facebook: "Facebook", instagram: "Instagram", youtube: "YouTube" };
      var keys = Object.keys(labels).filter(function (k) { return typeof social[k] === "string" && social[k]; });
      if (!keys.length) { var cell = host.closest(".contact-cell"); if (cell) cell.hidden = true; }
      else {
        host.innerHTML = keys.map(function (k) {
          return '<a class="btn btn--icon btn--sm" href="' + esc(social[k]) + '" target="_blank" rel="noopener" aria-label="' + labels[k] + ' (odpre se v novem zavihku)" data-tooltip="' + labels[k] + '">' + PKB.icon(k) + "</a>";
        }).join("");
      }
    }
  }

  /* ------------------------------------------------------------------
     2. Copy buttons
     ------------------------------------------------------------------ */
  var COPY = {
    phone: { text: function () { return C.phone; }, msg: "Telefonska številka je kopirana." },
    email: { text: function () { return C.email; }, msg: "E-poštni naslov je kopiran." },
    address: { text: function () { return fullAddress; }, msg: "Naslov je kopiran v odložišče." }
  };
  function flashCopied(btn) {
    var label = qs("span", btn);
    var svg = qs("svg", btn);
    if (!btn.dataset.orig) btn.dataset.orig = label ? label.textContent : "";
    if (svg) svg.outerHTML = PKB.icon("check");
    if (label) label.textContent = "Kopirano";
    btn.classList.add("is-copied");
    clearTimeout(btn._t);
    btn._t = setTimeout(function () {
      var s = qs("svg", btn);
      if (s) s.outerHTML = PKB.icon("copy");
      if (label) label.textContent = btn.dataset.orig;
      btn.classList.remove("is-copied");
    }, 1800);
  }
  main.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]");
    if (!b) return;
    var c = COPY[b.getAttribute("data-copy")];
    var text = c && c.text();
    if (!text) return;
    PKB.copy(text, c.msg).then(function () { flashCopied(b); });
  });

  /* ------------------------------------------------------------------
     3. Office hours: parse data, holidays, live status
     ------------------------------------------------------------------ */
  var DAY_WORDS = [["ponedeljek", "pon"], ["torek", "tor"], ["sreda", "sre"], ["cetrtek", "cet"], ["petek", "pet"], ["sobota", "sob"], ["nedelja", "ned"]];
  var DAY_ACC = ["v ponedeljek", "v torek", "v sredo", "v četrtek", "v petek", "v soboto", "v nedeljo"];
  var DAY_SHORT = D.daysShort && D.daysShort.length === 7 ? D.daysShort : ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];

  function parseDays(text) {
    var n = PKB.normalize(text);
    var found = [];
    DAY_WORDS.forEach(function (w, i) {
      var re = new RegExp("(^|[^a-z])(" + w[0] + "|" + w[1] + ")", "g"), m;
      while ((m = re.exec(n))) found.push({ d: i + 1, pos: m.index + m[1].length });
    });
    found.sort(function (a, b) { return a.pos - b.pos; });
    var days = [];
    if (found.length === 2 && /[–—-]|\bdo\b/.test(n.slice(found[0].pos, found[1].pos))) {
      for (var d = found[0].d, guard = 0; guard < 7; guard++, d = d % 7 + 1) { days.push(d); if (d === found[1].d) break; }
    } else {
      found.forEach(function (f) { if (days.indexOf(f.d) === -1) days.push(f.d); });
    }
    return { days: days, holidays: /prazni/.test(n) };
  }
  function parseHours(text) {
    var m = /(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})/.exec(text || "");
    if (m) {
      var from = Number(m[1]) * 60 + Number(m[2]), to = Number(m[3]) * 60 + Number(m[4]);
      if (to > from) return { type: "open", from: from, to: to };
    }
    if (/dogovor/i.test(text || "")) return { type: "appointment" };
    return { type: "closed" };
  }

  var HOURS = (Array.isArray(C.officeHours) ? C.officeHours : []).filter(function (r) { return r && r.days; }).map(function (r) {
    var d = parseDays(r.days);
    var h = parseHours(r.hours);
    return { days: d.days, holidays: d.holidays, type: h.type, from: h.from, to: h.to, label: String(r.days), hours: String(r.hours || ""), note: String(r.note || "") };
  });
  var WEEK = {};
  HOURS.forEach(function (r) { r.days.forEach(function (d) { if (!WEEK[d]) WEEK[d] = r; }); });
  if (!HOURS.some(function (r) { return r.type === "open"; })) {
    // safe fallback (matches the published office hours)
    var fb = { days: [1, 2, 3, 4, 5], type: "open", from: 960, to: 1140, label: "Ponedeljek – petek", hours: "16:00 – 19:00", note: "" };
    HOURS = [fb]; WEEK = {}; fb.days.forEach(function (d) { WEEK[d] = fb; });
  }
  var HOLIDAY_ROW = HOURS.filter(function (r) { return r.holidays; })[0] || null;

  /* Slovenian work-free public holidays (dela prosti dnevi) */
  var FIXED_HOLIDAYS = {
    "01-01": "novo leto", "01-02": "novo leto", "02-08": "Prešernov dan", "04-27": "dan upora proti okupatorju",
    "05-01": "praznik dela", "05-02": "praznik dela", "06-25": "dan državnosti", "08-15": "Marijino vnebovzetje",
    "10-31": "dan reformacije", "11-01": "dan spomina na mrtve", "12-25": "božič", "12-26": "dan samostojnosti in enotnosti"
  };
  function easterSunday(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  function holidayName(date) {
    var key = pad(date.getMonth() + 1) + "-" + pad(date.getDate());
    if (FIXED_HOLIDAYS[key]) return FIXED_HOLIDAYS[key];
    var e = easterSunday(date.getFullYear());
    if (sameDay(date, e)) return "velika noč";
    if (sameDay(date, addDays(e, 1))) return "velikonočni ponedeljek";
    if (sameDay(date, addDays(e, 49))) return "binkošti";
    return null;
  }
  function dayInfo(date) {
    var wd = PKB.isoWeekday(date);
    var hol = holidayName(date);
    if (hol && HOLIDAY_ROW) return { wd: wd, date: date, holiday: hol, type: "closed", row: HOLIDAY_ROW };
    var r = WEEK[wd];
    if (!r) return { wd: wd, date: date, holiday: hol, type: "closed", row: null };
    return { wd: wd, date: date, holiday: hol, type: r.type, from: r.from, to: r.to, row: r };
  }

  function readClock() {
    var date = PKB.today();
    var mins = null;
    var u = PKB.params().get("ura");
    if (u && /^([01]?\d|2[0-3]):[0-5]\d$/.test(u.trim())) mins = PKB.timeToMinutes(u.trim());
    if (mins === null) { var n = new Date(); mins = n.getHours() * 60 + n.getMinutes(); }
    return { date: date, mins: mins };
  }
  function computeStatus(t) {
    var today = dayInfo(t.date);
    if (today.type === "open" && t.mins >= today.from && t.mins < today.to) {
      return { open: true, today: today, left: today.to - t.mins, progress: (t.mins - today.from) / (today.to - today.from) };
    }
    for (var i = 0; i <= 21; i++) {
      var info = dayInfo(addDays(t.date, i));
      if (info.type !== "open") continue;
      if (i === 0 && t.mins >= info.from) continue;
      return { open: false, today: today, next: info, offset: i, until: i * 1440 + info.from - t.mins };
    }
    return { open: false, today: today, next: null };
  }
  function duration(m) {
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60), r = m % 60;
    return h + " h" + (r ? " " + r + " min" : "");
  }
  function whenPhrase(st) {
    var t = PKB.minutesToTime(st.next.from);
    if (st.offset === 0) return "danes ob " + t;
    if (st.offset === 1) return "jutri ob " + t;
    var d = st.next.date;
    return DAY_ACC[st.next.wd - 1] + (st.offset > 6 ? " (" + d.getDate() + ". " + (d.getMonth() + 1) + ".)" : "") + " ob " + t;
  }

  var office = qs("[data-office]");
  function renderOffice() {
    if (!office) return;
    var t = readClock();
    var st = computeStatus(t);
    var badge = qs("[data-office-badge]", office);
    var title = qs("[data-office-title]", office);
    var sub = qs("[data-office-sub]", office);
    var clock = qs("[data-office-clock]", office);
    var progWrap = qs("[data-office-progress]", office);
    var note = qs("[data-office-note]", office);
    var wd = PKB.isoWeekday(t.date);

    office.classList.toggle("is-open", st.open);
    office.classList.toggle("is-closed", !st.open);
    office.setAttribute("data-state", st.open ? "open" : "closed");
    clock.textContent = DAY_SHORT[wd - 1] + ", " + t.date.getDate() + ". " + (t.date.getMonth() + 1) + ". · " + PKB.minutesToTime(t.mins);

    if (st.open) {
      badge.className = "badge badge--success badge-live contact-office__badge";
      badge.textContent = "Odprto";
      title.textContent = "Pisarna je zdaj odprta";
      sub.innerHTML = "Zapre se ob <strong>" + PKB.minutesToTime(st.today.to) + "</strong> · še " + duration(st.left) + ".";
      progWrap.hidden = false;
      qs("[data-office-bar]", progWrap).parentNode.style.setProperty("--value", Math.round(st.progress * 100) + "%");
      qs("[data-office-from]", progWrap).textContent = PKB.minutesToTime(st.today.from);
      qs("[data-office-to]", progWrap).textContent = PKB.minutesToTime(st.today.to);
    } else {
      var appt = st.today.type === "appointment";
      badge.className = "badge contact-office__badge " + (appt ? "is-appointment" : "is-closed");
      badge.textContent = appt ? "Po dogovoru" : "Zaprto";
      title.textContent = "Pisarna je zdaj zaprta";
      if (st.next) {
        var rel = st.until < 1440 ? "čez " + duration(st.until) : "čez " + st.offset + " " + PKB.plural(st.offset, ["dan", "dneva", "dni", "dni"]);
        sub.innerHTML = "— odpre se <strong>" + esc(whenPhrase(st)) + "</strong> · " + esc(rel) + ".";
      } else {
        sub.textContent = "Za termin se dogovorite po telefonu ali e-pošti.";
      }
      progWrap.hidden = true;
    }

    // note under the table
    var noteText;
    if (st.today.holiday && st.today.type === "closed" && HOLIDAY_ROW) noteText = PKB.icon("calendar", "icon--sm") + "<span>Danes je dela prost dan (" + esc(st.today.holiday) + "), zato je pisarna zaprta.</span>";
    else if (!st.open && st.today.type === "appointment") noteText = PKB.icon("phone", "icon--sm") + "<span>" + esc(st.today.row.label) + ": " + esc(st.today.row.hours) + " — pokličite ali nam pišite.</span>";
    else noteText = PKB.icon("map-pin", "icon--sm") + "<span>Pisarna je na " + esc(C.venue ? "lokaciji " + C.venue : "Pristanu") + (C.address ? ", " + esc(C.address) : "") + ".</span>";
    note.innerHTML = noteText;

    // week strip (current Mon–Sun)
    var monday = addDays(t.date, 1 - wd);
    var week = qs("[data-office-week]", office);
    var html = "";
    for (var i = 0; i < 7; i++) {
      var info = dayInfo(addDays(monday, i));
      var isToday = i + 1 === wd;
      var past = i + 1 < wd || (isToday && info.type === "open" && t.mins >= info.to);
      var cls = "contact-week__item is-" + info.type + (isToday ? " is-today" : "") + (past ? " is-past" : "");
      var fill = (isToday && st.open) ? Math.round(st.progress * 100) : 0;
      html += '<li class="' + cls + '"><span class="contact-week__bar"><span style="--p:' + fill + '%"></span></span><span class="contact-week__name">' + esc(DAY_SHORT[i]) + "</span></li>";
    }
    week.innerHTML = html;

    // hours table from data, today's row marked
    var tbody = qs("[data-office-table] tbody", office);
    var todayRow = st.today.row;
    tbody.innerHTML = HOURS.map(function (r) {
      var isToday = r === todayRow;
      return '<tr class="' + (isToday ? "is-today" : "") + '"><th scope="row">' + esc(r.label) +
        (isToday ? '<span class="visually-hidden"> (danes)</span>' : "") + "</th><td>" + esc(r.hours) + "</td></tr>";
    }).join("");
  }

  /* ------------------------------------------------------------------
     4. Contact form
     ------------------------------------------------------------------ */
  var TOPICS = [
    { id: "splosno", label: "Splošno vprašanje", hint: 'Za hitre odgovore preverite tudi <a href="#faq">pogosta vprašanja</a> spodaj.', ph: "Napišite svoje vprašanje …" },
    { id: "vpis", label: "Vpis v plavalno šolo", hint: 'Otroka lahko vpišete tudi neposredno prek <a href="vpis.html">spletnega obrazca za vpis</a>. Termine skupin najdete v <a href="urnik.html">urniku</a>.', ph: "Npr. starost otroka, predznanje plavanja in termini, ki vam ustrezajo …" },
    { id: "tekmovanja", label: "Tekmovanja", hint: 'Koledar tekem, rezultati in klubski rekordi so na strani <a href="tekmovanja.html">Tekmovanja</a>.', ph: "Npr. vprašanje o tekmi, prijavi ali rezultatih …" },
    { id: "partnerstvo", label: "Partnerstvo in sponzorstvo", hint: "Zanima vas podpora klubu ali sodelovanje? Na kratko opišite svojo zamisel in kako vas lahko dosežemo.", ph: "Npr. kdo ste in kakšno sodelovanje predlagate …" },
    { id: "mediji", label: "Mediji in fotografije", hint: 'Pri prošnji za fotografije navedite dogodek in namen uporabe. Utrinke s treningov in tekem najdete v <a href="galerija.html">galeriji</a>.', ph: "Npr. medij, dogodek in rok za odgovor …" }
  ];
  var ALIASES = {
    splosno: "splosno", splosna: "splosno", vprasanje: "splosno", drugo: "splosno",
    vpis: "vpis", sola: "vpis", "plavalna-sola": "vpis", prijava: "vpis",
    tekmovanja: "tekmovanja", tekmovanje: "tekmovanja", tekma: "tekmovanja", tekme: "tekmovanja",
    partnerstvo: "partnerstvo", sponzorstvo: "partnerstvo", sponzor: "partnerstvo", partnerji: "partnerstvo",
    mediji: "mediji", medij: "mediji", fotografije: "mediji", foto: "mediji"
  };
  var topicById = function (id) { return TOPICS.filter(function (t) { return t.id === id; })[0] || null; };
  var parseTopic = function (raw) { return raw ? ALIASES[PKB.slugify(raw)] || null : null; };

  var formPanel = qs("[data-formpanel]");
  var form = qs("[data-contact-form]");
  var success = qs("[data-success]");
  var lastEl = qs("[data-last]");
  if (!form) return;
  var el = function (name) { return form.elements.namedItem(name); };
  var fName = el("ime"), fEmail = el("eposta"), fPhone = el("telefon"), fTopic = el("zadeva"), fMsg = el("sporocilo"), fConsent = el("soglasje");
  var hint = qs("[data-topic-hint]");
  var counter = qs(".contact-counter", form);
  var countText = qs("[data-msg-count]", form);
  var countBar = qs("[data-msg-bar]", form);
  var draftNotice = qs("[data-draft-notice]");
  var draftStatus = qs("[data-draft-status]");
  var submitBtn = qs("[data-submit]", form);
  var busy = false;

  function applyTopic(id, animate) {
    var t = topicById(id) || TOPICS[0];
    if (fTopic.value !== t.id) fTopic.value = t.id;
    hint.innerHTML = PKB.icon("info", "icon--sm") + "<span>" + t.hint + "</span>";
    fMsg.placeholder = t.ph;
    if (animate && !reduced()) { hint.classList.remove("is-changed"); void hint.offsetWidth; hint.classList.add("is-changed"); }
  }
  function syncUrl() {
    if (!history.replaceState) return;
    var p = PKB.params();
    p.set("zadeva", fTopic.value);
    try { history.replaceState(history.state, "", location.pathname + "?" + p.toString() + location.hash); } catch (e) { /* ignore */ }
  }

  function updateCounter() {
    var len = fMsg.value.length, max = Number(fMsg.getAttribute("maxlength")) || 1500;
    countBar.style.setProperty("--p", Math.min(100, Math.round(len / MSG_MIN * 100)) + "%");
    var text;
    if (!len) text = "Vsaj " + MSG_MIN + " znakov · največ " + max;
    else if (len < MSG_MIN) { var r = MSG_MIN - len; text = "Še " + r + " " + PKB.plural(r, ["znak", "znaka", "znaki", "znakov"]) + " do najmanjše dolžine"; }
    else if (max - len <= 100) text = len + " / " + max + " znakov · še " + (max - len);
    else text = len + " / " + max + " znakov";
    countText.textContent = text;
    counter.classList.toggle("is-ok", len >= MSG_MIN);
    counter.classList.toggle("is-near", max - len <= 100);
  }

  /* --- draft autosave --- */
  function formData() {
    return { ime: fName.value, eposta: fEmail.value, telefon: fPhone.value, zadeva: fTopic.value, sporocilo: fMsg.value };
  }
  function hasText(d) { return !!(d && ((d.ime || "").trim() || (d.eposta || "").trim() || (d.telefon || "").trim() || (d.sporocilo || "").trim())); }
  function setDraftStatus(html) { draftStatus.innerHTML = html; }
  var DEFAULT_STATUS = PKB.icon("lock", "icon--sm") + "<span>Osnutek se samodejno shranjuje samo na tej napravi.</span>";
  function saveDraft() {
    if (busy || form.hidden) return;
    var d = formData();
    if (!hasText(d)) { PKB.storage.remove(KEY_DRAFT); setDraftStatus(DEFAULT_STATUS); return; }
    d.savedAt = Date.now();
    if (PKB.storage.set(KEY_DRAFT, d)) setDraftStatus(PKB.icon("check", "icon--sm") + "<span>Osnutek shranjen ob " + hhmm(new Date(d.savedAt)) + "</span>");
  }
  var saveDraftSoon = PKB.debounce(saveDraft, 450);
  function restoreDraft(paramTopic) {
    var d = PKB.storage.get(KEY_DRAFT, null);
    if (!d || typeof d !== "object" || !hasText(d)) { if (d) PKB.storage.remove(KEY_DRAFT); return false; }
    fName.value = str(d.ime, 80);
    fEmail.value = str(d.eposta, 120);
    fPhone.value = str(d.telefon, 24);
    fMsg.value = str(d.sporocilo, 1500);
    if (!paramTopic && topicById(d.zadeva)) fTopic.value = d.zadeva;
    var when = qs("[data-draft-when]", draftNotice);
    var at = typeof d.savedAt === "number" ? new Date(d.savedAt) : null;
    if (at && !isNaN(at)) {
      when.textContent = "Shranjen " + (sameDay(at, new Date()) ? "danes" : at.getDate() + ". " + (at.getMonth() + 1) + ".") + " ob " + hhmm(at) + ".";
    }
    draftNotice.hidden = false;
    setDraftStatus(PKB.icon("check", "icon--sm") + "<span>Osnutek je shranjen na tej napravi.</span>");
    return true;
  }
  function resetValidation() {
    qsa(".field", form).forEach(function (f) { f.classList.remove("is-invalid", "is-valid"); });
    qsa("input, select, textarea", form).forEach(function (c) { c.removeAttribute("aria-invalid"); });
  }
  function clearForm(keepContact) {
    if (!keepContact) { fName.value = ""; fEmail.value = ""; fPhone.value = ""; }
    fMsg.value = "";
    fConsent.checked = false;
    resetValidation();
    PKB.storage.remove(KEY_DRAFT);
    draftNotice.hidden = true;
    setDraftStatus(DEFAULT_STATUS);
    updateCounter();
  }

  form.addEventListener("input", function (e) {
    if (e.target === fMsg) updateCounter();
    saveDraftSoon();
  });
  fTopic.addEventListener("change", function () { applyTopic(fTopic.value, true); syncUrl(); saveDraftSoon(); });
  fMsg.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (form.requestSubmit) form.requestSubmit(); }
  });

  qs("[data-draft-discard]").addEventListener("click", function () {
    clearForm(false);
    PKB.toast({ type: "info", message: "Osnutek je zavržen." });
    fName.focus();
  });
  qs("[data-form-clear]", form).addEventListener("click", function () {
    if (!hasText(formData())) { clearForm(false); fName.focus(); return; }
    var m = PKB.modal.open({
      title: "Počistim obrazec?",
      size: "sm",
      className: "contact-modal",
      initialFocus: ".modal__foot [data-modal-close]",
      content: '<p class="muted">Vneseno besedilo in osnutek, shranjen na tej napravi, bosta izbrisana. Tega ni mogoče razveljaviti.</p>',
      footer: '<button type="button" class="btn btn--ghost" data-modal-close>Prekliči</button><button type="button" class="btn btn--danger" data-confirm-clear>' + PKB.icon("refresh") + "Počisti obrazec</button>"
    });
    qs("[data-confirm-clear]", m.dialog).addEventListener("click", function () {
      clearForm(false);
      m.close();
      PKB.toast({ type: "info", message: "Obrazec je počiščen." });
      setTimeout(function () { fName.focus(); }, 260);
    });
  });

  /* --- submit → success --- */
  function firstName(n) { return String(n || "").trim().split(/\s+/)[0] || ""; }
  function fmtSent(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return PKB.formatDate(d) + " ob " + hhmm(d);
  }
  function summaryHTML(rec) {
    var rows = [["Zadeva", esc(rec.zadevaLabel)], ["Ime", esc(rec.ime)], ["E-pošta", esc(rec.eposta)]];
    if (rec.telefon) rows.push(["Telefon", esc(rec.telefon)]);
    rows.push(["Oddano", esc(fmtSent(rec.sentAt))]);
    rows.push(["Sporočilo", esc(rec.sporocilo), "contact-summary__msg"]);
    return rows.map(function (r) {
      return '<div class="contact-summary__row"><dt>' + r[0] + "</dt><dd" + (r[2] ? ' class="' + r[2] + '"' : "") + ">" + r[1] + "</dd></div>";
    }).join("");
  }
  function mailtoHref(rec) {
    var subject = "[" + rec.zadevaLabel + "] Sporočilo s spletne strani – " + rec.ime;
    var lines = [rec.sporocilo, "", "—", "Ime in priimek: " + rec.ime, "E-pošta: " + rec.eposta];
    if (rec.telefon) lines.push("Telefon: " + rec.telefon);
    return "mailto:" + (C.email || "") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\r\n"));
  }
  function plainText(rec) {
    return "Zadeva: " + rec.zadevaLabel + "\nIme in priimek: " + rec.ime + "\nE-pošta: " + rec.eposta + (rec.telefon ? "\nTelefon: " + rec.telefon : "") + "\n\n" + rec.sporocilo;
  }
  function validRecord(r) {
    return r && typeof r === "object" && typeof r.sporocilo === "string" && r.sporocilo && typeof r.ime === "string" && typeof r.eposta === "string" && typeof r.sentAt === "string";
  }
  function normRecord(r) {
    var t = topicById(r.zadeva) || TOPICS[0];
    return { ime: str(r.ime, 80), eposta: str(r.eposta, 120), telefon: str(r.telefon, 24), zadeva: t.id, zadevaLabel: t.label, sporocilo: str(r.sporocilo, 1500), sentAt: r.sentAt };
  }

  var current = null;
  function showSuccess(rec) {
    current = rec;
    qs("[data-success-title]", success).textContent = "Hvala" + (firstName(rec.ime) ? ", " + firstName(rec.ime) : "") + "!";
    qs("[data-success-text]", success).innerHTML =
      "Vaše sporočilo z zadevo »" + esc(rec.zadevaLabel) + "« je oddano. Odgovor bomo poslali na <strong>" + esc(rec.eposta) + "</strong>. " +
      "Če ga želite poslati tudi iz svojega e-poštnega programa, uporabite gumb »Pošlji po e-pošti« — besedilo je že pripravljeno.";
    qs("[data-success-summary]", success).innerHTML = summaryHTML(rec);
    qs("[data-success-mailto]", success).setAttribute("href", mailtoHref(rec));
    form.hidden = true;
    draftNotice.hidden = true;
    success.hidden = false;
    renderLast();
    var note = qs(".contact-formpanel__head .muted", formPanel);
    if (note) note.hidden = true;
    var title = qs("[data-success-title]", success);
    formPanel.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
    title.focus({ preventScroll: true });
  }

  PKB.initForm(form, {
    onSubmit: function (f, data) {
      if (busy) return;
      busy = true;
      submitBtn.classList.add("is-busy");
      submitBtn.setAttribute("aria-disabled", "true");
      qs("[data-submit-label]", submitBtn).textContent = "Pošiljam …";
      var t = topicById(data.zadeva) || TOPICS[0];
      var rec = {
        ime: String(data.ime || "").trim(), eposta: String(data.eposta || "").trim(), telefon: String(data.telefon || "").trim(),
        zadeva: t.id, zadevaLabel: t.label, sporocilo: String(data.sporocilo || "").trim(), sentAt: new Date().toISOString()
      };
      setTimeout(function () {
        PKB.storage.set(KEY_LAST, rec);
        PKB.storage.remove(KEY_DRAFT);
        busy = false;
        submitBtn.classList.remove("is-busy");
        submitBtn.removeAttribute("aria-disabled");
        qs("[data-submit-label]", submitBtn).textContent = "Pošlji sporočilo";
        showSuccess(rec);
        PKB.toast({ type: "success", title: "Sporočilo je oddano", message: "Hvala! Odgovor bomo poslali na " + rec.eposta + "." });
      }, reduced() ? 150 : 750);
    }
  });

  qs("[data-success-copy]", success).addEventListener("click", function (e) {
    if (!current) return;
    var b = e.currentTarget;
    PKB.copy(plainText(current), "Besedilo sporočila je kopirano.").then(function () { flashCopied(b); });
  });
  qs("[data-success-new]", success).addEventListener("click", function () {
    var keep = current;
    success.hidden = true;
    form.hidden = false;
    var note = qs(".contact-formpanel__head .muted", formPanel);
    if (note) note.hidden = false;
    clearForm(true);
    if (keep) { fName.value = keep.ime; fEmail.value = keep.eposta; fPhone.value = keep.telefon; }
    current = null;
    renderLast();
    fMsg.focus();
  });

  /* --- last sent message (aside) --- */
  function renderLast() {
    if (!lastEl) return;
    var raw = PKB.storage.get(KEY_LAST, null);
    if (raw && !validRecord(raw)) { PKB.storage.remove(KEY_LAST); raw = null; }
    if (!raw || !success.hidden) { lastEl.hidden = true; return; }
    var rec = normRecord(raw);
    qs("[data-last-meta]", lastEl).textContent = fmtSent(rec.sentAt) + " · " + rec.zadevaLabel;
    qs("[data-last-excerpt]", lastEl).textContent = rec.sporocilo;
    lastEl.hidden = false;
  }
  if (lastEl) {
    qs("[data-last-open]", lastEl).addEventListener("click", function () {
      var raw = PKB.storage.get(KEY_LAST, null);
      if (!validRecord(raw)) { renderLast(); return; }
      var rec = normRecord(raw);
      PKB.modal.open({
        title: "Vaše zadnje sporočilo",
        className: "contact-modal",
        content: '<dl class="tile contact-summary">' + summaryHTML(rec) + '</dl><p class="small soft mt-4">Kopija je shranjena samo na tej napravi.</p>',
        footer: '<button type="button" class="btn btn--ghost" data-modal-close>Zapri</button><a class="btn btn--primary" href="' + esc(mailtoHref(rec)) + '">' + PKB.icon("mail") + "Pošlji po e-pošti</a>"
      });
    });
    qs("[data-last-delete]", lastEl).addEventListener("click", function () {
      PKB.storage.remove(KEY_LAST);
      renderLast();
      PKB.toast({ type: "info", message: "Kopija sporočila je izbrisana s te naprave." });
      var f = qs(".contact-quick__list a");
      if (f) f.focus();
    });
  }

  /* --- same-page links to the form --- */
  function goToForm(topic) {
    if (!success.hidden) qs("[data-success-new]", success).click();
    if (topic) { applyTopic(topic, true); syncUrl(); saveDraftSoon(); }
    formPanel.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
    var target = !fName.value.trim() ? fName : (!fEmail.value.trim() ? fEmail : fMsg);
    setTimeout(function () { target.focus({ preventScroll: true }); }, reduced() ? 0 : 450);
    pulse(formPanel);
  }
  main.addEventListener("click", function (e) {
    var a = e.target.closest("[data-goto-form], [data-topic-link]");
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0) return;
    e.preventDefault();
    goToForm(a.getAttribute("data-topic-link"));
  });

  /* ------------------------------------------------------------------
     5. Map (click to load)
     ------------------------------------------------------------------ */
  var map = qs("[data-map]");
  var frameHost = qs("[data-map-frame]");
  var mapStatus = qs("[data-map-status]");
  var hideBtn = qs("[data-map-hide]");
  var loadBtn = qs("[data-map-load]");
  var remember = qs("[data-map-remember]");
  var STATUS_OFF = PKB.icon("lock", "icon--sm") + "<span>Zemljevid ni naložen — brez piškotkov tretjih oseb.</span>";
  function loadMap(opts) {
    opts = opts || {};
    if (!map || map.classList.contains("is-loaded")) return;
    if (!C.mapEmbed) { PKB.toast({ type: "error", message: "Zemljevida trenutno ni mogoče naložiti." }); return; }
    frameHost.innerHTML = '<div class="skeleton" aria-hidden="true"></div>';
    frameHost.classList.remove("is-ready");
    var ifr = document.createElement("iframe");
    ifr.title = "Zemljevid: " + (fullAddress || "Kopališče Pristan");
    ifr.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    ifr.setAttribute("allowfullscreen", "");
    if (opts.lazy) ifr.setAttribute("loading", "lazy");
    ifr.addEventListener("load", function () {
      frameHost.classList.add("is-ready");
      var sk = qs(".skeleton", frameHost);
      if (sk) sk.remove();
    });
    ifr.src = C.mapEmbed;
    frameHost.appendChild(ifr);
    frameHost.hidden = false;
    map.classList.add("is-loaded");
    hideBtn.hidden = false;
    mapStatus.innerHTML = PKB.icon("info", "icon--sm") + "<span>Zemljevid zagotavlja Google — veljajo njegovi pogoji in pravila o zasebnosti.</span>";
    if (remember && remember.checked) PKB.storage.set(KEY_MAP, true);
    if (opts.focus) hideBtn.focus();
  }
  function hideMap() {
    frameHost.innerHTML = "";
    frameHost.hidden = true;
    frameHost.classList.remove("is-ready");
    map.classList.remove("is-loaded");
    hideBtn.hidden = true;
    var had = PKB.storage.get(KEY_MAP, false) === true;
    PKB.storage.remove(KEY_MAP);
    if (remember) remember.checked = false;
    mapStatus.innerHTML = STATUS_OFF;
    loadBtn.focus();
    PKB.toast({ type: "info", message: had ? "Zemljevid je skrit. Izbire si ne zapomnimo več." : "Zemljevid je skrit." });
  }
  if (map) {
    loadBtn.addEventListener("click", function () { loadMap({ focus: true }); });
    hideBtn.addEventListener("click", hideMap);
    if (PKB.storage.get(KEY_MAP, false) === true) {
      if (remember) remember.checked = true;
      loadMap({ lazy: true });
    }
  }

  /* ------------------------------------------------------------------
     6. FAQ
     ------------------------------------------------------------------ */
  var faqHost = qs("[data-faq]");
  function renderFaq() {
    if (!faqHost) return;
    var order = { kontakt: 0, vpis: 1 };
    var items = (Array.isArray(D.faq) ? D.faq : []).filter(function (f) { return f && f.q && f.a && (f.topic === "kontakt" || f.topic === "vpis"); })
      .map(function (f, i) { return { f: f, i: i }; })
      .sort(function (a, b) { return order[a.f.topic] - order[b.f.topic] || a.i - b.i; })
      .map(function (x) { return x.f; });
    if (!items.length) {
      faqHost.innerHTML = '<div class="empty-state tile"><span class="icon-bubble">' + PKB.icon("help-circle") + '</span><p>Vprašanja trenutno niso na voljo.</p><a class="btn btn--sm" href="programi.html#faq">Pogosta vprašanja na strani Programi</a></div>';
      return;
    }
    var used = {};
    faqHost.innerHTML = items.map(function (f) {
      var id = "faq-" + PKB.slugify(f.q).slice(0, 48).replace(/-+$/, "");
      while (used[id]) id += "-2";
      used[id] = true;
      var links = f.topic === "kontakt"
        ? '<a href="#zemljevid">Zemljevid in prihod</a>'
        : '<a href="vpis.html">Spletni vpis</a><a href="urnik.html">Urnik skupin</a>';
      return '<details class="accordion-item" id="' + id + '"><summary><span class="contact-faq__q">' + esc(f.q) + "</span></summary>" +
        '<div class="accordion-body"><p>' + esc(f.a) + '</p><p class="contact-faq__links">' + links + "</p></div></details>";
    }).join("");
  }

  /* ------------------------------------------------------------------
     7. Deep links (#obrazec, #zemljevid, #faq, #faq-<slug>)
     ------------------------------------------------------------------ */
  function pulse(node) {
    if (!node || reduced()) return;
    node.classList.remove("highlight-pulse");
    void node.offsetWidth;
    node.classList.add("highlight-pulse");
    setTimeout(function () { node.classList.remove("highlight-pulse"); }, 2300);
  }
  function handleHash(initial) {
    var h = "";
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
    if (!h) return;
    var target = document.getElementById(h);
    if (!target || !main.contains(target)) return;
    var focusEl = null, pulseEl = target;
    if (h === "obrazec") pulseEl = formPanel;
    else if (h === "zemljevid") pulseEl = qs(".contact-mapwrap");
    else if (h === "faq") pulseEl = null;
    else if (target.tagName === "DETAILS") { target.open = true; focusEl = qs("summary", target); }
    target.scrollIntoView({ behavior: initial || reduced() ? "auto" : "smooth", block: "start" });
    if (focusEl) focusEl.focus({ preventScroll: true });
    if (pulseEl) pulse(pulseEl);
  }
  window.addEventListener("hashchange", function () { handleHash(false); });

  /* print: show every FAQ answer, restore afterwards */
  var printOpened = [];
  window.addEventListener("beforeprint", function () {
    printOpened = qsa("[data-faq] details:not([open])");
    printOpened.forEach(function (d) { d.open = true; });
  });
  window.addEventListener("afterprint", function () {
    printOpened.forEach(function (d) { d.open = false; });
    printOpened = [];
  });

  /* ------------------------------------------------------------------
     8. Boot
     ------------------------------------------------------------------ */
  fillClub();
  renderOffice();
  setInterval(renderOffice, 20000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) renderOffice(); });

  var paramTopic = parseTopic(PKB.params().get("zadeva"));
  var restored = restoreDraft(paramTopic);
  applyTopic(paramTopic || fTopic.value || "splosno", false);
  if (paramTopic) fTopic.value = paramTopic;
  updateCounter();
  if (!restored) setDraftStatus(DEFAULT_STATUS);
  renderLast();
  renderFaq();

  if (location.hash) {
    // content above the anchor was rendered by JS — settle the scroll position once layout is final
    requestAnimationFrame(function () { handleHash(true); });
  }
})();
