import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems, tryonHistory, users } from "@/lib/schema";
import { catalogImageUrl } from "@/lib/catalogDisplay";
import { tryOnGarment, tryOnFullOutfit, FashnApiError } from "@/lib/fashn";

const bodySchema = z
  .object({
    userId: z.string().min(1),
    topItemId: z.string().min(1).optional(),
    bottomItemId: z.string().min(1).optional(),
  })
  .refine((data) => data.topItemId || data.bottomItemId, {
    message: "Выбери хотя бы один предмет — верх или низ",
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
  const { userId, topItemId, bottomItemId } = parsed.data;

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

  const [topItem, bottomItem] = await Promise.all([
    topItemId ? db.select().from(catalogItems).where(eq(catalogItems.id, topItemId)).then((r) => r[0]) : undefined,
    bottomItemId
      ? db.select().from(catalogItems).where(eq(catalogItems.id, bottomItemId)).then((r) => r[0])
      : undefined,
  ]);
  if (topItemId && !topItem) {
    return NextResponse.json({ error: "item_not_found", message: `Товар ${topItemId} не найден` }, { status: 404 });
  }
  if (bottomItemId && !bottomItem) {
    return NextResponse.json({ error: "item_not_found", message: `Товар ${bottomItemId} не найден` }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const modelImageUrl = `${origin}${user.photoPath}`;

  try {
    let resultUrl: string;
    if (topItem && bottomItem) {
      resultUrl = await tryOnFullOutfit(
        modelImageUrl,
        `${origin}${catalogImageUrl(topItem.imagePath)}`,
        `${origin}${catalogImageUrl(bottomItem.imagePath)}`
      );
    } else if (topItem) {
      resultUrl = await tryOnGarment(modelImageUrl, `${origin}${catalogImageUrl(topItem.imagePath)}`, "tops");
    } else {
      resultUrl = await tryOnGarment(modelImageUrl, `${origin}${catalogImageUrl(bottomItem!.imagePath)}`, "bottoms");
    }

    const [record] = await db
      .insert(tryonHistory)
      .values({
        userId,
        topItemId: topItem?.id ?? null,
        bottomItemId: bottomItem?.id ?? null,
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
