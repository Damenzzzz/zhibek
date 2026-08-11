import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";

export function CategoryFilter({ active }: { active?: string }) {
  const chips = [{ value: undefined, label: "Все" }, ...CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] }))];

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {chips.map((chip) => {
        const isActive = chip.value === active || (chip.value === undefined && !active);
        const href = chip.value ? `/catalog?category=${chip.value}` : "/catalog";
        return (
          <Link
            key={chip.label}
            href={href}
            className={
              "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors " +
              (isActive
                ? "border-ink bg-ink text-white"
                : "border-line text-ink-soft hover:border-ink/40 hover:text-ink")
            }
          >
            {chip.label}
          </Link>
        );
      })}
    </div>
  );
}
