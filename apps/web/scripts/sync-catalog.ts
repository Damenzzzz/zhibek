// Отдельный import-скрипт: синхронизирует data/catalog/items.db в apps/web/data/app.db
// без запуска Next.js сервера. Запуск: npm run sync:catalog
import { syncCatalogItems } from "../lib/syncCatalog";

const result = await syncCatalogItems();
if (result.skipped) {
  console.log("data/catalog/items.db не найден, пропускаю");
} else {
  console.log(
    `Синхронизировано товаров: ${result.synced}` +
      (result.removed ? `, удалено из БД: ${result.removed}` : "") +
      (result.pruned ? `, вычищено картинок: ${result.pruned}` : "")
  );
}
