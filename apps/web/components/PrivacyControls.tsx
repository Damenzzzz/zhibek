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
          className="inline-flex min-h-10 items-center underline decoration-canvas-dim/50 underline-offset-4 hover:text-canvas"
        >
          Настройки cookie
        </button>
      </Dialog.Trigger>
      {/* Компактная карточка в углу: не перекрывает первый экран и не
          мешает листать, пока человек не решил. */}
      {raw !== "server" && !choice && !open && (
        <section
          aria-label="Настройки конфиденциальности"
          className="fixed inset-x-3 bottom-3 z-40 animate-fade-in-up rounded-2xl border border-hair-ink bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-ink shadow-lift sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-[25rem] sm:p-5"
        >
          <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-clay/10">
              <ShieldCheck className="size-[1.125rem] text-clay" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-[15px] font-medium leading-snug">
                Твой выбор важен
              </h2>
              <p className="mt-1.5 text-pretty text-[13px] leading-relaxed text-ink-soft">
                Необходимые cookie нужны для работы сайта. Аналитика — только с
                твоего разрешения.{" "}
                <Link
                  href="/cookies"
                  className="text-ink underline underline-offset-2"
                >
                  Подробнее
                </Link>
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="button-primary button-sm col-span-2"
              onClick={() => save(true)}
            >
              Разрешить аналитику
            </button>
            <button
              type="button"
              className="button-secondary button-sm"
              onClick={() => save(false)}
            >
              Только нужные
            </button>
            <button
              type="button"
              className="button-secondary button-sm"
              onClick={showSettings}
            >
              Настроить
            </button>
          </div>
        </section>
      )}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-espresso/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-surface p-6 text-ink shadow-lift sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="font-display text-3xl leading-tight">
              Твоя <span className="italic">конфиденциальность</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Закрыть настройки cookie"
                className="icon-button -mr-2"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            Необходимое хранилище обеспечивает работу сайта. Аналитика — по
            желанию. Выбор можно изменить в любой момент.
          </Dialog.Description>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-hair-ink p-4">
              <p className="flex items-center justify-between gap-3 text-[15px] font-medium">
                Необходимые
                <span className="rounded-full bg-sage/15 px-2.5 py-1 text-xs font-medium text-ink">
                  Всегда включены
                </span>
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                Твой выбор конфиденциальности, анкета и подборка в браузере;
                cookie входа только для администраторов.
              </p>
            </div>
            <label className="flex cursor-pointer gap-3 rounded-2xl border border-hair-ink p-4 transition-colors has-[:checked]:border-clay has-[:checked]:bg-clay/5">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
                className="mt-1 size-5 accent-clay"
              />
              <span>
                <span className="text-[15px] font-medium">
                  Необязательная аналитика
                </span>
                <span className="mt-2 block text-[13px] leading-relaxed text-ink-soft">
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
            className="mt-5 inline-flex min-h-10 items-center text-[13px] text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            Политика конфиденциальности
          </Link>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
