"use client";

import Link from "next/link";
import { useFittingRoomIds } from "@/lib/fittingRoomStorage";

export function FittingRoomNavLink() {
  const count = useFittingRoomIds().length;

  return (
    <Link href="/fitting-room" className="transition-colors hover:text-accent">
      Примерочная{count > 0 && <span className="text-accent"> ({count})</span>}
    </Link>
  );
}
