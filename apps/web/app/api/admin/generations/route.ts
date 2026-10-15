import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/adminAuth";
import { getAdminGenerations } from "@/lib/adminGenerations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  kind: z.enum(["all", "tryon", "model"]).default("all"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
});
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "unauthorized", message: "Нужен вход в админку" }, { status: 401, headers });
  }
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query", message: "Проверь тип генерации и номер страницы" }, { status: 400, headers });
  }
  return NextResponse.json(await getAdminGenerations(parsed.data.kind, parsed.data.page), { headers });
}
