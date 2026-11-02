import { GoogleGenAI, type Part } from "@google/genai";
import type { AiRequest } from "../../shared/ai-contract.js";
import { ProviderError, type ProviderResult } from "./types.js";

export async function callGemini(req: AiRequest, schema?: Record<string, unknown>): Promise<ProviderResult> {
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const parts: Part[] = (req.attachments ?? []).map((a) => ({
    inlineData: { mimeType: a.mimeType, data: a.data },
  }));
  parts.push({ text: req.prompt });

  try {
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        ...(req.system ? { systemInstruction: req.system } : {}),
        ...(schema ? { responseMimeType: "application/json", responseJsonSchema: schema } : {}),
      },
    });
    const text = (res.text ?? "").trim();
    if (!text) {
      const reason = res.candidates?.[0]?.finishReason ?? "necunoscut";
      throw new ProviderError(`Gemini nu a returnat text (finishReason: ${reason}).`, 502);
    }
    return { model, text };
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    const status = (err as { status?: number }).status;
    const message = err instanceof Error ? err.message : String(err);
    if (status === 401 || status === 403) throw new ProviderError("Cheia GEMINI_API_KEY e invalidă.", 401);
    if (status === 429)
      throw new ProviderError(
        "Cotă Gemini depășită (free tier). Așteaptă un minut sau setează GEMINI_MODEL la un model -flash-lite.",
        429,
      );
    if (status === 404)
      throw new ProviderError(`Modelul ${model} nu există. Schimbă GEMINI_MODEL în .env.`, 400);
    throw new ProviderError(`Eroare Gemini${status ? ` (${status})` : ""}: ${message}`, 502);
  }
}
