// Cum arată campaniile în liste: ordinea, miniatura, ce cere atenție, ștergerea cu undo. Logică pură.
import type { Campaign } from "./campaigns";
import type { Design } from "./design";
import type { Check } from "./guard";
import type { Collection, Rec } from "./store";

/** Cele mai noi primele, fără să atingă lista primită. */
export const newestFirst = (items: Array<Rec<Campaign>>): Array<Rec<Campaign>> => [...items].sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));

/** Ce apare pe Acasă. */
export const recentCampaigns = (items: Array<Rec<Campaign>>, limit = 4): Array<Rec<Campaign>> => newestFirst(items).slice(0, limit);

/** Designul făcut, pentru miniatură: postarea sau, dacă lipsește, story-ul. */
export const previewDesign = (campaign: Campaign): Design | null => campaign.designs.post ?? campaign.designs.story ?? null;

/** Starea apare doar când cere ceva. */
export function attentionLabel(checks: Check[]): string | null {
  const failed = checks.filter((c) => !c.ok).length;
  if (failed === 0) return null;
  return failed === 1 ? "1 verificare de revăzut" : `${failed} verificări de revăzut`;
}

/** Garda pe o linie: „9 din 9 trec”. */
export const guardSummary = (checks: Check[]): string => `${checks.filter((c) => c.ok).length} din ${checks.length} trec`;

/** Bifele picate, ca o cheie: garda se deschide singură când se schimbă și nu e goală. */
export const failedKey = (checks: Check[]): string =>
  checks
    .filter((c) => !c.ok)
    .map((c) => c.id)
    .join(",");

export const campaignDate = (campaign: Pick<Campaign, "createdAt">): string => new Date(campaign.createdAt).toLocaleDateString("ro-RO", { day: "numeric", month: "long" });

export const campaignSource = (campaign: Pick<Campaign, "source">): string => campaign.source?.title ?? "Imagine încărcată";

/**
 * Șterge și întoarce funcția de undo. Store-ul nu are „readaugă cu același id”, deci undo-ul scrie o înregistrare nouă,
 * cu aceleași date: locul în listă rămâne, fiindcă ordinea vine din `createdAt`; se schimbă doar adresa campaniei.
 */
export async function removeWithUndo(collection: Pick<Collection<Campaign>, "remove" | "add">, rec: Rec<Campaign>): Promise<() => Promise<Rec<Campaign>>> {
  await collection.remove(rec.id);
  return () => collection.add(rec.data);
}

export const NEW_CAMPAIGN_STEPS = ["Referință", "Întrebări", "Kit"] as const;

/** Pasul la care a ajuns omul pe /nou: 0 până există anatomia, 1 până există kitul. */
export const newCampaignStep = (state: { anatomy: unknown; kit: unknown }): number => (state.kit ? 2 : state.anatomy ? 1 : 0);
