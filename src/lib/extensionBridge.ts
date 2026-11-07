// Contractul dintre extensie și aplicație: forma mesajelor trimise cu postMessage.
// Pagina din jur poate fi oricare, deci tot ce vine pe canalul ăsta trece prin schemă.
import { z } from "zod";
import { CritiqueRequest } from "./critiqueClient";

/** Limita de la scanare: extensia citește cel mult atâtea elemente vizibile. */
export const MAX_PAGE_ELEMENTS = 200;

const Box = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });
const DataImage = z.string().startsWith("data:image/");

export const PageElement = z.object({
  id: z.string(),
  tag: z.string(),
  text: z.string(),
  box: Box,
  styles: z.object({ color: z.string(), background: z.string(), fontFamily: z.string(), fontSize: z.string(), fontWeight: z.string() }),
  imageSrc: z.string().optional(),
  href: z.string().optional(),
  inFirstScreen: z.boolean(),
});
export type PageElement = z.infer<typeof PageElement>;

export interface SectionNode {
  tag: string;
  text?: string;
  styles: Record<string, string>;
  attrs: { src?: string; href?: string; alt?: string };
  children: SectionNode[];
}

export const SectionNode: z.ZodType<SectionNode> = z.lazy(() =>
  z.object({
    tag: z.string(),
    text: z.string().optional(),
    styles: z.record(z.string(), z.string()),
    attrs: z.object({ src: z.string().optional(), href: z.string().optional(), alt: z.string().optional() }),
    children: z.array(SectionNode),
  }),
);

export const PageSummary = z.object({
  url: z.string(),
  title: z.string(),
  headings: z.array(z.string()),
  ctas: z.array(z.string()),
  colors: z.array(z.string()),
  fonts: z.array(z.string()),
});
export type PageSummary = z.infer<typeof PageSummary>;

const BriefAnswer = z.string().max(500);
export const MAX_BRIEF_PHOTOS = 6;
export const MAX_BRIEF_PHOTO = 400_000; // caractere; extensia le micșorează la 960 px
export const CritiqueBrief = z.object({
  source: z.object({ url: z.url().refine((value) => /^https?:/.test(value)), title: z.string().max(300) }),
  answers: z.object({ product: BriefAnswer.optional(), audience: BriefAnswer.optional(), goal: BriefAnswer.optional(), cta: BriefAnswer.optional() }),
  critique: z.object({
    mode: z.enum(["ai", "mock", "fallback"]),
    searchOptimization: z.array(z.object({title:z.string().max(100),query:z.string().max(180),proposal:z.string().max(240),status:z.enum(["observed","needs-check"]),evidence:z.string().max(160)})).max(3).optional(),
    items: z.array(z.object({ id: z.string().min(1).max(100), title: z.string().max(100), observation: z.string().max(120), proposal: z.string().max(180), elementId: z.string().max(100).nullable() })).max(5),
    screenshot: z.string().max(2 * 1024 * 1024).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/).optional(),
  }).optional(),
  /** Fotografiile mari din pagină, de pe același domeniu, micșorate de extensie: materialul pentru video. */
  photos: z.array(z.string().max(MAX_BRIEF_PHOTO).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/)).max(MAX_BRIEF_PHOTOS).optional(),
});
export type CritiqueBrief = z.infer<typeof CritiqueBrief>;

export const ExtensionMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("spire:critique-request"), requestId: z.string().min(1).max(100), input: CritiqueRequest }),
  z.object({ type: z.literal("spire:brief"), brief: CritiqueBrief }),
  z.object({ type: z.literal("spire:page"), page: PageSummary, elements: z.array(PageElement).max(MAX_PAGE_ELEMENTS) }),
  z.object({ type: z.literal("spire:reference"), image: DataImage, elementIds: z.array(z.string()) }),
  z.object({ type: z.literal("spire:section"), image: DataImage, root: SectionNode, truncated: z.boolean() }),
]);
export type ExtensionMessage = z.infer<typeof ExtensionMessage>;

/** Mesajul validat sau null. Nu aruncă, nici la arbori prea adânci (depășirea stivei în schemă). */
export function parseExtensionMessage(data: unknown): ExtensionMessage | null {
  try {
    const parsed = ExtensionMessage.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Adevărat doar pentru mesajele ferestrei părinte, când aplicația e deschisă cu ?din=extensie. */
export function isFromExtension(event: MessageEvent, win: Window): boolean {
  if (event.source !== win.parent || new URLSearchParams(win.location.search).get("din") !== "extensie") return false;
  const configured = new URLSearchParams(win.location.search).get("hostOrigin");
  try {
    const known = configured || win.document.referrer;
    return known ? event.origin === new URL(known).origin : /^https?:/.test(event.origin);
  } catch { return false; }
}
