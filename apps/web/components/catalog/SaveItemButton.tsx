"use client";
import { Bookmark, BookmarkCheck } from "lucide-react";
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
      title={saved ? "В примерочной" : "Сохранить"}
      onClick={() => toggleFittingRoomItem(itemId, !saved)}
      className={cn(
        "absolute right-2.5 top-2.5 flex size-11 items-center justify-center rounded-full bg-surface/90 text-ink shadow-soft backdrop-blur transition-[background-color,color,transform] duration-200 hover:text-clay active:scale-90",
        saved && "bg-clay text-canvas hover:bg-clay-deep hover:text-canvas",
      )}
    >
      {saved ? (
        <BookmarkCheck className="size-[1.125rem]" strokeWidth={1.75} />
      ) : (
        <Bookmark className="size-[1.125rem]" strokeWidth={1.6} />
      )}
    </button>
  );
}
