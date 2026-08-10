# ZHIBEK

Сайт примерки одежды: каталог образов, виртуальная примерка через FASHN API,
подбор комплектов из фото коллекций.

## Стек

- **Python 3** (`google-genai`, Pillow) — разбирает коллажи на отдельные товары
- **Next.js 16** (App Router, TypeScript, Tailwind v4) — сайт (`apps/web`)
- **SQLite** (`drizzle-orm` + `better-sqlite3`) — `apps/web/data/app.db`
- **FASHN API** — примерка, генерация модели по описанию, face-to-model

## Требования

- Node.js 20+
- Python 3.11+
- Ключ Gemini API — [ai.google.dev](https://ai.google.dev)
- Ключ FASHN API — [fashn.ai](https://fashn.ai) (платный, есть бесплатные кредиты на старте)

## Установка

### 1. Переменные окружения

Next.js и Python-скрипт читают разные `.env`-файлы, поэтому ключи нужно положить в оба:

```bash
cp .env.example .env
cp .env.example apps/web/.env.local
```

Впиши `GEMINI_API_KEY` и `FASHN_API_KEY` в оба файла.

### 2. Python-пайплайн

```bash
pip install -r requirements.txt
```

### 3. Веб-приложение

```bash
cd apps/web
npm install
```

## Обработка фото (`scripts/process_photos.py`)

Каждое фото в `data/raw/` — коллаж: слева модель в образе, справа отдельные
вырезанные фото товаров с артикулами. Скрипт находит товары через Gemini,
вырезает их и пишет метаданные в `data/catalog/items.db`.

```bash
# положи новые коллажи (jpg/jpeg/png/webp) в data/raw/, затем:
python scripts/process_photos.py
```

Полезные флаги:

```bash
python scripts/process_photos.py --limit 3           # обработать не больше 3 новых фото
python scripts/process_photos.py --model gemini-2.5-flash   # другая модель Gemini
```

**Идемпотентно**: скрипт помнит уже обработанные фото по имени файла
(таблица `processed_photos`), повторный запуск отправляет в Gemini только
новые файлы из `data/raw/`. Бесплатный тариф Gemini ограничен ~5 запросами
в минуту — при обработке большого набора фото возможны паузы/429-ошибки,
это нормально, просто запусти скрипт ещё раз.

Результат:
- обрезанные фото → `data/catalog/<category>/<sku или id>.jpg`
- метаданные → `data/catalog/items.db` (SQLite)
- в консоли — сводка по каждому фото для ручной проверки

## Запуск сайта

```bash
cd apps/web
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000) — редиректит на `/catalog`.

При старте dev-сервера каталог **автоматически синхронизируется** из
`data/catalog/items.db` в `apps/web/data/app.db` (см. `instrumentation.ts`).
Если добавил новые фото и не хочешь перезапускать сервер — синхронизируй вручную:

```bash
npm run sync:catalog
```

Так выглядит полный цикл добавления новых товаров:

1. Положить коллажи в `data/raw/`
2. `python scripts/process_photos.py`
3. `npm run sync:catalog` (или перезапустить `npm run dev`)

## База данных (`apps/web`)

```bash
npm run db:generate   # сгенерировать миграцию после правки lib/schema.ts
npm run db:migrate     # применить миграции вручную
npm run db:studio      # drizzle studio — посмотреть содержимое БД
```

Миграции также применяются автоматически при любом обращении к `lib/db.ts`
(то есть при старте dev-сервера или сборке).

## Структура репозитория

```
zhibek/
├── data/
│   ├── raw/                    # исходные коллажи-образы
│   └── catalog/                 # обрезанные фото товаров + items.db
├── scripts/
│   └── process_photos.py        # Python: Gemini → детекция → обрезка → БД
├── apps/web/
│   ├── app/
│   │   ├── catalog/              # каталог + страница товара
│   │   ├── profile/              # анкета (рост/вес/фото или FASHN-модель)
│   │   ├── tryon/                # примерка + история
│   │   └── api/                  # catalog, profile, tryon, images
│   ├── lib/
│   │   ├── db.ts, schema.ts       # drizzle + better-sqlite3
│   │   ├── fashn.ts               # обёртка над FASHN API
│   │   ├── matching.ts            # рекомендации "Дополните образ"
│   │   └── syncCatalog.ts         # импорт data/catalog/items.db в app.db
│   └── data/app.db                # SQLite: пользователи, история примерок
└── .env.example                   # GEMINI_API_KEY, FASHN_API_KEY
```

## Известные ограничения

- **FASHN не может скачать фото с `localhost`.** Это облачный сервис — реальная
  примерка (`/tryon`) и генерация модели по описанию заработают только когда
  сайт доступен из интернета (деплой или туннель вроде ngrok). Локально можно
  проверить всё остальное (каталог, анкету, выбор образа), но сам вызов
  `/api/tryon` вернёт ошибку загрузки фото.
- Каждый вызов примерки и генерации модели тратит платные кредиты FASHN —
  учёт расхода в таблице `credit_usage` (`apps/web/lib/fashn.ts`).
- Разработка велась на Windows. Если `next dev` падает с ошибкой Turbopack при
  обработке CSS/картинок, удали `apps/web/.next` и перезапусти — иногда
  помогает, особенно если путь к проекту содержит кириллицу/пробелы (например,
  папка на OneDrive).
