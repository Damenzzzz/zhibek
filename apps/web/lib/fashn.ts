import "server-only";
import { db } from "./db";
import { creditUsage } from "./schema";

const BASE_URL = "https://api.fashn.ai/v1";
const POLL_INTERVAL_MS = 3000;
// 150 c: заведомо укладывается и в потолок функции (/api/profile maxDuration=300),
// и в клиентский таймаут (240 c), оставляя запас на submit + скачивание
// результата. model-create обычно отвечает за 10–40 c.
const POLL_TIMEOUT_MS = 150 * 1000;

export type TryOnCategory = "tops" | "bottoms" | "one-pieces" | "auto";
type FashnModelName = "tryon-v1.6" | "tryon-max" | "model-create" | "face-to-model";

type PredictionStatus = "starting" | "in_queue" | "processing" | "completed" | "failed" | "canceled" | "time_out";

interface FashnResponseBody {
  id?: string;
  status?: PredictionStatus;
  output?: string[] | null;
  // API-level ошибки (до принятия в обработку) отдают error строкой,
  // runtime-ошибки (во время poll'а статуса) — объектом {name, message}.
  error?: string | { name: string; message: string } | null;
  message?: string;
}

// FASHN не документирует точную стоимость tryon-v1.6/model-create/face-to-model
// (она зависит от generation_mode/resolution, которые мы не задаём — действует
// "автоматическое" ценообразование). Это грубые оценки для простого учёта
// бюджета, а не точные цифры со счёта FASHN. См. заметки по бюджету в плане проекта.
// tryon-max по офиц. прайсу FASHN стоит 1-5 кредитов в зависимости от
// resolution/generation_mode (мы их не задаём — действует дефолт fast/1k = 1).
const CREDIT_COST_ESTIMATE: Record<FashnModelName, number> = {
  "tryon-v1.6": 1,
  "tryon-max": 1,
  "model-create": 2,
  "face-to-model": 2,
};

// Известные коды ошибок FASHN (api-level из error-handling, runtime из
// прогона предсказания) -> понятное сообщение для фронта.
const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  MissingApiKey: "FASHN_API_KEY не настроен на сервере",
  UnauthorizedAccess: "Ошибка авторизации в FASHN API — проверь FASHN_API_KEY",
  BadRequest: "FASHN API отклонил запрос как некорректный",
  NotFound: "Эндпоинт FASHN API не найден",
  RateLimitExceeded: "Превышен лимит запросов к FASHN API, попробуй чуть позже",
  OutOfCredits: "Недостаточно кредитов FASHN для этой операции",
  ImageLoadError: "Не удалось загрузить фото — проверь ссылку и формат файла",
  ContentModerationError: "Фото не прошло модерацию контента FASHN",
  InputValidationError: "Некорректные параметры запроса к FASHN",
  ThirdPartyError: "Сбой на стороне провайдера FASHN, попробуй позже",
  UnavailableError: "Сервис FASHN сейчас перегружен, попробуй позже",
  PipelineError: "Внутренняя ошибка обработки на стороне FASHN",
  PoseError: "Не удалось распознать позу человека на фото",
  EmptyOutput: "FASHN не вернул результат",
  ClientTimeout: "Не дождались ответа от FASHN — превышено время ожидания",
  canceled: "Запрос к FASHN был отменён",
  time_out: "FASHN не успел обработать запрос за отведённое время",
  NetworkError: "Не удалось связаться с FASHN API",
};

export class FashnApiError extends Error {
  readonly code: string;
  readonly httpStatus?: number;

  constructor(code: string, message: string, httpStatus?: number) {
    super(message);
    this.name = "FashnApiError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function friendlyMessage(code: string, fallback: string): string {
  return FRIENDLY_ERROR_MESSAGES[code] ?? fallback;
}

function apiKey(): string {
  const key = process.env.FASHN_API_KEY;
  if (!key) {
    throw new FashnApiError("MissingApiKey", friendlyMessage("MissingApiKey", "FASHN_API_KEY не задан"));
  }
  return key;
}

async function fashnFetch(path: string, init?: RequestInit): Promise<FashnResponseBody> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new FashnApiError("NetworkError", friendlyMessage("NetworkError", "Сетевая ошибка при обращении к FASHN"));
  }

  let body: FashnResponseBody | null = null;
  try {
    body = (await response.json()) as FashnResponseBody;
  } catch {
    // тело может отсутствовать/быть не-JSON — обрабатываем ниже по статусу
  }

  if (!response.ok) {
    const code = typeof body?.error === "string" ? body.error : `HttpError${response.status}`;
    const message = body?.message ?? `FASHN API вернул ошибку ${response.status}`;
    throw new FashnApiError(code, friendlyMessage(code, message), response.status);
  }

  return body ?? {};
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logCreditUsage(endpoint: FashnModelName): Promise<void> {
  try {
    await db.insert(creditUsage).values({ endpoint, creditsSpent: CREDIT_COST_ESTIMATE[endpoint] });
  } catch (err) {
    console.error("[fashn] не удалось записать расход кредитов:", err);
  }
}

async function submitPrediction(modelName: FashnModelName, inputs: Record<string, unknown>): Promise<string> {
  const data = await fashnFetch("/run", {
    method: "POST",
    body: JSON.stringify({ model_name: modelName, inputs }),
  });
  if (!data.id) {
    throw new FashnApiError("MissingPredictionId", "FASHN не вернул id предсказания");
  }
  // Кредиты списываются в момент принятия запроса в обработку, поэтому
  // учитываем расход сразу после успешной постановки в очередь.
  await logCreditUsage(modelName);
  return data.id;
}

async function pollPrediction(id: string): Promise<string[]> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (true) {
    const data = await fashnFetch(`/status/${id}`);

    if (data.status === "completed") {
      if (!data.output || data.output.length === 0) {
        throw new FashnApiError("EmptyOutput", friendlyMessage("EmptyOutput", "FASHN не вернул результат"));
      }
      return data.output;
    }

    if (data.status === "failed" || data.status === "canceled" || data.status === "time_out") {
      const runtimeError = typeof data.error === "object" && data.error !== null ? data.error : null;
      const code = runtimeError?.name ?? data.status;
      const message = runtimeError?.message ?? "Запрос к FASHN завершился неудачей";
      throw new FashnApiError(code, friendlyMessage(code, message));
    }

    if (Date.now() > deadline) {
      throw new FashnApiError("ClientTimeout", friendlyMessage("ClientTimeout", "Превышено время ожидания ответа от FASHN"));
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

async function runToCompletion(modelName: FashnModelName, inputs: Record<string, unknown>): Promise<string> {
  const id = await submitPrediction(modelName, inputs);
  const output = await pollPrediction(id);
  return output[0];
}

/** POST /v1/run (tryon-v1.6) + поллинг статуса. Возвращает URL результата примерки. */
export async function tryOnGarment(
  modelImageUrl: string,
  garmentImageUrl: string,
  category: TryOnCategory = "auto"
): Promise<string> {
  return runToCompletion("tryon-v1.6", {
    model_image: modelImageUrl,
    garment_image: garmentImageUrl,
    category,
  });
}

/**
 * Примеряет верх, затем низ, используя результат первого шага как модель для
 * второго — итоговое фото содержит оба предмета.
 */
export async function tryOnFullOutfit(
  modelImageUrl: string,
  topImageUrl: string,
  bottomImageUrl: string
): Promise<string> {
  const withTop = await tryOnGarment(modelImageUrl, topImageUrl, "tops");
  const withTopAndBottom = await tryOnGarment(withTop, bottomImageUrl, "bottoms");
  return withTopAndBottom;
}

/**
 * Накладывает на фото не одежду, а аксессуар — обувь, сумку, украшение и
 * т.п. tryon-v1.6 такие категории не поддерживает (только tops/bottoms/
 * one-pieces/auto), поэтому используется отдельная модель FASHN — tryon-max
 * (официально рекомендованная FASHN именно для shoes/bags/jewelry/hats).
 * Категорию передавать не нужно — tryon-max определяет тип вещи сама.
 * Дороже и медленнее tryon-v1.6, поэтому применяется только когда выбрана
 * обувь/сумка, поверх уже готового результата примерки одежды.
 */
export async function tryOnAccessory(modelImageUrl: string, productImageUrl: string): Promise<string> {
  return runToCompletion("tryon-max", {
    model_image: modelImageUrl,
    product_image: productImageUrl,
  });
}

// Доп. характеристики модели (см. Этап 5 плана редизайна) — необязательны,
// каждая просто дописывается в промпт при наличии значения.
export interface ModelDescriptionExtras {
  ageRange?: string | null;
  skinTone?: string | null;
  pose?: string | null;
}

const POSE_PROMPT_HINTS: Record<string, string> = {
  front: "Standing pose, front-facing",
  "three-quarter": "Standing in a three-quarter turn pose",
  motion: "Natural walking pose, mid-stride",
};

/** Генерирует модель по текстовому описанию (для пользователей без фото). */
export async function generateModelFromDescription(
  heightCm: number,
  weightKg: number,
  bodyType: string,
  gender: string,
  extras: ModelDescriptionExtras = {}
): Promise<string> {
  const { ageRange, skinTone, pose } = extras;

  const agePart = ageRange ? `, ${ageRange} years old` : "";
  const skinPart = skinTone ? `, ${skinTone} skin tone` : "";
  const posePart = (pose && POSE_PROMPT_HINTS[pose]) || POSE_PROMPT_HINTS.front;

  const prompt =
    `Full body fashion photo of a ${gender} model${agePart}, approximately ${heightCm} cm tall ` +
    `and ${weightKg} kg, ${bodyType} body type${skinPart}. ${posePart}, neutral ` +
    `light gray studio background, soft even lighting, suitable for virtual clothing try-on.`;

  return runToCompletion("model-create", {
    prompt,
    aspect_ratio: "3:4",
  });
}

/** Превращает фото лица в аватар для примерки (face-to-model). */
export async function faceToModel(faceImageUrl: string): Promise<string> {
  return runToCompletion("face-to-model", {
    face_image: faceImageUrl,
  });
}
