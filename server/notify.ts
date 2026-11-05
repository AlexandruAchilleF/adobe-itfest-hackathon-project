// Notificări SMS (Twilio) sau email (Resend), cu mock implicit: fără chei, nimic nu pleacă,
// dar UI-ul arată exact ce s-ar fi trimis. Cheile stau doar pe server (fără prefix VITE_).
//
//   POST /api/notify { channel: "sms", to: "0722 000 201", message: "…", mock?: true }
//   → { status: "sent" | "mock", provider, id, to, message }

export type Channel = "sms" | "email";

export interface NotifyRequest {
  channel: Channel;
  to: string;
  message: string;
  subject?: string;
  /** true = nu trimite nimic, chiar dacă există chei (modul demo) */
  mock?: boolean;
}

export interface NotifyResponse {
  status: "sent" | "mock";
  provider: "twilio" | "resend" | "mock";
  id: string;
  channel: Channel;
  to: string;
  message: string;
}

const MAX_SMS = 480; // ~3 SMS-uri concatenate

export function notifyConfigured(): Record<Channel, boolean> {
  const e = process.env;
  return {
    sms: Boolean(e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN && e.TWILIO_FROM),
    email: Boolean(e.RESEND_API_KEY && e.NOTIFY_FROM_EMAIL),
  };
}

/** „0722 000 201” → „+40722000201”. Numerele cu prefix internațional rămân cum sunt. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  if (/^00\d{8,15}$/.test(digits)) return `+${digits.slice(2)}`;
  if (/^0\d{9}$/.test(digits)) return `+40${digits.slice(1)}`;
  return null;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
const fail = (error: string, status: number, hint?: string) => json({ error, ...(hint ? { hint } : {}) }, status);

export function validate(body: unknown): { ok: true; value: NotifyRequest } | { ok: false; error: string } {
  const b = body as Partial<NotifyRequest> | null;
  if (!b || typeof b !== "object") return { ok: false, error: "Body-ul trebuie să fie un obiect JSON." };
  if (b.channel !== "sms" && b.channel !== "email") return { ok: false, error: "`channel` trebuie să fie „sms” sau „email”." };
  if (typeof b.to !== "string" || !b.to.trim()) return { ok: false, error: "Lipsește destinatarul (`to`)." };
  if (typeof b.message !== "string" || !b.message.trim()) return { ok: false, error: "Lipsește mesajul." };
  if (b.channel === "sms" && b.message.length > MAX_SMS) return { ok: false, error: `Mesajul are ${b.message.length} caractere; maxim ${MAX_SMS} pentru SMS.` };
  if (b.channel === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.to)) return { ok: false, error: "Adresa de email nu e validă." };
  if (b.channel === "sms" && !normalizePhone(b.to)) return { ok: false, error: `Numărul „${b.to}” nu e valid.` };
  return { ok: true, value: { channel: b.channel, to: b.to.trim(), message: b.message.trim(), subject: b.subject, mock: Boolean(b.mock) } };
}

async function sendTwilio(r: NotifyRequest): Promise<string> {
  const e = process.env;
  const auth = Buffer.from(`${e.TWILIO_ACCOUNT_SID}:${e.TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${e.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: { authorization: `Basic ${auth}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: normalizePhone(r.to)!, From: e.TWILIO_FROM!, Body: r.message }),
  });
  const body = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
  if (!res.ok) throw Object.assign(new Error(`Twilio: ${body.message ?? `HTTP ${res.status}`}`), { status: res.status });
  return body.sid ?? "twilio";
}

async function sendResend(r: NotifyRequest): Promise<string> {
  const e = process.env;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${e.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: e.NOTIFY_FROM_EMAIL, to: r.to, subject: r.subject ?? "Notificare", text: r.message }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) throw Object.assign(new Error(`Resend: ${body.message ?? `HTTP ${res.status}`}`), { status: res.status });
  return body.id ?? "resend";
}

export async function handleNotify(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Body-ul nu e JSON valid.", 400);
  }
  const v = validate(body);
  if (!v.ok) return fail(v.error, 400);
  const r = v.value;
  const base = { channel: r.channel, to: r.to, message: r.message };

  if (r.mock || !notifyConfigured()[r.channel]) {
    return json({ ...base, status: "mock", provider: "mock", id: `mock-${Date.now().toString(36)}` } satisfies NotifyResponse);
  }
  try {
    const id = r.channel === "sms" ? await sendTwilio(r) : await sendResend(r);
    return json({ ...base, status: "sent", provider: r.channel === "sms" ? "twilio" : "resend", id } satisfies NotifyResponse);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 502;
    const hint = status === 401 ? "Verifică cheile din setările environment-ului." : r.channel === "sms" ? "Contul Twilio de test trimite doar spre numere verificate." : undefined;
    return fail((err as Error).message, status >= 500 ? 502 : status, hint);
  }
}
