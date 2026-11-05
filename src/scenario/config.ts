// Scenariul activ. La hackathon: un fișier nou în ./scenarios/ și o linie în SCENARIOS.
// Paginile citesc doar `scenario` și modelele din ./model.ts.
// VITE_SCENARIO=<id> alege altul fără să schimbi codul (testele e2e rulează așa pe amândouă).

import { deconturi } from "./scenarios/deconturi";
import { resurse } from "./scenarios/resurse";
import { vecini } from "./scenarios/vecini";
import type { Scenario } from "./types";

export const SCENARIOS: Record<string, Scenario> = { deconturi, resurse, vecini };

export const scenario: Scenario = SCENARIOS[(import.meta.env.VITE_SCENARIO as string | undefined) ?? ""] ?? deconturi;
