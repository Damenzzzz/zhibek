"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ShieldCheck, X } from "lucide-react";
import { parsePrivacyChoice } from "@/lib/privacy";
import {
  readPrivacyChoiceRaw,
  savePrivacyChoice,
  subscribePrivacy,
} from "@/lib/privacyStorage";

export function PrivacyControls() {
  const raw = useSyncExternalStore(
    subscribePrivacy,
    readPrivacyChoiceRaw,
    () => "server",
  );
  const choice = parsePrivacyChoice(raw);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  function showSettings() {
    setAnalytics(choice?.analytics ?? false);
    setOpen(true);
  }
  function save(value: boolean) {
    savePrivacyChoice(value);
    setOpen(false);
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          onClick={showSettings}
          className="min-h-9 text-xs text-canvas-dim underline underline-offset-4"
        >
          Настройки cookie
        </button>
      </Dialog.Trigger>
      {raw !== "server" && !choice && !open && (
        <section
          aria-label="Настройки конфиденциальности"
          className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-4xl rounded-2xl border border-hair-ink bg-canvas p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-ink shadow-lg sm:inset-x-6 sm:bottom-6 sm:p-6"
        >
          <div className="flex gap-3">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-clay" />
            <div>
              <h2 className="text-sm font-medium">Твой выбор важен</h2>
              <p className="mt-2 text-pretty text-xs leading-relaxed text-ink-soft">
                Используем необходимые cookie и хранилище браузера для работы
                сайта. Необязательная аналитика помогает улучшать Smart Fashion
                и включается только с твоего разрешения.{" "}
                <Link href="/cookies" className="underline underline-offset-2">
                  Подробнее
                </Link>
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              className="button-secondary flex-1 sm:flex-none"
              onClick={() => save(false)}
            >
              Только необходимые
            </button>
            <button
              type="button"
              className="button-secondary flex-1 sm:flex-none"
              onClick={showSettings}
            >
              Настроить
            </button>
            <button
              type="button"
              className="button-primary flex-1 sm:flex-none"
              onClick={() => save(true)}
            >
              Разрешить аналитику
            </button>
          </div>
        </section>
      )}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-canvas p-6 text-ink shadow-xl">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="font-display text-2xl">
              Твоя конфиденциальность
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Закрыть настройки cookie"
                className="flex size-11 shrink-0 items-center justify-center"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-3 text-sm leading-relaxed text-ink-soft">
            Необходимое хранилище обеспечивает работу сайта. Аналитика — по
            желанию. Выбор можно изменить в любой момент.
          </Dialog.Description>
          <div className="mt-6 space-y-5">
            <div className="border-t border-hair-ink pt-5">
              <p className="text-sm font-medium">
                Необходимые — всегда включены
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Твой выбор конфиденциальности, анкета и подборка в браузере;
                cookie входа только для администраторов.
              </p>
            </div>
            <label className="flex gap-3 border-t border-hair-ink pt-5">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
                className="mt-1 size-5 accent-clay"
              />
              <span>
                <span className="text-sm font-medium">
                  Необязательная аналитика
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-ink-soft">
                  Случайный идентификатор, посещения и выбор образов. Без
                  рекламных cookie.
                </span>
              </span>
            </label>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              className="button-primary"
              onClick={() => save(analytics)}
            >
              Сохранить выбор
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => save(false)}
            >
              Только необходимые
            </button>
          </div>
          <Link
            href="/privacy"
            className="mt-5 inline-block min-h-9 text-xs underline underline-offset-4"
          >
            Политика конфиденциальности
          </Link>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
