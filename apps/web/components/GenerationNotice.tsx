export function GenerationNotice() {
  return (
    <aside className="border-l-2 border-clay bg-clay/5 px-4 py-3 font-grotesk text-[13px] leading-relaxed text-ink-soft">
      <p className="font-medium text-ink">Перед генерацией</p>
      <p className="mt-1">
        Сгенерированные изображения сохраняются на сайте и могут просматриваться
        администраторами для проверки качества и улучшения работоспособности сайта.
        Это относится к моделям по анкете и результатам виртуальной примерки.
      </p>
    </aside>
  );
}
