import type { Metadata } from "next";

// Страница подборки — клиентский компонент, метаданные задаём здесь.
export const metadata: Metadata = {
  title: "Моя подборка",
  description: "Вещи, которые ты сохранил в примерочную Smart Fashion.",
  robots: { index: false },
};

export default function FittingRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
