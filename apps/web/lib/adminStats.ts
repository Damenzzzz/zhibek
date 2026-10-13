import "server-only";
import { sql, inArray, type SQL } from "drizzle-orm";
import { db } from "./db";
import { appSettings } from "./schema";
import { catalogImageUrl } from "./catalogDisplay";
import { TRYON_DAILY_LIMIT } from "./tryonLimit";

// Админ-статистика (/admin → «Статистика»). Все даты в БД — ISO-строки в UTC;
// «день» считаем по местному времени (по умолчанию UTC+5, Казахстан), чтобы
// «сегодня» в админке совпадало с календарём владельца.
const TZ_OFFSET_MIN = Number(process.env.STATS_UTC_OFFSET_MINUTES ?? 300);
const TZ_MODIFIER = `${TZ_OFFSET_MIN >= 0 ? "+" : ""}${TZ_OFFSET_MIN} minutes`;

// Справочная цена примерки на Nano Banana Pro (1K) — для оценки расхода по
// старым записям credit_usage, сделанным до появления точного учёта ai_usage.
const LEGACY_TRYON_COST_USD = 0.134;

export const PERIODS = ["today", "7d", "30d", "month", "all"] as const;
export type Period = (typeof PERIODS)[number];

// Начало местного дня (daysAgo назад) в UTC ISO.
function localDayStartIso(daysAgo = 0): string {
  const shifted = new Date(Date.now() + TZ_OFFSET_MIN * 60_000);
  const startLocal = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - daysAgo);
  return new Date(startLocal - TZ_OFFSET_MIN * 60_000).toISOString();
}

function localMonthStartIso(): string {
  const shifted = new Date(Date.now() + TZ_OFFSET_MIN * 60_000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - TZ_OFFSET_MIN * 60_000).toISOString();
}

function periodStart(period: Period): string {
  switch (period) {
    case "today":
      return localDayStartIso(0);
    case "7d":
      return localDayStartIso(6);
    case "30d":
      return localDayStartIso(29);
    case "month":
      return localMonthStartIso();
    case "all":
      return "0000";
  }
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function one<T extends Record<string, unknown>>(query: SQL): Promise<T> {
  const rows = (await db.all(query)) as T[];
  return rows[0] ?? ({} as T);
}

// ───────────────────────────── настройки бюджета ─────────────────────────────
export interface AiBudgetSettings {
  // Сколько готовы тратить на Gemini в месяц (свой лимит, USD).
  monthlyBudgetUsd: number | null;
  // Остаток предоплаты на счёте Google на момент ввода (USD) + когда ввели.
  balanceUsd: number | null;
  balanceSetAt: string | null;
  // Лимит запросов в день (RPD) из AI Studio → Rate limits, если хотите видеть
  // остаток квоты.
  dailyRequestLimit: number | null;
  // Курс для показа сумм в тенге (необязательно).
  usdToKzt: number | null;
}

const SETTING_KEYS = {
  monthlyBudgetUsd: "gemini_monthly_budget_usd",
  balanceUsd: "gemini_balance_usd",
  balanceSetAt: "gemini_balance_set_at",
  dailyRequestLimit: "gemini_daily_request_limit",
  usdToKzt: "usd_to_kzt",
} as const;

export async function getBudgetSettings(): Promise<AiBudgetSettings> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(inArray(appSettings.key, Object.values(SETTING_KEYS)));
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const numOrNull = (key: string) => {
    const v = map.get(key);
    if (v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    monthlyBudgetUsd: numOrNull(SETTING_KEYS.monthlyBudgetUsd),
    balanceUsd: numOrNull(SETTING_KEYS.balanceUsd),
    balanceSetAt: map.get(SETTING_KEYS.balanceSetAt) ?? null,
    dailyRequestLimit: numOrNull(SETTING_KEYS.dailyRequestLimit),
    usdToKzt: numOrNull(SETTING_KEYS.usdToKzt),
  };
}

export async function saveBudgetSettings(input: {
  monthlyBudgetUsd?: number | null;
  balanceUsd?: number | null;
  dailyRequestLimit?: number | null;
  usdToKzt?: number | null;
}): Promise<void> {
  const current = await getBudgetSettings();
  const now = new Date().toISOString();
  const upserts: { key: string; value: string }[] = [];
  const put = (key: string, value: number | null | undefined) => {
    if (value === undefined) return;
    upserts.push({ key, value: value === null ? "" : String(value) });
  };
  put(SETTING_KEYS.monthlyBudgetUsd, input.monthlyBudgetUsd);
  put(SETTING_KEYS.dailyRequestLimit, input.dailyRequestLimit);
  put(SETTING_KEYS.usdToKzt, input.usdToKzt);
  // Остаток считается «от момента ввода»: при изменении суммы сбрасываем
  // отсчёт расхода на сейчас (пополнили счёт → вписали новый остаток).
  if (input.balanceUsd !== undefined && input.balanceUsd !== current.balanceUsd) {
    put(SETTING_KEYS.balanceUsd, input.balanceUsd);
    upserts.push({ key: SETTING_KEYS.balanceSetAt, value: input.balanceUsd === null ? "" : now });
  }
  for (const row of upserts) {
    await db
      .insert(appSettings)
      .values({ ...row, updatedAt: now })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: row.value, updatedAt: now } });
  }
}

// ───────────────────────────── продуктовые метрики ─────────────────────────────
async function productStats(since: string) {
  const users = await one<{ total: number; fresh: number; freshWithTryon: number; legacy: number }>(sql`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN u.created_at >= ${since} THEN 1 ELSE 0 END) AS fresh,
      SUM(CASE WHEN u.created_at >= ${since}
               AND EXISTS (SELECT 1 FROM tryon_history t WHERE t.user_id = u.id) THEN 1 ELSE 0 END) AS freshWithTryon,
      SUM(CASE WHEN u.created_at IS NULL THEN 1 ELSE 0 END) AS legacy
    FROM users u
  `);
  // «За всё время» включает и анкеты без даты (созданы до появления статистики).
  const allTime = since === "0000";
  const allWithTryon = allTime
    ? await one<{ c: number }>(
        sql`SELECT COUNT(DISTINCT user_id) AS c FROM tryon_history`
      )
    : null;
  const newUsers = allTime ? num(users.total) : num(users.fresh);
  const newUsersWithTryon = allTime ? num(allWithTryon?.c) : num(users.freshWithTryon);

  const tryons = await one<{ tryons: number; activeUsers: number }>(sql`
    SELECT COUNT(*) AS tryons, COUNT(DISTINCT user_id) AS activeUsers
    FROM tryon_history WHERE created_at >= ${since}
  `);

  const topLooksRaw = (await db.all(sql`
    SELECT t.look_id AS lookId, COUNT(*) AS tryons, COUNT(DISTINCT t.user_id) AS people,
           l.title AS title, l.cover_path AS coverPath
    FROM tryon_history t
    LEFT JOIN looks l ON l.id = t.look_id
    WHERE t.look_id IS NOT NULL AND t.created_at >= ${since}
    GROUP BY t.look_id
    ORDER BY tryons DESC
    LIMIT 10
  `)) as { lookId: string; tryons: number; people: number; title: string | null; coverPath: string | null }[];

  // Вещи — по всем слотам примерок (работает и для старых записей без look_id).
  const topItemsRaw = (await db.all(sql`
    SELECT x.item_id AS itemId, COUNT(*) AS tryons,
           c.description AS description, c.category AS category, c.image_path AS imagePath, c.look_id AS lookId
    FROM (
      SELECT top_item_id AS item_id, created_at FROM tryon_history
      UNION ALL SELECT bottom_item_id, created_at FROM tryon_history
      UNION ALL SELECT shoes_item_id, created_at FROM tryon_history
      UNION ALL SELECT bag_item_id, created_at FROM tryon_history
    ) x
    JOIN catalog_items c ON c.id = x.item_id
    WHERE x.item_id IS NOT NULL AND x.created_at >= ${since}
    GROUP BY x.item_id
    ORDER BY tryons DESC
    LIMIT 10
  `)) as {
    itemId: string;
    tryons: number;
    description: string | null;
    category: string;
    imagePath: string;
    lookId: string;
  }[];

  // Воронка: считаем посетителей, прошедших шаг И все предыдущие (в любом
  // порядке внутри периода), — так каждый следующий шаг не больше предыдущего.
  const funnel = await one<{ visit: number; look: number; profile: number; tryon: number }>(sql`
    SELECT
      SUM(v) AS visit,
      SUM(v * l) AS look,
      SUM(v * l * p) AS profile,
      SUM(v * l * p * t) AS tryon
    FROM (
      SELECT visitor_id,
        MAX(event = 'visit') AS v,
        MAX(event = 'look_selected') AS l,
        MAX(event = 'profile_created') AS p,
        MAX(event = 'tryon_done') AS t
      FROM analytics_events
      WHERE created_at >= ${since}
      GROUP BY visitor_id
    )
  `);
  const photoSplit = await one<{ upload: number; generated: number }>(sql`
    SELECT
      SUM(CASE WHEN meta LIKE '%"photo":"upload"%' THEN 1 ELSE 0 END) AS upload,
      SUM(CASE WHEN meta LIKE '%"photo":"generated"%' THEN 1 ELSE 0 END) AS generated
    FROM analytics_events WHERE event = 'profile_created' AND created_at >= ${since}
  `);
  const firstEvent = await one<{ first: string | null }>(sql`SELECT MIN(created_at) AS first FROM analytics_events`);

  const tryonCount = num(tryons.tryons);
  const activeUsers = num(tryons.activeUsers);

  return {
    newUsers,
    newUsersWithTryon,
    firstTryonRate: newUsers > 0 ? newUsersWithTryon / newUsers : null,
    usersWithoutDate: num(users.legacy),
    totalUsers: num(users.total),
    tryons: tryonCount,
    activeUsers,
    avgTryonsPerActiveUser: activeUsers > 0 ? tryonCount / activeUsers : null,
    avgTryonsPerNewUser: newUsers > 0 ? tryonCount / newUsers : null,
    tryonDailyLimit: TRYON_DAILY_LIMIT,
    topLooks: topLooksRaw.map((r) => ({
      lookId: r.lookId,
      title: r.title,
      tryons: num(r.tryons),
      people: num(r.people),
      cover: r.coverPath ? catalogImageUrl(r.coverPath) : `/catalog/looks/${r.lookId}.jpg`,
    })),
    topItems: topItemsRaw.map((r) => ({
      itemId: r.itemId,
      lookId: r.lookId,
      category: r.category,
      description: r.description,
      tryons: num(r.tryons),
      image: catalogImageUrl(r.imagePath),
    })),
    funnel: {
      steps: [
        { key: "visit", label: "Зашли на сайт", count: num(funnel.visit) },
        { key: "look_selected", label: "Выбрали образ", count: num(funnel.look) },
        { key: "profile_created", label: "Загрузили фото", count: num(funnel.profile) },
        { key: "tryon_done", label: "Сделали примерку", count: num(funnel.tryon) },
      ],
      photoUpload: num(photoSplit.upload),
      photoGenerated: num(photoSplit.generated),
      trackingSince: firstEvent.first,
    },
  };
}

// ───────────────────────────── расход Gemini ─────────────────────────────
async function aiSpend(since: string) {
  return one<{
    cost: number;
    calls: number;
    images: number;
    billedCalls: number;
    errors: number;
    rateLimited: number;
    overloaded: number;
    inputTokens: number;
    outputTokens: number;
  }>(sql`
    SELECT
      COALESCE(SUM(cost_usd), 0) AS cost,
      COUNT(*) AS calls,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS images,
      SUM(CASE WHEN status != 'error' THEN 1 ELSE 0 END) AS billedCalls,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors,
      SUM(CASE WHEN error_code = '429' THEN 1 ELSE 0 END) AS rateLimited,
      SUM(CASE WHEN error_code = '503' THEN 1 ELSE 0 END) AS overloaded,
      COALESCE(SUM(input_tokens), 0) AS inputTokens,
      COALESCE(SUM(output_tokens), 0) AS outputTokens
    FROM ai_usage WHERE provider = 'gemini' AND created_at >= ${since}
  `);
}

function shapeSpend(r: Awaited<ReturnType<typeof aiSpend>>) {
  const images = num(r.images);
  const cost = num(r.cost);
  return {
    costUsd: cost,
    calls: num(r.calls),
    images,
    billedCalls: num(r.billedCalls),
    errors: num(r.errors),
    rateLimited: num(r.rateLimited),
    overloaded: num(r.overloaded),
    inputTokens: num(r.inputTokens),
    outputTokens: num(r.outputTokens),
    // Полная стоимость одной успешной примерки, включая оплаченные
    // неудачные попытки (пустые ответы и т.п.).
    costPerTryonUsd: images > 0 ? cost / images : null,
  };
}

async function aiStats() {
  const [today, week, month30, monthToDate, allTime, settings] = await Promise.all([
    aiSpend(localDayStartIso(0)),
    aiSpend(localDayStartIso(6)),
    aiSpend(localDayStartIso(29)),
    aiSpend(localMonthStartIso()),
    aiSpend("0000"),
    getBudgetSettings(),
  ]);

  const byModel = (await db.all(sql`
    SELECT model, COUNT(*) AS calls, SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS images,
           COALESCE(SUM(cost_usd), 0) AS cost
    FROM ai_usage WHERE provider = 'gemini' AND created_at >= ${localDayStartIso(29)}
    GROUP BY model ORDER BY cost DESC
  `)) as { model: string; calls: number; images: number; cost: number }[];

  const daily = (await db.all(sql`
    SELECT date(created_at, ${TZ_MODIFIER}) AS day,
           COALESCE(SUM(cost_usd), 0) AS cost,
           SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS images,
           COUNT(*) AS calls
    FROM ai_usage WHERE provider = 'gemini' AND created_at >= ${localDayStartIso(29)}
    GROUP BY day ORDER BY day
  `)) as { day: string; cost: number; images: number; calls: number }[];

  // Примерки, сделанные ДО появления точного учёта (только счётчик в
  // credit_usage) — оцениваем по справочной цене, чтобы «всего потрачено» не
  // начиналось с нуля.
  const firstTracked = await one<{ first: string | null }>(sql`SELECT MIN(created_at) AS first FROM ai_usage`);
  const legacy = await one<{ c: number }>(sql`
    SELECT COUNT(*) AS c FROM credit_usage
    WHERE endpoint = 'gemini-tryon' AND created_at < ${firstTracked.first ?? "9999"}
  `);
  const fashn = await one<{ credits30: number; creditsMonth: number }>(sql`
    SELECT
      COALESCE(SUM(CASE WHEN created_at >= ${localDayStartIso(29)} THEN credits_spent END), 0) AS credits30,
      COALESCE(SUM(CASE WHEN created_at >= ${localMonthStartIso()} THEN credits_spent END), 0) AS creditsMonth
    FROM credit_usage WHERE endpoint != 'gemini-tryon'
  `);

  const balanceSpent = settings.balanceSetAt ? shapeSpend(await aiSpend(settings.balanceSetAt)).costUsd : 0;

  const week7 = shapeSpend(week);
  const mtd = shapeSpend(monthToDate);
  const avgDailyCost = week7.costUsd / 7;

  // Прогноз на месяц по фактическому темпу с начала месяца.
  const shifted = new Date(Date.now() + TZ_OFFSET_MIN * 60_000);
  const dayOfMonth = shifted.getUTCDate();
  const daysInMonth = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)).getUTCDate();
  const monthForecast = (mtd.costUsd / dayOfMonth) * daysInMonth;

  const balanceLeft = settings.balanceUsd !== null ? settings.balanceUsd - balanceSpent : null;
  const budgetLeft = settings.monthlyBudgetUsd !== null ? settings.monthlyBudgetUsd - mtd.costUsd : null;
  const costPerTryon = week7.costPerTryonUsd ?? shapeSpend(allTime).costPerTryonUsd ?? LEGACY_TRYON_COST_USD;
  // Что кончится раньше — предоплата или месячный бюджет.
  const moneyLeft =
    balanceLeft !== null && budgetLeft !== null ? Math.min(balanceLeft, budgetLeft) : (balanceLeft ?? budgetLeft);

  // Последние 30 дней с нулями для пустых дней — чтобы график был ровным.
  const dailyMap = new Map(daily.map((d) => [d.day, d]));
  const days: { day: string; costUsd: number; images: number; calls: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(new Date(localDayStartIso(i)).getTime() + TZ_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
    const d = dailyMap.get(day);
    days.push({ day, costUsd: num(d?.cost), images: num(d?.images), calls: num(d?.calls) });
  }

  const todaySpend = shapeSpend(today);

  return {
    today: todaySpend,
    week: week7,
    month30: shapeSpend(month30),
    monthToDate: mtd,
    allTime: shapeSpend(allTime),
    legacyTryons: num(legacy.c),
    legacyCostEstimateUsd: num(legacy.c) * LEGACY_TRYON_COST_USD,
    trackingSince: firstTracked.first,
    byModel: byModel.map((m) => ({ model: m.model, calls: num(m.calls), images: num(m.images), costUsd: num(m.cost) })),
    daily: days,
    settings,
    budget: {
      monthForecastUsd: monthForecast,
      avgDailyCostUsd: avgDailyCost,
      costPerTryonUsd: costPerTryon,
      budgetLeftUsd: budgetLeft,
      balanceSpentUsd: balanceSpent,
      balanceLeftUsd: balanceLeft,
      moneyLeftUsd: moneyLeft,
      tryonsLeft: moneyLeft !== null && costPerTryon > 0 ? Math.max(0, Math.floor(moneyLeft / costPerTryon)) : null,
      daysLeft: moneyLeft !== null && avgDailyCost > 0 ? Math.max(0, moneyLeft / avgDailyCost) : null,
      requestsToday: todaySpend.calls,
      requestsLeftToday:
        settings.dailyRequestLimit !== null ? Math.max(0, settings.dailyRequestLimit - todaySpend.calls) : null,
    },
    fashnCredits30d: num(fashn.credits30),
    fashnCreditsMonth: num(fashn.creditsMonth),
  };
}

export async function getAdminStats(period: Period) {
  const since = periodStart(period);
  const [product, ai] = await Promise.all([productStats(since), aiStats()]);
  return { period, since: period === "all" ? null : since, tzOffsetMinutes: TZ_OFFSET_MIN, product, ai };
}

export type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;
