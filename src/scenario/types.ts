// Forma unui scenariu: tot ce ține de domeniul brief-ului stă într-un singur obiect.
// Paginile (cereri, profil, clasament, raport, confirmare) citesc doar de aici.
// Un scenariu nou = un fișier nou în src/scenario/scenarios/ + o linie în src/scenario/config.ts.

import type { DocRules } from "../lib/checks";
import type { FlowDef, SeedStep } from "../lib/flow";
import type { LatLng } from "../modules/map/geo";
import type { NavItem } from "./nav";

export interface Role {
  /** cum îi spune brief-ul: „Donator”, „Adăpost”, „Manager” */
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
  /** cu reports.toRequest: urgența cererii create din raport (1–5, implicit 3) */
  urgency?: number;
}

/** O persoană din seed sau creată pe loc. `handle` e stabil, ca să-l poată referi cererile. */
export interface PersonSeed {
  handle: string;
  name: string;
  role: string;
  phone: string;
  /** zona sau departamentul */
  area: string;
}

export interface RequestSeed {
  title: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  urgency: number;
  address?: string;
  lat?: number;
  lng?: number;
  /** handle-ul celui care a cerut (rolul flow.requester) */
  requester: string;
  /** pașii deja făcuți: [id-ul pasului, cine, motiv?, minute după pasul anterior?] */
  steps?: SeedStep[];
  /** expiră peste atâtea ore de la încărcarea seed-ului (ex: mâncare gătită) */
  expiresInHours?: number;
  /** cu câte ore în urmă a fost creată (implicit eșalonat) */
  hoursAgo?: number;
  extra?: Record<string, unknown>;
}

export interface ReportSeed {
  type: string;
  note: string;
  lat: number;
  lng: number;
  /** acum câte minute a fost raportat */
  minutesAgo: number;
}

export interface Scenario {
  /** prefixul colecțiilor; schimbați-l când schimbați scenariul, ca datele vechi să nu se amestece */
  id: string;
  app: {
    name: string;
    /** fraza „Ajutăm X să Y fără Z”, spusă pe prima pagină */
    tagline: string;
    /** titlul mare de pe prima pagină; textul dintre *steluțe* apare în serif coral. Implicit: numele. */
    headline?: string;
    /** ilustrația din cerul primei pagini (ex: „/hero.png”, generată cu Adobe Firefly; promptul de stil e în docs/DESIGN.md).
     *  Fără ea, eroul e produsul: documentul și cardul primei cereri din seed. */
    heroImage?: string;
    /** ce NU e produsul, afișat tăiat deasupra titlului (ex: „Nu încă un folder cu bonuri scanate”) */
    notThis?: string;
    /** cifrele de impact: cum se numesc unitățile încheiate cu bine (ex: „porții salvate”, „lei rambursați”) */
    impactLabel: string;
    center: LatLng;
  };
  /** problema și cine plătește, cum le-ați verificat. Apar pe /start și în pitch; cifrele nespuse de un om real se marchează „de verificat”. */
  business: {
    problem: string;
    payer: string;
    evidence: string[];
  };
  roles: Record<string, Role>;
  /** stările și pașii cererii (src/lib/flow.ts) */
  flow: FlowDef;
  request: {
    singular: string;
    plural: string;
    addTitle: string;
    addPlaceholder: string;
    offerTitle: string;
    offerPlaceholder: string;
    /** contextul domeniului pentru AI-ul care structurează o cerere scrisă în grabă */
    aiContext: string;
  };
  categories: Category[];
  /** cereri care pornesc de la un document (bon, factură): AI-ul îl citește, codul îl verifică (src/lib/checks.ts) */
  documents?: {
    enabled: boolean;
    title: string;
    /** reguli verificate de cod: vechime, plafoane pe categorie, CUI obligatoriu */
    rules: DocRules;
    /** textul unui document exemplu, pentru demo (butonul „Folosește exemplul”) */
    sample: string;
  };
  /** punctele le calculează codul (src/lib/gamification.ts), nu AI-ul */
  points: {
    /** rolul care primește puncte (cel care ajută) */
    role: string;
    base: number;
    perUnit: number;
    /** peste atâtea unități nu mai primești puncte în plus (anti-umflare) */
    maxUnits: number;
    /** multiplicator pentru urgență 1..5 */
    urgency: [number, number, number, number, number];
    /** puncte scăzute la fiecare „n-a mers” (pas cu outcome: failed) */
    disputePenalty: number;
  };
  ranks: Rank[];
  trust: {
    /** după atâtea „n-a mers” contul e suspendat și nu se mai poate lega de cereri noi */
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
    /** true = fiecare raport devine și o cerere cu flux (sesizare → preluată → rezolvată → confirmată).
     *  Tipurile de raport trebuie să existe și ca categorii, iar cel care raportează are rolul flow.requester. */
    toRequest?: boolean;
  };
  notify: {
    channel: "sms" | "email";
  };
  features: {
    /** harta (cereri cu locație); fără ea, cererile apar doar ca listă */
    map: boolean;
    /** puncte, ranguri, clasament (doar dacă brief-ul le cere) */
    gamification: boolean;
    /** potrivirea „ce poți oferi” → cereri, cu scor determinist + explicație AI */
    matching: boolean;
    /** Documente, Design, Asistent, AI, validarea și ghidul template-ului apar în meniu la „Pentru echipă”.
     *  Rutele merg oricum; înainte de pitch puneți false, ca juriul să vadă un singur drum. */
    optionalModules: boolean;
  };
  mascot: {
    /** asistentul din colț (conversație, acțiuni, tur); fără el paginile merg la fel */
    enabled: boolean;
    /** true = asistentul apare ca personaj desenat (copii, vârstnici, gamificare).
     *  Implicit e un buton sobru: la teme B2B, juridice sau financiare personajul nu ajută (docs/JURIU.md). */
    character?: boolean;
    name: string;
    color: string;
    /** cine e mascota, pentru AI (o propoziție) */
    persona: string;
    /** turul ghidat (pornește cu ?tour=1); la pitch, maxim 3 pași */
    tour: boolean;
    /** paginile pe care mascota nu apare (ex: business canvas, documente) */
    hiddenOn: string[];
  };
  /** meniul principal, când produsul are alte pagini decât fluxul de cereri */
  nav?: NavItem[];
  /** true = „/” e landing page-ul produsului (LandingPage), nu povestea din ScenarioHome */
  landing?: boolean;
  seed: {
    people: PersonSeed[];
    requests: RequestSeed[];
    reports: ReportSeed[];
  };
}

export const defineScenario = (s: Scenario): Scenario => s;
