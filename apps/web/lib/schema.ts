import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Синхронизируется из data/catalog/items.db (см. lib/syncCatalog.ts).
export const catalogItems = sqliteTable("catalog_items", {
  id: text("id").primaryKey(),
  sku: text("sku"),
  category: text("category").notNull(),
  color: text("color"),
  description: text("description"),
  imagePath: text("image_path").notNull(),
  // JSON-массив относительных путей всех фото товара (обложка первой). Для
  // товаров-папок из data/raw это несколько ракурсов; для кропов с коллажа —
  // один путь, равный imagePath. Может быть null для старых записей — фронт
  // тогда откатывается на [imagePath]. Заполняется scripts/process_photos.py
  // и синхронизируется через lib/syncCatalog.ts.
  images: text("images"),
  lookId: text("look_id").notNull(),
  sourcePhoto: text("source_photo").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  heightCm: integer("height_cm").notNull(),
  weightKg: real("weight_kg").notNull(),
  bodyType: text("body_type").notNull(),
  gender: text("gender").notNull(),
  photoPath: text("photo_path"),
  // Доп. характеристики (см. lib/fashn.ts generateModelFromDescription) —
  // nullable, чтобы не ломать уже сохранённые анкеты без этих полей.
  ageRange: text("age_range"),
  skinTone: text("skin_tone"),
  clothingSize: text("clothing_size"),
  pose: text("pose"),
});

export const tryonHistory = sqliteTable("tryon_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  topItemId: text("top_item_id").references(() => catalogItems.id),
  bottomItemId: text("bottom_item_id").references(() => catalogItems.id),
  // Обувь/сумка входят в тот же единый вызов Gemini, что и одежда
  // (см. lib/gemini.ts tryOnWithGemini) — весь образ надевается за один проход.
  shoesItemId: text("shoes_item_id").references(() => catalogItems.id),
  bagItemId: text("bag_item_id").references(() => catalogItems.id),
  resultImagePath: text("result_image_path"),
  // SHA-256 IP-адреса запроса (не сам IP — приватность). Используется вместе с
  // userId для суточного лимита примерок в /api/tryon: считаем успешные
  // генерации за день и по профилю, и по IP, чтобы сброс localStorage / новая
  // анкета не обнуляли лимит. Nullable — у записей до введения лимита пусто.
  ipHash: text("ip_hash"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Учёт расхода: примерка на Gemini (endpoint "gemini-tryon", см. lib/gemini.ts)
// и генерация модели по анкете на FASHN (см. lib/fashn.ts).
export const creditUsage = sqliteTable("credit_usage", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  endpoint: text("endpoint").notNull(),
  creditsSpent: integer("credits_spent").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
