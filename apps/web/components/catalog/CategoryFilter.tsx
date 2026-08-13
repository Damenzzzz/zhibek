import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";

// Фильтр набран не пилюлями, а строкой рубрикатора: подчёркивание вместо
// заливки — так он читается оглавлением каталога, а не панелью управления.
export function CategoryFilter({ active }: { active?: string }) {
  const chips = [
    { value: undefined, label: "Все" },
    ...CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
  ];

  return (
    <div className="no-scrollbar -mx-5 flex gap-7 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      {chips.map((chip) => {
        const isActive = chip.value === active || (chip.value === undefined && !active);
        const href = chip.value ? `/catalog?category=${chip.value}` : "/catalog";
        return (
          <Link
            key={chip.label}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={
              "group relative shrink-0 whitespace-nowrap py-2 font-grotesk text-[11px] uppercase tracking-[0.22em] transition-colors " +
              (isActive ? "text-ink" : "text-ink-soft hover:text-ink")
            }
          >
            {chip.label}
            <span
              className={
                "absolute bottom-0 left-0 h-px bg-clay transition-all duration-300 " +
                (isActive ? "w-full" : "w-0 group-hover:w-full")
              }
            />
          </Link>
        );
      })}
    </div>
  );
}
