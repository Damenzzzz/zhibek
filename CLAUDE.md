# ZHIBEK

Сайт примерки одежды. Каталог образов (фото коллекций), виртуальная примерка
через FASHN API, подбор комплектов из одного образа.

## Структура репозитория

```
zhibek/
├── data/
│   ├── raw/                 # исходные коллажи-образы
│   └── catalog/              # результат обработки: обрезанные фото товаров + items.db
├── scripts/
│   └── process_photos.py     # Python: Gemini API → детекция → обрезка → запись в БД
├── apps/
│   └── web/                  # Next.js (TypeScript, App Router, Tailwind)
│       ├── app/
│       ├── lib/db.ts          # drizzle + better-sqlite3 клиент
│       ├── lib/schema.ts      # схема таблиц (users, tryon_history, credit_usage, ...)
│       ├── lib/fashn.ts       # обёртка над FASHN API
│       └── data/app.db        # SQLite: пользователи, история примерок
└── .env.example               # GEMINI_API_KEY, FASHN_API_KEY
```

## Кто что делает

- **Gemini API** — находит объекты на коллаже, отдаёт bounding box + категорию + цвет + SKU.
- **scripts/process_photos.py** — вырезает изображения по координатам, пишет метаданные в `data/catalog/items.db`.
- **FASHN API** — примерка, генерация модели по описанию, face-to-model.
- **apps/web** — каталог, профиль пользователя, примерка, подбор комплектов.

## Работа с БД (apps/web)

SQLite через `drizzle-orm` + `better-sqlite3`, файл `apps/web/data/app.db`.

```
npm run db:generate   # сгенерировать миграцию из lib/schema.ts
npm run db:migrate     # применить миграции
npm run db:studio      # drizzle studio
```

## Переменные окружения

Скопируй `.env.example` в `.env` (для Python) и `apps/web/.env.local` (для Next.js), заполни `GEMINI_API_KEY` и `FASHN_API_KEY`.
