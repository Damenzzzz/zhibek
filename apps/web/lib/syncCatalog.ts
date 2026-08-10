import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { db } from "./db";
import { catalogItems } from "./schema";

// data/catalog/items.db is written by scripts/process_photos.py (Python
// pipeline), two levels up from apps/web.
const SOURCE_DB_PATH = path.join(process.cwd(), "..", "..", "data", "catalog", "items.db");

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

export function syncCatalogItems(): { synced: number; skipped: boolean } {
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

  db.transaction((tx) => {
    for (const item of rows) {
      tx.insert(catalogItems)
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
        })
        .run();
    }
  });

  return { synced: rows.length, skipped: false };
}
