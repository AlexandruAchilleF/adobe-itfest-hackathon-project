// Scrie schema JSON a designului (din src/lib/design.ts) pentru add-on-ul Adobe Express.
// Rulează: npm run addon:schema   (Node ≥ 22.18 importă direct fișiere .ts)
import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { AiDesign } from "../src/lib/design.ts";

const out = new URL("../adobe-express-addon/src/ui/design-schema.json", import.meta.url);
await writeFile(out, JSON.stringify(z.toJSONSchema(AiDesign), null, 2) + "\n");
console.log("Schema scrisă în", out.pathname);
