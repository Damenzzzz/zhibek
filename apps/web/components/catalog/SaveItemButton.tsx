"use client";
import { Bookmark, Check } from "lucide-react";
import {
  useFittingRoomIds,
  toggleFittingRoomItem,
} from "@/lib/fittingRoomStorage";
import { cn } from "@/lib/utils";
export function SaveItemButton({
  itemId,
  label,
}: {
  itemId: string;
  label: string;
}) {
  const saved = useFittingRoomIds().includes(itemId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`${saved ? "Убрать из примерочной" : "Сохранить в примерочную"}: ${label}`}
      onClick={() => toggleFittingRoomItem(itemId, !saved)}
      className={cn(
        "absolute right-3 top-3 flex size-11 items-center justify-center rounded-full border border-hair-ink bg-canvas text-ink hover:border-clay",
        saved && "border-clay bg-clay text-canvas",
      )}
    >
      {saved ? (
        <Check className="size-4" />
      ) : (
        <Bookmark className="size-4" strokeWidth={1.5} />
      )}
    </button>
  );
}
