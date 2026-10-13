import "server-only";
import { db } from "./db";
import { aiUsage } from "./schema";

// Тарифы Gemini API (paid tier, standard, USD за 1M токенов) —
// https://ai.google.dev/gemini-api/docs/pricing, сверено 2026-10-13.
// Если Google поменяет цены — правьте здесь, стоимость новых запросов
// пересчитается автоматически (старые строки хранят цену на момент вызова).
//
// Nano Banana Pro: картинка 1K/2K = 1120 выходных токенов ≈ $0.134,
// 4K = 2000 токенов ≈ $0.24. Входная картинка ≈ 560 токенов ≈ $0.0011.
// Nano Banana (2.5 Flash Image): картинка = 1290 токенов ≈ $0.039.
interface ModelPrice {
  input: number;
  textOutput: number; // текст + «размышления» (thinking)
  imageOutput: number;
  fallbackImageTokens: number; // если usageMetadata не пришла
}

const PRICES: Record<string, ModelPrice> = {
  "gemini-3-pro-image-preview": { input: 2, textOutput: 12, imageOutput: 120, fallbackImageTokens: 1120 },
  "gemini-3-pro-image": { input: 2, textOutput: 12, imageOutput: 120, fallbackImageTokens: 1120 },
  "gemini-2.5-flash-image": { input: 0.3, textOutput: 2.5, imageOutput: 30, fallbackImageTokens: 1290 },
};

// Минимальная форма usageMetadata из @google/genai (поля опциональны).
export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  candidatesTokensDetails?: { modality?: string; tokenCount?: number }[];
}

export function estimateGeminiCost(
  model: string,
  usage: GeminiUsageMetadata | undefined,
  gotImage: boolean
): { inputTokens: number; outputTokens: number; costUsd: number } {
  const price = PRICES[model] ?? PRICES["gemini-3-pro-image-preview"];
  const inputTokens = usage?.promptTokenCount ?? 0;
  const candidates = usage?.candidatesTokenCount ?? 0;
  const thoughts = usage?.thoughtsTokenCount ?? 0;
  let imageTokens =
    usage?.candidatesTokensDetails
      ?.filter((d) => d.modality?.toUpperCase() === "IMAGE")
      .reduce((sum, d) => sum + (d.tokenCount ?? 0), 0) ?? 0;
  // Нет разбивки по модальностям, но картинка есть — считаем всё выходное
  // картинкой (или берём справочное число токенов, если метаданных нет вовсе).
  if (gotImage && imageTokens === 0) imageTokens = candidates || price.fallbackImageTokens;
  const textTokens = Math.max(0, candidates - imageTokens) + thoughts;
  const costUsd =
    (inputTokens * price.input + textTokens * price.textOutput + imageTokens * price.imageOutput) / 1_000_000;
  return { inputTokens, outputTokens: imageTokens + textTokens, costUsd };
}

export interface AiUsageRecord {
  model: string;
  purpose: string;
  status: "success" | "empty" | "blocked" | "error";
  errorCode?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  latencyMs?: number;
}

// Никогда не бросает — учёт расхода не должен ломать примерку.
export async function logAiUsage(record: AiUsageRecord): Promise<void> {
  try {
    await db.insert(aiUsage).values({
      provider: "gemini",
      model: record.model,
      purpose: record.purpose,
      status: record.status,
      errorCode: record.errorCode ?? null,
      inputTokens: record.inputTokens ?? 0,
      outputTokens: record.outputTokens ?? 0,
      costUsd: record.costUsd ?? 0,
      latencyMs: record.latencyMs ?? null,
    });
  } catch (err) {
    console.error("[ai-usage] не удалось записать расход:", err);
  }
}
