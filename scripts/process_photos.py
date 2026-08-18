"""
Обрабатывает исходники из data/raw/ через Gemini API и пишет предметы одежды
в каталог. Поддерживает три формата входа:

1. Папка-образ (ОСНОВНОЙ формат нового каталога): data/raw/<N>/ — один готовый
   образ (комплект). Внутри <N>.jpg/<N>.png — фото модели в полном образе
   (обложка), а <N>-1.jpg, <N>-2.jpg, ... — отдельные изолированные фото
   каждого товара образа. Каждое item-фото идёт в каталог целиком (кроп не
   нужен), все товары получают общий look_id = имя папки (см.
   process_look_folder). Обложка кладётся в data/catalog/looks/<N>.jpg.
2. Коллаж (файл прямо в data/raw/): слева — модель в полном образе, справа —
   отдельные вырезанные фото товаров с номерами артикулов рядом. Каждый
   найденный предмет вырезается по рамке (bounding box) в свой файл.
3. Папка с ракурсами одного товара (data/raw/<имя>/* без обложки-комплекта):
   уже изолированное фото товара в нескольких ракурсах. Обрезка не нужна,
   в каталог идёт весь файл целиком; обложка — самый "тяжёлый" файл в папке.

Запуск:
    python scripts/process_photos.py
    python scripts/process_photos.py --model gemini-2.5-flash --limit 3
    python scripts/process_photos.py --force   # переобработать всё заново

Идемпотентно: уже обработанные источники (по имени файла или папки, таблица
processed_photos) повторно не отправляются в Gemini, если не передан --force.
"""

import argparse
import io
import json
import os
import sqlite3
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

from dotenv import load_dotenv
from PIL import Image
from pydantic import BaseModel, Field

from google import genai
from google.genai import types

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
CATALOG_DIR = ROOT / "data" / "catalog"
DB_PATH = CATALOG_DIR / "items.db"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Бесплатный тариф Gemini ограничен ~5 запросами/мин на модель — без паузы
# между вызовами быстро ловим 429 RESOURCE_EXHAUSTED. Троттлим все вызовы
# generate_content централизованно перед самим запросом.
_MIN_CALL_INTERVAL_S = 13.0
_last_gemini_call_at = 0.0


def _throttle_gemini() -> None:
    global _last_gemini_call_at
    elapsed = time.monotonic() - _last_gemini_call_at
    if elapsed < _MIN_CALL_INTERVAL_S:
        time.sleep(_MIN_CALL_INTERVAL_S - elapsed)
    _last_gemini_call_at = time.monotonic()
DEFAULT_MODEL = "gemini-flash-latest"
DEFAULT_RETOUCH_MODEL = "gemini-2.5-flash-image"

RETOUCH_PROMPT = """\
На этом фото товара наложен текст (название, артикул, цена). Убери весь текст
и любые надписи с изображения, восстановив то, что было под ними, в едином
стиле с окружающей тканью/фоном. Сам товар (форма, цвет, фактура, поза модели,
если она есть) должен остаться визуально идентичным — не меняй ничего, кроме
удаления текста. Не добавляй новых объектов, не меняй кадрирование и пропорции.
"""

Category = Literal["top", "bottom", "outerwear", "shoes", "bag", "accessory"]

PROMPT = """\
Это фото одного образа — набор одежды/аксессуаров, которые продаются вместе.
Обычно это коллаж: слева — фото модели, одетой в полный образ, справа —
отдельные вырезанные фотографии товаров из этого образа, рядом с некоторыми
из них подписан номер артикула (SKU). Но встречается и другой вид: например
фото без модели, где просто разложены/развешаны несколько отдельных вещей
образа (куртка на плечиках, брюки рядом и т.п.) — правила ниже применяются
к любому из этих вариантов.

Найди на изображении все отдельные предметы одежды и аксессуары. Для каждого
верни отдельную рамку (bounding box), даже если несколько предметов похожи.
Если на фото есть и модель, и отдельные вырезанные фото товаров — приоритет
у вырезанных фото (они уже разделены и их проще ограничить рамкой), но если
их не хватает для крупных предметов, которые хорошо видны и на модели,
добавь и их.

ВАЖНО про рамку: у некоторых товаров справа под фото или поверх него есть
текстовая подпись (название, "Арт.<номер>", цена вроде "3915 руб."). Рамка
должна ограничивать ТОЛЬКО само изображение товара — не включай в неё текст
подписи ни снизу, ни сверху, ни сбоку. Если подпись наложена прямо на фото
(например, внизу кадра), обрежь рамку по верхней границе текста, чтобы текст
не попал в кадр.

Для каждого найденного предмета верни:
- box_2d: [ymin, xmin, ymax, xmax] в нормализованных координатах 0-1000
  относительно всего изображения
- label: краткое название предмета на русском (например "бежевый тренч")
- category: одна из top, bottom, outerwear, shoes, bag, accessory
- dominant_color: доминирующий цвет на русском (например "бежевый")
- sku_id: номер артикула, если он виден подписанным рядом с товаром, иначе null
- short_description: короткое описание товара (1 предложение)
"""


class DetectedItem(BaseModel):
    box_2d: list[int] = Field(min_length=4, max_length=4)
    label: str
    category: Category
    dominant_color: str
    sku_id: Optional[str] = None
    short_description: str


SINGLES_PROMPT = """\
Тебе показаны ВСЕ фото из одной папки — предполагается, что это один товар,
снятый с разных ракурсов/в разных состояниях (перёд/спина, на модели/без
модели, крупный план детали). Посмотри на них ВМЕСТЕ, прежде чем решить, что
на самом деле продаётся.

На фото "на модели" часто помимо основного товара видна и другая одежда
модели для стиля съёмки (футболка, брюки и т.п.) — это НЕ отдельные товары,
а посторонний фон, их не нужно вычленять.

Верни is_full_outfit=false (единственный товар), если:
- хотя бы на одном фото товар показан отдельно/крупно/на плечиках/в flat lay
  без остальной одежды модели, ЛИБО
- по всем фото прослеживается ровно один и тот же повторяющийся предмет,
  а остальная одежда на модели между кадрами разная/непоследовательная (то
  есть явно не является частью того, что продаётся).
В этом случае опиши именно этот единственный товар:
- category: одна из top, bottom, outerwear, shoes, bag, accessory
- dominant_color: доминирующий цвет на русском (например "серый")
- short_description: короткое описание товара на русском (1 предложение,
  с брендом и типом изделия, если они узнаваемы на фото)

Верни is_full_outfit=true, ТОЛЬКО если НЕСКОЛЬКО разных предметов одежды
(например олимпийка И брюки, или футболка И штаны И кроссовки) показаны
ВМЕСТЕ и ПОСЛЕДОВАТЕЛЬНО одинаково важно на большинстве/всех фото — то есть
это явно единый комплект/сет из нескольких вещей, продающийся как одно целое,
а не один товар с посторонней одеждой на фоне. В этом случае
category/dominant_color/short_description можно заполнить любыми
значениями-заглушками (в дальнейшей обработке они не используются).
"""


class SingleItem(BaseModel):
    is_full_outfit: bool
    category: Category
    dominant_color: str
    short_description: str


# --- Формат «папка-образ» (основной для нового каталога) -------------------
# data/raw/<N>/ — один готовый образ (комплект). Внутри:
#   <N>.jpg / <N>.png — фото модели в полном образе (обложка образа);
#   <N>-1.jpg, <N>-2.jpg, ... — отдельные изолированные фото каждого товара
#     этого образа (на однотонном фоне, без модели и без наложенного текста).
# Каждое item-фото идёт в каталог целиком (кроп не нужен), все товары папки
# получают общий look_id = имя папки — это и есть «часть образа» / «дополните
# образ» на фронте (см. apps/web/lib/matching.ts).

LOOK_ITEMS_PROMPT = """\
Тебе показаны отдельные фотографии товаров, которые вместе составляют ОДИН
модный образ (комплект одежды и аксессуаров). Каждое фото — это один
изолированный товар на однотонном фоне (без модели).

Фотографии переданы по порядку. Для КАЖДОЙ фотографии верни ровно один объект
с полями:
- index: порядковый номер фото, начиная с 1 (в том же порядке, в каком фото
  переданы). Не пропускай и не меняй порядок.
- category: одна из top, bottom, outerwear, shoes, bag, accessory.
  Подсказки: рубашка/блузка/футболка/топ/джемпер = top; брюки/юбка/шорты =
  bottom; жилет/жакет/пиджак/пальто/тренч/куртка = outerwear; туфли/кроссовки/
  сапоги/босоножки = shoes; сумка/клатч/рюкзак = bag; ремень/очки/украшения/
  шляпа/шарф = accessory.
- dominant_color: доминирующий цвет товара на русском (например "тёмно-синий").
- title: короткое название товара на русском из 2-4 слов (например
  "тёмно-синий жилет", "кремовая шёлковая блузка").
- short_description: одно предложение-описание товара на русском.

Верни JSON-массив ровно из такого числа объектов, сколько передано фотографий.
"""


class ClassifiedItem(BaseModel):
    index: int
    category: Category
    dominant_color: str
    title: str
    short_description: str


def init_db(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            sku TEXT,
            category TEXT NOT NULL,
            color TEXT,
            description TEXT,
            image_path TEXT NOT NULL,
            images TEXT,
            look_id TEXT NOT NULL,
            source_photo TEXT NOT NULL
        )
        """
    )
    # images добавлена позже — на старых БД её нет, дописываем миграцией.
    # images хранит JSON-массив всех фото товара (обложка первой); для товаров
    # из папок data/raw это несколько ракурсов, для кропов с коллажа — один путь.
    columns = {row[1] for row in conn.execute("PRAGMA table_info(items)")}
    if "images" not in columns:
        conn.execute("ALTER TABLE items ADD COLUMN images TEXT")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS processed_photos (
            source_photo TEXT PRIMARY KEY,
            processed_at TEXT NOT NULL,
            items_found INTEGER NOT NULL
        )
        """
    )
    conn.commit()


def already_processed(conn: sqlite3.Connection, filename: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM processed_photos WHERE source_photo = ?", (filename,)
    ).fetchone()
    return row is not None


def clear_previous_results(conn: sqlite3.Connection, filename: str) -> None:
    """Удаляет старые товары и файлы для source_photo перед переобработкой (--force)."""
    rows = conn.execute(
        "SELECT image_path, images FROM items WHERE source_photo = ?", (filename,)
    ).fetchall()
    for image_path, images_json in rows:
        paths = {image_path}
        if images_json:
            try:
                paths.update(json.loads(images_json))
            except (json.JSONDecodeError, TypeError):
                pass
        for relative_path in paths:
            (ROOT / relative_path).unlink(missing_ok=True)
    conn.execute("DELETE FROM items WHERE source_photo = ?", (filename,))
    conn.execute("DELETE FROM processed_photos WHERE source_photo = ?", (filename,))
    conn.commit()


def sanitize_id(value: str) -> str:
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in value.strip())
    return safe.strip("_") or uuid.uuid4().hex[:8]


def box_to_pixels(box_2d: list[int], width: int, height: int) -> tuple[int, int, int, int]:
    ymin, xmin, ymax, xmax = box_2d
    x1 = round(xmin / 1000 * width)
    y1 = round(ymin / 1000 * height)
    x2 = round(xmax / 1000 * width)
    y2 = round(ymax / 1000 * height)
    x1, x2 = sorted((max(0, min(x1, width)), max(0, min(x2, width))))
    y1, y2 = sorted((max(0, min(y1, height)), max(0, min(y2, height))))
    return x1, y1, x2, y2


def detect_items(client: genai.Client, model: str, image_path: Path) -> list[DetectedItem]:
    image_bytes = image_path.read_bytes()
    mime_type = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }[image_path.suffix.lower()]

    _throttle_gemini()
    response = client.models.generate_content(
        model=model,
        contents=[
            PROMPT,
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[DetectedItem],
        ),
    )

    if response.parsed is not None:
        return list(response.parsed)

    # Fallback: response.parsed can stay None (e.g. minor schema mismatch),
    # so validate the raw JSON text ourselves instead of failing outright.
    raw = json.loads(response.text)
    return [DetectedItem.model_validate(item) for item in raw]


def detect_single_item(client: genai.Client, model: str, image_paths: list[Path]) -> SingleItem:
    """Классифицирует папку по ВСЕМ её фото за один вызов (не только по
    обложке) — так модель может сверить ракурсы между собой и не путать
    посторонние вещи модели с самим товаром (см. SINGLES_PROMPT)."""
    mime_by_suffix = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    parts = [
        types.Part.from_bytes(data=p.read_bytes(), mime_type=mime_by_suffix[p.suffix.lower()])
        for p in image_paths
    ]

    _throttle_gemini()
    response = client.models.generate_content(
        model=model,
        contents=[SINGLES_PROMPT, *parts],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=SingleItem,
        ),
    )

    if response.parsed is not None:
        return response.parsed

    return SingleItem.model_validate(json.loads(response.text))


def remove_watermark(client: genai.Client, model: str, crop: Image.Image) -> Optional[Image.Image]:
    """Пытается убрать вписанный в фото текст (цена/артикул) через image-editing
    модель Gemini. Возвращает None при любой проблеме — вызывающий код в этом
    случае должен оставить исходный кроп как есть."""
    buffer = io.BytesIO()
    crop.save(buffer, "JPEG", quality=95)

    try:
        _throttle_gemini()
        response = client.models.generate_content(
            model=model,
            contents=[
                RETOUCH_PROMPT,
                types.Part.from_bytes(data=buffer.getvalue(), mime_type="image/jpeg"),
            ],
            config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
        )
    except Exception as exc:  # noqa: BLE001 - ретушь необязательна, не должна ронять пайплайн
        print(f"    ! ретушь не удалась: {exc}")
        return None

    for part in response.parts or []:
        if part.inline_data:
            return Image.open(io.BytesIO(part.inline_data.data)).convert("RGB")

    print("    ! ретушь: модель не вернула изображение")
    return None


def save_detected_items(
    conn: sqlite3.Connection,
    client: genai.Client,
    detected: list[DetectedItem],
    image: Image.Image,
    look_id: str,
    source_photo: str,
    retouch_model: Optional[str] = None,
) -> dict[str, int]:
    """Кроп по bounding box каждого найденного предмета + запись в
    data/catalog/<category>/ и в таблицы items/processed_photos. Общая
    логика для коллажей (process_photo) и "полных образов" внутри
    singles-папок (process_single_folder, ветка is_full_outfit)."""
    width, height = image.size
    category_counts: dict[str, int] = {}
    cursor = conn.cursor()
    for idx, item in enumerate(detected, start=1):
        x1, y1, x2, y2 = box_to_pixels(item.box_2d, width, height)
        if x2 <= x1 or y2 <= y1:
            print(f"  ! пропущен предмет с некорректной рамкой: {item.label}")
            continue

        crop = image.crop((x1, y1, x2, y2))

        if retouch_model:
            retouched = remove_watermark(client, retouch_model, crop)
            if retouched is not None:
                crop = retouched

        item_id = sanitize_id(item.sku_id) if item.sku_id else f"{sanitize_id(look_id)}-item{idx:02d}"
        category_dir = CATALOG_DIR / item.category
        category_dir.mkdir(parents=True, exist_ok=True)
        image_path = category_dir / f"{item_id}.jpg"
        crop.save(image_path, "JPEG", quality=90)

        relative_path = image_path.relative_to(ROOT).as_posix()
        cursor.execute(
            """
            INSERT OR REPLACE INTO items
                (id, sku, category, color, description, image_path, images, look_id, source_photo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item_id,
                item.sku_id,
                item.category,
                item.dominant_color,
                item.short_description,
                relative_path,
                # Кроп с коллажа — единственное фото товара.
                json.dumps([relative_path], ensure_ascii=False),
                look_id,
                source_photo,
            ),
        )
        category_counts[item.category] = category_counts.get(item.category, 0) + 1

    cursor.execute(
        """
        INSERT OR REPLACE INTO processed_photos (source_photo, processed_at, items_found)
        VALUES (?, ?, ?)
        """,
        (source_photo, datetime.now(timezone.utc).isoformat(), len(detected)),
    )
    conn.commit()
    return category_counts


def process_photo(
    conn: sqlite3.Connection,
    client: genai.Client,
    model: str,
    photo_path: Path,
    retouch_model: Optional[str] = None,
) -> dict[str, int]:
    look_id = photo_path.stem
    image = Image.open(photo_path).convert("RGB")
    detected = detect_items(client, model, photo_path)
    return save_detected_items(conn, client, detected, image, look_id, photo_path.name, retouch_model)


# processed_photos.source_photo хранит либо имя файла-коллажа ("look.jpg"),
# либо, для папок с ракурсами одного товара, имя папки с завершающим "/"
# (например "1/") — суффикс отличает их от настоящих имён файлов и не может
# случайно совпасть с реальным JPEG/PNG.
def folder_source_key(folder_path: Path) -> str:
    return f"{folder_path.name}/"


def process_single_folder(
    conn: sqlite3.Connection,
    client: genai.Client,
    model: str,
    folder_path: Path,
    retouch_model: Optional[str] = None,
) -> dict[str, int]:
    images = sorted(p for p in folder_path.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS)
    if not images:
        print(f"  ! в папке {folder_path.name} нет изображений — пропущена")
        return {}

    # Эвристика выбора обложки: самый "тяжёлый" по размеру файл среди
    # ракурсов обычно самый детальный/выигрышный кадр (проверено на реальных
    # фото с маркетплейсов в data/raw/1, data/raw/2, data/raw/3).
    cover = max(images, key=lambda p: p.stat().st_size)

    detected = detect_single_item(client, model, images)
    look_id = f"single-{folder_path.name}"
    source_photo = folder_source_key(folder_path)
    image = Image.open(cover).convert("RGB")

    if detected.is_full_outfit:
        # Папка оказалась не "один товар с ракурсов", а моделью в целом
        # образе из нескольких предметов сразу (см. SINGLES_PROMPT) —
        # переиспользуем bounding-box детектор коллажей, чтобы разложить
        # образ на отдельные товары вместо одной неверной записи.
        print(f"  ~ {folder_path.name}: обнаружен полный образ на модели, разбиваю на отдельные предметы")
        items = detect_items(client, model, cover)
        return save_detected_items(conn, client, items, image, look_id, source_photo, retouch_model)

    item_id = sanitize_id(look_id)
    category_dir = CATALOG_DIR / detected.category
    category_dir.mkdir(parents=True, exist_ok=True)

    # Обложка + все остальные ракурсы из папки идут в каталог: обложка как
    # <id>.jpg, остальные фото как <id>-1.jpg, <id>-2.jpg... — на карточке
    # товара их можно листать стрелками (см. ProductGallery на фронте).
    # Порядок: сначала обложка (самый "тяжёлый" файл), затем прочие по имени.
    ordered = [cover] + [p for p in images if p != cover]
    relative_paths: list[str] = []
    for idx, src in enumerate(ordered):
        angle = Image.open(src).convert("RGB")
        out_path = category_dir / (f"{item_id}.jpg" if idx == 0 else f"{item_id}-{idx}.jpg")
        angle.save(out_path, "JPEG", quality=90)
        relative_paths.append(out_path.relative_to(ROOT).as_posix())

    relative_path = relative_paths[0]
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT OR REPLACE INTO items
            (id, sku, category, color, description, image_path, images, look_id, source_photo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            item_id,
            None,
            detected.category,
            detected.dominant_color,
            detected.short_description,
            relative_path,
            json.dumps(relative_paths, ensure_ascii=False),
            look_id,
            source_photo,
        ),
    )
    cursor.execute(
        """
        INSERT OR REPLACE INTO processed_photos (source_photo, processed_at, items_found)
        VALUES (?, ?, ?)
        """,
        (source_photo, datetime.now(timezone.utc).isoformat(), 1),
    )
    conn.commit()
    return {detected.category: 1}


_MIME_BY_SUFFIX = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def split_look_folder(folder_path: Path) -> tuple[Optional[Path], list[Path]]:
    """Разбивает папку-образ на (обложка, [товары]). Обложка — файл, чьё имя
    совпадает с именем папки (<N>.jpg/<N>.png); товары — все остальные
    изображения, отсортированные по числовому суффиксу <N>-<k>."""
    images = [p for p in folder_path.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS]
    cover = next((p for p in images if p.stem == folder_path.name), None)
    items = [p for p in images if p is not cover]

    def sort_key(p: Path) -> tuple:
        # "<N>-<k>" -> сортируем по k, прочее — по имени в конец.
        suffix = p.stem.split("-", 1)[1] if "-" in p.stem else ""
        return (0, int(suffix)) if suffix.isdigit() else (1, p.stem)

    items.sort(key=sort_key)
    return cover, items


def is_look_folder(folder_path: Path) -> bool:
    """Папка-образ нового формата: есть обложка <N>.* и хотя бы два отдельных
    фото товаров <N>-<k>.* (комплект из нескольких вещей)."""
    cover, items = split_look_folder(folder_path)
    return cover is not None and len(items) >= 2


def classify_look_items(
    client: genai.Client, model: str, item_paths: list[Path]
) -> list[ClassifiedItem]:
    """Классифицирует все товары образа за один вызов Gemini (по фото в
    порядке item_paths). При несовпадении числа/индексов ответа — доклассифицирует
    недостающие товары поштучно, чтобы не потерять ни одну вещь."""
    parts = [
        types.Part.from_bytes(data=p.read_bytes(), mime_type=_MIME_BY_SUFFIX[p.suffix.lower()])
        for p in item_paths
    ]

    _throttle_gemini()
    response = client.models.generate_content(
        model=model,
        contents=[LOOK_ITEMS_PROMPT, *parts],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[ClassifiedItem],
        ),
    )
    if response.parsed is not None:
        parsed = list(response.parsed)
    else:
        parsed = [ClassifiedItem.model_validate(x) for x in json.loads(response.text)]

    by_index = {c.index: c for c in parsed}
    result: list[ClassifiedItem] = []
    for i, path in enumerate(item_paths, start=1):
        item = by_index.get(i)
        if item is None:
            item = classify_single_item(client, model, path, i)
        result.append(item)
    return result


def classify_single_item(
    client: genai.Client, model: str, item_path: Path, index: int
) -> ClassifiedItem:
    """Резервная поштучная классификация одного товара (если пакетный вызов
    не вернул для него объект)."""
    _throttle_gemini()
    response = client.models.generate_content(
        model=model,
        contents=[
            LOOK_ITEMS_PROMPT,
            types.Part.from_bytes(
                data=item_path.read_bytes(), mime_type=_MIME_BY_SUFFIX[item_path.suffix.lower()]
            ),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=list[ClassifiedItem],
        ),
    )
    if response.parsed:
        item = list(response.parsed)[0]
    else:
        item = ClassifiedItem.model_validate(json.loads(response.text)[0])
    item.index = index
    return item


def process_look_folder(
    conn: sqlite3.Connection,
    client: genai.Client,
    model: str,
    folder_path: Path,
) -> dict[str, int]:
    """Обрабатывает папку-образ: каждое item-фото идёт в каталог целиком,
    все товары получают общий look_id = имя папки. Обложка образа копируется
    в data/catalog/looks/<N>.jpg (для показа готового образа на фронте)."""
    cover, items = split_look_folder(folder_path)
    if not items:
        print(f"  ! в папке {folder_path.name} нет фото товаров — пропущена")
        return {}

    look_id = folder_path.name
    source_photo = folder_source_key(folder_path)
    classified = classify_look_items(client, model, items)

    # Обложку образа (модель в полном образе) сохраняем отдельно — фронт может
    # показать её как превью готового комплекта. Не входит в items, синком в БД
    # не участвует, поэтому просто кладём файл рядом.
    if cover is not None:
        looks_dir = CATALOG_DIR / "looks"
        looks_dir.mkdir(parents=True, exist_ok=True)
        Image.open(cover).convert("RGB").save(looks_dir / f"{look_id}.jpg", "JPEG", quality=90)

    category_counts: dict[str, int] = {}
    cursor = conn.cursor()
    for item_path, meta in zip(items, classified):
        item_id = sanitize_id(item_path.stem)
        category_dir = CATALOG_DIR / meta.category
        category_dir.mkdir(parents=True, exist_ok=True)
        out_path = category_dir / f"{item_id}.jpg"
        Image.open(item_path).convert("RGB").save(out_path, "JPEG", quality=90)

        relative_path = out_path.relative_to(ROOT).as_posix()
        cursor.execute(
            """
            INSERT OR REPLACE INTO items
                (id, sku, category, color, description, image_path, images, look_id, source_photo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item_id,
                None,
                meta.category,
                meta.dominant_color,
                meta.title or meta.short_description,
                relative_path,
                json.dumps([relative_path], ensure_ascii=False),
                look_id,
                source_photo,
            ),
        )
        category_counts[meta.category] = category_counts.get(meta.category, 0) + 1

    cursor.execute(
        """
        INSERT OR REPLACE INTO processed_photos (source_photo, processed_at, items_found)
        VALUES (?, ?, ?)
        """,
        (source_photo, datetime.now(timezone.utc).isoformat(), len(items)),
    )
    conn.commit()
    return category_counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Gemini модель (по умолчанию %(default)s)")
    parser.add_argument("--limit", type=int, default=None, help="обработать не более N новых фото")
    parser.add_argument(
        "--force",
        action="store_true",
        help="переобработать уже обработанные фото заново (старые товары и файлы удаляются)",
    )
    parser.add_argument(
        "--retouch",
        action="store_true",
        help="убрать наложенный текст (цена/артикул) с каждого кропа через image-editing модель (доп. вызовы Gemini)",
    )
    parser.add_argument(
        "--retouch-model",
        default=DEFAULT_RETOUCH_MODEL,
        help="модель для ретуши (по умолчанию %(default)s)",
    )
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Ошибка: GEMINI_API_KEY не задан (проверь .env)", file=sys.stderr)
        sys.exit(1)

    if not RAW_DIR.exists():
        print(f"Ошибка: {RAW_DIR} не существует", file=sys.stderr)
        sys.exit(1)

    CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    client = genai.Client(api_key=api_key)
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    photos = sorted(
        p for p in RAW_DIR.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS
    )
    if args.force:
        new_photos = photos
        skipped = 0
    else:
        new_photos = [p for p in photos if not already_processed(conn, p.name)]
        skipped = len(photos) - len(new_photos)
    if args.limit is not None:
        new_photos = new_photos[: args.limit]

    print(f"Найдено фото: {len(photos)}, уже обработано (пропущено): {skipped}, к обработке: {len(new_photos)}")

    summary: list[tuple[str, dict[str, int]]] = []
    for photo_path in new_photos:
        print(f"\nОбрабатываю {photo_path.name}...")
        if args.force:
            clear_previous_results(conn, photo_path.name)
        try:
            counts = process_photo(
                conn,
                client,
                args.model,
                photo_path,
                retouch_model=args.retouch_model if args.retouch else None,
            )
        except Exception as exc:  # noqa: BLE001 - продолжаем со следующим фото
            print(f"  ! ошибка при обработке {photo_path.name}: {exc}", file=sys.stderr)
            continue
        summary.append((photo_path.name, counts))

    # Папки с ракурсами одного товара (data/raw/1, data/raw/2, ...) — второй
    # формат входа, см. докстринг модуля. Обрабатываются отдельно от
    # коллажей: iterdir() выше их не задевает (у директорий нет suffix).
    folders = sorted(p for p in RAW_DIR.iterdir() if p.is_dir())
    if args.force:
        new_folders = folders
        folders_skipped = 0
    else:
        new_folders = [f for f in folders if not already_processed(conn, folder_source_key(f))]
        folders_skipped = len(folders) - len(new_folders)
    if args.limit is not None:
        remaining = max(0, args.limit - len(new_photos))
        new_folders = new_folders[:remaining]

    if folders:
        print(
            f"\nНайдено папок-товаров: {len(folders)}, уже обработано (пропущено): "
            f"{folders_skipped}, к обработке: {len(new_folders)}"
        )

    for folder_path in new_folders:
        print(f"\nОбрабатываю папку {folder_path.name}/...")
        if args.force:
            clear_previous_results(conn, folder_source_key(folder_path))
        try:
            if is_look_folder(folder_path):
                # Основной формат нового каталога: папка = готовый образ из
                # нескольких отдельных товаров (см. process_look_folder).
                counts = process_look_folder(conn, client, args.model, folder_path)
            else:
                counts = process_single_folder(
                    conn,
                    client,
                    args.model,
                    folder_path,
                    retouch_model=args.retouch_model if args.retouch else None,
                )
        except Exception as exc:  # noqa: BLE001 - продолжаем со следующей папкой
            print(f"  ! ошибка при обработке папки {folder_path.name}: {exc}", file=sys.stderr)
            continue
        if counts:
            summary.append((f"{folder_path.name}/", counts))

    conn.close()

    print("\n=== Сводка ===")
    if not summary:
        print("Новых фото не обработано.")
        return
    for filename, counts in summary:
        total = sum(counts.values())
        breakdown = ", ".join(f"{cat}: {n}" for cat, n in sorted(counts.items())) or "нет предметов"
        print(f"{filename}: {total} предметов ({breakdown})")


if __name__ == "__main__":
    main()
