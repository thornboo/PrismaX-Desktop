/**
 * 会话服务
 *
 * 职责：会话的 CRUD 操作
 */

import { eq, desc } from "drizzle-orm";
import { getDatabase, schema } from "../db";

export interface ConversationDTO {
  id: string;
  title: string;
  modelId: string | null;
  assistantId: string | null;
  pinned: boolean;
  createdAt: string; // ISO 格式
  updatedAt: string;
}

/**
 * 获取所有会话（按更新时间倒序，置顶优先）
 */
export function getAllConversations(): ConversationDTO[] {
  const db = getDatabase();
  const rows = db
    .select()
    .from(schema.conversations)
    .orderBy(desc(schema.conversations.pinned), desc(schema.conversations.updatedAt))
    .all();

  return rows.map(toDTO);
}

/**
 * 获取单个会话
 */
export function getConversation(id: string): ConversationDTO | null {
  const db = getDatabase();
  const row = db.select().from(schema.conversations).where(eq(schema.conversations.id, id)).get();

  return row ? toDTO(row) : null;
}

/**
 * 创建会话
 */
export function createConversation(title?: string, modelId?: string): ConversationDTO {
  const db = getDatabase();
  const now = new Date();
  const id = crypto.randomUUID();

  const newConversation: schema.NewConversation = {
    id,
    title: title || "新对话",
    modelId: modelId || null,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(schema.conversations).values(newConversation).run();

  return toDTO({ ...newConversation, assistantId: null });
}

/**
 * 更新会话
 */
export function updateConversation(
  id: string,
  updates: Partial<Pick<ConversationDTO, "title" | "modelId" | "pinned">>,
): ConversationDTO | null {
  const db = getDatabase();
  const now = new Date();

  const updateData: Partial<schema.Conversation> = {
    updatedAt: now,
  };

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }
  if (updates.modelId !== undefined) {
    updateData.modelId = updates.modelId;
  }
  if (updates.pinned !== undefined) {
    updateData.pinned = updates.pinned;
  }

  db.update(schema.conversations).set(updateData).where(eq(schema.conversations.id, id)).run();

  return getConversation(id);
}

/**
 * 删除会话（级联删除消息）
 */
export function deleteConversation(id: string): boolean {
  const db = getDatabase();
  const result = db.delete(schema.conversations).where(eq(schema.conversations.id, id)).run();

  return result.changes > 0;
}

/**
 * 转换为 DTO
 */
function toDTO(row: schema.Conversation): ConversationDTO {
  return {
    id: row.id,
    title: row.title,
    modelId: row.modelId,
    assistantId: row.assistantId,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
