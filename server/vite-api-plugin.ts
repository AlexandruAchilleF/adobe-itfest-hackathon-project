// Servește fișierele din /api (aceleași funcții care rulează pe Vercel) în `npm run dev`,
// ca să ai frontend + backend într-o singură comandă, fără `vercel dev`.
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

type Handler = (request: Request) => Response | Promise<Response>;

export function apiRoutes(apiDir = "api"): Plugin {
  return {
    name: "local-api-routes",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
        const name = url.pathname.slice("/api/".length).replace(/\/$/, "");
        if (!/^[\w-]+$/.test(name)) return next();

        const file = path.resolve(server.config.root, apiDir, `${name}.ts`);
        if (!fs.existsSync(file)) {
          res.statusCode = 404;
          res.setHeader("content-type", "application/json");
          return res.end(JSON.stringify({ error: `Nu există api/${name}.ts` }));
        }

        try {
          const mod = (await server.ssrLoadModule(file)) as Record<string, Handler | undefined>;
          const method = (req.method ?? "GET").toUpperCase();
          const handler = mod[method];
          if (!handler) {
            res.statusCode = 405;
            return res.end(`Metoda ${method} nu e exportată de api/${name}.ts`);
          }
          const hasBody = method !== "GET" && method !== "HEAD";
          const request = new Request(url, {
            method,
            headers: {
              "content-type": String(req.headers["content-type"] ?? "application/json"),
              ...(req.headers.origin ? { origin: String(req.headers.origin) } : {}),
            },
            body: hasBody ? new Uint8Array(await readBody(req)) : undefined,
          });
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          if (err instanceof Error) server.ssrFixStacktrace(err);
          console.error(`[api/${name}]`, err);
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });
    },
  };
}
