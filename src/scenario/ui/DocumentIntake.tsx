// Documentul intră haotic (poză, PDF sau text lipit), AI-ul îl citește, codul îl verifică,
// omul corectează câmpurile cu ✗ și abia apoi trimite. Verificările se recalculează la fiecare editare.

import { useMemo, useState } from "react";
import { Button, Spinner } from "../../components/ui";
import { ask } from "../../lib/ai";
import { blocking, checkDocument, Doc, type DocCheck } from "../../lib/checks";
import { mascot } from "../../modules/mascot/mascot";
import { scenario } from "../config";
import { mockDocument } from "../mock";

const S = scenario;
const ICON: Record<DocCheck["level"], string> = { ok: "✓", warning: "⚠", error: "✗" };
const TONE: Record<DocCheck["level"], string> = { ok: "text-emerald-300", warning: "text-amber-200", error: "text-rose-300" };

export function ChecksList({ checks }: { checks: DocCheck[] }) {
  return (
    <ul className="space-y-1 text-sm" data-testid="doc-checks">
      {checks.map((c) => (
        <li key={c.id} className={TONE[c.level]}>
          {ICON[c.level]} <b>{c.label}:</b> {c.detail}
        </li>
      ))}
    </ul>
  );
}

export function DocTable({ doc }: { doc: Doc }) {
  return (
    <div className="text-sm">
      <p className="text-slate-400">
        {doc.vendor} · CUI {doc.cui || "—"} · nr. {doc.number || "—"} · {doc.date}
      </p>
      <ul className="mt-1">
        {doc.lines.map((l, i) => (
          <li key={i} className="flex justify-between border-b border-slate-800 py-0.5">
            <span>{l.label}</span>
            <span className="tabular-nums">{l.amount.toFixed(2)}</span>
          </li>
        ))}
        <li className="flex justify-between py-0.5 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">
            {doc.total.toFixed(2)} {doc.currency}
          </span>
        </li>
      </ul>
    </div>
  );
}

interface Props {
  /** documentele deja trimise (pentru duplicate) */
  existing: Doc[];
  onSubmit: (doc: Doc, category: string, checks: DocCheck[]) => Promise<void> | void;
}

export function DocumentIntake({ existing, onSubmit }: Props) {
  const cfg = S.documents!;
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [category, setCategory] = useState(S.categories[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = useMemo(() => (doc ? checkDocument(doc, { rules: cfg.rules, category, existing }) : []), [doc, category, existing, cfg.rules]);
  const errors = blocking(checks);

  async function read() {
    setBusy(true);
    setError(null);
    try {
      const { data } = await ask({
        system: `Citești un document (${cfg.title.toLowerCase()}) și copiezi exact ce scrie pe el: firma, codul fiscal, numărul, data, fiecare linie cu suma ei și totalul scris. Nu corecta nimic și nu calcula nimic: verificările le face aplicația.`,
        prompt: text || "Citește documentul atașat.",
        schema: Doc,
        files: file ? [file] : undefined,
        mock: mockDocument(text || cfg.sample),
      });
      setDoc(data);
      const found = blocking(checkDocument(data, { rules: cfg.rules, category, existing }));
      if (found.length) mascot.say(`Am citit documentul, dar ${found[0].label.toLowerCase()} nu iese: ${found[0].detail}`, "worried");
      else mascot.say("Am citit documentul și toate verificările trec.", "happy");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const set = (patch: Partial<Doc>) => doc && setDoc({ ...doc, ...patch });
  const setLine = (i: number, patch: Partial<Doc["lines"][number]>) => doc && setDoc({ ...doc, lines: doc.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const input = "rounded-lg bg-slate-900 px-2 py-1";

  return (
    <div className="space-y-3" data-testid="doc-intake">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Lipește textul de pe bon sau factură, sau atașează o poză / un PDF" className="prompt-box h-28 w-full p-4 font-mono text-[0.8rem] leading-relaxed" aria-label="Textul documentului" />
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300">
          📎 {file ? file.name : "Poză sau PDF"}
          <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <Button variant="ghost" onClick={() => setText(cfg.sample)}>
          Folosește exemplul
        </Button>
        <Button variant="primary" onClick={() => void read()} disabled={busy || (!text.trim() && !file)}>
          {busy && <Spinner />} Citește documentul
        </Button>
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {doc && (
        <div className="space-y-2 rounded-xl border border-accent/40 p-3 text-sm">
          <p className="text-xs text-accent">AI-ul a citit. Codul a verificat. Corectează ce e marcat cu ✗:</p>
          <input value={doc.vendor} onChange={(e) => set({ vendor: e.target.value })} className={`${input} w-full`} aria-label="Firma" />
          <div className="flex gap-2">
            <input value={doc.cui} onChange={(e) => set({ cui: e.target.value })} className={`${input} w-28`} aria-label="Cod fiscal" />
            <input value={doc.number} onChange={(e) => set({ number: e.target.value })} className={`${input} w-20`} aria-label="Număr" />
            <input type="date" value={doc.date} onChange={(e) => set({ date: e.target.value })} className={`${input} min-w-0 flex-1`} aria-label="Data" />
          </div>
          {doc.lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input value={l.label} onChange={(e) => setLine(i, { label: e.target.value })} className={`${input} min-w-0 flex-1`} aria-label={`Linia ${i + 1}`} />
              <input type="number" step="0.01" value={l.amount} onChange={(e) => setLine(i, { amount: Number(e.target.value) })} className={`${input} w-24 text-right`} aria-label={`Suma liniei ${i + 1}`} />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={input} aria-label="Categorie">
              {S.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <span className="ml-auto text-xs text-slate-400">Total</span>
            <input type="number" step="0.01" value={doc.total} onChange={(e) => set({ total: Number(e.target.value) })} className={`${input} w-24 text-right`} aria-label="Total" />
          </div>
          <ChecksList checks={checks} />
          <Button variant="primary" disabled={errors.length > 0} onClick={() => void Promise.resolve(onSubmit(doc, category, checks)).then(() => (setDoc(null), setText(""), setFile(null)))}>
            {errors.length ? `Corectează ${errors.length === 1 ? "câmpul cu ✗" : `cele ${errors.length} câmpuri cu ✗`}` : "Trimite"}
          </Button>
        </div>
      )}
    </div>
  );
}
