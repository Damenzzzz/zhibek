# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# ZHIBEK

Сайт примерки одежды. Каталог образов (фото коллекций), виртуальная примерка
через FASHN API, подбор комплектов из одного образа.

Репозиторий состоит из двух частей, которые общаются через файлы, а не API:

1. **Python-пайплайн** (`scripts/process_photos.py`) — превращает исходные
   фото одежды в `data/raw/` в обрезанные товарные фото + метаданные в
   `data/catalog/`.
2. **Next.js-приложение** (`apps/web/`) — синхронизирует `data/catalog/` в
   свою БД и статику, отдаёт каталог/профиль/примерку.

## Структура репозитория

```
zhibek/
├── data/
│   ├── raw/                  # исходники (в git не коммитятся, кроме .gitkeep)
│   └── catalog/               # результат обработки: обрезанные фото товаров + items.db
├── scripts/
│   └── process_photos.py      # Gemini API → детекция/классификация → обрезка → запись в БД
├── apps/
│   └── web/                   # Next.js 16 (TypeScript, App Router, Tailwind v4)
│       ├── app/                 # роуты, включая api/*
│       ├── components/          # UI, сгруппирован по фиче (catalog/, tryon/, cart/, home/)
│       ├── lib/
│       │   ├── db.ts             # drizzle-клиент, авто-миграция при импорте модуля
│       │   ├── schema.ts         # схема таблиц (catalogItems, users, tryonHistory, creditUsage)
│       │   ├── fashn.ts          # обёртка над FASHN API
│       │   ├── syncCatalog.ts    # копирует data/catalog → apps/web (см. ниже)
│       │   ├── matching.ts       # рекомендации "дополните образ" (правила, без ML)
│       │   ├── profileStorage.ts     # анкета пользователя — localStorage, без БД-сессий
│       │   └── fittingRoomStorage.ts # "примерочная"/корзина — тоже localStorage
│       ├── instrumentation.ts   # на старте сервера гоняет syncCatalogItems()
│       └── data/app.db          # SQLite (dev): пользователи, история примерок
└── .env.example                # GEMINI_API_KEY (для Python-пайплайна)
```

## Команды

Python-пайплайн (из корня репозитория):
```
pip install -r requirements.txt
python scripts/process_photos.py                       # обработать новые фото в data/raw/
python scripts/process_photos.py --model gemini-2.5-flash --limit 3
python scripts/process_photos.py --force                # переобработать всё заново
python scripts/process_photos.py --retouch               # убрать наложенный текст (цена/артикул) с кропов
```
Требует `GEMINI_API_KEY` в `.env` в корне репозитория.

Next.js-приложение (из `apps/web/`):
```
npm run dev            # dev-сервер (принудительно webpack, не Turbopack — см. ниже)
npm run build           # прод-сборка (Turbopack)
npm run lint
npm run db:generate      # сгенерировать миграцию из lib/schema.ts
npm run db:migrate        # применить миграции вручную (обычно не нужно — см. ниже)
npm run db:studio         # drizzle studio
npm run sync:catalog       # вручную синхронизировать data/catalog → apps/web (обычно не нужно — см. ниже)
```
Тестов в репозитории нет.

## Пайплайн данных: от фото до карточки в каталоге

`process_photos.py` поддерживает два формата входа в `data/raw/`:

- **Коллаж** (файл прямо в `data/raw/*.jpg`) — слева модель в полном образе,
  справа отдельные вырезанные фото товаров с артикулами. Gemini возвращает
  bounding box на каждый предмет, скрипт вырезает кропы. Несколько предметов
  с одного коллажа получают общий `look_id` (используется на `/tryon` для
  подбора "верх+низ" в один клик и на карточке товара — блок "Часть образа").
- **Папка ракурсов одного товара** (`data/raw/<имя>/*.jpg`) — уже
  изолированное фото товара без модели и наложенного текста, в нескольких
  ракурсах (например, с маркетплейса). Обрезка не нужна: в каталог идёт
  файл целиком, обложкой берётся **самый тяжёлый по размеру файл в папке**
  (эмпирическая эвристика — обычно самый выигрышный ракурс). Каждая такая
  папка — самостоятельный товар со своим уникальным `look_id`, "образа" не
  формирует.

Оба варианта идемпотентны (таблица `processed_photos` в `data/catalog/items.db`,
ключ — имя файла или `<имя_папки>/`); повторный запуск без `--force` не шлёт
уже обработанное в Gemini повторно.

Результат — `data/catalog/<category>/<id>.jpg` + строка в `data/catalog/items.db`
(категории: `top`, `bottom`, `outerwear`, `shoes`, `bag`, `accessory`, см.
`apps/web/lib/categories.ts`).

**`data/catalog/` — не то же самое, что БД/статика приложения.** Дальше
`apps/web/lib/syncCatalog.ts` копирует картинки в `apps/web/public/catalog/`
и делает upsert строк в таблицу `catalog_items` основной БД приложения — это
нужно, потому что на Vercel serverless-функция не может на рантайме читать
файлы за пределами `apps/web`. Синхронизация запускается **автоматически при
старте Next.js-сервера** (`apps/web/instrumentation.ts` → `register()`), так
что после `process_photos.py` обычно достаточно просто перезапустить/передеплоить
`apps/web` — `npm run sync:catalog` нужен только для разовой ручной синхронизации
без перезапуска сервера.

## БД приложения (`apps/web`)

Drizzle ORM + `@libsql/client`. Локально — файл `apps/web/data/app.db`;
в продакшене — Turso (`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`), see
`apps/web/.env.example`. Миграции из `apps/web/drizzle/` применяются
**автоматически при импорте `lib/db.ts`** (в т.ч. при обычном старте
dev-сервера/деплое) — `db:migrate` нужен редко, для ручного случая.
Схема — `apps/web/lib/schema.ts`: `catalogItems` (синкается из Python-пайплайна,
не редактируется напрямую), `users` (анкета для примерки), `tryonHistory`,
`creditUsage` (учёт трат FASHN-кредитов).

При смене SQLite-файла параллельно из нескольких процессов (например,
запущенный `npm run dev` + `npm run build` одновременно) миграция может
упасть с `SQLITE_BUSY`/`duplicate column` — остановите один из процессов
перед миграцией.

## Примерка и FASHN (`apps/web/lib/fashn.ts`)

Нет аккаунтов/сессий — "профиль" пользователя создаётся один раз через анкету
(`/profile`) и хранится в браузере (`lib/profileStorage.ts`, localStorage),
корзина ("примерочная") аналогично — `lib/fittingRoomStorage.ts`. И то, и
другое просто держит id, реальные данные всегда дотягиваются из API.

Функции-обёртки над FASHN:
- `tryOnGarment` — одна вещь на модель (`model-image` + `garment-image`).
- `tryOnFullOutfit` — верх, затем низ **последовательно** (результат первого
  шага становится входной моделью для второго).
- `generateModelFromDescription` — для пользователей без фото: строит
  англоязычный текстовый промпт из анкеты (рост/вес/телосложение/пол/возраст/
  тон кожи/поза) и вызывает `model-create`.
- `faceToModel` — определена, но нигде в UI не подключена.

Загруженные фото/сгенерированные модели идут через `lib/storage.ts`: локально
в `apps/web/public/uploads/`, на Vercel — в Vercel Blob (нужен
`BLOB_READ_WRITE_TOKEN`), т.к. serverless-функция не хранит файлы между
запросами.

## Стили

Tailwind v4, тема целиком объявлена через `@theme inline` в
`apps/web/app/globals.css` — отдельного `tailwind.config.*` нет. Шрифты:
`Unbounded` (заголовки, `font-display`) и `Onest` (текст, `font-sans`),
подключаются в `apps/web/app/layout.tsx`.

## Деплой (Vercel)

Монорепо — на Vercel обязательно выставлен **Root Directory = `apps/web`**
в настройках проекта (Settings → General). Без этого git-триггернутая
сборка падает с `Couldn't find any pages or app directory` — предыдущие
успешные деплои маскировали это, так как запускались вручную из `apps/web`
через `vercel --prod` с уже привязанным `.vercel/project.json`.

## Прочее

- `apps/web/AGENTS.md` — предупреждение о нестандартных для Next.js 16
  breaking changes (`LayoutProps<"/">`, `params`/`searchParams` как `Promise`
  и т.д.); перед правкой роутов/layout свериться с
  `apps/web/node_modules/next/dist/docs/`.
- `npm run dev` форсирует webpack (`next dev --webpack`), а `npm run build`
  по умолчанию использует Turbopack — поведение/скорость компиляции между
  ними может отличаться.
