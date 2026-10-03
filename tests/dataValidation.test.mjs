import test from "node:test";
import assert from "node:assert/strict";
import { isValidBackup, isValidLists, validateStoredValue } from "../src/lib/dataValidation.js";

const game = { id: 1, name: "Portal 2", released: "2011-04-18", background_image: "https://media.rawg.io/test.jpg" };
const list = { id: "list-1", title: "Игры", tiers: [{ id: "s", label: "S", color: "#ff7f7f", games: [game] }], unranked: [] };
const backup = { version: 1, profile: { nickname: "Игрок", avatar: null }, categories: [{ id: "games", label: "Игры", enabled: true }], lists: [list] };

test("existing version-1 backups remain compatible", () => assert.equal(isValidBackup(backup), true));
test("invalid stored JSON shapes and game metadata are rejected without throwing", () => {
  for (const value of [null, {}, [null], [{ ...list, tiers: [null] }], [{ ...list, unranked: [{ id: 2, name: "Bad", genres: "bad" }] }]]) assert.equal(isValidLists(value), false);
});
test("duplicate game IDs and duplicate lists are rejected", () => {
  assert.equal(isValidLists([{ ...list, unranked: [game] }]), false);
  assert.equal(isValidLists([list, list]), false);
});
test("SVG avatars, unsafe image URLs and disabled games category are rejected", () => {
  assert.equal(isValidBackup({ ...backup, profile: { nickname: "Игрок", avatar: "data:image/svg+xml;base64,AAAA" } }), false);
  assert.equal(isValidLists([{ ...list, unranked: [{ id: 2, name: "Bad", background_image: "javascript:alert(1)" }] }]), false);
  assert.equal(isValidBackup({ ...backup, categories: [{ id: "games", label: "Игры", enabled: false }] }), false);
});
test("search history and profile values are checked on startup", () => {
  assert.equal(validateStoredValue("tierlist-search-history", ["Portal"]), true);
  assert.equal(validateStoredValue("tierlist-search-history", {}), false);
  assert.equal(validateStoredValue("rankd-profile", null), false);
});
