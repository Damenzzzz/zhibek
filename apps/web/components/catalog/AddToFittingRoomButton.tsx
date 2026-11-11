"use client";

import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import {
  useFittingRoomIds,
  toggleFittingRoomItem,
} from "@/lib/fittingRoomStorage";

export function AddToFittingRoomButton({ itemId }: { itemId: string }) {
  const ids = useFittingRoomIds();
  const added = ids.includes(itemId);

  return (
    <button
      type="button"
      aria-pressed={added}
      onClick={() => toggleFittingRoomItem(itemId, !added)}
      className={
        (added ? "button-dark" : "button-primary") +
        " button-lg w-full sm:w-auto"
      }
    >
      {added ? (
        <BookmarkCheck className="size-[1.125rem]" strokeWidth={1.75} />
      ) : (
        <BookmarkPlus className="size-[1.125rem]" strokeWidth={1.75} />
      )}
      {added ? "В примерочной" : "В примерочную"}
    </button>
  );
}
