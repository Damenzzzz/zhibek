"use client";

import type { ClientAnalyticsEvent } from "./analyticsEvents";

// Анонимный трекинг воронки без cookies и личных данных: случайный id
// посетителя в localStorage (как профиль — lib/profileStorage.ts). Ошибки
// трекинга никогда не ломают сайт — всё обёрнуто в try/catch.
const VISITOR_KEY = "silk:vid";
const SESSION_KEY = "silk:tracked";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getVisitorId(): string {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = randomId();
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Приватный режим/запрет storage — id живёт до перезагрузки страницы.
    return (window as unknown as { __silkVid?: string }).__silkVid ??= randomId();
  }
}

// Одно и то же событие (с тем же образом) шлём не чаще раза за сессию браузера,
// чтобы перелистывание образов не раздувало таблицу.
function seenThisSession(key: string): boolean {
  try {
    const seen = new Set<string>(JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? "[]"));
    if (seen.has(key)) return true;
    seen.add(key);
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(seen).slice(-200)));
    return false;
  } catch {
    return false;
  }
}

export function track(event: ClientAnalyticsEvent, data: { lookId?: string | null } = {}): void {
  try {
    if (window.location.pathname.startsWith("/admin")) return;
    if (seenThisSession(`${event}:${data.lookId ?? ""}`)) return;
    const body = JSON.stringify({ visitorId: getVisitorId(), event, lookId: data.lookId ?? null });
    // sendBeacon переживает переход на другую страницу; fetch — запасной путь.
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/track", blob)) {
      void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  } catch {
    // трекинг не критичен
  }
}
