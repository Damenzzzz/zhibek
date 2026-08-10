// Совпадает с Category в scripts/process_photos.py.
export const CATEGORIES = [
  "top",
  "bottom",
  "outerwear",
  "shoes",
  "bag",
  "accessory",
] as const;

export type CatalogCategory = (typeof CATEGORIES)[number];

export function isCatalogCategory(value: string): value is CatalogCategory {
  return (CATEGORIES as readonly string[]).includes(value);
}

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  top: "Верх",
  bottom: "Низ",
  outerwear: "Верхняя одежда",
  shoes: "Обувь",
  bag: "Сумки",
  accessory: "Аксессуары",
};
