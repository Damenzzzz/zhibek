export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { syncCatalogItems } = await import("./lib/syncCatalog");
    const result = syncCatalogItems();
    if (result.skipped) {
      console.log("[catalog sync] data/catalog/items.db не найден, пропускаю");
    } else {
      console.log(`[catalog sync] синхронизировано товаров: ${result.synced}`);
    }
  }
}
