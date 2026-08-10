import { NextResponse } from "next/server";
import { getMatchingItems } from "@/lib/matching";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const items = await getMatchingItems(id);
  return NextResponse.json({ items });
}
