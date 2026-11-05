// Scenariul exemplu: vârstnici singuri în caniculă, vecini care le duc apă și cumpărături.
// E ales intenționat diferit de briefurile ITFest, ca echipa să vadă ce se schimbă la adaptare.
// La hackathon: copiați fișierul, schimbați tot ce e aici și setați-l activ în ../config.ts.

import { defineScenario } from "../types";

export const vecini = defineScenario({
  id: "vecini",
  app: {
    name: "Vecin la nevoie",
    tagline: "Ajutăm vârstnicii singuri din bloc să primească apă și cumpărături în caniculă, fără să sune la zece uși.",
    impactLabel: "produse duse acasă",
    center: { lat: 44.4268, lng: 26.1025 },
  },
  roles: {
    giver: { label: "Vecin", plural: "Vecini", icon: "🙋", pitch: "Vezi cine are nevoie lângă tine și du tu cumpărăturile." },
    receiver: { label: "Vârstnic", plural: "Vârstnici", icon: "👵", pitch: "Spune ce îți lipsește și confirmă când a ajuns." },
  },
  request: {
    singular: "cerere",
    plural: "cereri",
    actions: { accept: "Mă ocup eu", cancel: "Renunț", deliver: "Am lăsat la ușă", confirm: "Am primit", dispute: "Nu am primit", reopen: "Cere din nou" },
    addTitle: "Ce îți lipsește? (scrie cum ai spune-o)",
    addPlaceholder: "ex: Sunt la etajul 4 pe Calea Moșilor, nu mai am apă, îmi trebuie 6 sticle până diseară",
    offerTitle: "Ce poți duce și unde stai?",
    offerPlaceholder: "Merg la Mega Image din Obor la 18, pot lua apă pentru cineva din zonă.",
    aiContext: "Cererile vin de la vârstnici singuri din București în timpul caniculei: apă, cumpărături, medicamente, însoțire.",
  },
  categories: [
    { id: "apa", label: "apă", color: "#38bdf8", icon: "💧" },
    { id: "cumparaturi", label: "cumpărături", color: "#f59e0b", icon: "🛒" },
    { id: "medicamente", label: "medicamente", color: "#22c55e", icon: "💊" },
    { id: "insotire", label: "însoțire", color: "#a855f7", icon: "🚶" },
    { id: "altele", label: "altele", color: "#94a3b8", icon: "📦" },
  ],
  points: { base: 10, perUnit: 1, maxUnits: 20, urgency: [1, 1.2, 1.5, 2, 2.5], disputePenalty: 15 },
  ranks: [
    { name: "Vecin nou", min: 0, frame: "#94a3b8" },
    { name: "Vecin de încredere", min: 40, frame: "#38bdf8" },
    { name: "Sprijinul scării", min: 120, frame: "#a855f7" },
    { name: "Inima cartierului", min: 300, frame: "#f59e0b" },
  ],
  trust: { suspendAfterDisputes: 2 },
  reports: {
    enabled: true,
    title: "Raportează acum, unde ești",
    prompt: "Ce vezi lângă tine?",
    types: [
      { id: "apa", label: "Apă gratuită", icon: "💧", color: "#38bdf8" },
      { id: "farmacie", label: "Farmacie deschisă", icon: "💊", color: "#22c55e" },
      { id: "caldura", label: "Om în pericol de căldură", icon: "🥵", color: "#ef4444" },
    ],
    freshMinutes: 30,
    expireMinutes: 180,
  },
  notify: {
    channel: "sms",
    accepted: (c) => `${c.giver} se ocupă de „${c.title}”. Vă anunțăm când lasă la ușă.`,
    delivered: (c) => `${c.giver} spune că a lăsat ${c.quantity} la ușă. Ați primit? ${c.link}`,
    confirmed: (c) => `${c.receiver} a confirmat „${c.title}”. +${c.points} puncte. Mulțumim!`,
    disputed: (c) => `${c.receiver} spune că n-a primit „${c.title}”. Răspundeți în aplicație.`,
  },
  features: { matching: true, optionalModules: true },
  mascot: {
    enabled: true,
    name: "Țepi",
    color: "#8b5e3c",
    persona: "un arici prietenos care vorbește rar și clar, pentru oameni în vârstă",
    tour: true,
  },
  seed: {
    people: [
      { handle: "andrei", name: "Andrei Pop", role: "giver", phone: "0722 000 101", area: "Obor" },
      { handle: "ioana", name: "Ioana Marin", role: "giver", phone: "0722 000 102", area: "Titan" },
      { handle: "mihai", name: "Mihai Stan", role: "giver", phone: "0722 000 103", area: "Drumul Taberei" },
      { handle: "elena", name: "Elena Dobre", role: "giver", phone: "0722 000 104", area: "Berceni" },
      { handle: "doamna-vasilescu", name: "Doamna Vasilescu", role: "receiver", phone: "0722 000 201", area: "Calea Moșilor" },
      { handle: "domnul-ionescu", name: "Domnul Ionescu", role: "receiver", phone: "0722 000 202", area: "Titan" },
      { handle: "doamna-radu", name: "Doamna Radu", role: "receiver", phone: "0722 000 203", area: "Drumul Taberei" },
      { handle: "domnul-georgescu", name: "Domnul Georgescu", role: "receiver", phone: "0722 000 204", area: "Berceni" },
    ],
    requests: [
      { title: "Apă plată, 6 sticle", category: "apa", description: "Etajul 4 fără lift, nu mai pot căra.", quantity: 6, unit: "sticle", urgency: 5, address: "Calea Moșilor 210, București", lat: 44.4465, lng: 26.1195, receiver: "doamna-vasilescu" },
      { title: "Pâine, lapte și fructe", category: "cumparaturi", description: "Pentru două zile, lista e la ușă.", quantity: 5, unit: "produse", urgency: 3, address: "Bd. Nicolae Grigorescu, Titan", lat: 44.4172, lng: 26.1688, receiver: "domnul-ionescu" },
      { title: "Rețetă compensată", category: "medicamente", description: "Tensiune, rețeta e la mine, farmacia e la 800 m.", quantity: 1, unit: "rețetă", urgency: 4, address: "Str. Brașov, Drumul Taberei", lat: 44.4232, lng: 26.0322, receiver: "doamna-radu" },
      { title: "Însoțire la policlinică", category: "insotire", description: "Programare joi la 9, Policlinica Berceni.", quantity: 1, unit: "drum", urgency: 2, address: "Str. Turnu Măgurele, Berceni", lat: 44.3805, lng: 26.1199, receiver: "domnul-georgescu" },
      { title: "Apă și sucuri", category: "apa", description: "Mi s-a stricat frigiderul.", quantity: 8, unit: "sticle", urgency: 4, address: "Str. Ion Creangă, Titan", lat: 44.4205, lng: 26.1612, receiver: "domnul-ionescu", giver: "ioana", stage: "acceptat" },
      { title: "Cumpărături de la piață", category: "cumparaturi", description: "Roșii, cartofi, brânză.", quantity: 4, unit: "produse", urgency: 3, address: "Piața Obor", lat: 44.4497, lng: 26.1268, receiver: "doamna-vasilescu", giver: "andrei", stage: "confirmat" },
      { title: "Medicamente pentru inimă", category: "medicamente", description: "Rețeta lunară.", quantity: 2, unit: "cutii", urgency: 5, address: "Bd. Timișoara, Drumul Taberei", lat: 44.4264, lng: 26.0397, receiver: "doamna-radu", giver: "mihai", stage: "confirmat" },
      { title: "Apă pentru weekend", category: "apa", description: "12 sticle de 2 l.", quantity: 12, unit: "sticle", urgency: 4, address: "Str. Lânăriei, Berceni", lat: 44.3952, lng: 26.1069, receiver: "domnul-georgescu", giver: "elena", stage: "livrat" },
    ],
    reports: [
      { type: "apa", note: "Cișmea la intrarea în parc", lat: 44.4237, lng: 26.1606, minutesAgo: 12 },
      { type: "farmacie", note: "Deschisă non-stop", lat: 44.4483, lng: 26.1242, minutesAgo: 45 },
      { type: "caldura", note: "Un domn pe bancă, i-am dat apă", lat: 44.3829, lng: 26.1203, minutesAgo: 4 },
    ],
  },
});
