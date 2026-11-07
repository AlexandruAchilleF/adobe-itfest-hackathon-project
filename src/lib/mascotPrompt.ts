// Instrucțiunea pentru generarea mascotei o scrie codul: omul nu scrie prompturi,
// iar subiectul din referință nu ajunge niciodată în cerere.
import type { Anatomy } from "./anatomy";
import { type Brand, brandColor, brandPalette } from "./brand";

export function mascotInstruction(a: Anatomy, b: Brand): string {
  const style = a.illustration?.style ?? "stilul de desen din prima imagine";
  return [
    "Prima imagine arată stilul. A doua imagine arată personajul.",
    `Desenează personajul din a doua imagine: ${b.mascot.description}.`,
    `Folosește doar stilul din prima imagine: ${style}. Nu prelua personajul, obiectele sau compoziția din prima imagine.`,
    `Culorile: ${brandPalette(b).join(", ")}.`,
    `Un singur personaj, întreg, centrat, pe fundal uniform ${brandColor(b, "background")}. Imaginea e fără text, fără litere, fără logo.`,
  ].join("\n");
}
