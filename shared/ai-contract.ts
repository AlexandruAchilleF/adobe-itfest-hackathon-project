// Contractul dintre browser și /api/ai. Îl importă atât clientul, cât și serverul.

export type AiProviderName = "gemini" | "anthropic" | "mock";

export interface AiAttachment {
  /** ex: "image/jpeg", "image/png", "application/pdf" */
  mimeType: string;
  /** base64 fără prefixul `data:...;base64,` */
  data: string;
}

export interface AiRequest {
  prompt: string;
  system?: string;
  /** JSON Schema pentru răspuns. Dacă lipsește, primești text liber. */
  schema?: Record<string, unknown>;
  attachments?: AiAttachment[];
  /** Răspunsul folosit în modul demo (fără cheie API sau cu provider=mock). */
  mock?: unknown;
  /** Forțează un furnizor pentru cererea asta. */
  provider?: AiProviderName;
  /** Cât așteaptă apelantul în total, în ms (ex. extensia, oprită de Chrome la 30 s). Gemini împarte timpul între model și rezervă. */
  timeoutMs?: number;
}

export interface AiResponse {
  provider: AiProviderName;
  model: string;
  /** Textul brut (pentru cereri fără schemă). */
  text: string;
  /** JSON-ul parsat (pentru cereri cu schemă). */
  data?: unknown;
  ms: number;
}

export interface AiErrorBody {
  error: string;
  hint?: string;
}

export interface HealthResponse {
  active: AiProviderName;
  configured: Record<AiProviderName, boolean>;
  models: Partial<Record<AiProviderName, string>>;
}
