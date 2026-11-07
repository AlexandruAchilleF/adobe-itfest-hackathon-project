// Spire: agentul care apare peste orice site și reface stilul ales pe marca omului.
// Scenariul ține textele, pitch-ul și verificările; fluxul real stă în /nou și /campanii.
// Plătitorul: ipoteză de verificat la interviuri. Dovezile rămân goale până vorbim cu oameni reali.

import { defineScenario } from "../types";

export const spire = defineScenario({
  id: "spire",
  app: {
    name: "Spire",
    tagline: "Ai văzut un design care îți place? Spire îl face pe marca ta.",
    headline: "Ai văzut un design care îți place? *Spire îl face pe marca ta.*",
    notThis: "Nu încă zece prompturi într-un chat",
    impactLabel: "materiale verificate",
    center: { lat: 44.4268, lng: 26.1025 },
  },
  business: {
    problem: "Postarea trebuie să iasă azi, n-ai designer la îndemână, iar ce faci singur arată amator și nu respectă brandul.",
    payer: "Ipoteza noastră: plătește firma, cu un abonament, în locul orelor de designer sau de agenție. Prețul nu e validat încă.",
    evidence: [],
  },
  roles: {
    marketing: { label: "Om de marketing", plural: "Oameni de marketing", icon: "", pitch: "Alegi un stil de pe orice site și primești kitul de campanie pe marca ta." },
  },
  flow: {
    requester: "marketing",
    initial: "ciorna",
    states: [
      { id: "ciorna", label: "ciornă", tone: "open" },
      { id: "verificat", label: "verificat", tone: "done" },
      { id: "respins", label: "garda a respins", tone: "failed" },
    ],
    transitions: [
      { id: "verifica", label: "Marchează verificat", done: "a verificat", from: ["ciorna"], to: "verificat", role: "marketing", outcome: "done" },
      { id: "respinge", label: "Garda a respins", done: "garda a respins", from: ["ciorna"], to: "respins", role: "marketing", outcome: "failed", danger: true, note: "optional" },
    ],
  },
  request: {
    singular: "campanie",
    plural: "campanii",
    addTitle: "Ce promovezi?",
    addPlaceholder: "ex: Gelato de iarnă, 20% reducere azi",
    offerTitle: "",
    offerPlaceholder: "",
    aiContext: "Materiale de campanie pentru marketingul unei firme: postări, story-uri și secțiuni de landing page.",
  },
  categories: [
    { id: "campanie", label: "campanie", color: "#d9583f", icon: "" },
    { id: "altele", label: "altele", color: "#94a3b8", icon: "" },
  ],
  points: { role: "marketing", base: 0, perUnit: 0, maxUnits: 0, urgency: [1, 1, 1, 1, 1], disputePenalty: 0 },
  ranks: [{ name: "—", min: 0, frame: "#94a3b8" }],
  trust: { suspendAfterDisputes: 99 },
  reports: { enabled: false, title: "", prompt: "", types: [], freshMinutes: 30, expireMinutes: 180 },
  notify: { channel: "email" },
  features: { map: false, gamification: false, matching: false, optionalModules: false },
  mascot: {
    enabled: true,
    character: true,
    name: "Spire",
    color: "#d9583f",
    persona: "un uliu care apare peste site-ul pe care îl vezi, se uită la el și îți spune pe scurt ce a găsit util pentru campania ta",
    tour: false,
    hiddenOn: ["/business", "/survey", "/start"],
  },
  nav: [
    { href: "/acasa", label: "Acasă" },
    { href: "/campanii", label: "Campanii" },
    { href: "/marca", label: "Marca" },
  ],
  landing: true,
  seed: {
    people: [
      { handle: "ioana", name: "Ioana Dobre", role: "marketing", phone: "0722 002 101", area: "Marketing" },
      { handle: "radu", name: "Radu Stan", role: "marketing", phone: "0722 002 102", area: "Marketing" },
    ],
    requests: [
      { title: "Gelato de iarnă, kit de campanie", category: "campanie", description: "Postare și story, cu Pip în stilul referinței.", quantity: 2, unit: "formate", urgency: 3, requester: "ioana", hoursAgo: 26, steps: [["verifica", "ioana", undefined, 40]] },
      { title: "Weekend cu 2 cupe, ciornă", category: "campanie", description: "Postare, încă nesalvată pentru export.", quantity: 1, unit: "format", urgency: 2, requester: "radu", hoursAgo: 3 },
    ],
    reports: [],
  },
});
