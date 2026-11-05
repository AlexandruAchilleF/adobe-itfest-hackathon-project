// POST /api/notify — SMS (Twilio) sau email (Resend). Fără chei: mock (vezi server/notify.ts).
import { handleNotify } from "../server/notify.js";

export function POST(request: Request): Promise<Response> {
  return handleNotify(request);
}
