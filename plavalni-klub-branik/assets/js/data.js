/* ==========================================================================
   PK Branik Maribor – shared site data (single source of truth)
   --------------------------------------------------------------------------
   Preverjeno iz javnih virov (stanje 2024/2025 – pred objavo ponovno preveri):
     - naslov Koroška cesta 33, 2000 Maribor (Kopališče Pristan), tel. +386 41 682 016,
       e-pošta info@plavalniklub-branik.si
     - uradno ime »Plavalni klub Branik Vitaminklinik Maribor« (PK Branik Vitaminklinik)
     - skupine plavalne šole Morske zvezdice, Rakci, Želvice (opisi s klubske strani);
       cenik 2024 navaja še skupine Tjulnji, Delfini, Prehodna; vpis od 4. leta;
       šola poteka od sredine septembra do konca šolskega leta
     - cenik od 1. 9. 2024: Zvezdice 55 €, Rakci 60 €, ostale skupine 70 € / mesec (prvi otrok)
     - olimpijca kluba: Matjaž Kozelj (OI 1988, 1992; rojen v Mariboru), Metka Sparavec (OI 1996;
       bron na 50 m hrbtno na EP 1999 po Wikipediji – preveri)
     - olimpijski bazen 50 × 25 m na Pristanu (2003)
   VSE OSTALO (trenerji, novice, rezultati, rekordi, tekme, točni termini) so
   VZORČNI PODATKI za prikaz delovanja strani in jih je treba zamenjati.
   Fotografije so začasne (Unsplash/Pexels) – glej assets/img/photos/CREDITS.md.
   ========================================================================== */
window.PKB_DATA = {
  /* Fotografija v ozadju posamezne strani (body[data-photo] jo lahko prepiše) */
  pagePhotos: {
    "domov": "assets/img/photos/pod-vodo.jpg",
    "o-klubu": "assets/img/photos/bazen-mirno.jpg",
    "programi": "assets/img/photos/kravl-proga.jpg",
    "urnik": "assets/img/photos/proga-vrv.jpg",
    "tekmovanja": "assets/img/photos/tekma-proge.jpg",
    "novice": "assets/img/photos/pod-vodo.jpg",
    "galerija": "assets/img/photos/delfin-plavalka.jpg",
    "vpis": "assets/img/photos/start-tekma.jpg",
    "kontakt": "assets/img/photos/odprte-vode.jpg",
    "zasebnost": "assets/img/photos/pod-vodo.jpg",
    "404": "assets/img/photos/globina.jpg",
    "default": "assets/img/photos/pod-vodo.jpg"
  },

  club: {
    name: "Plavalni klub Branik Maribor",
    short: "PK Branik",
    official: "Plavalni klub Branik Vitaminklinik Maribor",
    tagline: "Plavamo z Mariborom.",
    venue: "Kopališče Pristan",
    address: "Koroška cesta 33",
    postal: "2000 Maribor",
    country: "Slovenija",
    phone: "+386 41 682 016",
    phoneHref: "tel:+38641682016",
    email: "info@plavalniklub-branik.si",
    season: "2026/2027",
    // TODO: zamenjaj z dejanskimi povezavami do profilov kluba
    social: {
      facebook: "https://www.facebook.com/",
      instagram: "https://www.instagram.com/",
      youtube: "https://www.youtube.com/"
    },
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Kopali%C5%A1%C4%8De%20Pristan%2C%20Koro%C5%A1ka%20cesta%2033%2C%202000%20Maribor",
    mapEmbed: "https://maps.google.com/maps?q=Kopali%C5%A1%C4%8De%20Pristan%2C%20Koro%C5%A1ka%20cesta%2033%2C%20Maribor&z=16&output=embed",
    officeHours: [
      { days: "Ponedeljek–petek", hours: "16:00–19:00", note: "pisarna na Pristanu" },
      { days: "Sobota", hours: "po dogovoru", note: "" },
      { days: "Nedelja in prazniki", hours: "zaprto", note: "" }
    ]
  },

  /* Hitri podatki za domačo stran */
  stats: [
    { value: 2, suffix: "", label: "olimpijca v zgodovini kluba", icon: "medal" },
    { value: 50, suffix: " m", label: "olimpijski bazen na Pristanu", icon: "waves" },
    { value: 6, suffix: "", label: "skupin plavalne šole", icon: "users" },
    { value: 4, suffix: " leta", label: "najnižja starost za vpis v plavalno šolo", icon: "smile" }
  ],

  /* Kategorije programov */
  programCategories: [
    { id: "sola", name: "Plavalna šola", short: "Šola", icon: "smile", desc: "Od prvega stika z vodo do vseh štirih tehnik." },
    { id: "tekmovalno", name: "Tekmovalno plavanje", short: "Tekmovalno", icon: "trophy", desc: "Sistematičen trening in nastopi na tekmah Plavalne zveze Slovenije." },
    { id: "odrasli", name: "Odrasli in rekreacija", short: "Odrasli", icon: "heart", desc: "Tečaj plavanja in vodena rekreacija za odrasle." }
  ],

  /* Programi / skupine. price: mesečna članarina v € (null = po ceniku sekcije / na povpraševanje) */
  programs: [
    {
      id: "zvezdice", name: "Morske zvezdice", category: "sola", icon: "sparkles", color: "#9fd0e3",
      ages: "od 4 let", minAge: 4, maxAge: 6, level: "Privajanje na vodo", skill: 0,
      perWeek: 1, duration: 60, pool: "Mali bazen", price: 55,
      image: "assets/img/photos/sola-lebdenje-sm.jpg",
      summary: "Prvi koraki v vodi – skozi igro do sproščenosti in varnosti.",
      desc: "Skupina za najmlajše, ki se z vodo šele spoznavajo. Vadba poteka v malem bazenu, kjer otroci stojijo na dnu, zato je okolje varno in prijazno. Skozi igro izgubijo strah, se naučijo potapljati obraz, izdihovati v vodo in drseti.",
      goals: ["Sproščenost in občutek varnosti v vodi", "Potapljanje obraza in izdihovanje v vodo", "Drsenje na prsih in hrbtu s pripomočki", "Priprava na prehod v skupino Rakci"],
      requirements: "Brez predznanja. Otrok mora biti star vsaj 4 leta."
    },
    {
      id: "rakci", name: "Rakci", category: "sola", icon: "droplet", color: "#a9c4e6",
      ages: "od 4,5 leta", minAge: 4.5, maxAge: 7, level: "Osnove plavanja", skill: 1,
      perWeek: 2, duration: 60, pool: "Mali bazen", price: 60,
      image: "assets/img/photos/sola-ucenje-sm.jpg",
      summary: "Za neplavalce: vodna odpornost, potapljanje in prvi zavesljaji kravla.",
      desc: "Skupina za otroke, ki še ne znajo plavati. Utrjujemo vodno odpornost, potapljanje obraza in pravilno dihanje ter naredimo prve zavesljaje kravla. Cilj skupine je samostojno preplavati krajšo razdaljo.",
      goals: ["Samostojno potapljanje in pobiranje predmetov z dna", "Pravilno dihanje – izdih v vodo", "Prvi zavesljaji kravla in noge kravla z desko", "Samostojno preplavana krajša razdalja"],
      requirements: "Neplavalci, starejši od 4,5 leta."
    },
    {
      id: "zelvice", name: "Želvice", category: "sola", icon: "waves", color: "#a8d0c0",
      ages: "6–9 let", minAge: 6, maxAge: 9, level: "Osnove treh tehnik", skill: 2,
      perWeek: 3, duration: 75, pool: "25 m bazen", price: 70,
      image: "assets/img/photos/sola-otroci-sm.jpg",
      summary: "Kravl, hrbtno in prsno plavanje z usklajenim dihanjem.",
      desc: "Za otroke, ki so osvojili znanje skupine Rakci. Skozi vaje spoznajo osnove kravla, hrbtnega in prsnega plavanja ter jih povežejo z usklajenim dihanjem. Plavamo v 25-metrskem bazenu.",
      goals: ["Osnove kravla, hrbtne in prsne tehnike", "Usklajeno dihanje pri kravlu", "Preplavanih 25 m v eni tehniki brez postanka", "Skoki na noge in na glavo z roba bazena"],
      requirements: "Opravljene zahteve skupine Rakci ali samostojno plavanje vsaj 10 m."
    },
    {
      id: "tjulnji", name: "Tjulnji", category: "sola", icon: "activity", color: "#b7c2e4",
      ages: "7–10 let", minAge: 7, maxAge: 10, level: "Nadaljevalna šola", skill: 3,
      perWeek: 3, duration: 75, pool: "25 m bazen", price: 70,
      image: "assets/img/photos/sola-plavanje-sm.jpg",
      summary: "Izpopolnjevanje tehnik, prvi delfinovi zavesljaji, starti in obrati.",
      desc: "Nadaljevalna skupina, v kateri izpopolnjujemo kravl, hrbtno in prsno tehniko ter spoznamo osnove delfinove tehnike. Učimo se startov, obratov in plavanja daljših razdalj.",
      goals: ["Tehnično pravilne tri tehnike", "Osnove delfinove tehnike", "Start z roba bazena in osnovni obrati", "Neprekinjeno plavanje 100 m"],
      requirements: "Opravljene zahteve skupine Želvice."
    },
    {
      id: "delfini", name: "Delfini", category: "sola", icon: "zap", color: "#c6b9df",
      ages: "8–12 let", minAge: 8, maxAge: 12, level: "Nadaljevalna šola+", skill: 4,
      perWeek: 3, duration: 90, pool: "25 m bazen", price: 70,
      image: "assets/img/photos/delfin-plavalka-sm.jpg",
      summary: "Vse štiri tehnike, vzdržljivost in prvi interni mitingi.",
      desc: "Skupina za otroke, ki obvladajo vse tri osnovne tehnike in želijo napredovati. Poudarek je na delfinovi tehniki, mešanem plavanju, obratih in vzdržljivosti. Otroci prvič nastopijo na internih mitingih.",
      goals: ["Vse štiri tehnike in mešano plavanje", "Kolebni obrat pri kravlu", "Start s startnega bloka", "Nastop na internem mitingu"],
      requirements: "Opravljene zahteve skupine Tjulnji ali ocena trenerja."
    },
    {
      id: "prehodna", name: "Prehodna skupina", category: "sola", icon: "target", color: "#d8c8a6",
      ages: "9–13 let", minAge: 9, maxAge: 13, level: "Pred tekmovalnim plavanjem", skill: 5,
      perWeek: 4, duration: 90, pool: "50 m bazen", price: 70,
      image: "assets/img/photos/kravl-proga-sm.jpg",
      summary: "Most med plavalno šolo in tekmovalnim plavanjem.",
      desc: "Skupina za otroke, ki razmišljajo o tekmovalnem plavanju. Več treningov na teden, osnovna kondicijska priprava na suhem in prvi nastopi na uradnih mitingih. Trenerji spremljajo napredek in svetujejo pri prehodu v tekmovalno skupino.",
      goals: ["Trening po načrtu z intervali", "Kondicijska vadba na suhem", "Prvi uradni nastopi na mitingih", "Priprava na tekmovalno skupino"],
      requirements: "Opravljene zahteve skupine Delfini ali preizkus pri trenerju."
    },
    {
      id: "mlajsi", name: "Mlajši dečki in deklice", category: "tekmovalno", icon: "flag", color: "#e3b6ad",
      ages: "do 12 let", minAge: 9, maxAge: 12, level: "Tekmovalna skupina", skill: 6,
      perWeek: 5, duration: 90, pool: "50 m bazen", price: null,
      image: "assets/img/photos/start-tekma-sm.jpg",
      summary: "Prva tekmovalna kategorija: raznovrstna tehnična in aerobna osnova.",
      desc: "Tekmovalna skupina za najmlajše kategorije Plavalne zveze Slovenije. Gradimo široko tehnično osnovo v vseh štirih tehnikah, aerobno vzdržljivost in veselje do tekmovanja. Nastopamo na mitingih in državnih prvenstvih mlajših kategorij.",
      goals: ["Vsestranska tehnična osnova", "Aerobna vzdržljivost", "Nastopi na mitingih in DP mlajših kategorij", "Navade zdravega športnika"],
      requirements: "Uvrstitev na podlagi preizkusa ali napredovanja iz Prehodne skupine."
    },
    {
      id: "starejsi", name: "Starejši dečki in deklice", category: "tekmovalno", icon: "timer", color: "#e6c39c",
      ages: "12–14 let", minAge: 12, maxAge: 15, level: "Tekmovalna skupina", skill: 7,
      perWeek: 8, duration: 120, pool: "50 m bazen", price: null,
      image: "assets/img/photos/start-hrbtno-sm.jpg",
      summary: "Več vode, jutranji treningi in specializacija po disciplinah.",
      desc: "Skupina z večjim obsegom treninga, jutranjimi termini in sistematično kondicijsko pripravo. Plavalci začnejo s specializacijo po tehnikah in razdaljah ter ciljajo na norme za državna prvenstva.",
      goals: ["Norme za državna prvenstva", "Specializacija po tehnikah", "Sistematična vadba na suhem", "Načrtovanje sezone s trenerjem"],
      requirements: "Napredovanje iz skupine mlajših dečkov in deklic."
    },
    {
      id: "kadeti", name: "Kadeti, mladinci in člani", category: "tekmovalno", icon: "trophy", color: "#e3cf8c",
      ages: "15+ let", minAge: 15, maxAge: 99, level: "Vrhunska skupina", skill: 8,
      perWeek: 9, duration: 120, pool: "50 m bazen", price: null,
      image: "assets/img/photos/tekma-delfin-sm.jpg",
      summary: "Najvišja tekmovalna raven – državna in mednarodna tekmovanja.",
      desc: "Program za najstarejše tekmovalne kategorije: do devet treningov v vodi na teden, kondicijski trening, priprave in nastopi na državnih ter mednarodnih tekmovanjih. Plavalci trenirajo po individualnih načrtih.",
      goals: ["Individualni letni načrt treninga", "Nastopi na DP in mednarodnih mitingih", "Kondicijski in preventivni program", "Priprave doma in v tujini"],
      requirements: "Napredovanje iz mlajših tekmovalnih skupin ali dogovor s trenerjem."
    },
    {
      id: "odrasli", name: "Plavanje za odrasle", category: "odrasli", icon: "heart", color: "#b2d3bf",
      ages: "18+ let", minAge: 18, maxAge: 99, level: "Tečaj in rekreacija", skill: 0,
      perWeek: 2, duration: 60, pool: "25 m bazen", price: null,
      image: "assets/img/photos/odrasli-rekreacija-sm.jpg",
      summary: "Tečaj za začetnike in vodena rekreacija za izboljšanje tehnike.",
      desc: "Nikoli ni prepozno! Tečaj za odrasle, ki se želijo naučiti plavati, in vodena vadba za rekreativce, ki želijo izboljšati tehniko kravla ter vzdržljivost. Vadba poteka v manjših skupinah z individualnim pristopom.",
      goals: ["Premagovanje strahu pred vodo", "Tehnika kravla in pravilno dihanje", "Vzdržljivost in boljše počutje", "Priprava na triatlon ali plavanje na odprtih vodah"],
      requirements: "Brez starostne omejitve navzgor. Za tečaj predznanje ni potrebno."
    }
  ],

  /* Cenik (vir za Zvezdice/Rakce/ostale: cenik kluba, velja od 1. 9. 2024) */
  pricing: {
    validFrom: "2024-09-01",
    enrollmentFee: 25,          // TODO: preveri vpisnino v veljavnem ceniku
    siblingDiscount: 0.1,       // TODO: preveri popust za drugega otroka
    note: "Mesečna članarina za prvega otroka. Tekmovalne skupine in odrasli plačujejo po ceniku sekcije – pišite nam.",
    paymentNote: "Članarina se poravna mesečno do 15. v mesecu na TRR kluba.",
    sectionNote: "Tekmovalne skupine in odrasli plačujejo po ceniku sekcije – pišite nam."
  },

  /* Lokacije vadbe na Kopališču Pristan */
  pools: [
    { id: "mali", name: "Mali bazen", desc: "Plitvi učni bazen, v katerem otroci stojijo na dnu." },
    { id: "25", name: "25 m bazen", desc: "Pokriti 25-metrski bazen za plavalno šolo in rekreacijo." },
    { id: "50", name: "50 m bazen", desc: "Olimpijski bazen 50 × 25 m, zgrajen leta 2003." },
    { id: "suho", name: "Suha vadba", desc: "Kondicijska vadba v telovadnici ob bazenu." }
  ],

  /* Tedenski urnik – day: 1 = ponedeljek … 7 = nedelja.
     Zvezdice (pet 16:15–17:15), Rakci (pon, sre) in Želvice (pon/sre 18:00–19:15, pet 17:00–18:15)
     so povzeti po klubski strani; ostali termini so vzorčni. */
  schedule: [
    { program: "zvezdice", day: 5, start: "16:15", end: "17:15", pool: "Mali bazen" },

    { program: "rakci", day: 1, start: "17:00", end: "18:00", pool: "Mali bazen" },
    { program: "rakci", day: 3, start: "17:00", end: "18:00", pool: "Mali bazen" },

    { program: "zelvice", day: 1, start: "18:00", end: "19:15", pool: "25 m bazen" },
    { program: "zelvice", day: 3, start: "18:00", end: "19:15", pool: "25 m bazen" },
    { program: "zelvice", day: 5, start: "17:00", end: "18:15", pool: "25 m bazen" },

    { program: "tjulnji", day: 2, start: "17:00", end: "18:15", pool: "25 m bazen" },
    { program: "tjulnji", day: 4, start: "17:00", end: "18:15", pool: "25 m bazen" },
    { program: "tjulnji", day: 5, start: "18:15", end: "19:30", pool: "25 m bazen" },

    { program: "delfini", day: 1, start: "16:30", end: "18:00", pool: "25 m bazen" },
    { program: "delfini", day: 3, start: "16:30", end: "18:00", pool: "25 m bazen" },
    { program: "delfini", day: 5, start: "15:30", end: "17:00", pool: "25 m bazen" },

    { program: "prehodna", day: 2, start: "15:30", end: "17:00", pool: "50 m bazen" },
    { program: "prehodna", day: 4, start: "15:30", end: "17:00", pool: "50 m bazen" },
    { program: "prehodna", day: 5, start: "15:00", end: "16:30", pool: "50 m bazen" },
    { program: "prehodna", day: 6, start: "09:00", end: "10:30", pool: "50 m bazen" },

    { program: "mlajsi", day: 1, start: "15:00", end: "16:30", pool: "50 m bazen" },
    { program: "mlajsi", day: 2, start: "15:00", end: "16:30", pool: "50 m bazen" },
    { program: "mlajsi", day: 3, start: "15:00", end: "16:30", pool: "50 m bazen" },
    { program: "mlajsi", day: 4, start: "15:00", end: "16:30", pool: "50 m bazen" },
    { program: "mlajsi", day: 6, start: "08:00", end: "09:30", pool: "50 m bazen" },

    { program: "starejsi", day: 1, start: "06:00", end: "07:15", pool: "50 m bazen" },
    { program: "starejsi", day: 1, start: "16:30", end: "18:30", pool: "50 m bazen" },
    { program: "starejsi", day: 2, start: "16:30", end: "18:30", pool: "50 m bazen" },
    { program: "starejsi", day: 3, start: "06:00", end: "07:15", pool: "50 m bazen" },
    { program: "starejsi", day: 3, start: "16:30", end: "18:30", pool: "50 m bazen" },
    { program: "starejsi", day: 4, start: "16:30", end: "18:30", pool: "50 m bazen" },
    { program: "starejsi", day: 5, start: "16:30", end: "18:30", pool: "50 m bazen" },
    { program: "starejsi", day: 6, start: "09:30", end: "11:30", pool: "50 m bazen" },

    { program: "kadeti", day: 1, start: "05:45", end: "07:30", pool: "50 m bazen" },
    { program: "kadeti", day: 1, start: "18:30", end: "20:30", pool: "50 m bazen" },
    { program: "kadeti", day: 2, start: "05:45", end: "07:30", pool: "50 m bazen" },
    { program: "kadeti", day: 2, start: "17:30", end: "18:30", pool: "Suha vadba" },
    { program: "kadeti", day: 2, start: "18:30", end: "20:30", pool: "50 m bazen" },
    { program: "kadeti", day: 3, start: "18:30", end: "20:30", pool: "50 m bazen" },
    { program: "kadeti", day: 4, start: "05:45", end: "07:30", pool: "50 m bazen" },
    { program: "kadeti", day: 4, start: "17:30", end: "18:30", pool: "Suha vadba" },
    { program: "kadeti", day: 4, start: "18:30", end: "20:30", pool: "50 m bazen" },
    { program: "kadeti", day: 5, start: "18:30", end: "20:30", pool: "50 m bazen" },
    { program: "kadeti", day: 6, start: "07:30", end: "09:30", pool: "50 m bazen" },

    { program: "odrasli", day: 2, start: "20:00", end: "21:00", pool: "25 m bazen" },
    { program: "odrasli", day: 4, start: "20:00", end: "21:00", pool: "25 m bazen" }
  ],

  days: ["Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota", "Nedelja"],
  daysShort: ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"],

  /* VZORČNI podatki – trenerska ekipa */
  coaches: [
    { id: "maja", name: "Maja Kovač", role: "Vodja plavalne šole", programs: ["zvezdice", "rakci", "zelvice"], years: 14, colors: ["#06b6d4", "#3b82f6"],
      bio: "Vodi plavalno šolo in skrbi, da vsak otrok v vodi najprej začuti varnost in veselje. Posebej rada dela z najmlajšimi.",
      quals: ["Licenca trenerja plavanja", "Učiteljica plavanja", "Prva pomoč in reševanje iz vode"] },
    { id: "rok", name: "Rok Novak", role: "Glavni trener tekmovalnega programa", programs: ["kadeti", "starejsi"], years: 18, colors: ["#7c3aed", "#ec4899"],
      bio: "Nekdanji državni reprezentant, ki načrtuje sezono tekmovalnih skupin in vodi priprave. Prisega na tehniko pred obsegom.",
      quals: ["Licenca trenerja plavanja", "Univerzitetni diplomirani kineziolog", "Mednarodni seminarji LEN"] },
    { id: "nina", name: "Nina Horvat", role: "Trenerka mlajših kategorij", programs: ["mlajsi", "prehodna"], years: 9, colors: ["#14b8a6", "#22d3ee"],
      bio: "Mladim plavalcem pomaga pri prvih korakih v tekmovalnem plavanju – z ogromno potrpežljivosti in natančnim delom na tehniki.",
      quals: ["Licenca trenerja plavanja", "Profesorica športne vzgoje"] },
    { id: "jure", name: "Jure Krajnc", role: "Kondicijski trener", programs: ["kadeti", "starejsi", "prehodna"], years: 11, colors: ["#f59e0b", "#ef4444"],
      bio: "Skrbi za moč, gibljivost in preventivo poškodb. Njegova suha vadba je trda, a plavalci pravijo, da se splača.",
      quals: ["Kondicijski trener", "Magister kineziologije"] },
    { id: "eva", name: "Eva Zupan", role: "Trenerka plavalne šole", programs: ["tjulnji", "delfini"], years: 6, colors: ["#3b82f6", "#a78bfa"],
      bio: "Nadaljevalne skupine vodi skozi igro in izzive. Otroci jo poznajo po štoparici in nalepkah za vsak napredek.",
      quals: ["Licenca trenerja plavanja", "Učiteljica plavanja"] },
    { id: "tilen", name: "Tilen Potočnik", role: "Trener odraslih", programs: ["odrasli"], years: 7, colors: ["#0ea5e9", "#14b8a6"],
      bio: "Odraslim pomaga premagati strah pred vodo in izpiliti kravl. Aktiven triatlonec in plavalec na odprtih vodah.",
      quals: ["Licenca trenerja plavanja", "Trener triatlona"] }
  ],

  /* Zgodovina – prva dva vnosa in olimpijski mejniki so preverjeni, ostalo vzorčno */
  history: [
    { year: "1988", title: "Prvi olimpijec kluba", text: "Matjaž Kozelj, plavalec delfinove tehnike, nastopi na olimpijskih igrah v Seulu.", icon: "medal", verified: true },
    { year: "1992", title: "Barcelona, prvič za Slovenijo", text: "Kozelj nastopi na OI v Barceloni v disciplinah 100 m in 200 m delfin – na prvih poletnih olimpijskih igrah samostojne Slovenije.", icon: "flag", verified: true },
    { year: "1996", title: "Metka Sparavec v Atlanti", text: "Branikova plavalka Metka Sparavec nastopi na olimpijskih igrah v Atlanti.", icon: "star", verified: true },
    { year: "1999", title: "Evropski bron", text: "Metka Sparavec osvoji bronasto medaljo na 50 m hrbtno na evropskem prvenstvu v Istanbulu.", icon: "trophy", verified: true },
    { year: "2003", title: "Olimpijski bazen na Pristanu", text: "Kopališče Pristan dobi sodoben olimpijski bazen dimenzij 50 × 25 m – nov dom za trening kluba.", icon: "waves", verified: true },
    { year: "2024", title: "Prenovljen program plavalne šole", text: "Šola dobi jasno pot napredovanja: od Morskih zvezdic do Prehodne skupine.", icon: "graduation", verified: false },
    { year: "2026", title: "Nova sezona, nova spletna stran", text: "Sezono 2026/2027 začnemo z več kot 40 tedenskimi termini vadbe.", icon: "sparkles", verified: false }
  ],

  olympians: [
    { name: "Matjaž Kozelj", discipline: "Delfin", games: ["Seul 1988", "Barcelona 1992"], note: "Rojen v Mariboru, specialist za 100 m in 200 m delfin." },
    { name: "Metka Sparavec", discipline: "Hrbtno in prosto", games: ["Atlanta 1996"], note: "Bronasta na 50 m hrbtno na EP 1999 v Istanbulu." }
  ],

  values: [
    { title: "Varnost na prvem mestu", text: "Majhne skupine, usposobljeni trenerji in postopno napredovanje.", icon: "shield" },
    { title: "Veselje do vode", text: "Učimo skozi igro – motivacija je ključ do napredka.", icon: "smile" },
    { title: "Pot do vrha", text: "Jasna pot od plavalne šole do tekmovalnega plavanja.", icon: "target" },
    { title: "Klubska skupnost", text: "Tabori, prireditve in navijanje na tribuni – smo ena ekipa.", icon: "users" }
  ],

  newsCategories: ["Tekmovanja", "Plavalna šola", "Klub", "Dogodki"],

  /* VZORČNE novice */
  news: [
    {
      id: "jesenski-miting-kranj-2026", date: "2026-11-10", category: "Tekmovanja", author: "Rok Novak", readMins: 3,
      image: "assets/img/photos/tekma-proge-sm.jpg", featured: true,
      title: "Odlični nastopi na jesenskem mitingu v Kranju",
      excerpt: "Branikovci so se z mitinga vrnili z dvanajstimi medaljami in kopico osebnih rekordov.",
      body: [
        "Na jesenskem mitingu v Kranju je nastopilo 23 plavalk in plavalcev PK Branik, ki so skupaj osvojili dvanajst medalj – štiri zlate, šest srebrnih in dve bronasti.",
        "Najbolj so blesteli starejši dečki in deklice, ki so na 50-metrskem bazenu izboljšali kar 31 osebnih rekordov. Lara Vidmar je zmagala na 200 m mešano, Luka Žagar pa je bil najhitrejši na 100 m delfin.",
        "»Miting je pokazal, da je jesenski trening na pravi poti. Zdaj se osredotočamo na zimsko državno prvenstvo,« je po tekmi povedal glavni trener Rok Novak.",
        "Vsem plavalcem čestitamo, staršem pa hvala za podporo na tribuni!"
      ]
    },
    {
      id: "bozicni-miting-2026", date: "2026-11-03", category: "Dogodki", author: "PK Branik", readMins: 2,
      image: "assets/img/photos/startni-bloki-hala-sm.jpg", featured: true,
      title: "Vabilo na Božično-novoletni miting PK Branik",
      excerpt: "12. decembra na Pristanu gostimo tradicionalni miting za vse starostne kategorije.",
      body: [
        "Vabimo vas na Božično-novoletni miting PK Branik, ki bo v soboto, 12. decembra 2026, na Kopališču Pristan.",
        "Miting je namenjen plavalcem vseh tekmovalnih kategorij, posebej pa vabimo tudi otroke iz plavalne šole, ki bodo nastopili v zabavnih štafetah.",
        "Prijave klubov zbiramo do 5. decembra. Razpis in program sta na voljo v pisarni kluba in na zahtevo po e-pošti.",
        "Pridite navijat – za najmlajše bo poskrbel tudi Božiček!"
      ]
    },
    {
      id: "prosta-mesta-rakci", date: "2026-10-27", category: "Plavalna šola", author: "Maja Kovač", readMins: 2,
      image: "assets/img/photos/sola-ucenje-sm.jpg",
      title: "Še nekaj prostih mest v skupini Rakci",
      excerpt: "V ponedeljkovem in sredinem terminu Rakcev imamo še nekaj prostih mest za neplavalce.",
      body: [
        "V skupini Rakci, ki je namenjena neplavalcem, starejšim od 4,5 leta, imamo še nekaj prostih mest.",
        "Vadba poteka ob ponedeljkih in sredah v malem bazenu Kopališča Pristan. Otroci se v varnem okolju naučijo potapljanja, pravilnega dihanja in prvih zavesljajev kravla.",
        "Vpis je možen sproti prek spletnega obrazca ali v pisarni kluba. Prvi trening je poskusni."
      ]
    },
    {
      id: "dan-odprtih-vrat", date: "2026-10-14", category: "Klub", author: "PK Branik", readMins: 2,
      image: "assets/img/photos/sola-otroci-sm.jpg",
      title: "Dan odprtih vrat na Pristanu je navdušil",
      excerpt: "Več kot sto otrok je preizkusilo vodo in spoznalo trenerje plavalne šole.",
      body: [
        "Oktobrski dan odprtih vrat je na Pristan privabil več kot sto otrok s starši. Otroci so se preizkusili v igrah v malem bazenu, starejši pa so pod vodstvom trenerjev preplavali prve dolžine.",
        "Starši so dobili odgovore na vprašanja o skupinah, urniku in napredovanju, trenerji pa so pomagali pri izbiri primerne skupine.",
        "Hvala vsem, ki ste nas obiskali – se vidimo v vodi!"
      ]
    },
    {
      id: "klubski-rekord-celje", date: "2026-10-12", category: "Tekmovanja", author: "Nina Horvat", readMins: 3,
      image: "assets/img/photos/start-hrbtno-sm.jpg",
      title: "Nov klubski rekord na mitingu v Celju",
      excerpt: "Ana Kos je na 100 m hrbtno postavila nov klubski rekord v kategoriji starejših deklic.",
      body: [
        "Na jesenskem mitingu v Celju je Ana Kos na 100 m hrbtno s časom 1:06,84 postavila nov klubski rekord v kategoriji starejših deklic.",
        "Dobro so nastopili tudi mlajši dečki in deklice, ki so osvojili štiri medalje in se veselili prvih uradnih norm.",
        "Rezultati so objavljeni na strani Tekmovanja."
      ]
    },
    {
      id: "priprave-pohorje", date: "2026-09-28", category: "Klub", author: "Jure Krajnc", readMins: 3,
      image: "assets/img/photos/gozd-sm.jpg",
      title: "Pripravljalni vikend na Pohorju",
      excerpt: "Tekmovalne skupine so sezono začele s tekom, pohodom in vadbo moči v pohorskih gozdovih.",
      body: [
        "Tekmovalne skupine so začetek sezone obeležile s pripravljalnim vikendom na Pohorju.",
        "Program je vključeval jutranji tek, pohod na vrh, vadbo moči in gibljivosti ter večerne delavnice o prehrani in regeneraciji.",
        "Najpomembnejše pa je bilo druženje – nova sezona se začenja z močno in povezano ekipo."
      ]
    },
    {
      id: "zacetek-plavalne-sole", date: "2026-09-15", category: "Plavalna šola", author: "Maja Kovač", readMins: 2,
      image: "assets/img/photos/sola-plavanje-sm.jpg",
      title: "Začela se je plavalna šola 2026/2027",
      excerpt: "Sredi septembra smo odprli novo sezono plavalne šole – v vodi je že več kot 200 otrok.",
      body: [
        "Plavalna šola PK Branik poteka od sredine septembra do konca šolskega leta. Letos smo v vodo pospremili več kot 200 otrok v šestih skupinah.",
        "Prvi tedni so namenjeni spoznavanju in razvrščanju v skupine. Če trener oceni, da bi bila za otroka primernejša druga skupina, vas bomo obvestili.",
        "Urnik vseh skupin je objavljen na strani Urnik."
      ]
    },
    {
      id: "nov-urnik", date: "2026-09-02", category: "Klub", author: "PK Branik", readMins: 1,
      image: "assets/img/photos/proga-vrv-sm.jpg",
      title: "Objavljen urnik treningov za sezono 2026/2027",
      excerpt: "Na voljo je nov tedenski urnik vseh skupin – z možnostjo izvoza v vaš koledar.",
      body: [
        "Objavili smo urnik treningov za novo sezono. Urnik je pregleden po dnevih in skupinah, posamezne termine pa lahko izvozite neposredno v svoj koledar.",
        "Morebitne spremembe med sezono bomo sproti objavljali med novicami."
      ]
    },
    {
      id: "poletni-tabor", date: "2026-08-21", category: "Dogodki", author: "Eva Zupan", readMins: 2,
      image: "assets/img/photos/morje-sm.jpg",
      title: "Poletni plavalni tabor ob morju",
      excerpt: "Teden sonca, morja in treninga: 40 mladih plavalcev na poletnem taboru.",
      body: [
        "Konec avgusta je 40 mladih plavalcev preživelo teden na poletnem taboru ob morju.",
        "Dopoldne so trenirali tehniko v bazenu, popoldne pa plavali na odprtem morju, igrali vaterpolo in se učili reševanja iz vode.",
        "Tabor bomo ponovili tudi prihodnje poletje – prijave bodo odprte spomladi."
      ]
    },
    {
      id: "poletno-dp", date: "2026-07-12", category: "Tekmovanja", author: "Rok Novak", readMins: 3,
      image: "assets/img/photos/skok-v-bazen-sm.jpg",
      title: "Uspešen zaključek sezone na poletnem DP",
      excerpt: "Štafeta 4 × 100 m mešano starejših dečkov je osvojila srebro.",
      body: [
        "Sezono 2025/2026 smo zaključili na poletnem državnem prvenstvu, kjer je štafeta 4 × 100 m mešano starejših dečkov osvojila srebrno medaljo.",
        "Posamično sta se na zmagovalni oder povzpela še dva Branikovca, kar 18 plavalcev pa je izboljšalo osebne rekorde.",
        "Hvala trenerjem, staršem in podpornikom za odlično sezono!"
      ]
    }
  ],

  /* VZORČNI koledar tekmovanj (status: upcoming | past) */
  competitions: [
    { id: "miting-celje-2026", name: "Jesenski miting Celje", date: "2026-10-10", endDate: null, city: "Celje", venue: "Kopališče Golovec", course: "50 m", level: "Miting", status: "past", categories: ["mlajsi", "starejsi"] },
    { id: "miting-kranj-2026", name: "Jesenski miting Kranj", date: "2026-11-07", endDate: "2026-11-08", city: "Kranj", venue: "Olimpijski bazen Kranj", course: "50 m", level: "Miting", status: "past", categories: ["mlajsi", "starejsi", "kadeti"] },
    { id: "zdp-mlajsi-2026", name: "Zimsko DP mlajših kategorij", date: "2026-11-28", endDate: "2026-11-29", city: "Kranj", venue: "Olimpijski bazen Kranj", course: "25 m", level: "Državno prvenstvo", status: "upcoming", categories: ["mlajsi", "starejsi"] },
    { id: "bozicni-miting-2026", name: "Božično-novoletni miting PK Branik", date: "2026-12-12", endDate: null, city: "Maribor", venue: "Kopališče Pristan", course: "25 m", level: "Miting", status: "upcoming", host: true, categories: ["prehodna", "mlajsi", "starejsi", "kadeti"] },
    { id: "zdp-absolutno-2026", name: "Zimsko absolutno DP", date: "2026-12-18", endDate: "2026-12-20", city: "Ljubljana", venue: "Kopališče Tivoli", course: "25 m", level: "Državno prvenstvo", status: "upcoming", categories: ["kadeti"] },
    { id: "pokal-1-2027", name: "Pokal Slovenije – 1. kolo", date: "2027-01-24", endDate: null, city: "Radovljica", venue: "Kopališče Radovljica", course: "25 m", level: "Pokal", status: "upcoming", categories: ["starejsi", "kadeti"] },
    { id: "miting-mb-2027", name: "Pomladni miting Maribor", date: "2027-03-13", endDate: "2027-03-14", city: "Maribor", venue: "Kopališče Pristan", course: "50 m", level: "Miting", status: "upcoming", host: true, categories: ["mlajsi", "starejsi", "kadeti"] },
    { id: "dp-kadeti-2027", name: "DP kadetov in mladincev", date: "2027-04-17", endDate: "2027-04-18", city: "Kranj", venue: "Olimpijski bazen Kranj", course: "50 m", level: "Državno prvenstvo", status: "upcoming", categories: ["kadeti"] },
    { id: "mali-branik-2027", name: "Mali Branik – miting plavalne šole", date: "2027-05-22", endDate: null, city: "Maribor", venue: "Kopališče Pristan", course: "25 m", level: "Interni miting", status: "upcoming", host: true, categories: ["zelvice", "tjulnji", "delfini", "prehodna"] },
    { id: "ldp-mlajsi-2027", name: "Poletno DP mlajših kategorij", date: "2027-06-19", endDate: "2027-06-20", city: "Kranj", venue: "Olimpijski bazen Kranj", course: "50 m", level: "Državno prvenstvo", status: "upcoming", categories: ["mlajsi", "starejsi"] }
  ],

  /* VZORČNI rezultati (čas v obliki m:ss,cc ali ss,cc; place = uvrstitev) */
  results: [
    { competition: "miting-kranj-2026", athlete: "Lara Vidmar", gender: "Ž", year: 2012, category: "starejsi", event: "200 m mešano", time: "2:31,48", place: 1, pb: true },
    { competition: "miting-kranj-2026", athlete: "Luka Žagar", gender: "M", year: 2012, category: "starejsi", event: "100 m delfin", time: "1:04,92", place: 1, pb: true },
    { competition: "miting-kranj-2026", athlete: "Ana Kos", gender: "Ž", year: 2012, category: "starejsi", event: "100 m hrbtno", time: "1:07,21", place: 2, pb: false },
    { competition: "miting-kranj-2026", athlete: "Tim Golob", gender: "M", year: 2010, category: "kadeti", event: "200 m prosto", time: "1:58,64", place: 1, pb: true },
    { competition: "miting-kranj-2026", athlete: "Zala Mlakar", gender: "Ž", year: 2009, category: "kadeti", event: "100 m prsno", time: "1:14,37", place: 2, pb: true },
    { competition: "miting-kranj-2026", athlete: "Nik Kralj", gender: "M", year: 2014, category: "mlajsi", event: "50 m prosto", time: "30,12", place: 1, pb: true },
    { competition: "miting-kranj-2026", athlete: "Ema Turk", gender: "Ž", year: 2014, category: "mlajsi", event: "50 m hrbtno", time: "36,85", place: 2, pb: true },
    { competition: "miting-kranj-2026", athlete: "Jan Bezjak", gender: "M", year: 2012, category: "starejsi", event: "400 m prosto", time: "4:32,10", place: 2, pb: false },
    { competition: "miting-kranj-2026", athlete: "Mia Petek", gender: "Ž", year: 2014, category: "mlajsi", event: "100 m prosto", time: "1:09,44", place: 3, pb: true },
    { competition: "miting-kranj-2026", athlete: "Žan Lesjak", gender: "M", year: 2008, category: "kadeti", event: "50 m delfin", time: "25,71", place: 2, pb: false },
    { competition: "miting-kranj-2026", athlete: "Lara Vidmar", gender: "Ž", year: 2012, category: "starejsi", event: "100 m prsno", time: "1:18,02", place: 3, pb: true },
    { competition: "miting-kranj-2026", athlete: "Tim Golob", gender: "M", year: 2010, category: "kadeti", event: "100 m prosto", time: "54,83", place: 2, pb: false },
    { competition: "miting-celje-2026", athlete: "Ana Kos", gender: "Ž", year: 2012, category: "starejsi", event: "100 m hrbtno", time: "1:06,84", place: 1, pb: true },
    { competition: "miting-celje-2026", athlete: "Nik Kralj", gender: "M", year: 2014, category: "mlajsi", event: "100 m prosto", time: "1:07,90", place: 1, pb: true },
    { competition: "miting-celje-2026", athlete: "Ema Turk", gender: "Ž", year: 2014, category: "mlajsi", event: "100 m hrbtno", time: "1:19,33", place: 1, pb: true },
    { competition: "miting-celje-2026", athlete: "Mia Petek", gender: "Ž", year: 2014, category: "mlajsi", event: "50 m prosto", time: "31,48", place: 2, pb: true },
    { competition: "miting-celje-2026", athlete: "Luka Žagar", gender: "M", year: 2012, category: "starejsi", event: "200 m delfin", time: "2:28,76", place: 2, pb: true },
    { competition: "miting-celje-2026", athlete: "Jan Bezjak", gender: "M", year: 2012, category: "starejsi", event: "200 m prosto", time: "2:09,15", place: 3, pb: false },
    { competition: "miting-celje-2026", athlete: "Lara Vidmar", gender: "Ž", year: 2012, category: "starejsi", event: "400 m mešano", time: "5:24,60", place: 2, pb: true },
    { competition: "miting-celje-2026", athlete: "Gal Kovačič", gender: "M", year: 2014, category: "mlajsi", event: "50 m prsno", time: "41,22", place: 3, pb: true }
  ],

  /* VZORČNI klubski rekordi (50 m bazen) */
  records: [
    { event: "50 m prosto", gender: "M", athlete: "Žan Lesjak", time: "23,94", year: 2026 },
    { event: "100 m prosto", gender: "M", athlete: "Tim Golob", time: "52,61", year: 2026 },
    { event: "200 m prosto", gender: "M", athlete: "Matic Fras", time: "1:55,02", year: 2019 },
    { event: "100 m hrbtno", gender: "M", athlete: "Blaž Rajh", time: "58,47", year: 2021 },
    { event: "100 m prsno", gender: "M", athlete: "Matic Fras", time: "1:03,90", year: 2019 },
    { event: "100 m delfin", gender: "M", athlete: "Žan Lesjak", time: "55,12", year: 2025 },
    { event: "200 m mešano", gender: "M", athlete: "Matic Fras", time: "2:07,35", year: 2019 },
    { event: "50 m prosto", gender: "Ž", athlete: "Nika Ornik", time: "26,58", year: 2022 },
    { event: "100 m prosto", gender: "Ž", athlete: "Nika Ornik", time: "57,31", year: 2022 },
    { event: "200 m prosto", gender: "Ž", athlete: "Zala Mlakar", time: "2:06,44", year: 2026 },
    { event: "100 m hrbtno", gender: "Ž", athlete: "Ana Kos", time: "1:06,84", year: 2026 },
    { event: "100 m prsno", gender: "Ž", athlete: "Zala Mlakar", time: "1:14,37", year: 2026 },
    { event: "100 m delfin", gender: "Ž", athlete: "Petra Vogrin", time: "1:02,75", year: 2020 },
    { event: "200 m mešano", gender: "Ž", athlete: "Lara Vidmar", time: "2:31,48", year: 2026 }
  ],

  albums: ["Treningi", "Tekmovanja", "Plavalna šola", "Klub"],

  /* Galerija – začasne fotografije iz fotobank Unsplash/Pexels (glej assets/img/photos/CREDITS.md).
     Zamenjaj s fotografijami kluba. src = velika slika (lightbox), thumb = pomanjšana (mreža). */
  gallery: [
    { id: "g1", src: "assets/img/photos/delfin-trening.jpg", thumb: "assets/img/photos/delfin-trening-sm.jpg", w: 1920, h: 1280, album: "Treningi", title: "Jutranji trening delfinove tehnike", date: "2026-10-06" },
    { id: "g2", src: "assets/img/photos/kravl-proga.jpg", thumb: "assets/img/photos/kravl-proga-sm.jpg", w: 1920, h: 1280, album: "Treningi", title: "Kravl v svoji progi", date: "2026-10-02" },
    { id: "g3", src: "assets/img/photos/delfin-pljusk.jpg", thumb: "assets/img/photos/delfin-pljusk-sm.jpg", w: 1200, h: 1600, album: "Treningi", title: "Delfin na 50-metrskem bazenu", date: "2026-09-30" },
    { id: "g4", src: "assets/img/photos/suha-vadba.jpg", thumb: "assets/img/photos/suha-vadba-sm.jpg", w: 1920, h: 1280, album: "Treningi", title: "Pripomočki za suho vadbo", date: "2026-09-24" },
    { id: "g5", src: "assets/img/photos/proga-vrv.jpg", thumb: "assets/img/photos/proga-vrv-sm.jpg", w: 1920, h: 1080, album: "Treningi", title: "Progovne vrvi pred jutranjim treningom", date: "2026-09-18" },
    { id: "g6", src: "assets/img/photos/pod-vodo.jpg", thumb: "assets/img/photos/pod-vodo-sm.jpg", w: 1920, h: 1440, album: "Treningi", title: "Pogled pod gladino", date: "2026-09-12" },
    { id: "g7", src: "assets/img/photos/start-tekma.jpg", thumb: "assets/img/photos/start-tekma-sm.jpg", w: 1920, h: 1280, album: "Tekmovanja", title: "Na startnih blokih", date: "2026-11-08" },
    { id: "g8", src: "assets/img/photos/start-hrbtno.jpg", thumb: "assets/img/photos/start-hrbtno-sm.jpg", w: 1200, h: 1800, album: "Tekmovanja", title: "Start hrbtne tehnike", date: "2026-11-08" },
    { id: "g9", src: "assets/img/photos/tekma-proge.jpg", thumb: "assets/img/photos/tekma-proge-sm.jpg", w: 1920, h: 1282, album: "Tekmovanja", title: "Finale na 50-metrskem bazenu", date: "2026-11-08" },
    { id: "g10", src: "assets/img/photos/tekma-delfin.jpg", thumb: "assets/img/photos/tekma-delfin-sm.jpg", w: 1920, h: 1280, album: "Tekmovanja", title: "Delfin pod budnim očesom sodnikov", date: "2026-10-11" },
    { id: "g11", src: "assets/img/photos/skok-v-bazen.jpg", thumb: "assets/img/photos/skok-v-bazen-sm.jpg", w: 1920, h: 1280, album: "Tekmovanja", title: "Skok v vodo", date: "2026-07-12" },
    { id: "g12", src: "assets/img/photos/blok-6.jpg", thumb: "assets/img/photos/blok-6-sm.jpg", w: 1200, h: 1800, album: "Tekmovanja", title: "Šesta proga", date: "2026-07-11" },
    { id: "g13", src: "assets/img/photos/sola-otroci.jpg", thumb: "assets/img/photos/sola-otroci-sm.jpg", w: 1920, h: 1281, album: "Plavalna šola", title: "Pred prvim skokom", date: "2026-10-14" },
    { id: "g14", src: "assets/img/photos/sola-ucenje.jpg", thumb: "assets/img/photos/sola-ucenje-sm.jpg", w: 1920, h: 1280, album: "Plavalna šola", title: "Prvi zavesljaji s trenerjem", date: "2026-10-05" },
    { id: "g15", src: "assets/img/photos/sola-lebdenje.jpg", thumb: "assets/img/photos/sola-lebdenje-sm.jpg", w: 1920, h: 1274, album: "Plavalna šola", title: "Učimo se lebdeti", date: "2026-09-18" },
    { id: "g16", src: "assets/img/photos/sola-plavanje.jpg", thumb: "assets/img/photos/sola-plavanje-sm.jpg", w: 1920, h: 1281, album: "Plavalna šola", title: "Samostojno v progi", date: "2026-09-16" },
    { id: "g17", src: "assets/img/photos/bazen-hala.jpg", thumb: "assets/img/photos/bazen-hala-sm.jpg", w: 1920, h: 1280, album: "Klub", title: "Pokriti bazen pred treningom", date: "2026-10-14" },
    { id: "g18", src: "assets/img/photos/ekipa.jpg", thumb: "assets/img/photos/ekipa-sm.jpg", w: 1200, h: 1800, album: "Klub", title: "Ekipa ob bazenu", date: "2026-09-27" },
    { id: "g19", src: "assets/img/photos/morje.jpg", thumb: "assets/img/photos/morje-sm.jpg", w: 1920, h: 1276, album: "Klub", title: "Poletni tabor ob morju", date: "2026-08-21" },
    { id: "g20", src: "assets/img/photos/jezero.jpg", thumb: "assets/img/photos/jezero-sm.jpg", w: 1920, h: 1442, album: "Klub", title: "Jutro ob jezeru na pripravah", date: "2026-09-27" },
    { id: "g21", src: "assets/img/photos/gozd.jpg", thumb: "assets/img/photos/gozd-sm.jpg", w: 1920, h: 1279, album: "Klub", title: "Tek po gozdu na pripravah", date: "2026-09-26" },
    { id: "g22", src: "assets/img/photos/odprte-vode.jpg", thumb: "assets/img/photos/odprte-vode-sm.jpg", w: 1920, h: 969, album: "Klub", title: "Plavanje na odprtih vodah", date: "2026-08-23" }
  ],

  /* Pogosta vprašanja (uporabljajo jih strani Programi, Vpis in Kontakt) */
  faq: [
    { q: "Od katere starosti lahko otrok začne?", a: "V plavalno šolo vpisujemo otroke, stare 4 leta in več. Najmlajši začnejo v skupini Morske zvezdice, ki poteka v malem bazenu.", topic: "vpis" },
    { q: "Kdaj poteka plavalna šola?", a: "Plavalna šola poteka od sredine septembra do konca šolskega leta. Vpis je mogoč tudi med letom, če so v skupini prosta mesta.", topic: "vpis" },
    { q: "Kako vem, v katero skupino sodi moj otrok?", a: "Uporabite izbirnik skupine na strani Programi ali pa otroka pripeljite na poskusni trening – trener bo ocenil znanje in predlagal skupino.", topic: "programi" },
    { q: "Ali lahko otrok najprej poskusi?", a: "Da, prvi trening je poskusni: otrok spozna skupino in trenerja, za vpis pa se odločite po njem.", topic: "vpis" },
    { q: "Kaj potrebuje otrok za trening?", a: "Kopalke, plavalno kapo, plavalna očala, brisačo in natikače. Dolgi lasje naj bodo speti pod kapo.", topic: "programi" },
    { q: "Kako poteka plačilo članarine?", a: "Članarina se plačuje mesečno na TRR kluba. Ob prvem vpisu se poravna še vpisnina po veljavnem ceniku.", topic: "vpis" },
    { q: "Ali lahko starši spremljamo trening?", a: "Starši lahko trening spremljajo s tribune. Prosimo, da v garderobe in ob bazen ne vstopate, da otroci ostanejo osredotočeni.", topic: "programi" },
    { q: "Kje poteka vadba?", a: "Vsa vadba poteka na Kopališču Pristan, Koroška cesta 33, Maribor – v malem, 25-metrskem ali 50-metrskem bazenu, odvisno od skupine.", topic: "kontakt" },
    { q: "Ali imate tudi plavanje za odrasle?", a: "Da, za odrasle izvajamo tečaj plavanja in vodeno rekreacijo. Za proste termine nam pišite.", topic: "programi" }
  ]
};
