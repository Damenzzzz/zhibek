import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { privacyRequests } from "@/lib/schema";
import { hashRequestIp } from "@/lib/tryonLimit";
import { PRIVACY_VERSION } from "@/lib/privacy";
export const runtime = "nodejs";
const schema = z
  .object({
    type: z.enum(["access", "delete", "withdraw", "correct"]),
    userId: z.string().trim().max(64).optional(),
    email: z.union([z.email(), z.literal("")]).optional(),
    message: z.string().trim().min(10).max(2000),
    consentVersion: z.literal(PRIVACY_VERSION),
    consent: z.literal(true),
  })
  .refine((value) => Boolean(value.email || value.userId), {
    message: "Укажи email или ID анкеты",
  });
export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null);
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Проверь поля обращения" },
      { status: 400 },
    );
  const ipHash = hashRequestIp(request);
  if (ipHash) {
    const [recent] = await db
      .select({ count: count() })
      .from(privacyRequests)
      .where(
        and(
          eq(privacyRequests.ipHash, ipHash),
          gte(
            privacyRequests.createdAt,
            new Date(Date.now() - 3600000).toISOString(),
          ),
        ),
      );
    if (recent.count >= 5)
      return NextResponse.json(
        { message: "Слишком много обращений. Попробуй через час." },
        { status: 429 },
      );
  }
  const [record] = await db
    .insert(privacyRequests)
    .values({
      ...parsed.data,
      userId: parsed.data.userId || null,
      email: parsed.data.email || null,
      ipHash,
    })
    .returning({ id: privacyRequests.id });
  return NextResponse.json(
    {
      id: record.id,
      message: "Обращение сохранено для администратора. Сохрани его номер.",
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
