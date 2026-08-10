"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "zhibek:fitting-room";
const listeners = new Set<() => void>();

function readFittingRoom(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setAdded(itemId: string, shouldAdd: boolean) {
  const current = readFittingRoom();
  const next = shouldAdd ? [...current, itemId] : current.filter((id) => id !== itemId);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((notify) => notify());
}

function getServerSnapshot() {
  return false;
}

export function AddToFittingRoomButton({ itemId }: { itemId: string }) {
  const added = useSyncExternalStore(
    subscribe,
    () => readFittingRoom().includes(itemId),
    getServerSnapshot
  );

  return (
    <button
      type="button"
      onClick={() => setAdded(itemId, !added)}
      className={
        "w-full border px-6 py-3 text-sm font-medium uppercase tracking-[0.1em] transition-colors sm:w-auto " +
        (added
          ? "border-ink/25 bg-transparent text-ink hover:border-ink/50"
          : "border-accent bg-accent text-bone hover:bg-accent/90")
      }
    >
      {added ? "Добавлено в примерку ✓" : "Добавить к примерке"}
    </button>
  );
}
