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
