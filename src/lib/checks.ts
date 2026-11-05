// Verificările deterministe pentru un document extras de AI (bon, factură, chitanță).
// AI-ul citește; codul verifică. Fiecare verificare spune ce a găsit, în cuvinte, ca omul
// să poată corecta câmpul înainte de trimitere. Logică pură, cu teste în tests/checks.test.ts.

import { z } from "zod";

export const DocLine = z.object({
  label: z.string(),
  amount: z.number().describe("valoarea liniei, cu TVA, în moneda documentului"),
});

export const Doc = z.object({
  kind: z.enum(["bon", "factura", "chitanta", "altul"]),
  vendor: z.string().describe("numele firmei de pe document"),
  cui: z.string().describe("codul fiscal (CUI/CIF), doar cifrele, gol dacă nu apare"),
  number: z.string().describe("numărul documentului, gol dacă nu apare"),
  date: z.string().describe("data documentului, AAAA-LL-ZZ"),
  currency: z.string().describe("moneda, ex: lei"),
  lines: z.array(DocLine),
  total: z.number().describe("totalul de plată scris pe document"),
});
export type Doc = z.infer<typeof Doc>;

export interface DocRules {
  /** cât de vechi poate fi documentul (zile) */
  maxAgeDays: number;
  /** plafoane pe categorie (în moneda documentului); peste ele cererea merge mai departe, dar marcată */
  limits: Record<string, number>;
  /** CUI-ul e obligatoriu (facturi, bonuri fiscale) */
  requireCui: boolean;
}

export interface DocCheck {
  id: "suma" | "cui" | "data" | "duplicat" | "plafon";
  label: string;
  /** error = nu se trimite până nu se corectează; warning = merge, dar o vede și cel care aprobă */
  level: "ok" | "warning" | "error";
  detail: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number, cur: string) => `${round2(n).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;

/**
 * Cifra de control a codului fiscal românesc (CUI/CIF): cheia 753217532 aplicată de la dreapta,
 * suma × 10 mod 11, iar 10 devine 0. Acceptă prefixul RO și spațiile.
 */
export function validCui(raw: string): boolean {
  const digits = raw.toUpperCase().replace(/^RO/, "").replace(/\s/g, "");
  if (!/^\d{2,10}$/.test(digits)) return false;
  const body = digits.slice(0, -1).padStart(9, "0");
  const key = "753217532";
  const sum = [...body].reduce((s, d, i) => s + Number(d) * Number(key[i]), 0);
  const control = ((sum * 10) % 11) % 10;
  return control === Number(digits.at(-1));
}

export interface CheckContext {
  rules: DocRules;
  category: string;
  /** documentele deja trimise, pentru duplicate */
  existing: Array<Pick<Doc, "cui" | "number" | "vendor" | "date" | "total">>;
  now?: Date;
}

export function checkDocument(doc: Doc, ctx: CheckContext): DocCheck[] {
  const now = ctx.now ?? new Date();
  const cur = doc.currency || "lei";
  const out: DocCheck[] = [];

  const sum = round2(doc.lines.reduce((s, l) => s + l.amount, 0));
  if (!doc.lines.length) out.push({ id: "suma", label: "Suma", level: "warning", detail: "Nu are linii: totalul nu se poate verifica." });
  else if (Math.abs(sum - doc.total) > 0.01) out.push({ id: "suma", label: "Suma", level: "error", detail: `Liniile fac ${fmt(sum, cur)}, dar totalul scris e ${fmt(doc.total, cur)}. Verifică documentul.` });
  else out.push({ id: "suma", label: "Suma", level: "ok", detail: `Liniile fac exact totalul: ${fmt(sum, cur)}.` });

  if (!doc.cui.trim()) out.push({ id: "cui", label: "Cod fiscal", level: ctx.rules.requireCui ? "error" : "warning", detail: "Lipsește codul fiscal al firmei." });
  else if (!validCui(doc.cui)) out.push({ id: "cui", label: "Cod fiscal", level: "error", detail: `${doc.cui} nu trece cifra de control: e citit greșit sau documentul nu e valid.` });
  else out.push({ id: "cui", label: "Cod fiscal", level: "ok", detail: `${doc.cui} e un cod fiscal valid.` });

  const date = new Date(`${doc.date}T12:00:00`);
  const ageDays = (now.getTime() - date.getTime()) / 86_400_000;
  if (Number.isNaN(date.getTime())) out.push({ id: "data", label: "Data", level: "error", detail: "Data nu se poate citi." });
  else if (ageDays < -1) out.push({ id: "data", label: "Data", level: "error", detail: `Data ${doc.date} e în viitor.` });
  else if (ageDays > ctx.rules.maxAgeDays) out.push({ id: "data", label: "Data", level: "error", detail: `Documentul are ${Math.floor(ageDays)} zile; limita e ${ctx.rules.maxAgeDays}.` });
  else out.push({ id: "data", label: "Data", level: "ok", detail: `Din ${doc.date}, în termen.` });

  const key = (d: Pick<Doc, "cui" | "number" | "vendor" | "date" | "total">) => (d.cui && d.number ? `${d.cui.replace(/\D/g, "")}#${d.number.trim()}` : `${d.vendor.trim().toLowerCase()}#${d.date}#${round2(d.total)}`);
  const dup = ctx.existing.some((e) => key(e) === key(doc));
  out.push(dup ? { id: "duplicat", label: "Duplicat", level: "error", detail: "Același document a mai fost trimis o dată." } : { id: "duplicat", label: "Duplicat", level: "ok", detail: "Nu a mai fost trimis." });

  const limit = ctx.rules.limits[ctx.category];
  if (limit !== undefined) {
    out.push(doc.total > limit ? { id: "plafon", label: "Plafon", level: "warning", detail: `${fmt(doc.total, cur)} depășește plafonul de ${fmt(limit, cur)} pentru categoria asta. Merge la aprobare marcat.` } : { id: "plafon", label: "Plafon", level: "ok", detail: `Sub plafonul de ${fmt(limit, cur)}.` });
  }
  return out;
}

export const blocking = (checks: DocCheck[]) => checks.filter((c) => c.level === "error");
