import type { Metadata } from "next";
import { Unbounded, Onest } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

// Жирный геометричный гротеск с поддержкой кириллицы для заголовков —
// замена прежнего серифного Cormorant в рамках редизайна (см. план:
// "устаревший" молочный стиль → современный высококонтрастный минимал).
const displayFont = Unbounded({
  variable: "--font-display-src",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ZHIBEK — примерка образов",
  description: "Каталог образов и виртуальная примерка одежды ZHIBEK",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${displayFont.variable} ${onest.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
