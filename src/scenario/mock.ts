// Mock-urile pentru modul demo, construite din ce a scris omul (nu răspunsuri fixe).
// Logică pură, cu teste în tests/scenario.test.ts.

import type { Scenario } from "./types";

const NOT_UNITS = /^(pe|la|în|in|din|de|și|si|că|ca|ore|ora|orele|minute|min|km|etaj|etajul|bloc|blocul|scara|ap|nr)$/i;
const BEFORE_NOT_QTY = /(etaj|etajul|ora|orele|bloc|blocul|scara|ap|apartament|nr|numărul|strada|str|calea|bd|bulevardul)\.?$/i;

/** Cantitatea din text („6 sticle”, „20 de porții”). Sare peste etaje, ore, numere de bloc și de stradă. */
export function guessQuantity(text: string): { quantity: number; unit: string } {
  for (const m of text.matchAll(/(?:([\p{L}.]+)\s+)?(\d+)\s+(?:de\s+)?([\p{L}]+)/gu)) {
    if (m[1] && BEFORE_NOT_QTY.test(m[1])) continue;
    if (NOT_UNITS.test(m[3])) continue;
    return { quantity: Number(m[2]), unit: m[3] };
  }
  return { quantity: 1, unit: "bucată" };
}

/** Prima categorie al cărei nume (sau rădăcina lui) apare în text; altfel ultima („altele”). */
export function guessCategory(text: string, s: Pick<Scenario, "categories">): string {
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const t = norm(text);
  const hit = s.categories.find((c) => t.includes(norm(c.label).slice(0, Math.max(3, Math.min(5, c.label.length)))));
  return (hit ?? s.categories.at(-1)!).id;
}

export function mockStructure(raw: string, s: Pick<Scenario, "categories">) {
  const where = raw.match(/(?:pe|în|la|din)\s+((?:Calea|Strada|Str\.|Bd\.|Bulevardul|Piața|Șoseaua)?\s*[A-ZĂÂÎȘȚ][\p{L}.-]+(?:\s+[A-ZĂÂÎȘȚ0-9][\p{L}.-]*)*)/u)?.[1];
  return {
    title: raw.split(/\s+/).slice(0, 5).join(" ").replace(/[,.]$/, ""),
    category: guessCategory(raw, s),
    description: raw,
    ...guessQuantity(raw),
    urgency: /azi|diseară|urgent|acum|imediat|până la/i.test(raw) ? 5 : 3,
    address: `${where?.trim() ?? "Centru"}, București`,
  };
}
