import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}

// «1 вещь», «3 вещи», «5 вещей» — русское склонение по числу.
export function pluralRu(
  n: number,
  [one, few, many]: readonly [string, string, string],
): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20))
    return `${n} ${few}`;
  return `${n} ${many}`;
}

export const ITEM_FORMS = ["вещь", "вещи", "вещей"] as const;
