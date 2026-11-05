// Un pas din ciclul cererii, cap-coadă: aplică regula, salvează, calculează punctele,
// trimite notificarea celeilalte părți. Folosit de hartă și de pagina de confirmare din SMS.

import { confirmationReward } from "../lib/gamification";
import { useMe } from "../lib/identity";
import { type Actor, apply, type LifecycleEvent, type Request } from "../lib/lifecycle";
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

  async function step(rec: Rec<Request>, event: LifecycleEvent, actor: Actor, note?: string): Promise<{ next: Request; notice: string | null }> {
    const all = items.map((r) => r.data);
    const next = apply(rec.data, event, actor, new Date(), note);
    await update(rec.id, next);

    let notice: string | null = null;
    let points: number | undefined;
    if (event === "confirm" && next.giver) {
      const after = items.map((r) => (r.id === rec.id ? next : r.data));
      const reward = confirmationReward(all, after, next.giver, S);
      points = reward.gained;
      notice = `+${reward.gained} puncte pentru ${nameOf(next.giver)}${reward.rankUp ? `. Rang nou: ${reward.rankUp.name}!` : ""}`;
      mascot.say(notice, "celebrate");
    } else if (event === "dispute") {
      notice = `Am notat „nu am primit”. ${nameOf(rec.data.giver)} pierde ${S.points.disputePenalty} puncte.`;
      mascot.say("Am notat că n-a ajuns. Nu se mai socotește ca livrare.", "worried");
    }

    // cine trebuie anunțat: la accept/livrare cel care a cerut, la confirmare/contestare cel care a dat
    const template = { accept: S.notify.accepted, deliver: S.notify.delivered, confirm: S.notify.confirmed, dispute: S.notify.disputed }[event as "accept"];
    const toHandle = event === "accept" || event === "deliver" ? next.receiver : event === "confirm" || event === "dispute" ? rec.data.giver : undefined;
    const to = people.find((p) => p.handle === toHandle);
    if (template && to) {
      const message = template({
        title: next.title,
        giver: nameOf(next.giver ?? rec.data.giver),
        receiver: nameOf(next.receiver),
        quantity: `${next.quantity} ${next.unit}`,
        points,
        link: confirmLink(rec.id),
      });
      const sent = await sendNotification(outbox, { channel: S.notify.channel, to: { handle: to.handle, name: to.name, address: to.phone }, message, subject: S.app.name, requestId: rec.id });
      const how = sent.status === "trimis" ? "trimis" : sent.status === "simulat" ? "simulat" : "NETRIMIS";
      notice = [notice, `${S.notify.channel === "sms" ? "SMS" : "Email"} ${how} către ${to.name}.`].filter(Boolean).join(" ");
    }
    return { next, notice };
  }

  return { step };
}
