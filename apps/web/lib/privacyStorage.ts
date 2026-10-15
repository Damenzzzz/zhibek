"use client";
import {
  PRIVACY_CHANGED_EVENT,
  PRIVACY_CHOICE_KEY,
  PRIVACY_VERSION,
  parsePrivacyChoice,
} from "./privacy";
let memoryChoice: string | null = null;
export function readPrivacyChoiceRaw() {
  try {
    return window.localStorage.getItem(PRIVACY_CHOICE_KEY) ?? memoryChoice;
  } catch {
    return memoryChoice;
  }
}
export function hasAnalyticsConsent() {
  return parsePrivacyChoice(readPrivacyChoiceRaw())?.analytics === true;
}
export function savePrivacyChoice(analytics: boolean) {
  const raw = JSON.stringify({
    version: PRIVACY_VERSION,
    analytics,
    updatedAt: new Date().toISOString(),
  });
  memoryChoice = raw;
  try {
    window.localStorage.setItem(PRIVACY_CHOICE_KEY, raw);
    if (!analytics) {
      window.localStorage.removeItem("silk:vid");
      window.sessionStorage.removeItem("silk:tracked");
    }
  } catch {
    /* Выбор сохраняется в памяти при недоступном storage. */
  }
  window.dispatchEvent(new Event(PRIVACY_CHANGED_EVENT));
}
export function subscribePrivacy(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === PRIVACY_CHOICE_KEY || event.key === null) callback();
  };
  window.addEventListener(PRIVACY_CHANGED_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PRIVACY_CHANGED_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
