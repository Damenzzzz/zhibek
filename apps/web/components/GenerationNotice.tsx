import { Info } from "lucide-react";

export function GenerationNotice() {
  return (
    <aside className="flex gap-3.5 rounded-2xl border border-hair-ink bg-surface px-4 py-4 sm:px-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-saffron/15">
        <Info className="size-[1.125rem] text-ink" strokeWidth={1.75} />
      </span>
      <div className="text-sm leading-relaxed text-ink-soft">
        <p className="font-medium text-ink">Перед генерацией</p>
        <p className="mt-1">
          Сгенерированные изображения сохраняются на сайте и могут
          просматриваться администраторами для проверки качества и улучшения
          работоспособности сайта. Это относится к моделям по анкете и
          результатам виртуальной примерки.
        </p>
      </div>
    </aside>
  );
}
