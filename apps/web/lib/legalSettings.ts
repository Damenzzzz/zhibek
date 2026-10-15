import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "./db";
import { appSettings } from "./schema";
export async function getLegalSettings() {
  const rows = await db
    .select()
    .from(appSettings)
    .where(
      inArray(appSettings.key, ["legal_operator_name", "legal_contact_email"]),
    );
  const values = new Map(rows.map((row) => [row.key, row.value]));
  return {
    operatorName: values.get("legal_operator_name") || "Проект Smart Fashion",
    contactEmail:
      values.get("legal_contact_email") || "alimzhananuar69@gmail.com",
  };
}
