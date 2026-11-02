// Client pentru /api/ai. Un singur apel: prompt (+ imagini/PDF) → JSON validat cu Zod.
//
//   const Idea = z.object({ title: z.string(), tags: z.array(z.string()) });
//   const { data } = await ask({ prompt: "Dă-mi o idee", schema: Idea });
//   data.title // tipat!

import { z } from "zod";
import type { AiAttachment, AiErrorBody, AiProviderName, AiResponse, HealthResponse } from "../../shared/ai-contract";
import { isDemoMode } from "./demoMode";

export class AiError extends Error {
  constructor(
    message: string,
    public status: number,
    public hint?: string,
  ) {
    super(message);
  }
}

interface BaseOptions {
  prompt: string;
  system?: string;
  /** Imagini/PDF-uri: data URL-uri ("data:image/jpeg;base64,...") sau Blob/File. */
  files?: Array<string | Blob>;
  provider?: AiProviderName;
  signal?: AbortSignal;
}

interface AskOptions<T> extends BaseOptions {
  schema: z.ZodType<T>;
  /** Ce returnează modul demo. Dacă lipsește, serverul generează date din schemă. */
  mock?: T;
}

export async function toAttachment(file: string | Blob): Promise<AiAttachment> {
  const dataUrl =
    typeof file === "string"
      ? file
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) throw new Error("Fișierul trebuie să fie un data URL base64.");
  return { mimeType: match[1], data: match[2] };
}

async function post(body: Record<string, unknown>, signal?: AbortSignal): Promise<AiResponse> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const payload = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as AiResponse | AiErrorBody;
  if (!res.ok || "error" in payload) {
    const err = payload as AiErrorBody;
    throw new AiError(err.error ?? `HTTP ${res.status}`, res.status, err.hint);
  }
  return payload;
}

async function buildBody(opts: BaseOptions) {
  return {
    prompt: opts.prompt,
    system: opts.system,
    attachments: opts.files ? await Promise.all(opts.files.map(toAttachment)) : undefined,
    provider: opts.provider ?? (isDemoMode() ? "mock" : undefined),
  };
}

/** Răspuns structurat: JSON validat cu schema Zod. */
export async function ask<T>(opts: AskOptions<T>): Promise<{ data: T; raw: AiResponse }> {
  const schema = z.toJSONSchema(opts.schema, { target: "draft-2020-12" }) as Record<string, unknown>;
  const raw = await post({ ...(await buildBody(opts)), schema, mock: opts.mock }, opts.signal);
  const parsed = opts.schema.safeParse(raw.data);
  if (!parsed.success) {
    console.warn("[ai] răspuns invalid", raw.data, parsed.error);
    throw new AiError(`Răspunsul AI nu respectă schema: ${z.prettifyError(parsed.error)}`, 502);
  }
  return { data: parsed.data, raw };
}

/** Răspuns text liber. */
export async function askText(opts: BaseOptions & { mock?: string }): Promise<string> {
  const raw = await post({ ...(await buildBody(opts)), mock: opts.mock }, opts.signal);
  return raw.text;
}

export async function aiHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch("/api/health");
    return res.ok ? ((await res.json()) as HealthResponse) : null;
  } catch {
    return null;
  }
}
