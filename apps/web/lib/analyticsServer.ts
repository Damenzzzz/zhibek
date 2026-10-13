import "server-only";
import { db } from "./db";
import { analyticsEvents } from "./schema";
import { VISITOR_ID_PATTERN, type AnalyticsEvent } from "./analyticsEvents";

export function normalizeVisitorId(value: unknown): string | null {
  return typeof value === "string" && VISITOR_ID_PATTERN.test(value) ? value : null;
}

// Пишет событие воронки. Никогда не бросает: сбой статистики не должен ломать
// анкету или примерку.
export async function recordEvent(
  visitorId: string | null | undefined,
  event: AnalyticsEvent,
  extra: { lookId?: string | null; meta?: Record<string, unknown> } = {}
): Promise<void> {
  if (!visitorId) return;
  try {
    await db.insert(analyticsEvents).values({
      visitorId,
      event,
      lookId: extra.lookId ?? null,
      meta: extra.meta ? JSON.stringify(extra.meta) : null,
    });
  } catch (err) {
    console.error("[analytics] не удалось записать событие:", err);
  }
}
