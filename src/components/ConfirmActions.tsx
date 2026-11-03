// Pasul de confirmare umană: AI-ul propune, omul aprobă. Răspunsul la
// „ce se întâmplă când AI-ul greșește?" — nimic nu se modifică fără acord.
import { useState } from "react";
import type { PendingConfirmation } from "../lib/useVoiceAgent";
import { Button } from "./ui";

export function ConfirmActions({ pending, describe }: { pending: PendingConfirmation | null; describe?: (name: string, args: unknown) => string }) {
  const [checked, setChecked] = useState<boolean[]>([]);
  if (!pending) return null;
  const values = pending.calls.map((_, i) => checked[i] ?? true);
  return (
    <div role="dialog" aria-label="Confirmă acțiunile" className="rounded-2xl border border-accent/50 bg-accent/10 p-4">
      <p className="mb-2 text-sm font-semibold text-accent">Asistentul vrea să facă {pending.calls.length === 1 ? "o modificare" : `${pending.calls.length} modificări`}:</p>
      <ul className="space-y-2">
        {pending.calls.map((c, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={values[i]}
              onChange={(e) => setChecked(values.map((v, j) => (j === i ? e.target.checked : v)))}
            />
            <span>
              <b>{c.description}</b>
              <span className="block font-mono text-xs text-slate-400">{describe ? describe(c.name, c.args) : JSON.stringify(c.args)}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button
          variant="primary"
          onClick={() => {
            pending.resolve(values);
            setChecked([]);
          }}
        >
          Aprobă
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            pending.resolve(values.map(() => false));
            setChecked([]);
          }}
        >
          Respinge tot
        </Button>
      </div>
    </div>
  );
}
