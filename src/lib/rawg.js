import { DEMO_GAMES } from "../data";

const RAWG_API_ROOT = "/api/rawg";
const RAWG_REQUEST_TIMEOUT = 15000;

export const GAME_GENRES = [
  { value: "", label: "Все жанры" },
  { value: "action", label: "Экшен" },
  { value: "role-playing-games-rpg", label: "RPG" },
  { value: "strategy", label: "Стратегия" },
  { value: "shooter", label: "Шутер" },
  { value: "adventure", label: "Приключения" },
  { value: "indie", label: "Инди" },
  { value: "sports", label: "Спорт" },
];

export const GAME_PLATFORMS = [
  { value: "", label: "Все платформы" },
  { value: "1", label: "PC" },
  { value: "2", label: "PlayStation" },
  { value: "3", label: "Xbox" },
  { value: "7", label: "Nintendo" },
  { value: "4", label: "iOS" },
  { value: "8", label: "Android" },
];

const SEARCH_CACHE_TTL = 5 * 60 * 1000;
const searchCache = new Map();
const detailsCache = new Map();
let rawgBackoffUntil = 0;

function waitWithSignal(delay, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Search cancelled", "AbortError")); return; }
    const abort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Search cancelled", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, delay);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function normalizeSearchValue(value) {
  return value
    .toLocaleLowerCase("ru")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGame(game) {
  const slug = game.slug ?? "";
  return {
    id: game.id,
    slug,
    name: game.name,
    released: game.released,
    rating: game.rating,
    metacritic: game.metacritic ?? null,
    background_image: game.background_image,
    genres: (game.genres ?? []).map(({ id, name, slug }) => ({ id, name, slug })),
    platforms: (game.platforms ?? game.parent_platforms ?? []).map((item) => {
      const platform = item.platform ?? item;
      return {
        id: platform.id,
        parentId: item.platform?.id ?? platform.id,
        name: platform.name,
        slug: platform.slug,
      };
    }),
    developers: (game.developers ?? []).map(({ id, name, slug }) => ({ id, name, slug })),
    publishers: (game.publishers ?? []).map(({ id, name, slug }) => ({ id, name, slug })),
    description: game.description_raw ?? game.description ?? "",
    website: game.website ?? "",
    playtime: game.playtime ?? null,
    ratingsCount: game.ratings_count ?? null,
    esrbRating: game.esrb_rating?.name ?? "",
    sourceUrl: slug ? `https://rawg.io/games/${slug}` : "https://rawg.io/",
  };
}

async function requestRawg(path, signal) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(signal?.reason);
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, RAWG_REQUEST_TIMEOUT);

  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });

  try {
    const response = await fetch(
      `${RAWG_API_ROOT}${path}`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const error = new Error(payload.error || "Каталог временно недоступен. Попробуйте позже.");
      error.code = payload.code;
      throw error;
    }

    return response.json();
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");
    if (error.code) throw error;
    if (timedOut) {
      throw new Error("RAWG не ответил вовремя. Проверьте подключение или попробуйте позже.");
    }
    throw new Error("Не удалось загрузить каталог. Проверьте интернет или попробуйте позже.");
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

function filterDemoGames(games, query, filters) {
  const normalizedQuery = normalizeSearchValue(query);
  const queryParts = normalizedQuery ? normalizedQuery.split(" ") : [];
  return games
    .filter((game) => {
      const name = normalizeSearchValue(game.name);
      const year = game.released?.slice(0, 4);
      const genreMatch = !filters.genre || game.genres?.some((genre) => genre.slug === filters.genre);
      const platformMatch =
        !filters.platform || game.platforms?.some((platform) => String(platform.parentId ?? platform.id) === filters.platform);
      return (
        queryParts.every((part) => name.includes(part)) &&
        (!filters.year || year === filters.year) &&
        (!filters.minRating || (game.rating ?? 0) >= Number(filters.minRating)) &&
        genreMatch &&
        platformMatch
      );
    })
    .sort((first, second) => (second.rating ?? 0) - (first.rating ?? 0));
}

function createLocalSearchResult(query, filters, page, notice = "Доступен демонстрационный каталог.") {
  return {
    games: page === 1 ? filterDemoGames(DEMO_GAMES, query, filters) : [],
    hasMore: false,
    offline: true,
    notice,
  };
}

export async function searchGames(query, signal, options = {}) {
  const filters = {
    year: options.year ?? "",
    genre: options.genre ?? "",
    platform: options.platform ?? "",
    minRating: options.minRating ?? "",
  };
  const page = Math.max(1, Number(options.page) || 1);
  const cleanQuery = query.trim();
  const cacheKey = JSON.stringify({ cleanQuery, filters, page });
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < SEARCH_CACHE_TTL) {
    return cached.value;
  }

  if (Date.now() < rawgBackoffUntil) {
    await waitWithSignal(80, signal);
    return createLocalSearchResult(cleanQuery, filters, page);
  }

  const params = new URLSearchParams({
    page_size: "24",
    page: String(page),
  });
  if (cleanQuery) params.set("search", cleanQuery);
  else params.set("ordering", "-rating");
  if (filters.year) params.set("dates", `${filters.year}-01-01,${filters.year}-12-31`);
  if (filters.genre) params.set("genres", filters.genre);
  if (filters.platform) params.set("parent_platforms", filters.platform);

  let payload;
  try {
    payload = await requestRawg(`/games?${params}`, signal);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    rawgBackoffUntil = Date.now() + 15 * 1000;
    return createLocalSearchResult(cleanQuery, filters, page, `${error.message} Показаны игры из демо-каталога.`);
  }
  const games = payload.results
    .map(normalizeGame)
    .filter((game) => !filters.minRating || (game.rating ?? 0) >= Number(filters.minRating));
  const value = { games, hasMore: Boolean(payload.next) };
  if (searchCache.size >= 100) searchCache.delete(searchCache.keys().next().value);
  searchCache.set(cacheKey, { createdAt: Date.now(), value });
  return value;
}

export async function getGameDetails(game, signal) {
  const key = String(game.id);
  if (detailsCache.has(key)) return detailsCache.get(key);

  let rawgIdentifier = String(game.id);
  if (rawgIdentifier.startsWith("demo-")) {
    rawgIdentifier = game.slug ?? "";
    if (!rawgIdentifier) {
      const params = new URLSearchParams({
        search: game.name,
        search_exact: "true",
        page_size: "1",
      });
      const result = await requestRawg(`/games?${params}`, signal);
      rawgIdentifier = result.results?.[0]?.id;
    }
  }

  if (!rawgIdentifier) {
    throw new Error("RAWG не смог найти эту игру по названию.");
  }

  let payload;
  try { payload = await requestRawg(`/games/${encodeURIComponent(rawgIdentifier)}`, signal); }
  catch (error) { if (error.code === "API_NOT_CONFIGURED") return game; throw error; }
  const details = normalizeGame(payload);
  if (detailsCache.size >= 100) detailsCache.delete(detailsCache.keys().next().value);
  detailsCache.set(key, details);
  return details;
}
