// Отдельный import-скрипт: синхронизирует data/catalog/items.db в apps/web/data/app.db
// без запуска Next.js сервера. Запуск: npm run sync:catalog
import { syncCatalogItems } from "../lib/syncCatalog";

const result = syncCatalogItems();
if (result.skipped) {
  console.log("data/catalog/items.db не найден, пропускаю");
} else {
  console.log(`Синхронизировано товаров: ${result.synced}`);
}
