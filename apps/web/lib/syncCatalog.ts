import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { catalogItems } from "./schema";

// data/catalog/{items.db,<category>/*.jpg} is written by
// scripts/process_photos.py (Python pipeline), two levels up from apps/web.
const SOURCE_DIR = path.join(process.cwd(), "..", "..", "data", "catalog");
const SOURCE_DB_PATH = path.join(SOURCE_DIR, "items.db");
// На Vercel корень деплоя — apps/web, поэтому исходная data/catalog вне его
// недоступна в рантайме. Копируем фото сюда — public/ уходит в деплой
// целиком и отдаётся статикой без отдельного route handler'а.
const PUBLIC_CATALOG_DIR = path.join(process.cwd(), "public", "catalog");

interface SourceItemRow {
  id: string;
  sku: string | null;
  category: string;
  color: string | null;
  description: string | null;
  image_path: string;
  look_id: string;
  source_photo: string;
}

function copyCatalogImages(rows: SourceItemRow[]): void {
  const marker = "data/catalog/";
  for (const item of rows) {
    const idx = item.image_path.indexOf(marker);
    const relative = idx >= 0 ? item.image_path.slice(idx + marker.length) : item.image_path;
    const from = path.join(SOURCE_DIR, relative);
    const to = path.join(PUBLIC_CATALOG_DIR, relative);
    if (!fs.existsSync(from)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
}

export async function syncCatalogItems(): Promise<{ synced: number; skipped: boolean }> {
  if (!fs.existsSync(SOURCE_DB_PATH)) {
    return { synced: 0, skipped: true };
  }

  const sourceDb = new Database(SOURCE_DB_PATH, { readonly: true, fileMustExist: true });
  let rows: SourceItemRow[];
  try {
    rows = sourceDb
      .prepare(
        "SELECT id, sku, category, color, description, image_path, look_id, source_photo FROM items"
      )
      .all() as SourceItemRow[];
  } finally {
    sourceDb.close();
  }

  // Копируем фото в public/catalog ДО обращения к БД — это чисто локальная
  // файловая операция для деплоя (см. комментарий у PUBLIC_CATALOG_DIR), не
  // зависит от того, доступна ли (Turso) база.
  copyCatalogImages(rows);

  await db.transaction(async (tx) => {
    for (const item of rows) {
      await tx
        .insert(catalogItems)
        .values({
          id: item.id,
          sku: item.sku,
          category: item.category,
          color: item.color,
          description: item.description,
          imagePath: item.image_path,
          lookId: item.look_id,
          sourcePhoto: item.source_photo,
        })
        .onConflictDoUpdate({
          target: catalogItems.id,
          set: {
            sku: item.sku,
            category: item.category,
            color: item.color,
            description: item.description,
            imagePath: item.image_path,
            lookId: item.look_id,
            sourcePhoto: item.source_photo,
          },
        });
    }
  });

  return { synced: rows.length, skipped: false };
}
