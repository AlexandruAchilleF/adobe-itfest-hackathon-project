// Agregarea răspunsurilor la sondajul live → statistici și fraze gata de pus în pitch.
import type { SurveyQuestion } from "./business";

export type Answer = boolean | number | string;
/** răspunsurile unui participant, indexate după întrebare */
export type Responses = Record<number, Answer>;

export interface QuestionStats {
  question: SurveyQuestion;
  answered: number;
  /** yes_no: [da, nu]; scale: distribuția 1..5; choice: număr pe opțiune */
  counts: number[];
  /** scale: media */
  average: number | null;
  texts: string[];
  /** frază pentru slide, ex: „18 din 25 (72%) au răspuns «Da»” */
  headline: string;
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export function summarizeSurvey(questions: SurveyQuestion[], all: Responses[]): QuestionStats[] {
  return questions.map((q, i) => {
    const values = all.map((r) => r[i]).filter((v) => v !== undefined && v !== "");
    const n = values.length;
    let counts: number[] = [];
    let average: number | null = null;
    let headline = `${n} răspunsuri`;
    const texts: string[] = [];

    if (q.type === "yes_no") {
      const yes = values.filter((v) => v === true).length;
      counts = [yes, n - yes];
      headline = `${yes} din ${n} (${pct(yes, n)}%) au răspuns „Da”`;
    } else if (q.type === "scale") {
      counts = [0, 0, 0, 0, 0];
      let sum = 0;
      for (const v of values) {
        const k = Math.min(5, Math.max(1, Math.round(Number(v))));
        counts[k - 1] += 1;
        sum += k;
      }
      average = n ? Math.round((sum / n) * 10) / 10 : null;
      const high = counts[3] + counts[4];
      headline = n ? `media ${average}/5 · ${high} din ${n} (${pct(high, n)}%) au dat 4 sau 5` : "fără răspunsuri";
    } else if (q.type === "choice") {
      counts = q.choices.map((_, c) => values.filter((v) => v === c).length);
      const top = counts.indexOf(Math.max(...counts, 0));
      headline = n && top >= 0 ? `cel mai ales: „${q.choices[top]}” (${counts[top]} din ${n}, ${pct(counts[top], n)}%)` : "fără răspunsuri";
    } else {
      texts.push(...values.map(String));
      headline = `${n} răspunsuri libere`;
    }
    return { question: q, answered: n, counts, average, texts, headline };
  });
}

export function surveyToCsv(questions: SurveyQuestion[], all: Responses[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = ["respondent", ...questions.map((q) => esc(q.question))].join(",");
  const rows = all.map((r, idx) =>
    [
      idx + 1,
      ...questions.map((q, i) => {
        const v = r[i];
        if (v === undefined) return "";
        if (q.type === "yes_no") return v ? "da" : "nu";
        if (q.type === "choice") return esc(q.choices[Number(v)] ?? "");
        return esc(String(v));
      }),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}
