// Campaniile: aici ajung și rezultatele din extensie (aceeași origine, aceeași colecție).
import { useEffect, useRef, useState } from "react";
import { Card, ErrorNote, PageHeader } from "../../components/ui";
import { newestFirst, removeWithUndo } from "../../lib/campaignList";
import { type Campaign, campaigns } from "../../lib/campaigns";
import { type Rec, useCollection } from "../../lib/store";
import { useMascotPage } from "../../modules/mascot/page";
import { CampaignCard } from "./CampaignCard";

const UNDO_MS = 8000;

/** Bara de după ștergere. Cât mouse-ul sau focusul stau pe ea, timpul nu curge. */
function UndoBar({ title, onUndo, onClose }: { title: string; onUndo: () => void; onClose: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const button = useRef<HTMLButtonElement>(null);
  const hold = () => clearTimeout(timer.current);
  const run = () => {
    hold();
    timer.current = setTimeout(onClose, UNDO_MS);
  };
  useEffect(() => {
    // butonul apăsat a dispărut odată cu cardul: focusul trece aici, ca tastatura să nu rămână fără loc.
    // Întâi focusul, apoi timpul: mutarea focusului de aici nu trebuie să oprească numărătoarea.
    button.current?.focus({ preventScroll: true });
    run();
    return hold;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed bottom-4 left-1/2 z-[1150] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl bg-ink py-2 pr-2 pl-4 text-[0.95rem] text-white shadow-[0_14px_32px_-14px_rgb(27_35_80/0.7)]" role="status" onMouseEnter={hold} onMouseLeave={run} onFocus={hold} onBlur={run}>
      <span className="min-w-0 truncate">Ai șters „{title}”.</span>
      <button ref={button} type="button" className="shrink-0 rounded-lg bg-white px-3 py-1.5 font-medium text-ink hover:bg-paper-2" onClick={onUndo}>
        Anulează
      </button>
    </div>
  );
}

export function CampaignsPage() {
  const { items, loading, error, remove, add } = useCollection(campaigns);
  const [deleted, setDeleted] = useState<{ id: string; title: string; undo: () => Promise<Rec<Campaign>> } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const sorted = newestFirst(items);

  useMascotPage({ title: "Campanii", context: () => `Campanii salvate: ${items.length}.` });

  const removeOne = (rec: Rec<Campaign>) => {
    setActionError(null);
    removeWithUndo({ remove, add }, rec).then(
      (undo) => setDeleted({ id: rec.id, title: rec.data.title, undo }),
      (err: Error) => setActionError(err.message),
    );
  };
  const undo = () => {
    if (!deleted) return;
    deleted.undo().catch((err: Error) => setActionError(err.message));
    setDeleted(null);
  };

  return (
    <div>
      <PageHeader title="Campanii" description="Tot ce ai făcut cu Spire, de pe orice site." />
      <ErrorNote error={error ?? actionError} />
      {!loading && sorted.length === 0 && (
        <Card>
          <p className="text-[0.95rem] text-ink-2" data-testid="campanii-gol">
            Nicio campanie încă. Deschide Spire pe un site sau încarcă o imagine.
          </p>
        </Card>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {sorted.map((rec) => (
          <CampaignCard key={rec.id} id={rec.id} campaign={rec.data} onRemove={() => removeOne(rec)} />
        ))}
      </ul>
      {deleted && <UndoBar key={deleted.id} title={deleted.title} onUndo={undo} onClose={() => setDeleted(null)} />}
    </div>
  );
}
