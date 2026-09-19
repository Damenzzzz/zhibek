import { NextRequest, NextResponse } from "next/server";
import { adminEnabled, isAdminRequest } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    enabled: adminEnabled(),
    authed: isAdminRequest(request),
  });
}
