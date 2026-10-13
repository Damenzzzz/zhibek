import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getAdminStats, PERIODS, type Period } from "@/lib/adminStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Статистика для вкладки «Статистика» в админке. ?period=today|7d|30d|month|all
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "unauthorized", message: "Нужен вход в админку" }, { status: 401 });
  }
  const raw = request.nextUrl.searchParams.get("period") ?? "7d";
  const period: Period = (PERIODS as readonly string[]).includes(raw) ? (raw as Period) : "7d";
  const stats = await getAdminStats(period);
  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
}
