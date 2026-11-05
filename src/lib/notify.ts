// Client pentru /api/notify. Fiecare notificare (trimisă, simulată sau eșuată) rămâne în
// colecția „notificari”, ca UI-ul să arate „SMS trimis către…” și în modul demo.

import { z } from "zod";
import { isDemoMode } from "./demoMode";
import { type Collection, createCollection } from "./store";

export const Notification = z.object({
  at: z.string(),
  channel: z.enum(["sms", "email"]),
  /** handle-ul destinatarului */
  to: z.string(),
  toName: z.string(),
  address: z.string(),
  message: z.string(),
  status: z.enum(["trimis", "simulat", "eșuat"]),
  error: z.string().optional(),
  requestId: z.string().optional(),
});
export type Notification = z.infer<typeof Notification>;

export const outboxFor = (scenarioId: string): Collection<Notification> => createCollection(`${scenarioId}:notificari`, Notification, []);

interface Send {
  channel: "sms" | "email";
  to: { handle: string; name: string; address: string };
  message: string;
  subject?: string;
  requestId?: string;
}

/** Trimite și notează în outbox. Nu aruncă: o notificare eșuată nu oprește ciclul cererii. */
export async function sendNotification(outbox: Collection<Notification>, n: Send): Promise<Notification> {
  let status: Notification["status"] = "eșuat";
  let error: string | undefined;
  try {
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: n.channel, to: n.to.address, message: n.message, subject: n.subject, mock: isDemoMode() }),
    });
    const body = (await res.json().catch(() => ({}))) as { status?: string; error?: string; hint?: string };
    if (res.ok) status = body.status === "sent" ? "trimis" : "simulat";
    else error = [body.error ?? `HTTP ${res.status}`, body.hint].filter(Boolean).join(" ");
  } catch (err) {
    error = (err as Error).message;
  }
  const rec: Notification = { at: new Date().toISOString(), channel: n.channel, to: n.to.handle, toName: n.to.name, address: n.to.address, message: n.message, status, ...(error ? { error } : {}), ...(n.requestId ? { requestId: n.requestId } : {}) };
  await outbox.add(rec);
  return rec;
}
