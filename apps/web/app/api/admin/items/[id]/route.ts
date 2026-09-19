import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems, tryonHistory } from "@/lib/schema";
import { CATEGORIES, isCatalogCategory } from "@/lib/categories";
import { isAdminRequest } from "@/lib/adminAuth";
import { saveImagesFromForm, UploadError } from "@/lib/adminUploads";

export const runtime = "nodejs";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized", message: "Нужен вход в админку" }, { status: 401 });
}

function trimmedOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Редактирование товара. multipart/form-data: любое присутствующее поле
// обновляется; если приложены новые фото (images) — они ЗАМЕНЯЮТ набор ракурсов.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await params;

  const [existing] = await db.select().from(catalogItems).where(eq(catalogItems.id, id));
  if (!existing) {
    return NextResponse.json({ error: "not_found", message: `Товар ${id} не найден` }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_body", message: "Ожидается multipart/form-data" }, { status: 400 });
  }

  const update: Partial<typeof catalogItems.$inferInsert> = {};

  if (formData.has("category")) {
    const category = trimmedOrNull(formData.get("category"));
    if (!category || !isCatalogCategory(category)) {
      return NextResponse.json(
        { error: "invalid_category", message: `Категория должна быть одной из: ${CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }
    update.category = category;
  }
  if (formData.has("color")) update.color = trimmedOrNull(formData.get("color"));
  if (formData.has("description")) update.description = trimmedOrNull(formData.get("description"));
  if (formData.has("sku")) update.sku = trimmedOrNull(formData.get("sku"));
  if (formData.has("look_id")) update.lookId = trimmedOrNull(formData.get("look_id")) ?? id;
  if (formData.has("sort_index")) {
    const sortRaw = trimmedOrNull(formData.get("sort_index"));
    update.sortIndex = sortRaw !== null && Number.isFinite(Number(sortRaw)) ? Math.trunc(Number(sortRaw)) : 0;
  }

  const hasNewImages = formData.getAll("images").some((v) => v instanceof File && v.size > 0);
  if (hasNewImages) {
    let images: string[];
    try {
      images = await saveImagesFromForm(formData);
    } catch (err) {
      if (err instanceof UploadError) {
        return NextResponse.json({ error: "invalid_photo", message: err.message }, { status: 400 });
      }
      throw err;
    }
    update.imagePath = images[0];
    update.images = JSON.stringify(images);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ item: existing });
  }

  const [item] = await db
    .update(catalogItems)
    .set(update)
    .where(eq(catalogItems.id, id))
    .returning();

  return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await params;

  const [existing] = await db.select().from(catalogItems).where(eq(catalogItems.id, id));
  if (!existing) {
    return NextResponse.json({ error: "not_found", message: `Товар ${id} не найден` }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    // tryon_history ссылается на товар четырьмя FK — обнуляем ссылки перед
    // удалением, иначе DELETE упадёт с FOREIGN KEY constraint failed.
    for (const column of ["topItemId", "bottomItemId", "shoesItemId", "bagItemId"] as const) {
      await tx.update(tryonHistory).set({ [column]: null }).where(eq(tryonHistory[column], id));
    }
    await tx.delete(catalogItems).where(eq(catalogItems.id, id));
  });

  return NextResponse.json({ ok: true, deleted: id });
}
