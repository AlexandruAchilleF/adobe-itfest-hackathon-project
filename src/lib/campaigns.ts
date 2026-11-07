// Campania: kitul de designuri pe marca omului, verificat de gardă, și cum se salvează.
// makeKit primește apelurile AI ca dependențe, ca logica să rămână testabilă fără rețea.
import { z } from "zod";
import { runAgentLoop } from "./agentLoop";
import { Anatomy, sampleAnatomy } from "./anatomy";
import { Brand, demoBrand } from "./brand";
import { compose, type Copy, copyFromAnswers } from "./compose";
import { Design } from "./design";
import type { Answers } from "./gaps";
import { type Check, type CheckId, guardDesign, guardKit } from "./guard";
import { type Collection, createCollection, type Rec } from "./store";

const FormatId = z.enum(["post", "story", "hero"]);
const AnswersSchema = z.object({
  product: z.string().optional(),
  offer: z.string().optional(),
  price: z.string().optional(),
  deadline: z.string().optional(),
  cta: z.string().optional(),
  formats: z.array(FormatId).optional(),
});
const CheckSchema = z.object({
  id: z.enum(["text", "price", "mandatory", "fonts", "brand-colors", "illustration-palette", "not-copy", "contrast", "cta", "headline", "mascot", "kit"]),
  ok: z.boolean(),
  message: z.string(),
  source: z.enum(["cod", "ai"]),
  fixable: z.boolean(),
});

export const Campaign = z.object({
  title: z.string(),
  source: z.object({ url: z.string(), title: z.string() }).nullable(),
  reference: z.string(),
  anatomy: Anatomy,
  answers: AnswersSchema,
  copy: z.record(z.string(), z.string()),
  illustration: z.string().nullable(),
  designs: z.object({ post: Design.optional(), story: Design.optional() }),
  hero: z.object({ html: z.string() }).nullable(),
  checks: z.array(CheckSchema),
  createdAt: z.string(),
});
export type Campaign = z.infer<typeof Campaign>;

export type DesignFormat = "post" | "story";
export type Designs = Partial<Record<DesignFormat, Design>>;
export const FORMAT_LABEL: Record<z.infer<typeof FormatId>, string> = { post: "Postare", story: "Story", hero: "Hero" };

/** Câte un rând pe verificare: picată dacă pică pe oricare format, cu formatul în mesaj. */
export function guardCampaign(input: {
  designs: Designs;
  brand: Brand;
  answers: Answers;
  copy: Copy;
  illustration?: { colors: string[]; hashDistance: number } | null;
  mascot?: { ok: boolean; reason: string };
}): Check[] {
  const { designs, ...rest } = input;
  const merged = new Map<CheckId, Check>();
  const entries = Object.entries(designs) as Array<[DesignFormat, Design]>;
  for (const [format, design] of entries) {
    for (const check of guardDesign({ design, ...rest })) {
      const known = merged.get(check.id);
      if (!known || (known.ok && !check.ok)) {
        merged.set(check.id, !check.ok && entries.length > 1 ? { ...check, message: `${FORMAT_LABEL[format]}: ${check.message}` } : check);
      }
    }
  }
  return [...merged.values(), guardKit(designs, input.answers)];
}

export const campaignStatus = (checks: Check[]): "verificat" | "respins" => (checks.every((c) => c.ok) ? "verificat" : "respins");

const ILLUSTRATION_CHECKS: CheckId[] = ["illustration-palette", "not-copy", "mascot"];
const touchesIllustration = (checks: Check[]) => checks.some((c) => !c.ok && ILLUSTRATION_CHECKS.includes(c.id));

export interface KitDeps {
  writeCopy(failed: Check[]): Promise<Copy>;
  generateMascot(): Promise<string>;
  checkMascot(generated: string): Promise<{ ok: boolean; reason: string }>;
  signature(generated: string): Promise<{ colors: string[]; hashDistance: number }>;
}

export interface Kit {
  copy: Copy;
  illustration: string | null;
  designs: Designs;
  checks: Check[];
  attempts: number;
  /** ce s-a stricat pe drum, deși kitul a ieșit */
  error?: string;
}

/** Generează kitul și îl corectează după gardă. Fără ilustrație bună, rămâne mascota originală a mărcii. */
export async function makeKit(input: { anatomy: Anatomy; brand: Brand; answers: Answers; reference: string }, deps: KitDeps): Promise<Kit> {
  const { anatomy, brand, answers } = input;
  const chosen = (answers.formats ?? []).filter((f): f is DesignFormat => f !== "hero");
  const formats: DesignFormat[] = chosen.length ? chosen : answers.formats?.includes("hero") ? [] : ["post"];
  const build = (copy: Copy, illustration: string | null): Designs => Object.fromEntries(formats.map((f) => [f, compose(anatomy, brand, copy, illustration, f)]));

  let illustration: string | null = null;
  let measured: { colors: string[]; hashDistance: number } | null = null;
  let mascotCheck: { ok: boolean; reason: string } | undefined;

  const drawIllustration = async () => {
    try {
      const image = await deps.generateMascot();
      [measured, mascotCheck] = await Promise.all([deps.signature(image), deps.checkMascot(image)]);
      illustration = image;
    } catch {
      illustration = null;
      measured = null;
      mascotCheck = undefined;
    }
  };

  const loop = await runAgentLoop({
    generate: async (attempt, failed) => {
      if (attempt === 0 || touchesIllustration(failed)) await drawIllustration();
      const copy = await deps.writeCopy(failed);
      return { copy, illustration, measured, mascot: mascotCheck, designs: build(copy, illustration) };
    },
    check: async (v) => guardCampaign({ designs: v.designs, brand, answers, copy: v.copy, illustration: v.measured, mascot: v.mascot }),
  });

  if (loop.error) {
    const copy = copyFromAnswers(anatomy, answers);
    const designs = build(copy, illustration);
    return { copy, illustration, designs, checks: guardCampaign({ designs, brand, answers, copy, illustration: measured, mascot: mascotCheck }), attempts: 0, error: loop.error };
  }

  const { value, checks } = loop.best;
  if (value.illustration && touchesIllustration(checks)) {
    const designs = build(value.copy, null);
    return { copy: value.copy, illustration: null, designs, checks: guardCampaign({ designs, brand, answers, copy: value.copy, illustration: null }), attempts: loop.attempts.length };
  }
  return { copy: value.copy, illustration: value.illustration, designs: value.designs, checks, attempts: loop.attempts.length };
}

/** Ce spune Spire după kit: câte verificări trec și, dacă bucla a corectat, de câte ori. */
export function kitVerdict(kit: Pick<Kit, "checks" | "attempts">): string {
  const passed = kit.checks.filter((c) => c.ok).length;
  const verdict = `${passed} din ${kit.checks.length} verificări trec.`;
  const fixes = kit.attempts - 1;
  if (fixes < 1) return verdict;
  return `Am refăcut ${fixes === 1 ? "o dată" : `de ${fixes} ori`} ce a picat la gardă. ${verdict}`;
}

const NO_SPACE = "Nu mai e loc în browser. Șterge o campanie veche.";

/** Backend-ul local nu aruncă la spațiu plin, deci confirmăm citind înapoi: nu pierdem campania în tăcere. */
export async function saveCampaign(collection: Collection<Campaign>, data: Campaign): Promise<Rec<Campaign>> {
  const rec = await collection.add(data);
  if (!(await collection.list()).some((r) => r.id === rec.id)) throw new Error(NO_SPACE);
  return rec;
}

export async function updateCampaign(collection: Collection<Campaign>, id: string, data: Campaign): Promise<void> {
  await collection.update(id, data);
  const saved = (await collection.list()).find((r) => r.id === id);
  if (JSON.stringify(saved?.data.designs) !== JSON.stringify(data.designs)) throw new Error(NO_SPACE);
}

/** O campanie de exemplu, cu verificările de cod calculate pe bune. */
export function seedCampaign(): Campaign {
  const answers: Answers = { product: "Weekend cu 2 cupe", offer: "2 la preț de 1", cta: "Vino azi", formats: ["post", "story"] };
  const copy = copyFromAnswers(sampleAnatomy, answers);
  const illustration = "/samples/spire/pip-in-stil.png";
  const designs: Designs = { post: compose(sampleAnatomy, demoBrand, copy, illustration, "post"), story: compose(sampleAnatomy, demoBrand, copy, illustration, "story") };
  return {
    title: copy.title,
    source: null,
    reference: "/samples/spire/referinta.png",
    anatomy: sampleAnatomy,
    answers,
    copy,
    illustration,
    designs,
    hero: null,
    checks: guardCampaign({ designs, brand: demoBrand, answers, copy }),
    createdAt: "2026-11-07T09:00:00.000Z",
  };
}

export const campaigns: Collection<Campaign> = createCollection("spire:campanii", Campaign, [seedCampaign()]);
export const brands: Collection<Brand> = createCollection("spire:marca", Brand, [demoBrand]);
