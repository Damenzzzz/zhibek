"use client";

import { useEffect, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";
import { readPrivacyChoiceRaw, subscribePrivacy } from "@/lib/privacyStorage";

// Первый шаг воронки — «зашёл на сайт». Отправляется раз за сессию браузера
// (дедуп внутри track), на /admin не срабатывает.
export function AnalyticsTracker() {
  const choice = useSyncExternalStore(
    subscribePrivacy,
    readPrivacyChoiceRaw,
    () => null,
  );
  useEffect(() => {
    track("visit");
  }, [choice]);
  return null;
}
