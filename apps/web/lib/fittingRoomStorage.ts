"use client";
import { useSyncExternalStore } from "react";
import { parseSavedIds } from "./savedItems";
export const FITTING_ROOM_KEY = "silk:fitting-room";
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedIds: string[] = [];
let memoryOnly = false;
const EMPTY_IDS: string[] = [];
function getSnapshot() {
  if (memoryOnly) return cachedIds;
  try {
    const raw = window.localStorage.getItem(FITTING_ROOM_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedIds = parseSavedIds(raw);
    }
  } catch {
    /* В закрытом хранилище подборка живёт до обновления страницы. */
  }
  return cachedIds;
}
function subscribe(callback: () => void) {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === FITTING_ROOM_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}
function writeIds(ids: string[]) {
  const raw = JSON.stringify([...new Set(ids)].slice(0, 100));
  cachedRaw = raw;
  cachedIds = parseSavedIds(raw);
  try {
    window.localStorage.setItem(FITTING_ROOM_KEY, raw);
  } catch {
    memoryOnly = true;
    /* Оставляем рабочую подборку в памяти. */
  }
  listeners.forEach((notify) => notify());
}
export function useFittingRoomIds() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_IDS);
}
export function toggleFittingRoomItem(itemId: string, shouldAdd: boolean) {
  const current = getSnapshot();
  writeIds(
    shouldAdd ? [...current, itemId] : current.filter((id) => id !== itemId),
  );
}
export function removeFittingRoomItem(itemId: string) {
  writeIds(getSnapshot().filter((id) => id !== itemId));
}
