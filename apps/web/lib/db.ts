import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

// Локально — файл apps/web/data/app.db (libSQL умеет читать/писать обычные
// SQLite-файлы). В проде (Vercel) — TURSO_DATABASE_URL/TURSO_AUTH_TOKEN
// указывают на облачную Turso-базу, т.к. serverless-функции не хранят файлы
// между запросами.
const isRemote = Boolean(process.env.TURSO_DATABASE_URL);

if (!isRemote) {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const clientOptions = {
  url: process.env.TURSO_DATABASE_URL ?? `file:${path.join(process.cwd(), "data", "app.db")}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
};
let client = createClient(clientOptions);

export let db = drizzle(client, { schema });

// Сборка Next.js запускает несколько workers, каждый импортирует этот модуль.
// Если другой worker уже применил ту же миграцию, перечитываем журнал перед
// повтором. SQL-ошибки, не связанные с конкуренцией, сразу уходят наверх.
for (let attempt = 0; ; attempt++) {
  try {
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    break;
  } catch (error) {
    const concurrent = error instanceof Error && /SQLITE_BUSY|already exists|duplicate column/i.test(error.message);
    if (!concurrent || attempt >= 6) throw error;
    // Новый клиент освобождает незавершённые statements после SQLITE_BUSY.
    client.close();
    await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1) + Math.random() * 100));
    client = createClient(clientOptions);
    db = drizzle(client, { schema });
  }
}
