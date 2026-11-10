import type { Metadata, Viewport } from "next";
import { Noto_Serif_Display, Golos_Text } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";

// Пара на весь сайт: Noto Serif Display — контрастная дидона с кириллицей,
// вариативным весом и курсивом (курсив терракотой — главный акцент в
// заголовках). Golos Text — кириллический гротеск под подписи и текст.
// Prata заменена: у неё одно начертание без курсива, а капс ею читался плохо.
const serifDisplay = Noto_Serif_Display({
  variable: "--font-serif-display",
  subsets: ["latin", "cyrillic"],
  style: ["normal", "italic"],
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
      className={`${serifDisplay.variable} ${golos.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
