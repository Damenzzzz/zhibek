"""
Одноразовая (идемпотентная) починка каталога БЕЗ повторных вызовов Gemini:

1. Удаляет "осиротевшие" товары-папки — записи, у которых source_photo вида
   "<имя>/", но папки data/raw/<имя> больше нет (например, после
   переименования 1/ -> 1_shirt/ остались дубликаты single-1/single-2/single-3).
2. Для каждого оставшегося товара-папки копирует ВСЕ ракурсы из data/raw/<имя>
   в каталог (обложка <id>.jpg + <id>-1.jpg, <id>-2.jpg...) и заполняет колонку
   items.images JSON-массивом путей — чтобы на карточке товара их можно было
   листать стрелками.
3. Для всех прочих товаров (кропы с коллажей), у которых images пустая,
   проставляет images = [image_path].
4. Дублирует получившиеся файлы в apps/web/public/catalog (эта папка коммитится
   и уходит в деплой на Vercel статикой).

Запуск из корня репозитория:
    python scripts/rebuild_catalog_images.py
"""

import json
import shutil
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
CATALOG_DIR = ROOT / "data" / "catalog"
DB_PATH = CATALOG_DIR / "items.db"
PUBLIC_CATALOG_DIR = ROOT / "apps" / "web" / "public" / "catalog"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")


def ensure_images_column(conn: sqlite3.Connection) -> None:
    columns = {row[1] for row in conn.execute("PRAGMA table_info(items)")}
    if "images" not in columns:
        conn.execute("ALTER TABLE items ADD COLUMN images TEXT")
        conn.commit()


def folder_name_from_source(source_photo: str) -> str | None:
    """"9_tricko/" -> "9_tricko"; для источников-файлов (коллажей) — None."""
    if source_photo.endswith("/"):
        return source_photo[:-1]
    return None


def delete_item_files(conn: sqlite3.Connection, image_path: str, images_json: str | None) -> None:
    paths = {image_path}
    if images_json:
        try:
            paths.update(json.loads(images_json))
        except (json.JSONDecodeError, TypeError):
            pass
    for rel in paths:
        (ROOT / rel).unlink(missing_ok=True)


def remove_orphan_folders(conn: sqlite3.Connection) -> int:
    """Удаляет товары из папок, которых больше нет в data/raw."""
    removed = 0
    rows = conn.execute(
        "SELECT id, image_path, images, source_photo FROM items"
    ).fetchall()
    orphan_sources: set[str] = set()
    for item_id, image_path, images_json, source_photo in rows:
        folder = folder_name_from_source(source_photo)
        if folder is None:
            continue
        if (RAW_DIR / folder).is_dir():
            continue
        # Папка-источник исчезла — это устаревший дубликат.
        delete_item_files(conn, image_path, images_json)
        conn.execute("DELETE FROM items WHERE id = ?", (item_id,))
        orphan_sources.add(source_photo)
        removed += 1
        print(f"  - удалён устаревший товар {item_id} (источник {source_photo})")
    for source_photo in orphan_sources:
        conn.execute("DELETE FROM processed_photos WHERE source_photo = ?", (source_photo,))
    conn.commit()
    return removed


def rebuild_folder_item(conn: sqlite3.Connection, item_id: str, category: str, folder: str) -> list[str]:
    """Пересобирает файлы товара-папки из всех ракурсов data/raw/<folder>."""
    folder_path = RAW_DIR / folder
    images = sorted(p for p in folder_path.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS)
    if not images:
        return []

    # Тот же выбор обложки, что и в process_photos.py: самый "тяжёлый" файл.
    cover = max(images, key=lambda p: p.stat().st_size)
    ordered = [cover] + [p for p in images if p != cover]

    category_dir = CATALOG_DIR / category
    category_dir.mkdir(parents=True, exist_ok=True)

    # Подчистим возможные лишние старые <id>-N.jpg от прошлых прогонов.
    for stale in category_dir.glob(f"{item_id}-*.jpg"):
        stale.unlink(missing_ok=True)

    relative_paths: list[str] = []
    for idx, src in enumerate(ordered):
        out_path = category_dir / (f"{item_id}.jpg" if idx == 0 else f"{item_id}-{idx}.jpg")
        shutil.copyfile(src, out_path)
        relative_paths.append(out_path.relative_to(ROOT).as_posix())
    return relative_paths


def main() -> None:
    if not DB_PATH.exists():
        print(f"Нет {DB_PATH} — сначала запусти process_photos.py", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    ensure_images_column(conn)

    print("Удаляю осиротевшие товары-папки...")
    removed = remove_orphan_folders(conn)
    print(f"Удалено: {removed}")

    print("\nПересобираю фото товаров...")
    rebuilt = 0
    singles = 0
    rows = conn.execute("SELECT id, category, image_path, images, source_photo FROM items").fetchall()
    for item_id, category, image_path, images_json, source_photo in rows:
        folder = folder_name_from_source(source_photo)
        if folder is not None:
            relative_paths = rebuild_folder_item(conn, item_id, category, folder)
            if not relative_paths:
                continue
            conn.execute(
                "UPDATE items SET image_path = ?, images = ? WHERE id = ?",
                (relative_paths[0], json.dumps(relative_paths, ensure_ascii=False), item_id),
            )
            rebuilt += 1
            print(f"  ~ {item_id}: {len(relative_paths)} фото")
        elif not images_json:
            # Кроп с коллажа — единственное фото.
            conn.execute(
                "UPDATE items SET images = ? WHERE id = ?",
                (json.dumps([image_path], ensure_ascii=False), item_id),
            )
            singles += 1
    conn.commit()
    print(f"Пересобрано товаров-папок: {rebuilt}, проставлено single-images: {singles}")

    # Синхронизируем файлы в public/catalog (коммитится и уходит в деплой).
    print("\nКопирую в apps/web/public/catalog...")
    copied = sync_public(conn)
    print(f"Скопировано новых файлов: {copied}")

    conn.close()
    print("\nГотово. Перезапусти/передеплой apps/web — БД приложения подтянет изменения.")


def sync_public(conn: sqlite3.Connection) -> int:
    copied = 0
    rows = conn.execute("SELECT image_path, images FROM items").fetchall()
    all_paths: set[str] = set()
    for image_path, images_json in rows:
        all_paths.add(image_path)
        if images_json:
            try:
                all_paths.update(json.loads(images_json))
            except (json.JSONDecodeError, TypeError):
                pass
    marker = "data/catalog/"
    for rel in all_paths:
        idx = rel.find(marker)
        relative = rel[idx + len(marker):] if idx >= 0 else rel
        src = CATALOG_DIR / relative
        dst = PUBLIC_CATALOG_DIR / relative
        if not src.exists():
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        # Перезаписываем всегда — файлы могли обновиться (обложка/ракурсы).
        shutil.copyfile(src, dst)
        copied += 1
    return copied


if __name__ == "__main__":
    main()
