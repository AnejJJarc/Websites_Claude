/* ==========================================================================
   Galerija (galerija.html) – prefix "gal-"
   Album filter (?album=…), JS-balanced masonry with FLIP transitions,
   lightbox (keyboard, swipe, zoom + pan, slideshow, thumbnail strip, #<id> deep links).
   ========================================================================== */
(function () {
  "use strict";

  var PKB = window.PKB;
  if (!PKB) return;
  var D = PKB.data || {};
  var doc = document;
  var qs = PKB.qs, qsa = PKB.qsa, esc = PKB.escapeHTML;
  var SLIDE_MS = 4000;
  var ZOOM = 2;
  var STORE_SORT = "galerija:sort";

  var reduce = function () { return PKB.prefersReducedMotion(); };
  var smooth = function () { return reduce() ? "instant" : "smooth"; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var photosWord = function (n) { return PKB.plural(n, ["fotografija", "fotografiji", "fotografije", "fotografij"]); };
  var isISO = function (s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); };
  function fmtDate(iso, opts) {
    if (!isISO(iso)) return "";
    try { return PKB.formatDate(iso, opts); } catch (e) { return iso; }
  }
  var fmtShort = function (iso) { return fmtDate(iso, { day: "numeric", month: "short", year: "numeric" }); };

  /* ------------------------------------------------------------------
     Data
     ------------------------------------------------------------------ */
  var ALL = (Array.isArray(D.gallery) ? D.gallery : []).filter(function (g) {
    return g && g.id && (g.src || g.thumb);
  }).map(function (g, i) {
    var w = Number(g.w) > 0 ? Number(g.w) : 1500;
    var h = Number(g.h) > 0 ? Number(g.h) : 1000;
    var tw = w >= h ? 720 : 560;                        // the "-sm" files: 720 px wide (landscape) / 560 px (portrait)
    return {
      id: String(g.id), src: g.src || g.thumb, thumb: g.thumb || g.src,
      w: w, h: h, tw: tw, th: Math.round(tw * h / w),
      album: g.album ? String(g.album) : "Ostalo",
      title: g.title ? String(g.title) : "Fotografija",
      date: isISO(g.date) ? g.date : "",
      order: i
    };
  });
  var byId = {};
  ALL.forEach(function (it) { byId[it.id] = it; });

  var ALBUMS = (Array.isArray(D.albums) ? D.albums : []).filter(function (a) { return typeof a === "string" && a; });
  ALL.forEach(function (it) { if (ALBUMS.indexOf(it.album) === -1) ALBUMS.push(it.album); });
  var albumCount = function (a) { return ALL.filter(function (it) { return it.album === a; }).length; };

  function sortItems(list, dir) {
    return list.slice().sort(function (a, b) {
      if (a.date !== b.date) {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return dir === "old" ? (a.date < b.date ? -1 : 1) : (a.date < b.date ? 1 : -1);
      }
      return a.order - b.order;
    });
  }
  var newest = sortItems(ALL, "new");

  /* ------------------------------------------------------------------
     State
     ------------------------------------------------------------------ */
  var storedSort = PKB.storage.get(STORE_SORT, "new");
  var state = { album: "", sort: storedSort === "old" ? "old" : "new" };
  var currentList = function () {
    return sortItems(ALL.filter(function (it) { return !state.album || it.album === state.album; }), state.sort);
  };
  var allSorted = function () { return sortItems(ALL, state.sort); };

  /* ------------------------------------------------------------------
     Elements
     ------------------------------------------------------------------ */
  var el = {
    feature: qs("[data-feature]"),
    stats: qs("[data-stats]"),
    total: qs("[data-total]"),
    albums: qs("[data-albums]"),
    count: qs("[data-count]"),
    grid: qs("[data-grid]"),
    empty: qs("[data-empty]"),
    board: qs("[data-board]"),
    section: doc.getElementById("fotografije"),
    heroPlay: qs("[data-slideshow-start]"),
    heroPlayLabel: qs("[data-slideshow-start-label]"),
    toolPlay: qs("[data-slideshow-filtered]")
  };
  if (!el.grid) return;

  /* ------------------------------------------------------------------
     Hero: newest photo + album counts
     ------------------------------------------------------------------ */
  function renderFeature() {
    if (!el.feature) return;
    var it = newest[0];
    if (!it) {
      el.feature.innerHTML = '<div class="tile gal-feature__empty"><span class="icon-bubble" aria-hidden="true">' + PKB.icon("image") + '</span><p class="small muted">Fotografije bodo objavljene kmalu.</p></div>';
      return;
    }
    var meta = [it.album, fmtDate(it.date)].filter(Boolean).join(" · ");
    el.feature.innerHTML =
      '<button type="button" class="photo-card gal-feature__card" data-open="' + esc(it.id) + '" aria-haspopup="dialog">' +
        '<img src="' + esc(it.thumb) + '" srcset="' + esc(it.thumb) + " " + it.tw + "w, " + esc(it.src) + " " + it.w + 'w" sizes="(min-width: 980px) 520px, 100vw"' +
          ' alt="" width="' + it.tw + '" height="' + it.th + '" decoding="async" fetchpriority="high">' +
        '<span class="gal-feature__tag"><span class="gal-feature__tag-dot" aria-hidden="true"></span>Najnovejša fotografija</span> ' +
        '<span class="photo-card__glass gal-feature__cap">' +
          '<span class="gal-feature__text"><span class="gal-feature__kicker">' + esc(meta) + "</span> " +
            '<strong class="gal-feature__title">' + esc(it.title) + "</strong></span>" +
          '<span class="gal-round" aria-hidden="true">' + PKB.icon("maximize") + "</span>" +
        "</span>" +
      "</button>";
  }

  function renderStats() {
    if (!el.stats) return;
    if (el.total) el.total.textContent = String(ALL.length);
    var totalLabel = qs(".gal-stat--total .gal-stat__label", el.stats);
    if (totalLabel) totalLabel.textContent = photosWord(ALL.length) + " v " + ALBUMS.length + " " + PKB.plural(ALBUMS.length, ["albumu", "albumih", "albumih", "albumih"]);
    qsa(".gal-stat--album", el.stats).forEach(function (n) { n.remove(); });
    var max = ALL.length || 1;
    var html = ALBUMS.map(function (a) {
      var n = albumCount(a);
      var cover = newest.filter(function (it) { return it.album === a; })[0];
      return '<li class="gal-stat gal-stat--album">' +
        '<a class="gal-stat__link" href="galerija.html?album=' + encodeURIComponent(a) + '#fotografije" data-album-link="' + esc(a) + '"' +
          ' aria-label="Album ' + esc(a) + ": " + n + " " + photosWord(n) + ' – prikaži">' +
          '<span class="gal-stat__value">' + n + "</span>" +
          '<span class="gal-stat__label">' +
            (cover ? '<span class="gal-stat__cover"><img src="' + esc(cover.thumb) + '" alt="" width="' + cover.tw + '" height="' + cover.th + '" loading="lazy" decoding="async"></span>' : "") +
            "<span>" + esc(a) + "</span></span>" +
          '<span class="gal-stat__bar" aria-hidden="true"><span style="--value:' + Math.round(n / max * 100) + '%"></span></span>' +
        "</a></li>";
    }).join("");
    el.stats.insertAdjacentHTML("beforeend", html);
  }

  /* ------------------------------------------------------------------
     Toolbar: album chips, sort, count
     ------------------------------------------------------------------ */
  function renderAlbumChips() {
    if (!el.albums) return;
    var chip = function (value, label, n, cover) {
      return '<button type="button" class="chip gal-chip" data-album="' + esc(value) + '" aria-pressed="' + (state.album === value) + '">' +
        (cover ? '<span class="gal-chip__cover" aria-hidden="true"><img src="' + esc(cover.thumb) + '" alt="" width="' + cover.tw + '" height="' + cover.th + '" loading="lazy" decoding="async"></span>'
               : '<span class="gal-chip__cover gal-chip__cover--all" aria-hidden="true">' + PKB.icon("grid") + "</span>") +
        "<span>" + esc(label) + '</span> <span class="count">' + n + "</span></button>";
    };
    el.albums.innerHTML = chip("", "Vse", ALL.length, null) + ALBUMS.map(function (a) {
      return chip(a, a, albumCount(a), newest.filter(function (it) { return it.album === a; })[0]);
    }).join("");
  }

  function syncControls() {
    qsa("[data-album]", el.albums).forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-album") === state.album));
    });
    qsa("[data-sort]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-sort") === state.sort));
    });
    qsa("[data-album-link]", el.stats).forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("data-album-link") === state.album);
    });
    var n = currentList().length;
    if (el.count) {
      el.count.innerHTML = (state.album ? "Album " + esc(state.album) : "Vsi albumi") + ' <span class="dot-sep" aria-hidden="true"></span><strong>' + n + "</strong> " + photosWord(n) +
        '<span class="gal-toolbar__sortinfo"> · ' + (state.sort === "old" ? "od najstarejše" : "od najnovejše") + "</span>";
    }
    var none = n === 0;
    if (el.toolPlay) el.toolPlay.disabled = none;
    if (el.heroPlay) el.heroPlay.disabled = !ALL.length;
  }

  function matchAlbum(raw) {
    if (raw == null) return { album: "", ok: true };
    var v = String(raw).trim();
    if (!v) return { album: "", ok: true };
    var n = PKB.normalize(v);
    if (n === "vse" || n === "vsi" || n === "all") return { album: "", ok: true };
    for (var i = 0; i < ALBUMS.length; i++) {
      var a = ALBUMS[i];
      if (a === v || PKB.normalize(a) === n || PKB.slugify(a) === PKB.slugify(v)) return { album: a, ok: true };
    }
    return { album: "", ok: false };
  }

  function syncUrl() {
    if (!history.replaceState) return;
    var p = new URLSearchParams(window.location.search);
    if (state.album) p.set("album", state.album); else p.delete("album");
    var s = p.toString().replace(/\+/g, "%20");
    var url = window.location.pathname + (s ? "?" + s : "") + window.location.hash;
    if (url !== window.location.pathname + window.location.search + window.location.hash) history.replaceState(history.state, "", url);
  }

  function setAlbum(album, opts) {
    opts = opts || {};
    var changed = album !== state.album;
    state.album = album;
    if (changed || opts.force) relayout(true);
    syncControls();
    syncUrl();
  }

  function setSort(sort) {
    if (sort !== "new" && sort !== "old") return;
    if (sort === state.sort) return;
    state.sort = sort;
    PKB.storage.set(STORE_SORT, sort);
    relayout(true);
    syncControls();
  }

  /* ------------------------------------------------------------------
     Grid: render once, then filter/sort by showing/hiding + JS masonry
     ------------------------------------------------------------------ */
  var nodes = {};          // id -> { li, card, img, it, shown, revealed, x, y, w, h }
  var initialized = false;
  var lastWidth = 0;

  function itemHTML(it) {
    var meta = [fmtShort(it.date), it.album].filter(Boolean).join(" · ");
    return '<button type="button" class="gal-card" data-open="' + esc(it.id) + '" aria-haspopup="dialog">' +
        '<span class="gal-card__media">' +
          '<img src="' + esc(it.thumb) + '" alt="" width="' + it.tw + '" height="' + it.th + '" loading="lazy" decoding="async" draggable="false">' +
        "</span>" +
        '<span class="gal-card__cap">' +
          '<span class="gal-card__text"><span class="gal-card__title">' + esc(it.title) + "</span> " +
            '<span class="gal-card__meta">' + esc(meta) + "</span></span>" +
          '<span class="gal-card__zoom" aria-hidden="true">' + PKB.icon("maximize") + "</span>" +
        "</span>" +
      "</button>";
  }

  function buildGrid() {
    var frag = doc.createDocumentFragment();
    ALL.forEach(function (it) {
      var li = doc.createElement("li");
      li.className = "gal-item";
      li.id = "foto-" + it.id;
      li.setAttribute("data-id", it.id);
      li.hidden = true;
      li.innerHTML = itemHTML(it);
      var card = li.firstChild;
      var img = qs("img", li);
      var n = { li: li, card: card, img: img, it: it, shown: false, revealed: false, x: 0, y: 0, w: 0, h: 0 };
      nodes[it.id] = n;
      var done = function () { card.classList.add("is-loaded"); };
      img.addEventListener("load", done);
      img.addEventListener("error", function () {
        card.classList.add("is-error");
        qs(".gal-card__media", card).insertAdjacentHTML("beforeend", '<span class="gal-card__err">' + PKB.icon("image") + "<span>Fotografije ni bilo mogoče naložiti</span></span>");
      });
      if (img.complete && img.naturalWidth) done();
      frag.appendChild(li);
    });
    el.grid.appendChild(frag);
  }

  var io = null;
  function setupReveal() {
    if (reduce() || !("IntersectionObserver" in window)) return;
    io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (en) { return en.isIntersecting; }).map(function (en) {
        return nodes[en.target.getAttribute("data-id")];
      }).filter(function (n) { return n && !n.revealed; });
      batch.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
      batch.forEach(function (n, i) {
        n.revealed = true;
        io.unobserve(n.li);
        setTimeout(function () { if (n.shown) n.li.classList.add("is-in"); }, Math.min(i * 55, 440));
      });
    }, { rootMargin: "0px 0px -4% 0px", threshold: 0.01 });
  }

  function metrics() {
    var W = el.grid.clientWidth;
    var cols = W < 500 ? 2 : W < 820 ? 3 : 4;
    var gap = W < 500 ? 8 : W < 820 ? 12 : 14;
    var pad = parseFloat(getComputedStyle(el.grid).getPropertyValue("--gal-pad")) || 6;
    return { W: W, cols: cols, gap: gap, pad: pad, colW: (W - gap * (cols - 1)) / cols };
  }

  var zeros = function (k) { var a = []; for (var i = 0; i < k; i++) a.push(0); return a; };
  var maxOf = function (a) { return Math.max.apply(null, a); };

  /**
   * Masonry: shortest-column placement, then the last few photos are re-assigned (exhaustive search)
   * so the columns end as evenly as possible, and finally each column is evened out by letting its
   * thumbnails crop a little (object-fit: cover, at most ±12 %) so the bottom edge is flush.
   * Sizes come from data w/h, so nothing shifts when the images load.
   */
  function place(list) {
    var m = metrics();
    if (!m.W) return;
    lastWidth = m.W;
    var C = m.cols, n = list.length, pad2 = 2 * m.pad, gap = m.gap;
    var media = list.map(function (it) { return (m.colW - pad2) * it.h / it.w; });
    var cost = function (i) { return media[i] + pad2 + gap; };
    var assign = [], hs = zeros(C), i, c, k;

    for (i = 0; i < n; i++) {
      c = 0;
      for (k = 1; k < C; k++) if (hs[k] < hs[c] - 1) c = k;
      assign.push(c);
      hs[c] += cost(i);
    }

    // the first row always stays in reading order; only photos after it may move, and moves that put a
    // later photo noticeably above an earlier one are penalised (keeps "newest first" readable)
    var K = Math.min(n - C, C === 2 ? 8 : C === 3 ? 7 : 6);
    if (C > 1 && K > 1) {
      var base = zeros(C), lastTop = 0;
      for (i = 0; i < n - K; i++) { lastTop = base[assign[i]]; base[assign[i]] += cost(i); }
      var combos = Math.pow(C, K), best = null, bestScore = Infinity, cur = [];
      for (var code = 0; code < combos; code++) {
        var x = code, h = base.slice(), prevTop = lastTop, inv = 0;
        for (var j = 0; j < K; j++) {
          c = x % C; x = (x - c) / C; cur[j] = c;
          if (h[c] < prevTop) inv += prevTop - h[c];
          prevTop = h[c];
          h[c] += cost(n - K + j);
        }
        var lo = Infinity, hi = 0;
        for (c = 0; c < C; c++) { if (h[c] > hi) hi = h[c]; if (h[c] < lo) lo = h[c]; }
        var score = hi - lo + inv * 0.35;
        if (score < bestScore - 0.5) { bestScore = score; best = cur.slice(); }
      }
      if (best) for (j = 0; j < K; j++) assign[n - K + j] = best[j];
    }

    // per-column scale so all columns end at the same height (within ±12 %)
    var M = zeros(C), cnt = zeros(C), F = zeros(C), H = zeros(C), used = 0, sum = 0;
    for (i = 0; i < n; i++) { M[assign[i]] += media[i]; cnt[assign[i]]++; }
    for (c = 0; c < C; c++) {
      F[c] = cnt[c] * pad2 + Math.max(0, cnt[c] - 1) * gap;
      H[c] = M[c] + F[c];
      if (cnt[c]) { used++; sum += H[c]; }
    }
    var T = used ? sum / used : 0;
    var scale = zeros(C).map(function (z, cc) { return M[cc] > 0 ? clamp((T - F[cc]) / M[cc], 0.88, 1.12) : 1; });

    var yf = zeros(C), bottoms = zeros(C);
    list.forEach(function (it, idx) {
      var col = assign[idx];
      var node = nodes[it.id];
      var hf = media[idx] * scale[col] + pad2;
      var top = Math.round(yf[col]);
      var bottom = Math.round(yf[col] + hf);
      node.x = Math.round(col * (m.colW + gap));
      node.y = top;
      node.w = m.colW;
      node.h = bottom - top;
      node.li.style.left = node.x + "px";
      node.li.style.top = top + "px";
      node.li.style.width = m.colW + "px";
      node.li.style.height = node.h + "px";
      yf[col] += hf + gap;
      bottoms[col] = bottom;
    });
    el.grid.style.height = (n ? maxOf(bottoms) : 0) + "px";
  }

  var leaveTimers = {};
  /** Apply filter + sort. animate: FLIP moves, fade items in/out. */
  function relayout(animate) {
    var list = currentList();
    var want = {};
    list.forEach(function (it) { want[it.id] = true; });
    var anim = animate && initialized && !reduce();
    var before = {};
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id];
      if (n.shown) before[id] = { x: n.x, y: n.y };
    });

    // DOM order = visual order (keyboard order follows the grid). Only move nodes when the order really
    // changed: re-inserted nodes lose their running transitions (fade-outs would cut off).
    var order = sortItems(ALL, state.sort);
    var domIds = Array.prototype.map.call(el.grid.children, function (c) { return c.getAttribute("data-id"); }).join(",");
    if (domIds !== order.map(function (it) { return it.id; }).join(",")) {
      order.forEach(function (it) { el.grid.appendChild(nodes[it.id].li); });
    }

    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id];
      clearTimeout(leaveTimers[id]);
      if (want[id]) {
        n.li.hidden = false;
        n.shown = true;
        n.li.classList.remove("is-leaving");
      } else if (n.shown || !n.li.hidden) {
        n.shown = false;
        n.li.classList.remove("is-in");
        if (anim && before[id]) {
          n.li.classList.add("is-leaving");
          leaveTimers[id] = setTimeout(function () { if (!n.shown) { n.li.hidden = true; n.li.classList.remove("is-leaving"); } }, 320);
        } else {
          n.li.hidden = true;
        }
      }
    });

    renderEmpty(list.length);
    if (anim) {
      el.grid.classList.add("is-animating");
      clearTimeout(relayout.t);
      relayout.t = setTimeout(function () { el.grid.classList.remove("is-animating"); }, 650);
    }
    place(list);
    initialized = true;

    list.forEach(function (it) {
      var n = nodes[it.id];
      var b = before[it.id];
      if (anim && b && (b.x !== n.x || b.y !== n.y)) {
        // FLIP: start where it was (DOM moves reset transitions, so animate via transform)
        n.li.style.transition = "none";
        n.li.style.transform = "translate(" + (b.x - n.x) + "px, " + (b.y - n.y) + "px)";
        n.flip = true;
      }
      if (!b && n.revealed) {
        // entering after a filter change
        n.li.classList.remove("is-in");
        n.enter = true;
      }
      if (!n.revealed && (!io || reduce())) { n.revealed = true; n.li.classList.add("is-in"); }
      if (!n.revealed && io) io.observe(n.li);
    });
    void el.grid.offsetWidth;
    requestAnimationFrame(function () {
      list.forEach(function (it) {
        var n = nodes[it.id];
        if (n.flip) { n.li.style.transition = ""; n.li.style.transform = ""; n.flip = false; }
        if (n.enter) { n.li.classList.add("is-in"); n.enter = false; }
        else if (n.revealed && n.shown && !n.li.classList.contains("is-in")) n.li.classList.add("is-in");
      });
    });
  }

  function renderEmpty(n) {
    if (!el.empty) return;
    if (n > 0) { el.empty.hidden = true; el.empty.innerHTML = ""; el.grid.hidden = false; return; }
    el.grid.hidden = true;
    el.empty.hidden = false;
    if (!ALL.length) {
      el.empty.innerHTML = '<div class="empty-state"><span class="icon-bubble" aria-hidden="true">' + PKB.icon("image") + "</span>" +
        '<p class="gal-empty__title">Galerija se še polni</p><p class="small muted">Fotografije s treningov in tekem bodo objavljene kmalu.</p>' +
        '<a class="btn btn--sm" href="kontakt.html?zadeva=mediji#obrazec">' + PKB.icon("send") + "Pošljite fotografije</a></div>";
    } else {
      el.empty.innerHTML = '<div class="empty-state"><span class="icon-bubble" aria-hidden="true">' + PKB.icon("image") + "</span>" +
        '<p class="gal-empty__title">V albumu »' + esc(state.album) + "« še ni fotografij</p>" +
        '<button type="button" class="btn btn--sm" data-album-reset>' + PKB.icon("grid") + "Prikaži vse fotografije</button></div>";
    }
  }

  function observeResize() {
    var raf = 0;
    var onResize = function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var w = el.grid.clientWidth;
        if (w && w !== lastWidth) place(currentList());
      });
    };
    if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(el.grid);
    else window.addEventListener("resize", onResize);
  }

  /* ------------------------------------------------------------------
     Lightbox
     ------------------------------------------------------------------ */
  var LB = null;

  function lbHTML() {
    var btn = function (attr, icon, label, extra) {
      return '<button type="button" class="btn btn--icon btn--sm gal-lb__tool" ' + attr + ' aria-label="' + label + '" title="' + label + '"' + (extra || "") + ">" + icon + "</button>";
    };
    return '<div class="gal-lb__shell">' +
      '<div class="gal-lb__bar">' +
        '<p class="gal-lb__counter" aria-hidden="true"><span class="gal-lb__cur" data-lb-cur>1</span><span class="gal-lb__sep">/</span><span data-lb-total>1</span></p>' +
        '<div class="gal-lb__tools">' +
          btn('data-lb-zoom aria-pressed="false"', PKB.icon("zoom-in"), "Povečaj fotografijo") +
          btn('data-lb-play aria-pressed="false"', '<span class="gal-lb__ico-play">' + PKB.icon("play") + '</span><span class="gal-lb__ico-pause">' + PKB.icon("pause") + "</span>", "Predvajaj diaprojekcijo") +
          '<a class="btn btn--sm gal-lb__tool gal-lb__dl" data-lb-download href="#" download>' + PKB.icon("download") + '<span class="gal-lb__dl-label">Prenesi</span></a>' +
          btn("data-lb-copy", PKB.icon("link"), "Kopiraj povezavo do fotografije") +
          '<span class="gal-lb__divider" aria-hidden="true"></span>' +
          btn("data-modal-close data-lb-close", PKB.icon("x"), "Zapri pregledovalnik") +
        "</div>" +
      "</div>" +
      '<div class="gal-lb__stage" data-lb-stage>' +
        '<div class="gal-lb__viewport" data-lb-viewport></div>' +
        '<button type="button" class="gal-lb__nav gal-lb__nav--prev" data-lb-prev aria-label="Prejšnja fotografija">' + PKB.icon("chevron-left") + "</button>" +
        '<button type="button" class="gal-lb__nav gal-lb__nav--next" data-lb-next aria-label="Naslednja fotografija">' + PKB.icon("chevron-right") + "</button>" +
        '<p class="gal-lb__pill gal-lb__pill--zoom" data-lb-zoomhint hidden>' + PKB.icon("navigation", "icon--sm") + "<span>Povlecite za premikanje</span></p>" +
        '<div class="gal-lb__play" data-lb-playbar hidden><span class="gal-lb__play-label" data-lb-playlabel>Diaprojekcija</span><span class="gal-lb__progress"><span data-lb-progress></span></span></div>' +
      "</div>" +
      '<div class="gal-lb__foot">' +
        '<div class="gal-lb__caption">' +
          '<h2 class="gal-lb__title" id="gal-lb-title" data-lb-title></h2>' +
          '<p class="gal-lb__meta" id="gal-lb-meta" data-lb-meta></p>' +
        "</div>" +
        '<div class="gal-lb__strip-wrap"><ul class="gal-lb__strip" role="list" aria-label="Sličice fotografij" data-lb-strip></ul></div>' +
      "</div>" +
      '<p class="gal-lb__keys" aria-hidden="true"><kbd>' + PKB.icon("arrow-left") + "</kbd><kbd>" + PKB.icon("arrow-right") + '</kbd> listanje<span class="dot-sep"></span>klik povečava<span class="dot-sep"></span><kbd>Esc</kbd> zapri</p>' +
      '<p class="visually-hidden" aria-live="polite" aria-atomic="true" data-lb-live></p>' +
    "</div>";
  }

  function stripHTML(list) {
    return list.map(function (it, i) {
      return '<li><button type="button" class="gal-lb__thumb" data-lb-goto="' + i + '" aria-label="' + (i + 1) + ". " + esc(it.title) + '">' +
        '<img src="' + esc(it.thumb) + '" alt="" width="' + it.tw + '" height="' + it.th + '" loading="lazy" decoding="async" draggable="false"></button></li>';
    }).join("");
  }

  function openLightbox(id, opts) {
    opts = opts || {};
    if (!byId[id]) return false;
    var list = opts.list || currentList();
    if (!list.some(function (it) { return it.id === id; })) list = allSorted();
    if (LB) {
      if (!LB.list.some(function (it) { return it.id === id; })) setList(list);
      show(indexIn(LB.list, id), 0, { quiet: false });
      if (opts.play) setPlaying(true);
      return true;
    }

    var opener = doc.activeElement;
    var wrap = doc.createElement("div");
    wrap.className = "gal-lb__root";
    wrap.innerHTML = lbHTML();
    // initial focus: play/pause when starting a slideshow, otherwise the close button
    var focusSel = opts.play && !reduce() ? "[data-lb-play]" : "[data-lb-close]";
    qs(focusSel, wrap).setAttribute("autofocus", "");

    var prevHash = window.location.hash;
    var m = PKB.modal.open({
      content: wrap, size: "full", className: "gal-lb", showHead: false, ariaLabel: "Pregledovalnik fotografij",
      onClose: function () { onLightboxClosed(); }
    });
    m.dialog.setAttribute("aria-labelledby", "gal-lb-title");
    m.dialog.setAttribute("aria-describedby", "gal-lb-meta");

    LB = {
      m: m, dialog: m.dialog, root: wrap, list: list, index: -1, frame: null,
      opener: opener, openerIsCard: !!(opener && opener.closest && opener.closest(".gal-card")),
      prevHash: /^#g[\w-]+$/.test(prevHash) && byId[prevHash.slice(1)] ? "" : prevHash,
      zoom: { on: false, x: 0, y: 0 },
      playing: false, elapsed: 0, last: 0, raf: 0, hover: false,
      ptr: null, lastTap: null,
      $: function (s) { return qs(s, wrap); }
    };
    LB.viewport = LB.$("[data-lb-viewport]");
    LB.stage = LB.$("[data-lb-stage]");
    LB.strip = LB.$("[data-lb-strip]");
    LB.playBtn = LB.$("[data-lb-play]");
    LB.zoomBtn = LB.$("[data-lb-zoom]");
    setList(list);
    bindLightbox();
    show(indexIn(list, id), 0, { quiet: true, initial: true });
    if (opts.play) setPlaying(true);
    return true;
  }

  function indexIn(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return 0;
  }

  function setList(list) {
    LB.list = list;
    LB.$("[data-lb-total]").textContent = String(list.length);
    LB.strip.innerHTML = stripHTML(list);
    var single = list.length < 2;
    LB.root.classList.toggle("is-single", single);
    qsa("[data-lb-prev], [data-lb-next]", LB.root).forEach(function (b) { b.hidden = single; });
    LB.playBtn.hidden = single || reduce();
    if (single && LB.playing) setPlaying(false);
  }

  function makeFrame(it) {
    var f = doc.createElement("div");
    f.className = "gal-lb__frame is-loading";
    f.style.setProperty("--ar", it.w + " / " + it.h);
    f.innerHTML =
      '<img class="gal-lb__ph" src="' + esc(it.thumb) + '" alt="" aria-hidden="true" draggable="false">' +
      '<img class="gal-lb__img" alt="' + esc(it.title) + '" width="' + it.w + '" height="' + it.h + '" draggable="false" decoding="async">';
    var big = qs(".gal-lb__img", f);
    big.addEventListener("load", function () { f.classList.remove("is-loading"); f.classList.add("is-ready"); });
    big.addEventListener("error", function () {
      f.classList.remove("is-loading");
      f.classList.add("is-error");
      f.insertAdjacentHTML("beforeend", '<p class="gal-lb__err">' + PKB.icon("alert-circle", "icon--sm") + "<span>Fotografije v polni velikosti ni bilo mogoče naložiti.</span></p>");
    });
    big.src = it.src;
    if (big.complete && big.naturalWidth) { f.classList.remove("is-loading"); f.classList.add("is-ready"); }
    return f;
  }

  function preload(i) {
    if (!LB || LB.list.length < 2) return;
    [i + 1, i - 1].forEach(function (k) {
      var it = LB.list[(k + LB.list.length) % LB.list.length];
      if (it && !it._pre) { var im = new Image(); im.decoding = "async"; im.src = it.src; it._pre = true; }
    });
  }

  function show(i, dir, opts) {
    opts = opts || {};
    if (!LB || !LB.list.length) return;
    i = (i + LB.list.length) % LB.list.length;
    var same = i === LB.index && LB.frame;
    var it = LB.list[i];
    setZoom(false);
    if (!same) {
      var old = LB.frame;
      var frame = makeFrame(it);
      var anim = !reduce() && old && !opts.initial;
      if (anim) frame.classList.add(dir < 0 ? "is-from-left" : "is-from-right");
      LB.viewport.appendChild(frame);
      if (old) {
        old.classList.remove("is-dragging");
        old.style.transform = "";
        old.style.opacity = "";
        old.classList.add("is-leaving", dir < 0 ? "is-to-right" : "is-to-left");
        old.setAttribute("aria-hidden", "true");
        if (anim) setTimeout(function () { old.remove(); }, 380);
        else old.remove();
      }
      if (anim) {
        void frame.offsetWidth;
        requestAnimationFrame(function () { frame.classList.remove("is-from-left", "is-from-right"); });
      }
      LB.frame = frame;
    }
    LB.index = i;
    LB.elapsed = 0;

    // texts
    LB.$("[data-lb-cur]").textContent = String(i + 1);
    LB.$("[data-lb-title]").textContent = it.title;
    var rel = it.date ? PKB.relativeDay(it.date) : "";
    LB.$("[data-lb-meta]").innerHTML =
      '<span class="badge gal-lb__album">' + esc(it.album) + "</span> " +
      (it.date ? '<span class="gal-lb__date"><time datetime="' + esc(it.date) + '">' + esc(fmtDate(it.date)) + "</time>" +
        (rel ? '<span class="gal-lb__rel"> · ' + esc(rel) + "</span>" : "") + "</span>" : "") +
      '<span class="visually-hidden">Fotografija ' + (i + 1) + " od " + LB.list.length + ".</span>";
    var dl = LB.$("[data-lb-download]");
    dl.setAttribute("href", it.src);
    var ext = (/\.(\w{3,4})(?:\?|$)/.exec(it.src) || [0, "jpg"])[1];
    dl.setAttribute("download", "pk-branik-" + (PKB.slugify(it.title) || it.id) + "." + ext);
    dl.setAttribute("aria-label", "Prenesi fotografijo »" + it.title + "«");

    // strip
    var prevActive = qs('[aria-current="true"]', LB.strip);
    var hadFocus = prevActive && doc.activeElement === prevActive;
    if (prevActive) prevActive.removeAttribute("aria-current");
    var btn = qs('[data-lb-goto="' + i + '"]', LB.strip);
    if (btn) {
      btn.setAttribute("aria-current", "true");
      var wrapEl = LB.strip.parentNode;
      var left = btn.parentNode.offsetLeft - (wrapEl.clientWidth - btn.offsetWidth) / 2;
      wrapEl.scrollTo({ left: Math.max(0, left), behavior: opts.initial ? "auto" : smooth() });
      if (hadFocus) btn.focus({ preventScroll: true });
    }

    // url + announcements
    if (history.replaceState && window.location.hash !== "#" + it.id) {
      history.replaceState(history.state, "", window.location.pathname + window.location.search + "#" + it.id);
    }
    if (!opts.quiet) {
      LB.$("[data-lb-live]").textContent = "Fotografija " + (i + 1) + " od " + LB.list.length + ": " + it.title + ". " + it.album + (it.date ? ", " + fmtDate(it.date) : "") + ".";
    }
    preload(i);
  }

  function go(delta) {
    if (!LB || LB.list.length < 2) return;
    show(LB.index + delta, delta);
  }

  /* ---- zoom + pan ---- */
  function applyZoom(animate) {
    var f = LB && LB.frame;
    if (!f) return;
    f.classList.toggle("is-zoom-anim", !!animate && !reduce());
    f.style.transform = LB.zoom.on ? "translate3d(" + LB.zoom.x + "px, " + LB.zoom.y + "px, 0) scale(" + ZOOM + ")" : "";
  }
  function clampPan() {
    var f = LB.frame;
    var mx = Math.max(0, (f.offsetWidth * ZOOM - LB.viewport.clientWidth) / 2);
    var my = Math.max(0, (f.offsetHeight * ZOOM - LB.viewport.clientHeight) / 2);
    LB.zoom.x = clamp(LB.zoom.x, -mx, mx);
    LB.zoom.y = clamp(LB.zoom.y, -my, my);
  }
  /** on: boolean; at: optional {x, y} client point to zoom towards */
  function setZoom(on, at) {
    if (!LB) return;
    if (on === LB.zoom.on && !at) return;
    LB.zoom.on = !!on && !!LB.frame;
    LB.zoom.x = 0; LB.zoom.y = 0;
    if (LB.zoom.on && at && LB.frame) {
      var r = LB.frame.getBoundingClientRect();
      var cx = at.x - (r.left + r.width / 2), cy = at.y - (r.top + r.height / 2);
      LB.zoom.x = -cx * (ZOOM - 1);
      LB.zoom.y = -cy * (ZOOM - 1);
      clampPan();
    }
    applyZoom(true);
    LB.root.classList.toggle("is-zoomed", LB.zoom.on);
    LB.zoomBtn.setAttribute("aria-pressed", String(LB.zoom.on));
    var lbl = LB.zoom.on ? "Pomanjšaj fotografijo" : "Povečaj fotografijo";
    LB.zoomBtn.setAttribute("aria-label", lbl);
    LB.zoomBtn.setAttribute("title", lbl);
    LB.$("[data-lb-zoomhint]").hidden = !LB.zoom.on;
  }

  /* ---- slideshow ---- */
  function isHeld() {
    if (!LB) return true;
    if (LB.hover || LB.zoom.on || doc.hidden || LB.ptr) return true;
    var a = doc.activeElement;
    if (a && a !== LB.playBtn && LB.dialog.contains(a) && a !== LB.dialog) {
      try { if (a.matches(":focus-visible")) return true; } catch (e) { /* old browsers */ }
    }
    return false;
  }
  function setPlaying(on) {
    if (!LB) return;
    if (reduce() || LB.list.length < 2) on = false;
    LB.playing = !!on;
    LB.elapsed = 0;
    LB.hover = false;
    LB.hoverOrigin = null;
    LB.playBtn.setAttribute("aria-pressed", String(LB.playing));
    var lbl = LB.playing ? "Ustavi diaprojekcijo" : "Predvajaj diaprojekcijo";
    LB.playBtn.setAttribute("aria-label", lbl);
    LB.playBtn.setAttribute("title", lbl);
    LB.root.classList.toggle("is-playing", LB.playing);
    LB.$("[data-lb-playbar]").hidden = !LB.playing;
    cancelAnimationFrame(LB.raf);
    if (LB.playing) {
      LB.last = performance.now();
      LB.raf = requestAnimationFrame(tick);
    }
  }
  function tick() {
    if (!LB || !LB.playing) return;
    var now = performance.now();
    var dt = Math.min(now - LB.last, 100);
    LB.last = now;
    var held = isHeld();
    var ready = LB.frame && (LB.frame.classList.contains("is-ready") || LB.frame.classList.contains("is-error"));
    if (!held && ready) LB.elapsed += dt;
    LB.root.classList.toggle("is-held", held);
    LB.$("[data-lb-playlabel]").textContent = held ? "Diaprojekcija · premor" : "Diaprojekcija";
    LB.$("[data-lb-progress]").style.transform = "scaleX(" + Math.min(1, LB.elapsed / SLIDE_MS).toFixed(4) + ")";
    if (LB.elapsed >= SLIDE_MS) { LB.elapsed = 0; show(LB.index + 1, 1, { quiet: true }); }
    LB.raf = requestAnimationFrame(tick);
  }

  /* ---- events ---- */
  function bindLightbox() {
    var dlg = LB.dialog, root = LB.root, vp = LB.viewport;

    root.addEventListener("click", function (e) {
      var t = e.target.closest("button, a");
      if (!t || !root.contains(t)) return;
      if (t.hasAttribute("data-lb-prev")) go(-1);
      else if (t.hasAttribute("data-lb-next")) go(1);
      else if (t.hasAttribute("data-lb-zoom")) setZoom(!LB.zoom.on);
      else if (t.hasAttribute("data-lb-play")) setPlaying(!LB.playing);
      else if (t.hasAttribute("data-lb-copy")) {
        var it = LB.list[LB.index];
        PKB.copy(window.location.origin + window.location.pathname + window.location.search + "#" + it.id, "Povezava do fotografije je kopirana.");
      } else if (t.hasAttribute("data-lb-goto")) {
        var k = Number(t.getAttribute("data-lb-goto"));
        if (k !== LB.index) show(k, k > LB.index ? 1 : -1);
      } else if (t.hasAttribute("data-lb-download")) {
        PKB.toast({ type: "success", message: "Prenos fotografije se je začel." });
      }
    });

    dlg.addEventListener("keydown", function (e) {
      if (!LB || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var k = e.key;
      if (k === "ArrowRight" || k === "ArrowLeft") {
        e.preventDefault();
        go(k === "ArrowRight" ? 1 : -1);
      } else if (k === "Home" || k === "End") {
        e.preventDefault();
        var target = k === "Home" ? 0 : LB.list.length - 1;
        if (target !== LB.index) show(target, k === "Home" ? -1 : 1);
      } else if (k === "Escape" && LB.zoom.on) {
        e.preventDefault();
        e.stopPropagation();
        setZoom(false);
      } else if (k === "+" || k === "=") {
        e.preventDefault(); setZoom(true);
      } else if (k === "-" || k === "_") {
        e.preventDefault(); setZoom(false);
      }
    });

    // hover-hold for the slideshow: only after the mouse really moves over the stage (a dialog that opens
    // under a resting cursor fires synthetic enter events, which must not pause a slideshow just started)
    LB.stage.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || LB.hover) return;
      var o = LB.hoverOrigin;
      if (!o) { LB.hoverOrigin = { x: e.clientX, y: e.clientY }; return; }
      if (Math.abs(e.clientX - o.x) + Math.abs(e.clientY - o.y) > 6) LB.hover = true;
    });
    LB.stage.addEventListener("pointerleave", function (e) {
      if (e.pointerType === "mouse") { LB.hover = false; LB.hoverOrigin = null; }
    });

    vp.addEventListener("pointerdown", function (e) {
      if (!LB || !LB.frame || (e.pointerType === "mouse" && e.button !== 0)) return;
      if (LB.ptr) return;
      LB.ptr = {
        id: e.pointerId, type: e.pointerType, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, t0: performance.now(), moved: false,
        mode: LB.zoom.on ? "pan" : (e.pointerType === "mouse" ? "click" : "swipe"), tx0: LB.zoom.x, ty0: LB.zoom.y,
        onFrame: !!(e.target.closest && e.target.closest(".gal-lb__frame"))
      };
      try { vp.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (LB.ptr.mode === "pan") root.classList.add("is-panning");
      if (e.pointerType === "mouse") e.preventDefault();
    });
    vp.addEventListener("pointermove", function (e) {
      var p = LB && LB.ptr;
      if (!p || p.id !== e.pointerId) return;
      p.dx = e.clientX - p.x0;
      p.dy = e.clientY - p.y0;
      if (!p.moved && Math.abs(p.dx) + Math.abs(p.dy) > 6) p.moved = true;
      if (!p.moved) return;
      if (p.mode === "pan") {
        LB.zoom.x = p.tx0 + p.dx;
        LB.zoom.y = p.ty0 + p.dy;
        clampPan();
        applyZoom(false);
      } else if (p.mode === "swipe" && LB.list.length > 1 && Math.abs(p.dx) > Math.abs(p.dy)) {
        LB.frame.classList.add("is-dragging");
        LB.frame.style.transform = "translate3d(" + p.dx + "px, 0, 0)";
        LB.frame.style.opacity = String(Math.max(0.35, 1 - Math.abs(p.dx) / 600));
      }
    });
    var endPtr = function (e, cancelled) {
      var p = LB && LB.ptr;
      if (!p || p.id !== e.pointerId) return;
      LB.ptr = null;
      root.classList.remove("is-panning");
      var dt = performance.now() - p.t0;
      if (p.mode === "swipe") {
        var f = LB.frame;
        var fast = Math.abs(p.dx) > 24 && Math.abs(p.dx) / Math.max(dt, 1) > 0.45;
        if (!cancelled && p.moved && Math.abs(p.dx) > Math.abs(p.dy) && (Math.abs(p.dx) > 60 || fast) && LB.list.length > 1) {
          go(p.dx < 0 ? 1 : -1);
        } else if (f) {
          f.classList.remove("is-dragging");
          f.style.transform = "";
          f.style.opacity = "";
          if (!cancelled && !p.moved) doubleTap(e, p);
        }
      } else if (p.mode === "click") {
        if (!cancelled && !p.moved && p.onFrame) setZoom(true, { x: e.clientX, y: e.clientY });
      } else if (p.mode === "pan") {
        if (!cancelled && !p.moved) {
          if (p.type === "mouse") setZoom(false);
          else doubleTap(e, p);
        }
      }
    };
    vp.addEventListener("pointerup", function (e) { endPtr(e, false); });
    vp.addEventListener("pointercancel", function (e) { endPtr(e, true); });
    vp.addEventListener("dragstart", function (e) { e.preventDefault(); });

    function doubleTap(e, p) {
      var now = performance.now();
      var lt = LB.lastTap;
      if (lt && now - lt.t < 320 && Math.abs(e.clientX - lt.x) < 30 && Math.abs(e.clientY - lt.y) < 30) {
        LB.lastTap = null;
        if (LB.zoom.on) setZoom(false);
        else if (p.onFrame) setZoom(true, { x: e.clientX, y: e.clientY });
      } else {
        LB.lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
    }

    LB.onResize = PKB.debounce(function () { if (LB && LB.zoom.on) { clampPan(); applyZoom(false); } }, 120);
    window.addEventListener("resize", LB.onResize);
  }

  function onLightboxClosed() {
    if (!LB) return;
    var st = LB;
    LB = null;
    cancelAnimationFrame(st.raf);
    window.removeEventListener("resize", st.onResize);
    var it = st.list[st.index];
    if (history.replaceState && /^#./.test(window.location.hash) && byId[window.location.hash.slice(1)]) {
      history.replaceState(history.state, "", window.location.pathname + window.location.search + (st.prevHash || ""));
    }
    // keep the visitor's place: focus the photo they ended on (if it is in the grid), else the opener
    var n = it && nodes[it.id];
    var opener = st.opener;
    var openerGone = !opener || opener === doc.body || !opener.isConnected;
    if (n && n.shown && (st.openerIsCard || openerGone)) {
      n.card.focus({ preventScroll: true });
      var r = n.li.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight) n.li.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }

  function closeLightbox() { if (LB) LB.m.close(); }

  /* ------------------------------------------------------------------
     Hash deep links: galerija.html#g5
     ------------------------------------------------------------------ */
  function handleHash(initial) {
    var raw = window.location.hash.slice(1);
    try { raw = decodeURIComponent(raw); } catch (e) { /* keep raw */ }
    if (raw && byId[raw]) {
      var n = nodes[raw];
      if (initial && n && n.shown) n.li.scrollIntoView({ block: "center", behavior: "instant" });
      openLightbox(raw, {});
      return;
    }
    if (LB) closeLightbox();
    if (raw && /^g\d+$/i.test(raw)) {
      if (history.replaceState) history.replaceState(history.state, "", window.location.pathname + window.location.search + "#fotografije");
      if (el.section) el.section.scrollIntoView({ block: "start", behavior: initial ? "instant" : smooth() });
      PKB.toast({ type: "info", title: "Fotografije nismo našli", message: "Povezava je morda zastarela. Prikazujemo celotno galerijo." });
    }
  }

  /* ------------------------------------------------------------------
     Wiring
     ------------------------------------------------------------------ */
  function startSlideshow() {
    var list = currentList();
    if (!list.length) list = allSorted();
    if (!list.length) return;
    openLightbox(list[0].id, { play: !reduce(), list: list });
  }

  function syncMotionUI() {
    var rm = reduce();
    if (el.toolPlay) el.toolPlay.hidden = rm;
    if (el.heroPlay) {
      var ico = qs("svg", el.heroPlay);
      if (ico) ico.outerHTML = PKB.icon(rm ? "maximize" : "play");
      if (el.heroPlayLabel) el.heroPlayLabel.textContent = rm ? "Odpri pregledovalnik" : "Predvajaj diaprojekcijo";
    }
  }

  function bind() {
    doc.addEventListener("click", function (e) {
      var o = e.target.closest && e.target.closest("[data-open]");
      if (o && !o.closest(".gal-lb")) { e.preventDefault(); openLightbox(o.getAttribute("data-open"), {}); return; }
      var a = e.target.closest && e.target.closest("[data-album]");
      if (a && el.albums && el.albums.contains(a)) { setAlbum(a.getAttribute("data-album")); return; }
      var s = e.target.closest && e.target.closest("[data-sort]");
      if (s) { setSort(s.getAttribute("data-sort")); return; }
      if (e.target.closest && e.target.closest("[data-album-reset]")) {
        setAlbum("");
        var first = qs('[data-album=""]', el.albums);
        if (first) first.focus();
        return;
      }
      var link = e.target.closest && e.target.closest("[data-album-link]");
      if (link && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
        e.preventDefault();
        setAlbum(link.getAttribute("data-album-link"));
        if (el.section) el.section.scrollIntoView({ block: "start", behavior: smooth() });
        var chip = qs('[data-album="' + CSS.escape(state.album) + '"]', el.albums);
        if (chip) chip.focus({ preventScroll: true });
      }
    });
    if (el.heroPlay) el.heroPlay.addEventListener("click", startSlideshow);
    if (el.toolPlay) el.toolPlay.addEventListener("click", startSlideshow);

    // roving arrows inside the album chip group
    if (el.albums) el.albums.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var chips = qsa("[data-album]", el.albums);
      var i = chips.indexOf(doc.activeElement);
      if (i < 0) return;
      e.preventDefault();
      chips[(i + (e.key === "ArrowRight" ? 1 : -1) + chips.length) % chips.length].focus();
    });

    window.addEventListener("hashchange", function () { handleHash(false); });
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      var onMq = function () { syncMotionUI(); if (LB && reduce()) { setPlaying(false); LB.playBtn.hidden = true; } };
      if (mq.addEventListener) mq.addEventListener("change", onMq);
    }
  }

  function boot() {
    renderFeature();
    renderStats();
    renderAlbumChips();

    var param = PKB.params().get("album");
    var mt = matchAlbum(param);
    state.album = mt.album;
    if (!mt.ok) {
      PKB.toast({ type: "info", title: "Albuma ni mogoče najti", message: "Album »" + String(param).slice(0, 40) + "« ne obstaja. Prikazujemo vse fotografije." });
    }

    buildGrid();
    setupReveal();
    relayout(false);
    syncControls();
    syncUrl();
    syncMotionUI();
    observeResize();
    bind();
    // fonts/scrollbar can change the grid width right after load
    window.addEventListener("load", function () { if (el.grid.clientWidth !== lastWidth) place(currentList()); });
    handleHash(true);

    PKB.galerija = {
      state: function () { return { album: state.album, sort: state.sort, open: !!LB, index: LB ? LB.index : -1, id: LB ? LB.list[LB.index].id : null, zoom: LB ? LB.zoom.on : false, playing: LB ? LB.playing : false, total: LB ? LB.list.length : 0 }; },
      open: function (id, opts) { return openLightbox(String(id), opts || {}); },
      close: closeLightbox,
      setAlbum: function (a) { setAlbum(matchAlbum(a).album); }
    };
  }

  try { boot(); }
  catch (err) {
    if (window.console && console.error) console.error("galerija:", err);
  }
})();
