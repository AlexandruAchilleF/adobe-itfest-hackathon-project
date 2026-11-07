// Acasă: de la ce pornești, ce ai făcut ultima dată și marca. Atât.
import { useCallback } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { ErrorNote } from "../../components/ui";
import { defineAction } from "../../lib/agent";
import { recentCampaigns } from "../../lib/campaignList";
import { campaigns } from "../../lib/campaigns";
import { installAction } from "../../lib/extensionInstall";
import { setPendingReference } from "../../lib/pendingReference";
import { useCollection } from "../../lib/store";
import { useMascotPage } from "../../modules/mascot/page";
import { CampaignCard } from "./CampaignCard";
import { useBrand } from "./parts";
import { ReferenceDrop, SAMPLE_REFERENCE } from "./ReferenceDrop";

const SWATCHES = [
  ["primary", "principală"],
  ["accent", "accent"],
  ["background", "fundal"],
  ["text", "text"],
] as const;

function BrandCard() {
  const brand = useBrand();
  return (
    <section className="card p-4" aria-labelledby="acasa-marca">
      <div className="flex items-center gap-3">
        <img src={brand.mascot.image} alt={`Mascota ${brand.mascot.name}`} className="h-14 w-14 shrink-0 rounded-lg border border-line bg-paper object-contain" />
        <div className="min-w-0">
          <p className="text-[0.85rem] text-muted">Marca ta</p>
          <h2 id="acasa-marca" className="truncate text-base font-semibold text-ink">
            {brand.name}
          </h2>
        </div>
      </div>
      <ul className="mt-4 flex gap-2" aria-label="Culorile mărcii">
        {SWATCHES.map(([role, label]) => (
          <li key={role} className="h-8 flex-1 rounded-lg border border-line" style={{ background: brand.colors.find((c) => c.role === role)?.hex }} title={label} aria-label={label} />
        ))}
      </ul>
      <Link href="/marca" className="btn btn-secondary mt-4 w-full">
        Editează
      </Link>
    </section>
  );
}

export function AcasaPage() {
  const [, navigate] = useLocation();
  const { items, loading, error } = useCollection(campaigns);
  const recent = recentCampaigns(items);

  // imaginea trece spre /nou, care o primește pe același drum ca una aleasă acolo
  const start = useCallback(
    (image: string) => {
      setPendingReference(image);
      navigate("/nou");
    },
    [navigate],
  );

  useMascotPage({
    title: "Acasă",
    context: () => `Campanii salvate: ${items.length}. Cea mai nouă: ${recent[0]?.data.title ?? "niciuna"}.`,
    actions: [
      defineAction({
        name: "start_from_example",
        kind: "read",
        description: "Pornește o campanie nouă de la imaginea de exemplu",
        args: z.object({}),
        run: () => start(SAMPLE_REFERENCE),
        examples: ["pornește de la exemplu", "fă o campanie din exemplu"],
        mockArgs: {},
      }),
    ],
  });

  const install = installAction();

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <div className="min-w-0 space-y-6">
        <ReferenceDrop onPick={start} heading="h1" />
        <p className="text-[0.92rem] text-ink-2" title={install.kind === "download" ? install.hint : undefined}>
          Vezi ceva care îți place pe net?{" "}
          <a href={install.href} className="font-medium text-ink underline underline-offset-4">
            Instalează extensia
          </a>{" "}
          și pornești direct de pe pagină.
        </p>
        <section aria-labelledby="acasa-recente">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="acasa-recente" className="text-base font-semibold text-ink">
              Campaniile recente
            </h2>
            <Link href="/campanii" className="text-[0.95rem] whitespace-nowrap text-ink-2 underline underline-offset-4 hover:text-ink">
              Toate campaniile
            </Link>
          </div>
          <ErrorNote error={error} />
          {!loading && recent.length === 0 && !error && (
            <p className="card p-5 text-[0.95rem] text-ink-2" data-testid="acasa-gol">
              Nicio campanie încă. Prima pornește de la o imagine, mai sus.
            </p>
          )}
          {recent.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {recent.map(({ id, data }) => (
                <CampaignCard key={id} id={id} campaign={data} />
              ))}
            </ul>
          )}
        </section>
      </div>
      <BrandCard />
    </div>
  );
}
