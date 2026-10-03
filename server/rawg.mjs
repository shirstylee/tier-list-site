import { isIP } from "node:net";

const ROOT = "https://api.rawg.io/api/";
const ALLOWED_PARAMS = new Set([
  "search", "search_exact", "page", "page_size", "dates", "genres", "parent_platforms", "ordering",
]);

export function json(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

export function validateRawgUrl(url) {
  const path = url.pathname.slice("/api/rawg/".length);
  if (!/^games(?:\/[a-z0-9-]{1,150})?$/.test(path) || url.search.length > 600) {
    throw new Error("Недопустимый запрос к каталогу.");
  }
  const params = new URLSearchParams();
  for (const [name, value] of url.searchParams) {
    if (!ALLOWED_PARAMS.has(name) || params.has(name)) throw new Error("Недопустимый параметр поиска.");
    if (name === "search" && value.length > 150) throw new Error("Слишком длинный поисковый запрос.");
    if (name === "search_exact" && !["true", "false"].includes(value)) throw new Error("Неверный режим поиска.");
    if (name === "page" && !/^[1-9]\d?$/.test(value)) throw new Error("Неверная страница.");
    if (name === "page_size" && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 24)) throw new Error("Неверный размер страницы.");
    if (name === "dates" && !/^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Неверный диапазон дат.");
    if (["genres", "parent_platforms"].includes(name) && !/^[a-z0-9,-]{1,80}$/.test(value)) throw new Error("Неверный фильтр.");
    if (name === "ordering" && !["-rating", "-released", "name", "-added"].includes(value)) throw new Error("Неверная сортировка.");
    params.set(name, value);
  }
  if (path === "games" && !params.has("page_size")) params.set("page_size", "24");
  params.sort();
  return { path, params, cacheKey: `${path}?${params}` };
}

// Forward only the fields the UI needs, never upstream URLs containing the API key.
function publicGame(game) {
  const fields = ["id", "slug", "name", "released", "rating", "metacritic", "background_image", "genres", "platforms", "parent_platforms", "developers", "publishers", "description_raw", "website", "playtime", "ratings_count", "esrb_rating"];
  return Object.fromEntries(fields.filter((field) => field in game).map((field) => [field, game[field]]));
}

export function createRawgHandler({
  apiKey = process.env.RAWG_API_KEY?.trim() ?? "",
  trustProxy = process.env.TRUST_PROXY === "1",
  fetchImpl = fetch,
  now = Date.now,
  perClientLimit = 60,
  globalLimit = 300,
  timeoutMs = 12_000,
} = {}) {
  const cache = new Map();
  const clients = new Map();
  const inFlight = new Map();
  let globalWindow = { start: now(), count: 0 };
  let backoffUntil = 0;

  function allowRequest(request) {
    const time = now();
    for (const [id, window] of clients) if (time - window.start >= 60_000) clients.delete(id);
    if (time - globalWindow.start >= 60_000) globalWindow = { start: time, count: 0 };
    const forwarded = request.headers["x-forwarded-for"]?.split(",")[0]?.trim();
    const id = trustProxy && isIP(forwarded ?? "") ? forwarded : (request.socket.remoteAddress ?? "unknown");
    const window = clients.get(id) ?? { start: time, count: 0 };
    if (window.count >= perClientLimit || globalWindow.count >= globalLimit || (!clients.has(id) && clients.size >= 5000)) return false;
    window.count += 1;
    globalWindow.count += 1;
    clients.set(id, window);
    return true;
  }

  async function load({ path, params, cacheKey }) {
    const upstream = new URL(path, ROOT);
    upstream.search = params.toString();
    upstream.searchParams.set("key", apiKey);
    try {
      const response = await fetchImpl(upstream, {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "error",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        if (response.status === 429) backoffUntil = now() + 60_000;
        return { status: response.status === 429 ? 429 : 502, payload: {
          code: response.status === 429 ? "UPSTREAM_RATE_LIMIT" : "UPSTREAM_ERROR",
          error: response.status === 429 ? "Каталог занят. Повторите запрос через минуту." : "Каталог временно недоступен. Попробуйте позже.",
        } };
      }
      const data = await response.json();
      if ((path === "games" && !Array.isArray(data?.results)) || (path !== "games" && (!data || !data.id))) throw new Error("Invalid upstream response");
      const payload = path === "games"
        ? { results: data.results.map(publicGame), next: Boolean(data.next) }
        : publicGame(data);
      // Size and lifetime are bounded so an anonymous endpoint cannot grow memory indefinitely.
      if (cache.size >= 300) cache.delete(cache.keys().next().value);
      cache.set(cacheKey, { expires: now() + (path === "games" ? 600_000 : 21_600_000), payload });
      return { status: 200, payload };
    } catch {
      backoffUntil = now() + 15_000;
      return { status: 504, payload: { code: "UPSTREAM_UNAVAILABLE", error: "Каталог не ответил вовремя. Попробуйте позже." } };
    }
  }

  return async function handleRawg(request, response) {
    if (request.method !== "GET") {
      json(response, 405, { error: "Метод не поддерживается." }, { Allow: "GET" });
      return;
    }
    if (request.headers["sec-fetch-site"] === "cross-site") {
      json(response, 403, { error: "Запрос разрешён только с этого сайта." });
      return;
    }
    let url;
    try { url = new URL(request.url, "http://localhost"); } catch { json(response, 400, { error: "Неверный URL." }); return; }
    if (url.pathname === "/api/health") {
      json(response, 200, { ok: true, rawgConfigured: Boolean(apiKey) });
      return;
    }
    if (!url.pathname.startsWith("/api/rawg/")) {
      json(response, 404, { error: "Не найдено." });
      return;
    }
    let query;
    try { query = validateRawgUrl(url); } catch (error) { json(response, 400, { error: error.message }); return; }
    if (!apiKey) {
      json(response, 503, { code: "API_NOT_CONFIGURED", error: "Сейчас доступен демонстрационный каталог." });
      return;
    }
    if (!allowRequest(request)) {
      json(response, 429, { code: "RATE_LIMIT", error: "Слишком много запросов. Подождите минуту." }, { "Retry-After": "60" });
      return;
    }
    const cached = cache.get(query.cacheKey);
    if (cached && cached.expires > now()) { json(response, 200, cached.payload); return; }
    cache.delete(query.cacheKey);
    if (now() < backoffUntil) {
      json(response, 503, { code: "UPSTREAM_UNAVAILABLE", error: "Каталог временно недоступен. Попробуйте позже." }, { "Retry-After": "15" });
      return;
    }
    if (!inFlight.has(query.cacheKey)) {
      if (inFlight.size >= 8) { json(response, 503, { error: "Каталог занят. Попробуйте позже." }); return; }
      const pending = load(query).finally(() => inFlight.delete(query.cacheKey));
      inFlight.set(query.cacheKey, pending);
    }
    const result = await inFlight.get(query.cacheKey);
    if (result.status === 429) response.setHeader("Retry-After", "60");
    json(response, result.status, result.payload);
  };
}
