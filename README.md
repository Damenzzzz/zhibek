# ZHIBEK

Сайт примерки одежды: каталог образов, виртуальная примерка через FASHN API,
подбор комплектов из фото коллекций.

## Стек

- **Python 3** (`google-genai`, Pillow) — разбирает коллажи на отдельные товары
- **Next.js 16** (App Router, TypeScript, Tailwind v4) — сайт (`apps/web`)
- **SQLite / Turso** (`drizzle-orm` + `@libsql/client`) — локально файл
  `apps/web/data/app.db`, на Vercel — облачная Turso-база (serverless-функции
  не хранят файлы между запросами)
- **Vercel Blob** — хранилище загруженных фото профиля (на Vercel; локально
  просто пишутся в `apps/web/public/uploads`)
- **FASHN API** — примерка, генерация модели по описанию, face-to-model

## Требования

- Node.js 20+
- Python 3.11+
- Ключ Gemini API — [ai.google.dev](https://ai.google.dev)
- Ключ FASHN API — [fashn.ai](https://fashn.ai) (платный, есть бесплатные кредиты на старте)

## Установка (локально)

### 1. Переменные окружения

Next.js и Python-скрипт читают **разные** `.env`-файлы с разным набором ключей:

```bash
cp .env.example .env                      # для Python: GEMINI_API_KEY
cp apps/web/.env.example apps/web/.env.local   # для сайта: FASHN_API_KEY (+ см. ниже)
```

Для локальной разработки достаточно заполнить `GEMINI_API_KEY` в `.env` и
`FASHN_API_KEY` в `apps/web/.env.local` — переменные `TURSO_*` и
`BLOB_READ_WRITE_TOKEN` можно оставить пустыми, локально сайт сам использует
файл `data/app.db` и папку `public/uploads`. Они нужны только для деплоя
(см. [Деплой на Vercel](#деплой-на-vercel)).

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
(то есть при старте dev-сервера или сборке). Без `TURSO_DATABASE_URL` в
окружении все три команды и сам сайт работают с локальным файлом
`apps/web/data/app.db`; если переменная задана — с облачной Turso-базой.

## Деплой на Vercel

Локальный SQLite-файл не переживёт деплой — serverless-функции Vercel не
хранят файлы между запросами. Поэтому для продакшена нужны:

### 1. Turso — база данных

```bash
npm install -g turso
turso auth login
turso db create zhibek
turso db show zhibek --url            # → TURSO_DATABASE_URL
turso db tokens create zhibek         # → TURSO_AUTH_TOKEN
```

Примени миграции на созданную базу перед первым деплоем:

```bash
cd apps/web
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:migrate
```

### 2. Vercel Blob — хранилище фото

В Vercel Dashboard проекта: **Storage → Create → Blob**. После подключения
к проекту токен `BLOB_READ_WRITE_TOKEN` появляется в переменных окружения
автоматически.

### 3. Переменные окружения на Vercel

В настройках проекта (Settings → Environment Variables) задай:
`FASHN_API_KEY`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
(`BLOB_READ_WRITE_TOKEN` подставится сам после шага 2).

### 4. Сам деплой

Root Directory проекта в Vercel — `apps/web` (не корень репозитория).
`data/catalog/` (фото товаров + `items.db`) закоммичены в git и уедут вместе
с кодом — при первом старте `instrumentation.ts` синхронизирует их в Turso
автоматически, как и локально.

```bash
npm install -g vercel
vercel login
vercel --cwd apps/web
```

После деплоя примерка (`/tryon`) и генерация модели по описанию заработают
по-настоящему — FASHN наконец сможет скачивать фото по публичному URL.

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
│   │   ├── db.ts, schema.ts       # drizzle + @libsql/client (Turso-совместимо)
│   │   ├── storage.ts             # загрузка фото: public/uploads локально, Vercel Blob в проде
│   │   ├── fashn.ts               # обёртка над FASHN API
│   │   ├── matching.ts            # рекомендации "Дополните образ"
│   │   └── syncCatalog.ts         # импорт data/catalog/items.db в БД приложения
│   └── data/app.db                # локальная SQLite-копия (гитignored)
├── .env.example                   # GEMINI_API_KEY (для Python)
└── apps/web/.env.example          # FASHN_API_KEY, TURSO_*, BLOB_READ_WRITE_TOKEN
```

## Известные ограничения

- **FASHN не может скачать фото с `localhost`.** Это облачный сервис — реальная
  примерка (`/tryon`) и генерация модели по описанию по-настоящему заработают
  только после деплоя (см. выше). Локально можно проверить всё остальное
  (каталог, анкету, выбор образа), но сам вызов `/api/tryon` вернёт ошибку
  загрузки фото.
- Каждый вызов примерки и генерации модели тратит платные кредиты FASHN —
  учёт расхода в таблице `credit_usage` (`apps/web/lib/fashn.ts`).
- Локальная разработка велась на Windows, где родной бандлер Next.js
  (Turbopack) периодически падал с ошибкой `Jest worker encountered N child
  process exceptions` при обработке CSS/картинок — похоже на конфликт
  нативных биндингов с путём проекта на OneDrive (кириллица/пробелы). Поэтому
  `npm run dev` использует `next dev --webpack` — на сборку и деплой (Vercel,
  Linux) это не влияет, там Turbopack работает штатно.
