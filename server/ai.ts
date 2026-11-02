import type { AiErrorBody, AiProviderName, AiRequest, AiResponse, HealthResponse } from "../shared/ai-contract.js";
import { callAnthropic } from "./providers/anthropic.js";
import { callGemini } from "./providers/gemini.js";
import { ProviderError, type ProviderResult } from "./providers/types.js";
import { fakeFromSchema, normalizeSchema } from "./schema.js";

const MAX_BODY_BYTES = 4 * 1024 * 1024; // Vercel acceptă max ~4.5 MB pe request

function configured(): Record<AiProviderName, boolean> {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    mock: true,
  };
}

export function activeProvider(requested?: AiProviderName): AiProviderName {
  const ok = configured();
  const wanted = requested || (process.env.AI_PROVIDER as AiProviderName | undefined);
  if (wanted && ok[wanted]) return wanted;
  if (ok.gemini) return "gemini";
  if (ok.anthropic) return "anthropic";
  return "mock";
}

export function health(): HealthResponse {
  return {
    active: activeProvider(),
    configured: configured(),
    models: {
      gemini: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      anthropic: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    },
  };
}

// Add-on-urile Adobe Express rulează pe https://<id>.wxp.adobe-addons.com (iar local pe
// https://localhost:5241), deci au nevoie de CORS ca să cheme /api/ai.
const ALLOWED_ORIGIN = /^(https:\/\/[\w-]+\.wxp\.adobe-addons\.com|https?:\/\/localhost(:\d+)?)$/;

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  const extra = (process.env.CORS_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  if (!ALLOWED_ORIGIN.test(origin) && !extra.includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "origin",
  };
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function fail(error: string, status: number, hint?: string): Response {
  return json({ error, ...(hint ? { hint } : {}) } satisfies AiErrorBody, status);
}

/** Extrage JSON chiar dacă modelul l-a pus în ```json ... ``` */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) return JSON.parse(fenced[1]);
    const start = trimmed.search(/[[{]/);
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Răspunsul nu conține JSON valid.");
  }
}

export async function handleAi(request: Request): Promise<Response> {
  const response = await handleAiInner(request);
  for (const [key, value] of Object.entries(corsHeaders(request.headers.get("origin")))) {
    response.headers.set(key, value);
  }
  return response;
}

async function handleAiInner(request: Request): Promise<Response> {
  const started = Date.now();
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return fail("Request prea mare.", 413, "Micșorează imaginea (ex: 1024px, JPEG 0.8) înainte de trimitere.");
  }

  let body: AiRequest;
  try {
    body = JSON.parse(raw) as AiRequest;
  } catch {
    return fail("Body-ul nu e JSON valid.", 400);
  }
  if (!body.prompt || typeof body.prompt !== "string") {
    return fail("Lipsește câmpul `prompt`.", 400);
  }

  const provider = activeProvider(body.provider);
  const schema = body.schema ? (normalizeSchema(body.schema) as Record<string, unknown>) : undefined;

  try {
    let result: ProviderResult;
    if (provider === "mock") {
      await new Promise((r) => setTimeout(r, 400)); // latență realistă pentru UI
      const data = body.mock !== undefined ? body.mock : schema ? fakeFromSchema(schema) : undefined;
      result = {
        model: "mock",
        text: typeof data === "string" ? data : data !== undefined ? JSON.stringify(data) : `(demo) ${body.prompt.slice(0, 80)}`,
      };
    } else if (provider === "gemini") {
      result = await callGemini(body, schema);
    } else {
      result = await callAnthropic(body, schema);
    }

    const response: AiResponse = {
      provider,
      model: result.model,
      text: result.text,
      ms: Date.now() - started,
    };
    if (schema) {
      try {
        response.data = parseJsonLoose(result.text);
      } catch {
        return fail("Modelul nu a returnat JSON valid.", 502, "Încearcă din nou sau simplifică schema.");
      }
    }
    return json(response);
  } catch (err) {
    if (err instanceof ProviderError) {
      const hint =
        err.status === 401
          ? "Verifică cheia din .env și repornește `npm run dev`."
          : err.status === 429
            ? "Pune AI_PROVIDER=mock pentru demo offline."
            : undefined;
      return fail(err.message, err.status, hint);
    }
    console.error("[api/ai]", err);
    return fail(err instanceof Error ? err.message : "Eroare necunoscută.", 500);
  }
}
