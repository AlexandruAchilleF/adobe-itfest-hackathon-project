// Scenariul activ. La hackathon: un fișier nou în ./scenarios/ și o linie în SCENARIOS.
// Paginile citesc doar `scenario` și modelele din ./model.ts.

import { spire } from "./scenarios/spire";
import type { Scenario } from "./types";

export const SCENARIOS: Record<string, Scenario> = { spire };

export const scenario: Scenario = SCENARIOS[(import.meta.env.VITE_SCENARIO as string | undefined) ?? ""] ?? spire;
