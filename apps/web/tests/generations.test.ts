import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { NextRequest } from "next/server";

// Изолированная БД и подменённые AI-провайдеры: тест не обращается к продакшену
// и не расходует деньги, даже если в окружении разработчика есть реальные ключи.
const temp = await mkdtemp(path.join(os.tmpdir(), "silk-generations-"));
process.env.TURSO_DATABASE_URL = `file:${path.join(temp, "test.db")}`;
delete process.env.TURSO_AUTH_TOKEN;
delete process.env.BLOB_READ_WRITE_TOKEN;
process.env.ADMIN_PASSWORD = "test-admin";
process.env.FASHN_API_KEY = "test-fashn";
process.env.GEMINI_API_KEY_MONEY = "test-gemini";
process.env.TRYON_DAILY_LIMIT = "3";

const { db } = await import("../lib/db");
const schema = await import("../lib/schema");
const profile = await import("../app/api/profile/route");
const tryon = await import("../app/api/tryon/route");
const gallery = await import("../app/api/admin/generations/route");
const stats = await import("../app/api/admin/stats/route");
const settings = await import("../app/api/admin/settings/route");
const track = await import("../app/api/track/route");
const history = await import("../app/api/tryon/history/route");
const catalog = await import("../app/api/catalog/route");
const adminItems = await import("../app/api/admin/items/route");
const adminItem = await import("../app/api/admin/items/[id]/route");
const adminLooks = await import("../app/api/admin/looks/route");
const adminLook = await import("../app/api/admin/looks/[lookId]/route");
const login = await import("../app/api/admin/login/route");
const logout = await import("../app/api/admin/logout/route");
const session = await import("../app/api/admin/session/route");

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=", "base64");
const files = new Set<string>();
const requested: string[] = [];
let fashnFails = false;
let geminiBlocked = false;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  requested.push(url);
  if (url === "https://api.fashn.ai/v1/run") return Response.json({ id: "test-prediction" });
  if (url === "https://api.fashn.ai/v1/status/test-prediction") {
    return Response.json(fashnFails
      ? { status: "failed", error: { name: "OutOfCredits", message: "Test failure" } }
      : { status: "completed", output: ["https://images.test/generated.png"] });
  }
  if (url.startsWith("https://generativelanguage.googleapis.com/")) {
    return Response.json(geminiBlocked ? { promptFeedback: { blockReason: "SAFETY" } } : {
      candidates: [{ content: { parts: [{ inlineData: { data: png.toString("base64"), mimeType: "image/png" } }] } }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 1120 },
    });
  }
  if (url === "https://images.test/generated.png" || url === "https://store.public.blob.vercel-storage.com/top.png" || url.startsWith("http://silk.test/uploads/")) {
    return new Response(png, { headers: { "Content-Type": "image/png" } });
  }
  throw new Error(`Unexpected external request: ${url}`);
};

after(async () => {
  globalThis.fetch = originalFetch;
  // Регистрируем только файлы, созданные этим тестом, прежде чем удалять их.
  const users = await db.select().from(schema.users);
  const tryons = await db.select().from(schema.tryonHistory);
  for (const item of [...users.map((u) => u.photoPath), ...tryons.map((t) => t.resultImagePath)]) {
    if (item?.startsWith("/uploads/")) files.add(path.join(process.cwd(), "public", item));
  }
  db.$client.close();
  await Promise.all([...files].map((file) => unlink(file)));
  await rm(temp, { recursive: true, force: true });
});

function req(route: string, body?: unknown, admin = false) {
  return new NextRequest(`http://silk.test${route}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(admin ? { Cookie: "silk_admin=test-admin" } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function profileForm(generated: boolean, upload = false) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ height_cm: "170", weight_kg: "60", body_type: "average", gender: "female", visitor_id: "test-visitor-123" })) form.set(key, value);
  if (generated) form.set("no_photo", "true");
  if (upload) form.set("photo", new File([png], "photo.png", { type: "image/png" }));
  return new Request("http://silk.test/api/profile", { method: "POST", body: form });
}

test("генерации, история, лимиты, статистика и защита админки", async (t) => {
  let userId: string;
  await t.test("вход, сессия и выход администратора", async () => {
    assert.equal((await login.POST(req("/api/admin/login", { password: "wrong" }))).status, 401);
    const response = await login.POST(req("/api/admin/login", { password: "test-admin" }));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie")!, /HttpOnly/);
    assert.equal((await (await session.GET(req("/api/admin/session", undefined, true))).json()).authed, true);
    assert.match((await logout.POST()).headers.get("set-cookie")!, /Max-Age=0/);
    assert.equal((await (await session.GET(req("/api/admin/session"))).json()).authed, false);
  });
  await t.test("новая галерея требует пароль и запрещает кеширование", async () => {
    const response = await gallery.GET(req("/api/admin/generations"));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const wrong = new NextRequest("http://silk.test/api/admin/generations", { headers: { Cookie: "silk_admin=wrong" } });
    assert.equal((await gallery.GET(wrong)).status, 401);
    assert.equal((await gallery.GET(req("/api/admin/generations?page=-1", undefined, true))).status, 400);
    assert.equal((await gallery.GET(req("/api/admin/generations?kind=upload", undefined, true))).status, 400);
    assert.deepEqual((await (await gallery.GET(req("/api/admin/generations", undefined, true))).json()).items, []);
  });
  await t.test("модель сохраняется вместе с профилем и появляется в галерее", async () => {
    const response = await profile.POST(profileForm(true));
    assert.equal(response.status, 201);
    const { user } = await response.json();
    userId = user.id;
    assert.deepEqual(await readFile(path.join(process.cwd(), "public", user.photoPath)), png);
    const { items } = await (await gallery.GET(req("/api/admin/generations?kind=model", undefined, true))).json();
    assert.equal(items.length, 1);
    assert.equal(items[0].imagePath, user.photoPath);
    assert.equal(items[0].userId, userId);
    assert.equal(items[0].kind, "model");
  });
  await t.test("личное фото не попадает в список сгенерированных моделей", async () => {
    // Даже если ошибочный клиент прислал no_photo вместе с реальным файлом.
    const response = await profile.POST(profileForm(true, true));
    assert.equal(response.status, 201);
    assert.equal((await db.select().from(schema.generatedModels)).length, 1);
    const events = await db.select().from(schema.analyticsEvents);
    assert.equal(JSON.parse(events.at(-1)!.meta!).photo, "upload");
  });
  await t.test("неудачная генерация не создаёт профиль или запись галереи", async () => {
    fashnFails = true;
    const response = await profile.POST(profileForm(true));
    fashnFails = false;
    assert.equal(response.status, 502);
    assert.equal((await db.select().from(schema.users)).length, 2);
    assert.equal((await db.select().from(schema.generatedModels)).length, 1);
  });
  await db.insert(schema.catalogItems).values({ id: "test-top", category: "top", imagePath: "https://store.public.blob.vercel-storage.com/top.png", lookId: "test-look", sourcePhoto: "admin", source: "admin" });
  await t.test("примерка принимает фото товара из Blob, сохраняет результат и историю", async () => {
    const response = await tryon.POST(req("/api/tryon", { userId, topItemId: "test-top", lookId: "test-look" }));
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.usage.remaining, 2);
    assert(requested.includes("https://store.public.blob.vercel-storage.com/top.png"));
    assert.deepEqual(await readFile(path.join(process.cwd(), "public", data.result.resultImagePath)), png);
    const { items } = await (await gallery.GET(req("/api/admin/generations?kind=tryon", undefined, true))).json();
    assert.equal(items.length, 1);
    assert.equal(items[0].lookId, "test-look");
    assert.equal(items[0].imagePath, data.result.resultImagePath);
    const userHistory = await (await history.GET(req(`/api/tryon/history?userId=${userId}`))).json();
    assert.equal(userHistory.items.length, 1);
    assert.equal(userHistory.usage.remaining, 2);
    const usage = await db.select().from(schema.aiUsage);
    assert.equal(usage.length, 1);
    assert.equal(usage[0].status, "success");
    assert(usage[0].costUsd > 0);
  });
  await t.test("блокировка AI не создаёт результат и не расходует дневной лимит", async () => {
    geminiBlocked = true;
    const response = await tryon.POST(req("/api/tryon", { userId, topItemId: "test-top" }));
    geminiBlocked = false;
    assert.equal(response.status, 502);
    assert.equal((await db.select().from(schema.tryonHistory)).length, 1);
    assert.equal((await db.select().from(schema.aiUsage)).at(-1)!.status, "blocked");
  });
  await t.test("суточный лимит останавливает обращение к AI", async () => {
    for (let i = 0; i < 2; i++) assert.equal((await tryon.POST(req("/api/tryon", { userId, topItemId: "test-top" }))).status, 200);
    const calls = requested.length;
    assert.equal((await tryon.POST(req("/api/tryon", { userId, topItemId: "test-top" }))).status, 429);
    assert.equal(requested.length, calls);
  });
  await t.test("серверная воронка защищена, каталог и статистика отвечают", async () => {
    assert.equal((await track.POST(req("/api/track", { visitorId: "test-visitor-123", event: "tryon_done" }))).status, 400);
    assert.equal((await track.POST(req("/api/track", { visitorId: "test-visitor-123", event: "visit" }))).status, 204);
    assert.equal((await catalog.GET(req("/api/catalog?category=top"))).status, 200);
    assert.equal((await catalog.GET(req("/api/catalog?category=invalid"))).status, 400);
    for (const period of ["today", "7d", "30d", "month", "all"]) {
      const response = await stats.GET(req(`/api/admin/stats?period=${period}`, undefined, true));
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.product.tryons, 3);
    }
    assert.equal((await stats.GET(req("/api/admin/stats"))).status, 401);
    assert.equal((await settings.GET(req("/api/admin/settings"))).status, 401);
    const response = await settings.PUT(req("/api/admin/settings", { balanceUsd: 10, monthlyBudgetUsd: 20 }, true));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).settings.balanceUsd, 10);
  });
  await t.test("смешанная галерея фильтруется и разбивается на страницы", async () => {
    const [model] = await db.select().from(schema.generatedModels);
    for (let i = 0; i < 24; i++) await db.insert(schema.generatedModels).values({ userId, imagePath: model.imagePath });
    const first = await (await gallery.GET(req("/api/admin/generations", undefined, true))).json();
    const second = await (await gallery.GET(req("/api/admin/generations?page=2", undefined, true))).json();
    assert.equal(first.items.length, 24);
    assert.equal(first.hasMore, true);
    assert.equal(second.items.length, 4);
    assert.equal(second.hasMore, false);
    const ids = [...first.items, ...second.items].map((i) => `${i.kind}:${i.id}`);
    assert.equal(new Set(ids).size, 28);
    const models = await (await gallery.GET(req("/api/admin/generations?kind=model", undefined, true))).json();
    assert(models.items.every((i: { kind: string }) => i.kind === "model"));
  });
  await t.test("создание, редактирование и удаление вещей и образов в админке", async () => {
    function formRequest(route: string, form: FormData, method = "POST") {
      return new NextRequest(`http://silk.test${route}`, { method, headers: { Cookie: "silk_admin=test-admin" }, body: form });
    }
    assert.equal((await adminItems.GET(req("/api/admin/items"))).status, 401);
    const lookForm = new FormData();
    lookForm.set("title", "Тестовый образ");
    const lookResponse = await adminLooks.POST(formRequest("/api/admin/looks", lookForm));
    assert.equal(lookResponse.status, 201);
    const { look } = await lookResponse.json();
    const lookParams = { params: Promise.resolve({ lookId: look.id }) };
    const form = new FormData();
    form.set("category", "top");
    form.set("look_id", look.id);
    form.set("description", "Тестовый товар");
    form.set("images", new File([png], "top.png", { type: "image/png" }));
    const response = await adminItems.POST(formRequest("/api/admin/items", form));
    assert.equal(response.status, 201);
    const { item } = await response.json();
    files.add(path.join(process.cwd(), "public", item.imagePath));
    const itemParams = { params: Promise.resolve({ id: item.id }) };
    const update = new FormData();
    update.set("description", "Обновлённый товар");
    assert.equal((await (await adminItem.PATCH(formRequest(`/api/admin/items/${item.id}`, update, "PATCH"), itemParams)).json()).item.description, "Обновлённый товар");
    const updateLook = new FormData();
    updateLook.set("title", "Обновлённый образ");
    assert.equal((await (await adminLook.PATCH(formRequest(`/api/admin/looks/${look.id}`, updateLook, "PATCH"), lookParams)).json()).look.title, "Обновлённый образ");
    assert.equal((await adminItem.DELETE(req(`/api/admin/items/${item.id}`, undefined, true), itemParams)).status, 200);
    assert.equal((await adminLook.DELETE(req(`/api/admin/looks/${look.id}`, undefined, true), lookParams)).status, 200);
    assert.equal((await adminItems.GET(req("/api/admin/items", undefined, true))).status, 200);
  });
});
