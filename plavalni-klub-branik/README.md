# Plavalni klub Branik Maribor — website

A multi-page, fully interactive static website for **Plavalni klub Branik Maribor (PK Branik)** with a
"real glass" look: neutral frosted panels floating over full-bleed photography (dark and light themes).
No build step, no frameworks — plain HTML, CSS and vanilla JavaScript.

## Run locally

```bash
cd plavalni-klub-branik
python3 -m http.server 8765
# open http://localhost:8765/
```

Any static host works (GitHub Pages, Netlify, an Apache/Nginx folder). All paths are relative.

## Pages

| File | Page | Highlights |
|---|---|---|
| `index.html` | Domov | dashboard hero, live "today at the pool" tile, countdown, progression stepper |
| `o-klubu.html` | O klubu | timeline, olympians, interactive pool map, coaches with filter + modal |
| `programi.html` | Programi | category filter, program details, group finder quiz, comparison, price list, FAQ search |
| `urnik.html` | Urnik | week / list / day views, filters, live "now" line, .ics export, print |
| `tekmovanja.html` | Tekmovanja | competition calendar, countdown, filterable/sortable results, club records, CSV export |
| `novice.html` | Novice | search, categories, article reader with deep links and sharing |
| `galerija.html` | Galerija | masonry grid, album filter, lightbox with keyboard/swipe/zoom/slideshow |
| `vpis.html` | Vpis | 4-step enrolment form, validation, price summary, autosaved draft |
| `kontakt.html` | Kontakt | contact form, office-hours status, click-to-load map, FAQ |
| `zasebnost.html` | Zasebnost | privacy-policy template |
| `404.html` | 404 | not-found page |
| `styleguide.html` | — | internal component library (noindex) |

Shared on every page: glass header with search palette (**Ctrl/⌘ + K** or **/**), mobile drawer,
dark/light theme toggle (remembered), toasts, back-to-top, scroll reveal, footer with newsletter sign-up.

## Structure

```
assets/css/style.css        design system (tokens, glass, components, both themes)
assets/css/pages/*.css      page-specific styles
assets/js/data.js           ALL content: club info, programs, schedule, news, competitions, results, gallery …
assets/js/site.js           shared runtime (window.PKB): header/footer, theme, search, modal, forms, .ics …
assets/js/pages/*.js        page-specific behaviour
assets/img/photos/          background & content photos (+ CREDITS.md)
```

### Editing content
Almost everything is in **`assets/js/data.js`** — edit it and every page updates (schedule, programs,
prices, news, competitions, results, gallery, FAQ). The background photo of each page is set in
`pagePhotos` (or per page with `<body data-photo="…">`).

## ⚠️ Before publishing — replace the sample content

- **Verified (public sources, 2024/2025 — re-check):** address Koroška cesta 33, 2000 Maribor
  (Kopališče Pristan), phone +386 41 682 016, e-mail info@plavalniklub-branik.si; swim-school groups
  Morske zvezdice / Rakci / Želvice, enrolment from age 4, school runs mid-September to the end of the
  school year; price list from 1 Sep 2024 (55 € / 60 € / 70 €); olympians Matjaž Kozelj (1988, 1992) and
  Metka Sparavec (1996); 50 × 25 m olympic pool at Pristan (2003).
- **Sample content (must be replaced):** coaches, news, competitions, results, club records, most
  training times, enrolment fee and sibling discount, social-media links, office hours.
- **Photos are stock placeholders** from Unsplash/Pexels (see `assets/img/photos/CREDITS.md`) — the
  people shown are not club members. Replace them with the club's own photos (with consent, especially
  for children).
- **Forms have no backend.** Enrolment, contact and newsletter forms validate and show a confirmation,
  then offer a pre-filled e-mail to the club. Connect them to a form service or backend before going live.
- `zasebnost.html` is a template and should be reviewed by the club.

## Browser support
Evergreen browsers (Chrome, Edge, Firefox, Safari 16+). `backdrop-filter` falls back to solid panels where
unsupported; animations respect `prefers-reduced-motion`.
