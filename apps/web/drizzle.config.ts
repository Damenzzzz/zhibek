import { defineConfig } from "drizzle-kit";

// Локально (без TURSO_DATABASE_URL в окружении) drizzle-kit работает прямо
// с файлом apps/web/data/app.db. Если переменная задана — команды db:generate
// /db:migrate/db:studio идут в облачную Turso-базу.
export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? "file:./data/app.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
