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

// Хедер всегда fixed поверх контента (в т.ч. поверх hero-фото на главной) —
// "прозрачное белое" меню, как просил пользователь. Плотность стекла чуть
// растёт при скролле, чтобы текст оставался читаемым над длинным контентом.
//
// Главная живёт в тёмном editorial-слое (см. globals.css), поэтому шапка там
// переключается в костяной набор на прозрачном/чёрном — иначе белое стекло
// повисло бы молочной полосой поверх чёрного первого экрана. Остальные
// разделы остаются в прежнем светлом варианте.
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const cartCount = useFittingRoomIds().length;
  const dark = usePathname() === "/";

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const shell = dark
    ? scrolled
      ? "border-hair bg-noir/90"
      : "border-transparent bg-transparent"
    : scrolled
      ? "border-line/70 bg-white/85"
      : "border-white/0 bg-white/40";
  const navText = dark
    ? "text-silk-dim hover:text-silk"
    : "text-ink-soft hover:text-ink";
  const iconBtn = dark
    ? "text-silk-dim hover:bg-silk/10 hover:text-silk"
    : "text-ink-soft hover:bg-paper-soft hover:text-ink";

  return (
    <>
      <header
        className={"fixed inset-x-0 top-0 z-40 border-b backdrop-blur-md transition-colors " + shell}
      >
        <div
          className={
            "mx-auto flex items-center justify-between px-4 py-4 sm:px-6 " +
            (dark ? "max-w-[88rem] sm:px-8 lg:px-14" : "max-w-6xl lg:px-8")
          }
        >
          <Link href="/" className="flex items-baseline gap-2">
            <span
              className={
                dark
                  ? "font-editorial text-xl uppercase tracking-[0.32em] text-silk"
                  : "font-display text-xl font-semibold tracking-tight text-ink"
              }
            >
              ZHIBEK
            </span>
          </Link>

          <nav
            className={
              "hidden items-center md:flex " +
              (dark
                ? "gap-9 font-grotesk text-[11px] uppercase tracking-[0.22em]"
                : "gap-7 text-sm font-medium")
            }
          >
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={"transition-colors " + navText}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link
              href="/profile"
              aria-label="Профиль"
              className={
                "hidden h-10 w-10 items-center justify-center rounded-full transition-colors sm:flex " +
                iconBtn
              }
            >
              <User className="h-5 w-5" strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label="Корзина"
              className={
                "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors " +
                iconBtn
              }
            >
              <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
              {cartCount > 0 && (
                <span
                  className={
                    "absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none " +
                    (dark ? "bg-madder text-silk" : "bg-accent text-accent-contrast")
                  }
                >
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Меню"
              className={
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors md:hidden " +
                iconBtn
              }
            >
              {mobileOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav
            className={
              "flex flex-col gap-1 border-t px-4 py-3 backdrop-blur-md md:hidden " +
              (dark ? "border-hair bg-noir/95" : "border-line/70 bg-white/95")
            }
          >
            {[...NAV_LINKS, { href: "/profile", label: "Профиль" }].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={
                  "rounded-lg px-2 py-2.5 text-sm font-medium transition-colors " + navText
                }
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
