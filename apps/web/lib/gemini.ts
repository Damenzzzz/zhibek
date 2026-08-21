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
// это стандартный тариф (≈ $0.067/шт), 4K — дороже. 1K (≈1024×1365 для 3:4)
// генерируется заметно БЫСТРЕЕ 2K при том же тарифе и для просмотра в вебе
// неотличим по качеству — поэтому берём его (примерка перестаёт упираться в
// таймаут serverless-функции). Поставь "2K", если нужен максимум деталей и не
// жалко скорости.
const IMAGE_SIZE = "1K";
const ASPECT_RATIO = "3:4";

// Таймаут одного вызова генерации. Nano Banana Pro в 1K обычно отвечает за
// 15–40 c; 90 c с запасом покрывает холодный старт и очередь, но не даёт
// запросу висеть 3+ минуты. При превышении вызов прерывается и (по возможности)
// делается один быстрый повтор — см. tryOnWithGemini.
const GENERATION_TIMEOUT_MS = 90_000;
// Максимум попыток генерации. Пустой ответ/сетевой сбой у image-модели бывают
// флаки — один повтор ощутимо повышает надёжность («иногда вообще не работает»).
const MAX_ATTEMPTS = 2;
// Таймаут скачивания одной входной картинки (фото модели/товара).
const IMAGE_FETCH_TIMEOUT_MS = 20_000;

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
// С таймаутом, чтобы «залипшая» загрузка исходников не съедала весь бюджет
// времени примерки.
async function fetchImagePart(url: string): Promise<ImagePart> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS) });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    throw new GeminiApiError(
      "ImageFetchFailed",
      timedOut
        ? `Изображение слишком долго грузилось: ${url}`
        : `Не удалось загрузить изображение: ${url}`
    );
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
  const hasOuterAndTop = order.includes("outerwear") && order.includes("top");
  const layering = hasOuterAndTop
    ? "\n\nСлои: верхняя одежда надевается ПОВЕРХ верха — из-под неё должен " +
      "быть виден воротник/край рубашки или блузки, как в реальном образе."
    : "";
  return (
    "ИЗОБРАЖЕНИЕ 1 — фотография реального человека (модель). Остальные " +
    "изображения — отдельные фото товаров (одежда/аксессуары) на однотонном фоне.\n\n" +
    "Соответствие товаров:\n" +
    bullets +
    "\n\nЗадача: сгенерировать ОДНУ фотореалистичную фотографию в полный рост " +
    "(с головы до обуви, вся фигура в кадре) ТОГО ЖЕ человека, что на " +
    "изображении 1 — с тем же лицом, чертами, причёской, цветом волос, тоном " +
    "кожи, телосложением, ростом и позой, на том же однотонном фоне с той же " +
    "мягкой студийной подсветкой. Надень на человека ТОЛЬКО перечисленные выше " +
    "товары вместо его текущей одежды, собрав из них цельный образ." +
    layering +
    "\n\nТочно воспроизведи каждый товар: тот же цвет, оттенок, ткань, крой, " +
    "длину, воротник, пуговицы, принт и мелкие детали, что на его фото — не " +
    "додумывай и не меняй фасон. Одежда должна сидеть на фигуре естественно, по " +
    "размеру, со складками, тенями и правильной посадкой на плечах, талии и " +
    "бёдрах. Обувь — на ногах, полностью в кадре. Руки и кисти анатомически " +
    "верные. Не добавляй вещей, которых нет на фото товаров; не меняй личность и " +
    "внешность человека; не добавляй текст, логотипы, ценники или водяные знаки. " +
    "Верни одно резкое вертикальное изображение 3:4."
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
  const contents = [{ text: buildPrompt(order) }, modelPart, ...garmentParts];

  // Один прогон генерации с жёстким таймаутом на сам HTTP-вызов (httpOptions.
  // timeout), чтобы «залипший» запрос не висел минутами.
  async function attempt(): Promise<Buffer> {
    let response;
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          imageConfig: { aspectRatio: ASPECT_RATIO, imageSize: IMAGE_SIZE },
          httpOptions: { timeout: GENERATION_TIMEOUT_MS },
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Сбой генерации Gemini";
      throw new GeminiApiError("GenerationFailed", `Gemini не смог выполнить примерку: ${message}`);
    }

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }

    // Изображения нет — либо блокировка модерацией (её повтор не исправит), либо
    // пустой/флаки-ответ (повтор помогает). Отдаём внятную ошибку.
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

  // Ретраятся только транзиентные сбои (пустой ответ / сетевой сбой-таймаут).
  // ContentBlocked и прочие детерминированные ошибки — сразу наверх.
  let lastErr: unknown;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const bytes = await attempt();
      await logUsage();
      return bytes;
    } catch (err) {
      lastErr = err;
      const retriable =
        err instanceof GeminiApiError && (err.code === "EmptyOutput" || err.code === "GenerationFailed");
      if (!retriable || i === MAX_ATTEMPTS - 1) break;
      console.warn(`[gemini] попытка ${i + 1} не удалась (${(err as GeminiApiError).code}), повторяю`);
    }
  }
  throw lastErr;
}
