import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRawgHandler, json } from "./rawg.mjs";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff",
};

export function createAppServer(options = {}) {
  const handleRawg = createRawgHandler(options);
  const dist = options.distDir ?? DIST;
  return createServer(async (request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://media.rawg.io https://cdn.cloudflare.steamstatic.com; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    try {
      const url = new URL(request.url, "http://localhost");
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        await handleRawg(request, response);
        return;
      }
      if (!["GET", "HEAD"].includes(request.method)) { json(response, 405, { error: "Метод не поддерживается." }, { Allow: "GET, HEAD" }); return; }
      const path = decodeURIComponent(url.pathname);
      const filename = resolve(dist, `.${path === "/" ? "/index.html" : path}`);
      if (!filename.startsWith(dist.endsWith(sep) ? dist : `${dist}${sep}`) || path.split("/").some((part) => part.startsWith(".")) || path.includes("\\")) {
        json(response, 404, { error: "Не найдено." });
        return;
      }
      let info;
      try { info = await stat(filename); } catch { json(response, 404, { error: "Не найдено." }); return; }
      if (!info.isFile() || !TYPES[extname(filename)]) { json(response, 404, { error: "Не найдено." }); return; }
      response.setHeader("Content-Type", TYPES[extname(filename)]);
      response.setHeader("Content-Length", info.size);
      response.setHeader("Cache-Control", path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache");
      if (request.method === "HEAD") { response.end(); return; }
      createReadStream(filename).on("error", () => response.destroy()).pipe(response);
    } catch {
      if (!response.headersSent) json(response, 400, { error: "Некорректный запрос." });
      else response.destroy();
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await stat(resolve(DIST, "index.html")).catch(() => { throw new Error("Production build is missing. Run pnpm build first."); });
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535.");
  const server = createAppServer();
  server.requestTimeout = 20_000;
  server.headersTimeout = 10_000;
  server.listen(port, process.env.HOST ?? "0.0.0.0", () => {
    console.log(`TIER LIST listening on port ${port}. RAWG: ${process.env.RAWG_API_KEY?.trim() ? "configured" : "demo mode"}.`);
  });
  const shutdown = () => { server.close(); setTimeout(() => process.exit(0), 5000).unref(); };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
