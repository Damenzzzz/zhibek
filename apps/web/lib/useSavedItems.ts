"use client";
import { useEffect, useState } from "react";
import { useFittingRoomIds } from "./fittingRoomStorage";
import type { CatalogEntry } from "./catalogView";

export function useSavedItems(enabled = true) {
  const ids = useFittingRoomIds();
  const [revision, setRevision] = useState(0);
  const key = ids.join("|") + ":" + revision;
  const [result, setResult] = useState<{
    key: string;
    items: CatalogEntry[];
    missing: number;
    error: string | null;
  } | null>(null);
  useEffect(() => {
    if (!enabled || ids.length === 0) return;
    const controller = new AbortController();
    async function load() {
      try {
        const entries = await Promise.all(
          ids.map(async (id) => {
            const response = await fetch(
              `/api/catalog/${encodeURIComponent(id)}`,
              { signal: controller.signal },
            );
            if (response.status === 404) return null;
            if (!response.ok)
              throw new Error(
                "Не удалось загрузить подборку. Попробуй ещё раз.",
              );
            return (await response.json()).item as CatalogEntry;
          }),
        );
        if (!controller.signal.aborted)
          setResult({
            key,
            items: entries.filter(
              (item): item is CatalogEntry => item !== null,
            ),
            missing: entries.filter((item) => item === null).length,
            error: null,
          });
      } catch {
        if (!controller.signal.aborted)
          setResult({
            key,
            items: [],
            missing: 0,
            error:
              "Не удалось загрузить подборку. Проверь соединение и попробуй ещё раз.",
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [ids, key, enabled]);
  const current = result?.key === key ? result : null;
  return {
    ids,
    items: ids.length ? (current?.items ?? []) : [],
    missing: current?.missing ?? 0,
    loading: enabled && ids.length > 0 && !current,
    error: current?.error ?? null,
    retry: () => setRevision((value) => value + 1),
  };
}
