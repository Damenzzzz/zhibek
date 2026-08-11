"use client";

import { useFittingRoomIds, toggleFittingRoomItem } from "@/lib/fittingRoomStorage";

export function AddToFittingRoomButton({ itemId }: { itemId: string }) {
  const ids = useFittingRoomIds();
  const added = ids.includes(itemId);

  return (
    <button
      type="button"
      onClick={() => toggleFittingRoomItem(itemId, !added)}
      className={
        "flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors sm:w-auto " +
        (added
          ? "border border-ink/20 bg-transparent text-ink hover:border-ink/40"
          : "bg-ink text-white hover:opacity-90")
      }
    >
      {added ? "Добавлено в примерочную ✓" : "Добавить в примерочную"}
    </button>
  );
}
