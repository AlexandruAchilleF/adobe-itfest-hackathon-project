// Videoclipul campaniei: Claude scrie scenariul din brief și din fotografiile paginii, codul îl
// verifică (checkVideoPlan), iar browserul îl randează (videoRender.ts). Dacă AI-ul pică sau
// inventează cifre, clipul iese din scenariul de rezervă, construit doar din brief, și spune asta.
import { ask } from "./ai";
import { brandColor, type Brand } from "./brand";
import type { CampaignContext } from "./campaignQueue";
import { isDemoMode } from "./demoMode";
import { checkVideoPlan, repairVideoPlan, VIDEO_LIMITS, VideoPlan, videoPlanMock, videoPrompt, type VideoCheck, type VideoInput } from "./videoPlan";
import { renderVideo, type VideoLook } from "./videoRender";

export interface PlannedVideo {
  plan: VideoPlan;
  checks: VideoCheck[];
  model: string;
  simulated: boolean;
  /** De ce s-a folosit scenariul de rezervă, dacă s-a folosit. */
  fallback?: string;
}

export function videoInput(context: CampaignContext, photoCount: number): VideoInput {
  return {
    brandName: context.brand.name,
    sourceTitle: context.source.title,
    ...context.answers,
    description: context.description,
    clarifications: context.clarifications.map((c) => c.answer).filter(Boolean),
    mandatory: context.brand.mandatory,
    photoCount,
  };
}

export const FALLBACK_MODEL = "scenariu-de-rezervă";

export async function planVideo(context: CampaignContext, photos: string[]): Promise<PlannedVideo> {
  const input = videoInput(context, photos.length);
  const mock = videoPlanMock(input);
  const fallback = (reason: string): PlannedVideo => {
    const plan = repairVideoPlan(mock, photos.length);
    return { plan, checks: checkVideoPlan(plan, input), model: FALLBACK_MODEL, simulated: false, fallback: reason };
  };
  try {
    const { data, raw } = await ask({
      prompt: videoPrompt(input, context), schema: VideoPlan, files: photos, mock,
      provider: isDemoMode() ? "mock" : "anthropic", signal: AbortSignal.timeout(90_000),
    });
    const plan = repairVideoPlan(data, photos.length);
    const checks = checkVideoPlan(plan, input);
    const failed = checks.filter((c) => !c.ok);
    if (failed.length) return fallback(`scenariul AI a picat verificarea (${failed.map((c) => `${c.label.toLowerCase()}: ${c.detail}`).join("; ")})`);
    return { plan, checks, model: raw.model, simulated: raw.provider === "mock" };
  } catch (err) {
    return fallback(`AI-ul nu a răspuns (${err instanceof Error ? err.message : "eroare necunoscută"})`);
  }
}

export function videoLook(brand: Brand): VideoLook {
  return {
    name: brand.name,
    colors: { background: brandColor(brand, "background"), primary: brandColor(brand, "primary"), accent: brandColor(brand, "accent"), text: brandColor(brand, "text") },
    fonts: brand.fonts,
    mandatory: brand.mandatory,
    logo: brand.logo,
  };
}

export type VideoStage = "plan" | "render";

/** Tot drumul: scenariul, verificarea, randarea. Întoarce clipul ca blob URL, valabil în sesiunea curentă. */
export async function generateCampaignVideo(context: CampaignContext, brand: Brand, photos: string[], onProgress?: (stage: VideoStage, progress: number) => void) {
  const usable = photos.slice(0, VIDEO_LIMITS.maxPhotos);
  onProgress?.("plan", 0);
  const planned = await planVideo(context, usable);
  onProgress?.("render", 0);
  const blob = await renderVideo(planned.plan, videoLook(brand), usable, (p) => onProgress?.("render", p));
  return { ...planned, url: URL.createObjectURL(blob), mimeType: blob.type };
}
