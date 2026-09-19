import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";

// Админка не индексируется и рендерится по запросу — доступ по прямому URL,
// в публичную навигацию не выводится (см. components/SiteHeader.tsx).
export const metadata: Metadata = {
  title: "SILK — админка каталога",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <div className="flex flex-1 flex-col bg-canvas pt-24">
      <AdminApp />
    </div>
  );
}
