// Contractul dintre extensie și aplicație: forma mesajelor trimise cu postMessage.
// Pagina din jur poate fi oricare, deci tot ce vine pe canalul ăsta trece prin schemă.
import { z } from "zod";

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

export const ExtensionMessage = z.discriminatedUnion("type", [
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
  return event.source === win.parent && new URLSearchParams(win.location.search).get("din") === "extensie";
}
