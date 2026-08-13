import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { notInArray } from "drizzle-orm";
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
  images: string | null;
  look_id: string;
  source_photo: string;
}

// Все относительные пути к фото одного товара: обложка (image_path) + все
// ракурсы из JSON-колонки images. Дубли схлопываются, обложка идёт первой.
function imagePathsOf(item: SourceItemRow): string[] {
  const paths = [item.image_path];
  if (item.images) {
    try {
      const parsed = JSON.parse(item.images) as string[];
      if (Array.isArray(parsed)) paths.push(...parsed);
    } catch {
      // повреждённый JSON — молча оставляем только обложку
    }
  }
  return Array.from(new Set(paths.filter(Boolean)));
}

// Относительный путь внутри data/catalog ("top/143595156.jpg") из значения,
// которое лежит в БД ("data/catalog/top/143595156.jpg" или уже относительное).
function relativeImagePath(imagePath: string): string {
  const marker = "data/catalog/";
  const normalized = imagePath.split("\\").join("/");
  const idx = normalized.indexOf(marker);
  return idx >= 0 ? normalized.slice(idx + marker.length) : normalized;
}

// Фото можно удалить прямо из data/catalog/<category>/, не трогая items.db —
// так товар и снимается с публикации вручную. Строка в items.db при этом
// остаётся, поэтому источником правды считаем файл: нет обложки на диске —
// товара нет. Ракурсы без файла просто выкидываются из images.
function withExistingFiles(rows: SourceItemRow[]): SourceItemRow[] {
  const kept: SourceItemRow[] = [];

  for (const item of rows) {
    if (!fs.existsSync(path.join(SOURCE_DIR, relativeImagePath(item.image_path)))) continue;

    const angles = imagePathsOf(item).filter((p) =>
      fs.existsSync(path.join(SOURCE_DIR, relativeImagePath(p)))
    );
    kept.push({ ...item, images: JSON.stringify(angles) });
  }

  return kept;
}

// Убираем из public/catalog файлы, которых больше нет среди актуальных
// товаров. Без этого удалённые вещи продолжают отдаваться статикой: каталог
// берёт картинки отсюда, а не из data/catalog (см. комментарий у
// PUBLIC_CATALOG_DIR), и «удалённый» товар остаётся видимым после деплоя.
function prunePublicCatalog(rows: SourceItemRow[]): number {
  if (process.env.VERCEL || !fs.existsSync(PUBLIC_CATALOG_DIR)) return 0;

  const keep = new Set<string>();
  for (const item of rows) {
    for (const p of imagePathsOf(item)) keep.add(relativeImagePath(p));
  }

  let deleted = 0;
  for (const category of fs.readdirSync(PUBLIC_CATALOG_DIR)) {
    const dir = path.join(PUBLIC_CATALOG_DIR, category);
    if (!fs.statSync(dir).isDirectory()) continue;

    for (const file of fs.readdirSync(dir)) {
      if (keep.has(`${category}/${file}`)) continue;
      try {
        fs.unlinkSync(path.join(dir, file));
        deleted++;
      } catch (err) {
        console.warn(`[catalog sync] не удалось удалить ${category}/${file}:`, err);
      }
    }
  }

  return deleted;
}

function copyCatalogImages(rows: SourceItemRow[]): void {
  // На Vercel /var/task — read-only FS: сюда писать нельзя и не нужно,
  // public/catalog уже закоммичен и уезжает в деплой статикой (см. комментарий
  // у PUBLIC_CATALOG_DIR). Раньше copyFileSync здесь падал с EROFS и ронял
  // instrumentation hook на каждом запросе к /catalog.
  if (process.env.VERCEL) return;

  for (const item of rows) {
    for (const imagePath of imagePathsOf(item)) {
      const relative = relativeImagePath(imagePath);
      const from = path.join(SOURCE_DIR, relative);
      const to = path.join(PUBLIC_CATALOG_DIR, relative);
      if (!fs.existsSync(from) || fs.existsSync(to)) continue;
      try {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
      } catch (err) {
        // Копирование — best-effort страховка для локальной разработки; ошибка
        // записи (например, read-only FS в незапланированной среде) не должна
        // ронять весь сервер.
        console.warn(`[catalog sync] не удалось скопировать ${relative}:`, err);
      }
    }
  }
}

export async function syncCatalogItems(): Promise<{
  synced: number;
  removed: number;
  pruned: number;
  skipped: boolean;
}> {
  if (!fs.existsSync(SOURCE_DB_PATH)) {
    return { synced: 0, removed: 0, pruned: 0, skipped: true };
  }

  const sourceDb = new Database(SOURCE_DB_PATH, { readonly: true, fileMustExist: true });
  let allRows: SourceItemRow[];
  try {
    allRows = sourceDb
      .prepare(
        "SELECT id, sku, category, color, description, image_path, images, look_id, source_photo FROM items"
      )
      .all() as SourceItemRow[];
  } finally {
    sourceDb.close();
  }

  // Фильтр по наличию файла — до всего остального: дальше эти строки считаются
  // единственным актуальным составом каталога.
  const rows = withExistingFiles(allRows);

  // Копируем фото в public/catalog ДО обращения к БД — это чисто локальная
  // файловая операция для деплоя (см. комментарий у PUBLIC_CATALOG_DIR), не
  // зависит от того, доступна ли (Turso) база.
  copyCatalogImages(rows);
  const pruned = prunePublicCatalog(rows);

  let removed = 0;
  await db.transaction(async (tx) => {
    for (const item of rows) {
      const values = {
        id: item.id,
        sku: item.sku,
        category: item.category,
        color: item.color,
        description: item.description,
        imagePath: item.image_path,
        images: item.images,
        lookId: item.look_id,
        sourcePhoto: item.source_photo,
      };
      await tx
        .insert(catalogItems)
        .values(values)
        .onConflictDoUpdate({
          target: catalogItems.id,
          set: {
            sku: values.sku,
            category: values.category,
            color: values.color,
            description: values.description,
            imagePath: values.imagePath,
            images: values.images,
            lookId: values.lookId,
            sourcePhoto: values.sourcePhoto,
          },
        });
    }

    // Удаляем товары, которых больше нет в источнике (например, снятые с
    // публикации дубликаты после переименования папок в data/raw) — иначе
    // старые записи вечно висели бы в каталоге и примерке (upsert их не трогал).
    if (rows.length > 0) {
      const sourceIds = rows.map((item) => item.id);
      const result = await tx.delete(catalogItems).where(notInArray(catalogItems.id, sourceIds));
      removed = result.rowsAffected ?? 0;
    }
  });

  return { synced: rows.length, removed, pruned, skipped: false };
}
