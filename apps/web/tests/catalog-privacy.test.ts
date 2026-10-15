import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCatalogLooks,
  buildTryonHref,
  matchesCatalogSearch,
  safeTryonReturn,
  type CatalogEntry,
} from "../lib/catalogView";
import { parseSavedIds } from "../lib/savedItems";
import {
  parsePrivacyChoice,
  PRIVACY_VERSION,
  PRIVACY_CHOICE_KEY,
} from "../lib/privacy";
import { getVisitorId, track } from "../lib/analytics";
import { savePrivacyChoice } from "../lib/privacyStorage";
const item: CatalogEntry = {
  id: "top-1",
  category: "top",
  description: "Зелёная шёлковая блузка",
  color: "зелёный",
  imagePath: "data/catalog/top/1.jpg",
  lookId: "1",
  source: "pipeline",
  sku: "12345",
};

test("поиск учитывает все слова, регистр, ё/е и артикул", () => {
  assert(matchesCatalogSearch(item, "ЗЕЛЕНАЯ блузка"));
  assert(matchesCatalogSearch(item, "12345"));
  assert(!matchesCatalogSearch(item, "синяя блузка"));
});
test("готовые комплекты включают ручные обложки и порядок", () => {
  const entries = [
    item,
    { ...item, id: "bottom-1", category: "bottom" },
    { ...item, id: "top-2", lookId: "2" },
    { ...item, id: "bottom-2", category: "bottom", lookId: "2" },
  ];
  const looks = buildCatalogLooks(entries, [
    {
      id: "2",
      title: "Мой комплект",
      coverPath: "https://example.com/cover.jpg",
      sortIndex: -1,
    },
  ]);
  assert.equal(looks[0].id, "2");
  assert.equal(looks[0].title, "Мой комплект");
  assert.equal(looks[0].cover, "https://example.com/cover.jpg");
  assert.equal(looks[1].cover, "/catalog/looks/1.jpg");
  assert.equal(buildCatalogLooks([item], []).length, 0);
});
test("подборка переносит в примерку все пять слотов", () => {
  const url = new URL(
    buildTryonHref(
      ["top", "outerwear", "bottom", "shoes", "bag", "accessory"].map(
        (category) => ({ id: category + "-id", category }),
      ),
    ),
    "https://silk.test",
  );
  assert.equal(url.searchParams.size, 5);
  for (const slot of ["top", "outerwear", "bottom", "shoes", "bag"])
    assert.equal(url.searchParams.get(slot), slot + "-id");
  assert.equal(
    new URL(
      buildTryonHref([{ id: "coat", category: "outerwear" }]),
      "https://silk.test",
    ).searchParams.get("top"),
    "coat",
  );
});
test("переход после анкеты остаётся только внутри примерки", () => {
  assert.equal(safeTryonReturn("/tryon?look=1"), "/tryon?look=1");
  for (const url of [
    "https://evil.test",
    "//evil.test",
    "/tryon-evil",
    "/admin",
    null,
  ])
    assert.equal(safeTryonReturn(url), "/tryon");
});
test("битая подборка и старая версия согласия безопасно отвергаются", () => {
  assert.deepEqual(parseSavedIds("{oops"), []);
  assert.deepEqual(parseSavedIds("{}"), []);
  assert.deepEqual(parseSavedIds('["a",null,12,"a","b"]'), ["a", "b"]);
  assert.equal(parsePrivacyChoice("{oops"), null);
  assert.equal(
    parsePrivacyChoice(
      JSON.stringify({ version: "old", analytics: true, updatedAt: "date" }),
    ),
    null,
  );
});
test("аналитика не пишет идентификаторы и не отправляет события без разрешения", () => {
  const local = new Map<string, string>(),
    session = new Map<string, string>();
  let calls = 0;
  const windowDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "window",
  );
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const storage = (map: Map<string, string>) => ({
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
    removeItem: (key: string) => map.delete(key),
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage(local),
      sessionStorage: storage(session),
      location: { pathname: "/" },
      dispatchEvent: () => true,
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      sendBeacon: () => {
        calls++;
        return true;
      },
    },
  });
  try {
    assert.equal(getVisitorId(), "");
    track("visit");
    assert.equal(calls, 0);
    assert.equal(local.has("silk:vid"), false);
    savePrivacyChoice(false);
    track("visit");
    assert.equal(calls, 0);
    savePrivacyChoice(true);
    assert.equal(
      parsePrivacyChoice(local.get(PRIVACY_CHOICE_KEY)!)?.version,
      PRIVACY_VERSION,
    );
    track("visit");
    assert.equal(calls, 1);
    assert(local.has("silk:vid"));
    savePrivacyChoice(false);
    track("look_selected");
    assert.equal(calls, 1);
    assert.equal(local.has("silk:vid"), false);
    assert.equal(session.has("silk:tracked"), false);
  } finally {
    if (windowDescriptor)
      Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
    if (navigatorDescriptor)
      Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});
