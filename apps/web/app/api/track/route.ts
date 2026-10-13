import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CLIENT_EVENTS } from "@/lib/analyticsEvents";
import { normalizeVisitorId, recordEvent } from "@/lib/analyticsServer";

export const runtime = "nodejs";

// Приём клиентских событий воронки (lib/analytics.ts). Принимаем только
// «visit» и «look_selected»; анкету и примерку фиксирует сам сервер.
const bodySchema = z.object({
  visitorId: z.string(),
  event: z.enum(CLIENT_EVENTS),
  lookId: z.string().max(64).nullish(),
});

// Поисковые и прочие боты не должны раздувать «зашли на сайт».
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|vercel|lighthouse|headless/i;

export async function POST(request: NextRequest) {
  if (BOT_UA.test(request.headers.get("user-agent") ?? "")) {
    return new NextResponse(null, { status: 204 });
  }
  let json: unknown;
  try {
    json = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  const visitorId = parsed.success ? normalizeVisitorId(parsed.data.visitorId) : null;
  if (!parsed.success || !visitorId) {
    return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  }
  await recordEvent(visitorId, parsed.data.event, { lookId: parsed.data.lookId ?? null });
  return new NextResponse(null, { status: 204 });
}
