// Pagina deschisă din QR: arată designul primit în URL și îl lasă descărcat.
import { useMemo, useRef } from "react";
import { Link } from "wouter";
import { Button } from "../components/ui";
import { decodeDesign, downloadDataUrl } from "../lib/share";
import { DesignCanvas, type DesignCanvasHandle } from "../modules/canvas/DesignCanvas";

export function ViewPage() {
  const ref = useRef<DesignCanvasHandle>(null);
  const design = useMemo(() => decodeDesign(location.hash.slice(1)), []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center gap-4 px-4 py-6">
      {design ? (
        <>
          <h1 className="text-lg font-semibold">{design.title}</h1>
          <DesignCanvas ref={ref} design={design} className="w-full overflow-hidden rounded-xl shadow-2xl" />
          <Button variant="primary" onClick={() => downloadDataUrl(ref.current!.exportPNG(2), `${design.title || "design"}.png`)}>
            Descarcă PNG
          </Button>
        </>
      ) : (
        <p className="text-slate-400">
          Link invalid sau incomplet. <Link href="/" className="underline">Înapoi</Link>
        </p>
      )}
    </main>
  );
}
