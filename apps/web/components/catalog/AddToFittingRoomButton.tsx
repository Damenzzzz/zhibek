"use client";

import { Check, Plus } from "lucide-react";
import { useFittingRoomIds, toggleFittingRoomItem } from "@/lib/fittingRoomStorage";

export function AddToFittingRoomButton({ itemId }: { itemId: string }) {
  const ids = useFittingRoomIds();
  const added = ids.includes(itemId);

  return (
    <button
      type="button"
      onClick={() => toggleFittingRoomItem(itemId, !added)}
      className={
        "group relative flex w-full items-center justify-center gap-2.5 px-8 py-4 font-grotesk text-[13px] font-medium uppercase tracking-[0.16em] transition-colors sm:w-auto " +
        (added
          ? "border border-hair-ink text-ink hover:border-ink"
          : "bg-clay text-canvas")
      }
    >
      {!added && (
        <span className="pointer-events-none absolute inset-0 translate-x-1.5 translate-y-1.5 border border-clay transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0" />
      )}
      {added ? <Check className="h-4 w-4" strokeWidth={2} /> : <Plus className="h-4 w-4" strokeWidth={2} />}
      {added ? "В примерочной" : "В примерочную"}
    </button>
  );
}
