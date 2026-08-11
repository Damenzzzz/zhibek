import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems, tryonHistory, users } from "@/lib/schema";
import { catalogImageUrl } from "@/lib/catalogDisplay";
import { tryOnGarment, tryOnFullOutfit, tryOnAccessory, FashnApiError } from "@/lib/fashn";

const bodySchema = z
  .object({
    userId: z.string().min(1),
    topItemId: z.string().min(1).optional(),
    bottomItemId: z.string().min(1).optional(),
    shoesItemId: z.string().min(1).optional(),
    bagItemId: z.string().min(1).optional(),
  })
  .refine((data) => data.topItemId || data.bottomItemId || data.shoesItemId || data.bagItemId, {
    message: "Выбери хотя бы один предмет",
  });

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
  const { userId, topItemId, bottomItemId, shoesItemId, bagItemId } = parsed.data;

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

  const [topItem, bottomItem, shoesItem, bagItem] = await Promise.all([
    topItemId ? db.select().from(catalogItems).where(eq(catalogItems.id, topItemId)).then((r) => r[0]) : undefined,
    bottomItemId
      ? db.select().from(catalogItems).where(eq(catalogItems.id, bottomItemId)).then((r) => r[0])
      : undefined,
    shoesItemId
      ? db.select().from(catalogItems).where(eq(catalogItems.id, shoesItemId)).then((r) => r[0])
      : undefined,
    bagItemId ? db.select().from(catalogItems).where(eq(catalogItems.id, bagItemId)).then((r) => r[0]) : undefined,
  ]);
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

  try {
    // Последовательная цепочка: одежда (дешёвый tryon-v1.6) → обувь → сумка
    // (обе — tryon-max, единственная модель FASHN с поддержкой аксессуаров).
    // Каждый следующий шаг накладывается поверх результата предыдущего.
    let currentImage = modelImageUrl;

    if (topItem && bottomItem) {
      currentImage = await tryOnFullOutfit(
        currentImage,
        `${origin}${catalogImageUrl(topItem.imagePath)}`,
        `${origin}${catalogImageUrl(bottomItem.imagePath)}`
      );
    } else if (topItem) {
      currentImage = await tryOnGarment(currentImage, `${origin}${catalogImageUrl(topItem.imagePath)}`, "tops");
    } else if (bottomItem) {
      currentImage = await tryOnGarment(currentImage, `${origin}${catalogImageUrl(bottomItem.imagePath)}`, "bottoms");
    }

    if (shoesItem) {
      currentImage = await tryOnAccessory(currentImage, `${origin}${catalogImageUrl(shoesItem.imagePath)}`);
    }
    if (bagItem) {
      currentImage = await tryOnAccessory(currentImage, `${origin}${catalogImageUrl(bagItem.imagePath)}`);
    }

    const resultUrl = currentImage;

    const [record] = await db
      .insert(tryonHistory)
      .values({
        userId,
        topItemId: topItem?.id ?? null,
        bottomItemId: bottomItem?.id ?? null,
        shoesItemId: shoesItem?.id ?? null,
        bagItemId: bagItem?.id ?? null,
        resultImagePath: resultUrl,
      })
      .returning();

    return NextResponse.json({ result: record, modelImageUrl });
  } catch (err) {
    if (err instanceof FashnApiError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 502 });
    }
    throw err;
  }
}
