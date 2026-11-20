/* ==========================================================================
   404 (404.html) — page script. Prefix: nf-
   - shows the requested path and a "did you mean …?" suggestion (edit distance)
   - search button opens the site palette (pre-filled with the best guess)
   - "Nazaj" = history.back() with a fallback to index.html
   - playful dive timer
   ========================================================================== */
(function () {
  "use strict";

  var PKB = window.PKB;
  if (!PKB) return;
  var main = PKB.qs("main.nf");
  if (!main) return;
  var qs = PKB.qs;

  /* ---------- requested path ---------- */
  var path = "";
  try { path = decodeURI(window.location.pathname); } catch (e) { path = window.location.pathname; }
  var isDirect = /\/404(\.html)?$/i.test(path);
  var pathEl = qs("[data-nf-path]");
  if (pathEl && !isDirect && path && path !== "/") {
    var shown = path + window.location.search;
    qs("[data-nf-path-text]", pathEl).textContent = shown.length > 90 ? shown.slice(0, 87) + "…" : shown;
    pathEl.hidden = false;
  }

  /* ---------- did you mean …? ---------- */
  var CANDIDATES = (PKB.nav || []).map(function (n) { return { label: n.label, href: n.href, keys: [n.id, PKB.slugify(n.label), n.href.replace(/\.html$/, "")] }; });
  CANDIDATES.push({ label: "Zasebnost", href: "zasebnost.html", keys: ["zasebnost", "varstvo-podatkov", "gdpr", "piskotki"] });
  var ALIASES = {
    "onas": "o-klubu.html", "o-nas": "o-klubu.html", "klub": "o-klubu.html", "zgodovina": "o-klubu.html", "trenerji": "o-klubu.html",
    "treningi": "urnik.html", "termini": "urnik.html", "rezultati": "tekmovanja.html", "tekme": "tekmovanja.html",
    "slike": "galerija.html", "fotografije": "galerija.html", "prijava": "vpis.html", "vpisnica": "vpis.html",
    "cenik": "programi.html", "skupine": "programi.html", "sola": "programi.html", "plavalna-sola": "programi.html",
    "kontakti": "kontakt.html", "lokacija": "kontakt.html", "home": "index.html", "domov": "index.html", "index": "index.html"
  };
  function lev(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length, prev = [], cur = [], i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  var segment = PKB.slugify(String(path.split("/").filter(Boolean).pop() || "").replace(/\.(html?|php|aspx?)$/i, ""));
  var suggestion = null;
  if (segment && !isDirect && segment !== "404") {
    var byAlias = ALIASES[segment];
    if (byAlias) suggestion = CANDIDATES.filter(function (c) { return c.href === byAlias; })[0] || null;
    if (!suggestion) {
      var best = null;
      CANDIDATES.forEach(function (c) {
        c.keys.forEach(function (k) {
          if (!k) return;
          var d = lev(segment, k);
          var limit = Math.max(1, Math.floor(k.length * 0.34));
          var ok = d <= limit || (segment.length >= 4 && (k.indexOf(segment) === 0 || segment.indexOf(k) === 0));
          if (ok && (!best || d < best.d)) best = { c: c, d: d };
        });
      });
      if (best) suggestion = best.c;
    }
  }
  var sugEl = qs("[data-nf-suggest]");
  if (sugEl && suggestion) {
    var a = qs("[data-nf-suggest-link]", sugEl);
    a.textContent = suggestion.label;
    a.setAttribute("href", suggestion.href);
    sugEl.hidden = false;
  }

  /* ---------- search ---------- */
  var searchBtn = qs("[data-nf-search]");
  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      if (typeof PKB.openSearch !== "function") return;
      PKB.openSearch();
      var guess = suggestion ? suggestion.label : (segment && segment.length >= 3 && segment !== "404" ? segment.replace(/-/g, " ") : "");
      var input = qs(".cmdk__input");
      if (input && guess) {
        input.value = guess;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.select();
      }
    });
  }

  /* ---------- back (history with a safe fallback) ---------- */
  var back = qs("[data-nf-back]");
  if (back) {
    back.addEventListener("click", function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0) return;
      var sameOrigin = false;
      try { sameOrigin = !!document.referrer && new URL(document.referrer).origin === window.location.origin; } catch (err) { sameOrigin = false; }
      if (sameOrigin && window.history.length > 1) {
        e.preventDefault();
        var here = window.location.href;
        window.history.back();
        setTimeout(function () { if (window.location.href === here) window.location.href = back.getAttribute("href") || "index.html"; }, 700);
      }
      // otherwise the link itself goes to index.html
    });
  }

  /* ---------- dive timer ---------- */
  var timer = qs("[data-nf-timer]");
  if (timer) {
    var t0 = Date.now();
    var tick = function () {
      var s = Math.floor((Date.now() - t0) / 1000);
      timer.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    };
    tick();
    setInterval(tick, 1000);
  }
})();
