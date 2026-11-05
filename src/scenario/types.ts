// Forma unui scenariu: tot ce ține de domeniul brief-ului stă într-un singur obiect.
// Paginile (hartă, profil, clasament, raport, confirmare) citesc doar de aici.
// Un scenariu nou = un fișier nou în src/scenario/scenarios/ + o linie în src/scenario/config.ts.

import type { LatLng } from "../modules/map/geo";

export type RoleId = "giver" | "receiver";

export interface Role {
  /** cum îi spune brief-ul: „Donator”, „Adăpost”, „Vecin” */
  label: string;
  plural: string;
  icon: string;
  /** o propoziție pe butonul de pe prima pagină: ce face omul ăsta în aplicație */
  pitch: string;
}

export interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export interface Rank {
  name: string;
  /** punctele de la care începe rangul */
  min: number;
  /** culoarea ramei pozei de profil */
  frame: string;
}

export interface ReportType {
  id: string;
  label: string;
  icon: string;
  color: string;
}

/** O persoană din seed sau creată pe loc. `handle` e stabil, ca să-l poată referi cererile. */
export interface PersonSeed {
  handle: string;
  name: string;
  role: RoleId;
  phone: string;
  /** zona, pentru potrivire și pentru textul de pe hartă */
  area: string;
}

export interface RequestSeed {
  title: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  urgency: number;
  address: string;
  lat: number;
  lng: number;
  /** handle-ul celui care a cerut (rolul receiver) */
  receiver: string;
  /** pentru cereri deja în lucru sau încheiate: cine a ajutat și până unde s-a ajuns */
  giver?: string;
  stage?: "deschis" | "acceptat" | "livrat" | "confirmat" | "contestat";
  /** expiră peste atâtea ore de la încărcarea seed-ului (ex: mâncare gătită) */
  expiresInHours?: number;
}

export interface ReportSeed {
  type: string;
  note: string;
  lat: number;
  lng: number;
  /** acum câte minute a fost raportat */
  minutesAgo: number;
}

export interface NotifyContext {
  title: string;
  giver: string;
  receiver: string;
  quantity: string;
  points?: number;
  link?: string;
}

export interface Scenario {
  /** prefixul colecțiilor; schimbați-l când schimbați scenariul, ca datele vechi să nu se amestece */
  id: string;
  app: {
    name: string;
    /** fraza „Ajutăm X să Y fără Z”, spusă pe prima pagină */
    tagline: string;
    /** cifrele de impact de pe prima pagină: cum se numesc unitățile livrate (ex: „porții salvate”) */
    impactLabel: string;
    center: LatLng;
  };
  roles: Record<RoleId, Role>;
  request: {
    singular: string;
    plural: string;
    /** textele butoanelor din ciclul cererii */
    actions: { accept: string; cancel: string; deliver: string; confirm: string; dispute: string; reopen: string };
    addTitle: string;
    addPlaceholder: string;
    offerTitle: string;
    offerPlaceholder: string;
    /** contextul domeniului pentru AI-ul care structurează o cerere scrisă în grabă */
    aiContext: string;
  };
  categories: Category[];
  /** punctele le calculează codul (src/lib/gamification.ts), nu AI-ul */
  points: {
    base: number;
    perUnit: number;
    /** peste atâtea unități nu mai primești puncte în plus (anti-umflare) */
    maxUnits: number;
    /** multiplicator pentru urgență 1..5 */
    urgency: [number, number, number, number, number];
    /** puncte scăzute la fiecare „nu am primit” */
    disputePenalty: number;
  };
  ranks: Rank[];
  trust: {
    /** după atâtea „nu am primit” contul e suspendat și nu mai poate accepta cereri */
    suspendAfterDisputes: number;
  };
  reports: {
    enabled: boolean;
    title: string;
    /** întrebarea de pe telefon */
    prompt: string;
    types: ReportType[];
    /** până la câte minute un raport e „proaspăt” (opac pe hartă) */
    freshMinutes: number;
    /** după câte minute dispare de pe hartă */
    expireMinutes: number;
  };
  notify: {
    channel: "sms" | "email";
    /** mesajele trimise la fiecare pas al ciclului; `link` duce la pagina de confirmare */
    accepted: (c: NotifyContext) => string;
    delivered: (c: NotifyContext) => string;
    confirmed: (c: NotifyContext) => string;
    disputed: (c: NotifyContext) => string;
  };
  features: {
    /** potrivirea „ce poți oferi” → cereri, cu scor determinist + explicație AI */
    matching: boolean;
    /** Documente, Design, Asistent, AI, validarea și ghidul template-ului apar în meniu la „Pentru echipă”.
     *  Rutele merg oricum; înainte de pitch puneți false, ca juriul să vadă un singur drum. */
    optionalModules: boolean;
  };
  mascot: {
    enabled: boolean;
    name: string;
    color: string;
    /** cine e mascota, pentru AI (o propoziție) */
    persona: string;
    /** turul ghidat (pornește cu ?tour=1); la pitch, maxim 3 pași */
    tour: boolean;
    /** paginile pe care mascota nu apare (ex: business canvas, documente) */
    hiddenOn: string[];
  };
  seed: {
    people: PersonSeed[];
    requests: RequestSeed[];
    reports: ReportSeed[];
  };
}

export const defineScenario = (s: Scenario): Scenario => s;
