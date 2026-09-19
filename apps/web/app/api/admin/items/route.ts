import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems, looks } from "@/lib/schema";
import { CATEGORIES, isCatalogCategory } from "@/lib/categories";
import { isAdminRequest } from "@/lib/adminAuth";
import { saveImagesFromForm, UploadError } from "@/lib/adminUploads";

export const runtime = "nodejs";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized", message: "Нужен вход в админку" }, { status: 401 });
}

// Полный список товаров и образов для дашборда админки. Обычный /api/catalog
// не отдаёт служебные поля (source/sortIndex) и не включает образы.
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return unauthorized();

  const [items, lookRows] = await Promise.all([
    db.select().from(catalogItems).orderBy(asc(catalogItems.sortIndex), asc(catalogItems.id)),
    db.select().from(looks).orderBy(asc(looks.sortIndex), desc(looks.createdAt)),
  ]);

  return NextResponse.json({ items, looks: lookRows });
}

function trimmedOrNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return unauthorized();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Ожидается multipart/form-data" },
      { status: 400 }
    );
  }

  const category = trimmedOrNull(formData.get("category"));
  if (!category || !isCatalogCategory(category)) {
    return NextResponse.json(
      { error: "invalid_category", message: `Категория обязательна и должна быть одной из: ${CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }

  let images: string[];
  try {
    images = await saveImagesFromForm(formData);
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: "invalid_photo", message: err.message }, { status: 400 });
    }
    throw err;
  }

  if (images.length === 0) {
    return NextResponse.json(
      { error: "no_images", message: "Загрузите хотя бы одно фото товара" },
      { status: 400 }
    );
  }

  const id = `admin-${randomUUID()}`;
  const lookId = trimmedOrNull(formData.get("look_id")) ?? id;
  const sortRaw = trimmedOrNull(formData.get("sort_index"));
  const sortIndex = sortRaw !== null && Number.isFinite(Number(sortRaw)) ? Math.trunc(Number(sortRaw)) : 0;

  const [item] = await db
    .insert(catalogItems)
    .values({
      id,
      sku: trimmedOrNull(formData.get("sku")),
      category,
      color: trimmedOrNull(formData.get("color")),
      description: trimmedOrNull(formData.get("description")),
      imagePath: images[0],
      images: JSON.stringify(images),
      lookId,
      sourcePhoto: "admin",
      source: "admin",
      sortIndex,
    })
    .returning();

  return NextResponse.json({ item }, { status: 201 });
}
