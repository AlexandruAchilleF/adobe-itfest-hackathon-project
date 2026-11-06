// „Unde se blochează”: cronometrul procesului, calculat de cod din istoricul cererilor.
// Costul în bani se calculează doar din cifrele introduse de om (din interviuri), nu din presupuneri.

import { useState } from "react";
import { z } from "zod";
import { defineAction } from "../lib/agent";
import { Button, Card, PageHeader } from "../components/ui";
import { useMe } from "../lib/identity";
import { formatDuration, monthlyCost, processStats } from "../lib/metrics";
import { sendNotification } from "../lib/notify";
import { useCollection } from "../lib/store";
import { mascot } from "../modules/mascot/mascot";
import { useMascotPage } from "../modules/mascot/page";
import { scenario } from "../scenario/config";
import { outbox, requests, roleOf } from "../scenario/model";
import { StatusPill } from "../scenario/ui/parts";

const S = scenario;

export function ProcessPage() {
  const { items } = useCollection(requests);
  const { people, nameOf } = useMe();
  const st = processStats(S.flow, items);
  const max = Math.max(1, ...st.byState.map((s) => s.avgMinutes));
  const [perMonth, setPerMonth] = useState("");
  const [minutes, setMinutes] = useState("");
  const [rate, setRate] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const cost = perMonth && minutes && rate ? monthlyCost(Number(perMonth), Number(minutes), Number(rate)) : null;
  const longest = st.waiting[0];

  useMascotPage({
    title: "Unde se blochează",
    context: () => [`Blocaj: ${st.bottleneck?.label ?? "—"}.`, ...st.waiting.map((w) => `id=${w.id} | ${w.title} | așteaptă de ${formatDuration(w.minutes)} | la ${w.who ? nameOf(w.who) : w.waitingOn.join(", ")}`)].join("\n"),
    actions: [
      defineAction({
        name: "send_reminder",
        kind: "write",
        description: `Trimite un reminder (${S.notify.channel}) omului la care așteaptă ceva (${S.request.singular})`,
        describe: ({ id }) => {
          const w = st.waiting.find((x) => x.id === id);
          return w ? `Trimite ${S.notify.channel.toUpperCase()} către ${w.who ? nameOf(w.who) : w.waitingOn.map((r) => roleOf(r).label).join(", ")}: „${w.title}” așteaptă de ${formatDuration(w.minutes)}` : "Trimite un reminder";
        },
        args: z.object({ id: z.string().describe("id-ul din context") }),
        run: async ({ id }) => {
          const w = st.waiting.find((x) => x.id === id);
          if (!w) throw new Error("nu așteaptă nimic cu id-ul ăsta");
          await remind(w);
        },
        examples: ["amintește-i celui care întârzie", "trimite un reminder", "grăbește-l pe contabil"],
        mockArgs: (input: string) => {
          const t = input.toLowerCase();
          const match = st.waiting.find((w) => w.waitingOn.some((r) => t.includes(roleOf(r).label.toLowerCase())) || (w.who && t.includes(nameOf(w.who).split(" ")[0].toLowerCase())));
          return { id: (match ?? longest)?.id ?? "" };
        },
      }),
      defineAction({
        name: "explain_bottleneck",
        kind: "read",
        description: "Spune unde se pierde cel mai mult timp",
        args: z.object({}),
        run: () => mascot.say(st.bottleneck ? `Cel mai mult se așteaptă la „${st.bottleneck.label}”: în medie ${formatDuration(st.bottleneck.avgMinutes)}.` : "Încă nu sunt date.", "idle"),
        examples: ["unde se blochează", "ce durează cel mai mult"],
        mockArgs: {},
      }),
    ],
  });

  async function remind(w: (typeof st.waiting)[number]) {
    const role = w.waitingOn[0];
    const to = people.find((p) => p.handle === w.who) ?? people.find((p) => p.role === role);
    if (!to) return;
    const message = `„${w.title}” te așteaptă de ${formatDuration(w.minutes)} (${S.flow.states.find((s) => s.id === w.state)?.label}). ${location.origin}/cereri`;
    const n = await sendNotification(outbox, { channel: S.notify.channel, to: { handle: to.handle, name: to.name, address: to.phone }, message, subject: S.app.name, requestId: w.id });
    setSent(`Reminder ${n.status} către ${to.name}.`);
    mascot.say(`I-am amintit lui ${to.name}: „${w.title}” așteaptă de ${formatDuration(w.minutes)}.`, "idle");
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Cronometrul" title="Unde se *blochează.*" description={`Cât stă fiecare ${S.request.singular} la fiecare pas, calculat din istoric. Nicio cifră de aici nu vine de la AI.`} />
      <div className="grid gap-3 sm:grid-cols-3" data-testid="process-summary">
        <div className="card p-5">
          <p className="text-[1.9rem] leading-tight font-semibold tracking-[-0.02em] text-ink tabular-nums">{st.avgCycleMinutes !== null ? formatDuration(st.avgCycleMinutes) : "—"}</p>
          <p className="mt-1 text-sm text-muted">în medie de la cerere la încheiere ({st.closed} încheiate)</p>
        </div>
        <div className="card p-5">
          <p className="text-[1.9rem] leading-tight font-semibold tracking-[-0.02em] text-ink tabular-nums">{st.bottleneck ? st.bottleneck.label : "—"}</p>
          <p className="mt-1 text-sm text-muted">pasul unde se pierde cel mai mult timp{st.bottleneck ? ` (așteaptă: ${st.bottleneck.waitingOn.map((r) => roleOf(r).label.toLowerCase()).join(", ")})` : ""}</p>
        </div>
        <div className="card p-5">
          <p className="text-[1.9rem] leading-tight font-semibold tracking-[-0.02em] text-ink tabular-nums">{st.returned}</p>
          <p className="mt-1 text-sm text-muted">{S.request.plural} întoarse măcar o dată</p>
        </div>
      </div>

      <Card title="Timp mediu pe pas">
        <ul className="space-y-2 text-sm" data-testid="process-bars">
          {st.byState.map((s) => (
            <li key={s.state}>
              <div className="flex justify-between text-xs text-slate-400">
                <span>
                  <StatusPill status={s.state} /> așteaptă: {s.waitingOn.map((r) => roleOf(r).label.toLowerCase()).join(", ") || "—"}
                </span>
                <span>
                  {formatDuration(s.avgMinutes)} · {s.visits}×
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-paper-2">
                <div className={`h-full rounded-full ${s.state === st.bottleneck?.state ? "bg-bad" : "bg-ink/25"}`} style={{ width: `${Math.max(2, (s.avgMinutes / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Acum așteaptă">
        <ul className="space-y-2 text-sm" data-testid="process-waiting">
          {st.waiting.slice(0, 8).map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-paper px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <b>{w.title}</b> <StatusPill status={w.state} />
                <span className="block text-xs text-slate-400">
                  {w.who ? `de ${formatDuration(w.minutes)} la ${nameOf(w.who)}` : `de ${formatDuration(w.minutes)}, nepreluată încă (${w.waitingOn.map((r) => roleOf(r).label.toLowerCase()).join(", ")})`}
                </span>
              </span>
              <Button variant="ghost" onClick={() => void remind(w)}>
                Trimite reminder
              </Button>
            </li>
          ))}
          {!st.waiting.length && <li className="text-slate-500">Nimic nu așteaptă.</li>}
        </ul>
        {sent && <p className="mt-2 text-xs text-accent">{sent}</p>}
      </Card>

      <Card title="Cât costă azi, fără aplicație (cifre din interviuri)">
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex flex-col gap-1">
            {S.request.plural} pe lună
            <input type="number" value={perMonth} onChange={(e) => setPerMonth(e.target.value)} className="w-28 px-2.5 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            minute de lucru manual / {S.request.singular}
            <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-28 px-2.5 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            cost orar (lei)
            <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="w-28 px-2.5 py-1.5" />
          </label>
        </div>
        <p className="mt-3 text-sm" data-testid="process-cost">
          {cost ? (
            <>
              <b className="text-accent">{cost.hours} ore</b> și <b className="text-accent">{cost.cost.toLocaleString("ro-RO")} lei</b> pe lună. Spuneți în pitch de la cine sunt cifrele.
            </>
          ) : (
            <span className="text-slate-500">Completați cu cifrele spuse de oamenii întrebați. Nu le ghiciți.</span>
          )}
        </p>
      </Card>
    </div>
  );
}
