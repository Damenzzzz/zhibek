"use client";
import Link from "next/link";
export function DataConsent({
  checked,
  onChange,
}: {
  checked?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer gap-3.5 rounded-2xl border border-hair-ink bg-surface p-4 text-sm leading-relaxed text-ink-soft transition-colors has-[:checked]:border-clay/50 has-[:checked]:bg-clay-soft/30 sm:p-5">
      <input
        type="checkbox"
        name="data_consent"
        value="true"
        required
        checked={checked}
        onChange={
          onChange ? (event) => onChange(event.target.checked) : undefined
        }
        className="mt-0.5 size-5 shrink-0 accent-clay"
      />
      <span>
        Даю согласие на обработку анкеты, фото и результатов для работы
        примерки, передачу необходимых данных AI-провайдерам и хостингу, в том
        числе за рубеж, и просмотр результатов администраторами для улучшения
        сервиса. Ознакомился с{" "}
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-clay underline underline-offset-2"
        >
          политикой конфиденциальности
        </Link>{" "}
        и{" "}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-clay underline underline-offset-2"
        >
          условиями использования
        </Link>
        .
      </span>
    </label>
  );
}
