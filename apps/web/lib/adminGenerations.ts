import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";

export type GenerationKind = "all" | "tryon" | "model";

export interface AdminGeneration {
  id: string;
  kind: "tryon" | "model";
  userId: string;
  imagePath: string;
  lookId: string | null;
  createdAt: string;
}

export interface AdminGenerationsPage {
  items: AdminGeneration[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export async function getAdminGenerations(kind: GenerationKind, page: number): Promise<AdminGenerationsPage> {
  const pageSize = 24;
  // UNION читает существующую историю примерок без копирования картинок.
  // В generated_models пишутся только новые model-create: отличить старую
  // сгенерированную модель от личного фото в users.photo_path невозможно.
  const rows = await db.all(sql`
    SELECT * FROM (
      SELECT id, 'tryon' AS kind, user_id AS userId,
             result_image_path AS imagePath, look_id AS lookId, created_at AS createdAt
      FROM tryon_history
      WHERE result_image_path IS NOT NULL AND result_image_path != ''
        AND ${kind} IN ('all', 'tryon')
      UNION ALL
      SELECT id, 'model' AS kind, user_id AS userId,
             image_path AS imagePath, NULL AS lookId, created_at AS createdAt
      FROM generated_models
      WHERE ${kind} IN ('all', 'model')
    )
    ORDER BY createdAt DESC, kind ASC, id DESC
    LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
  `) as unknown as AdminGeneration[];
  return { items: rows.slice(0, pageSize), page, pageSize, hasMore: rows.length > pageSize };
}
