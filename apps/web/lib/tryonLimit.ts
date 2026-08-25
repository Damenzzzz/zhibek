import "server-only";
import { createHash } from "crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "./db";
import { tryonHistory } from "./schema";

// Суточный лимит примерок на «человека», чтобы не жгли платные генерации Gemini
// бездумно. «Человек» = профиль (userId) ИЛИ IP: считаем по обоим и берём
// максимум, поэтому ни сброс localStorage (остаётся IP), ни новая анкета при том
// же IP лимит не обнуляют. Сбрасывается каждые сутки (UTC).
export const TRYON_DAILY_LIMIT = Number(process.env.TRYON_DAILY_LIMIT) || 3;

// Начало текущих суток по UTC в ISO. createdAt хранится ISO-строкой, поэтому
// лексикографическое сравнение >= совпадает с хронологическим.
function startOfUtcDayIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

// SHA-256 IP запроса (не сам IP — приватность). Соль TRYON_IP_SALT (если задана)
// не даёт восстановить IP перебором по хэшу. null, если IP не определить —
// тогда лимит опирается только на профиль.
export function hashRequestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "").trim();
  if (!ip) return null;
  const salt = process.env.TRYON_IP_SALT ?? "";
  return createHash("sha256").update(`${salt}${ip}`).digest("hex");
}

export interface TryonUsage {
  limit: number;
  used: number;
  remaining: number;
}

async function countToday(column: typeof tryonHistory.userId | typeof tryonHistory.ipHash, value: string): Promise<number> {
  const rows = await db
    .select({ c: count() })
    .from(tryonHistory)
    .where(and(eq(column, value), gte(tryonHistory.createdAt, startOfUtcDayIso())));
  return rows[0]?.c ?? 0;
}

/**
 * Сколько успешных примерок сделано сегодня для профиля/IP и сколько осталось.
 * Считаем только записи в tryon_history (они пишутся лишь при успешной
 * генерации), поэтому наши таймауты/сбои лимит не расходуют.
 */
export async function getTryonUsage(userId: string, ipHash: string | null): Promise<TryonUsage> {
  const profileUsed = await countToday(tryonHistory.userId, userId);
  const ipUsed = ipHash ? await countToday(tryonHistory.ipHash, ipHash) : 0;
  const used = Math.max(profileUsed, ipUsed);
  return { limit: TRYON_DAILY_LIMIT, used, remaining: Math.max(0, TRYON_DAILY_LIMIT - used) };
}
