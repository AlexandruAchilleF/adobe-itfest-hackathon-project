// Ce apare în meniu și unde apare mascota, decis doar din scenariu (logică pură, cu teste).
import type { Scenario } from "./types";

export interface NavItem {
  href: string;
  label: string;
}

export const TEAM_NAV: NavItem[] = [
  { href: "/business", label: "Business canvas" },
  { href: "/survey", label: "Sondaj" },
  { href: "/docs", label: "Documente" },
  { href: "/design", label: "Design editabil" },
  { href: "/assistant", label: "Asistent" },
  { href: "/ai", label: "AI (unealtă)" },
  { href: "/start", label: "Ghidul template-ului" },
];

/** Meniul principal: un singur drum, cu cuvintele scenariului. */
export function mainNav(s: Scenario): NavItem[] {
  return [
    { href: "/harta", label: s.features.map ? "Harta" : `${s.request.plural[0].toUpperCase()}${s.request.plural.slice(1)}` },
    { href: "/profil", label: "Profilul meu" },
    ...(s.features.gamification ? [{ href: "/clasament", label: "Clasament" }] : []),
    ...(s.reports.enabled ? [{ href: "/raport", label: "Raportează" }] : []),
  ];
}

/** „Pentru echipă” apare doar cu features.optionalModules; rutele merg oricum. */
export const teamNav = (s: Scenario): NavItem[] => (s.features.optionalModules ? TEAM_NAV : []);

export const showMascot = (s: Scenario, path: string): boolean => s.mascot.enabled && !s.mascot.hiddenOn.includes(path);
