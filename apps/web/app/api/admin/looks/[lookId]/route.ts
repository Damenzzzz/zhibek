import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems, looks, tryonHistory } from "@/lib/schema";
import { isAdminRequest } from "@/lib/adminAuth";
import { saveImageFile, UploadError } from "@/lib/adminUploads";

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

// Редактирует метаданные образа (заголовок/обложка/порядок). Если строки образа
// ещё нет (например, у pipeline-образа обложка была файлом на диске) — создаёт
// её, чтобы можно было задать обложку/заголовок и таким образам.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ lookId: string }> }) {
  if (!isAdminRequest(request)) return unauthorized();
  const { lookId } = await params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_body", message: "Ожидается multipart/form-data" }, { status: 400 });
  }

  let coverPath: string | null = null;
  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    try {
      coverPath = await saveImageFile(cover);
    } catch (err) {
      if (err instanceof UploadError) {
        return NextResponse.json({ error: "invalid_photo", message: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  const sortRaw = trimmedOrNull(formData.get("sort_index"));
  const values = {
    title: formData.has("title") ? trimmedOrNull(formData.get("title")) : undefined,
    coverPath: coverPath ?? undefined,
    sortIndex:
      sortRaw !== null && Number.isFinite(Number(sortRaw)) ? Math.trunc(Number(sortRaw)) : undefined,
  };

  const [look] = await db
    .insert(looks)
    .values({
      id: lookId,
      title: values.title ?? null,
      coverPath: values.coverPath ?? null,
      sortIndex: values.sortIndex ?? 0,
      source: "admin",
    })
    .onConflictDoUpdate({
      target: looks.id,
      set: Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== undefined)
      ),
    })
    .returning();

  return NextResponse.json({ look });
}

// Удаляет образ целиком: строку метаданных И все товары этого look_id.
// ?keepItems=1 — удалить только метаданные образа, оставив товары в каталоге.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ lookId: string }> }) {
  if (!isAdminRequest(request)) return unauthorized();
  const { lookId } = await params;
  const keepItems = request.nextUrl.searchParams.get("keepItems") === "1";

  let deletedItems = 0;
  await db.transaction(async (tx) => {
    if (!keepItems) {
      const items = await tx
        .select({ id: catalogItems.id })
        .from(catalogItems)
        .where(eq(catalogItems.lookId, lookId));
      const ids = items.map((i) => i.id);
      for (const itemId of ids) {
        for (const column of ["topItemId", "bottomItemId", "shoesItemId", "bagItemId"] as const) {
          await tx.update(tryonHistory).set({ [column]: null }).where(eq(tryonHistory[column], itemId));
        }
      }
      const result = await tx.delete(catalogItems).where(eq(catalogItems.lookId, lookId));
      deletedItems = result.rowsAffected ?? 0;
    }
    await tx.delete(looks).where(eq(looks.id, lookId));
  });

  return NextResponse.json({ ok: true, deletedItems });
}
