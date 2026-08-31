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

// Основная модель примерки — Nano Banana Pro (Gemini 3 Pro Image). Она даёт
// лучшее качество образа, НО это preview-модель с жёсткими квотами: в пики
// спроса она регулярно отдаёт 503 "high demand" и надолго ложится со стороны
// Google — никаким числом ретраев это не «пробить».
const MODEL = "gemini-3-pro-image-preview";
// Запасная модель — Nano Banana (Gemini 2.5 Flash Image), общедоступная и
// заметно реже перегруженная. Если Pro отдаёт 503/перегрузку, примерка сама
// падает на неё, чтобы образ всё равно сгенерировался (пусть и чуть проще по
// качеству). ВАЖНО: imageSize (1K/2K/4K) — фича только Gemini 3 Pro; на 2.5
// flash его передавать нельзя, поэтому конфиг картинки строится по модели
// (см. buildImageConfig).
const FALLBACK_MODEL = "gemini-2.5-flash-image";
// Порядок перебора моделей: сначала качество (Pro), при его недоступности —
// доступность (Flash).
const MODEL_CHAIN = [MODEL, FALLBACK_MODEL] as const;

// Nano Banana Pro тарифицирует картинку по числу выходных токенов: 1K и 2K —
// это стандартный тариф (≈ $0.067/шт), 4K — дороже. 1K (≈1024×1365 для 3:4)
// генерируется заметно БЫСТРЕЕ 2K при том же тарифе и для просмотра в вебе
// неотличим по качеству — поэтому берём его (примерка перестаёт упираться в
// таймаут serverless-функции). Поставь "2K", если нужен максимум деталей и не
// жалко скорости. imageSize применяется только к Pro-модели.
const IMAGE_SIZE = "1K";
const ASPECT_RATIO = "3:4";

// Конфиг картинки под конкретную модель: aspectRatio поддерживают обе, а
// imageSize — только Gemini 3 Pro. На 2.5 flash-image лишний imageSize может
// привести к ошибке параметров, поэтому его отдаём только Pro.
function buildImageConfig(model: string): { aspectRatio: string; imageSize?: string } {
  return model === MODEL
    ? { aspectRatio: ASPECT_RATIO, imageSize: IMAGE_SIZE }
    : { aspectRatio: ASPECT_RATIO };
}

// Таймаут одного вызова генерации. Nano Banana Pro в 1K обычно отвечает за
// 15–40 c; 90 c с запасом покрывает холодный старт и очередь, но не даёт
// запросу висеть 3+ минуты. Прерывание жёсткое — через AbortController
// (см. tryOnWithGemini): одного httpOptions.timeout мало, @google/genai не
// всегда рвёт зависший запрос, из-за чего функция доживала до потолка
// maxDuration=300 c и её убивал Vercel → примерка отдавала 503.
const GENERATION_TIMEOUT_MS = 90_000;
// Общий бюджет на все попытки. Держим его НИЖЕ клиентского таймаута
// (CLIENT_TIMEOUT_MS = 240 c в TryonForm) и потолка функции (maxDuration=300 c),
// чтобы сервер всегда успел вернуть внятную ошибку раньше, чем сдастся браузер
// или платформа. Вторая попытка запускается только если в бюджете есть время.
const TOTAL_BUDGET_MS = 200_000;
// Максимум попыток генерации. Пустой ответ/сетевой сбой у image-модели бывают
// флаки — один повтор ощутимо повышает надёжность («иногда вообще не работает»).
// Для перегрузки модели (503 "high demand") повторов чуть больше — они дешёвые
// (запрос до модели не доходит) и часто «пробивают» временный пик спроса.
const MAX_ATTEMPTS = 4;
// Пауза перед повтором при перегрузке (503/UNAVAILABLE) или лимите (429).
// Немедленный повтор при «high demand» почти всегда снова упирается в 503 —
// нужен backoff. Растёт по попыткам: 2 c, 4 c, 8 c (+ джиттер).
const RETRY_BASE_DELAY_MS = 2_000;
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

// Достаёт HTTP-статус из ошибки @google/genai. SDK кидает ApiError со
// свойством .status (число) либо кладёт код в .code/сообщение — проверяем всё.
function errorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const e = err as { status?: unknown; code?: unknown };
  if (typeof e.status === "number") return e.status;
  if (typeof e.code === "number") return e.code;
  const raw = e.status ?? e.code;
  if (typeof raw === "string") {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
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

  // Один прогон генерации на КОНКРЕТНОЙ модели с жёстким таймаутом. abortSignal
  // реально прерывает ожидание ответа (httpOptions.timeout как best-effort
  // сверху), поэтому запрос не может «залипнуть» дольше отведённого бюджета.
  async function attempt(signal: AbortSignal, model: string): Promise<Buffer> {
    let response;
    try {
      response = await ai.models.generateContent({
        model,
        contents,
        config: {
          imageConfig: buildImageConfig(model),
          httpOptions: { timeout: GENERATION_TIMEOUT_MS },
          abortSignal: signal,
        },
      });
    } catch (err) {
      // Прерывание по нашему дедлайну приходит как AbortError — трактуем как
      // транзиентный таймаут генерации (ретраится, если в бюджете есть время).
      const aborted = signal.aborted || (err instanceof Error && err.name === "AbortError");
      if (aborted) {
        throw new GeminiApiError(
          "GenerationFailed",
          `Gemini не ответил за отведённое время (${Math.round(GENERATION_TIMEOUT_MS / 1000)} c) — попробуй ещё раз`
        );
      }
      // Перегрузка модели (503 UNAVAILABLE "model is overloaded / high demand")
      // и лимит запросов (429 RESOURCE_EXHAUSTED) — транзиентные ошибки на
      // стороне Google. Их надо ретраить с паузой (backoff), а не сразу отдавать
      // сырое сообщение пользователю. Отдельный код "ModelOverloaded", чтобы
      // цикл повторов сделал паузу и показал внятный текст.
      const status = errorStatus(err);
      const message = err instanceof Error ? err.message : "Сбой генерации Gemini";
      if (status === 503 || status === 429 || /overload|high demand|unavailable/i.test(message)) {
        throw new GeminiApiError(
          "ModelOverloaded",
          "Gemini сейчас перегружен запросами — это временно. Попробуй ещё раз через минуту."
        );
      }
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

  const totalDeadline = Date.now() + TOTAL_BUDGET_MS;

  // Прогон одной модели с ретраями. Ретраятся только транзиентные сбои: пустой
  // ответ / сетевой сбой-таймаут (флаки) и перегрузка (503/429, с backoff-паузой
  // 2/4/8 c). ContentBlocked и прочие детерминированные ошибки — сразу наверх.
  // Общий дедлайн (TOTAL_BUDGET_MS) ограничивает суммарное время ВСЕХ моделей,
  // а per-attempt AbortController — время одной попытки; берётся меньший остаток.
  async function runModel(model: string): Promise<Buffer> {
    let lastErr: unknown;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const remaining = totalDeadline - Date.now();
      // На новую попытку нет смысла тратиться, если бюджета почти не осталось.
      if (remaining <= 5_000) break;
      const perAttempt = Math.min(GENERATION_TIMEOUT_MS, remaining);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), perAttempt);
      try {
        return await attempt(controller.signal, model);
      } catch (err) {
        lastErr = err;
        const overloaded = err instanceof GeminiApiError && err.code === "ModelOverloaded";
        const retriable =
          err instanceof GeminiApiError &&
          (err.code === "EmptyOutput" || err.code === "GenerationFailed" || overloaded);
        if (!retriable || i === MAX_ATTEMPTS - 1) break;
        console.warn(`[gemini] ${model}: попытка ${i + 1} не удалась (${(err as GeminiApiError).code}), повторяю`);
        // При перегрузке/лимите немедленный повтор снова упрётся в 503 — ждём
        // backoff (2 c, 4 c, 8 c + джиттер), но только если пауза укладывается в
        // остаток бюджета (иначе смысла в ней нет — сразу отдаём ошибку).
        if (overloaded) {
          const delay = RETRY_BASE_DELAY_MS * 2 ** i + Math.floor(Math.random() * 500);
          if (totalDeadline - Date.now() - delay <= 5_000) break;
          clearTimeout(timer);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr;
  }

  // Перебор моделей: сначала Pro (качество), при её перегрузке — Flash
  // (доступность). На другую модель уходим ТОЛЬКО из-за перегрузки/недоступности
  // — детерминированные ошибки (ContentBlocked/EmptyOutput) на запасной модели
  // повторятся, их сразу отдаём наверх. Успех любой модели → логируем расход и
  // возвращаем картинку.
  let lastErr: unknown;
  for (let m = 0; m < MODEL_CHAIN.length; m++) {
    const model = MODEL_CHAIN[m];
    try {
      const bytes = await runModel(model);
      await logUsage();
      return bytes;
    } catch (err) {
      lastErr = err;
      const overloaded = err instanceof GeminiApiError && err.code === "ModelOverloaded";
      const hasNext = m < MODEL_CHAIN.length - 1;
      // Есть время и следующая модель — падаем на неё только при перегрузке.
      if (overloaded && hasNext && totalDeadline - Date.now() > 5_000) {
        console.warn(`[gemini] ${model} перегружена — падаю на запасную модель ${MODEL_CHAIN[m + 1]}`);
        continue;
      }
      break;
    }
  }
  throw lastErr;
}
