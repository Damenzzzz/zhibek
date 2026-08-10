import { and, eq, ne } from "drizzle-orm";
import { db } from "./db";
import { catalogItems } from "./schema";
import type { CatalogCategory } from "./categories";

type CatalogItemRow = typeof catalogItems.$inferSelect;

// Приоритет 2: категории, которые имеет смысл предлагать в довесок к данной
// (порядок — от самого уместного к менее уместному, используется для скоринга).
const CATEGORY_COMPLEMENTS: Record<CatalogCategory, CatalogCategory[]> = {
  top: ["bottom", "shoes", "bag", "outerwear", "accessory"],
  outerwear: ["top", "bottom", "shoes", "bag", "accessory"],
  bottom: ["top", "outerwear", "shoes", "bag", "accessory"],
  shoes: ["top", "bottom", "outerwear", "bag"],
  bag: ["top", "bottom", "outerwear", "accessory"],
  accessory: ["top", "bottom", "outerwear"],
};

// Нейтральные цвета сочетаются практически со всем — базовое правило стилиста.
const NEUTRAL_COLORS = new Set(["белый", "черный", "чёрный", "серый", "бежевый", "коричневый", "золотой", "серебряный"]);

// Табличные правила сочетания не-нейтральных цветов (без ML, см. задачу).
const COLOR_PAIRS: Record<string, string[]> = {
  розовый: ["бордовый"],
  красный: ["синий"],
  бордовый: ["розовый"],
  оранжевый: ["синий"],
  желтый: ["синий"],
  жёлтый: ["синий"],
  зеленый: ["синий"],
  зелёный: ["синий"],
  синий: ["желтый", "жёлтый", "оранжевый", "красный", "зеленый", "зелёный", "голубой"],
  голубой: ["синий"],
  фиолетовый: ["сиреневый"],
  сиреневый: ["фиолетовый"],
};

function normalizeColor(color: string | null): string | null {
  return color ? color.trim().toLowerCase() : null;
}

function colorsCompatible(a: string | null, b: string | null): boolean {
  const ka = normalizeColor(a);
  const kb = normalizeColor(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (NEUTRAL_COLORS.has(ka) || NEUTRAL_COLORS.has(kb)) return true;
  return Boolean(COLOR_PAIRS[ka]?.includes(kb) || COLOR_PAIRS[kb]?.includes(ka));
}

function scoreCandidate(source: CatalogItemRow, candidate: CatalogItemRow): number {
  const complements = CATEGORY_COMPLEMENTS[source.category as CatalogCategory] ?? [];
  const rank = complements.indexOf(candidate.category as CatalogCategory);
  if (rank === -1) return 0;

  let score = complements.length - rank;
  if (colorsCompatible(source.color, candidate.color)) score += complements.length;
  return score;
}

/**
 * Рекомендации "Дополните образ" для товара:
 * 1) товары с тем же look_id (точно сочетаются — сняты в одном образе);
 * 2) при нехватке — товары из других образов, ранжированные по совместимости
 *    категории и цвета (табличные правила, без ML).
 */
export async function getMatchingItems(itemId: string, limit = 6): Promise<CatalogItemRow[]> {
  const [source] = await db.select().from(catalogItems).where(eq(catalogItems.id, itemId));
  if (!source) return [];

  const sameLook = await db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.lookId, source.lookId), ne(catalogItems.id, source.id)));

  const results = sameLook.slice(0, limit);

  if (results.length < limit) {
    const excludeIds = new Set([source.id, ...results.map((item) => item.id)]);
    const otherLooks = await db.select().from(catalogItems).where(ne(catalogItems.lookId, source.lookId));

    const ranked = otherLooks
      .filter((item) => !excludeIds.has(item.id))
      .map((item) => ({ item, score: scoreCandidate(source, item) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    for (const { item } of ranked) {
      if (results.length >= limit) break;
      results.push(item);
    }
  }

  return results;
}
