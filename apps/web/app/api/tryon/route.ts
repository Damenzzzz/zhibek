import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems, tryonHistory, users } from "@/lib/schema";
import { catalogImageUrl } from "@/lib/catalogDisplay";
import { tryOnWithGemini, GeminiApiError, type TryOnGarments } from "@/lib/gemini";
import { saveUpload } from "@/lib/storage";
import { getTryonUsage, hashRequestIp, TRYON_DAILY_LIMIT } from "@/lib/tryonLimit";

// Примерка = один вызов Gemini image-генерации (обычно 15–40 c, с холодным
// стартом/ретраем — дольше). По умолчанию serverless-функция Vercel обрывается
// намного раньше, из-за чего примерка «иногда вообще не работает». Поднимаем
// потолок и фиксируем nodejs-рантайм (нужен Buffer/сеть к Gemini).
export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z
  .object({
    userId: z.string().min(1),
    // outerwearItemId нужен для «полного образа»: жилет/жакет надевается
    // ПОВЕРХ верха (блузки/рубашки) — это отдельный слот, а не альтернатива
    // топу. В режиме «по частям» он не передаётся (там верх+верхняя одежда в
    // одной ленте и занимают один слот topItemId).
    outerwearItemId: z.string().min(1).optional(),
    topItemId: z.string().min(1).optional(),
    bottomItemId: z.string().min(1).optional(),
    shoesItemId: z.string().min(1).optional(),
    bagItemId: z.string().min(1).optional(),
  })
  .refine(
    (data) =>
      data.outerwearItemId || data.topItemId || data.bottomItemId || data.shoesItemId || data.bagItemId,
    { message: "Выбери хотя бы один предмет" }
  );

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body", message: "Ожидается JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_fields", message: parsed.error.issues[0]?.message ?? "Некорректные данные" },
      { status: 400 }
    );
  }
  const { userId, outerwearItemId, topItemId, bottomItemId, shoesItemId, bagItemId } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return NextResponse.json({ error: "user_not_found", message: "Профиль не найден" }, { status: 404 });
  }
  if (!user.photoPath) {
    return NextResponse.json(
      { error: "no_model_photo", message: "В профиле нет фото для примерки — заполни анкету заново" },
      { status: 400 }
    );
  }

  // Суточный лимит примерок (см. lib/tryonLimit.ts): проверяем ДО платного
  // вызова Gemini. Считаем по профилю И по IP, поэтому лимит не обходится
  // сбросом localStorage/новой анкетой. 429 — стандартный статус «слишком часто».
  const ipHash = hashRequestIp(request);
  const usage = await getTryonUsage(userId, ipHash);
  if (usage.remaining <= 0) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `Лимит примерок на сегодня исчерпан (${TRYON_DAILY_LIMIT} в день). Возвращайся завтра.`,
        usage,
      },
      { status: 429 }
    );
  }

  const [outerwearItem, topItem, bottomItem, shoesItem, bagItem] = await Promise.all([
    outerwearItemId
      ? db.select().from(catalogItems).where(eq(catalogItems.id, outerwearItemId)).then((r) => r[0])
      : undefined,
    topItemId ? db.select().from(catalogItems).where(eq(catalogItems.id, topItemId)).then((r) => r[0]) : undefined,
    bottomItemId
      ? db.select().from(catalogItems).where(eq(catalogItems.id, bottomItemId)).then((r) => r[0])
      : undefined,
    shoesItemId
      ? db.select().from(catalogItems).where(eq(catalogItems.id, shoesItemId)).then((r) => r[0])
      : undefined,
    bagItemId ? db.select().from(catalogItems).where(eq(catalogItems.id, bagItemId)).then((r) => r[0]) : undefined,
  ]);
  if (outerwearItemId && !outerwearItem) {
    return NextResponse.json(
      { error: "item_not_found", message: `Товар ${outerwearItemId} не найден` },
      { status: 404 }
    );
  }
  if (topItemId && !topItem) {
    return NextResponse.json({ error: "item_not_found", message: `Товар ${topItemId} не найден` }, { status: 404 });
  }
  if (bottomItemId && !bottomItem) {
    return NextResponse.json({ error: "item_not_found", message: `Товар ${bottomItemId} не найден` }, { status: 404 });
  }
  if (shoesItemId && !shoesItem) {
    return NextResponse.json({ error: "item_not_found", message: `Товар ${shoesItemId} не найден` }, { status: 404 });
  }
  if (bagItemId && !bagItem) {
    return NextResponse.json({ error: "item_not_found", message: `Товар ${bagItemId} не найден` }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  // photoPath — либо локальный относительный путь (/uploads/...), либо уже
  // полный URL Vercel Blob (см. lib/storage.ts) — на проде абсолютные URL
  // прогонять через origin не нужно.
  const modelImageUrl = user.photoPath.startsWith("http") ? user.photoPath : `${origin}${user.photoPath}`;

  // Все выбранные товары накладываются за ОДИН вызов Gemini (см. lib/gemini.ts).
  // Верх-слот может содержать как top, так и outerwear (жилет/жакет) — на фронте
  // они в одной ленте «Верх»; раскладываем по реальной категории товара, чтобы
  // промпт точнее описал вещь.
  const garmentUrl = (imagePath: string) => `${origin}${catalogImageUrl(imagePath)}`;
  const garments: TryOnGarments = {};
  if (outerwearItem) garments.outerwear = garmentUrl(outerwearItem.imagePath);
  if (topItem) {
    // В режиме «по частям» верх и верхняя одежда идут одним слотом topItemId —
    // раскладываем по реальной категории. В «полном образе» верхняя одежда
    // приходит отдельным outerwearItemId, поэтому здесь topItem — это именно top.
    if (topItem.category === "outerwear" && !garments.outerwear) garments.outerwear = garmentUrl(topItem.imagePath);
    else garments.top = garmentUrl(topItem.imagePath);
  }
  if (bottomItem) garments.bottom = garmentUrl(bottomItem.imagePath);
  if (shoesItem) garments.shoes = garmentUrl(shoesItem.imagePath);
  if (bagItem) garments.bag = garmentUrl(bagItem.imagePath);

  try {
    const resultBytes = await tryOnWithGemini(modelImageUrl, garments, {
      gender: user.gender,
      ageRange: user.ageRange,
      skinTone: user.skinTone,
      bodyType: user.bodyType,
    });
    // Gemini отдаёт байты картинки — сохраняем их так же, как загруженные фото:
    // локально в public/uploads, на Vercel — в Blob (см. lib/storage.ts).
    const resultUrl = await saveUpload(resultBytes, "png", "image/png");

    const [record] = await db
      .insert(tryonHistory)
      .values({
        userId,
        // В tryon_history нет отдельной колонки под верхнюю одежду — если в
        // образе есть и верх, и верхняя одежда, пишем верх; если только
        // верхняя одежда, кладём её в topItemId, чтобы запись не была пустой
        // (важна для истории — сама картинка результата уже сохранена).
        topItemId: topItem?.id ?? outerwearItem?.id ?? null,
        bottomItemId: bottomItem?.id ?? null,
        shoesItemId: shoesItem?.id ?? null,
        bagItemId: bagItem?.id ?? null,
        resultImagePath: resultUrl,
        ipHash,
      })
      .returning();

    // Эта примерка только что записана в историю — уменьшаем остаток на 1,
    // чтобы фронт сразу показал актуальное «осталось сегодня».
    const nextUsage = {
      limit: usage.limit,
      used: usage.used + 1,
      remaining: Math.max(0, usage.remaining - 1),
    };
    return NextResponse.json({ result: record, modelImageUrl, usage: nextUsage });
  } catch (err) {
    if (err instanceof GeminiApiError) {
      // Перегрузка модели — это 503 на стороне Google (не наша ошибка).
      // Отдаём 503 + Retry-After, чтобы фронт мог предложить повтор позже.
      if (err.code === "ModelOverloaded") {
        return NextResponse.json(
          { error: err.code, message: err.message },
          { status: 503, headers: { "Retry-After": "60" } }
        );
      }
      return NextResponse.json({ error: err.code, message: err.message }, { status: 502 });
    }
    throw err;
  }
}
