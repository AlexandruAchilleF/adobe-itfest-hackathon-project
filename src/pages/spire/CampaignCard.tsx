// O campanie în galerie: designul făcut, titlul, sursa, data. Starea apare doar când cere ceva.
import { Link } from "wouter";
import { Button } from "../../components/ui";
import { attentionLabel, campaignDate, campaignSource, materialsLabel, previewDesign } from "../../lib/campaignList";
import type { Campaign } from "../../lib/campaigns";
import { StatusDot } from "../../scenario/ui/parts";
import { DesignPreview } from "./DesignPreview";

export function CampaignCard({ id, campaign, onRemove }: { id: string; campaign: Campaign; onRemove?: () => void }) {
  const design = previewDesign(campaign);
  const attention = attentionLabel(campaign.checks);
  const materials = materialsLabel(campaign);
  return (
    <li className="card flex min-w-0 flex-col overflow-hidden transition-shadow hover:shadow-[0_12px_28px_-18px_rgb(27_35_80/0.45)]">
      <Link href={`/campanii/${id}`} className="block min-w-0 flex-1">
        {/* titlul de dedesubt numește linkul; miniatura nu mai adaugă nimic pentru cititorul de ecran */}
        <span className="block aspect-[4/5] overflow-hidden border-b border-line bg-paper-2" aria-hidden>
          {design ? <DesignPreview design={design} className="block h-full w-full" /> : <img src={campaign.reference} alt="" className="h-full w-full object-cover" />}
        </span>
        <span className="block px-3 pt-2.5 pb-3">
          <span className="block truncate font-medium text-ink">{campaign.title}</span>
          <span className="mt-0.5 block truncate text-[0.85rem] text-muted">{campaignSource(campaign)}</span>
          <span className="block truncate text-[0.85rem] text-muted">{campaignDate(campaign)}</span>
          {materials && <span className="mt-1.5 inline-block rounded-full bg-paper-2 px-2 py-0.5 text-[0.8rem] font-medium text-ink-2">{materials}</span>}
          {attention && (
            <span className="mt-1.5 flex items-center gap-1.5 text-[0.85rem] font-medium text-ink">
              <StatusDot status="respins" />
              {attention}
            </span>
          )}
        </span>
      </Link>
      {onRemove && (
        <div className="flex justify-end border-t border-line-2 px-1.5 py-1">
          <Button variant="ghost" className="!min-h-8 !px-2 !py-1 text-[0.85rem]" aria-label={`Șterge ${campaign.title}`} onClick={onRemove}>
            Șterge
          </Button>
        </div>
      )}
    </li>
  );
}
