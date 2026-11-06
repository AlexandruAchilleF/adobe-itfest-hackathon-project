// Pagina de pe telefon pentru sondaj (/s?code=XXXX).
import { useState } from "react";
import { useSearch } from "wouter";
import { MascotFigure } from "../modules/mascot/Mascot";
import { useRoom } from "../modules/rooms/useRoom";
import { ANSWER_EVENT, type SurveyState } from "./SurveyPage";

export function SurveyRespondPage() {
  const code = new URLSearchParams(useSearch()).get("code")?.toUpperCase() ?? null;
  const room = useRoom<SurveyState>(code, { name: "Respondent", meta: { role: "respondent" } });
  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const survey = room.state;

  if (!code) return <p className="p-6 text-center text-slate-400">Lipsește codul. Scanează QR-ul.</p>;
  if (!survey) return <p className="p-6 text-center text-slate-400">Se încarcă sondajul…</p>;
  const q = survey.questions[step];

  function answer(value: boolean | number | string) {
    room.send(ANSWER_EVENT, { index: step, value });
    navigator.vibrate?.(20);
    setText("");
    setStep((s) => s + 1);
  }

  const big = "rounded-2xl bg-card py-5 text-lg font-semibold ring-1 ring-line shadow-[inset_0_-4px_0_var(--color-line)] active:bg-coral active:text-white";
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-8">
      {q ? (
        <>
          <p className="text-sm text-slate-400">
            {survey.title} · {step + 1}/{survey.questions.length}
          </p>
          <h1 className="text-2xl font-bold">{q.question}</h1>
          {q.type === "yes_no" && (
            <div className="grid grid-cols-2 gap-3">
              <button className={big} onClick={() => answer(true)}>
                Da
              </button>
              <button className={big} onClick={() => answer(false)}>
                Nu
              </button>
            </div>
          )}
          {q.type === "scale" && (
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={big} onClick={() => answer(n)}>
                  {n}
                </button>
              ))}
            </div>
          )}
          {q.type === "choice" && (
            <div className="grid gap-3">
              {q.choices.map((c, i) => (
                <button key={c} className={big} onClick={() => answer(i)}>
                  {c}
                </button>
              ))}
            </div>
          )}
          {q.type === "text" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) answer(text.trim().slice(0, 280));
              }}
            >
              <textarea value={text} onChange={(e) => setText(e.target.value)} className="h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 p-4 text-lg" />
              <button className="btn btn-primary mt-3 w-full !py-4 text-lg">Trimite</button>
            </form>
          )}
          <button className="text-sm text-slate-500 underline" onClick={() => setStep((s) => s + 1)}>
            Sari peste
          </button>
        </>
      ) : (
        <div className="text-center">
          <div className="flex justify-center">
            <MascotFigure mood="celebrate" size={140} />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Mulțumim!</h1>
          <p className="mt-2 text-slate-400">Răspunsurile tale ne ajută să construim ceva util.</p>
        </div>
      )}
    </main>
  );
}
