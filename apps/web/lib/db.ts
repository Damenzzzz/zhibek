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

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? `file:${path.join(process.cwd(), "data", "app.db")}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
