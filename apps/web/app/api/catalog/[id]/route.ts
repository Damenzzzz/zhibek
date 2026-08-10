import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [item] = await db.select().from(catalogItems).where(eq(catalogItems.id, id));

  if (!item) {
    return NextResponse.json({ error: "not_found", message: `Товар ${id} не найден` }, { status: 404 });
  }

  return NextResponse.json({ item });
}
