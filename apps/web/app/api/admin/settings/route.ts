import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/adminAuth";
import { getBudgetSettings, saveBudgetSettings } from "@/lib/adminStats";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized", message: "Нужен вход в админку" }, { status: 401 });
}

// null — очистить значение; отсутствие ключа — не трогать.
const amount = z.number().min(0).max(1_000_000).nullable().optional();
const bodySchema = z.object({
  monthlyBudgetUsd: amount,
  balanceUsd: amount,
  dailyRequestLimit: z.number().int().min(0).max(10_000_000).nullable().optional(),
  usdToKzt: amount,
});

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return unauthorized();
  return NextResponse.json({ settings: await getBudgetSettings() });
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return unauthorized();
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body", message: "Ожидается JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_fields", message: parsed.error.issues[0]?.message ?? "Некорректные данные" },
      { status: 400 }
    );
  }
  await saveBudgetSettings(parsed.data);
  return NextResponse.json({ settings: await getBudgetSettings() });
}
