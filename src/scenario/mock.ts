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

/** Mock pentru citirea unui bon sau a unei facturi scrise ca text: ce scrie pe document, nimic inventat. */
export function mockDocument(text: string, today: Date = new Date()) {
  const rows = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
  const lines: Array<{ label: string; amount: number }> = [];
  let total: number | null = null;
  for (const row of rows) {
    const t = row.match(/^total(?:\s+de\s+plat[ăa])?\s*[:=]?\s*([\d\s]+[.,]?\d*)/i);
    if (t) {
      total = num(t[1]);
      continue;
    }
    if (/c\.?\s?u\.?\s?i|cif|cod fiscal|nr\.|data|tva/i.test(row)) continue;
    const m = row.match(/^(.+?)\s+([\d]+[.,]\d{2}|\d+)\s*(lei|ron)?$/i);
    if (m) lines.push({ label: m[1].replace(/[.:\-x×\s\d]+$/, "").trim(), amount: num(m[2]) });
  }
  const date = text.match(/(\d{2})[./-](\d{2})[./-](\d{4})/);
  return {
    kind: /factur/i.test(text) ? ("factura" as const) : ("bon" as const),
    vendor: rows[0] ?? "",
    cui: text.match(/(?:c\.?\s?u\.?\s?i\.?|cif|cod fiscal)\s*[:.]?\s*(?:ro)?\s*(\d{2,10})/i)?.[1] ?? "",
    number: text.match(/nr\.?\s*(?:bon|factur[ăa])?\s*[:.]?\s*([\w-]+)/i)?.[1] ?? "",
    date: date ? `${date[3]}-${date[2]}-${date[1]}` : today.toISOString().slice(0, 10),
    currency: "lei",
    lines,
    total: total ?? lines.reduce((s, l) => s + l.amount, 0),
  };
}
