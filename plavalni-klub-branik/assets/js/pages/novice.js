/* ==========================================================================
   Novice (novice.html) – page script. Prefix: news-
   Featured story, searchable / filterable list with URL state, archive by
   month, upcoming events and an article reader (modal) with deep links.
   ========================================================================== */
(function () {
  "use strict";

  var PKB = window.PKB;
  if (!PKB) return;
  var doc = document;
  var root = PKB.qs("[data-news]");
  if (!root) return;

  var D = PKB.data || {};
  var qs = PKB.qs, qsa = PKB.qsa, esc = PKB.escapeHTML, icon = PKB.icon;
  var PAGE = 6;
  var VIEW_KEY = "novice-view";
  var NEW_DAYS = 14;
  var reduce = function () { return PKB.prefersReducedMotion(); };

  /* ------------------------------------------------------------------
     1. Data (validated, normalised once)
     ------------------------------------------------------------------ */
  var ISO = /^\d{4}-\d{2}-\d{2}$/;
  var NEWS = (Array.isArray(D.news) ? D.news : []).filter(function (n) {
    return n && n.id && n.title && ISO.test(String(n.date || ""));
  }).map(function (n, i) {
    var body = Array.isArray(n.body) ? n.body.filter(Boolean).map(String) : (n.body ? [String(n.body)] : []);
    var words = body.join(" ").split(/\s+/).filter(Boolean).length;
    var item = {
      id: String(n.id),
      title: String(n.title),
      date: String(n.date),
      category: n.category ? String(n.category) : "Ostalo",
      author: n.author ? String(n.author) : "",
      readMins: Number(n.readMins) > 0 ? Math.round(Number(n.readMins)) : Math.max(1, Math.round(words / 200)),
      image: n.image ? String(n.image) : "assets/img/photos/pod-vodo-sm.jpg",
      featured: !!n.featured,
      excerpt: n.excerpt ? String(n.excerpt) : (body[0] || ""),
      body: body,
      idx: i
    };
    item.month = item.date.slice(0, 7);
    item._t = PKB.normalize(item.title);
    item._e = PKB.normalize(item.excerpt);
    item._b = PKB.normalize(body.join(" "));
    return item;
  });
  var BY_ID = {};
  NEWS.forEach(function (n) { BY_ID[n.id] = n; });
  var byId = function (id) { return Object.prototype.hasOwnProperty.call(BY_ID, id) ? BY_ID[id] : null; };

  // categories: official list first, then any extra ones found in the data
  var CATS = (Array.isArray(D.newsCategories) ? D.newsCategories.map(String) : []).slice();
  NEWS.forEach(function (n) { if (CATS.indexOf(n.category) === -1) CATS.push(n.category); });

  // muted data tones (dots only)
  var TONES = { "Tekmovanja": "gold", "Plavalna šola": "aqua", "Klub": "teal", "Dogodki": "violet" };
  var TONE_CYCLE = ["blue", "teal", "violet", "gold", "pink"];
  var TONE_VAR = { gold: "var(--c-gold)", aqua: "var(--c-sky)", blue: "var(--c-sky)", teal: "var(--c-sage)", violet: "var(--c-lilac)", pink: "var(--c-rose)" };
  function tone(cat) {
    if (TONES[cat]) return TONES[cat];
    var i = CATS.indexOf(cat);
    return TONE_CYCLE[(i < 0 ? 0 : i) % TONE_CYCLE.length];
  }

  // months for the archive (newest first)
  var MONTHS = [];
  var MONTH_COUNT = {};
  NEWS.forEach(function (n) {
    if (!MONTH_COUNT[n.month]) { MONTH_COUNT[n.month] = 0; MONTHS.push(n.month); }
    MONTH_COUNT[n.month]++;
  });
  MONTHS.sort().reverse();
  function monthLabel(m, capital) {
    var s = PKB.formatDate(m + "-01", { month: "long", year: "numeric" });
    return capital ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  /* Photo sizes (large file); the -sm variant is 720 px wide (landscape) or 560 px (portrait). */
  var DIMS = {
    "bazen-hala": [1920, 1280], "bazen-mirno": [1200, 1800], "blok-6": [1200, 1800], "delfin-plavalka": [1920, 1080],
    "delfin-pljusk": [1200, 1600], "delfin-trening": [1920, 1280], "ekipa": [1200, 1800], "globina": [1400, 1750],
    "gozd": [1920, 1279], "jezero": [1920, 1442], "kravl-proga": [1920, 1280], "morje": [1920, 1276],
    "odprte-vode": [1920, 969], "odrasli-rekreacija": [1920, 1440], "pod-vodo": [1920, 1440], "proga-vrv": [1920, 1080],
    "skok-v-bazen": [1920, 1280], "sola-lebdenje": [1920, 1274], "sola-otroci": [1920, 1281], "sola-plavanje": [1920, 1281],
    "sola-ucenje": [1920, 1280], "start-hrbtno": [1200, 1800], "start-tekma": [1920, 1280], "startni-bloki-hala": [1200, 1504],
    "suha-vadba": [1920, 1280], "tekma-delfin": [1920, 1280], "tekma-proge": [1920, 1282]
  };
  (D.gallery || []).forEach(function (g) {
    var m = String(g.src || "").match(/([^\/]+)\.\w+$/);
    if (m && g.w && g.h && !DIMS[m[1]]) DIMS[m[1]] = [g.w, g.h];
  });
  function photo(src) {
    src = String(src || "");
    var m = src.match(/^(.*\/)?([^\/]+?)(-sm)?\.(jpe?g|png|webp|avif)$/i);
    var d = (m && DIMS[m[2]]) || [1920, 1280];
    var portrait = d[1] > d[0];
    var sw = portrait ? 560 : 720;
    var info = { w: d[0], h: d[1], sw: sw, sh: Math.round(sw * d[1] / d[0]), small: src, large: src, pos: portrait ? "50% 38%" : "50% 50%" };
    if (m && m[3]) info.large = (m[1] || "") + m[2] + "." + m[4];
    return info;
  }
  function bindImages(scope) {
    qsa("img", scope).forEach(function (img) {
      if (img.dataset.bound) return;
      img.dataset.bound = "1";
      var done = function () { img.classList.add("is-loaded"); };
      if (img.complete && img.naturalWidth) done();
      else img.addEventListener("load", done, { once: true });
      img.addEventListener("error", function () {
        var holder = img.closest(".card-media, .news-feature, .news-reader__media, .news-rel__thumb");
        if (holder) holder.classList.add("is-broken");
        img.removeAttribute("srcset");
        img.alt = "";
        img.style.visibility = "hidden";
      }, { once: true });
    });
  }

  var COACHES = Array.isArray(D.coaches) ? D.coaches : [];
  function coachByName(name) {
    var k = PKB.normalize(name || "");
    return COACHES.filter(function (c) { return PKB.normalize(c.name) === k; })[0] || null;
  }
  function isClubAuthor(name) { return !name || /^pk\s*branik/i.test(name); }

  /* ------------------------------------------------------------------
     2. State + URL
     ------------------------------------------------------------------ */
  var state = { cat: "", q: "", month: "", sort: "new", view: "grid", shown: PAGE };
  var view = PKB.storage.get(VIEW_KEY, "grid");
  state.view = view === "list" ? "list" : "grid";

  function matchCat(v) {
    if (v == null || v === "") return "";
    var n = PKB.normalize(v).trim(), s = PKB.slugify(v);
    for (var i = 0; i < CATS.length; i++) {
      if (PKB.normalize(CATS[i]) === n || PKB.slugify(CATS[i]) === s) return CATS[i];
    }
    return null;
  }
  /** Reads filters from the URL. Returns a list of params that were invalid. */
  function readURL() {
    var p = PKB.params();
    var bad = [];
    var cat = matchCat(p.get("kategorija"));
    if (cat === null) { bad.push(p.get("kategorija")); cat = ""; }
    state.cat = cat;
    state.q = (p.get("q") || "").trim().slice(0, 80);
    var m = p.get("mesec") || "";
    state.month = MONTH_COUNT[m] ? m : "";
    state.sort = p.get("razvrsti") === "najstarejse" ? "old" : "new";
    return bad;
  }
  function buildURL(articleId) {
    var p = PKB.params();
    var set = function (k, v) { if (v) p.set(k, v); else p.delete(k); };
    set("kategorija", state.cat);
    set("q", state.q);
    set("mesec", state.month);
    set("razvrsti", state.sort === "old" ? "najstarejse" : "");
    set("clanek", articleId || "");
    var s = p.toString();
    var hash = window.location.hash;
    if (hash && byId(decodeHash(hash))) hash = "";
    return window.location.pathname + (s ? "?" + s : "") + hash;
  }
  function decodeHash(h) { try { return decodeURIComponent(String(h || "").replace(/^#/, "")); } catch (e) { return ""; } }
  function syncURL() {
    if (!window.history || !history.replaceState) return;
    var url = buildURL(reader ? reader.id : null);
    var cur = window.location.pathname + window.location.search + window.location.hash;
    if (url !== cur) {
      try { history.replaceState(history.state, "", url); } catch (e) { /* ignore */ }
    }
  }
  function articleHref(id) { return "novice.html?clanek=" + encodeURIComponent(id); }
  function absoluteArticleURL(id) {
    try {
      var u = new URL(window.location.href);
      u.search = "?clanek=" + encodeURIComponent(id);
      u.hash = "";
      return u.href;
    } catch (e) { return articleHref(id); }
  }

  /* ------------------------------------------------------------------
     3. Search, filtering, highlighting
     ------------------------------------------------------------------ */
  function terms() { return PKB.normalize(state.q).split(/\s+/).filter(Boolean); }
  function matchesTerms(n, t) {
    for (var i = 0; i < t.length; i++) {
      if (n._t.indexOf(t[i]) === -1 && n._e.indexOf(t[i]) === -1 && n._b.indexOf(t[i]) === -1) return false;
    }
    return true;
  }
  function sorter(a, b) {
    var d = a.date < b.date ? -1 : (a.date > b.date ? 1 : 0);
    if (!d) d = b.idx - a.idx;
    return state.sort === "old" ? d : -d;
  }
  function results(ignoreCat) {
    var t = terms();
    return NEWS.filter(function (n) {
      return (ignoreCat || !state.cat || n.category === state.cat) &&
        (!state.month || n.month === state.month) &&
        (!t.length || matchesTerms(n, t));
    }).sort(sorter);
  }
  function allSorted() { return NEWS.slice().sort(sorter); }

  /** Map each character to one normalised character so indexes stay aligned with the original text. */
  function normChars(text) {
    var chars = Array.from(String(text));
    var norm = chars.map(function (ch) { var x = PKB.normalize(ch); return x.length === 1 ? x : "\u0000"; });
    return { chars: chars, hay: norm.join("") };
  }
  function ranges(hay, t) {
    var out = [];
    t.forEach(function (term) {
      var from = 0, i;
      while (term && (i = hay.indexOf(term, from)) > -1) { out.push([i, i + term.length]); from = i + term.length; }
    });
    out.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    out.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push(r.slice());
    });
    return merged;
  }
  function highlight(text, t) {
    text = String(text == null ? "" : text);
    if (!t || !t.length) return esc(text);
    var nc = normChars(text);
    var rs = ranges(nc.hay, t);
    if (!rs.length) return esc(text);
    var html = "", pos = 0;
    rs.forEach(function (r) {
      html += esc(nc.chars.slice(pos, r[0]).join("")) + '<mark class="news-mark">' + esc(nc.chars.slice(r[0], r[1]).join("")) + "</mark>";
      pos = r[1];
    });
    return html + esc(nc.chars.slice(pos).join(""));
  }
  /** "… text around the first body match …" when the match is only in the body. */
  function bodySnippet(n, t) {
    for (var p = 0; p < n.body.length; p++) {
      var nc = normChars(n.body[p]);
      var rs = ranges(nc.hay, t);
      if (!rs.length) continue;
      var start = Math.max(0, rs[0][0] - 48), end = Math.min(nc.chars.length, rs[0][1] + 72);
      // snap to word boundaries
      while (start > 0 && nc.chars[start - 1] !== " ") start--;
      while (end < nc.chars.length && nc.chars[end] !== " ") end++;
      var piece = nc.chars.slice(start, end).join("").trim();
      return (start > 0 ? "… " : "") + highlight(piece, t) + (end < nc.chars.length ? " …" : "");
    }
    return "";
  }

  /* ------------------------------------------------------------------
     4. Elements
     ------------------------------------------------------------------ */
  var el = {
    stats: qs("[data-stats]"),
    feature: qs("[data-feature]"),
    count: qs("[data-count]"),
    search: qs("[data-search]"),
    searchClear: qs("[data-search-clear]"),
    sort: qs("[data-sort]"),
    cats: qs("[data-cats]"),
    active: qs("[data-active]"),
    activeChips: qs("[data-active-chips]"),
    list: qs("[data-list]"),
    results: qs("[data-results]"),
    moreWrap: qs("[data-more-wrap]"),
    more: qs("[data-more]"),
    moreN: qs("[data-more-n]"),
    moreText: qs("[data-more-text]"),
    moreBar: qs("[data-more-bar]"),
    events: qs("[data-events]"),
    archive: qs("[data-archive]"),
    toolbar: qs("[data-toolbar]")
  };
  var emptyEl = doc.createElement("div");
  emptyEl.className = "news-empty";
  emptyEl.hidden = true;
  if (el.list) el.list.insertAdjacentElement("afterend", emptyEl);
  if (el.moreText) { el.moreText.setAttribute("aria-live", "polite"); el.moreText.setAttribute("aria-atomic", "true"); }

  /* ------------------------------------------------------------------
     5. Hero: stats + featured story
     ------------------------------------------------------------------ */
  function upcoming() {
    try { return typeof PKB.upcomingCompetitions === "function" ? PKB.upcomingCompetitions() : []; }
    catch (e) { return []; }
  }
  function renderStats() {
    if (!el.stats) return;
    var items = [];
    var n = NEWS.length;
    items.push({ v: n, label: PKB.plural(n, ["objava", "objavi", "objave", "objav"]) + " v arhivu" });
    var cats = CATS.filter(function (c) { return NEWS.some(function (x) { return x.category === c; }); }).length || CATS.length;
    items.push({ v: cats, label: PKB.plural(cats, ["rubrika", "rubriki", "rubrike", "rubrik"]) });
    var latest = allSortedDesc()[0];
    if (latest) {
      var ago = Math.max(0, -PKB.daysUntil(latest.date));
      if (ago === 0) items.push({ text: "Danes", label: "nova objava" });
      else items.push({ v: ago, suffix: " " + PKB.plural(ago, ["dan", "dneva", "dni", "dni"]), label: "od zadnje objave" });
    }
    var next = upcoming()[0];
    if (next) {
      if (PKB.competitionStatus(next) === "live") items.push({ text: "Zdaj", label: "tekma je v teku" });
      else {
        var d = PKB.daysUntil(next.date);
        items.push({ v: d, suffix: " " + PKB.plural(d, ["dan", "dneva", "dni", "dni"]), label: "do naslednje tekme" });
      }
    } else items.push({ text: "–", label: "ni napovedanih tekem" });

    el.stats.innerHTML = items.map(function (it) {
      var final = it.text != null ? it.text : PKB.formatNumber(it.v) + (it.suffix || "");
      var count = it.text != null ? "" : ' data-count-to="' + it.v + '"' + (it.suffix ? ' data-count-suffix="' + esc(it.suffix) + '"' : "") + ' data-count-duration="1200"';
      return '<li class="news-stat"><span class="news-stat__value"' + count + ">" + esc(final) + "</span>" +
        '<span class="news-stat__label">' + esc(it.label) + '</span><span class="news-stat__bar" aria-hidden="true"></span></li>';
    }).join("");
  }
  function allSortedDesc() {
    return NEWS.slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : a.idx - b.idx); });
  }

  function renderFeatured() {
    if (!el.feature) return;
    var desc = allSortedDesc();
    var featured = desc.filter(function (n) { return n.featured; });
    var f = featured[0] || desc[0];
    if (!f) {
      el.feature.innerHTML = '<div class="news-feature news-feature--empty tile"><span class="icon-bubble">' + icon("newspaper") + '</span><p class="news-empty__title">Novice bodo kmalu objavljene.</p><p class="small muted">Spremljajte nas – prve objave sezone pripravljamo.</p></div>';
      return;
    }
    var also = featured.filter(function (n) { return n.id !== f.id; })[0] || null;
    var ph = photo(f.image);
    var html =
      '<article class="photo-card news-feature news-dark" aria-labelledby="news-feature-title" data-feature-id="' + esc(f.id) + '">' +
        '<img class="news-feature__img" src="' + esc(ph.large) + '"' + (ph.small !== ph.large ? ' srcset="' + esc(ph.small) + " " + ph.sw + "w, " + esc(ph.large) + " " + ph.w + 'w" sizes="(min-width: 1080px) 760px, 100vw"' : "") +
          ' alt="" width="' + ph.w + '" height="' + ph.h + '" fetchpriority="high" decoding="async" style="object-position:' + ph.pos + '">' +
        '<span class="news-pill news-feature__pill">' + icon("star", "icon--sm") + (f.featured ? "Izpostavljeno" : "Najnovejše") + "</span>" +
        (also ? alsoHTML(also) : "") +
        '<div class="photo-card__glass news-feature__cap">' +
          '<p class="news-feature__meta">' +
            '<span class="news-feature__mi"><span class="news-dot" style="--dot:' + TONE_VAR[tone(f.category)] + '"></span>' + esc(f.category) + "</span>" +
            '<span class="news-feature__mi">' + icon("calendar", "icon--sm") + '<time datetime="' + f.date + '">' + esc(PKB.formatDate(f.date)) + "</time></span>" +
            '<span class="news-feature__mi">' + icon("clock", "icon--sm") + f.readMins + " min branja</span></p>" +
          '<h2 class="news-feature__title" id="news-feature-title">' + esc(f.title) + "</h2>" +
          (f.excerpt ? '<p class="news-feature__excerpt">' + esc(f.excerpt) + "</p>" : "") +
          '<div class="news-feature__actions">' +
            '<a class="btn btn--primary news-feature__read" href="' + articleHref(f.id) + '" data-open="' + esc(f.id) + '">Preberi članek' + icon("arrow-right", "icon--move") + "</a>" +
            '<button type="button" class="btn btn--icon news-feature__share" data-share="' + esc(f.id) + '" aria-label="Deli novico" data-tooltip="Deli">' + icon("share") + "</button>" +
            (f.author ? '<span class="news-feature__by">' + icon("user", "icon--sm") + esc(f.author) + "</span>" : "") +
          "</div>" +
        "</div>" +
      "</article>";
    el.feature.innerHTML = html;
    bindImages(el.feature);
  }
  function alsoHTML(n) {
    return '<a class="news-feature__also" href="' + articleHref(n.id) + '" data-open="' + esc(n.id) + '">' +
      '<span class="news-feature__also-text">' +
        '<span class="news-feature__also-kicker">Tudi izpostavljeno</span>' +
        '<span class="news-feature__also-title">' + esc(n.title) + "</span>" +
        '<span class="news-feature__also-date">' + esc(PKB.formatDate(n.date)) + " · " + esc(n.category) + "</span>" +
      "</span>" +
      '<span class="news-round" aria-hidden="true">' + icon("arrow-up-right") + "</span></a>";
  }

  /* ------------------------------------------------------------------
     6. Toolbar: category chips, active filters, count
     ------------------------------------------------------------------ */
  function buildChips() {
    if (!el.cats) return;
    el.cats.innerHTML = [""].concat(CATS).map(function (c) {
      return '<button type="button" class="chip news-chip" data-cat="' + esc(c) + '" aria-pressed="false">' +
        (c ? '<span class="dot" style="--dot:' + TONE_VAR[tone(c)] + '"></span>' + esc(c) : "Vse") +
        ' <span class="count" data-chip-count>0</span></button>';
    }).join("");
  }
  function renderChips() {
    if (!el.cats) return;
    var base = results(true);
    qsa(".news-chip", el.cats).forEach(function (b) {
      var c = b.getAttribute("data-cat");
      var n = c ? base.filter(function (x) { return x.category === c; }).length : base.length;
      var on = c === state.cat;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("is-empty", n === 0);
      var cnt = qs("[data-chip-count]", b);
      if (cnt) cnt.textContent = String(n);
      b.setAttribute("aria-label", (c || "Vse rubrike") + ", " + n + " " + PKB.plural(n, ["novica", "novici", "novice", "novic"]));
    });
  }
  function renderActive() {
    if (!el.active) return;
    var chips = [];
    if (state.q) chips.push({ k: "q", label: "»" + state.q + "«", aria: "Odstrani iskalni niz " + state.q });
    if (state.cat) chips.push({ k: "cat", label: state.cat, aria: "Odstrani rubriko " + state.cat });
    if (state.month) chips.push({ k: "month", label: monthLabel(state.month, true), aria: "Odstrani mesec " + monthLabel(state.month) });
    el.active.hidden = !chips.length;
    el.activeChips.innerHTML = chips.map(function (c) {
      return '<button type="button" class="chip news-active__chip" data-remove="' + c.k + '" aria-label="' + esc(c.aria) + '">' +
        '<span class="news-active__text">' + esc(c.label) + "</span>" + icon("x", "icon--sm") + "</button>";
    }).join("");
  }
  function renderCount(list) {
    if (!el.count) return;
    var n = list.length;
    var parts = [];
    if (state.cat) parts.push(esc(state.cat));
    if (state.month) parts.push(esc(monthLabel(state.month)));
    if (state.q) parts.push("»" + esc(state.q) + "«");
    var head = n ? "<strong>" + n + "</strong> " + PKB.plural(n, ["novica", "novici", "novice", "novic"]) : "<strong>Ni zadetkov</strong>";
    el.count.innerHTML = head + (parts.length ? '<span class="dot-sep"></span>' + parts.join('<span class="dot-sep"></span>') : (n ? " v arhivu" : ""));
  }
  /* edge fade on the horizontally scrolling chip row (mobile) */
  function updateChipFade() {
    var c = el.cats;
    if (!c) return;
    var max = c.scrollWidth - c.clientWidth;
    c.classList.toggle("can-left", max > 2 && c.scrollLeft > 2);
    c.classList.toggle("can-right", max > 2 && c.scrollLeft < max - 2);
  }
  if (el.cats) {
    var chipTick = false;
    var onChipScroll = function () {
      if (chipTick) return;
      chipTick = true;
      requestAnimationFrame(function () { chipTick = false; updateChipFade(); });
    };
    el.cats.addEventListener("scroll", onChipScroll, { passive: true });
    window.addEventListener("resize", onChipScroll);
    // keep the pressed chip in view when it sits off-screen in the scroll row
    el.cats.addEventListener("focusin", function (e) {
      var b = e.target.closest && e.target.closest(".news-chip");
      if (b && el.cats.scrollWidth > el.cats.clientWidth) b.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }

  /* ------------------------------------------------------------------
     7. List (cards / rows), empty state, "load more"
     ------------------------------------------------------------------ */
  var lastList = [];
  function isNew(n) { var d = PKB.daysUntil(n.date); return d <= 0 && d >= -NEW_DAYS; }
  function cardHTML(n, i, t) {
    var ph = photo(n.image);
    var titleHit = !t.length || t.every(function (x) { return n._t.indexOf(x) > -1 || n._e.indexOf(x) > -1; });
    var snippet = t.length && !titleHit ? bodySnippet(n, t) : "";
    var flags = (isNew(n) ? '<span class="news-flag">Novo</span>' : "") +
      (n.featured ? '<span class="news-flag news-flag--icon" title="Izpostavljeno">' + icon("star") + '<span class="visually-hidden">Izpostavljeno</span></span>' : "");
    return '<li class="news-item" style="--i:' + (i % PAGE) + '">' +
      '<article class="card card--media card--hover news-card' + (n.featured ? " is-featured" : "") + '" data-id="' + esc(n.id) + '">' +
        '<div class="card-media news-card__media">' +
          '<img src="' + esc(ph.small) + '" alt="" width="' + ph.sw + '" height="' + ph.sh + '" loading="lazy" decoding="async" style="object-position:' + ph.pos + '">' +
          '<span class="badge badge--' + tone(n.category) + '">' + esc(n.category) + "</span>" +
          (flags ? '<span class="news-card__flags">' + flags + "</span>" : "") +
        "</div>" +
        '<div class="card-body news-card__body">' +
          '<div class="card-meta"><span>' + icon("calendar", "icon--sm") + '<time datetime="' + n.date + '">' + esc(PKB.formatDate(n.date)) + "</time></span>" +
            "<span>" + icon("clock", "icon--sm") + n.readMins + " min branja</span></div>" +
          '<h3 class="card-title news-card__title"><a href="' + articleHref(n.id) + '" data-open="' + esc(n.id) + '">' + highlight(n.title, t) + "</a></h3>" +
          (n.excerpt ? '<p class="news-card__excerpt">' + highlight(n.excerpt, t) + "</p>" : "") +
          (snippet ? '<p class="news-card__snippet"><span class="news-card__snippet-k">V besedilu</span>' + snippet + "</p>" : "") +
          '<div class="card-footer news-card__foot">' +
            '<span class="news-card__by">' + (n.author ? esc(n.author) : "") + "</span>" +
            '<span class="news-card__more" aria-hidden="true">Preberi' + icon("arrow-right") + "</span>" +
          "</div>" +
        "</div>" +
      "</article></li>";
  }
  function emptyHTML() {
    var t = terms();
    var hint = t.length ?
      "Preverite črkovanje ali poskusite s krajšim izrazom – iščemo po naslovih in celotnem besedilu novic." :
      "V izbranem obdobju ali rubriki ni objav. Izberite drugo rubriko ali mesec v arhivu.";
    return '<div class="glass empty-state news-empty__box">' +
      '<span class="icon-bubble">' + icon(t.length ? "search" : "filter") + "</span>" +
      '<p class="news-empty__title">Ni novic, ki bi ustrezale filtrom</p>' +
      '<p class="small muted news-empty__hint">' + esc(hint) + "</p>" +
      '<button type="button" class="btn btn--primary btn--sm" data-clear>' + icon("refresh") + "Počisti filtre</button>" +
    "</div>";
  }
  function applyView() {
    if (el.list) el.list.classList.toggle("news-grid--list", state.view === "list");
    qsa("[data-view]", root).forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-view") === state.view ? "true" : "false");
    });
  }
  function renderList(list) {
    if (!el.list) return;
    lastList = list;
    var t = terms();
    if (!list.length) {
      el.list.innerHTML = "";
      el.list.hidden = true;
      emptyEl.innerHTML = emptyHTML();
      emptyEl.hidden = false;
      renderMore(0);
      return;
    }
    emptyEl.hidden = true;
    emptyEl.innerHTML = "";
    el.list.hidden = false;
    el.list.innerHTML = list.slice(0, state.shown).map(function (n, i) { return cardHTML(n, i, t); }).join("");
    bindImages(el.list);
    renderMore(list.length);
  }
  function renderMore(total) {
    if (!el.moreWrap) return;
    var shown = Math.min(state.shown, total);
    el.moreWrap.hidden = total === 0;
    if (!total) return;
    var rest = total - shown;
    el.moreText.textContent = PKB.plural(shown, ["Prikazana", "Prikazani", "Prikazane", "Prikazanih"]) + " " + shown + " od " + total + " " + (total === 1 ? "novice" : "novic");
    el.moreBar.style.width = Math.round(shown / total * 100) + "%";
    el.more.hidden = rest <= 0;
    el.moreN.textContent = String(rest);
    el.more.setAttribute("aria-label", "Naloži več (še " + rest + " " + PKB.plural(rest, ["novica", "novici", "novice", "novic"]) + ")");
  }
  function loadMore() {
    var from = state.shown;
    state.shown += PAGE;
    var t = terms();
    var add = lastList.slice(from, state.shown);
    if (!add.length) { renderMore(lastList.length); return; }
    el.list.insertAdjacentHTML("beforeend", add.map(function (n, i) { return cardHTML(n, i, t); }).join(""));
    bindImages(el.list);
    renderMore(lastList.length);
    var first = qsa(".news-item", el.list)[from];
    var link = first && qs("[data-open]", first);
    if (link) link.focus({ preventScroll: true });
    if (first) first.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "nearest" });
  }

  /* ------------------------------------------------------------------
     8. Sidebar: archive + upcoming events
     ------------------------------------------------------------------ */
  function renderArchive() {
    if (!el.archive) return;
    if (!MONTHS.length) { el.archive.innerHTML = '<p class="small muted news-archive__empty">Arhiv je še prazen.</p>'; return; }
    var max = Math.max.apply(null, MONTHS.map(function (m) { return MONTH_COUNT[m]; }));
    var years = [];
    MONTHS.forEach(function (m) { var y = m.slice(0, 4); if (years.indexOf(y) === -1) years.push(y); });
    var multi = years.length > 1;
    el.archive.innerHTML = years.map(function (y) {
      var ms = MONTHS.filter(function (m) { return m.slice(0, 4) === y; });
      return (multi ? '<p class="news-archive__year">' + esc(y) + "</p>" : "") +
        '<ul class="news-archive__list" role="list">' + ms.map(function (m) {
          var c = MONTH_COUNT[m];
          return '<li><button type="button" class="news-archive__btn" data-month="' + m + '" aria-pressed="false" aria-label="' + esc(monthLabel(m, true)) + ", " + c + " " + PKB.plural(c, ["novica", "novici", "novice", "novic"]) + '">' +
            '<span class="news-archive__name">' + esc(multi ? monthLabel(m, true).replace(/\s*\d{4}$/, "") : monthLabel(m, true)) + "</span>" +
            '<span class="news-archive__bar" aria-hidden="true"><span style="width:' + Math.max(8, Math.round(c / max * 100)) + '%"></span></span>' +
            '<span class="news-archive__n" aria-hidden="true">' + c + "</span></button></li>";
        }).join("") + "</ul>";
    }).join("");
  }
  function renderArchiveState() {
    qsa("[data-month]", el.archive || doc.createElement("div")).forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-month") === state.month ? "true" : "false");
    });
  }
  function renderEvents() {
    if (!el.events) return;
    var list = upcoming().slice(0, 3);
    if (!list.length) {
      el.events.innerHTML = '<li class="news-events__empty small muted">Trenutno ni napovedanih tekem. Celoten koledar sezone je na strani Tekmovanja.</li>';
      return;
    }
    el.events.innerHTML = list.map(function (c) {
      var a = PKB.parseDate(c.date), b = c.endDate ? PKB.parseDate(c.endDate) : null;
      var day = b && b.getMonth() === a.getMonth() && b.getDate() !== a.getDate() ? a.getDate() + ".–" + b.getDate() + "." : a.getDate() + ".";
      var mon = PKB.formatDate(c.date, { month: "short" }).replace(/\.$/, "");
      var live = PKB.competitionStatus(c) === "live";
      var rel = live ? '<span class="badge badge-live">V teku</span>' : '<span class="news-event__rel">' + esc(PKB.relativeDay(c.date)) + "</span>";
      return '<li><a class="news-event" href="tekmovanja.html#' + encodeURIComponent(c.id) + '">' +
        '<span class="news-event__date' + (day.length > 4 ? " is-range" : "") + '"><span class="news-event__day">' + esc(day) + '</span><span class="news-event__mon">' + esc(mon) + "</span></span>" +
        '<span class="news-event__main">' +
          '<span class="news-event__name">' + esc(c.name) + "</span>" +
          '<span class="news-event__meta">' + icon("map-pin", "icon--sm") + esc(c.city || "") + (c.course ? " · " + esc(c.course) : "") + "</span>" +
          '<span class="news-event__tags">' + rel + (c.host ? '<span class="news-event__host">' + icon("home", "icon--sm") + "Domači miting</span>" : "") + "</span>" +
        "</span>" +
        '<span class="news-event__go" aria-hidden="true">' + icon("chevron-right") + "</span>" +
      "</a></li>";
    }).join("");
  }

  /* ------------------------------------------------------------------
     9. Update cycle
     ------------------------------------------------------------------ */
  function update(opts) {
    opts = opts || {};
    var list = results();
    renderChips();
    renderActive();
    renderArchiveState();
    renderCount(list);
    renderList(list);
    if (opts.sync !== false) syncURL();
  }
  function setFilter(patch, opts) {
    Object.keys(patch).forEach(function (k) { state[k] = patch[k]; });
    state.shown = PAGE;
    if ("q" in patch && el.search && el.search.value.trim() !== state.q) {
      el.search.value = state.q;
      if (el.searchClear) el.searchClear.hidden = !state.q;
    }
    update(opts);
  }
  function clearFilters() {
    setFilter({ cat: "", q: "", month: "" });
  }
  function scrollToList() {
    var t = el.toolbar;
    if (!t) return;
    var r = t.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.55) t.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "start" });
  }

  /* toolbar events */
  if (el.search) {
    var onSearch = PKB.debounce(function () {
      var v = el.search.value.trim().slice(0, 80);
      if (v === state.q) return;
      state.q = v;
      state.shown = PAGE;
      update();
    }, 220);
    el.search.addEventListener("input", function () {
      if (el.searchClear) el.searchClear.hidden = !el.search.value;
      onSearch();
    });
    el.search.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && el.search.value) {
        e.preventDefault();
        e.stopPropagation();
        el.search.value = "";
        if (el.searchClear) el.searchClear.hidden = true;
        setFilter({ q: "" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        var v = el.search.value.trim().slice(0, 80);
        if (v !== state.q) setFilter({ q: v });
      }
    });
  }
  if (el.searchClear) {
    el.searchClear.addEventListener("click", function () {
      el.search.value = "";
      el.searchClear.hidden = true;
      setFilter({ q: "" });
      el.search.focus();
    });
  }
  if (el.sort) {
    el.sort.addEventListener("change", function () {
      state.sort = el.sort.value === "old" ? "old" : "new";
      update();
    });
  }
  if (el.cats) {
    el.cats.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]");
      if (!b) return;
      var c = b.getAttribute("data-cat");
      setFilter({ cat: c === state.cat ? "" : c });
    });
  }
  qsa("[data-view]", root).forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-view") === "list" ? "list" : "grid";
      if (v === state.view) return;
      state.view = v;
      PKB.storage.set(VIEW_KEY, v);
      applyView();
    });
  });
  if (el.activeChips) {
    el.activeChips.addEventListener("click", function (e) {
      var b = e.target.closest("[data-remove]");
      if (!b) return;
      var k = b.getAttribute("data-remove");
      var patch = {};
      patch[k === "cat" ? "cat" : k === "month" ? "month" : "q"] = "";
      setFilter(patch);
      var next = qs("[data-remove]", el.activeChips) || el.search;
      if (next) next.focus();
    });
  }
  root.addEventListener("click", function (e) {
    var clr = e.target.closest("[data-clear]");
    if (clr) {
      clearFilters();
      if (el.search) el.search.focus({ preventScroll: true });
      scrollToList();
      return;
    }
    var mb = e.target.closest("[data-month]");
    if (mb && el.archive && el.archive.contains(mb)) {
      var m = mb.getAttribute("data-month");
      setFilter({ month: m === state.month ? "" : m });
      if (state.month) scrollToList();
      return;
    }
    var sh = e.target.closest("[data-share]");
    if (sh) {
      var sn = byId(sh.getAttribute("data-share"));
      if (sn) PKB.share({ title: sn.title, text: sn.excerpt, url: absoluteArticleURL(sn.id) });
      return;
    }
    var a = e.target.closest("[data-open]");
    if (a) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      openReader(a.getAttribute("data-open"), { push: true });
    }
  });
  if (el.more) el.more.addEventListener("click", loadMore);

  /* "Novice po e-pošti" → shared footer newsletter field */
  qsa("[data-newsletter-focus]", root).forEach(function (a) {
    a.addEventListener("click", function (e) {
      var input = doc.getElementById("nl-email");
      if (!input) return;
      e.preventDefault();
      input.focus({ preventScroll: true });
      input.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "center" });
    });
  });

  /* ------------------------------------------------------------------
     10. Article reader (modal) with history integration
     ------------------------------------------------------------------ */
  var reader = null;     // { m, id, seq, first, closingFromPop, after }
  var ignorePop = false;
  var ignoreTimer = 0;

  function sequenceFor(id) {
    var list = results();
    if (list.some(function (n) { return n.id === id; })) return list;
    return allSorted();
  }
  function notFound(id) {
    var shortId = String(id || "").slice(0, 60);
    PKB.toast({ type: "warning", title: "Članka ni mogoče najti", message: "Novica »" + shortId + "« ne obstaja ali je bila odstranjena. Prikazujemo seznam vseh novic." });
  }
  function relatedFor(n) {
    return allSortedDesc().filter(function (x) { return x.category === n.category && x.id !== n.id; })
      .sort(function (a, b) {
        return Math.abs(PKB.parseDate(a.date) - PKB.parseDate(n.date)) - Math.abs(PKB.parseDate(b.date) - PKB.parseDate(n.date));
      }).slice(0, 2);
  }
  var NEXT_LINKS = {
    "Tekmovanja": [["tekmovanja.html#rezultati", "Rezultati tekmovanj", "trophy"], ["tekmovanja.html#koledar", "Koledar tekmovanj", "calendar"]],
    "Plavalna šola": [["programi.html#sola", "Skupine plavalne šole", "waves"], ["vpis.html", "Vpis v plavalno šolo", "sparkles"]],
    "Klub": [["o-klubu.html", "O klubu", "shield"], ["urnik.html", "Urnik treningov", "calendar"]],
    "Dogodki": [["tekmovanja.html#koledar", "Koledar tekmovanj", "calendar"], ["galerija.html", "Galerija", "image"]]
  };
  function readerHTML(n) {
    var ph = photo(n.image);
    var t = terms();
    var coach = coachByName(n.author);
    var club = isClubAuthor(n.author);
    var avatar = club ?
      '<span class="avatar news-reader__avatar news-reader__avatar--club" aria-hidden="true">' + PKB.logoSVG() + "</span>" :
      '<span class="avatar news-reader__avatar" aria-hidden="true">' + esc(PKB.initials(n.author)) + "</span>";
    var who = club ? "PK Branik" : esc(n.author);
    var role = coach ? (coach.role ? esc(coach.role) : "") : (club ? "Klubsko obvestilo" : "");
    var whoHTML = coach ? '<a class="news-reader__author" href="o-klubu.html#trener-' + encodeURIComponent(coach.id) + '">' + who + "</a>" : '<span class="news-reader__author">' + who + "</span>";
    var rel = relatedFor(n);
    var links = NEXT_LINKS[n.category] || [["index.html", "Domača stran", "home"]];
    return '<article class="news-reader" data-reader-article="' + esc(n.id) + '">' +
      '<figure class="news-reader__media">' +
        '<img src="' + esc(ph.large) + '"' + (ph.small !== ph.large ? ' srcset="' + esc(ph.small) + " " + ph.sw + "w, " + esc(ph.large) + " " + ph.w + 'w" sizes="(min-width: 1000px) 956px, 100vw"' : "") +
          ' alt="" width="' + ph.w + '" height="' + ph.h + '" decoding="async" style="object-position:' + ph.pos + '">' +
      "</figure>" +
      '<div class="news-reader__col">' +
        '<p class="news-reader__meta"><span class="badge badge--' + tone(n.category) + '">' + esc(n.category) + "</span>" +
          '<span class="news-reader__meta-item">' + icon("calendar", "icon--sm") + '<time datetime="' + n.date + '">' + esc(PKB.formatDate(n.date)) + "</time></span>" +
          '<span class="news-reader__meta-item">' + icon("clock", "icon--sm") + n.readMins + " min branja</span></p>" +
        '<h2 class="news-reader__title" id="news-reader-title" tabindex="-1">' + highlight(n.title, t) + "</h2>" +
        (n.excerpt ? '<p class="news-reader__lead">' + highlight(n.excerpt, t) + "</p>" : "") +
        '<div class="news-reader__byline">' +
          '<div class="news-reader__who">' + avatar + '<span class="news-reader__who-text">' + whoHTML + (role ? '<span class="news-reader__role">' + role + "</span>" : "") + "</span></div>" +
          '<div class="news-reader__share">' +
            '<button type="button" class="btn btn--sm" data-reader-share>' + icon("share") + "Deli</button>" +
            '<button type="button" class="btn btn--sm" data-reader-copy>' + icon("link") + "Kopiraj povezavo</button>" +
          "</div>" +
        "</div>" +
        '<div class="prose news-reader__body">' + (n.body.length ? n.body.map(function (p) { return "<p>" + highlight(p, t) + "</p>"; }).join("") : '<p class="muted">Celotno besedilo bo objavljeno kmalu.</p>') + "</div>" +
        '<div class="news-reader__links" role="group" aria-label="Povezano">' + links.map(function (l) {
          return '<a class="chip news-reader__link" href="' + esc(l[0]) + '">' + icon(l[2], "icon--sm") + esc(l[1]) + "</a>";
        }).join("") + "</div>" +
        '<section class="news-reader__more" aria-labelledby="news-reader-more">' +
          '<div class="news-reader__more-head">' +
            '<h3 class="news-reader__more-title" id="news-reader-more">Več iz rubrike ' + esc(n.category) + "</h3>" +
            '<button type="button" class="btn btn--sm btn--ghost" data-cat-filter="' + esc(n.category) + '">Vse v rubriki' + icon("arrow-right", "icon--move") + "</button>" +
          "</div>" +
          (rel.length ? '<ul class="news-reader__related" role="list">' + rel.map(function (r) {
            var rp = photo(r.image);
            return '<li><a class="news-rel" href="' + articleHref(r.id) + '" data-open="' + esc(r.id) + '">' +
              '<span class="news-rel__thumb"><img src="' + esc(rp.small) + '" alt="" width="' + rp.sw + '" height="' + rp.sh + '" loading="lazy" decoding="async" style="object-position:' + rp.pos + '"></span>' +
              '<span class="news-rel__text"><span class="news-rel__date">' + esc(PKB.formatDate(r.date)) + '</span><span class="news-rel__title">' + esc(r.title) + "</span></span>" +
              '<span class="news-rel__go" aria-hidden="true">' + icon("arrow-right") + "</span></a></li>";
          }).join("") + "</ul>" : '<p class="small muted">To je za zdaj edina novica v tej rubriki.</p>') +
        "</section>" +
      "</div>" +
    "</article>";
  }
  function navLabel(n) { return n ? n.title : ""; }
  function updateReaderChrome() {
    if (!reader) return;
    var d = reader.m.dialog;
    var i = reader.seq.findIndex(function (x) { return x.id === reader.id; });
    var prev = i > 0 ? reader.seq[i - 1] : null;
    var next = i > -1 && i < reader.seq.length - 1 ? reader.seq[i + 1] : null;
    var n = byId(reader.id);
    var pb = qs("[data-reader-prev]", d), nb = qs("[data-reader-next]", d);
    if (pb) {
      pb.disabled = !prev;
      pb.setAttribute("aria-label", prev ? "Prejšnja novica: " + prev.title : "Ni prejšnje novice");
      qs("[data-prev-title]", pb).textContent = prev ? navLabel(prev) : "Ni prejšnje";
    }
    if (nb) {
      nb.disabled = !next;
      nb.setAttribute("aria-label", next ? "Naslednja novica: " + next.title : "Ni naslednje novice");
      qs("[data-next-title]", nb).textContent = next ? navLabel(next) : "Ni naslednje";
    }
    var pos = qs("[data-reader-pos]", d);
    if (pos) pos.innerHTML = '<span class="num">' + (i + 1) + " / " + reader.seq.length + '</span><span class="news-reader__keys" aria-hidden="true"><kbd>←</kbd><kbd>→</kbd></span>';
    var cat = qs("[data-reader-cat]", d);
    if (cat && n) cat.innerHTML = '<span class="news-dot" style="--dot:' + TONE_VAR[tone(n.category)] + '"></span>' + esc(n.category);
  }
  function updateProgress() {
    if (!reader) return;
    var b = reader.m.body;
    var max = b.scrollHeight - b.clientHeight;
    var p = max > 4 ? Math.min(100, Math.max(0, Math.round(b.scrollTop / max * 100))) : 100;
    var bar = qs("[data-reader-progress]", reader.m.dialog);
    if (bar) {
      bar.setAttribute("aria-valuenow", String(p));
      bar.firstElementChild.style.transform = "scaleX(" + (p / 100) + ")";
    }
  }
  function showArticle(n, opts) {
    opts = opts || {};
    var host = qs("[data-reader-host]", reader.m.dialog);
    var ae = doc.activeElement;
    // focus inside the content that is about to be replaced would fall back to <body>
    var hadFocus = !!host.innerHTML && (host.contains(ae) || !ae || ae === doc.body);
    reader.id = n.id;
    if (!reader.seq.some(function (x) { return x.id === n.id; })) reader.seq = sequenceFor(n.id);
    host.innerHTML = readerHTML(n);
    bindImages(host);
    reader.m.body.scrollTop = 0;
    updateReaderChrome();
    updateProgress();
    if (!reduce()) { host.classList.remove("is-entering"); void host.offsetWidth; host.classList.add("is-entering"); }
    if (opts.announce) {
      var live = qs("[data-reader-live]", reader.m.dialog);
      if (live) live.textContent = "Članek: " + n.title;
    }
    if (opts.focusTitle || hadFocus) {
      var h = qs("#news-reader-title", host);
      if (h) h.focus({ preventScroll: true });
    }
    // rAF: the layout (and image box) is known only after insertion
    requestAnimationFrame(updateProgress);
  }
  function goTo(id, opts) {
    var n = byId(id);
    if (!n || !reader) return;
    if (n.id !== reader.id) {
      showArticle(n, opts);
      try { history.replaceState(history.state && history.state.pushed ? { newsReader: n.id, pushed: true } : history.state, "", buildURL(n.id)); } catch (e) { /* ignore */ }
    }
  }
  function step(dir, viaKey) {
    if (!reader) return;
    var i = reader.seq.findIndex(function (x) { return x.id === reader.id; });
    var t = reader.seq[i + dir];
    if (!t) return;
    var d = reader.m.dialog;
    var btn = qs(dir < 0 ? "[data-reader-prev]" : "[data-reader-next]", d);
    var keepBtn = !viaKey && btn && doc.activeElement === btn;
    goTo(t.id, { announce: true, focusTitle: !keepBtn && !viaKey });
    if (keepBtn && btn.disabled) {
      var h = qs("#news-reader-title", d);
      if (h) h.focus({ preventScroll: true });
    }
  }

  function openReader(id, opts) {
    opts = opts || {};
    var n = byId(id);
    if (!n) {
      notFound(id);
      return false;
    }
    if (reader) {
      goTo(n.id, { announce: true, focusTitle: true });
      return true;
    }
    if (opts.push && window.history && history.pushState) {
      try { history.pushState({ newsReader: n.id, pushed: true }, "", buildURL(n.id)); } catch (e) { /* ignore */ }
    } else if (opts.replace && window.history && history.replaceState) {
      try { history.replaceState(history.state, "", buildURL(n.id)); } catch (e) { /* ignore */ }
    }
    var footer =
      '<button type="button" class="btn btn--sm news-reader__nav news-reader__nav--prev" data-reader-prev>' + icon("arrow-left") +
        '<span class="news-reader__nav-text"><span class="news-reader__nav-k">Prejšnja</span><span class="news-reader__nav-t" data-prev-title></span></span></button>' +
      '<span class="news-reader__pos small soft" data-reader-pos></span>' +
      '<button type="button" class="btn btn--sm news-reader__nav news-reader__nav--next" data-reader-next>' +
        '<span class="news-reader__nav-text"><span class="news-reader__nav-k">Naslednja</span><span class="news-reader__nav-t" data-next-title></span></span>' + icon("arrow-right") + "</button>";
    var m = PKB.modal.open({
      ariaLabel: "Članek",
      size: "lg",
      className: "news-reader-dlg",
      content: '<div class="news-reader-host" data-reader-host></div><p class="visually-hidden" aria-live="polite" data-reader-live></p>',
      footer: footer,
      onClose: onReaderClose
    });
    reader = { m: m, id: n.id, first: n.id, seq: sequenceFor(n.id), closingFromPop: false, after: null };
    var d = m.dialog;
    // head: breadcrumb-like context + reading progress
    var headSpan = qs(".modal__head > span", d);
    if (headSpan) {
      headSpan.className = "news-reader__head";
      headSpan.innerHTML = '<span class="news-reader__crumb">' + icon("newspaper", "icon--sm") + "Novice</span>" +
        '<span class="news-reader__crumb-sep" aria-hidden="true">/</span><span class="news-reader__cat" data-reader-cat></span>';
    }
    var head = qs(".modal__head", d);
    if (head) {
      head.insertAdjacentHTML("beforeend", '<div class="news-reader__progress" role="progressbar" aria-label="Napredek branja" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-reader-progress><span></span></div>');
    }
    showArticle(n, {});
    d.removeAttribute("aria-label");
    d.setAttribute("aria-labelledby", "news-reader-title");
    var h = qs("#news-reader-title", d);
    if (h) h.focus({ preventScroll: true });

    var ticking = false;
    m.body.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; updateProgress(); });
    }, { passive: true });
    bindReaderClicks(m);
    return true;
  }
  /* ← → page through articles while the reader is the topmost dialog */
  doc.addEventListener("keydown", function (e) {
    if (!reader || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    var open = qsa("dialog.modal[open]");
    if (open[open.length - 1] !== reader.m.dialog || reader.m.dialog.classList.contains("is-closing")) return;
    var tg = e.target;
    if (tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable)) return;
    e.preventDefault();
    step(e.key === "ArrowLeft" ? -1 : 1, true);
  });
  function bindReaderClicks(m) {
    var d = m.dialog;
    d.addEventListener("click", function (e) {
      var t = e.target;
      if (!reader || !t.closest) return;
      if (t.closest("[data-reader-prev]")) { step(-1); return; }
      if (t.closest("[data-reader-next]")) { step(1); return; }
      var cur = byId(reader && reader.id);
      if (t.closest("[data-reader-share]") && cur) { PKB.share({ title: cur.title, text: cur.excerpt, url: absoluteArticleURL(cur.id) }); return; }
      if (t.closest("[data-reader-copy]") && cur) { PKB.copy(absoluteArticleURL(cur.id), "Povezava do članka je kopirana."); return; }
      var cf = t.closest("[data-cat-filter]");
      if (cf) {
        var c = matchCat(cf.getAttribute("data-cat-filter"));
        reader.after = function () {
          setFilter({ cat: c || "", q: "", month: "" });
          scrollToList();
          var chip = qs('.news-chip[data-cat="' + (window.CSS && CSS.escape ? CSS.escape(c || "") : c || "") + '"]', el.cats);
          if (chip) chip.focus({ preventScroll: true });
        };
        reader.m.close();
        return;
      }
      var a = t.closest("[data-open]");
      if (a && !(e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
        e.preventDefault();
        goTo(a.getAttribute("data-open"), { announce: true, focusTitle: true });
      }
    });
  }
  function onReaderClose() {
    var r = reader;
    reader = null;
    if (!r) return;
    if (!r.closingFromPop && window.history) {
      var st = history.state;
      if (st && st.pushed && st.newsReader) {
        ignorePop = true;
        clearTimeout(ignoreTimer);
        ignoreTimer = setTimeout(function () { ignorePop = false; }, 1500);
        history.back();
      } else {
        try { history.replaceState(st && st.newsReader ? null : st, "", buildURL(null)); } catch (e) { /* ignore */ }
      }
    }
    // after paging through articles, return focus to the card of the article that was read last
    if (r.id !== r.first && !r.after) {
      var card = el.list && qs('.news-card[data-id="' + (window.CSS && CSS.escape ? CSS.escape(r.id) : r.id) + '"] [data-open]', el.list);
      if (card) card.focus();
    }
    if (typeof r.after === "function") r.after();
  }

  window.addEventListener("popstate", function () {
    if (ignorePop) {
      ignorePop = false;
      clearTimeout(ignoreTimer);
      syncURL();
      return;
    }
    var before = [state.cat, state.q, state.month, state.sort].join("|");
    readURL();
    if ([state.cat, state.q, state.month, state.sort].join("|") !== before) {
      state.shown = PAGE;
      if (el.search) { el.search.value = state.q; if (el.searchClear) el.searchClear.hidden = !state.q; }
      if (el.sort) el.sort.value = state.sort;
      update({ sync: false });
    }
    var id = PKB.params().get("clanek");
    if (id) {
      if (byId(id)) {
        if (reader) { if (reader.id !== id) showArticle(byId(id), { announce: true }); }
        else openReader(id, {});
      } else {
        notFound(id);
        if (reader) { reader.closingFromPop = true; reader.m.close(); }
        try { history.replaceState(null, "", buildURL(null)); } catch (e) { /* ignore */ }
      }
    } else if (reader) {
      reader.closingFromPop = true;
      reader.m.close();
    }
  });
  window.addEventListener("hashchange", function () {
    var id = decodeHash(window.location.hash);
    if (id && byId(id)) openReader(id, { replace: true });
  });

  /* ------------------------------------------------------------------
     11. Boot
     ------------------------------------------------------------------ */
  var bad = readURL();
  if (el.search) { el.search.value = state.q; if (el.searchClear) el.searchClear.hidden = !state.q; }
  if (el.sort) el.sort.value = state.sort;
  buildChips();
  applyView();
  requestAnimationFrame(updateChipFade);
  renderStats();
  renderFeatured();
  renderArchive();
  renderEvents();

  if (!NEWS.length) {
    if (el.count) el.count.textContent = "Ni objav";
    if (el.list) { el.list.innerHTML = ""; el.list.hidden = true; }
    emptyEl.hidden = false;
    emptyEl.innerHTML = '<div class="glass empty-state news-empty__box"><span class="icon-bubble">' + icon("newspaper") + '</span><p class="news-empty__title">Novice bodo kmalu objavljene.</p><p class="small muted news-empty__hint">Spremljajte nas – prve objave sezone pripravljamo.</p></div>';
    if (el.moreWrap) el.moreWrap.hidden = true;
    qsa(".news-toolbar__controls, .news-toolbar__chips", root).forEach(function (x) { x.hidden = true; });
    return;
  }

  // deep links: ?clanek=<id> (contract) or #<id>
  var initialId = PKB.params().get("clanek");
  var hashId = decodeHash(window.location.hash);
  if (initialId) {
    if (!openReader(initialId, {})) {
      try { history.replaceState(history.state, "", buildURL(null)); } catch (e) { /* ignore */ }
    }
  } else if (hashId && byId(hashId)) {
    openReader(hashId, { replace: true });
  }
  update();
  if (bad.length) {
    PKB.toast({ type: "info", title: "Neznana rubrika", message: "Rubrike »" + String(bad[0]).slice(0, 40) + "« ni. Prikazujemo novice vseh rubrik." });
  }
})();
