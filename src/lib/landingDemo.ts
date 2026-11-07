// Datele machetelor de pe landing page, calculate de aceleași funcții ca aplicația. Logică pură.
//  - site-ul de referință (o pagină a noastră, făcută pentru demo) ca elemente citite de extensie:
//    alegerile și fraza lui Spire ies din campaignCandidates și foundSentence;
//  - întrebările ies din questionsFor, pe anatomia campaniei de exemplu;
//  - bucla gărzii rulează runAgentLoop cu guardCampaign. Doar prima variantă de text e scrisă
//    intenționat greșit (oferta din altă variantă), ca să se vadă cum o prinde codul și cum se corectează.
import { runAgentLoop } from "./agentLoop";
import type { Brand } from "./brand";
import { type CampaignPick, campaignCandidates } from "./campaign";
import { type Campaign, type Designs, guardCampaign } from "./campaigns";
import { compose, type Copy, copyFromAnswers } from "./compose";
import type { PageElement } from "./extensionBridge";
import { foundSentence } from "./extensionPanel";
import { type Question, questionsFor } from "./gaps";
import type { Check } from "./guard";

/** Ilustrația măsurată de gardă; `undefined` = nemăsurată (garda nu adaugă verificările ilustrației). */
export type Measured = { colors: string[]; hashDistance: number } | null | undefined;

const style = (background = "rgba(0, 0, 0, 0)", color = "rgb(43, 29, 20)") => ({ color, background, fontFamily: "Geist", fontSize: "16px", fontWeight: "400" });

/** Pagina de referință din machetă: adresa e pe domeniul rezervat `.example`, nu a unei firme reale. */
export const DEMO_SITE = {
  url: "referinta.example/ceai-rece",
  title: "Ceai rece",
  viewport: { w: 1440, h: 1080 },
  elements: [
    { id: "el-0", tag: "section", text: "Ceai rece -30% azi la orice ceai rece Comandă acum", box: { x: 0, y: 96, w: 1440, h: 984 }, styles: style("rgb(244, 227, 193)"), inFirstScreen: true },
    { id: "el-1", tag: "a", text: "Meniu", box: { x: 80, y: 32, w: 70, h: 32 }, styles: style(), inFirstScreen: true },
    { id: "el-2", tag: "a", text: "Ceaiuri", box: { x: 180, y: 32, w: 84, h: 32 }, styles: style(), inFirstScreen: true },
    { id: "el-3", tag: "a", text: "Contact", box: { x: 294, y: 32, w: 86, h: 32 }, styles: style(), inFirstScreen: true },
    { id: "el-4", tag: "h1", text: "Ceai rece", box: { x: 80, y: 230, w: 460, h: 110 }, styles: style(), inFirstScreen: true },
    { id: "el-5", tag: "p", text: "-30% azi la orice ceai rece", box: { x: 80, y: 400, w: 380, h: 52 }, styles: style("rgb(47, 111, 115)", "rgb(255, 255, 255)"), inFirstScreen: true },
    { id: "el-6", tag: "a", text: "Comandă acum", box: { x: 80, y: 520, w: 250, h: 72 }, styles: style("rgb(181, 71, 47)", "rgb(255, 255, 255)"), inFirstScreen: true },
    { id: "el-7", tag: "img", text: "O cămilă cu ochelari de soare, lângă un pahar de ceai rece", box: { x: 530, y: 190, w: 370, h: 620 }, styles: style(), imageSrc: "/samples/spire/referinta-ilustratie.jpg", inFirstScreen: true },
  ] satisfies PageElement[],
};

/** Ce ar aprinde extensia pe pagina de demo și ce spune Spire după scanare. */
export function demoScan(): { picks: CampaignPick[]; said: string } {
  const picks = campaignCandidates(DEMO_SITE.elements, DEMO_SITE.viewport);
  return { picks, said: foundSentence(picks) };
}

/** Caseta unui element, în procente din pagină, ca chenarul să stea exact peste el în machetă. */
export function boxPercent(elementId: string): { left: string; top: string; width: string; height: string } {
  const e = DEMO_SITE.elements.find((el) => el.id === elementId);
  if (!e) throw new Error(`Elementul ${elementId} nu e pe pagina de demo.`);
  const { w, h } = DEMO_SITE.viewport;
  const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(2)}%`;
  return { left: pct(e.box.x, w), top: pct(e.box.y, h), width: pct(e.box.w, w), height: pct(e.box.h, h) };
}

/** Întrebările pe care le pune Spire după ce omul a spus ce promovează: oferta, butonul, formatele. */
export function demoQuestions(campaign: Campaign, brand: Brand): Question[] {
  return questionsFor(campaign.anatomy, brand, { product: campaign.answers.product });
}

/** Oferta scrisă greșit în prima variantă: altă variantă din aceeași listă de oferte. */
export const DRIFTED_OFFER = "-20% azi";

export interface ReplayStep {
  copy: Copy;
  designs: Designs;
  checks: Check[];
}

/** Bucla agentului pe campania de exemplu: prima variantă pică la preț, a doua e corectată după ce a picat. */
export async function guardReplay(campaign: Campaign, brand: Brand, illustration: Measured): Promise<ReplayStep[]> {
  const { anatomy, answers } = campaign;
  const offerZone = anatomy.zones.find((z) => z.role === "offer");
  const formats = (Object.keys(campaign.designs) as Array<keyof Designs>).filter((f) => campaign.designs[f]);
  const build = (copy: Copy): Designs => Object.fromEntries(formats.map((f) => [f, compose(anatomy, brand, copy, campaign.illustration, f)]));
  // corectura: după ce a picat prețul, textele revin la cele date de om
  const writer = (attempt: number): Copy => {
    const exact = copyFromAnswers(anatomy, answers);
    return attempt === 0 && offerZone ? { ...exact, [offerZone.id]: DRIFTED_OFFER } : exact;
  };
  const loop = await runAgentLoop({
    generate: async (attempt) => {
      const copy = writer(attempt);
      return { copy, designs: build(copy) };
    },
    check: async (v) => guardCampaign({ designs: v.designs, brand, answers, copy: v.copy, illustration }),
  });
  return loop.attempts.map((a) => ({ copy: a.value.copy, designs: a.value.designs, checks: a.checks }));
}
