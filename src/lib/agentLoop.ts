// Bucla agentului: generează, verifică și, dacă pică ceva reparabil, încearcă din nou știind ce a picat.
// Apelurile AI sunt injectate, deci bucla e logică pură.
import type { Check } from "./guard";

export type Candidate<T> = { value: T; checks: Check[] };

const failedOf = (checks: Check[]) => checks.filter((c) => !c.ok);

/**
 * Oprește la primul candidat fără verificări reparabile picate; altfel întoarce candidatul cu cele mai puține picate.
 * Când toate încercările aruncă, `error` e setat, `attempts` e gol și `best.value` nu există:
 * cel care apelează verifică `error` și compune cu mascota originală.
 */
export async function runAgentLoop<T>(
  deps: { generate(attempt: number, failed: Check[]): Promise<T>; check(value: T): Promise<Check[]> },
  maxRetries = 2,
): Promise<{ best: Candidate<T>; attempts: Candidate<T>[]; error?: string }> {
  const attempts: Candidate<T>[] = [];
  let failed: Check[] = [];
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const value = await deps.generate(attempt, failed);
      const checks = await deps.check(value);
      attempts.push({ value, checks });
      failed = failedOf(checks);
      if (!failed.some((c) => c.fixable)) break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (!attempts.length) return { best: { value: undefined as T, checks: [] }, attempts, error: lastError ?? "Generarea n-a reușit." };
  const best = attempts.reduce((a, b) => (failedOf(b.checks).length < failedOf(a.checks).length ? b : a));
  return { best, attempts };
}
