// Contractele pentru video și logo, doar în mock. Funcțiile serverless nu păstrează memorie între apeluri,
// așa că jobul de mock își ține starea în id; la un furnizor real, id-ul va fi cel al operației lui.
import type { AiAttachment } from "../shared/ai-contract.js";
import { MAX_VIDEO_SECONDS, VIDEO_ASPECTS, type LogoRequest, type LogoResponse, type VideoJob, type VideoJobCreated, type VideoRequest } from "../shared/media-contract.js";
import { corsHeaders } from "./ai.js";

const MAX_BODY_BYTES = 4 * 1024 * 1024; // Vercel acceptă max ~4.5 MB pe request
const DEFAULT_MOCK_MS = 3000;
const MOCK_PREFIX = "mock_";

interface MockJob {
  url?: string;
  error?: string;
  startedAt: number;
  afterMs: number;
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(request.headers.get("origin")) },
  });
}

/** Corpul cererii, ca obiect, sau răspunsul de eroare gata de trimis. */
async function readBody<T>(request: Request): Promise<Partial<T> | Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(request, { error: "Request prea mare.", hint: "Micșorează imaginile înainte de trimitere." }, 413);
  try {
    const body: unknown = JSON.parse(raw);
    if (body && typeof body === "object") return body as Partial<T>;
  } catch {
    // tratat mai jos, la fel ca un JSON care nu e obiect
  }
  return json(request, { error: "Body-ul nu e JSON valid." }, 400);
}

/** Doar adrese pe care browserul le poate reda fără risc: din aplicație sau https. */
const isSafeUrl = (url: unknown): url is string => typeof url === "string" && ((url.startsWith("/") && !url.startsWith("//")) || url.startsWith("https://"));

const isAttachment = (a: Partial<AiAttachment> | null | undefined): boolean => Boolean(a && typeof a.mimeType === "string" && a.mimeType && typeof a.data === "string" && a.data);

function videoProblem(b: Partial<VideoRequest>): string | null {
  if (typeof b.prompt !== "string" || !b.prompt) return "Lipsește câmpul `prompt`.";
  if (!VIDEO_ASPECTS.includes(b.aspect as never)) return `\`aspect\` trebuie să fie unul dintre: ${VIDEO_ASPECTS.join(", ")}.`;
  if (!Number.isInteger(b.seconds) || b.seconds! < 1 || b.seconds! > MAX_VIDEO_SECONDS) return `\`seconds\` trebuie să fie un întreg între 1 și ${MAX_VIDEO_SECONDS}.`;
  if (b.keyframes !== undefined && (!Array.isArray(b.keyframes) || !b.keyframes.every(isAttachment))) return "`keyframes` conține un cadru fără `mimeType` sau `data`.";
  if (!b.mock) return "Lipsește câmpul `mock`: niciun furnizor video nu e legat.";
  if (!isSafeUrl(b.mock.url) && !(typeof b.mock.error === "string" && b.mock.error)) return "`mock` are nevoie de un `url` sigur sau de un `error`.";
  return null;
}

export async function handleVideoCreate(request: Request): Promise<Response> {
  const body = await readBody<VideoRequest>(request);
  if (body instanceof Response) return body;
  const problem = videoProblem(body);
  if (problem) return json(request, { error: problem }, 400);

  const { url, error, afterMs } = body.mock!;
  const job: MockJob = { ...(isSafeUrl(url) ? { url } : { error }), startedAt: Date.now(), afterMs: afterMs ?? DEFAULT_MOCK_MS };
  const created: VideoJobCreated = { jobId: MOCK_PREFIX + Buffer.from(JSON.stringify(job)).toString("base64url"), model: "mock" };
  return json(request, created, 202);
}

function decodeJob(id: string): MockJob | null {
  if (!id.startsWith(MOCK_PREFIX)) return null;
  try {
    const job = JSON.parse(Buffer.from(id.slice(MOCK_PREFIX.length), "base64url").toString()) as Partial<MockJob>;
    if (typeof job.startedAt !== "number" || typeof job.afterMs !== "number") return null;
    if (!isSafeUrl(job.url) && typeof job.error !== "string") return null;
    return job as MockJob;
  } catch {
    return null;
  }
}

export function handleVideoStatus(request: Request): Response {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json(request, { error: "Lipsește parametrul `id`." }, 400);
  const job = decodeJob(id);
  if (!job) return json(request, { error: "Jobul nu există." }, 404);

  const elapsed = Date.now() - job.startedAt;
  const state: VideoJob =
    elapsed < job.afterMs
      ? { status: "running", progress: elapsed / job.afterMs }
      : job.url
        ? { status: "done", url: job.url, model: "mock", ms: elapsed }
        : { status: "failed", error: job.error! };
  return json(request, state);
}

export async function handleLogo(request: Request): Promise<Response> {
  const started = Date.now();
  const body = await readBody<LogoRequest>(request);
  if (body instanceof Response) return body;
  if (typeof body.instruction !== "string" || !body.instruction) return json(request, { error: "Lipsește câmpul `instruction`." }, 400);
  if (body.seed !== undefined && !Number.isInteger(body.seed)) return json(request, { error: "`seed` trebuie să fie un număr întreg." }, 400);
  if (typeof body.mock !== "string" || !body.mock) return json(request, { error: "Lipsește câmpul `mock`: niciun furnizor de logo nu e legat." }, 400);
  const response: LogoResponse = { image: body.mock, model: "mock", ms: Date.now() - started };
  return json(request, response);
}
