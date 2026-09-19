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
  // Кто создал запись: "pipeline" — синк из Python-пайплайна (data/catalog),
  // "admin" — добавлено вручную через админку (/admin). Разделение нужно, чтобы
  // syncCatalog.ts не стирал админские товары как «пропавшие из источника»
  // (см. lib/syncCatalog.ts). Старые записи без значения считаются pipeline.
  source: text("source").notNull().default("pipeline"),
  // Порядок вывода в каталоге/примерке (меньше — раньше). Задаётся в админке
  // («добавить по позиции»); синк не трогает его при upsert, чтобы ручная
  // сортировка pipeline-товаров сохранялась между синхронизациями.
  sortIndex: integer("sort_index").notNull().default(0),
});

// Метаданные образа (комплекта). Товары образа связываются общим look_id в
// catalog_items; эта таблица хранит обложку и заголовок для образов, созданных
// вручную в админке (у pipeline-образов обложка лежит файлом в
// data/catalog/looks/<id>.jpg, см. lib/syncCatalog.ts). Строка не обязательна:
// образ существует, пока есть хотя бы один товар с его look_id.
export const looks = sqliteTable("looks", {
  id: text("id").primaryKey(),
  title: text("title"),
  // Полный публичный URL/путь обложки (модель в полном образе). Для админских
  // образов — результат saveUpload (/uploads/* или Vercel Blob URL).
  coverPath: text("cover_path"),
  sortIndex: integer("sort_index").notNull().default(0),
  source: text("source").notNull().default("admin"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
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
  // Тип фигуры (силуэт): hourglass/pear/apple/rectangle/inverted-triangle —
  // отдельно от bodyType (телосложение slim/athletic/…). Идёт в промпт примерки
  // и генерации модели (см. lib/gemini.ts, lib/fashn.ts). Nullable — старые
  // анкеты без этого поля не ломаются.
  figureType: text("figure_type"),
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
