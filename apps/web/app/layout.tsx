import type { Metadata } from "next";
import { Prata, Golos_Text } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

// Пара на весь сайт: Prata — контрастная антиква дидоновского толка, живёт
// только на крупном кегле (единственное начертание 400, font-semibold к ней
// применять нельзя — будет синтетический жир). Golos Text — кириллический
// гротеск под подписи и текст. Прежние Unbounded/Onest убраны: после
// редизайна их больше негде использовать, а четыре семейства грузились зря.
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
  title: "SILK — примерка образов",
  description: "Каталог образов и виртуальная примерка одежды SILK",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${prata.variable} ${golos.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
