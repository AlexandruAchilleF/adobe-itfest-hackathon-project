// Instrucțiunea pentru generarea mascotei o scrie codul: omul nu scrie prompturi,
// iar subiectul din referință nu ajunge niciodată în cerere.
// E în engleză pentru că modelul de imagine preia stilul mai bine așa; omul n-o vede.
import type { Anatomy } from "./anatomy";
import { type Brand, brandColor, brandPalette } from "./brand";

export function mascotInstruction(a: Anatomy, b: Brand): string {
  const style = a.illustration?.style ?? "the drawing style of image 1";
  return [
    `Redraw the character from image 2 in the exact visual style of image 1: ${style}.`,
    `Keep the character recognizable: ${b.mascot.description}.`,
    "Take only the style from image 1. Do not include its characters, objects or layout.",
    `Use these colors: ${brandPalette(b).join(", ")}.`,
    `One full-body character, centered, on a uniform flat ${brandColor(b, "background")} background. No text, no letters, no logo.`,
  ].join("\n");
}
