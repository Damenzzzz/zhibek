import { catalogImageUrl } from "./catalogDisplay";

export interface CatalogEntry {
  id: string;
  category: string;
  color: string | null;
  description: string | null;
  imagePath: string;
  lookId: string;
  source?: string;
  sku?: string | null;
}

export interface CatalogLook {
  id: string;
  title: string;
  cover: string;
  fallback: string;
  items: CatalogEntry[];
  sortIndex: number;
}

export function buildCatalogLooks(
  items: CatalogEntry[],
  metadata: {
    id: string;
    title: string | null;
    coverPath: string | null;
    sortIndex: number;
  }[],
): CatalogLook[] {
  const groups = new Map<string, CatalogEntry[]>();
  for (const item of items)
    groups.set(item.lookId, [...(groups.get(item.lookId) ?? []), item]);
  const meta = new Map(metadata.map((look) => [look.id, look]));
  return [...groups]
    .filter(([, entries]) => entries.length >= 2)
    .map(([id, entries]) => ({
      id,
      title: meta.get(id)?.title || `Образ ${id}`,
      cover: meta.get(id)?.coverPath
        ? catalogImageUrl(meta.get(id)!.coverPath!)
        : entries.some((item) => item.source === "pipeline")
          ? `/catalog/looks/${encodeURIComponent(id)}.jpg`
          : catalogImageUrl(entries[0].imagePath),
      fallback: catalogImageUrl(entries[0].imagePath),
      items: entries,
      sortIndex: meta.get(id)?.sortIndex ?? 0,
    }))
    .sort(
      (a, b) =>
        a.sortIndex - b.sortIndex ||
        a.id.localeCompare(b.id, "ru", { numeric: true }),
    );
}

export function matchesCatalogSearch(item: CatalogEntry, query: string) {
  const normalize = (value: string) =>
    value.toLocaleLowerCase("ru").replaceAll("ё", "е");
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const text = normalize(
    [item.description, item.color, item.sku, item.id].filter(Boolean).join(" "),
  );
  return words.every((word) => text.includes(word));
}

export function buildTryonHref(items: Pick<CatalogEntry, "id" | "category">[]) {
  const params = new URLSearchParams();
  const top = items.find((item) => item.category === "top");
  const outerwear = items.find((item) => item.category === "outerwear");
  if (top) params.set("top", top.id);
  if (outerwear) params.set(top ? "outerwear" : "top", outerwear.id);
  for (const category of ["bottom", "shoes", "bag"]) {
    const item = items.find((entry) => entry.category === category);
    if (item) params.set(category, item.id);
  }
  return `/tryon${params.size ? `?${params}` : ""}`;
}

export function safeTryonReturn(value: string | null) {
  return value && value.length <= 2000 && /^\/tryon(?:\?[^#]*)?$/.test(value)
    ? value
    : "/tryon";
}
