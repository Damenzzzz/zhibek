import { NextResponse } from "next/server";
import { stat, readFile } from "fs/promises";
import path from "path";

const CATALOG_DIR = path.resolve(process.cwd(), "..", "..", "data", "catalog");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const resolved = path.resolve(CATALOG_DIR, ...segments);

  // Не выпускаем за пределы data/catalog (защита от path traversal через ../).
  if (resolved !== CATALOG_DIR && !resolved.startsWith(CATALOG_DIR + path.sep)) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  const contentType = CONTENT_TYPES[path.extname(resolved).toLowerCase()];
  if (!contentType) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  }

  try {
    await stat(resolved);
    const file = await readFile(resolved);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
