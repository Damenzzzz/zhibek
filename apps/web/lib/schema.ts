import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Синхронизируется из data/catalog/items.db (см. lib/syncCatalog.ts).
export const catalogItems = sqliteTable("catalog_items", {
  id: text("id").primaryKey(),
  sku: text("sku"),
  category: text("category").notNull(),
  color: text("color"),
  description: text("description"),
  imagePath: text("image_path").notNull(),
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
  resultImagePath: text("result_image_path"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Учёт расхода кредитов FASHN API (см. lib/fashn.ts).
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
