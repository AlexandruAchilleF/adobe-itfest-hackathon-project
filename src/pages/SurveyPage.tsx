// Sondaj live pentru validarea problemei: participanții răspund de pe telefon (QR),
// iar rezultatele devin fraze gata de pus în pitch.

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Code, ErrorNote, PageHeader, Pill, Spinner } from "../components/ui";
import { QrPanel } from "../components/QrPanel";
import { askText } from "../lib/ai";
import { exampleCanvas, type SurveyQuestion } from "../lib/business";
import { downloadText } from "../lib/share";
import { type Responses, summarizeSurvey, surveyToCsv } from "../lib/survey";
import { randomRoomCode, roomJoinUrl, useRoom } from "../modules/rooms/useRoom";
import { SURVEY_HANDOFF_KEY } from "./BusinessPage";

export interface SurveyState {
  title: string;
  questions: SurveyQuestion[];
  open: boolean;
}
export const ANSWER_EVENT = "answer";

const STORE = "hackathon:survey";

function load(): { code: string; responses: Record<string, Responses>; questions: SurveyQuestion[] } {
  try {
    const handoff = localStorage.getItem(SURVEY_HANDOFF_KEY);
    const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
    if (handoff) {
      localStorage.removeItem(SURVEY_HANDOFF_KEY);
      return { code: randomRoomCode(), responses: {}, questions: JSON.parse(handoff) };
    }
    if (saved?.code) return saved;
  } catch {
    /* ignorăm */
  }
  return { code: randomRoomCode(), responses: {}, questions: exampleCanvas.validation_survey };
}

export function SurveyPage() {
  const initial = useMemo(load, []);
  const [code, setCode] = useState(initial.code);
  const [questions, setQuestions] = useState<SurveyQuestion[]>(initial.questions);
  const [responses, setResponses] = useState<Record<string, Responses>>(initial.responses);
  const [summary, setSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const room = useRoom<SurveyState>(code, { name: "Sondaj", initialState: { title: "Ne ajuți cu 30 de secunde?", questions, open: true }, meta: { role: "screen" }, authority: true });
  const responsesRef = useRef(responses);
  responsesRef.current = responses;

  // primește răspunsuri
  useEffect(
    () =>
      room.on(ANSWER_EVENT, (data, from) => {
        const { index, value } = data as { index: number; value: boolean | number | string };
        setResponses((r) => ({ ...r, [from]: { ...r[from], [index]: value } }));
      }),
    [room.on],
  );

  // salvează local (supraviețuiește unui refresh)
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ code, responses, questions }));
    } catch {
      /* ignorăm */
    }
  }, [code, responses, questions]);

  // publică întrebările către telefoane
  useEffect(() => {
    room.setState((s) => ({ ...(s ?? { title: "Ne ajuți cu 30 de secunde?", open: true }), questions }));
  }, [questions]);

  const all = Object.values(responses);
  const stats = summarizeSurvey(questions, all);

  async function aiSummary() {
    setBusy(true);
    setError(null);
    try {
      const text = await askText({
        system: "Ești coach de pitch. Scrii 3 bullet-uri scurte, oneste, pentru un slide de validare. Nu exagera cifrele.",
        prompt: `Rezultatele sondajului făcut la hackathon (${all.length} respondenți):\n${stats.map((s) => `- ${s.question.question}: ${s.headline}`).join("\n")}`,
        mock: stats.map((s) => `• ${s.headline} — ${s.question.question}`).join("\n"),
      });
      setSummary(text);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function updateQuestion(i: number, patch: Partial<SurveyQuestion>) {
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  }

  return (
    <div>
      <PageHeader title="Sondaj live de validare" description="Dovada că problema există, adunată chiar la hackathon. Participanții și mentorii răspund de pe telefon în 30 de secunde.">
        <div className="flex gap-2">
          <Pill ok={all.length > 0}>{all.length} respondenți</Pill>
          <Pill ok={room.transport === "supabase"}>{room.transport === "supabase" ? "Supabase" : "local (tab-uri)"}</Pill>
        </div>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <Card title="Rezultate (gata pentru slide)">
            <ul className="space-y-4">
              {stats.map((s, i) => (
                <li key={i}>
                  <p className="text-sm text-slate-400">{s.question.question}</p>
                  <p className="text-lg font-semibold">{s.headline}</p>
                  {s.question.type !== "text" && s.counts.length > 0 && (
                    <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-800">
                      {s.counts.map((c, k) => (
                        <div key={k} className="h-full" style={{ width: `${s.answered ? (c / s.answered) * 100 : 0}%`, background: `hsl(${35 + k * 40} 90% 55%)` }} title={`${c}`} />
                      ))}
                    </div>
                  )}
                  {s.texts.length > 0 && (
                    <ul className="mt-1 space-y-1 text-sm text-slate-300">
                      {s.texts.slice(-5).map((t, k) => (
                        <li key={k}>„{t}”</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" onClick={aiSummary} disabled={busy || !all.length}>
                {busy && <Spinner />} Rezumat pentru pitch
              </Button>
              <Button onClick={() => downloadText(surveyToCsv(questions, all), "sondaj.csv", "text/csv")} disabled={!all.length}>
                CSV
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm("Ștergi toate răspunsurile și pornești un sondaj nou?")) {
                    setResponses({});
                    setCode(randomRoomCode());
                  }
                }}
              >
                Sondaj nou
              </Button>
            </div>
            <ErrorNote error={error} />
            {summary && <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-sm">{summary}</pre>}
          </Card>
          <Card title="Întrebări">
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                  <input value={q.question} onChange={(e) => updateQuestion(i, { question: e.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
                  <select value={q.type} onChange={(e) => updateQuestion(i, { type: e.target.value as SurveyQuestion["type"] })} className="rounded-lg border border-slate-700 bg-slate-800 px-2 text-sm">
                    <option value="yes_no">Da / Nu</option>
                    <option value="scale">Scală 1–5</option>
                    <option value="choice">Variante</option>
                    <option value="text">Text liber</option>
                  </select>
                  {q.type === "choice" && (
                    <input
                      value={q.choices.join(", ")}
                      onChange={(e) => updateQuestion(i, { choices: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) })}
                      placeholder="variante, separate prin virgulă"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    />
                  )}
                  <Button variant="ghost" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                    ✕
                  </Button>
                </div>
              ))}
              <Button onClick={() => setQuestions((qs) => [...qs, { question: "Întrebare nouă", type: "yes_no", choices: [] }])}>+ Întrebare</Button>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Sfat: întrebați despre trecut („Ți s-a întâmplat luna asta…?”), nu despre viitor („Ai folosi…?”) — oamenii sunt politicoși cu ideile altora.
            </p>
          </Card>
        </div>
        <Card>
          <QrPanel url={roomJoinUrl(code, "/s")} label="Scanează și răspunde" />
          <p className="mt-3 text-xs text-slate-400">
            Telefoanele au nevoie de Supabase și de un deploy public. Răspunsurile se salvează în browserul ăsta. În cod: <Code>summarizeSurvey()</Code>.
          </p>
        </Card>
      </div>
    </div>
  );
}
