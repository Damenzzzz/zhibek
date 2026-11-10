import type { Metadata } from "next";

// Анкета — клиентский компонент, метаданные задаём здесь.
export const metadata: Metadata = {
  title: "Анкета для примерки",
  description:
    "Загрузи фото в полный рост или создай модель по параметрам — на ней будем примерять образы.",
  robots: { index: false },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
