// Campaniile: aici ajung și rezultatele din extensie (aceeași origine, aceeași colecție).
import { Link } from "wouter";
import { Button, Card, ErrorNote, PageHeader } from "../../components/ui";
import { type Campaign, campaigns, campaignStatus } from "../../lib/campaigns";
import { useCollection } from "../../lib/store";
import { StatusPill } from "../../scenario/ui/parts";

const dateOf = (c: Campaign) => new Date(c.createdAt).toLocaleDateString("ro-RO", { day: "numeric", month: "long" });

export function CampaignsPage() {
  const { items, loading, error, remove } = useCollection(campaigns);
  const sorted = [...items].sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));
  return (
    <div className="space-y-5">
      <PageHeader title="Campanii" description="Tot ce ai făcut cu Spire, de pe orice site.">
        <Link href="/nou" className="btn btn-primary">
          Campanie nouă
        </Link>
      </PageHeader>
      <ErrorNote error={error} />
      {!loading && sorted.length === 0 && (
        <Card>
          <p className="text-[0.95rem] text-ink-2">Nicio campanie încă. Deschide Spire pe un site sau încarcă o imagine.</p>
        </Card>
      )}
      <ul className="space-y-3">
        {sorted.map(({ id, data }) => (
          <li key={id} className="card flex flex-wrap items-center gap-4 p-3">
            <Link href={`/campanii/${id}`} className="flex min-w-0 flex-1 items-center gap-4">
              <img src={data.reference} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-line object-cover" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{data.title}</span>
                <span className="block truncate text-sm text-muted">
                  {data.source ? data.source.title : "Imagine încărcată"} · {dateOf(data)}
                </span>
              </span>
            </Link>
            <StatusPill status={campaignStatus(data.checks)} />
            <Button variant="ghost" aria-label={`Șterge ${data.title}`} onClick={() => void remove(id)}>
              Șterge
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
