"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Первый шаг воронки — «зашёл на сайт». Отправляется раз за сессию браузера
// (дедуп внутри track), на /admin не срабатывает.
export function AnalyticsTracker() {
  useEffect(() => {
    track("visit");
  }, []);
  return null;
}
