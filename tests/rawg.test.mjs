import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAppServer } from "../server/index.mjs";

const KEY = "fake-server-secret-for-tests";
const game = { id: 1, slug: "portal-2", name: "Portal 2", rating: 4.6, genres: [] };

async function app(t, options = {}) {
  const server = createAppServer({ apiKey: KEY, ...options });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  return (path, init) => fetch(`http://127.0.0.1:${server.address().port}${path}`, init);
}

test("RAWG key stays on the server and upstream pagination is sanitized", async (t) => {
  let seen;
  const request = await app(t, { fetchImpl: async (url) => {
    seen = url;
    return Response.json({ results: [game], next: `https://api.rawg.io/api/games?key=${KEY}` });
  } });
  const response = await request("/api/rawg/games?search=portal");
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.equal(text.includes(KEY), false);
  assert.equal(JSON.parse(text).next, true);
  assert.equal(seen.origin, "https://api.rawg.io");
  assert.equal(seen.searchParams.get("key"), KEY);
  assert.equal(seen.searchParams.get("search"), "portal");
});

test("whitelisted routes and parameters reject open-proxy and key injection attempts", async (t) => {
  let calls = 0;
  const request = await app(t, { fetchImpl: async () => { calls++; return Response.json({ results: [] }); } });
  for (const path of ["/api/rawg/users", "/api/rawg/games?key=other", "/api/rawg/games?page_size=1000", "/api/rawg/games?search=a&search=b", "/api/rawg/games?url=http://127.0.0.1", "/api/rawg/games?page=-1"]) {
    assert.equal((await request(path)).status, 400, path);
  }
  assert.equal(calls, 0);
});

test("POST and cross-site requests are rejected", async (t) => {
  const request = await app(t);
  assert.equal((await request("/api/rawg/games", { method: "POST" })).status, 405);
  assert.equal((await request("/api/rawg/games", { headers: { "Sec-Fetch-Site": "cross-site" } })).status, 403);
});

test("missing key produces an explicit demo-mode status", async (t) => {
  const request = await app(t, { apiKey: "" });
  const status = await (await request("/api/health")).json();
  assert.deepEqual(status, { ok: true, rawgConfigured: false });
  assert.equal((await (await request("/api/rawg/games")).json()).code, "API_NOT_CONFIGURED");
});

test("duplicate searches share the server cache", async (t) => {
  let calls = 0;
  const request = await app(t, { fetchImpl: async () => { calls++; return Response.json({ results: [game] }); } });
  await request("/api/rawg/games?search=portal&page=1");
  await request("/api/rawg/games?page=1&search=portal");
  assert.equal(calls, 1);
});

test("IP rate limit cannot be bypassed with untrusted forwarding headers", async (t) => {
  const request = await app(t, { perClientLimit: 2, fetchImpl: async () => Response.json({ results: [] }) });
  await request("/api/rawg/games", { headers: { "X-Forwarded-For": "1.1.1.1" } });
  await request("/api/rawg/games", { headers: { "X-Forwarded-For": "2.2.2.2" } });
  const response = await request("/api/rawg/games", { headers: { "X-Forwarded-For": "3.3.3.3" } });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
});

test("upstream errors and timeouts never expose a key or upstream error body", async (t) => {
  const request = await app(t, { fetchImpl: async () => new Response(KEY, { status: 403 }) });
  const response = await request("/api/rawg/games");
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes(KEY), false);
  const offline = await app(t, { fetchImpl: async () => { throw new Error(`Network failure ${KEY}`); } });
  const timeout = await offline("/api/rawg/games");
  assert.equal(timeout.status, 504);
  assert.equal((await timeout.text()).includes(KEY), false);
});

test("RAWG rate limits trigger backoff rather than repeated upstream calls", async (t) => {
  let calls = 0;
  const request = await app(t, { fetchImpl: async () => { calls++; return new Response("", { status: 429 }); } });
  assert.equal((await request("/api/rawg/games?search=one")).status, 429);
  assert.equal((await request("/api/rawg/games?search=two")).status, 503);
  assert.equal(calls, 1);
});

test("static server isolates the build directory and does not return HTML for missing assets", async (t) => {
  const distDir = await mkdtemp(join(tmpdir(), "tierlist-test-"));
  t.after(() => rm(distDir, { recursive: true, force: true }));
  await mkdir(join(distDir, "assets"));
  await writeFile(join(distDir, "index.html"), "<html>TIER LIST</html>");
  await writeFile(join(distDir, "assets", "app-test.js"), "console.log('test')");
  const request = await app(t, { distDir });
  const home = await request("/");
  assert.equal(home.status, 200);
  assert.equal(home.headers.get("Cache-Control"), "no-cache");
  assert.match(home.headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
  const script = await request("/assets/app-test.js");
  assert.match(script.headers.get("Cache-Control"), /immutable/);
  for (const path of ["/.env", "/.git/config", "/server/rawg.mjs", "/assets/missing.js", "/%2eenv", "/%2e%2e%5c.env"]) assert.equal((await request(path)).status, 404, path);
  const head = await request("/", { method: "HEAD" });
  assert.equal(await head.text(), "");
});
