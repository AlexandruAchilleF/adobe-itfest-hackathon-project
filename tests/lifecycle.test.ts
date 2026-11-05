import { describe, expect, it } from "vitest";
import { type Actor, advanceTo, apply, availableEvents, can, createRequest, isExpired, type Request } from "../src/lib/lifecycle";

const now = new Date("2026-11-07T10:00:00Z");
const ana: Actor = { handle: "ana", role: "giver" };
const dan: Actor = { handle: "dan", role: "giver" };
const adapost: Actor = { handle: "adapost", role: "receiver" };
const altAdapost: Actor = { handle: "alt", role: "receiver" };

const fresh = (extra: Partial<Request> = {}): Request => ({
  ...createRequest({ title: "Supă", category: "hrana", description: "", quantity: 20, unit: "porții", urgency: 4, address: "", lat: 0, lng: 0, receiver: "adapost" }, now),
  ...extra,
});

describe("ciclul cererii", () => {
  it("drumul fericit: creat → acceptat → livrat → confirmat, cu istoric", () => {
    let r = fresh();
    r = apply(r, "accept", ana, now);
    expect(r).toMatchObject({ status: "acceptat", giver: "ana" });
    r = apply(r, "deliver", ana, now);
    expect(r.status).toBe("livrat");
    r = apply(r, "confirm", adapost, now);
    expect(r.status).toBe("confirmat");
    expect(r.history.map((h) => h.event)).toEqual(["create", "accept", "deliver", "confirm"]);
    expect(r.history.at(-1)).toMatchObject({ by: "adapost", giver: "ana" });
  });

  it("„nu am primit” contestă livrarea și păstrează cine trebuia să livreze", () => {
    const r = apply(apply(apply(fresh(), "accept", ana, now), "deliver", ana, now), "dispute", adapost, now, "nu a venit nimeni");
    expect(r.status).toBe("contestat");
    expect(r.history.at(-1)).toMatchObject({ event: "dispute", giver: "ana", note: "nu a venit nimeni" });
    const reopened = apply(r, "reopen", adapost, now);
    expect(reopened.status).toBe("deschis");
    expect(reopened.giver).toBeUndefined();
    expect(reopened.history.some((h) => h.event === "dispute")).toBe(true);
  });

  it("renunțarea readuce cererea la deschis", () => {
    const r = apply(apply(fresh(), "accept", ana, now), "cancel", ana, now);
    expect(r.status).toBe("deschis");
    expect(r.giver).toBeUndefined();
  });

  it("fiecare pas îl face doar omul care are voie", () => {
    const accepted = apply(fresh(), "accept", ana, now);
    expect(can(fresh(), "accept", adapost).ok).toBe(false);
    expect(can(accepted, "deliver", dan)).toEqual({ ok: false, reason: "Altcineva se ocupă de cererea asta." });
    const delivered = apply(accepted, "deliver", ana, now);
    expect(can(delivered, "confirm", ana).ok).toBe(false);
    expect(can(delivered, "confirm", altAdapost)).toEqual({ ok: false, reason: "Nu e cererea ta." });
    expect(can(fresh(), "confirm", adapost).ok).toBe(false);
  });

  it("nu poți sări pași și nu poți schimba o cerere încheiată", () => {
    expect(() => apply(fresh(), "deliver", ana, now)).toThrow(/deschis/);
    const done = advanceTo(fresh(), "confirmat", "ana", now);
    expect(availableEvents(done, ana)).toEqual([]);
    expect(availableEvents(done, adapost)).toEqual([]);
  });

  it("un cont suspendat nu mai poate accepta", () => {
    expect(can(fresh(), "accept", { ...ana, suspended: true }).ok).toBe(false);
  });

  it("cererile expirate nu mai pot fi acceptate", () => {
    const r = fresh({ expiresAt: "2026-11-07T09:00:00Z" });
    expect(isExpired(r, now)).toBe(true);
    expect(can(r, "accept", ana, now)).toEqual({ ok: false, reason: "Cererea a expirat." });
    expect(isExpired(fresh({ expiresAt: "2026-11-07T12:00:00Z" }), now)).toBe(false);
  });

  it("butoanele potrivite pentru fiecare om", () => {
    const accepted = apply(fresh(), "accept", ana, now);
    expect(availableEvents(fresh(), ana)).toEqual(["accept"]);
    expect(availableEvents(accepted, ana)).toEqual(["cancel", "deliver"]);
    expect(availableEvents(apply(accepted, "deliver", ana, now), adapost)).toEqual(["confirm", "dispute"]);
  });

  it("apply nu modifică cererea veche", () => {
    const r = fresh();
    apply(r, "accept", ana, now);
    expect(r.status).toBe("deschis");
    expect(r.history).toHaveLength(1);
  });

  it("advanceTo cere un giver pentru etapele de după accept", () => {
    expect(() => advanceTo(fresh(), "livrat", undefined, now)).toThrow(/giver/);
  });
});
