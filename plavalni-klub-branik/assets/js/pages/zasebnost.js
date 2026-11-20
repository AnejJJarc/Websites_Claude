/* ==========================================================================
   Zasebnost (zasebnost.html) — page script. Prefix: priv-
   - club data from data.js, print button
   - sticky table of contents with scrollspy + reading progress (mobile: collapsible)
   - "on this device": lists pkb:* / pkb-theme entries in local/session storage,
     delete one or all (confirmation via PKB.modal, feedback via PKB.toast)
   ========================================================================== */
(function () {
  "use strict";

  var PKB = window.PKB;
  if (!PKB) return;
  var main = PKB.qs("main.priv");
  if (!main) return;

  var C = (PKB.data || {}).club || {};
  var qs = PKB.qs, qsa = PKB.qsa, esc = PKB.escapeHTML;
  var reduced = PKB.prefersReducedMotion;

  /* ------------------------------------------------------------------
     1. Club data + print
     ------------------------------------------------------------------ */
  qsa("[data-club]").forEach(function (el) {
    var k = el.getAttribute("data-club");
    if (C[k]) el.textContent = C[k];
  });
  if (C.email) qsa("[data-club-mailto]").forEach(function (a) { a.setAttribute("href", "mailto:" + C.email); });
  if (C.phoneHref) qsa("[data-club-tel]").forEach(function (a) { a.setAttribute("href", C.phoneHref); });

  qsa("[data-print]").forEach(function (b) {
    b.addEventListener("click", function () {
      // open every section before printing (nothing is collapsed except the mobile TOC, which is hidden in print)
      if (typeof window.print === "function") window.print();
    });
  });

  /* ------------------------------------------------------------------
     2. Storage inventory
     ------------------------------------------------------------------ */
  var GROUP_SETTINGS = "Nastavitve in filtri", GROUP_FORMS = "Osnutki, sporočila in prijave";
  var KNOWN = [
    { re: /^pkb-theme$/, name: "Videz strani (tema)", group: GROUP_SETTINGS },
    { re: /^pkb:kontakt:osnutek$/, name: "Osnutek kontaktnega sporočila", group: GROUP_FORMS },
    { re: /^pkb:kontakt:zadnje$/, name: "Kopija zadnjega sporočila", group: GROUP_FORMS },
    { re: /^pkb:kontakt:zemljevid$/, name: "Samodejni prikaz zemljevida", group: GROUP_SETTINGS },
    { re: /^pkb:vpis/, name: "Osnutek spletnega vpisa", group: GROUP_FORMS },
    { re: /^pkb:newsletter/, name: "Prijava na e-novice", group: GROUP_FORMS },
    { re: /^pkb:urnik/, name: "Filtri in pogled urnika", group: GROUP_SETTINGS },
    { re: /^pkb:programi-izbirnik/, name: "Odgovori v izbirniku skupine", group: GROUP_SETTINGS },
    { re: /^pkb:programi-oprema/, name: "Seznam opreme za trening", group: GROUP_SETTINGS },
    { re: /^pkb:programi/, name: "Nastavitve strani Programi", group: GROUP_SETTINGS },
    { re: /^pkb:home/, name: "Nastavitve domače strani", group: GROUP_SETTINGS },
    { re: /^pkb:tekmovanja/, name: "Filtri tekmovanj in rezultatov", group: GROUP_SETTINGS },
    { re: /^pkb:novice/, name: "Nastavitve strani Novice", group: GROUP_SETTINGS },
    { re: /^pkb:galerija/, name: "Nastavitve galerije", group: GROUP_SETTINGS },
    { re: /^pkb:o-klubu/, name: "Nastavitve strani O klubu", group: GROUP_SETTINGS },
    { re: /^pkb:/, name: "Nastavitev strani", group: GROUP_SETTINGS }
  ];
  function describe(key) {
    for (var i = 0; i < KNOWN.length; i++) if (KNOWN[i].re.test(key)) return KNOWN[i];
    return KNOWN[KNOWN.length - 1];
  }
  var isOurs = function (k) { return typeof k === "string" && (k === "pkb-theme" || k.indexOf("pkb:") === 0); };
  function storageOf(type) { try { return window[type]; } catch (e) { return null; } }

  function listEntries() {
    var out = [];
    [["localStorage", "local"], ["sessionStorage", "session"]].forEach(function (t) {
      var st = storageOf(t[0]);
      if (!st) return;
      try {
        for (var i = 0; i < st.length; i++) {
          var k = st.key(i);
          if (!isOurs(k)) continue;
          var v = st.getItem(k) || "";
          var d = describe(k);
          out.push({ key: k, area: t[1], size: (k.length + v.length) * 2, name: d.name, group: d.group });
        }
      } catch (e) { /* storage blocked */ }
    });
    return out.sort(function (a, b) {
      if (a.key === "pkb-theme") return -1;
      if (b.key === "pkb-theme") return 1;
      return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    });
  }
  function removeEntry(e) {
    var st = storageOf(e.area === "session" ? "sessionStorage" : "localStorage");
    try { if (st) st.removeItem(e.key); } catch (err) { return false; }
    return true;
  }
  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    return PKB.formatNumber(bytes / 1024, 1) + " kB";
  }
  var zapis = function (n) { return PKB.plural(n, ["zapis", "zapisa", "zapisi", "zapisov"]); };
  var zapisAcc = function (n) { return PKB.plural(n, ["zapis", "zapisa", "zapise", "zapisov"]); };

  var liveList = qs("[data-live-list]");
  var liveSummary = qs("[data-live-summary]");
  var devCount = qs("[data-device-count]");
  var devLabel = qs("[data-device-label]");
  var devGroups = qs("[data-device-groups]");

  function render() {
    var entries = listEntries();
    var n = entries.length;
    // hero tile
    if (devCount) devCount.textContent = String(n);
    if (devLabel) devLabel.textContent = PKB.plural(n, ["shranjen zapis", "shranjena zapisa", "shranjeni zapisi", "shranjenih zapisov"]) + " te strani";
    if (devGroups) {
      var groups = {};
      groups[GROUP_SETTINGS] = 0;
      groups[GROUP_FORMS] = 0;
      entries.forEach(function (e) { groups[e.group] = (groups[e.group] || 0) + 1; });
      devGroups.innerHTML = Object.keys(groups).map(function (g) {
        return "<li><span>" + esc(g) + "</span><span>" + groups[g] + "</span></li>";
      }).join("");
    }
    // live panel
    if (!liveList) return;
    if (!n) {
      liveList.innerHTML = "";
      liveSummary.innerHTML = '<span class="priv-live__empty">' + PKB.icon("check-circle", "icon--sm") + "Na tej napravi ni shranjenih podatkov te spletne strani.</span>";
      return;
    }
    var total = entries.reduce(function (s, e) { return s + e.size; }, 0);
    liveSummary.textContent = n + " " + zapis(n) + " · skupaj približno " + fmtSize(total);
    liveList.innerHTML = entries.map(function (e, i) {
      return '<li class="priv-live__item" data-entry="' + i + '">' +
        '<div class="priv-live__main"><span class="priv-live__name">' + esc(e.name) + "</span>" +
        '<span class="priv-live__meta"><code>' + esc(e.key) + "</code> · " + fmtSize(e.size) + (e.area === "session" ? " · do zaprtja zavihka" : "") + "</span></div>" +
        '<button type="button" class="btn btn--icon btn--sm btn--ghost" data-remove="' + esc(e.key) + '" data-area="' + e.area + '" aria-label="Izbriši zapis: ' + esc(e.name) + '" data-tooltip="Izbriši">' + PKB.icon("x") + "</button></li>";
    }).join("");
  }

  if (liveList) {
    liveList.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-remove]");
      if (!b) return;
      var key = b.getAttribute("data-remove"), area = b.getAttribute("data-area");
      var entry = listEntries().filter(function (e) { return e.key === key && e.area === area; })[0];
      if (!entry) { render(); return; }
      var li = b.closest(".priv-live__item");
      var idx = qsa(".priv-live__item", liveList).indexOf(li);
      var done = function () {
        removeEntry(entry);
        render();
        PKB.toast({ type: "success", message: "Zapis »" + entry.name + "« je izbrisan s te naprave." });
        var items = qsa("[data-remove]", liveList);
        var next = items[Math.min(idx, items.length - 1)];
        (next || qs(".priv-live [data-clear-all]") || main).focus();
      };
      if (reduced()) done();
      else { li.classList.add("is-leaving"); setTimeout(done, 280); }
    });
  }

  function clearAll(opener) {
    var entries = listEntries();
    if (!entries.length) {
      PKB.toast({ type: "info", message: "Na tej napravi ni shranjenih podatkov te spletne strani." });
      return;
    }
    var n = entries.length;
    var m = PKB.modal.open({
      title: "Izbrišem shranjene podatke?",
      size: "sm",
      className: "priv-modal",
      initialFocus: ".modal__foot [data-modal-close]",
      content: '<p class="muted">Iz brskalnika na tej napravi bomo izbrisali ' + n + " " + zapisAcc(n) + " te spletne strani. Podatki, ki ste jih klubu že poslali, s tem niso izbrisani — za to nam pišite.</p>" +
        '<ul class="priv-modal-list" role="list">' + entries.map(function (e) {
          return "<li><span>" + esc(e.name) + "</span><span>" + fmtSize(e.size) + "</span></li>";
        }).join("") + "</ul>",
      footer: '<button type="button" class="btn btn--ghost" data-modal-close>Prekliči</button>' +
        '<button type="button" class="btn btn--danger" data-confirm-clear>' + PKB.icon("x") + "Izbriši podatke</button>"
    });
    qs("[data-confirm-clear]", m.dialog).addEventListener("click", function () {
      var removed = 0;
      listEntries().forEach(function (e) { if (removeEntry(e)) removed++; });
      m.close();
      render();
      PKB.toast({
        type: "success", title: "Shranjeni podatki so izbrisani",
        message: "Izbrisali smo " + removed + " " + zapisAcc(removed) + " s te naprave. Videz strani bo ob naslednjem obisku sledil nastavitvi vaše naprave.",
        timeout: 7000
      });
      if (opener && opener.focus) setTimeout(function () { opener.focus(); }, 260);
    });
  }
  qsa("[data-clear-all]").forEach(function (b) { b.addEventListener("click", function () { clearAll(b); }); });
  window.addEventListener("storage", function () { render(); });
  document.addEventListener("pkb:themechange", function () { setTimeout(render, 0); });
  render();

  /* ------------------------------------------------------------------
     3. Table of contents: scrollspy, progress, mobile toggle
     ------------------------------------------------------------------ */
  var toc = qs("[data-toc]");
  if (!toc) return;
  var links = qsa("[data-toc-list] a", toc);
  var sections = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
  var article = qs("[data-article]");
  var progress = qs("[data-toc-progress]", toc);
  var currentLabel = qs("[data-toc-current]", toc);
  var toggle = qs("[data-toc-toggle]", toc);
  var toggleLabel = qs("[data-toc-toggle-label]", toc);
  var activeIdx = -1;

  function setActive(i) {
    if (i === activeIdx) return;
    activeIdx = i;
    links.forEach(function (a, j) {
      if (j === i) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    if (currentLabel) {
      var a = links[i];
      currentLabel.textContent = a ? (i + 1) + " / " + links.length + " · " + qs("span:last-child", a).textContent : "";
    }
  }
  function spy() {
    var line = Math.min(window.innerHeight * 0.32, 260);
    var idx = 0;
    sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= line) idx = i; });
    var docEl = document.documentElement;
    if (window.scrollY + window.innerHeight >= docEl.scrollHeight - 4) {
      // at the very bottom: the last section whose heading is visible
      for (var j = sections.length - 1; j >= 0; j--) { if (sections[j] && sections[j].getBoundingClientRect().top < window.innerHeight) { idx = j; break; } }
    }
    setActive(idx);
    if (article && progress) {
      var r = article.getBoundingClientRect();
      var p = (line - r.top) / Math.max(1, r.height - window.innerHeight * 0.5);
      progress.style.setProperty("--p", Math.round(Math.max(0, Math.min(1, p)) * 100) + "%");
    }
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; spy(); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", PKB.debounce(spy, 120));

  function setOpen(open) {
    toc.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggleLabel.textContent = open ? "Skrij" : "Prikaži";
  }
  toggle.addEventListener("click", function () { setOpen(!toc.classList.contains("is-open")); });
  var mqDesktop = window.matchMedia ? window.matchMedia("(min-width: 1024px)") : { matches: true };

  links.forEach(function (a, i) {
    a.addEventListener("click", function () {
      setActive(i);
      if (!mqDesktop.matches) setOpen(false);
      var h = sections[i] && qs("h2", sections[i]);
      if (h) {
        h.setAttribute("tabindex", "-1");
        setTimeout(function () { h.focus({ preventScroll: true }); }, reduced() ? 0 : 450);
      }
    });
  });
  var topLink = qs("[data-toc-top]", toc);
  if (topLink) {
    topLink.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
      var t = qs("#main");
      if (t) { t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); }
    });
  }
  spy();
})();
