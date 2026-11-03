// AI peste documente: răspuns cu citări verificate și ierarhizarea secțiunilor pentru o persona
// (Adobe India Hackathon 2025, runda 1B: „persona + job-to-be-done").

import { z } from "zod";
import { ask } from "./ai";
import { documentContext, type ParsedDocument, sectionsOf, verifyCitations, type VerifiedCitation } from "./documents";

const CitationSchema = z.object({
  page: z.number().describe("numărul paginii, așa cum apare în markerul [p. N]"),
  quote: z.string().describe("fragment copiat EXACT din document, 5-25 de cuvinte"),
});

export const DocAnswer = z.object({
  answer: z.string().describe("răspuns scurt, în limba întrebării"),
  citations: z.array(CitationSchema).describe("1-3 citate care susțin răspunsul"),
  found: z.boolean().describe("false dacă documentul nu conține răspunsul"),
});

export interface DocAnswerResult {
  answer: string;
  found: boolean;
  citations: VerifiedCitation[];
}

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);

/** Linia din document cu cele mai multe cuvinte comune cu întrebarea (pentru modul demo). */
function bestLine(doc: ParsedDocument, query: string) {
  const q = new Set(words(query));
  let best = doc.pages[0]?.lines[0];
  let score = -1;
  for (const l of doc.pages.flatMap((p) => p.lines)) {
    const s = words(l.text).filter((w) => q.has(w)).length;
    if (s > score) [best, score] = [l, s];
  }
  return best;
}

export async function askDocument(doc: ParsedDocument, question: string): Promise<DocAnswerResult> {
  const line = bestLine(doc, question);
  const { data } = await ask({
    system:
      "Răspunzi DOAR pe baza documentului dat. Fiecare afirmație e susținută de un citat copiat exact, cu pagina din markerul [p. N]. Dacă documentul nu conține răspunsul, spune asta și pune found=false.",
    prompt: `Document: ${doc.name}\n\n${documentContext(doc)}\n\nÎntrebare: ${question}`,
    schema: DocAnswer,
    mock: {
      answer: `(demo) Răspunsul se găsește la pagina ${line?.page ?? 1}.`,
      citations: line ? [{ page: line.page, quote: line.text.split(" ").slice(0, 14).join(" ") }] : [],
      found: Boolean(line),
    },
  });
  return { answer: data.answer, found: data.found, citations: verifyCitations(data.citations, doc.pages) };
}

export const RankedSections = z.object({
  sections: z
    .array(
      z.object({
        title: z.string().describe("titlul secțiunii, exact ca în listă"),
        page: z.number(),
        relevance: z.number().describe("0-100"),
        why: z.string().describe("de ce contează pentru persona și sarcina ei, o propoziție"),
      }),
    )
    .describe("cele mai relevante 3-5 secțiuni, în ordine descrescătoare"),
});

export async function rankSections(doc: ParsedDocument, persona: string, job: string) {
  const sections = sectionsOf(doc);
  const list = sections.map((s, i) => `${i + 1}. [p. ${s.heading.page}] ${s.heading.text}: ${s.text.slice(0, 400)}`).join("\n");
  const { data } = await ask({
    system: "Ești analist de documente. Ierarhizezi secțiunile după utilitatea lor pentru o persoană anume și sarcina ei concretă.",
    prompt: `Persona: ${persona}\nSarcina: ${job}\n\nSecțiuni:\n${list}`,
    schema: RankedSections,
    mock: {
      sections: sections.slice(0, 3).map((s, i) => ({
        title: s.heading.text,
        page: s.heading.page,
        relevance: 90 - i * 15,
        why: "(demo) Secțiune relevantă pentru sarcina descrisă.",
      })),
    },
  });
  return data.sections;
}
