export const DEFAULT_CATEGORIES = [
  { id: "games", label: "Игры", enabled: true },
  { id: "movies", label: "Фильмы", enabled: false },
  { id: "series", label: "Сериалы", enabled: false },
];

export const DEFAULT_PROFILE = {
  nickname: "PLAYER_01",
  avatar: null,
};

export const TIER_COLORS = [
  "#ff7f7f",
  "#ffbf7f",
  "#ffdf7f",
  "#ffff7f",
  "#bfff7f",
];

export const DEFAULT_TIERS = [
  { id: "tier-s", label: "S", color: TIER_COLORS[0] },
  { id: "tier-a", label: "A", color: TIER_COLORS[1] },
  { id: "tier-b", label: "B", color: TIER_COLORS[2] },
  { id: "tier-c", label: "C", color: TIER_COLORS[3] },
  { id: "tier-d", label: "D", color: TIER_COLORS[4] },
];

export const DEMO_GAMES = [
  {
    id: "demo-elden-ring",
    slug: "elden-ring",
    name: "Elden Ring",
    released: "2022-02-25",
    rating: 4.45,
    background_image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg",
    genres: [{ name: "RPG", slug: "role-playing-games-rpg" }, { name: "Экшен", slug: "action" }],
    platforms: [{ id: 1, parentId: 1, name: "PC" }, { id: 2, parentId: 2, name: "PlayStation" }],
    developers: [{ name: "FromSoftware" }],
  },
  {
    id: "demo-bg3",
    slug: "baldurs-gate-3",
    name: "Baldur's Gate 3",
    released: "2023-08-03",
    rating: 4.42,
    background_image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg",
    genres: [{ name: "RPG", slug: "role-playing-games-rpg" }, { name: "Стратегия", slug: "strategy" }],
    platforms: [{ id: 1, parentId: 1, name: "PC" }, { id: 2, parentId: 2, name: "PlayStation" }],
    developers: [{ name: "Larian Studios" }],
  },
  {
    id: "demo-cyberpunk",
    slug: "cyberpunk-2077",
    name: "Cyberpunk 2077",
    released: "2020-12-10",
    rating: 4.28,
    background_image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg",
    genres: [{ name: "RPG", slug: "role-playing-games-rpg" }, { name: "Экшен", slug: "action" }],
    platforms: [{ id: 1, parentId: 1, name: "PC" }, { id: 3, parentId: 3, name: "Xbox" }],
    developers: [{ name: "CD PROJEKT RED" }],
  },
  {
    id: "demo-hades",
    slug: "hades",
    name: "Hades",
    released: "2020-09-17",
    rating: 4.41,
    background_image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg",
    genres: [{ name: "Экшен", slug: "action" }, { name: "Инди", slug: "indie" }],
    platforms: [{ id: 1, parentId: 1, name: "PC" }, { id: 7, parentId: 7, name: "Nintendo" }],
    developers: [{ name: "Supergiant Games" }],
  },
  {
    id: "demo-disco-elysium",
    slug: "disco-elysium",
    name: "Disco Elysium",
    released: "2019-10-15",
    rating: 4.39,
    background_image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/632470/header.jpg",
    genres: [{ name: "RPG", slug: "role-playing-games-rpg" }, { name: "Инди", slug: "indie" }],
    platforms: [{ id: 1, parentId: 1, name: "PC" }],
    developers: [{ name: "ZA/UM" }],
  },
  {
    id: "demo-control",
    slug: "control",
    name: "Control",
    released: "2020-08-27",
    rating: 4.15,
    background_image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/870780/header.jpg",
    genres: [{ name: "Экшен", slug: "action" }, { name: "Шутер", slug: "shooter" }],
    platforms: [{ id: 1, parentId: 1, name: "PC" }, { id: 2, parentId: 2, name: "PlayStation" }],
    developers: [{ name: "Remedy Entertainment" }],
  },
  {
    id: "demo-stardew",
    slug: "stardew-valley",
    name: "Stardew Valley",
    released: "2016-02-26",
    rating: 4.4,
    background_image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/413150/header.jpg",
    genres: [{ name: "Инди", slug: "indie" }, { name: "RPG", slug: "role-playing-games-rpg" }],
    platforms: [{ id: 1, parentId: 1, name: "PC" }, { id: 7, parentId: 7, name: "Nintendo" }],
    developers: [{ name: "ConcernedApe" }],
  },
  {
    id: "demo-portal2",
    slug: "portal-2",
    name: "Portal 2",
    released: "2011-04-18",
    rating: 4.6,
    background_image:
      "https://cdn.cloudflare.steamstatic.com/steam/apps/620/header.jpg",
    genres: [{ name: "Приключения", slug: "adventure" }, { name: "Шутер", slug: "shooter" }],
    platforms: [{ id: 1, parentId: 1, name: "PC" }, { id: 3, parentId: 3, name: "Xbox" }],
    developers: [{ name: "Valve" }],
  },
];

export const FEATURED_LIST = {
  id: "featured-critic",
  title: "Игры, которые остаются",
  updatedAt: "2026-07-30T09:12:00.000Z",
  categoryId: "games",
  tiers: [
    {
      ...DEFAULT_TIERS[0],
      games: [DEMO_GAMES[0], DEMO_GAMES[3], DEMO_GAMES[7]],
    },
    {
      ...DEFAULT_TIERS[1],
      games: [DEMO_GAMES[1], DEMO_GAMES[4]],
    },
    {
      ...DEFAULT_TIERS[2],
      games: [DEMO_GAMES[2], DEMO_GAMES[5]],
    },
    { ...DEFAULT_TIERS[3], games: [DEMO_GAMES[6]] },
    { ...DEFAULT_TIERS[4], games: [] },
  ],
  unranked: [],
};
