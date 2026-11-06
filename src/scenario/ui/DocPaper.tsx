// Documentul cererii (bon, factură, chitanță) desenat ca obiectul real: hârtie termică, marginea
// tăiată în zimți. E semnătura vizuală a ecranelor cu documente: omul recunoaște bonul dintr-o privire.
// Fontul monospațiat e doar aici, pentru că așa arată un bon tipărit; restul aplicației folosește tabular-nums.

import type { ReactNode } from "react";
import type { Doc } from "../../lib/checks";

const money = (n: number) => n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function DocPaper({ doc, className = "", children }: { doc: Doc; className?: string; children?: ReactNode }) {
  return (
    <figure className={`paper relative w-full max-w-[230px] px-4 pt-5 pb-7 font-mono text-[11.5px] leading-[1.6] ${className}`} aria-label={`Documentul: ${doc.vendor}, total ${money(doc.total)} ${doc.currency}`}>
      <p className="text-center font-bold uppercase">{doc.vendor}</p>
      {doc.cui && <p className="text-center">CUI {doc.cui}</p>}
      <hr className="my-2 border-0 border-t border-dashed border-[#b8b6ae]" />
      {doc.lines.map((l, i) => (
        <p key={i} className="flex justify-between gap-2">
          <span className="truncate">{l.label}</span>
          <span className="shrink-0">{money(l.amount)}</span>
        </p>
      ))}
      <hr className="my-2 border-0 border-t border-dashed border-[#b8b6ae]" />
      <p className="flex justify-between gap-2 font-bold">
        <span>TOTAL {doc.currency.toUpperCase()}</span>
        <span>{money(doc.total)}</span>
      </p>
      <hr className="my-2 border-0 border-t border-dashed border-[#b8b6ae]" />
      <p className="text-center">
        {doc.date.split("-").reverse().join(".")}
        {doc.number && ` · nr. ${doc.number}`}
      </p>
      {children}
    </figure>
  );
}
