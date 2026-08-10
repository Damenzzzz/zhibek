import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { generateModelFromDescription, FashnApiError } from "@/lib/fashn";

const profileFieldsSchema = z.object({
  height_cm: z.coerce.number().int().min(50).max(250),
  weight_kg: z.coerce.number().min(20).max(300),
  body_type: z.string().trim().min(1),
  gender: z.string().trim().min(1),
});

const PHOTO_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

async function saveBufferToUploads(buffer: Buffer, ext: string): Promise<string> {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

async function downloadGeneratedModel(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new FashnApiError("ModelDownloadFailed", "Не удалось скачать сгенерированную модель");
  }
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
  const ext = PHOTO_MIME_TO_EXT[contentType] ?? "jpg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return saveBufferToUploads(buffer, ext);
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Ожидается multipart/form-data" },
      { status: 400 }
    );
  }

  const fieldsResult = profileFieldsSchema.safeParse({
    height_cm: formData.get("height_cm"),
    weight_kg: formData.get("weight_kg"),
    body_type: formData.get("body_type"),
    gender: formData.get("gender"),
  });

  if (!fieldsResult.success) {
    return NextResponse.json(
      {
        error: "invalid_fields",
        message: "Проверь анкету: рост/вес/телосложение/пол",
        details: z.treeifyError(fieldsResult.error),
      },
      { status: 400 }
    );
  }

  const { height_cm, weight_kg, body_type, gender } = fieldsResult.data;

  // Фото необязательно (см. Этап 5 плана: у пользователя может не быть фото,
  // тогда модель генерируется отдельно через FASHN). Отсутствие файла — это
  // не ошибка. Но если файл прислан и он не картинка — это отдельная ошибка,
  // не связанная с текстовыми полями анкеты.
  const photo = formData.get("photo");
  const noPhoto = formData.get("no_photo") === "true";
  let photoPath: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    const ext = PHOTO_MIME_TO_EXT[photo.type];
    if (!ext) {
      return NextResponse.json(
        {
          error: "invalid_photo",
          message: "Фото должно быть в формате JPEG, PNG или WebP",
        },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await photo.arrayBuffer());
    photoPath = await saveBufferToUploads(buffer, ext);
  } else if (photo !== null && !(photo instanceof File)) {
    return NextResponse.json(
      { error: "invalid_photo", message: "Поле photo должно быть файлом" },
      { status: 400 }
    );
  } else if (noPhoto) {
    // Переключатель "у меня нет фото" — генерируем модель по описанию через
    // FASHN (платный вызов) и пересохраняем результат локально, чтобы photoPath
    // всегда указывал на наш /uploads, независимо от источника фото.
    try {
      const generatedUrl = await generateModelFromDescription(height_cm, weight_kg, body_type, gender);
      photoPath = await downloadGeneratedModel(generatedUrl);
    } catch (err) {
      if (err instanceof FashnApiError) {
        return NextResponse.json({ error: err.code, message: err.message }, { status: 502 });
      }
      throw err;
    }
  }

  const [user] = await db
    .insert(users)
    .values({
      heightCm: height_cm,
      weightKg: weight_kg,
      bodyType: body_type,
      gender,
      photoPath,
    })
    .returning();

  return NextResponse.json({ user }, { status: 201 });
}
