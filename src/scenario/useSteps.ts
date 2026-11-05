// Un pas din fluxul cererii, cap-coadă: aplică regula, salvează, calculează punctele,
// trimite notificarea rolului din config. Folosit de pagina cererilor și de pagina din SMS.

import { apply, type Actor, type Request, transitionOf } from "../lib/flow";
import { confirmationReward } from "../lib/gamification";
import { useMe } from "../lib/identity";
import { sendNotification } from "../lib/notify";
import { type Rec, useCollection } from "../lib/store";
import { mascot } from "../modules/mascot/mascot";
import { scenario } from "./config";
import { outbox, requests } from "./model";

const S = scenario;

export const confirmLink = (id: string) => `${location.origin}/c/${id}`;

export function useSteps() {
  const { items, update } = useCollection(requests);
  const { people, nameOf } = useMe();

  async function step(rec: Rec<Request>, id: string, actor: Actor, note?: string): Promise<{ next: Request; notice: string | null }> {
    const t = transitionOf(S.flow, id);
    const all = items.map((r) => r.data);
    const next = apply(S.flow, rec.data, id, actor, new Date(), note);
    await update(rec.id, next);

    const credited = next.history.at(-1)!.actors[S.points.role];
    let notice: string | null = null;
    let points: number | undefined;
    if (t?.outcome === "done" && S.features.gamification && credited) {
      const after = items.map((r) => (r.id === rec.id ? next : r.data));
      const reward = confirmationReward(all, after, credited, S);
      points = reward.gained;
      notice = `+${reward.gained} puncte pentru ${nameOf(credited)}${reward.rankUp ? `. Rang nou: ${reward.rankUp.name}!` : ""}`;
      mascot.say(notice, "celebrate");
    } else if (t?.outcome === "done") {
      notice = `Încheiată: ${t.done}.`;
      mascot.say(`Gata: ${nameOf(actor.handle)} ${t.done}. Bucla e închisă.`, "celebrate");
    } else if (t?.outcome === "failed") {
      notice = `Am notat: ${nameOf(actor.handle)} ${t.done}.${S.features.gamification && credited ? ` ${nameOf(credited)} pierde ${S.points.disputePenalty} puncte.` : ""}`;
      mascot.say("Am notat că n-a mers. Nu se socotește ca reușită.", "worried");
    }

    // notificarea rolului din config (ex: cel care a cerut, la livrare)
    const role = t?.notify?.role;
    const toHandle = role === S.flow.requester ? next.requester : role ? (next.actors[role] ?? rec.data.actors[role]) : undefined;
    const to = people.find((p) => p.handle === toHandle);
    if (t?.notify && to) {
      const actorsNames = Object.fromEntries(Object.entries({ ...rec.data.actors, ...next.actors }).map(([r, h]) => [r, nameOf(h)]));
      const message = t.notify.message({ title: next.title, by: nameOf(actor.handle), requester: nameOf(next.requester), actors: actorsNames, quantity: `${next.quantity} ${next.unit}`, note, points, link: confirmLink(rec.id) });
      const sent = await sendNotification(outbox, { channel: S.notify.channel, to: { handle: to.handle, name: to.name, address: to.phone }, message, subject: S.app.name, requestId: rec.id });
      const how = sent.status === "trimis" ? "trimis" : sent.status === "simulat" ? "simulat" : "NETRIMIS";
      notice = [notice, `${S.notify.channel === "sms" ? "SMS" : "Email"} ${how} către ${to.name}.`].filter(Boolean).join(" ");
    }
    return { next, notice };
  }

  return { step };
}
