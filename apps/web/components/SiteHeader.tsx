"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useFittingRoomIds } from "@/lib/fittingRoomStorage";
import { CartDrawer } from "@/components/cart/CartDrawer";

const NAV_LINKS = [
  { href: "/", label: "Главная" },
  { href: "/catalog", label: "Каталог" },
  { href: "/tryon", label: "Примерка" },
  { href: "/#about", label: "О нас" },
];

// Хедер всегда fixed поверх контента. После редизайна весь сайт живёт в одной
// светлой гамме, поэтому отдельная тёмная версия шапки больше не нужна —
// достаточно менять плотность стекла при скролле, чтобы набор оставался
// читаемым над длинным контентом.
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const cartCount = useFittingRoomIds().length;
  const pathname = usePathname();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Мобильное меню закрывается по клику на самой ссылке (onClick ниже), а не
  // эффектом на pathname — иначе это лишний каскадный рендер.

  return (
    <>
      <header
        className={
          "fixed inset-x-0 top-0 z-40 border-b backdrop-blur-md transition-colors " +
          (scrolled ? "border-hair-ink bg-canvas/90" : "border-transparent bg-canvas/30")
        }
      >
        <div className="mx-auto flex max-w-[88rem] items-center justify-between px-5 py-4 sm:px-8 lg:px-14">
          <Link href="/" className="group flex items-baseline gap-2">
            <span className="font-display text-lg uppercase tracking-[0.34em] text-ink transition-colors group-hover:text-clay">
              Zhibek
            </span>
          </Link>

          <nav className="hidden items-center gap-9 font-grotesk text-[11px] uppercase tracking-[0.22em] md:flex">
            {NAV_LINKS.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative py-1 text-ink-soft transition-colors hover:text-ink"
                >
                  {link.label}
                  {/* Волосок под пунктом: у активного раздела растянут, у
                      остальных доезжает по наведению. */}
                  <span
                    className={
                      "absolute -bottom-0.5 left-0 h-px bg-clay transition-all duration-300 " +
                      (active ? "w-full" : "w-0 group-hover:w-full")
                    }
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              href="/profile"
              aria-label="Профиль"
              className="hidden h-10 w-10 items-center justify-center text-ink-soft transition-colors hover:bg-canvas-2 hover:text-ink sm:flex"
            >
              <User className="h-5 w-5" strokeWidth={1.5} />
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label="Примерочная"
              className="relative flex h-10 w-10 items-center justify-center text-ink-soft transition-colors hover:bg-canvas-2 hover:text-ink"
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute right-0.5 top-1 flex h-4 min-w-4 items-center justify-center bg-clay px-1 font-grotesk text-[10px] font-semibold leading-none text-canvas">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Меню"
              className="flex h-10 w-10 items-center justify-center text-ink-soft transition-colors hover:bg-canvas-2 hover:text-ink md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="flex flex-col border-t border-hair-ink bg-canvas/95 px-5 py-2 backdrop-blur-md md:hidden">
            {[...NAV_LINKS, { href: "/profile", label: "Профиль" }].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="border-b border-hair-ink py-3 font-grotesk text-[11px] uppercase tracking-[0.22em] text-ink-soft transition-colors last:border-0 hover:text-clay"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
