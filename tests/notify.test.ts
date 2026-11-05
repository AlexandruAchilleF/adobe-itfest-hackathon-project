import { afterEach, describe, expect, it, vi } from "vitest";
import { handleNotify, normalizePhone, validate } from "../server/notify";

const call = (body: unknown) => handleNotify(new Request("http://x/api/notify", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  vi.unstubAllGlobals();
});
const noKeys = () => {
  for (const k of ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM", "RESEND_API_KEY", "NOTIFY_FROM_EMAIL"]) delete process.env[k];
};

describe("api/notify", () => {
  it("normalizează numerele românești", () => {
    expect(normalizePhone("0722 000 201")).toBe("+40722000201");
    expect(normalizePhone("+40 722 000 201")).toBe("+40722000201");
    expect(normalizePhone("0040722000201")).toBe("+40722000201");
    expect(normalizePhone("123")).toBeNull();
  });

  it("validează canalul, destinatarul și lungimea", () => {
    expect(validate({ channel: "fax", to: "x", message: "m" }).ok).toBe(false);
    expect(validate({ channel: "sms", to: "abc", message: "m" }).ok).toBe(false);
    expect(validate({ channel: "sms", to: "0722000201", message: "x".repeat(481) }).ok).toBe(false);
    expect(validate({ channel: "email", to: "nu-e-email", message: "m" }).ok).toBe(false);
    expect(validate({ channel: "sms", to: "0722000201", message: " salut " })).toMatchObject({ ok: true, value: { message: "salut" } });
  });

  it("fără chei: mock, nu cheamă rețeaua", async () => {
    noKeys();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await call({ channel: "sms", to: "0722 000 201", message: "Ați primit? https://x/c/1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "mock", provider: "mock", to: "0722 000 201" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("cu chei Twilio: trimite SMS cu numărul normalizat", async () => {
    Object.assign(process.env, { TWILIO_ACCOUNT_SID: "AC1", TWILIO_AUTH_TOKEN: "t", TWILIO_FROM: "+15550000000" });
    const fetchSpy = vi.fn(async () => Response.json({ sid: "SM123" }, { status: 201 }));
    vi.stubGlobal("fetch", fetchSpy);
    const res = await call({ channel: "sms", to: "0722 000 201", message: "Ați primit?" });
    expect(await res.json()).toMatchObject({ status: "sent", provider: "twilio", id: "SM123" });
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/Accounts/AC1/Messages.json");
    expect(String(init.body)).toContain("To=%2B40722000201");
  });

  it("modul demo forțează mock chiar dacă există chei", async () => {
    Object.assign(process.env, { TWILIO_ACCOUNT_SID: "AC1", TWILIO_AUTH_TOKEN: "t", TWILIO_FROM: "+1555" });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await (await call({ channel: "sms", to: "0722000201", message: "m", mock: true })).json()).toMatchObject({ status: "mock" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("eroare de la furnizor → mesaj clar și indiciu", async () => {
    Object.assign(process.env, { TWILIO_ACCOUNT_SID: "AC1", TWILIO_AUTH_TOKEN: "t", TWILIO_FROM: "+1555" });
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "Authenticate" }, { status: 401 })));
    const res = await call({ channel: "sms", to: "0722000201", message: "m" });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Twilio: Authenticate", hint: expect.stringContaining("environment") });
  });

  it("email prin Resend", async () => {
    noKeys();
    Object.assign(process.env, { RESEND_API_KEY: "re_1", NOTIFY_FROM_EMAIL: "demo@exemplu.ro" });
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: "em_1" })));
    expect(await (await call({ channel: "email", to: "a@b.ro", message: "m" })).json()).toMatchObject({ status: "sent", provider: "resend", id: "em_1" });
  });

  it("body invalid → 400", async () => {
    const res = await handleNotify(new Request("http://x/api/notify", { method: "POST", body: "{nu" }));
    expect(res.status).toBe(400);
  });
});
