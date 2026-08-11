"use client";

import { useSyncExternalStore } from "react";

// Локальный "профиль" без авторизации — MVP хранит текущего пользователя
// в localStorage браузера (см. app/profile/page.tsx и app/tryon/page.tsx).
export const PROFILE_STORAGE_KEY = "zhibek:profile";

export interface StoredProfile {
  id: string;
  heightCm: number;
  weightKg: number;
  bodyType: string;
  gender: string;
  photoPath: string | null;
  ageRange: string | null;
  skinTone: string | null;
  clothingSize: string | null;
  pose: string | null;
}

export function readStoredProfile(): StoredProfile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredProfile) : null;
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getServerSnapshot() {
  return null;
}

// useSyncExternalStore requires getSnapshot to return a referentially stable
// value when the underlying data hasn't changed — readStoredProfile() parses
// JSON fresh every call, so we cache by the raw string to avoid re-render loops.
let cachedRaw: string | null = null;
let cachedProfile: StoredProfile | null = null;

function getSnapshot(): StoredProfile | null {
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedProfile = raw ? (JSON.parse(raw) as StoredProfile) : null;
    } catch {
      cachedProfile = null;
    }
  }
  return cachedProfile;
}

export function useStoredProfile(): StoredProfile | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
