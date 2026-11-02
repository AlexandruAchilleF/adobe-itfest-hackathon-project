// Comenzi vocale care acționează în aplicație. Definiți acțiunile, AI-ul le alege.
// Aici: un editor de design controlat din voce („pune un cerc galben sus și scrie Bun venit").

import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button, Card, Code, ErrorNote, PageHeader, Spinner } from "../components/ui";
import { defineAction } from "../lib/agent";
import { type Design, exampleDesign, newId } from "../lib/design";
import { useVoiceAgent } from "../lib/useVoiceAgent";
import { DesignCanvas, type DesignCanvasHandle } from "../modules/canvas/DesignCanvas";

const POSITIONS = ["sus-stânga", "sus", "sus-dreapta", "stânga", "centru", "dreapta", "jos-stânga", "jos", "jos-dreapta"] as const;
type Position = (typeof POSITIONS)[number];

function place(pos: Position, w: number, h: number) {
  const i = POSITIONS.indexOf(pos);
  return { x: ((i % 3) * 2 + 1) * (w / 6), y: (Math.floor(i / 3) * 2 + 1) * (h / 6) };
}

const Color = z.string().describe("culoare hex, ex: #f43f5e");

export function AgentPage() {
  const ref = useRef<DesignCanvasHandle>(null);
  const [design, setDesign] = useState<Design>({ ...exampleDesign, elements: exampleDesign.elements.slice(0, 1) });
  const [text, setText] = useState("");
  const W = design.width;
  const H = design.height;

  const actions = useMemo(
    () => [
      defineAction({
        name: "add_text",
        description: "Adaugă un text pe pânză",
        args: z.object({ text: z.string(), color: Color, position: z.enum(POSITIONS), size: z.enum(["mic", "mediu", "mare"]) }),
        run: async ({ text, color, position, size }) => {
          const p = place(position, W, H);
          const fontSize = { mic: 40, mediu: 64, mare: 110 }[size];
          const width = W * 0.6;
          await ref.current?.addElement({ type: "text", id: newId(), x: p.x - width / 2, y: p.y - fontSize / 2, width, text, fontSize, fill: color, fontWeight: size === "mare" ? "bold" : "normal", align: "center" });
        },
        examples: ["scrie un titlu", "adaugă textul bun venit"],
        mockArgs: { text: "Bun venit!", color: "#f8fafc", position: "centru", size: "mare" },
      }),
      defineAction({
        name: "add_shape",
        description: "Adaugă o formă (cerc sau dreptunghi)",
        args: z.object({ shape: z.enum(["cerc", "dreptunghi"]), color: Color, position: z.enum(POSITIONS), size: z.enum(["mic", "mediu", "mare"]) }),
        run: async ({ shape, color, position, size }) => {
          const p = place(position, W, H);
          const s = { mic: 0.08, mediu: 0.15, mare: 0.25 }[size] * W;
          await ref.current?.addElement(
            shape === "cerc"
              ? { type: "circle", id: newId(), x: p.x, y: p.y, radius: s, fill: color }
              : { type: "rect", id: newId(), x: p.x - s, y: p.y - s * 0.6, width: s * 2, height: s * 1.2, fill: color, radius: 24 },
          );
        },
        examples: ["pune un cerc roșu", "adaugă un dreptunghi albastru"],
        mockArgs: { shape: "cerc", color: "#f5a524", position: "sus-dreapta", size: "mediu" },
      }),
      defineAction({
        name: "set_background",
        description: "Schimbă culoarea de fundal",
        args: z.object({ color: Color }),
        run: ({ color }) => ref.current?.setBackground(color),
        examples: ["fă fundalul verde", "schimbă fundalul"],
        mockArgs: { color: "#14532d" },
      }),
      defineAction({
        name: "undo",
        description: "Anulează ultima modificare",
        args: z.object({}),
        run: () => ref.current?.undo(),
        examples: ["anulează", "dă înapoi", "undo"],
        mockArgs: {},
      }),
      defineAction({
        name: "clear",
        description: "Șterge tot de pe pânză",
        args: z.object({}),
        run: () => ref.current?.setDesign({ ...design, elements: [] }),
        examples: ["șterge tot", "golește pânza"],
        mockArgs: {},
      }),
    ],
    [W, H, design],
  );

  const agent = useVoiceAgent({
    actions,
    persona: "Ești asistentul vocal al unui editor de afișe. Poziții posibile: " + POSITIONS.join(", ") + ".",
    context: () => {
      const d = ref.current?.getDesign();
      return d ? `Pânză ${d.width}x${d.height}, fundal ${d.background}. Elemente: ${d.elements.map((e) => (e.type === "text" ? `text „${e.text}”` : e.type)).join(", ") || "niciunul"}.` : "";
    },
  });

  return (
    <div>
      <PageHeader
        title="Comenzi vocale → acțiuni"
        description="Spune ce vrei, iar AI-ul alege și execută acțiunile aplicației. Merge pentru orice idee: definiți acțiunile voastre cu defineAction()."
      />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="min-w-0 space-y-4">
          <Card title="Vorbește sau scrie">
            <div className="flex gap-2">
              <Button variant={agent.listening ? "danger" : "primary"} onClick={agent.listening ? agent.stopListening : agent.listen} disabled={!agent.supported}>
                {agent.listening ? "■ Ascult…" : "🎤 Vorbește"}
              </Button>
              {agent.thinking && <Spinner />}
            </div>
            {agent.interim && <p className="mt-2 text-sm italic text-slate-400">{agent.interim}…</p>}
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void agent.send(text);
                setText("");
              }}
            >
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="ex: pune un cerc roșu sus și scrie Salut" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
              <Button type="submit" disabled={!text.trim() || agent.thinking}>
                Trimite
              </Button>
            </form>
            <ErrorNote error={agent.error} />
          </Card>
          <Card title="Jurnal">
            <ul className="max-h-80 space-y-3 overflow-auto text-sm">
              {[...agent.log].reverse().map((t, i) => (
                <li key={i} className="rounded-xl bg-slate-800/60 p-3">
                  <p className="text-slate-400">„{t.input}”</p>
                  <p className="mt-1">{t.say}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {t.actions.map((a) => `${a.ok ? "✓" : "✗"} ${a.name}${a.error ? ` (${a.error})` : ""}`).join("  ") || "nicio acțiune"}
                  </p>
                </li>
              ))}
              {!agent.log.length && <li className="text-slate-500">Încearcă: „fă fundalul albastru închis și scrie Concert vineri mare, cu alb”</li>}
            </ul>
          </Card>
          <p className="text-xs text-slate-500">
            În cod: <Code>defineAction({"{ name, description, args, run }"})</Code> + <Code>useVoiceAgent({"{ actions, context }"})</Code>.
          </p>
        </div>
        <div className="min-w-0">
          <DesignCanvas ref={ref} design={design} onChange={setDesign} className="max-w-[640px] overflow-hidden rounded-xl shadow-2xl" />
        </div>
      </div>
    </div>
  );
}
