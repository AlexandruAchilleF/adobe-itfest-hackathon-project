// Repetiția pe brief-ul ITFest × Adobe 2023 („ResourceWise”): surplusul de mâncare al
// restaurantelor ajunge la adăposturi și cantine sociale. Doar config, fără cod nou.
// Brief: „connect those with surplus resources to those in need… Interactive Mapping… Gamification”.

import { defineScenario } from "../types";

export const resurse = defineScenario({
  id: "resurse",
  app: {
    name: "Masa de diseară",
    tagline: "Ajutăm adăposturile și cantinele sociale să primească mâncarea rămasă la restaurante în aceeași seară, fără zece telefoane și fără porții care nu mai ajung.",
    impactLabel: "porții salvate",
    center: { lat: 44.4355, lng: 26.1025 },
  },
  business: {
    problem: "Restaurantele aruncă seara mâncare bună, iar adăposturile din apropiere nu află la timp. Când află, nimeni nu confirmă că a ajuns.",
    payer: "Ipoteză de verificat: restaurantele și magazinele care au obligații legale anti-risipă și plătesc colectarea deșeurilor; alternativ bugetele de CSR ale lanțurilor. De întrebat la interviuri cât plătesc azi.",
    evidence: [],
  },
  roles: {
    restaurant: { label: "Restaurant", plural: "Restaurante", icon: "🍲", pitch: "Vezi cine are nevoie aproape de tine și duci surplusul de diseară." },
    adapost: { label: "Adăpost", plural: "Adăposturi", icon: "🏠", pitch: "Spui de câte porții ai nevoie și confirmi când au ajuns." },
  },
  flow: {
    requester: "adapost",
    initial: "deschis",
    states: [
      { id: "deschis", label: "caută donator", tone: "open" },
      { id: "promis", label: "promis", tone: "progress" },
      { id: "predat", label: "predat", tone: "waiting" },
      { id: "primit", label: "primit", tone: "done" },
      { id: "neprimit", label: "neprimit", tone: "failed" },
    ],
    transitions: [
      { id: "promite", label: "Aduc eu diseară", done: "a promis că aduce", from: ["deschis"], to: "promis", role: "restaurant", notify: { role: "adapost", message: (c) => `${c.by} aduce „${c.title}” diseară.` } },
      { id: "renunta", label: "Nu mai pot", done: "a renunțat", from: ["promis"], to: "deschis", role: "restaurant", release: true, danger: true },
      { id: "preda", label: "Am predat", done: "a marcat predat", from: ["promis"], to: "predat", role: "restaurant", notify: { role: "adapost", message: (c) => `${c.by} spune că a predat ${c.quantity}. Ați primit? ${c.link}` } },
      { id: "confirma", label: "Am primit", done: "a confirmat primirea", from: ["predat"], to: "primit", role: "adapost", outcome: "done", notify: { role: "restaurant", message: (c) => `${c.requester} a confirmat „${c.title}”. +${c.points} puncte. Mulțumim!` } },
      { id: "neprimit", label: "Nu am primit", done: "spune: „nu am primit”", from: ["predat"], to: "neprimit", role: "adapost", outcome: "failed", note: "optional", danger: true, notify: { role: "restaurant", message: (c) => `${c.requester} spune că n-a primit „${c.title}”${c.note ? `: ${c.note}` : ""}.` } },
      { id: "redeschide", label: "Caută alt donator", done: "a cerut din nou", from: ["neprimit"], to: "deschis", role: "adapost", reset: true },
    ],
  },
  request: {
    singular: "cerere",
    plural: "cereri",
    addTitle: "De ce aveți nevoie diseară?",
    addPlaceholder: "ex: Avem 40 de oameni la cină pe Calea Griviței, ne lipsesc 25 de porții calde până la 19",
    offerTitle: "Ce aveți în plus diseară și unde?",
    offerPlaceholder: "Bistro în Piața Romană, 20 de porții de supă și pâine, gata la 21.",
    aiContext: "Cereri de la adăposturi și cantine sociale din București pentru mâncare rămasă la restaurante în aceeași seară.",
  },
  categories: [
    { id: "cald", label: "mâncare caldă", color: "#ef4444", icon: "🍲" },
    { id: "paine", label: "pâine și patiserie", color: "#f59e0b", icon: "🥖" },
    { id: "fructe", label: "fructe și legume", color: "#22c55e", icon: "🍎" },
    { id: "lactate", label: "lactate", color: "#38bdf8", icon: "🥛" },
    { id: "altele", label: "altele", color: "#94a3b8", icon: "📦" },
  ],
  points: { role: "restaurant", base: 10, perUnit: 1, maxUnits: 50, urgency: [1, 1.2, 1.5, 2, 2.5], disputePenalty: 25 },
  ranks: [
    { name: "Novice", min: 0, frame: "#94a3b8" },
    { name: "Donator de încredere", min: 60, frame: "#38bdf8" },
    { name: "Generos", min: 150, frame: "#a855f7" },
    { name: "Expert ResourceWise", min: 350, frame: "#f59e0b" },
  ],
  trust: { suspendAfterDisputes: 2 },
  reports: {
    enabled: true,
    title: "Surplus acum, aici",
    prompt: "Ce ai în plus chiar acum?",
    types: [
      { id: "cald", label: "Porții calde", icon: "🍲", color: "#ef4444" },
      { id: "paine", label: "Pâine", icon: "🥖", color: "#f59e0b" },
      { id: "fructe", label: "Fructe și legume", icon: "🍎", color: "#22c55e" },
    ],
    freshMinutes: 45,
    expireMinutes: 240,
  },
  notify: { channel: "sms" },
  features: { map: true, gamification: true, matching: true, optionalModules: false },
  mascot: {
    enabled: true,
    // desenul din template e un arici: numele și persona trebuie să se potrivească cu el (sau schimbați desenul)
    name: "Ghiță",
    color: "#b45309",
    persona: "un arici de cartier care anunță scurt cine aduce mâncare și când a ajuns",
    tour: true,
    hiddenOn: ["/business", "/survey", "/start"],
  },
  seed: {
    people: [
      { handle: "bistro-romana", name: "Bistro Piața Romană", role: "restaurant", phone: "0722 000 601", area: "Piața Romană" },
      { handle: "pizzerie-obor", name: "Pizzeria Obor", role: "restaurant", phone: "0722 000 602", area: "Obor" },
      { handle: "cantina-lipscani", name: "Cantina Lipscani", role: "restaurant", phone: "0722 000 603", area: "Centrul Vechi" },
      { handle: "brutarie-titan", name: "Brutăria Titan", role: "restaurant", phone: "0722 000 604", area: "Titan" },
      { handle: "adapost-grivitei", name: "Adăpostul Grivița", role: "adapost", phone: "0722 000 701", area: "Calea Griviței" },
      { handle: "cantina-ferentari", name: "Cantina socială Ferentari", role: "adapost", phone: "0722 000 702", area: "Ferentari" },
      { handle: "centru-zi-colentina", name: "Centrul de zi Colentina", role: "adapost", phone: "0722 000 703", area: "Colentina" },
      { handle: "adapost-berceni", name: "Adăpostul de noapte Berceni", role: "adapost", phone: "0722 000 704", area: "Berceni" },
    ],
    requests: [
      { title: "25 de porții calde la cină", category: "cald", description: "40 de oameni în seara asta, ne lipsesc 25 de porții.", quantity: 25, unit: "porții", urgency: 5, address: "Calea Griviței, București", lat: 44.4521, lng: 26.0712, requester: "adapost-grivitei", hoursAgo: 0.5, expiresInHours: 4 },
      { title: "Pâine pentru mic dejun", category: "paine", description: "Pentru mâine dimineață.", quantity: 30, unit: "bucăți", urgency: 3, address: "Ferentari, București", lat: 44.4048, lng: 26.0742, requester: "cantina-ferentari", hoursAgo: 2, expiresInHours: 12 },
      { title: "Fructe pentru copii", category: "fructe", description: "Program after-school, 20 de copii.", quantity: 10, unit: "kg", urgency: 3, address: "Colentina, București", lat: 44.46, lng: 26.135, requester: "centru-zi-colentina" },
      { title: "Lapte și iaurturi", category: "lactate", description: "Pentru vârstnicii de la centru.", quantity: 15, unit: "litri", urgency: 2, address: "Berceni, București", lat: 44.382, lng: 26.12, requester: "adapost-berceni" },
      { title: "Supă pentru diseară", category: "cald", description: "Porții pentru adăpostul de noapte.", quantity: 20, unit: "porții", urgency: 4, address: "Berceni, București", lat: 44.3829, lng: 26.1203, requester: "adapost-berceni", steps: [["promite", "cantina-lipscani"]] },
      { title: "Pizza rămasă de la prânz", category: "cald", description: "Orice porții calde.", quantity: 12, unit: "porții", urgency: 4, address: "Colentina, București", lat: 44.4598, lng: 26.1352, requester: "centru-zi-colentina", steps: [["promite", "pizzerie-obor"], ["preda", "pizzerie-obor"], ["confirma", "centru-zi-colentina"]] },
      { title: "Covrigi și cornuri", category: "paine", description: "Pentru masa de seară.", quantity: 40, unit: "bucăți", urgency: 3, address: "Ferentari, București", lat: 44.405, lng: 26.0745, requester: "cantina-ferentari", steps: [["promite", "brutarie-titan"], ["preda", "brutarie-titan"], ["confirma", "cantina-ferentari"]] },
      { title: "Tocăniță pentru 30", category: "cald", description: "Cina de vineri.", quantity: 30, unit: "porții", urgency: 5, address: "Calea Griviței, București", lat: 44.4519, lng: 26.0709, requester: "adapost-grivitei", steps: [["promite", "bistro-romana"], ["preda", "bistro-romana"]] },
    ],
    reports: [
      { type: "cald", note: "15 porții de ciorbă, ridicare până la 22", lat: 44.4459, lng: 26.0975, minutesAgo: 8 },
      { type: "paine", note: "2 lăzi de pâine de azi", lat: 44.4205, lng: 26.1612, minutesAgo: 25 },
      { type: "fructe", note: "Banane și mere, 5 kg", lat: 44.4497, lng: 26.1268, minutesAgo: 70 },
    ],
  },
});
