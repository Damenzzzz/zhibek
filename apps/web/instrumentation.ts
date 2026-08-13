export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Любое исключение отсюда Next.js превращает в "An error occurred while
  // loading instrumentation hook" и роняет рендер серверных страниц целиком
  // (статика при этом продолжает отдаваться — из-за чего падение выглядит
  // как "не открывается только каталог"). Синхронизация каталога — не та
  // операция, ради которой стоит терять сайт: логируем и работаем дальше на
  // том, что уже лежит в БД.
  try {
    const { syncCatalogItems } = await import("./lib/syncCatalog");
    const result = await syncCatalogItems();
    if (result.skipped) {
      console.log("[catalog sync] data/catalog/items.db не найден, пропускаю");
    } else {
      console.log(
        `[catalog sync] синхронизировано товаров: ${result.synced}` +
          (result.removed ? `, удалено из БД: ${result.removed}` : "") +
          (result.pruned ? `, вычищено картинок: ${result.pruned}` : "")
      );
    }
  } catch (err) {
    console.error("[catalog sync] не удалось синхронизировать каталог:", err);
  }
}
