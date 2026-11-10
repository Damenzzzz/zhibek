"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Menu, ShoppingBag, User, X } from "lucide-react";
import { useFittingRoomIds } from "@/lib/fittingRoomStorage";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { cn } from "@/lib/utils";

const links = [
  { href: "/catalog", label: "Коллекция" },
  { href: "/tryon", label: "Примерка" },
  { href: "/#how-it-works", label: "Как это работает" },
  { href: "/#about", label: "О проекте" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const count = useFittingRoomIds().length;

  // Над первым экраном шапка прозрачная и без линии, после прокрутки —
  // плотнее и с тенью, чтобы не сливаться с фото под ней.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    !href.includes("#") && pathname.startsWith(href);

  return (
    <>
      <a href="#page-content" className="skip-link">
        Перейти к содержимому
      </a>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300",
          scrolled
            ? "border-hair-ink bg-canvas/88 shadow-[0_8px_24px_-18px_rgba(42,33,28,0.35)] backdrop-blur-md"
            : "border-transparent bg-canvas/70 backdrop-blur-sm",
        )}
      >
        <div className="site-container flex h-[4.5rem] items-center justify-between gap-6">
          <Link
            href="/"
            aria-label="Smart Fashion — главная"
            className="wordmark group shrink-0 text-[1.0625rem] sm:text-lg"
          >
            Smart Fashion
            <span className="inline-block text-clay transition-transform duration-300 group-hover:scale-150">
              .
            </span>
          </Link>
          <nav
            aria-label="Основная навигация"
            className="hidden items-center gap-1 lg:flex"
          >
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-11 items-center rounded-full px-4 text-sm transition-colors duration-200",
                    active
                      ? "text-ink"
                      : "text-ink-soft hover:bg-canvas-2/70 hover:text-ink",
                  )}
                >
                  {link.label}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-clay"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1">
            <Link
              href="/profile"
              aria-label="Моя анкета"
              aria-current={pathname === "/profile" ? "page" : undefined}
              className="icon-button aria-[current=page]:bg-canvas-2"
            >
              <User className="size-5" strokeWidth={1.5} />
            </Link>
            <CartDrawer
              trigger={
                <button
                  type="button"
                  aria-label={`Примерочная${count ? `: ${count}` : ""}`}
                  className="icon-button relative"
                >
                  <ShoppingBag className="size-5" strokeWidth={1.5} />
                  {count > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-clay px-1 py-px text-[11px] font-medium leading-4 tabular-nums text-canvas ring-2 ring-canvas">
                      {count}
                    </span>
                  )}
                </button>
              }
            />
            <Link
              href="/tryon"
              className="button-dark button-sm ml-2 hidden lg:inline-flex"
            >
              Примерить
              <ArrowUpRight className="size-4" />
            </Link>
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  aria-label="Открыть меню"
                  className="icon-button lg:hidden"
                >
                  <Menu className="size-5" strokeWidth={1.5} />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-espresso/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto bg-canvas px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-lift data-[state=open]:animate-fade-in">
                  <div className="flex h-14 items-center justify-between">
                    <Dialog.Title className="wordmark text-lg">
                      Smart Fashion<span className="text-clay">.</span>
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button aria-label="Закрыть меню" className="icon-button">
                        <X className="size-5" />
                      </button>
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="mt-2 text-sm text-ink-soft">
                    Твоя виртуальная примерочная
                  </Dialog.Description>
                  <nav
                    aria-label="Мобильная навигация"
                    className="mt-6 flex flex-col"
                  >
                    {[
                      ...links,
                      { href: "/fitting-room", label: "Моя подборка" },
                      { href: "/profile", label: "Моя анкета" },
                    ].map((link, i) => (
                      <Dialog.Close key={link.href} asChild>
                        <Link
                          href={link.href}
                          aria-current={
                            isActive(link.href) ? "page" : undefined
                          }
                          className="group flex items-center justify-between border-b border-hair-ink py-4 font-display text-2xl leading-tight aria-[current=page]:text-clay"
                        >
                          <span>
                            <span className="mr-3 align-middle font-sans text-xs tabular-nums text-ink-soft">
                              0{i + 1}
                            </span>
                            {link.label}
                          </span>
                          <ArrowUpRight className="size-5 text-ink-soft transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                      </Dialog.Close>
                    ))}
                  </nav>
                  <Dialog.Close asChild>
                    <Link href="/tryon" className="button-primary mt-8 w-full">
                      Начать примерку
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Dialog.Close>
                  <p className="mt-auto pt-8 font-display text-lg text-ink-soft">
                    Примеряй новое. Оставайся собой.
                  </p>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </header>
    </>
  );
}
