import { GoogleGenAI, type Part } from "@google/genai";
import type { AiRequest } from "../../shared/ai-contract.js";
import { ProviderError, type ProviderResult } from "./types.js";

const DEFAULT_TIMEOUT_MS = 20_000;
class Timeout extends Error {}

/** Ce merită încercat pe alt model: supraîncărcare, cotă, eroare de server, lipsă de răspuns. */
const tryNextModel = (err: unknown) => {
  const status = (err as { status?: number }).status ?? 0;
  return err instanceof Timeout || status === 429 || status >= 500;
};

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Timeout(`nu a răspuns în ${ms / 1000} s`)), ms);
  });
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
}

const MAX_BUDGET_MS = 60_000;
/** Cu un termen total și un model de rezervă, principalul primește 60%, ca rezerva să mai aibă timp. */
const PRIMARY_SHARE = 0.6;

async function callModel(model: string, req: AiRequest, schema: Record<string, unknown> | undefined, timeoutMs: number): Promise<ProviderResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const parts: Part[] = (req.attachments ?? []).map((a) => ({
    inlineData: { mimeType: a.mimeType, data: a.data },
  }));
  parts.push({ text: req.prompt });

  const res = await withTimeout(
    ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        ...(req.system ? { systemInstruction: req.system } : {}),
        ...(schema ? { responseMimeType: "application/json", responseJsonSchema: schema } : {}),
      },
    }),
    timeoutMs,
  );
  const text = (res.text ?? "").trim();
  if (!text) {
    const reason = res.candidates?.[0]?.finishReason ?? "necunoscut";
    throw new ProviderError(`Gemini nu a returnat text (finishReason: ${reason}).`, 502);
  }
  return { model, text };
}

function toProviderError(err: unknown, model: string): ProviderError {
  if (err instanceof ProviderError) return err;
  const status = (err as { status?: number }).status;
  const message = err instanceof Error ? err.message : String(err);
  if (status === 401 || status === 403) return new ProviderError("Cheia GEMINI_API_KEY e invalidă.", 401);
  if (status === 429) return new ProviderError("Cotă Gemini depășită (free tier). Așteaptă un minut sau setează GEMINI_MODEL la un model -flash-lite.", 429);
  if (status === 404) return new ProviderError(`Modelul ${model} nu există. Schimbă GEMINI_MODEL în .env.`, 400);
  return new ProviderError(`Eroare Gemini${status ? ` (${status})` : ""}: ${message}`, 502);
}

export async function callGemini(req: AiRequest, schema?: Record<string, unknown>): Promise<ProviderResult> {
  const primary = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const fallback = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash";
  const models = [...new Set([primary, fallback])];

  const perModel = Number(process.env.GEMINI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const budget = Number(req.timeoutMs) > 0 ? Math.min(Number(req.timeoutMs), MAX_BUDGET_MS) : undefined;
  const deadline = budget ? Date.now() + budget : undefined;

  let last: unknown;
  for (const [i, model] of models.entries()) {
    let timeoutMs = perModel;
    if (budget && deadline) {
      const share = i === 0 && models.length > 1 ? budget * PRIMARY_SHARE : deadline - Date.now();
      timeoutMs = Math.max(1, Math.min(perModel, share));
    }
    try {
      return await callModel(model, req, schema, timeoutMs);
    } catch (err) {
      last = err;
      if (!tryNextModel(err)) throw toProviderError(err, model);
      console.warn(`[gemini] ${model}: ${err instanceof Error ? err.message.slice(0, 120) : err}`);
    }
  }
  throw toProviderError(last, models[models.length - 1]);
}
