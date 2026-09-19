import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { looks } from "@/lib/schema";
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

// Создаёт образ (комплект): заголовок + обложка (модель в полном образе).
// Товары привязываются к образу потом — по его look_id (возвращается в ответе).
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return unauthorized();

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

  const id = trimmedOrNull(formData.get("look_id")) ?? `look-${randomUUID()}`;
  const sortRaw = trimmedOrNull(formData.get("sort_index"));
  const sortIndex = sortRaw !== null && Number.isFinite(Number(sortRaw)) ? Math.trunc(Number(sortRaw)) : 0;

  const [look] = await db
    .insert(looks)
    .values({
      id,
      title: trimmedOrNull(formData.get("title")),
      coverPath,
      sortIndex,
      source: "admin",
    })
    .onConflictDoUpdate({
      target: looks.id,
      set: {
        title: trimmedOrNull(formData.get("title")),
        ...(coverPath ? { coverPath } : {}),
        sortIndex,
      },
    })
    .returning();

  return NextResponse.json({ look }, { status: 201 });
}
