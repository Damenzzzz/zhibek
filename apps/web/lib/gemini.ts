import "server-only";
import { GoogleGenAI } from "@google/genai";
import { db } from "./db";
import { creditUsage } from "./schema";

// Виртуальная примерка на Gemini 3 Pro Image ("Nano Banana Pro" / "nano banana 2").
// В отличие от FASHN (последовательная цепочка из 3-4 вызовов на образ) здесь
// вся одежда и аксессуары накладываются за ОДИН вызов генерации — это и дешевле
// (одна генерация ≈ $0.067), и качественнее (модель видит весь образ целиком и
// не «затирает» предыдущие вещи следующим шагом).
//
// Генерация модели по анкете (для пользователей без фото) осталась на FASHN —
// см. lib/fashn.ts generateModelFromDescription.

const MODEL = "gemini-3-pro-image-preview";

// Nano Banana Pro тарифицирует картинку по числу выходных токенов: 1K и 2K —
// это стандартный тариф (≈ $0.067/шт), 4K — дороже. Берём 2K как наилучшее
// качество в рамках стандартного тарифа. Чтобы ещё сократить расход — поставь
// "1K" (обычно тот же тариф, но меньше деталей).
const IMAGE_SIZE = "2K";
const ASPECT_RATIO = "3:4";

export class GeminiApiError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "GeminiApiError";
    this.code = code;
  }
}

function apiKey(): string {
  // GEMINI_API_KEY_MONEY — ключ с балансом для платной image-генерации,
  // GEMINI_API_KEY — резерв (тот же, что использует Python-пайплайн каталога).
  const key = process.env.GEMINI_API_KEY_MONEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiApiError(
      "MissingApiKey",
      "GEMINI_API_KEY_MONEY не настроен на сервере — примерка недоступна"
    );
  }
  return key;
}

interface ImagePart {
  inlineData: { mimeType: string; data: string };
}

// Скачивает картинку (URL модели или товара) в inlineData-часть для Gemini.
async function fetchImagePart(url: string): Promise<ImagePart> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new GeminiApiError("ImageFetchFailed", `Не удалось загрузить изображение: ${url}`);
  }
  if (!response.ok) {
    throw new GeminiApiError("ImageFetchFailed", `Изображение недоступно (${response.status}): ${url}`);
  }
  const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { inlineData: { mimeType, data: buffer.toString("base64") } };
}

export interface TryOnGarments {
  outerwear?: string;
  top?: string;
  bottom?: string;
  shoes?: string;
  bag?: string;
}

const GARMENT_PHRASES: Record<keyof TryOnGarments, string> = {
  outerwear: "верхнюю одежду (жакет/жилет/пальто) с фото",
  top: "верх (рубашку/блузку/топ) с фото",
  bottom: "низ (брюки/юбку/шорты) с фото",
  shoes: "обувь с фото",
  bag: "сумку с фото (модель держит её в руке)",
};

function buildPrompt(order: (keyof TryOnGarments)[]): string {
  const bullets = order.map((key, i) => `- изображение ${i + 2}: ${GARMENT_PHRASES[key]}`).join("\n");
  return (
    "ИЗОБРАЖЕНИЕ 1 — фотография реального человека (модель). Остальные " +
    "изображения — отдельные фото товаров (одежда/аксессуары) на однотонном фоне.\n\n" +
    "Соответствие товаров:\n" +
    bullets +
    "\n\nЗадача: сгенерировать ОДНУ фотореалистичную фотографию в полный рост " +
    "ТОГО ЖЕ человека, что на изображении 1 — с тем же лицом, причёской, цветом " +
    "волос, тоном кожи, телосложением, ростом и позой, на том же однотонном фоне " +
    "с той же мягкой студийной подсветкой. Надень на человека перечисленные выше " +
    "товары вместо его текущей одежды, собрав из них цельный образ.\n\n" +
    "Точно воспроизведи каждый товар: тот же цвет, ткань, крой, воротник, " +
    "пуговицы и детали, что на его фото. Одежда должна сидеть на фигуре " +
    "естественно, со складками и тенями. Не меняй личность и внешность человека. " +
    "Не добавляй текст, логотипы или водяные знаки. Верни одно вертикальное " +
    "изображение 3:4."
  );
}

async function logUsage(): Promise<void> {
  try {
    await db.insert(creditUsage).values({ endpoint: "gemini-tryon", creditsSpent: 1 });
  } catch (err) {
    console.error("[gemini] не удалось записать расход:", err);
  }
}

/**
 * Примеряет выбранные товары (верх/низ/обувь/сумку/верхнюю одежду) на фото
 * модели за один вызов Gemini. Возвращает PNG-результат в виде Buffer —
 * вызывающий код сохраняет его через lib/storage.ts и отдаёт URL.
 */
export async function tryOnWithGemini(
  modelImageUrl: string,
  garments: TryOnGarments
): Promise<Buffer> {
  const order = (Object.keys(GARMENT_PHRASES) as (keyof TryOnGarments)[]).filter(
    (key) => garments[key]
  );
  if (order.length === 0) {
    throw new GeminiApiError("NoGarments", "Не выбрано ни одного товара для примерки");
  }

  const [modelPart, ...garmentParts] = await Promise.all([
    fetchImagePart(modelImageUrl),
    ...order.map((key) => fetchImagePart(garments[key] as string)),
  ]);

  const ai = new GoogleGenAI({ apiKey: apiKey() });

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ text: buildPrompt(order) }, modelPart, ...garmentParts],
      config: {
        imageConfig: { aspectRatio: ASPECT_RATIO, imageSize: IMAGE_SIZE },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Сбой генерации Gemini";
    throw new GeminiApiError("GenerationFailed", `Gemini не смог выполнить примерку: ${message}`);
  }

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      await logUsage();
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  // Изображения нет — обычно это блокировка модерацией (лицо/контент) или
  // пустой ответ. Отдаём внятную ошибку вместо «пустого результата».
  const blockReason = response.promptFeedback?.blockReason;
  const textNote = parts.find((p) => p.text)?.text;
  throw new GeminiApiError(
    blockReason ? "ContentBlocked" : "EmptyOutput",
    blockReason
      ? "Фото не прошло модерацию Gemini — попробуй другое фото модели"
      : textNote
        ? `Gemini не вернул изображение: ${textNote.slice(0, 200)}`
        : "Gemini не вернул изображение — попробуй ещё раз"
  );
}
