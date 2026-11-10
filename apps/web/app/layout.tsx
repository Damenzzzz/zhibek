import type { Metadata, Viewport } from "next";
import { Tenor_Sans, Golos_Text } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";

// Пара на весь сайт: Tenor Sans — тонкий «журнальный» гротеск для логотипа и
// заголовков (одно начертание 400, курсива нет — font-medium/italic к нему не
// применять, будет синтетика). Golos Text — кириллический гротеск под текст.
const tenor = Tenor_Sans({
  variable: "--font-tenor",
  subsets: ["latin", "cyrillic"],
  weight: "400",
  display: "swap",
});

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Fashion — примерка образов",
  description: "Каталог образов и виртуальная примерка одежды Smart Fashion",
};

export const viewport: Viewport = {
  themeColor: "#f7f1e7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${tenor.variable} ${golos.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div aria-hidden className="scroll-progress" />
        <SiteHeader />
        <div
          id="page-content"
          tabIndex={-1}
          className="flex flex-1 flex-col outline-none"
        >
          {children}
        </div>
        <SiteFooter />
        <AnalyticsTracker />
      </body>
    </html>
  );
}
