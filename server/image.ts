// Generarea ilustrației: stilul din referință + subiectul din marcă + instrucțiunea scrisă de cod.
// Fără cheie sau cu AI_PROVIDER=mock întoarce imaginea de rezervă trimisă de client.
import { GoogleGenAI } from "@google/genai";
import type { AiAttachment } from "../shared/ai-contract.js";
import { corsHeaders } from "./ai.js";
import { ProviderError } from "./providers/types.js";

const MAX_BODY_BYTES = 4 * 1024 * 1024; // Vercel acceptă max ~4.5 MB pe request

export const imageModel = (): string => process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

interface ImageRequest {
  style?: AiAttachment;
  subject?: AiAttachment;
  instruction?: string;
  mock?: string;
}

interface CandidateLike {
  content?: { parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string } }> };
}

/** Prima imagine din răspunsul modelului, ca data URL. */
export function firstInlineImage(candidates: CandidateLike[] | undefined): string | null {
  for (const part of candidates?.[0]?.content?.parts ?? []) {
    const { mimeType, data } = part.inlineData ?? {};
    if (mimeType && data) return `data:${mimeType};base64,${data}`;
  }
  return null;
}

export async function generateImage(style: AiAttachment, subject: AiAttachment, instruction: string): Promise<string> {
  const model = imageModel();
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ inlineData: style }, { inlineData: subject }, { text: instruction }] }],
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });
    const image = firstInlineImage(res.candidates);
    if (!image) throw new ProviderError(`Gemini nu a returnat o imagine (finishReason: ${res.candidates?.[0]?.finishReason ?? "necunoscut"}).`, 502);
    return image;
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    const status = (err as { status?: number }).status;
    const message = err instanceof Error ? err.message : String(err);
    if (status === 401 || status === 403) throw new ProviderError("Cheia GEMINI_API_KEY e invalidă.", 401);
    if (status === 429) throw new ProviderError("Cotă Gemini depășită. Modelele de imagine pot cere un cont cu plată; așteaptă un minut sau pune AI_PROVIDER=mock.", 429);
    if (status === 404) throw new ProviderError(`Modelul ${model} nu există. Schimbă GEMINI_IMAGE_MODEL în .env.`, 400);
    throw new ProviderError(`Eroare Gemini${status ? ` (${status})` : ""}: ${message}`, 502);
  }
}

const isAttachment = (a: AiAttachment | undefined): a is AiAttachment => Boolean(a?.mimeType && a.data);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

async function handle(request: Request): Promise<Response> {
  const started = Date.now();
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "Request prea mare.", hint: "Micșorează imaginile (ex: 1024px, JPEG 0.8) înainte de trimitere." }, 413);

  let body: ImageRequest;
  try {
    body = JSON.parse(raw) as ImageRequest;
  } catch {
    return json({ error: "Body-ul nu e JSON valid." }, 400);
  }

  if (process.env.AI_PROVIDER === "mock" || !process.env.GEMINI_API_KEY) {
    if (!body.mock) return json({ error: "Lipsește câmpul `mock`." }, 400);
    return json({ image: body.mock, model: "mock", ms: Date.now() - started });
  }

  if (!isAttachment(body.style) || !isAttachment(body.subject) || !body.instruction) {
    return json({ error: "Lipsesc `style`, `subject` sau `instruction`." }, 400);
  }
  try {
    const image = await generateImage(body.style, body.subject, body.instruction);
    return json({ image, model: imageModel(), ms: Date.now() - started });
  } catch (err) {
    if (err instanceof ProviderError) return json({ error: err.message }, err.status);
    console.error("[api/image]", err);
    return json({ error: err instanceof Error ? err.message : "Eroare necunoscută." }, 500);
  }
}

export async function handleImage(request: Request): Promise<Response> {
  const response = await handle(request);
  for (const [key, value] of Object.entries(corsHeaders(request.headers.get("origin")))) response.headers.set(key, value);
  return response;
}
