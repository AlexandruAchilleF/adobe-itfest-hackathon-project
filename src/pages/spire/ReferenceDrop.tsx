// Pornirea unei campanii: tragi, lipești sau alegi o imagine. Aceeași zonă pe /acasa și pe /nou.
import { useEffect, useRef, useState } from "react";
import { Button, ErrorNote } from "../../components/ui";
import { readFile } from "../../lib/spireImages";

export const SAMPLE_REFERENCE = "/samples/spire/referinta.png";

const isEditable = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function ReferenceDrop({ onPick, heading: Heading = "h2", action = "ink" }: { onPick: (image: string) => void; heading?: "h1" | "h2"; action?: "primary" | "ink" }) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const take = useRef<(file: File | undefined) => void>(() => undefined);
  take.current = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Fișierul nu e o imagine. Încearcă un PNG, JPG sau WebP.");
    setError(null);
    readFile(file).then(onPick, (err: Error) => setError(err.message));
  };

  // Ctrl+V merge oriunde pe pagină, în afară de câmpurile în care omul scrie
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isEditable(e.target)) return;
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) take.current(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  return (
    <section
      data-testid="reference-drop"
      data-over={over}
      className="drop-zone p-6 sm:p-8"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take.current(e.dataTransfer.files[0]);
      }}
    >
      <Heading className="text-[1.45rem] leading-tight font-semibold text-ink sm:text-[1.7rem]">De la ce pornim?</Heading>
      <p className="mt-2 max-w-xl leading-relaxed text-ink-2">
        <span className="pointer-coarse:hidden">Trage aici o imagine cu un stil care îți place, pe care ai dreptul să o folosești, sau lipește-o cu Ctrl+V.</span>
        <span className="hidden pointer-coarse:inline">Alege o imagine cu un stil care îți place, pe care ai dreptul să o folosești.</span>
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className={`btn btn-${action} cursor-pointer`}>
          Alege o imagine
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              take.current(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <Button variant="secondary" onClick={() => onPick(SAMPLE_REFERENCE)}>
          Folosește exemplul
        </Button>
      </div>
      {error && (
        <div className="mt-4">
          <ErrorNote error={error} />
        </div>
      )}
    </section>
  );
}
