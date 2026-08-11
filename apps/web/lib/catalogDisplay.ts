// item.imagePath хранится как относительный путь от корня репозитория,
// например "data/catalog/top/143595156.jpg". На Vercel корень деплоя —
// apps/web, а не весь монорепозиторий, поэтому исходная data/catalog вне
// него недоступна во время выполнения — lib/syncCatalog.ts копирует файлы
// в apps/web/public/catalog при синхронизации, и отдаём их оттуда как
// обычную статику.
export function catalogImageUrl(imagePath: string): string {
  const marker = "data/catalog/";
  const idx = imagePath.indexOf(marker);
  const relative = idx >= 0 ? imagePath.slice(idx + marker.length) : imagePath;
  const segments = relative.split(/[\\/]/).filter(Boolean).map(encodeURIComponent);
  return `/catalog/${segments.join("/")}`;
}

// Цвета в БД — свободный текст на русском от Gemini (см. process_photos.py),
// поэтому это приблизительное сопоставление для цветного индикатора на карточке,
// а не точная палитра.
const COLOR_SWATCHES: Record<string, string> = {
  черный: "#1a1a1a",
  чёрный: "#1a1a1a",
  белый: "#f5f5f0",
  серый: "#9b9b93",
  бежевый: "#d9c5a3",
  коричневый: "#6b4a30",
  розовый: "#e3a6b0",
  красный: "#b5322f",
  бордовый: "#6d2130",
  оранжевый: "#d9782f",
  желтый: "#e0c341",
  жёлтый: "#e0c341",
  зеленый: "#5c7a52",
  зелёный: "#5c7a52",
  синий: "#31527a",
  голубой: "#8bb3c9",
  фиолетовый: "#7a5a8c",
  сиреневый: "#b7a0cf",
  золотой: "#c9a24b",
  серебряный: "#c3c3bd",
};

export function colorSwatch(colorName: string | null): string | null {
  if (!colorName) return null;
  const key = colorName.trim().toLowerCase();
  return COLOR_SWATCHES[key] ?? null;
}
