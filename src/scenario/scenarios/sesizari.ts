// Scenariul exemplu pentru raportare live (forma brief-ului ITFest 2024, dedusă dintr-un repo):
// cetățeanul raportează de pe telefon, la locația curentă; raportul devine o sesizare cu flux
// (preluată → rezolvată → confirmată de cetățean sau „nu s-a rezolvat”). Plătitorul: primăria.

import { defineScenario } from "../types";

export const sesizari = defineScenario({
  id: "sesizari",
  app: {
    name: "Rezolvat?",
    tagline: "Ajutăm primăria de sector să rezolve gropile, becurile arse și gunoiul raportate de oameni și să afle de la ei, nu din tabel, dacă s-au rezolvat cu adevărat.",
    headline: "Gropi raportate, *gropi astupate.*",
    notThis: "Nu încă un formular de sesizări fără răspuns",
    impactLabel: "sesizări rezolvate și confirmate",
    center: { lat: 44.4355, lng: 26.13 },
  },
  business: {
    problem: "Sesizările ajung prin telefon, email și Facebook; nimeni nu vede cât stă fiecare și „rezolvat” în registru nu înseamnă că omul care a raportat e de acord.",
    payer: "Ipoteză de verificat: primăria de sector sau administrația străzilor, care plătesc deja dispeceratul și echipele de intervenție. De întrebat: câte sesizări pe lună, cât durează una, câte se redeschid.",
    evidence: [],
  },
  roles: {
    cetatean: { label: "Cetățean", plural: "Cetățeni", icon: "🙋", pitch: "Raportezi în 2 secunde de pe telefon și confirmi tu dacă s-a rezolvat." },
    echipa: { label: "Echipă primărie", plural: "Echipe primărie", icon: "🦺", pitch: "Vezi pe hartă ce e nou, preiei și marchezi rezolvat." },
  },
  flow: {
    requester: "cetatean",
    initial: "raportat",
    states: [
      { id: "raportat", label: "raportat", tone: "open" },
      { id: "preluat", label: "preluat", tone: "progress" },
      { id: "rezolvat", label: "rezolvat, de confirmat", tone: "waiting" },
      { id: "confirmat", label: "confirmat de cetățean", tone: "done" },
      { id: "nerezolvat", label: "nerezolvat", tone: "failed" },
      { id: "respins", label: "respins", tone: "failed" },
    ],
    transitions: [
      { id: "preia", label: "Preiau", done: "a preluat", from: ["raportat"], to: "preluat", role: "echipa", notify: { role: "cetatean", message: (c) => `${c.by} a preluat sesizarea „${c.title}”.` } },
      { id: "respinge", label: "Nu e la noi", done: "a respins", from: ["raportat"], to: "respins", role: "echipa", note: "required", danger: true, notify: { role: "cetatean", message: (c) => `Sesizarea „${c.title}” a fost respinsă: ${c.note}.` } },
      { id: "rezolva", label: "Marchează rezolvat", done: "a marcat rezolvat", from: ["preluat"], to: "rezolvat", role: "echipa", notify: { role: "cetatean", message: (c) => `${c.by} spune că „${c.title}” e rezolvat. Ai verificat? ${c.link}` } },
      { id: "confirma", label: "Da, s-a rezolvat", done: "a confirmat că s-a rezolvat", from: ["rezolvat"], to: "confirmat", role: "cetatean", outcome: "done", notify: { role: "echipa", message: (c) => `${c.requester} a confirmat „${c.title}”. Închis.` } },
      { id: "nerezolvat", label: "Nu s-a rezolvat", done: "spune că nu s-a rezolvat", from: ["rezolvat"], to: "nerezolvat", role: "cetatean", outcome: "failed", note: "optional", danger: true, notify: { role: "echipa", message: (c) => `${c.requester} spune că „${c.title}” nu s-a rezolvat${c.note ? `: ${c.note}` : ""}.` } },
      { id: "reia", label: "Reiau lucrarea", done: "a reluat lucrarea", from: ["nerezolvat"], to: "preluat", role: "echipa" },
    ],
  },
  request: {
    singular: "sesizare",
    plural: "sesizări",
    addTitle: "Ce ai observat? (scrie cum ai spune-o)",
    addPlaceholder: "ex: Groapă mare pe Str. Avrig colț cu Bd. Pache Protopopescu, a spart deja două roți",
    offerTitle: "",
    offerPlaceholder: "",
    aiContext: "Sesizări ale cetățenilor din Sectorul 2 și 3 al Bucureștiului: gropi, iluminat public, gunoi.",
  },
  categories: [
    { id: "groapa", label: "groapă", color: "#ef4444", icon: "🕳️" },
    { id: "iluminat", label: "iluminat", color: "#f59e0b", icon: "💡" },
    { id: "gunoi", label: "gunoi", color: "#22c55e", icon: "🗑️" },
    { id: "altele", label: "altele", color: "#94a3b8", icon: "📍" },
  ],
  points: { role: "echipa", base: 0, perUnit: 0, maxUnits: 0, urgency: [1, 1, 1, 1, 1], disputePenalty: 0 },
  ranks: [{ name: "—", min: 0, frame: "#94a3b8" }],
  trust: { suspendAfterDisputes: 99 },
  reports: {
    enabled: true,
    toRequest: true,
    title: "Raportează de pe telefon",
    prompt: "Ce vezi chiar aici?",
    types: [
      { id: "groapa", label: "Groapă în carosabil", icon: "🕳️", color: "#ef4444", urgency: 4 },
      { id: "iluminat", label: "Bec stins", icon: "💡", color: "#f59e0b", urgency: 3 },
      { id: "gunoi", label: "Gunoi nestrâns", icon: "🗑️", color: "#22c55e", urgency: 2 },
    ],
    freshMinutes: 60,
    expireMinutes: 24 * 60,
  },
  notify: { channel: "sms" },
  features: { map: true, gamification: false, matching: false, optionalModules: true },
  mascot: {
    enabled: true,
    name: "Țepi",
    color: "#8b5e3c",
    persona: "un arici de cartier care spune scurt ce s-a raportat, cine s-a ocupat și cât a durat",
    tour: true,
    hiddenOn: ["/business", "/survey", "/start"],
  },
  seed: {
    people: [
      { handle: "ana-cetatean", name: "Ana Georgescu", role: "cetatean", phone: "0722 000 801", area: "Obor" },
      { handle: "dan-cetatean", name: "Dan Iliescu", role: "cetatean", phone: "0722 000 802", area: "Titan" },
      { handle: "mihaela-cetatean", name: "Mihaela Rusu", role: "cetatean", phone: "0722 000 803", area: "Vatra Luminoasă" },
      { handle: "sorin-cetatean", name: "Sorin Matei", role: "cetatean", phone: "0722 000 804", area: "Dristor" },
      { handle: "echipa-drumuri", name: "Echipa Drumuri", role: "echipa", phone: "0722 000 901", area: "Administrația străzilor" },
      { handle: "echipa-iluminat", name: "Echipa Iluminat", role: "echipa", phone: "0722 000 902", area: "Iluminat public" },
      { handle: "dispecer-salubritate", name: "Dispecerat Salubritate", role: "echipa", phone: "0722 000 903", area: "Salubritate" },
    ],
    requests: [
      { title: "Groapă adâncă la trecerea de pietoni", category: "groapa", description: "Lângă stația de tramvai.", quantity: 1, unit: "sesizare", urgency: 4, address: "Șos. Mihai Bravu, Obor", lat: 44.4489, lng: 26.1297, requester: "ana-cetatean", hoursAgo: 3 },
      { title: "Bec stins pe toată aleea", category: "iluminat", description: "E beznă de 3 seri.", quantity: 1, unit: "sesizare", urgency: 3, address: "Aleea Barajul Lotrului, Titan", lat: 44.4241, lng: 26.1708, requester: "dan-cetatean", hoursAgo: 30 },
      { title: "Containere pline de o săptămână", category: "gunoi", description: "La blocul 12.", quantity: 1, unit: "sesizare", urgency: 2, address: "Str. Avrig, Vatra Luminoasă", lat: 44.4436, lng: 26.1441, requester: "mihaela-cetatean", hoursAgo: 52, steps: [["preia", "dispecer-salubritate", undefined, 60 * 20]] },
      { title: "Groapă pe banda întâi", category: "groapa", description: "Mașinile frânează brusc.", quantity: 1, unit: "sesizare", urgency: 4, address: "Bd. Camil Ressu, Dristor", lat: 44.4187, lng: 26.1408, requester: "sorin-cetatean", hoursAgo: 74, steps: [["preia", "echipa-drumuri", undefined, 60 * 4], ["rezolva", "echipa-drumuri", undefined, 60 * 40]] },
      { title: "Felinar căzut", category: "iluminat", description: "Stâlp înclinat peste trotuar.", quantity: 1, unit: "sesizare", urgency: 4, address: "Str. Ziduri Moși, Obor", lat: 44.4521, lng: 26.1219, requester: "ana-cetatean", hoursAgo: 120, steps: [["preia", "echipa-iluminat", undefined, 60 * 2], ["rezolva", "echipa-iluminat", undefined, 60 * 26], ["confirma", "ana-cetatean", undefined, 60 * 3]] },
      { title: "Moloz lăsat pe trotuar", category: "gunoi", description: "După renovarea unui apartament.", quantity: 1, unit: "sesizare", urgency: 2, address: "Str. Lizeanu, Obor", lat: 44.4467, lng: 26.1206, requester: "mihaela-cetatean", hoursAgo: 160, steps: [["preia", "dispecer-salubritate", undefined, 60 * 30], ["rezolva", "dispecer-salubritate", undefined, 60 * 48], ["nerezolvat", "mihaela-cetatean", "Au luat doar jumătate", 60 * 5]] },
      { title: "Capac de canal lipsă", category: "groapa", description: "Pericol pentru bicicliști.", quantity: 1, unit: "sesizare", urgency: 5, address: "Str. Baba Novac, Titan", lat: 44.4262, lng: 26.1452, requester: "dan-cetatean", hoursAgo: 200, steps: [["preia", "echipa-drumuri", undefined, 45], ["rezolva", "echipa-drumuri", undefined, 60 * 8], ["confirma", "dan-cetatean", undefined, 60 * 2]] },
      { title: "Parcare pe spațiul verde", category: "altele", description: "Mașini parcate pe iarbă.", quantity: 1, unit: "sesizare", urgency: 2, address: "Str. Fizicienilor, Titan", lat: 44.4198, lng: 26.1569, requester: "sorin-cetatean", hoursAgo: 90, steps: [["respinge", "dispecer-salubritate", "E la Poliția Locală, am redirecționat", 60 * 6]] },
    ],
    reports: [],
  },
});
