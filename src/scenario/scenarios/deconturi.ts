// Scenariul exemplu de birou: deconturile unei firme mici (bonuri de taxi, deplasări, mese).
// Plătitorul e clar: firma, care plătește deja orele contabilului sau firma de contabilitate.
// Cifrele de durere NU sunt de la oameni reali încă: se completează din interviuri (business.evidence).

import { defineScenario } from "../types";

const doc = (vendor: string, cui: string, number: string, date: string, lines: Array<[string, number]>) => ({
  doc: { kind: "bon", vendor, cui, number, date, currency: "lei", lines: lines.map(([label, amount]) => ({ label, amount })), total: lines.reduce((s, [, a]) => s + a, 0) },
});
// datele bonurilor din seed: cu câteva zile înainte de încărcare, ca să fie mereu „în termen”
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

export const deconturi = defineScenario({
  id: "deconturi",
  app: {
    name: "Decontul",
    tagline: "Ajutăm angajații unei firme mici să-și primească banii pe bonuri în zile, nu în săptămâni, fără ca contabilul să verifice fiecare bon de mână.",
    impactLabel: "lei rambursați",
    center: { lat: 44.4268, lng: 26.1025 },
  },
  business: {
    problem: "Bonurile de taxi, deplasări și mese circulă pe hârtie și pe email. Contabilul verifică de mână sume, coduri fiscale și duplicate, iar angajatul așteaptă banii fără să știe la cine stă decontul.",
    payer: "Firma (administratorul sau directorul financiar), care plătește deja orele contabilului sau firma de contabilitate. De verificat la interviuri: câte deconturi pe lună, cât durează unul, câte se întorc.",
    evidence: [],
  },
  roles: {
    angajat: { label: "Angajat", plural: "Angajați", icon: "🧑‍💼", pitch: "Fotografiezi bonul, vezi pe loc dacă e în regulă și știi la cine stă decontul." },
    manager: { label: "Manager", plural: "Manageri", icon: "✅", pitch: "Aprobi în 10 secunde, cu verificările deja făcute." },
    contabil: { label: "Contabil", plural: "Contabili", icon: "🧾", pitch: "Plătești doar ce e verificat și aprobat, fără bonuri pierdute." },
  },
  flow: {
    requester: "angajat",
    initial: "trimis",
    states: [
      { id: "trimis", label: "la aprobare", tone: "open" },
      { id: "de-corectat", label: "de corectat", tone: "returned" },
      { id: "aprobat", label: "aprobat, de plătit", tone: "progress" },
      { id: "platit", label: "plătit", tone: "waiting" },
      { id: "incasat", label: "încasat", tone: "done" },
      { id: "neincasat", label: "banii n-au ajuns", tone: "failed" },
    ],
    transitions: [
      { id: "aproba", label: "Aprobă", done: "a aprobat", from: ["trimis"], to: "aprobat", role: "manager", notify: { role: "angajat", message: (c) => `${c.by} a aprobat „${c.title}” (${c.quantity}). Urmează plata.` } },
      { id: "returneaza", label: "Trimite înapoi", done: "a trimis înapoi", from: ["trimis"], to: "de-corectat", role: "manager", note: "required", danger: true, notify: { role: "angajat", message: (c) => `${c.by} a trimis înapoi „${c.title}”: ${c.note}. Corectează în aplicație.` } },
      { id: "retrimite", label: "Am corectat, retrimite", done: "a corectat și a retrimis", from: ["de-corectat"], to: "trimis", role: "angajat", notify: { role: "manager", message: (c) => `${c.requester} a corectat „${c.title}”. Îl poți aproba.` } },
      { id: "plateste", label: "Marchează plătit", done: "a plătit", from: ["aprobat"], to: "platit", role: "contabil", notify: { role: "angajat", message: (c) => `Ți-am virat ${c.quantity} pentru „${c.title}”. Ai primit banii? ${c.link}` } },
      { id: "incaseaza", label: "Am primit banii", done: "a confirmat că a primit banii", from: ["platit"], to: "incasat", role: "angajat", outcome: "done", notify: { role: "contabil", message: (c) => `${c.requester} a confirmat încasarea pentru „${c.title}”. Decont închis.` } },
      { id: "neincasat", label: "N-am primit banii", done: "spune că n-a primit banii", from: ["platit"], to: "neincasat", role: "angajat", outcome: "failed", note: "optional", danger: true, notify: { role: "contabil", message: (c) => `${c.requester} spune că n-a primit banii pentru „${c.title}”${c.note ? `: ${c.note}` : ""}. Verifică plata.` } },
      { id: "replateste", label: "Am verificat, plătit din nou", done: "a refăcut plata", from: ["neincasat"], to: "platit", role: "contabil", notify: { role: "angajat", message: (c) => `Am refăcut plata de ${c.quantity} pentru „${c.title}”. Confirmă aici: ${c.link}` } },
    ],
  },
  request: {
    singular: "decont",
    plural: "deconturi",
    addTitle: "Decont nou",
    addPlaceholder: "",
    offerTitle: "",
    offerPlaceholder: "",
    aiContext: "Deconturi de cheltuieli ale angajaților unei firme mici din București: taxi, deplasări, mese cu clienți, materiale.",
  },
  categories: [
    { id: "taxi", label: "taxi", color: "#f59e0b", icon: "🚕" },
    { id: "deplasare", label: "deplasare", color: "#38bdf8", icon: "🚆" },
    { id: "masa", label: "masă cu clienți", color: "#a855f7", icon: "🍽️" },
    { id: "materiale", label: "materiale", color: "#22c55e", icon: "📦" },
    { id: "altele", label: "altele", color: "#94a3b8", icon: "🧾" },
  ],
  documents: {
    enabled: true,
    title: "Bonul sau factura",
    rules: { maxAgeDays: 30, limits: { taxi: 150, masa: 200, materiale: 500 }, requireCui: true },
    sample: `TAXI RAPID EXEMPLU SRL
C.U.I. RO31845676
Nr. bon 0418   Data ${daysAgo(2).split("-").reverse().join(".")}
Cursă Piața Victoriei - Otopeni 70,00 lei
Taxă bagaj 8,00 lei
TOTAL 87,00`,
  },
  points: { role: "contabil", base: 0, perUnit: 0, maxUnits: 0, urgency: [1, 1, 1, 1, 1], disputePenalty: 0 },
  ranks: [{ name: "—", min: 0, frame: "#94a3b8" }],
  trust: { suspendAfterDisputes: 99 },
  reports: { enabled: false, title: "", prompt: "", types: [], freshMinutes: 30, expireMinutes: 180 },
  notify: { channel: "sms" },
  features: { map: false, gamification: false, matching: false, optionalModules: true },
  mascot: {
    enabled: true,
    name: "Bonița",
    color: "#0ea5e9",
    persona: "o colegă de birou calmă și precisă, care verifică bonurile și spune exact ce nu iese, fără glume",
    tour: true,
    hiddenOn: ["/business", "/survey", "/start"],
  },
  seed: {
    people: [
      { handle: "andrei", name: "Andrei Munteanu", role: "angajat", phone: "0722 000 301", area: "Vânzări" },
      { handle: "ioana", name: "Ioana Petrescu", role: "angajat", phone: "0722 000 302", area: "Vânzări" },
      { handle: "radu", name: "Radu Neagu", role: "angajat", phone: "0722 000 303", area: "Tehnic" },
      { handle: "bianca", name: "Bianca Stoica", role: "angajat", phone: "0722 000 304", area: "Marketing" },
      { handle: "maria", name: "Maria Constantin", role: "manager", phone: "0722 000 401", area: "Director vânzări" },
      { handle: "victor", name: "Victor Dumitru", role: "manager", phone: "0722 000 402", area: "Director tehnic" },
      { handle: "irina", name: "Irina Vasile", role: "contabil", phone: "0722 000 501", area: "Contabilitate" },
    ],
    requests: [
      { title: "Taxi la client, Pipera", category: "taxi", description: "Întâlnire cu clientul din Pipera", quantity: 46.5, unit: "lei", urgency: 3, requester: "ioana", hoursAgo: 52, extra: doc("Taxi Rapid Exemplu SRL", "31845676", "0377", daysAgo(3), [["Cursă Victoriei - Pipera", 46.5]]) },
      { title: "Tren Brașov, prezentare", category: "deplasare", description: "Dus-întors București - Brașov", quantity: 118, unit: "lei", urgency: 3, requester: "radu", hoursAgo: 30, extra: doc("Călătorii Exemplu SA", "16509346", "B-88123", daysAgo(4), [["Bilet dus", 59], ["Bilet întors", 59]]) },
      { title: "Prânz cu clientul", category: "masa", description: "Negociere contract", quantity: 236, unit: "lei", urgency: 3, requester: "andrei", hoursAgo: 6, extra: doc("Bistro Exemplu SRL", "28753106", "1122", daysAgo(1), [["Meniu zilei x2", 98], ["Desert x2", 46], ["Băuturi", 92]]) },
      { title: "Cartușe imprimantă", category: "materiale", description: "Pentru biroul de vânzări", quantity: 189.9, unit: "lei", urgency: 2, requester: "bianca", hoursAgo: 75, steps: [["returneaza", "maria", "Factura e pe persoană fizică, cere-o pe firmă", 60 * 20]], extra: doc("Birotica Exemplu SRL", "41298762", "F-2044", daysAgo(5), [["Cartuș negru", 109.9], ["Cartuș color", 80]]) },
      { title: "Taxi aeroport", category: "taxi", description: "Zbor Cluj, conferință", quantity: 92, unit: "lei", urgency: 3, requester: "andrei", hoursAgo: 98, steps: [["aproba", "maria", undefined, 60 * 26]], extra: doc("Taxi Rapid Exemplu SRL", "31845676", "0291", daysAgo(6), [["Cursă Unirii - Otopeni", 92]]) },
      { title: "Cazare Cluj", category: "deplasare", description: "O noapte, conferință", quantity: 320, unit: "lei", urgency: 3, requester: "radu", hoursAgo: 140, steps: [["aproba", "victor", undefined, 60 * 30], ["plateste", "irina", undefined, 60 * 50]], extra: doc("Hotel Exemplu SRL", "33612057", "H-5521", daysAgo(8), [["Cazare 1 noapte", 290], ["Taxă locală", 30]]) },
      { title: "Materiale târg", category: "materiale", description: "Bannere pentru stand", quantity: 410, unit: "lei", urgency: 3, requester: "bianca", hoursAgo: 200, steps: [["aproba", "maria", undefined, 60 * 40], ["plateste", "irina", undefined, 60 * 70], ["incaseaza", "bianca", undefined, 60 * 5]], extra: doc("Print Exemplu SRL", "29577130", "P-0912", daysAgo(10), [["Banner 2x1 m", 260], ["Roll-up", 150]]) },
      { title: "Benzină deplasare Ploiești", category: "deplasare", description: "Vizită la client", quantity: 210, unit: "lei", urgency: 3, requester: "ioana", hoursAgo: 260, steps: [["aproba", "maria", undefined, 60 * 52], ["plateste", "irina", undefined, 60 * 96], ["incaseaza", "ioana", undefined, 60 * 8]], extra: doc("Carburanți Exemplu SA", "16509346", "C-77810", daysAgo(12), [["Benzină 30 l", 210]]) },
    ],
    reports: [],
  },
});
