// Gândirea de business, structurată: problemă → cine plătește → cum ajunge la oameni.
// Schema e folosită de AI ca să genereze un „business canvas" pentru ideea voastră,
// iar întrebările de validare merg direct în sondajul live (/survey).

import { z } from "zod";

export const SurveyQuestion = z.object({
  question: z.string(),
  type: z.enum(["yes_no", "scale", "choice", "text"]).describe("scale = 1..5"),
  choices: z.array(z.string()).describe("doar pentru type=choice; altfel listă goală"),
});
export type SurveyQuestion = z.infer<typeof SurveyQuestion>;

export const BusinessCanvas = z.object({
  one_liner: z.string().describe("„Ajutăm [cine] să [ce] fără [durere]” — o propoziție"),
  problem: z.object({
    statement: z.string().describe("problema concretă, nu soluția"),
    who_suffers: z.string().describe("o persoană anume, nu „toată lumea”"),
    how_often: z.string().describe("cât de des apare și cât costă (timp/bani) de fiecare dată"),
    current_workaround: z.string().describe("ce fac oamenii azi în loc"),
  }),
  customers: z.object({
    user: z.string().describe("cine folosește produsul"),
    buyer: z.string().describe("cine plătește (poate fi altcineva decât utilizatorul)"),
    early_adopters: z.string().describe("primii 10 clienți: cine sunt și unde îi găsiți"),
  }),
  value_proposition: z.string(),
  mvp: z.string().describe("ce arătați în demo, în 1-2 propoziții"),
  business_model: z.object({
    model: z.enum(["B2C freemium", "B2C abonament", "B2B SaaS", "B2G (instituții publice)", "marketplace / comision", "licențiere", "sponsorizare / granturi"]),
    pricing: z.string().describe("preț concret, ex: 9 €/lună/echipă"),
    why_they_pay: z.string().describe("ce economisesc sau câștigă, cuantificat"),
  }),
  market: z.object({
    first_segment: z.string().describe("primul segment, mic și concret (ex: cele 1.200 de ONG-uri active din București)"),
    sizing: z.string().describe("estimare bottom-up: nr. clienți × preț = venit anual posibil, cu pașii de calcul"),
  }),
  adoption: z.object({
    channels: z.array(z.string()).describe("cum ajung primii utilizatori la voi"),
    friction: z.array(z.string()).describe("ce i-ar opri să-l adopte"),
    hook: z.string().describe("de ce l-ar folosi din nou a doua zi"),
  }),
  competition: z.array(z.object({ name: z.string(), gap: z.string().describe("ce nu face și facem noi") })),
  risks: z.array(z.object({ risk: z.string(), mitigation: z.string() })),
  metrics: z.array(z.string()).describe("2-3 metrici care arată că merge"),
  judge_questions: z.array(z.object({ question: z.string(), answer: z.string() })).describe("întrebările grele pe care le va pune juriul, cu răspuns"),
  validation_survey: z.array(SurveyQuestion).describe("3-5 întrebări de pus participanților la hackathon ca să validați problema și disponibilitatea de plată"),
});
export type BusinessCanvas = z.infer<typeof BusinessCanvas>;

export const BUSINESS_SYSTEM_PROMPT = [
  "Ești mentor de startup și juriu la hackathoane. Primești o idee de produs și construiești un business canvas onest.",
  "Fii concret și local (România, prețuri în lei sau euro), cu cifre estimate și pașii de calcul. Nu umfla piața: preferă un prim segment mic și real.",
  "Distinge clar între cine folosește și cine plătește. Numește concurența reală, inclusiv „nu face nimic” sau „Excel/WhatsApp”.",
  "Întrebările juriului trebuie să fie cele incomode (de ce n-a făcut-o deja Adobe/Google? de ce ar plăti?).",
  "Întrebările de validare trebuie să poată fi puse oricui la hackathon în 30 de secunde și să testeze problema și disponibilitatea de plată, nu să ceară laude.",
  "Răspunde în română.",
].join(" ");

/** Exportă canvas-ul ca Markdown (pentru slide-uri, README sau Devpost). */
export function canvasToMarkdown(c: BusinessCanvas, title = "Business canvas"): string {
  const list = (items: string[]) => items.map((i) => `- ${i}`).join("\n");
  return [
    `# ${title}`,
    `> ${c.one_liner}`,
    `## Problema\n${c.problem.statement}\n\n- **Cine suferă:** ${c.problem.who_suffers}\n- **Cât de des / cât costă:** ${c.problem.how_often}\n- **Ce fac azi:** ${c.problem.current_workaround}`,
    `## Clienți\n- **Utilizator:** ${c.customers.user}\n- **Cine plătește:** ${c.customers.buyer}\n- **Primii clienți:** ${c.customers.early_adopters}`,
    `## Propunerea de valoare\n${c.value_proposition}\n\n**MVP / demo:** ${c.mvp}`,
    `## Model de business\n- **Model:** ${c.business_model.model}\n- **Preț:** ${c.business_model.pricing}\n- **De ce plătesc:** ${c.business_model.why_they_pay}`,
    `## Piață\n- **Primul segment:** ${c.market.first_segment}\n- **Dimensionare:** ${c.market.sizing}`,
    `## Adopție\n**Canale**\n${list(c.adoption.channels)}\n\n**Frecare**\n${list(c.adoption.friction)}\n\n**De ce revin:** ${c.adoption.hook}`,
    `## Concurență\n${list(c.competition.map((x) => `**${x.name}** — ${x.gap}`))}`,
    `## Riscuri\n${list(c.risks.map((r) => `${r.risk} → ${r.mitigation}`))}`,
    `## Metrici\n${list(c.metrics)}`,
    `## Întrebări de la juriu\n${c.judge_questions.map((q) => `**${q.question}**\n${q.answer}`).join("\n\n")}`,
  ].join("\n\n");
}

export const exampleCanvas: BusinessCanvas = {
  one_liner: "Ajutăm asociațiile de proprietari și ONG-urile mici să facă afișe clare în 20 de secunde, dictând un mesaj vocal.",
  problem: {
    statement: "Anunțurile din blocuri și de la ONG-urile mici sunt scrise de mână sau în Word, greu de citit și ignorate.",
    who_suffers: "Administratorul de bloc (55+ ani) care trebuie să anunțe o întrerupere de apă.",
    how_often: "De 2-4 ori pe lună; 20-40 de minute de fiecare dată, plus apeluri de la locatarii care n-au văzut anunțul.",
    current_workaround: "Word + imprimantă, poze pe grupul de WhatsApp, sau o foaie scrisă de mână.",
  },
  customers: {
    user: "Administratori de bloc, voluntari ONG, bibliotecari",
    buyer: "Firmele de administrare imobile (gestionează 50-300 de blocuri fiecare)",
    early_adopters: "3 firme de administrare din sectorul 3, contactate prin asociația de profil",
  },
  value_proposition: "Afiș accesibil și editabil din vocea ta, în 20 de secunde, fără să știi design.",
  mvp: "Dictezi anunțul → apare afișul editabil → îl tipărești sau îl trimiți pe WhatsApp prin QR.",
  business_model: {
    model: "B2B SaaS",
    pricing: "15 €/lună per firmă de administrare, nelimitat",
    why_they_pay: "Economisesc ~10 ore/lună de lucru administrativ și mai puține apeluri de la locatari.",
  },
  market: {
    first_segment: "Firmele de administrare imobile din București (~400)",
    sizing: "400 firme × 15 € × 12 luni ≈ 72.000 €/an în București; ~5× la nivel național.",
  },
  adoption: {
    channels: ["Demo la asociația administratorilor", "Parteneriat cu un furnizor de software de facturare pentru blocuri", "Afișele generate poartă un mic QR „făcut cu …”"],
    friction: ["Utilizatori mai puțin tehnici", "Imprimanta din birou"],
    hook: "Șabloanele salvate per bloc: următorul anunț durează 5 secunde.",
  },
  competition: [
    { name: "Canva / Adobe Express", gap: "Prea multe opțiuni pentru un administrator; nu pornește de la voce" },
    { name: "Word + WhatsApp", gap: "Gratuit, dar lent și neaccesibil" },
  ],
  risks: [
    { risk: "Recunoașterea vocală în română greșește nume de străzi", mitigation: "Ecran de confirmare + editare directă" },
    { risk: "Firmele nu plătesc pentru „încă o aplicație”", mitigation: "Integrare în software-ul de facturare pe care îl folosesc deja" },
  ],
  metrics: ["Afișe generate/săptămână per firmă", "Timp de la mesaj la afiș tipărit", "Retenție la 30 de zile"],
  judge_questions: [
    { question: "De ce n-ar face asta Adobe Express?", answer: "Express e pentru oameni care vor să creeze; noi suntem pentru cei care vor doar ca anunțul să fie gata. Putem fi chiar un add-on Express." },
    { question: "De ce ar plăti cineva 15 €?", answer: "Pentru că firma de administrare plătește orele angajaților; economia e de ~10 ore/lună." },
  ],
  validation_survey: [
    { question: "Ai văzut în ultima lună un anunț de bloc greu de citit?", type: "yes_no", choices: [] },
    { question: "Cât de enervant e să afli prea târziu de o întrerupere?", type: "scale", choices: [] },
    { question: "Cât ar plăti lunar o firmă de administrare pentru asta?", type: "choice", choices: ["0 €", "5 €", "15 €", "30 €+"] },
  ],
};
