import "server-only";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Локально пишем в public/uploads — Next.js отдаёт их статикой. На Vercel
// файловая система serverless-функций не хранит файлы между запросами,
// поэтому там (когда задан BLOB_READ_WRITE_TOKEN) грузим в Vercel Blob и
// возвращаем уже полный публичный URL.
export async function saveUpload(buffer: Buffer, ext: string, contentType: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${randomUUID()}.${ext}`, buffer, {
      access: "public",
      contentType,
    });
    return blob.url;
  }

  await mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);
  return `/uploads/${filename}`;
}
