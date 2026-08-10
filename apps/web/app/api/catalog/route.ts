import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";
import { CATEGORIES, isCatalogCategory } from "@/lib/categories";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");

  if (category !== null && !isCatalogCategory(category)) {
    return NextResponse.json(
      {
        error: "invalid_category",
        message: `category должен быть одним из: ${CATEGORIES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const items = category
    ? await db.select().from(catalogItems).where(eq(catalogItems.category, category))
    : await db.select().from(catalogItems);

  return NextResponse.json({ items });
}
