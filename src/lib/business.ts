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

// Exemplu (ipoteze de validat, nu cifre verificate): marcați în pitch ce ați confirmat cu oameni reali.
export const exampleCanvas: BusinessCanvas = {
  one_liner: "Ajutăm firmele mici care licitează în SEAP să afle în 10 minute, cu citate din document, dacă pot participa la o licitație.",
  problem: {
    statement: "Caietele de sarcini au zeci de pagini, iar o singură cerință ratată (un document, o cifră de afaceri minimă, un termen) descalifică oferta.",
    who_suffers: "Administratorul unei firme de IT cu 5–20 de angajați, care face și ofertele.",
    how_often: "La fiecare licitație analizată: de verificat cu firmele, ipoteza noastră e 1–2 zile de muncă pe caiet.",
    current_workaround: "Citit manual, consultanți în achiziții publice plătiți pe procedură sau renunțarea la licitații.",
  },
  customers: {
    user: "Persoana care pregătește ofertele într-o firmă mică",
    buyer: "Administratorul firmei, care plătește deja consultanți sau ore de muncă",
    early_adopters: "Firme mici de IT și servicii care au licitat în ultimul an (căutate în anunțurile de atribuire publice)",
  },
  value_proposition: "Lista cerințelor, a documentelor și a termenelor dintr-un caiet de sarcini, fiecare cu citatul și pagina din document.",
  mvp: "Încarci caietul de sarcini → primești structura, răspunsuri cu citate verificate și secțiunile importante pentru firma ta.",
  business_model: {
    model: "B2B SaaS",
    pricing: "ipoteză: 49 €/lună sau 15 € per caiet analizat (de testat cu întrebarea din sondaj)",
    why_they_pay: "Costă mai puțin decât o zi de muncă sau un consultant pe procedură; o descalificare evitată acoperă abonamentul pe ani.",
  },
  market: {
    first_segment: "Firmele mici de IT din București care au depus cel puțin o ofertă în SEAP în ultimul an",
    sizing: "număr firme (din datele publice de atribuire, de numărat) × preț × 12 luni; calculul se face pe date reale, nu pe estimări",
  },
  adoption: {
    channels: ["Asociațiile de firme IT și camerele de comerț", "Consultanții în achiziții, ca partener care analizează mai repede", "Conținut gratuit: „ce cer de obicei caietele de sarcini pentru IT”"],
    friction: ["Încrederea în AI pentru un document cu consecințe legale", "Caiete scanate, fără text"],
    hook: "Alertă când apare o licitație nouă care se potrivește profilului firmei.",
  },
  competition: [
    { name: "Consultanții în achiziții publice", gap: "Scumpi și lenți pentru o firmă care doar vrea să afle dacă merită să participe" },
    { name: "Citit manual / ChatGPT", gap: "Fără citate verificate: un răspuns greșit poate costa descalificarea" },
  ],
  risks: [
    { risk: "AI-ul ratează o cerință", mitigation: "Fiecare răspuns are citatul căutat în text; produsul nu înlocuiește verificarea finală" },
    { risk: "Caiete scanate (imagini)", mitigation: "OCR (de exemplu Adobe PDF Services) ca pas următor" },
  ],
  metrics: ["Timp până la decizia „participăm sau nu”", "Caiete analizate pe firmă pe lună", "Cerințe ratate (raportate de utilizatori)"],
  judge_questions: [
    { question: "Ce se întâmplă dacă AI-ul greșește o cerință?", answer: "Fiecare răspuns are citatul exact, căutat automat în document; dacă nu există, e marcat. Decizia finală rămâne a omului." },
    { question: "De ce n-ar face asta Adobe cu Acrobat AI Assistant?", answer: "Acrobat răspunde la întrebări generale; noi știm ce contează într-o licitație din România (DUAE, garanții, criterii) și verificăm citatele." },
  ],
  validation_survey: [
    { question: "Firma ta (sau una în care ai lucrat) a participat la o licitație publică în ultimul an?", type: "yes_no", choices: [] },
    { question: "Cât de greu a fost să afli ce cere caietul de sarcini?", type: "scale", choices: [] },
    { question: "Cât ar plăti lunar o firmă mică pentru asta?", type: "choice", choices: ["0 €", "20 €", "50 €", "100 €+"] },
  ],
};
