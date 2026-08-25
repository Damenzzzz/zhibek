import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tryonHistory } from "@/lib/schema";
import { getTryonUsage, hashRequestIp } from "@/lib/tryonLimit";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "invalid_query", message: "Нужен параметр userId" }, { status: 400 });
  }

  const items = await db
    .select()
    .from(tryonHistory)
    .where(eq(tryonHistory.userId, userId))
    .orderBy(desc(tryonHistory.createdAt));

  // Остаток суточного лимита (профиль + IP) — фронт показывает «осталось
  // сегодня» ещё до первой примерки в этой сессии.
  const usage = await getTryonUsage(userId, hashRequestIp(request));

  return NextResponse.json({ items, usage });
}
