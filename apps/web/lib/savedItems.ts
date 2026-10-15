export function parseSavedIds(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string =>
                typeof id === "string" && id.length > 0 && id.length <= 200,
            ),
          ),
        ].slice(0, 100)
      : [];
  } catch {
    return [];
  }
}
