// Шаги воронки для админ-статистики. Общий модуль (без "server-only"), его
// импортируют и клиентский трекер (lib/analytics.ts), и сервер.
//
// visit           — зашёл на сайт (раз за сессию браузера)          — клиент
// look_selected   — выбрал образ / вещь на /tryon                   — клиент
// profile_created — заполнил анкету с фото (своё или сгенерированное) — сервер
// tryon_done      — успешная примерка                               — сервер
//
// Последние два пишутся сервером (/api/profile, /api/tryon), поэтому их нельзя
// «накрутить» запросами к /api/track.
export const FUNNEL_STEPS = ["visit", "look_selected", "profile_created", "tryon_done"] as const;
export type AnalyticsEvent = (typeof FUNNEL_STEPS)[number];

export const CLIENT_EVENTS = ["visit", "look_selected"] as const;
export type ClientAnalyticsEvent = (typeof CLIENT_EVENTS)[number];

export const VISITOR_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
