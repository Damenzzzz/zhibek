export const PRIVACY_VERSION = "2026-10-15";
export const PRIVACY_CHOICE_KEY = "silk:privacy-choice";
export const PRIVACY_CHANGED_EVENT = "silk:privacy-changed";
export interface PrivacyChoice {
  version: string;
  analytics: boolean;
  updatedAt: string;
}
export function parsePrivacyChoice(raw: string | null): PrivacyChoice | null {
  try {
    const value = JSON.parse(raw ?? "null");
    return value &&
      value.version === PRIVACY_VERSION &&
      typeof value.analytics === "boolean" &&
      typeof value.updatedAt === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
