"use client";

import { useSyncExternalStore } from "react";

export const FITTING_ROOM_KEY = "zhibek:fitting-room";
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedIds: string[] = [];

function getSnapshot(): string[] {
  const raw = window.localStorage.getItem(FITTING_ROOM_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedIds = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      cachedIds = [];
    }
  }
  return cachedIds;
}

// Должна быть стабильной ссылкой — новый литерал [] на каждый вызов ломает
// useSyncExternalStore (React считает стор постоянно "изменившимся" и уходит
// в бесконечный цикл рендера).
const EMPTY_IDS: string[] = [];
function getServerSnapshot(): string[] {
  return EMPTY_IDS;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function writeIds(ids: string[]) {
  window.localStorage.setItem(FITTING_ROOM_KEY, JSON.stringify(ids));
  listeners.forEach((notify) => notify());
}

export function useFittingRoomIds(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function toggleFittingRoomItem(itemId: string, shouldAdd: boolean): void {
  const current = getSnapshot();
  writeIds(shouldAdd ? [...current, itemId] : current.filter((id) => id !== itemId));
}

export function removeFittingRoomItem(itemId: string): void {
  writeIds(getSnapshot().filter((id) => id !== itemId));
}
