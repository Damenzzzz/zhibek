import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings, privacyRequests } from "@/lib/schema";
import { isAdminRequest } from "@/lib/adminAuth";
import { getLegalSettings } from "@/lib/legalSettings";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request))
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers },
    );
  const page = Math.max(
    1,
    Math.min(10000, Number(request.nextUrl.searchParams.get("page")) || 1),
  );
  const [settings, rows] = await Promise.all([
    getLegalSettings(),
    db
      .select({
        id: privacyRequests.id,
        userId: privacyRequests.userId,
        email: privacyRequests.email,
        type: privacyRequests.type,
        message: privacyRequests.message,
        status: privacyRequests.status,
        createdAt: privacyRequests.createdAt,
      })
      .from(privacyRequests)
      .orderBy(desc(privacyRequests.createdAt))
      .limit(21)
      .offset((page - 1) * 20),
  ]);
  return NextResponse.json(
    { settings, requests: rows.slice(0, 20), hasMore: rows.length > 20, page },
    { headers },
  );
}
const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("settings"),
    operatorName: z.string().trim().min(2).max(200),
    contactEmail: z.union([z.email(), z.literal("")]),
  }),
  z.object({
    action: z.literal("request"),
    id: z.string().uuid(),
    status: z.enum(["new", "in_progress", "resolved"]),
  }),
]);
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request))
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers },
    );
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { message: "Проверь поля" },
      { status: 400, headers },
    );
  const input = parsed.data;
  if (input.action === "settings") {
    await db.transaction(async (tx) => {
      for (const [key, value] of [
        ["legal_operator_name", input.operatorName],
        ["legal_contact_email", input.contactEmail],
      ])
        await tx
          .insert(appSettings)
          .values({ key, value })
          .onConflictDoUpdate({
            target: appSettings.key,
            set: { value, updatedAt: new Date().toISOString() },
          });
    });
  } else {
    const result = await db
      .update(privacyRequests)
      .set({ status: input.status })
      .where(eq(privacyRequests.id, input.id))
      .returning({ id: privacyRequests.id });
    if (!result.length)
      return NextResponse.json(
        { message: "Обращение не найдено" },
        { status: 404, headers },
      );
  }
  return NextResponse.json({ ok: true }, { headers });
}
