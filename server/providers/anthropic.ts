import Anthropic from "@anthropic-ai/sdk";
import type { AiRequest } from "../../shared/ai-contract.js";
import { ProviderError, type ProviderResult } from "./types.js";

// Modelele care acceptă `fallbacks: "default"` (redirecționare automată dacă un
// model refuză cererea). Pentru altele, parametrul ar da eroare 400.
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export async function callAnthropic(req: AiRequest, schema?: Record<string, unknown>): Promise<ProviderResult> {
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
  const effort = (process.env.ANTHROPIC_EFFORT || "low") as Effort;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const a of req.attachments ?? []) {
    if (a.mimeType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.data } });
    } else if (/^image\/(jpeg|png|gif|webp)$/.test(a.mimeType)) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: a.mimeType as "image/jpeg", data: a.data },
      });
    } else {
      throw new ProviderError(`Tip de fișier nesuportat de Claude: ${a.mimeType}`, 400);
    }
  }
  content.push({ type: "text", text: req.prompt });

  const useFallbacks = FALLBACK_MODELS.has(model);
  try {
    const res = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      ...(useFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      ...(req.system ? { system: req.system } : {}),
      messages: [{ role: "user", content }],
      output_config: {
        effort,
        ...(schema ? { format: { type: "json_schema" as const, schema } } : {}),
      },
    });

    if (res.stop_reason === "refusal") {
      throw new ProviderError("Modelul a refuzat cererea. Reformulează promptul.", 422);
    }
    if (res.stop_reason === "max_tokens") {
      throw new ProviderError("Răspunsul a fost tăiat (max_tokens). Cere un output mai scurt.", 502);
    }
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return { model: res.model, text };
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new ProviderError("Cheia ANTHROPIC_API_KEY e invalidă.", 401);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new ProviderError("Limită de rată atinsă la Claude. Mai încearcă în câteva secunde.", 429);
    }
    if (err instanceof Anthropic.BadRequestError) {
      throw new ProviderError(`Cerere respinsă de Claude: ${err.message}`, 400);
    }
    if (err instanceof Anthropic.APIError) {
      throw new ProviderError(`Eroare Claude (${err.status ?? "rețea"}): ${err.message}`, 502);
    }
    throw err;
  }
}
