import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItems } from "@/lib/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lookId: string }> }
) {
  const { lookId } = await params;

  const items = await db.select().from(catalogItems).where(eq(catalogItems.lookId, lookId));

  if (items.length === 0) {
    return NextResponse.json(
      { error: "not_found", message: `Образ ${lookId} не найден` },
      { status: 404 }
    );
  }

  return NextResponse.json({ lookId, items });
}
