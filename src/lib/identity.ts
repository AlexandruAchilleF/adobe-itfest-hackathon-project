// Roluri fără login: „cine sunt” e un handle ținut în localStorage (per browser/telefon).
// Pentru demo se schimbă dintr-un clic în antet, sau din URL cu ?ca=<handle> (QR pe telefon).

import { useEffect, useState } from "react";
import { scenario } from "../scenario/config";
import { type Person, people } from "../scenario/model";
import { useCollection } from "./store";

const KEY = `hackathon:${scenario.id}:me`;
const listeners = new Set<(h: string) => void>();

export function currentHandle(): string {
  try {
    const fromUrl = new URLSearchParams(location.search).get("ca");
    if (fromUrl) localStorage.setItem(KEY, fromUrl);
    return localStorage.getItem(KEY) ?? scenario.seed.people.find((p) => p.role === "giver")?.handle ?? "";
  } catch {
    return scenario.seed.people[0]?.handle ?? "";
  }
}

export function setCurrentHandle(handle: string): void {
  try {
    localStorage.setItem(KEY, handle);
  } catch {
    /* storage blocat: rămâne doar în memorie */
  }
  listeners.forEach((l) => l(handle));
}

/** Persoana curentă și lista tuturor; `me` e null cât se încarcă. */
export function useMe() {
  const { items, add } = useCollection(people);
  const [handle, setHandle] = useState(currentHandle);
  useEffect(() => {
    listeners.add(setHandle);
    return () => void listeners.delete(setHandle);
  }, []);
  const all = items.map((r) => r.data);
  const me = all.find((p) => p.handle === handle) ?? null;
  const nameOf = (h?: string) => (h ? (all.find((p) => p.handle === h)?.name ?? h) : "—");

  async function join(name: string, role: Person["role"], phone = "", area = "") {
    const slug = name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "om";
    const person: Person = { handle: `${slug}-${Math.random().toString(36).slice(2, 6)}`, name, role, phone, area };
    await add(person);
    setCurrentHandle(person.handle);
    return person;
  }

  return { me, people: all, nameOf, setMe: setCurrentHandle, join };
}
