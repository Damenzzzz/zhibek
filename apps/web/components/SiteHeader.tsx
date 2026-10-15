"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useFittingRoomIds } from "@/lib/fittingRoomStorage";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { cn } from "@/lib/utils";
const links = [
  { href: "/catalog", label: "Коллекция" },
  { href: "/tryon", label: "Примерка" },
  { href: "/#how-it-works", label: "Как это работает" },
  { href: "/#about", label: "О Smart Fashion" },
];
export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const count = useFittingRoomIds().length;
  return (
    <>
      <a href="#page-content" className="skip-link">
        Перейти к содержимому
      </a>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-hair-ink bg-canvas/95">
        <div className="site-container flex h-20 items-center justify-between gap-6">
          <Link
            href="/"
            aria-label="Smart Fashion — главная"
            className="shrink-0 font-display text-xl leading-none"
          >
            Smart
            <br />
            Fashion<span className="ml-1 text-clay">.</span>
          </Link>
          <nav
            aria-label="Основная навигация"
            className="hidden items-center gap-8 lg:flex"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.href === pathname ? "page" : undefined}
                className={cn(
                  "min-h-11 content-center text-xs text-ink-soft hover:text-clay",
                  pathname.startsWith(link.href) && "text-clay",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/profile"
              aria-label="Моя анкета"
              className="flex size-11 items-center justify-center rounded-full hover:bg-canvas-2"
            >
              <User className="size-5" strokeWidth={1.4} />
            </Link>
            <CartDrawer
              trigger={
                <button
                  type="button"
                  aria-label={`Примерочная${count ? `: ${count}` : ""}`}
                  className="relative flex size-11 items-center justify-center rounded-full hover:bg-canvas-2"
                >
                  <ShoppingBag className="size-5" strokeWidth={1.4} />
                  {count > 0 && (
                    <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-clay text-[9px] tabular-nums text-canvas">
                      {count}
                    </span>
                  )}
                </button>
              }
            />
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  aria-label="Открыть меню"
                  className="flex size-11 items-center justify-center rounded-full hover:bg-canvas-2 lg:hidden"
                >
                  <Menu className="size-5" strokeWidth={1.4} />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/35" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto bg-canvas p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="font-display text-2xl">
                      Smart Fashion.
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        aria-label="Закрыть меню"
                        className="flex size-11 items-center justify-center rounded-full hover:bg-canvas-2"
                      >
                        <X className="size-5" />
                      </button>
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="mt-3 text-sm text-ink-soft">
                    Твоя виртуальная примерочная
                  </Dialog.Description>
                  <nav
                    aria-label="Мобильная навигация"
                    className="mt-8 flex flex-col"
                  >
                    {[
                      ...links,
                      { href: "/profile", label: "Моя анкета" },
                      { href: "/fitting-room", label: "Моя подборка" },
                    ].map((link) => (
                      <Dialog.Close key={link.href} asChild>
                        <Link
                          href={link.href}
                          className="border-b border-hair-ink py-5 font-display text-2xl"
                        >
                          {link.label}
                        </Link>
                      </Dialog.Close>
                    ))}
                  </nav>
                  <p className="mt-auto pt-8 text-xs leading-relaxed text-ink-soft">
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
