import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <span className="eyebrow">404</span>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">Страница не найдена</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
        Возможно, товар убрали из каталога или ссылка устарела.
      </p>
      <Link
        href="/catalog"
        className="mt-7 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        В каталог
      </Link>
    </div>
  );
}
