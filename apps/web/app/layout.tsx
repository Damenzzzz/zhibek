import type { Metadata } from "next";
import { Unbounded, Onest, Prata, Golos_Text } from "next/font/google";
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

// Пара шрифтов editorial-слоя главной (см. globals.css). Prata — контрастная
// антиква дидоновского толка: работает только на крупном кегле, ради него и
// взята. Golos Text — кириллический гротеск под подписи и текст.
// Unbounded/Onest выше остаются за остальными разделами.
const prata = Prata({
  variable: "--font-prata",
  subsets: ["latin", "cyrillic"],
  weight: ["400"],
});

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "ZHIBEK — примерка образов",
  description: "Каталог образов и виртуальная примерка одежды ZHIBEK",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${displayFont.variable} ${onest.variable} ${prata.variable} ${golos.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
