// Profilul mărcii: culorile pe roluri, fonturile, tonul, mențiunile obligatorii și mascota.
// Tot ce ajunge pe design vine de aici, iar garda verifică față de el.
import { z } from "zod";

export const ColorRole = z.enum(["background", "primary", "accent", "text"]);
export type ColorRole = z.infer<typeof ColorRole>;

const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const Brand = z.object({
  name: z.string().min(1),
  logo: z.string().nullable(),
  colors: z.array(z.object({ role: ColorRole, hex: Hex })).min(4),
  fonts: z.object({ heading: z.string().min(1), body: z.string().min(1) }),
  tone: z.string(),
  mandatory: z.array(z.string()),
  mascot: z.object({ name: z.string().min(1), description: z.string().min(1), image: z.string().min(1) }),
});
export type Brand = z.infer<typeof Brand>;

export function brandColor(b: Brand, role: ColorRole): string {
  const found = b.colors.find((c) => c.role === role);
  if (!found) throw new Error(`Marca „${b.name}” nu are culoare pentru rolul ${role}.`);
  return found.hex;
}

export const brandPalette = (b: Brand): string[] => b.colors.map((c) => c.hex);

/** Marcă inventată, pentru demo: o gelaterie din București, cu mascota Pip. */
export const demoBrand: Brand = {
  name: "Gelateria Pip",
  logo: null,
  colors: [
    { role: "text", hex: "#0E3A5B" },
    { role: "background", hex: "#F6F1E7" },
    { role: "primary", hex: "#D43F1C" },
    { role: "accent", hex: "#7CC6D9" },
  ],
  fonts: { heading: "Fraunces", body: "Geist" },
  tone: "Cald și jucăuș, cu fraze scurte. Vorbim cu „tu”.",
  mandatory: ["Ofertă valabilă în limita stocului."],
  mascot: {
    name: "Pip",
    description: "un pinguin mic și rotund, albastru-închis, cu burta albă, cioc și labe portocalii, care ține o cupă de înghețată",
    image: "/samples/spire/pip.svg",
  },
};
