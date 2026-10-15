import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

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
  // Когда создана анкета — для метрики «новые пользователи» в админ-статистике.
  // Nullable: у анкет до введения колонки даты нет (в статистике они попадают
  // только в «за всё время»).
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  // Анонимный id посетителя (lib/analytics.ts, localStorage) — связывает анкету
  // с событиями воронки. Nullable: старые анкеты и запросы без трекера.
  visitorId: text("visitor_id"),
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
  // Какой готовый образ примеряли (режим «полный образ» на /tryon) — для
  // топа «чаще всего примеряют». null — сборка «по частям» или старые записи.
  lookId: text("look_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Только результаты FASHN model-create. Загруженные пользователем фотографии
// сюда не попадают; старые photo_path нельзя надёжно разделить по источнику.
export const generatedModels = sqliteTable(
  "generated_models",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id),
    imagePath: text("image_path").notNull(),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index("generated_models_created_idx").on(t.createdAt)]
);

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

// События воронки для админ-статистики (см. lib/analytics.ts, app/api/track).
// visitorId — анонимный случайный id из localStorage (не IP и не личные данные).
// Типы событий — ANALYTICS_EVENTS в lib/analyticsEvents.ts.
export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    visitorId: text("visitor_id").notNull(),
    event: text("event").notNull(),
    lookId: text("look_id"),
    // Произвольный JSON с деталями (например, {"photo":"upload"|"generated"}).
    meta: text("meta"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index("analytics_events_created_idx").on(t.createdAt), index("analytics_events_visitor_idx").on(t.visitorId)]
);

// Каждый ответ AI-провайдера с реальным расходом (см. lib/aiUsage.ts). В
// отличие от credit_usage (1 строка = 1 успешная примерка) здесь пишется
// КАЖДЫЙ вызов, за который Google выставит счёт, с токенами из usageMetadata,
// — включая пустые ответы и неудачные попытки, которые тоже тарифицируются.
export const aiUsage = sqliteTable(
  "ai_usage",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    provider: text("provider").notNull(), // "gemini"
    model: text("model").notNull(),
    // Зачем вызов: "tryon" — примерка.
    purpose: text("purpose").notNull(),
    // "success" — получили картинку; "empty" — ответ без картинки (оплачен);
    // "blocked" — модерация; "error" — запрос упал (503/429/таймаут, не оплачен).
    status: text("status").notNull(),
    errorCode: text("error_code"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: real("cost_usd").notNull().default(0),
    latencyMs: integer("latency_ms"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index("ai_usage_created_idx").on(t.createdAt)]
);

// Простые настройки админки «ключ → значение» (бюджет Gemini и т.п.).
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
