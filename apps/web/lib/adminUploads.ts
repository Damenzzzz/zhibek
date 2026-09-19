import "server-only";
import { saveUpload } from "./storage";

export const IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class UploadError extends Error {}

// Сохраняет один файл-картинку через storage.saveUpload (/uploads локально,
// Vercel Blob в проде) и возвращает публичный путь/URL. Бросает UploadError с
// понятным текстом при неверном формате.
export async function saveImageFile(file: File): Promise<string> {
  const ext = IMAGE_MIME_TO_EXT[file.type];
  if (!ext) {
    throw new UploadError("Фото должно быть в формате JPEG, PNG или WebP");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return saveUpload(buffer, ext, file.type);
}

// Достаёт все файлы поля формы (name="images", можно несколько), пропуская
// пустые, и сохраняет их по порядку. Возвращает список публичных путей.
export async function saveImagesFromForm(formData: FormData, field = "images"): Promise<string[]> {
  const files = formData
    .getAll(field)
    .filter((v): v is File => v instanceof File && v.size > 0);
  const paths: string[] = [];
  for (const file of files) {
    paths.push(await saveImageFile(file));
  }
  return paths;
}
