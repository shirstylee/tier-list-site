const string = (value, max = 500) => typeof value === "string" && value.length <= max;
const unique = (items) => new Set(items.map((item) => String(item?.id))).size === items.length;
const optional = (value, check) => value == null || check(value);

export function isSafeUrl(value) {
  if (!string(value, 2000) || !value) return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function isValidGame(game) {
  return Boolean(game && (string(game.id, 150) || Number.isSafeInteger(game.id)) &&
    string(game.name) && game.name.trim() &&
    optional(game.released, (value) => string(value, 32)) &&
    optional(game.rating, Number.isFinite) &&
    optional(game.slug, (value) => string(value, 150)) &&
    optional(game.background_image, (value) => value === "" || isSafeUrl(value)) &&
    ["genres", "platforms", "developers", "publishers"].every((field) => optional(game[field], (value) =>
      Array.isArray(value) && value.length <= 100 && value.every((item) => item && string(item.name) && optional(item.slug, (slug) => string(slug, 150))))) &&
    optional(game.description, (value) => string(value, 100_000)) &&
    optional(game.sourceUrl, (value) => value === "" || isSafeUrl(value)));
}

export function isValidList(list) {
  if (!list || !string(list.id, 150) || !list.id || !string(list.title, 10_000) ||
    !Array.isArray(list.tiers) || list.tiers.length > 100 || !unique(list.tiers) ||
    !Array.isArray(list.unranked) || !list.tiers.every((tier) => tier &&
      string(tier.id, 150) && tier.id && string(tier.label, 10_000) &&
      string(tier.color, 80) && /^(#[\da-f]{3,8}|rgba?\([\d.,\s%]+\))$/i.test(tier.color) &&
      Array.isArray(tier.games))) return false;
  const games = [...list.unranked, ...list.tiers.flatMap((tier) => tier.games)];
  return games.length <= 1000 && unique(games) && games.every(isValidGame) &&
    optional(list.updatedAt, (value) => string(value, 40) && Number.isFinite(Date.parse(value))) &&
    optional(list.activity, (value) => Array.isArray(value) && value.length <= 500 && value.every((item) =>
      item && string(item.id, 150) && string(item.gameName) && string(item.type, 40) &&
      string(item.at, 40) && optional(item.from, (label) => string(label, 10_000)) && optional(item.to, (label) => string(label, 10_000))));
}

export function isValidLists(value) {
  return Array.isArray(value) && value.length <= 500 && value.every(isValidList) && unique(value);
}

export function isValidCategories(value) {
  return Array.isArray(value) && value.length > 0 && value.length <= 100 && unique(value) &&
    value.every((category) => category && string(category.id, 150) && category.id && string(category.label, 100) && typeof category.enabled === "boolean") &&
    value.some((category) => category.id === "games" && category.enabled);
}

export function isValidProfile(value) {
  return Boolean(value && string(value.nickname, 32) && (value.avatar === null ||
    (string(value.avatar, 2_200_000) && /^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=]+$/i.test(value.avatar))));
}

export function isValidBackup(value) {
  return value?.version === 1 && isValidProfile(value.profile) && isValidCategories(value.categories) && isValidLists(value.lists);
}

export function validateStoredValue(key, value) {
  if (key === "rankd-lists") return isValidLists(value);
  if (key === "rankd-categories") return isValidCategories(value);
  if (key === "rankd-profile") return isValidProfile(value);
  if (key === "tierlist-search-history") return Array.isArray(value) && value.length <= 6 && value.every((item) => string(item, 150));
  return true;
}
