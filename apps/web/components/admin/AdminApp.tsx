"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type CatalogCategory,
} from "@/lib/categories";
import { catalogImageUrl, catalogImageUrls } from "@/lib/catalogDisplay";
import { StatsTab } from "./StatsTab";
import { GenerationsTab } from "./GenerationsTab";
import { PrivacyTab } from "./PrivacyTab";

// ────────────────────────────────────────────────────────────────────────────
// Типы (совпадают с ответами /api/admin/*).
interface AdminItem {
  id: string;
  sku: string | null;
  category: string;
  color: string | null;
  description: string | null;
  imagePath: string;
  images: string | null;
  lookId: string;
  sourcePhoto: string;
  source: string;
  sortIndex: number;
}

interface AdminLook {
  id: string;
  title: string | null;
  coverPath: string | null;
  sortIndex: number;
  source: string;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Общие стили под тему сайта (см. app/globals.css / app/profile/page.tsx).
const FIELD =
  "w-full border border-hair-ink bg-transparent px-3.5 py-2.5 font-grotesk text-sm text-ink outline-none transition-colors focus:border-clay";
const LABEL =
  "mb-1.5 block font-grotesk text-[10px] uppercase tracking-[0.24em] text-ink-soft";
const BTN =
  "inline-flex items-center justify-center bg-clay px-6 py-3 font-grotesk text-[12px] font-medium uppercase tracking-[0.16em] text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_GHOST =
  "inline-flex items-center justify-center border border-hair-ink px-4 py-2 font-grotesk text-[11px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink";
const BTN_DANGER =
  "inline-flex items-center justify-center border border-red-400 px-4 py-2 font-grotesk text-[11px] uppercase tracking-[0.14em] text-red-600 transition-colors hover:bg-red-50";

type Tab = "items" | "looks" | "stats" | "generations" | "privacy";

// ────────────────────────────────────────────────────────────────────────────
export function AdminApp() {
  const [phase, setPhase] = useState<
    "loading" | "disabled" | "locked" | "ready"
  >("loading");
  const [items, setItems] = useState<AdminItem[]>([]);
  const [looks, setLooks] = useState<AdminLook[]>([]);
  const [tab, setTab] = useState<Tab>("items");
  const [flash, setFlash] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const notify = useCallback((kind: "ok" | "err", text: string) => {
    setFlash({ kind, text });
    if (kind === "ok") setTimeout(() => setFlash(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/admin/items", { cache: "no-store" });
    if (res.status === 401) {
      setPhase("locked");
      return;
    }
    if (!res.ok) {
      notify("err", "Не удалось загрузить данные");
      return;
    }
    const data = (await res.json()) as {
      items: AdminItem[];
      looks: AdminLook[];
    };
    setItems(data.items);
    setLooks(data.looks);
    setPhase("ready");
  }, [notify]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const data = (await res.json()) as { enabled: boolean; authed: boolean };
      if (!data.enabled) {
        setPhase("disabled");
        return;
      }
      if (data.authed) {
        await loadData();
      } else {
        setPhase("locked");
      }
    })();
  }, [loadData]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setItems([]);
    setLooks([]);
    setPhase("locked");
  }

  if (phase === "loading") {
    return <Centered>Загрузка…</Centered>;
  }
  if (phase === "disabled") {
    return (
      <Centered>
        <p className="font-grotesk text-sm text-ink">Админка выключена.</p>
        <p className="mt-2 max-w-md font-grotesk text-[12px] leading-relaxed text-ink-soft">
          Задайте переменную окружения{" "}
          <code className="text-ink">ADMIN_PASSWORD</code> на сервере (локально
          по умолчанию пароль <code className="text-ink">admin</code>) и
          обновите страницу.
        </p>
      </Centered>
    );
  }
  if (phase === "locked") {
    return <LoginGate onSuccess={loadData} notify={notify} flash={flash} />;
  }

  return (
    <div className="mx-auto w-full max-w-[88rem] flex-1 px-5 pb-24 sm:px-8 lg:px-14">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-hair-ink pb-6">
        <div>
          <span className="tag text-ink-soft">админка</span>
          <h1 className="mt-3 font-display text-[clamp(1.75rem,5vw,3rem)] uppercase leading-[0.95] tracking-[-0.02em]">
            {tab === "privacy"
              ? "Конфиденциальность"
              : tab === "stats"
                ? "Статистика"
                : tab === "generations"
                  ? "Генерации"
                  : "Каталог"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-grotesk text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            {items.length} вещей · {looks.length} образов
          </span>
          <button type="button" onClick={handleLogout} className={BTN_GHOST}>
            Выйти
          </button>
        </div>
      </header>

      {flash && (
        <div
          className={
            "mt-4 border-l-2 px-4 py-3 font-grotesk text-[13px] " +
            (flash.kind === "ok"
              ? "border-green-500 bg-green-50 text-green-800"
              : "border-red-500 bg-red-50 text-red-700")
          }
        >
          {flash.text}
        </div>
      )}

      <nav className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["items", "Одежда"],
            ["looks", "Образы"],
            ["stats", "Статистика"],
            ["generations", "Генерации"],
            ["privacy", "Конфиденциальность"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={
              "border px-5 py-2.5 font-grotesk text-[11px] uppercase tracking-[0.16em] transition-colors " +
              (tab === key
                ? "border-clay bg-clay text-canvas"
                : "border-hair-ink text-ink-soft hover:border-ink")
            }
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "items" ? (
        <ItemsTab
          items={items}
          looks={looks}
          reload={loadData}
          notify={notify}
        />
      ) : tab === "looks" ? (
        <LooksTab
          items={items}
          looks={looks}
          reload={loadData}
          notify={notify}
        />
      ) : tab === "privacy" ? (
        <PrivacyTab />
      ) : tab === "generations" ? (
        <GenerationsTab />
      ) : (
        <StatsTab notify={notify} />
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-32 text-center">
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
function LoginGate({
  onSuccess,
  notify,
  flash,
}: {
  onSuccess: () => void;
  notify: (kind: "ok" | "err", text: string) => void;
  flash: { kind: "ok" | "err"; text: string } | null;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        notify("err", data.message ?? "Неверный пароль");
      }
    } catch {
      notify("err", "Не удалось связаться с сервером");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-32">
      <span className="tag text-ink-soft">админка</span>
      <h1 className="mt-3 font-display text-3xl uppercase tracking-tight">
        Вход
      </h1>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <div>
          <label className={LABEL} htmlFor="admin-pw">
            Пароль
          </label>
          <input
            id="admin-pw"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={FIELD}
          />
        </div>
        {flash && flash.kind === "err" && (
          <p className="border-l-2 border-red-500 bg-red-50 px-3 py-2 font-grotesk text-[12px] text-red-700">
            {flash.text}
          </p>
        )}
        <button type="submit" disabled={busy || !password} className={BTN}>
          {busy ? "Проверяем…" : "Войти"}
        </button>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Список образов для выпадающего выбора (только «настоящие» образы: из таблицы
// looks или где >= 2 вещей). Синглтоны админских товаров не засоряют список.
function useLookOptions(items: AdminItem[], looks: AdminLook[]) {
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items)
      counts.set(it.lookId, (counts.get(it.lookId) ?? 0) + 1);
    const known = new Map(looks.map((l) => [l.id, l]));
    const ids = new Set<string>([
      ...looks.map((l) => l.id),
      ...items.map((i) => i.lookId),
    ]);
    const options: { id: string; label: string }[] = [];
    for (const id of ids) {
      const count = counts.get(id) ?? 0;
      const look = known.get(id);
      if (!look && count < 2) continue; // синглтон без метаданных — пропускаем
      const title = look?.title || `Образ ${id}`;
      options.push({ id, label: `${title} · ${count} вещ.` });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [items, looks]);
}

// ────────────────────────────────────────────────────────────────────────────
function ItemsTab({
  items,
  looks,
  reload,
  notify,
}: {
  items: AdminItem[];
  looks: AdminLook[];
  reload: () => Promise<void> | void;
  notify: (kind: "ok" | "err", text: string) => void;
}) {
  const lookOptions = useLookOptions(items, looks);
  const [editing, setEditing] = useState<AdminItem | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const shown =
    filter === "all" ? items : items.filter((i) => i.category === filter);

  async function remove(item: AdminItem) {
    if (!confirm(`Удалить «${item.description ?? item.category}»?`)) return;
    const res = await fetch(`/api/admin/items/${encodeURIComponent(item.id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      notify("ok", "Товар удалён");
      await reload();
    } else {
      notify("err", "Не удалось удалить товар");
    }
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr]">
      {/* Форма добавления */}
      <section className="lg:sticky lg:top-24 lg:self-start">
        <h2 className="font-display text-xl uppercase tracking-tight">
          Добавить товар
        </h2>
        <ItemForm
          key="create"
          lookOptions={lookOptions}
          submitLabel="Добавить в каталог"
          onSubmit={async (fd) => {
            const res = await fetch("/api/admin/items", {
              method: "POST",
              body: fd,
            });
            if (res.ok) {
              notify("ok", "Товар добавлен");
              await reload();
              return true;
            }
            const data = await res.json().catch(() => ({}));
            notify("err", data.message ?? "Не удалось добавить товар");
            return false;
          }}
        />
      </section>

      {/* Список товаров */}
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={
              "border px-3 py-1.5 font-grotesk text-[10px] uppercase tracking-[0.14em] transition-colors " +
              (filter === "all"
                ? "border-clay text-clay"
                : "border-hair-ink text-ink-soft hover:border-ink")
            }
          >
            Все
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={
                "border px-3 py-1.5 font-grotesk text-[10px] uppercase tracking-[0.14em] transition-colors " +
                (filter === cat
                  ? "border-clay text-clay"
                  : "border-hair-ink text-ink-soft hover:border-ink")
              }
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="mt-8 border border-hair-ink px-5 py-16 text-center font-grotesk text-sm text-ink-soft">
            Пока пусто.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={() => setEditing(item)}
                onDelete={() => remove(item)}
              />
            ))}
          </div>
        )}
      </section>

      {editing && (
        <Modal onClose={() => setEditing(null)} title="Редактировать товар">
          <ItemForm
            key={editing.id}
            initial={editing}
            lookOptions={lookOptions}
            submitLabel="Сохранить"
            onSubmit={async (fd) => {
              const res = await fetch(
                `/api/admin/items/${encodeURIComponent(editing.id)}`,
                {
                  method: "PATCH",
                  body: fd,
                },
              );
              if (res.ok) {
                notify("ok", "Изменения сохранены");
                setEditing(null);
                await reload();
                return true;
              }
              const data = await res.json().catch(() => ({}));
              notify("err", data.message ?? "Не удалось сохранить");
              return false;
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function ItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: AdminItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const label =
    CATEGORY_LABELS[item.category as CatalogCategory] ?? item.category;
  return (
    <div className="group flex flex-col border border-hair-ink">
      <div className="relative aspect-[3/4] overflow-hidden bg-canvas-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={catalogImageUrl(item.imagePath)}
          alt={item.description ?? label}
          className="h-full w-full object-cover"
        />
        <span className="absolute left-0 top-0 bg-canvas px-2 py-1 font-grotesk text-[9px] uppercase tracking-[0.18em] text-ink-soft">
          {label}
        </span>
        <span
          className={
            "absolute right-0 top-0 px-2 py-1 font-grotesk text-[9px] uppercase tracking-[0.14em] " +
            (item.source === "admin"
              ? "bg-clay text-canvas"
              : "bg-ink/70 text-canvas")
          }
        >
          {item.source === "admin" ? "ручной" : "пайплайн"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 font-grotesk text-[12px] leading-snug text-ink">
          {item.description ?? "—"}
        </p>
        <p className="font-grotesk text-[10px] text-ink-soft">
          {item.color ?? "цвет —"} · позиция {item.sortIndex}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className={BTN_GHOST + " flex-1"}
          >
            Изменить
          </button>
          <button type="button" onClick={onDelete} className={BTN_DANGER}>
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
function ItemForm({
  initial,
  lookOptions,
  submitLabel,
  onSubmit,
}: {
  initial?: AdminItem;
  lookOptions: { id: string; label: string }[];
  submitLabel: string;
  onSubmit: (fd: FormData) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const existingImages = initial
    ? catalogImageUrls(initial.images, initial.imagePath)
    : [];

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    // Пустой look_id ("— без образа —") не отправляем — сервер сделает синглтон.
    if (!fd.get("look_id")) fd.delete("look_id");
    try {
      const ok = await onSubmit(fd);
      if (ok && !initial) {
        formRef.current?.reset();
        setPreviews([]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="mt-4 flex flex-col gap-4">
      <div>
        <label className={LABEL}>Категория</label>
        <select
          name="category"
          required
          defaultValue={initial?.category ?? ""}
          className={FIELD}
        >
          <option value="" disabled>
            Выбери категорию
          </option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Цвет</label>
          <input
            name="color"
            defaultValue={initial?.color ?? ""}
            placeholder="чёрный"
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Артикул</label>
          <input
            name="sku"
            defaultValue={initial?.sku ?? ""}
            placeholder="—"
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label className={LABEL}>Название / описание</label>
        <input
          name="description"
          defaultValue={initial?.description ?? ""}
          placeholder="Например: Оверсайз-рубашка"
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <div>
          <label className={LABEL}>Образ (комплект)</label>
          <select
            name="look_id"
            defaultValue={initial?.lookId ?? ""}
            className={FIELD}
          >
            <option value="">— без образа —</option>
            {lookOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Позиция</label>
          <input
            name="sort_index"
            type="number"
            defaultValue={initial?.sortIndex ?? 0}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label className={LABEL}>
          Фото товара {initial ? "(заменит текущие)" : "(можно несколько)"}
        </label>
        <input
          name="images"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={onFiles}
          className={
            FIELD +
            " file:mr-3 file:border-0 file:bg-clay file:px-3 file:py-1.5 file:font-grotesk file:text-[11px] file:uppercase file:tracking-[0.14em] file:text-canvas"
          }
        />
        {(previews.length > 0 || existingImages.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(previews.length > 0 ? previews : existingImages).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                className="h-20 w-16 object-cover ring-1 ring-hair-ink"
              />
            ))}
          </div>
        )}
      </div>

      <button type="submit" disabled={busy} className={BTN}>
        {busy ? "Сохраняем…" : submitLabel}
      </button>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
function LooksTab({
  items,
  looks,
  reload,
  notify,
}: {
  items: AdminItem[];
  looks: AdminLook[];
  reload: () => Promise<void> | void;
  notify: (kind: "ok" | "err", text: string) => void;
}) {
  const [editing, setEditing] = useState<AdminLook | null>(null);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.lookId, (m.get(it.lookId) ?? 0) + 1);
    return m;
  }, [items]);

  async function remove(look: AdminLook) {
    const n = counts.get(look.id) ?? 0;
    if (
      !confirm(
        `Удалить образ «${look.title ?? look.id}»?` +
          (n > 0 ? ` Вместе с ним удалятся ${n} вещей этого образа.` : ""),
      )
    )
      return;
    const res = await fetch(`/api/admin/looks/${encodeURIComponent(look.id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      notify("ok", "Образ удалён");
      await reload();
    } else {
      notify("err", "Не удалось удалить образ");
    }
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,26rem)_1fr]">
      <section className="lg:sticky lg:top-24 lg:self-start">
        <h2 className="font-display text-xl uppercase tracking-tight">
          Создать образ
        </h2>
        <p className="mt-2 font-grotesk text-[12px] leading-relaxed text-ink-soft">
          Создайте образ, затем во вкладке «Одежда» привяжите к нему вещи через
          поле «Образ».
        </p>
        <LookForm
          key="create"
          submitLabel="Создать образ"
          onSubmit={async (fd) => {
            const res = await fetch("/api/admin/looks", {
              method: "POST",
              body: fd,
            });
            if (res.ok) {
              notify("ok", "Образ создан");
              await reload();
              return true;
            }
            const data = await res.json().catch(() => ({}));
            notify("err", data.message ?? "Не удалось создать образ");
            return false;
          }}
        />
      </section>

      <section>
        {looks.length === 0 ? (
          <p className="border border-hair-ink px-5 py-16 text-center font-grotesk text-sm text-ink-soft">
            Образов пока нет. Образы из Python-пайплайна (обложка файлом) здесь
            не показываются, пока им не задать метаданные.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {looks.map((look) => (
              <div
                key={look.id}
                className="flex flex-col border border-hair-ink"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-canvas-2">
                  {look.coverPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={catalogImageUrl(look.coverPath)}
                      alt={look.title ?? look.id}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-grotesk text-[11px] text-ink-soft">
                      без обложки
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="line-clamp-2 font-grotesk text-[12px] text-ink">
                    {look.title ?? "Без названия"}
                  </p>
                  <p className="font-grotesk text-[10px] text-ink-soft">
                    {counts.get(look.id) ?? 0} вещей · позиция {look.sortIndex}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(look)}
                      className={BTN_GHOST + " flex-1"}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(look)}
                      className={BTN_DANGER}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <Modal onClose={() => setEditing(null)} title="Редактировать образ">
          <LookForm
            key={editing.id}
            initial={editing}
            submitLabel="Сохранить"
            onSubmit={async (fd) => {
              const res = await fetch(
                `/api/admin/looks/${encodeURIComponent(editing.id)}`,
                {
                  method: "PATCH",
                  body: fd,
                },
              );
              if (res.ok) {
                notify("ok", "Изменения сохранены");
                setEditing(null);
                await reload();
                return true;
              }
              const data = await res.json().catch(() => ({}));
              notify("err", data.message ?? "Не удалось сохранить");
              return false;
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function LookForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: AdminLook;
  submitLabel: string;
  onSubmit: (fd: FormData) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const ok = await onSubmit(new FormData(e.currentTarget));
      if (ok && !initial) {
        formRef.current?.reset();
        setPreview(null);
      }
    } finally {
      setBusy(false);
    }
  }

  const currentCover =
    preview ?? (initial?.coverPath ? catalogImageUrl(initial.coverPath) : null);

  return (
    <form ref={formRef} onSubmit={submit} className="mt-4 flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <div>
          <label className={LABEL}>Название образа</label>
          <input
            name="title"
            defaultValue={initial?.title ?? ""}
            placeholder="Например: Осенний кэжуал"
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Позиция</label>
          <input
            name="sort_index"
            type="number"
            defaultValue={initial?.sortIndex ?? 0}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label className={LABEL}>Обложка (модель в полном образе)</label>
        <input
          name="cover"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
          className={
            FIELD +
            " file:mr-3 file:border-0 file:bg-clay file:px-3 file:py-1.5 file:font-grotesk file:text-[11px] file:uppercase file:tracking-[0.14em] file:text-canvas"
          }
        />
        {currentCover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentCover}
            alt=""
            className="mt-3 h-40 w-32 object-cover ring-1 ring-hair-ink"
          />
        )}
      </div>

      <button type="submit" disabled={busy} className={BTN}>
        {busy ? "Сохраняем…" : submitLabel}
      </button>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────────
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 py-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg border border-hair-ink bg-canvas p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hair-ink pb-3">
          <h3 className="font-display text-lg uppercase tracking-tight">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="font-grotesk text-sm text-ink-soft hover:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
