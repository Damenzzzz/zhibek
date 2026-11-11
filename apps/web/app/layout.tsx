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

// Абсолютные адреса для превью в соцсетях и мессенджерах. На Vercel берём
// домен продакшена из системной переменной, иначе — текущий адрес сайта.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://web-eight-lake-89.vercel.app";

const description =
  "Виртуальная примерочная с AI: выбирай готовые образы и смотри, как они сидят на тебе — со своим фото или моделью по анкете. Без регистрации.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Smart Fashion — виртуальная примерочная с AI",
    template: "%s — Smart Fashion",
  },
  description,
  applicationName: "Smart Fashion",
  keywords: [
    "виртуальная примерка",
    "примерка одежды онлайн",
    "AI примерочная",
    "готовые образы",
    "Smart Fashion",
  ],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Smart Fashion",
    title: "Smart Fashion — найди образ, узнай себя",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Fashion — найди образ, узнай себя",
    description,
  },
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
