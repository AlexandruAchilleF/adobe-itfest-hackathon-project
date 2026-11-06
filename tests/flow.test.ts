import { describe, expect, it } from "vitest";
import { type Actor, advance, apply, available, can, createRequest, describeEntry, type FlowDef, happyPath, isExpired, type Request, validateFlow, waitingOn } from "../src/lib/flow";
import { deconturi } from "../src/scenario/scenarios/deconturi";
import { vecini } from "../src/scenario/scenarios/vecini";

const now = new Date("2026-11-07T10:00:00Z");
const F = vecini.flow;
const ana: Actor = { handle: "ana", role: "vecin" };
const dan: Actor = { handle: "dan", role: "vecin" };
const ion: Actor = { handle: "ion", role: "varstnic" };
const alt: Actor = { handle: "alt", role: "varstnic" };
const data = { title: "Apă", category: "apa", description: "", quantity: 6, unit: "sticle", urgency: 4, address: "", lat: 0, lng: 0 };
const fresh = (extra: Partial<Request> = {}): Request => ({ ...createRequest(F, data, "ion", now), ...extra });

describe("flux cu 2 roluri (scenariul exemplu)", () => {
  it("drumul fericit, cu istoric și cine era legat de cerere", () => {
    let r = apply(F, fresh(), "accept", ana, now);
    expect(r).toMatchObject({ status: "acceptat", actors: { vecin: "ana" } });
    r = apply(F, r, "deliver", ana, now);
    r = apply(F, r, "confirm", ion, now);
    expect(r.status).toBe("confirmat");
    expect(r.history.map((h) => h.event)).toEqual(["create", "accept", "deliver", "confirm"]);
    expect(r.history.at(-1)).toMatchObject({ by: "ion", role: "varstnic", actors: { vecin: "ana" } });
  });

  it("„nu am primit” păstrează pe cine privește; „cere din nou” dezleagă pe toți", () => {
    const disputed = apply(F, apply(F, apply(F, fresh(), "accept", ana, now), "deliver", ana, now), "dispute", ion, now, "n-a venit nimeni");
    expect(disputed.history.at(-1)).toMatchObject({ event: "dispute", actors: { vecin: "ana" }, note: "n-a venit nimeni" });
    const reopened = apply(F, disputed, "reopen", ion, now);
    expect(reopened).toMatchObject({ status: "deschis", actors: {} });
  });

  it("„Renunț” dezleagă doar omul care renunță", () => {
    expect(apply(F, apply(F, fresh(), "accept", ana, now), "cancel", ana, now)).toMatchObject({ status: "deschis", actors: {} });
  });

  it("fiecare pas îl face doar omul care are voie", () => {
    const accepted = apply(F, fresh(), "accept", ana, now);
    expect(can(F, fresh(), "accept", ion).ok).toBe(false);
    expect(can(F, accepted, "deliver", dan)).toEqual({ ok: false, reason: "Altcineva se ocupă de cererea asta." });
    const delivered = apply(F, accepted, "deliver", ana, now);
    expect(can(F, delivered, "confirm", alt)).toEqual({ ok: false, reason: "Nu e cererea ta." });
    expect(() => apply(F, fresh(), "deliver", ana, now)).toThrow(/deschis/);
    expect(can(F, fresh(), "nu-exista", ana).ok).toBe(false);
  });

  it("cont suspendat și cereri expirate", () => {
    expect(can(F, fresh(), "accept", { ...ana, suspended: true }).ok).toBe(false);
    const old = fresh({ expiresAt: "2026-11-07T09:00:00Z" });
    expect(isExpired(F, old, now)).toBe(true);
    expect(can(F, old, "accept", ana, now)).toEqual({ ok: false, reason: "Cererea a expirat." });
  });

  it("butoanele pentru fiecare om și pe cine așteaptă cererea", () => {
    const accepted = apply(F, fresh(), "accept", ana, now);
    expect(available(F, accepted, ana).map((t) => t.id)).toEqual(["cancel", "deliver"]);
    expect(available(F, apply(F, accepted, "deliver", ana, now), ion).map((t) => t.id)).toEqual(["confirm", "dispute"]);
    expect(waitingOn(F, fresh())).toEqual(["vecin"]);
  });

  it("apply nu modifică cererea veche", () => {
    const r = fresh();
    apply(F, r, "accept", ana, now);
    expect(r).toMatchObject({ status: "deschis", actors: {} });
  });

  it("cronologia folosește textele din config", () => {
    const r = apply(F, fresh(), "accept", ana, now);
    expect(describeEntry(F, r.history[1], (h) => h.toUpperCase())).toBe("ANA s-a oferit");
  });
});

// Un proces de birou: 3 roluri, retur pentru corectură cu motiv obligatoriu, confirmarea finală a celui care a cerut.
const office: FlowDef = {
  requester: "angajat",
  initial: "trimis",
  states: [
    { id: "trimis", label: "trimis", tone: "open" },
    { id: "de-corectat", label: "de corectat", tone: "returned" },
    { id: "aprobat", label: "aprobat", tone: "progress" },
    { id: "platit", label: "plătit", tone: "waiting" },
    { id: "incasat", label: "încasat", tone: "done" },
    { id: "neincasat", label: "neîncasat", tone: "failed" },
  ],
  transitions: [
    { id: "aproba", label: "Aprobă", done: "a aprobat", from: ["trimis"], to: "aprobat", role: "manager" },
    { id: "returneaza", label: "Trimite înapoi", done: "a trimis înapoi", from: ["trimis"], to: "de-corectat", role: "manager", note: "required", danger: true },
    { id: "retrimite", label: "Retrimite", done: "a corectat și a retrimis", from: ["de-corectat"], to: "trimis", role: "angajat" },
    { id: "plateste", label: "Plătește", done: "a plătit", from: ["aprobat"], to: "platit", role: "contabil" },
    { id: "incaseaza", label: "Am primit banii", done: "a confirmat încasarea", from: ["platit"], to: "incasat", role: "angajat", outcome: "done" },
    { id: "neincasat", label: "N-am primit banii", done: "spune că n-a primit banii", from: ["platit"], to: "neincasat", role: "angajat", outcome: "failed", danger: true },
  ],
};
const andrei: Actor = { handle: "andrei", role: "angajat" };
const sefa: Actor = { handle: "maria", role: "manager" };
const altSef: Actor = { handle: "victor", role: "manager" };
const contabil: Actor = { handle: "irina", role: "contabil" };

describe("flux cu 3 roluri (proces de birou)", () => {
  const decont = () => createRequest(office, { ...data, title: "Taxi client", unit: "lei", quantity: 87 }, "andrei", now);

  it("trimis → retur cu motiv → retrimis → aprobat → plătit → încasat", () => {
    let r = decont();
    expect(() => apply(office, r, "returneaza", sefa, now)).toThrow(/motivul/);
    r = apply(office, r, "returneaza", sefa, now, "Lipsește bonul");
    expect(r).toMatchObject({ status: "de-corectat", actors: { manager: "maria" } });
    // după retur, același manager rămâne legat: altul nu poate aproba
    r = apply(office, r, "retrimite", andrei, now);
    expect(can(office, r, "aproba", altSef).ok).toBe(false);
    r = apply(office, apply(office, r, "aproba", sefa, now), "plateste", contabil, now);
    r = apply(office, r, "incaseaza", andrei, now);
    expect(r).toMatchObject({ status: "incasat", actors: { manager: "maria", contabil: "irina" } });
  });

  it("contabilul nu poate plăti înainte de aprobare, iar managerul nu poate încasa", () => {
    expect(can(office, decont(), "plateste", contabil).ok).toBe(false);
    expect(can(office, decont(), "incaseaza", sefa).ok).toBe(false);
  });

  it("seed-ul folosește aceleași reguli", () => {
    const roles: Record<string, string> = { andrei: "angajat", maria: "manager", irina: "contabil" };
    const r = advance(office, decont(), [["aproba", "maria"], ["plateste", "irina", undefined, 60 * 24]], (h) => roles[h], now);
    expect(r.status).toBe("platit");
    expect(new Date(r.history.at(-1)!.at).getTime() - new Date(r.history[1].at).getTime()).toBe(24 * 3600_000);
    expect(() => advance(office, decont(), [["plateste", "irina"]], (h) => roles[h], now)).toThrow();
  });

  it("validateFlow trece pe un flux corect și prinde greșelile", () => {
    expect(validateFlow(office, ["angajat", "manager", "contabil"])).toEqual([]);
    const broken: FlowDef = { ...office, initial: "x", transitions: [...office.transitions.slice(0, 2), { ...office.transitions[2], role: "sef", to: "nicaieri" }] };
    const p = validateFlow(broken, ["angajat", "manager", "contabil"]).join("\n");
    expect(p).toContain("Starea inițială x");
    expect(p).toContain("rolul sef");
    expect(p).toContain("starea nicaieri");
    expect(p).toContain("aprobat nu are niciun pas de ieșire");
    expect(p).toContain("reușită");
  });
});

describe("drumul fericit (povestea de pe prima pagină)", () => {
  it("urmează pașii buni până la reușită, fără „trimite înapoi” și „n-a mers”", () => {
    expect(happyPath(deconturi.flow).map((t) => t.id)).toEqual(["aproba", "plateste", "incaseaza"]);
    expect(happyPath(F).at(-1)?.outcome).toBe("done");
  });
  it("se oprește la o buclă în loc să se învârtă", () => {
    const loop: FlowDef = { requester: "a", initial: "x", states: [], transitions: [
      { id: "1", label: "", done: "", from: ["x"], to: "y", role: "a" },
      { id: "2", label: "", done: "", from: ["y"], to: "x", role: "a" },
    ] };
    expect(happyPath(loop).map((t) => t.id)).toEqual(["1", "2"]);
  });
});
