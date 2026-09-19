import "server-only";
import type { NextRequest } from "next/server";

// Простая защита админки (/admin) без аккаунтов: один пароль в ADMIN_PASSWORD.
// После входа кладём его в httpOnly-cookie, а API-роуты сверяют cookie с
// переменной окружения. Этого достаточно для персональной панели управления
// каталогом; полноценная авторизация в проекте не предусмотрена (см. CLAUDE.md).
export const ADMIN_COOKIE = "silk_admin";

// В проде пароль ОБЯЗАТЕЛЕН (иначе админка выключена). Локально, если переменная
// не задана, разрешаем дефолтный пароль "admin" — чтобы можно было сразу зайти
// в dev без настройки .env. На Vercel этот fallback не действует.
export function getAdminPassword(): string | null {
  const fromEnv = process.env.ADMIN_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  return process.env.VERCEL ? null : "admin";
}

export function adminEnabled(): boolean {
  return getAdminPassword() !== null;
}

// Сравнение постоянного времени, чтобы не подсказывать длину/префикс пароля по
// времени ответа.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkPassword(candidate: string): boolean {
  const password = getAdminPassword();
  return password !== null && safeEqual(candidate, password);
}

export function isAdminRequest(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  return typeof token === "string" && checkPassword(token);
}
