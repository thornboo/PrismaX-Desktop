/**
 * 设置服务
 *
 * 职责：应用设置的读写操作
 */

import { eq } from "drizzle-orm";
import { getDatabase, schema } from "../db";

/**
 * 获取设置值
 */
export function getSetting<T = unknown>(key: string): T | null {
  const db = getDatabase();
  const row = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get();

  if (!row) {
    return null;
  }

  try {
    return JSON.parse(row.value) as T;
  } catch {
    return row.value as T;
  }
}

/**
 * 设置值
 */
export function setSetting(key: string, value: unknown): void {
  const db = getDatabase();
  const now = new Date();
  const serializedValue = JSON.stringify(value);

  // 使用 upsert（INSERT OR REPLACE）
  db.insert(schema.settings)
    .values({
      key,
      value: serializedValue,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: {
        value: serializedValue,
        updatedAt: now,
      },
    })
    .run();
}

/**
 * 获取所有设置
 */
export function getAllSettings(): Record<string, unknown> {
  const db = getDatabase();
  const rows = db.select().from(schema.settings).all();

  const result: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {
      result[row.key] = row.value;
    }
  }

  return result;
}

/**
 * 删除设置
 */
export function deleteSetting(key: string): boolean {
  const db = getDatabase();
  const result = db.delete(schema.settings).where(eq(schema.settings.key, key)).run();

  return result.changes > 0;
}
