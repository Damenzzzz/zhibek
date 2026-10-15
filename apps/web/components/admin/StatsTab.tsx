"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CATEGORY_LABELS, type CatalogCategory } from "@/lib/categories";

// Вкладка «Статистика» админки: продуктовые метрики, воронка и расход Gemini.
// Данные — /api/admin/stats (lib/adminStats.ts), настройки бюджета —
// /api/admin/settings.

type Period = "today" | "7d" | "30d" | "month" | "all";

const PERIOD_LABELS: [Period, string][] = [
  ["today", "Сегодня"],
  ["7d", "7 дней"],
  ["30d", "30 дней"],
  ["month", "Этот месяц"],
  ["all", "Всё время"],
];

interface Spend {
  costUsd: number;
  calls: number;
  images: number;
  billedCalls: number;
  errors: number;
  rateLimited: number;
  overloaded: number;
  inputTokens: number;
  outputTokens: number;
  costPerTryonUsd: number | null;
}

interface Settings {
  monthlyBudgetUsd: number | null;
  balanceUsd: number | null;
  balanceSetAt: string | null;
  dailyRequestLimit: number | null;
  usdToKzt: number | null;
}

interface Stats {
  period: Period;
  product: {
    newUsers: number;
    newUsersWithTryon: number;
    firstTryonRate: number | null;
    usersWithoutDate: number;
    totalUsers: number;
    tryons: number;
    activeUsers: number;
    avgTryonsPerActiveUser: number | null;
    avgTryonsPerNewUser: number | null;
    tryonDailyLimit: number;
    topLooks: { lookId: string; title: string | null; tryons: number; people: number; cover: string }[];
    topItems: {
      itemId: string;
      lookId: string;
      category: string;
      description: string | null;
      tryons: number;
      image: string;
    }[];
    funnel: {
      steps: { key: string; label: string; count: number }[];
      photoUpload: number;
      photoGenerated: number;
      trackingSince: string | null;
    };
  };
  ai: {
    today: Spend;
    week: Spend;
    month30: Spend;
    monthToDate: Spend;
    allTime: Spend;
    legacyTryons: number;
    legacyCostEstimateUsd: number;
    trackingSince: string | null;
    byModel: { model: string; calls: number; images: number; costUsd: number }[];
    daily: { day: string; costUsd: number; images: number; calls: number }[];
    settings: Settings;
    budget: {
      monthForecastUsd: number;
      avgDailyCostUsd: number;
      costPerTryonUsd: number;
      budgetLeftUsd: number | null;
      balanceSpentUsd: number;
      balanceLeftUsd: number | null;
      moneyLeftUsd: number | null;
      tryonsLeft: number | null;
      daysLeft: number | null;
      requestsToday: number;
      requestsLeftToday: number | null;
    };
    fashnCredits30d: number;
    fashnCreditsMonth: number;
  };
}

const FIELD =
  "w-full border border-hair-ink bg-transparent px-3.5 py-2.5 font-grotesk text-sm text-ink outline-none transition-colors focus:border-clay";
const LABEL = "mb-1.5 block font-grotesk text-[10px] uppercase tracking-[0.24em] text-ink-soft";
const BTN =
  "inline-flex items-center justify-center bg-clay px-6 py-3 font-grotesk text-[12px] font-medium uppercase tracking-[0.16em] text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_GHOST =
  "inline-flex items-center justify-center border border-hair-ink px-4 py-2 font-grotesk text-[11px] uppercase tracking-[0.14em] text-ink transition-colors hover:border-ink disabled:opacity-50";
const SECTION_TITLE =
  "border-b border-hair-ink pb-2.5 font-grotesk text-[10px] uppercase tracking-[0.3em] text-ink-soft";

// ───────────────────────────── форматирование ─────────────────────────────
const intFmt = new Intl.NumberFormat("ru-RU");
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const dec = (v: number | null, digits = 1) =>
  v === null ? "—" : v.toLocaleString("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

function usd(v: number | null): string {
  if (v === null) return "—";
  const digits = Math.abs(v) < 1 ? 3 : 2;
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
}

function money(v: number | null, rate: number | null): string {
  if (v === null) return "—";
  return rate ? `${usd(v)} · ≈${intFmt.format(Math.round(v * rate))} ₸` : usd(v);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

// ───────────────────────────── вкладка ─────────────────────────────
export function StatsTab({ notify }: { notify: (kind: "ok" | "err", text: string) => void }) {
  const [period, setPeriod] = useState<Period>("7d");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch(`/api/admin/stats?period=${period}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const result = await res.json() as Stats;
        if (!controller.signal.aborted) setStats(result);
      } catch {
        if (!controller.signal.aborted) notify("err", "Не удалось загрузить статистику");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [notify, period, revision]);

  function selectPeriod(p: Period) {
    if (p === period) return;
    setLoading(true);
    setPeriod(p);
  }

  function refresh() {
    setLoading(true);
    setRevision((value) => value + 1);
  }

  return (
    <div className="mt-8 space-y-12">
      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_LABELS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => selectPeriod(key)}
            className={
              "border px-4 py-2 font-grotesk text-[11px] uppercase tracking-[0.14em] transition-colors " +
              (period === key ? "border-espresso bg-espresso text-canvas" : "border-hair-ink text-ink-soft hover:border-ink")
            }
          >
            {label}
          </button>
        ))}
        <button type="button" onClick={refresh} disabled={loading} className={BTN_GHOST + " ml-auto"}>
          {loading ? "Обновляю…" : "Обновить"}
        </button>
      </div>

      {!stats ? (
        <p className="font-grotesk text-sm text-ink-soft">Загрузка…</p>
      ) : (
        <div className={"space-y-12 transition-opacity " + (loading ? "opacity-60" : "")}>
          <ProductSection stats={stats} />
          <FunnelSection funnel={stats.product.funnel} />
          <TopSection stats={stats} />
          <AiSection ai={stats.ai} onSaved={refresh} notify={notify} />
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" | "bad" }) {
  return (
    <div
      className={
        "border p-5 " +
        (tone === "bad" ? "border-red-400 bg-red-50" : tone === "warn" ? "border-amber-400 bg-amber-50" : "border-hair-ink")
      }
    >
      <p className={LABEL}>{label}</p>
      <p className="mt-2 font-display text-[clamp(1.6rem,3.5vw,2.25rem)] leading-none text-ink">{value}</p>
      {hint && <p className="mt-2 font-grotesk text-[12px] leading-snug text-ink-soft">{hint}</p>}
    </div>
  );
}

// ───────────────────────────── пользователи ─────────────────────────────
function ProductSection({ stats }: { stats: Stats }) {
  const p = stats.product;
  const periodLabel = PERIOD_LABELS.find(([k]) => k === stats.period)?.[1].toLowerCase() ?? "";
  return (
    <section>
      <p className={SECTION_TITLE}>Пользователи · {periodLabel}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Новые пользователи" value={intFmt.format(p.newUsers)} hint={`Заполнили анкету. Всего: ${intFmt.format(p.totalUsers)}`} />
        <Tile
          label="Дошли до первой примерки"
          value={pct(p.firstTryonRate)}
          hint={`${intFmt.format(p.newUsersWithTryon)} из ${intFmt.format(p.newUsers)} новых`}
        />
        <Tile
          label="Примерок на пользователя"
          value={dec(p.avgTryonsPerActiveUser)}
          hint={`Среди тех, кто примерял (${intFmt.format(p.activeUsers)}). На каждого нового: ${dec(p.avgTryonsPerNewUser)}`}
        />
        <Tile
          label="Примерок всего"
          value={intFmt.format(p.tryons)}
          hint={`Лимит на человека: ${p.tryonDailyLimit} в день`}
        />
      </div>
      {stats.period !== "all" && p.usersWithoutDate > 0 && (
        <p className="mt-3 font-grotesk text-[12px] text-ink-soft">
          {intFmt.format(p.usersWithoutDate)} анкет созданы до включения статистики — у них нет даты, они видны только в «Всё
          время».
        </p>
      )}
    </section>
  );
}

// ───────────────────────────── воронка ─────────────────────────────
function FunnelSection({ funnel }: { funnel: Stats["product"]["funnel"] }) {
  const start = funnel.steps[0]?.count ?? 0;
  return (
    <section>
      <p className={SECTION_TITLE}>Воронка · уникальные посетители</p>
      {start === 0 ? (
        <p className="mt-4 font-grotesk text-sm text-ink-soft">
          {funnel.trackingSince
            ? "За этот период посетителей нет."
            : "Данных пока нет — воронка начнёт заполняться после деплоя этого обновления."}
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {funnel.steps.map((step, i) => {
            const prev = i > 0 ? funnel.steps[i - 1].count : step.count;
            const share = start > 0 ? step.count / start : 0;
            const fromPrev = prev > 0 ? step.count / prev : 0;
            return (
              <div key={step.key} className="grid grid-cols-[minmax(9rem,13rem)_1fr] items-center gap-4">
                <div>
                  <p className="font-grotesk text-[13px] text-ink">{step.label}</p>
                  {i > 0 && (
                    <p className="font-grotesk text-[11px] text-ink-soft">
                      {pct(fromPrev)} от предыдущего · −{intFmt.format(prev - step.count)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-9 flex-1 bg-canvas-2">
                    <div
                      className="flex h-full items-center bg-clay px-3 font-grotesk text-[12px] font-medium text-canvas transition-[width]"
                      style={{ width: `${Math.max(share * 100, 2)}%` }}
                    >
                      {share >= 0.12 ? intFmt.format(step.count) : ""}
                    </div>
                  </div>
                  <span className="w-24 text-right font-grotesk text-[13px] text-ink">
                    {share < 0.12 ? `${intFmt.format(step.count)} · ` : ""}
                    {pct(share)}
                  </span>
                </div>
              </div>
            );
          })}
          <p className="pt-2 font-grotesk text-[12px] leading-relaxed text-ink-soft">
            Фото: своё — {intFmt.format(funnel.photoUpload)}, сгенерированная модель — {intFmt.format(funnel.photoGenerated)}.
            Шаг засчитывается, если посетитель прошёл его и все предыдущие за период. Учёт ведётся с{" "}
            {formatDate(funnel.trackingSince)}.
          </p>
        </div>
      )}
    </section>
  );
}

// ───────────────────────────── топы ─────────────────────────────
function TopSection({ stats }: { stats: Stats }) {
  const { topLooks, topItems } = stats.product;
  const maxLook = Math.max(1, ...topLooks.map((l) => l.tryons));
  const maxItem = Math.max(1, ...topItems.map((l) => l.tryons));
  return (
    <section className="grid gap-10 lg:grid-cols-2">
      <div>
        <p className={SECTION_TITLE}>Чаще всего примеряют · образы</p>
        {topLooks.length === 0 ? (
          <p className="mt-4 font-grotesk text-sm text-ink-soft">
            Пока нет примерок готовых образов за период (учёт образа ведётся с этого обновления).
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {topLooks.map((look, i) => (
              <li key={look.lookId} className="flex items-center gap-3">
                <span className="w-5 font-grotesk text-[12px] text-ink-soft">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={look.cover} alt="" className="h-14 w-11 shrink-0 bg-canvas-2 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-grotesk text-[13px] text-ink">{look.title || `Образ №${look.lookId}`}</p>
                  <div className="mt-1 h-1.5 bg-canvas-2">
                    <div className="h-full bg-clay" style={{ width: `${(look.tryons / maxLook) * 100}%` }} />
                  </div>
                </div>
                <span className="w-24 text-right font-grotesk text-[12px] text-ink">
                  {intFmt.format(look.tryons)} · {intFmt.format(look.people)} чел.
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div>
        <p className={SECTION_TITLE}>Чаще всего примеряют · вещи</p>
        {topItems.length === 0 ? (
          <p className="mt-4 font-grotesk text-sm text-ink-soft">Примерок за период нет.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {topItems.map((item, i) => (
              <li key={item.itemId} className="flex items-center gap-3">
                <span className="w-5 font-grotesk text-[12px] text-ink-soft">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" className="h-14 w-11 shrink-0 bg-canvas-2 object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-grotesk text-[13px] text-ink">
                    {item.description || CATEGORY_LABELS[item.category as CatalogCategory] || item.category}
                  </p>
                  <p className="font-grotesk text-[11px] text-ink-soft">
                    {CATEGORY_LABELS[item.category as CatalogCategory] ?? item.category} · образ №{item.lookId}
                  </p>
                  <div className="mt-1 h-1.5 bg-canvas-2">
                    <div className="h-full bg-clay" style={{ width: `${(item.tryons / maxItem) * 100}%` }} />
                  </div>
                </div>
                <span className="w-12 text-right font-grotesk text-[12px] text-ink">{intFmt.format(item.tryons)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

// ───────────────────────────── расход Gemini ─────────────────────────────
function AiSection({
  ai,
  onSaved,
  notify,
}: {
  ai: Stats["ai"];
  onSaved: () => void;
  notify: (kind: "ok" | "err", text: string) => void;
}) {
  const b = ai.budget;
  const rate = ai.settings.usdToKzt;
  const noLimits = ai.settings.balanceUsd === null && ai.settings.monthlyBudgetUsd === null;
  const out = b.moneyLeftUsd !== null && b.moneyLeftUsd <= 0;
  const low = !out && b.daysLeft !== null && b.daysLeft < 7;
  const maxDay = Math.max(0.0001, ...ai.daily.map((d) => d.costUsd));

  return (
    <section className="space-y-6">
      <p className={SECTION_TITLE}>Расход AI · Gemini (примерка)</p>

      {(out || low) && (
        <div
          className={
            "border-l-2 px-4 py-3 font-grotesk text-[13px] " +
            (out ? "border-red-500 bg-red-50 text-red-700" : "border-amber-500 bg-amber-50 text-amber-900")
          }
        >
          {out
            ? "Деньги на Gemini закончились (по расчёту) — пополните счёт, иначе примерка перестанет работать."
            : `Денег хватит примерно на ${dec(b.daysLeft, 0)} дн. (≈${intFmt.format(b.tryonsLeft ?? 0)} примерок) — пора пополнить.`}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Сегодня" value={usd(ai.today.costUsd)} hint={`${intFmt.format(ai.today.images)} генераций · ${intFmt.format(ai.today.calls)} запросов`} />
        <Tile label="7 дней" value={usd(ai.week.costUsd)} hint={`${intFmt.format(ai.week.images)} генераций · в среднем ${usd(b.avgDailyCostUsd)}/день`} />
        <Tile label="30 дней" value={usd(ai.month30.costUsd)} hint={`${intFmt.format(ai.month30.images)} генераций`} />
        <Tile
          label="Этот месяц"
          value={usd(ai.monthToDate.costUsd)}
          hint={`Прогноз на месяц: ${usd(b.monthForecastUsd)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Стоимость одной примерки"
          value={usd(b.costPerTryonUsd)}
          hint="Факт за 7 дней, включая оплаченные неудачные попытки"
        />
        <Tile
          label="Осталось денег"
          value={money(b.moneyLeftUsd, rate)}
          hint={
            noLimits
              ? "Укажите остаток на счёте или бюджет ниже"
              : b.tryonsLeft !== null
                ? `≈${intFmt.format(b.tryonsLeft)} примерок${b.daysLeft !== null ? ` · ≈${dec(b.daysLeft, 0)} дн.` : ""}`
                : undefined
          }
          tone={out ? "bad" : low ? "warn" : undefined}
        />
        <Tile
          label="Запросов сегодня"
          value={
            ai.settings.dailyRequestLimit !== null
              ? `${intFmt.format(b.requestsToday)} / ${intFmt.format(ai.settings.dailyRequestLimit)}`
              : intFmt.format(b.requestsToday)
          }
          hint={
            b.requestsLeftToday !== null
              ? `Осталось по квоте: ${intFmt.format(b.requestsLeftToday)}`
              : "Укажите дневной лимит запросов (RPD) ниже"
          }
          tone={b.requestsLeftToday !== null && b.requestsLeftToday === 0 ? "bad" : undefined}
        />
        <Tile
          label="Всего потрачено"
          value={usd(ai.allTime.costUsd + ai.legacyCostEstimateUsd)}
          hint={
            ai.legacyTryons > 0
              ? `Включая ≈${usd(ai.legacyCostEstimateUsd)} за ${intFmt.format(ai.legacyTryons)} примерок до точного учёта`
              : `${intFmt.format(ai.allTime.images)} генераций`
          }
        />
      </div>

      <div>
        <p className={LABEL}>Расход по дням · 30 дней</p>
        <div className="mt-2 flex h-36 items-end gap-[3px] border-b border-hair-ink">
          {ai.daily.map((d) => (
            <div
              key={d.day}
              className="group relative flex h-full flex-1 items-end"
              title={`${d.day}: ${usd(d.costUsd)} · ${d.images} генераций · ${d.calls} запросов`}
            >
              <div
                className="w-full bg-clay/80 transition-colors group-hover:bg-clay"
                style={{ height: d.costUsd > 0 ? `${Math.max((d.costUsd / maxDay) * 100, 3)}%` : "0" }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between font-grotesk text-[10px] text-ink-soft">
          <span>{ai.daily[0]?.day.slice(5).split("-").reverse().join(".")}</span>
          <span>макс. {usd(maxDay === 0.0001 ? 0 : maxDay)}/день</span>
          <span>сегодня</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2 font-grotesk text-[13px] text-ink">
          <p className={LABEL}>Здоровье запросов · 7 дней</p>
          <Row label="Успешных генераций" value={intFmt.format(ai.week.images)} />
          <Row label="Оплаченных ответов без картинки" value={intFmt.format(ai.week.billedCalls - ai.week.images)} />
          <Row label="Лимит/квота (429)" value={intFmt.format(ai.week.rateLimited)} warn={ai.week.rateLimited > 0} />
          <Row label="Перегрузка Google (503)" value={intFmt.format(ai.week.overloaded)} />
          <Row label="Прочие сбои и таймауты" value={intFmt.format(ai.week.errors - ai.week.rateLimited - ai.week.overloaded)} />
          {ai.week.rateLimited > 0 && (
            <p className="text-[12px] leading-relaxed text-amber-800">
              Ошибки 429 означают, что упёрлись в лимит запросов или закончился баланс — проверьте квоты в AI Studio.
            </p>
          )}
        </div>
        <div className="space-y-2 font-grotesk text-[13px] text-ink">
          <p className={LABEL}>По моделям · 30 дней</p>
          {ai.byModel.length === 0 ? (
            <p className="text-ink-soft">Нет запросов.</p>
          ) : (
            ai.byModel.map((m) => (
              <Row key={m.model} label={m.model} value={`${usd(m.costUsd)} · ${intFmt.format(m.images)} шт.`} />
            ))
          )}
          <Row label="FASHN (генерация модели), кредитов за месяц" value={intFmt.format(ai.fashnCreditsMonth)} />
        </div>
      </div>

      <BudgetForm settings={ai.settings} balanceSpent={b.balanceSpentUsd} onSaved={onSaved} notify={notify} />

      <p className="font-grotesk text-[12px] leading-relaxed text-ink-soft">
        Стоимость считается по токенам из ответов Gemini и официальному прайсу (Nano Banana Pro ≈ $0.134 за картинку 1K,
        запасная 2.5 Flash Image ≈ $0.039). Google не отдаёт остаток баланса через API, поэтому «осталось» — это расчёт от
        суммы, которую вы вписали. Точный счёт — в Google Cloud Billing / AI Studio. Точный учёт ведётся с{" "}
        {formatDate(ai.trackingSince)}.
      </p>
    </section>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hair-ink/60 pb-1.5">
      <span className="text-ink-soft">{label}</span>
      <span className={warn ? "font-medium text-amber-800" : ""}>{value}</span>
    </div>
  );
}

function BudgetForm({
  settings,
  balanceSpent,
  onSaved,
  notify,
}: {
  settings: Settings;
  balanceSpent: number;
  onSaved: () => void;
  notify: (kind: "ok" | "err", text: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parse = (key: string) => {
      const raw = String(fd.get(key) ?? "").replace(",", ".").trim();
      return raw === "" ? null : Number(raw);
    };
    const body = {
      monthlyBudgetUsd: parse("monthlyBudgetUsd"),
      balanceUsd: parse("balanceUsd"),
      dailyRequestLimit: parse("dailyRequestLimit"),
      usdToKzt: parse("usdToKzt"),
    };
    if (Object.values(body).some((v) => v !== null && (!Number.isFinite(v) || v < 0))) {
      notify("err", "Введите неотрицательные числа");
      return;
    }
    if (body.dailyRequestLimit !== null) body.dailyRequestLimit = Math.round(body.dailyRequestLimit);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify("err", data.message ?? "Не удалось сохранить");
        return;
      }
      notify("ok", "Настройки бюджета сохранены");
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-hair-ink p-5">
      <p className={LABEL}>Лимиты и бюджет</p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label>
          <span className={LABEL}>Остаток на счёте Google, $</span>
          <input name="balanceUsd" inputMode="decimal" defaultValue={settings.balanceUsd ?? ""} placeholder="напр. 50" className={FIELD} />
          <span className="mt-1 block font-grotesk text-[11px] leading-snug text-ink-soft">
            {settings.balanceSetAt
              ? `Указан ${formatDate(settings.balanceSetAt)}, с тех пор потрачено ${usd(balanceSpent)}`
              : "После пополнения впишите новый остаток"}
          </span>
        </label>
        <label>
          <span className={LABEL}>Бюджет в месяц, $</span>
          <input
            name="monthlyBudgetUsd"
            inputMode="decimal"
            defaultValue={settings.monthlyBudgetUsd ?? ""}
            placeholder="напр. 30"
            className={FIELD}
          />
          <span className="mt-1 block font-grotesk text-[11px] leading-snug text-ink-soft">Свой потолок трат</span>
        </label>
        <label>
          <span className={LABEL}>Лимит запросов в день (RPD)</span>
          <input
            name="dailyRequestLimit"
            inputMode="numeric"
            defaultValue={settings.dailyRequestLimit ?? ""}
            placeholder="из AI Studio"
            className={FIELD}
          />
          <span className="mt-1 block font-grotesk text-[11px] leading-snug text-ink-soft">
            AI Studio → Usage → Rate limits
          </span>
        </label>
        <label>
          <span className={LABEL}>Курс $ → ₸</span>
          <input name="usdToKzt" inputMode="decimal" defaultValue={settings.usdToKzt ?? ""} placeholder="напр. 500" className={FIELD} />
          <span className="mt-1 block font-grotesk text-[11px] leading-snug text-ink-soft">Чтобы видеть суммы в тенге</span>
        </label>
      </div>
      <button type="submit" disabled={busy} className={BTN + " mt-5"}>
        {busy ? "Сохраняю…" : "Сохранить"}
      </button>
    </form>
  );
}
