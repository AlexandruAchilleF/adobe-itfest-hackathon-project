// Generarea ilustrației: stilul din referință + subiectul din marcă + instrucțiunea scrisă de cod.
// Furnizorul e Cloudflare Workers AI (FLUX.2), care are o cotă gratuită zilnică.
// Fără credențiale sau cu AI_PROVIDER=mock întoarce imaginea de rezervă trimisă de client.
import type { AiAttachment } from "../shared/ai-contract.js";
import { corsHeaders } from "./ai.js";
import { ProviderError } from "./providers/types.js";

const MAX_BODY_BYTES = 4 * 1024 * 1024; // Vercel acceptă max ~4.5 MB pe request

export const imageModel = (): string => process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-2-klein-4b";

interface ImageRequest {
  style?: AiAttachment;
  subject?: AiAttachment;
  instruction?: string;
  mock?: string;
}

const hasCredentials = (): boolean => Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);

/** Imaginea din răspunsul Cloudflare, ca data URL; formatul se recunoaște din primii octeți. */
export function imageFromResult(body: unknown): string | null {
  const image = (body as { result?: { image?: unknown } } | null)?.result?.image;
  if (typeof image !== "string" || !image) return null;
  const mime = image.startsWith("/9j/") ? "image/jpeg" : image.startsWith("UklG") ? "image/webp" : "image/png";
  return `data:${mime};base64,${image}`;
}

const toBlob = (a: AiAttachment): Blob => new Blob([Buffer.from(a.data, "base64")], { type: a.mimeType });

export async function generateImage(style: AiAttachment, subject: AiAttachment, instruction: string): Promise<string> {
  const form = new FormData();
  form.set("prompt", instruction);
  form.set("width", "1024");
  form.set("height", "1024");
  form.set("input_image_0", toBlob(style), "stil.png");
  form.set("input_image_1", toBlob(subject), "subiect.png");

  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${imageModel()}`;
  const res = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }, body: form });
  const body = (await res.json().catch(() => null)) as { errors?: Array<{ message?: string }> } | null;
  if (res.status === 401 || res.status === 403) throw new ProviderError("Tokenul CLOUDFLARE_API_TOKEN e invalid.", 401);
  if (res.status === 429) throw new ProviderError("Cota gratuită Cloudflare s-a terminat pe azi. Pune AI_PROVIDER=mock pentru demo.", 429);
  if (res.status === 404) throw new ProviderError(`Modelul ${imageModel()} nu există. Schimbă CLOUDFLARE_IMAGE_MODEL în .env.`, 400);
  if (!res.ok) throw new ProviderError(`Eroare Cloudflare (${res.status}): ${body?.errors?.[0]?.message ?? "necunoscută"}`, 502);
  const image = imageFromResult(body);
  if (!image) throw new ProviderError("Cloudflare nu a returnat o imagine.", 502);
  return image;
}

const isAttachment = (a: AiAttachment | undefined): a is AiAttachment => Boolean(a?.mimeType && a.data);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

async function handle(request: Request): Promise<Response> {
  const started = Date.now();
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "Request prea mare.", hint: "Micșorează imaginile înainte de trimitere." }, 413);

  let body: ImageRequest;
  try {
    body = JSON.parse(raw) as ImageRequest;
  } catch {
    return json({ error: "Body-ul nu e JSON valid." }, 400);
  }

  if (process.env.AI_PROVIDER === "mock" || !hasCredentials()) {
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
