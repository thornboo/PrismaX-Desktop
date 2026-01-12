/**
 * 消息服务
 *
 * 职责：消息的 CRUD 操作
 */

import { eq, asc } from "drizzle-orm";
import { getDatabase, schema } from "../db";
import { updateConversation } from "./conversation";

export interface MessageDTO {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelId: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  createdAt: string; // ISO 格式
}

/**
 * 获取会话的所有消息（按时间正序）
 */
export function getMessages(conversationId: string): MessageDTO[] {
  const db = getDatabase();
  const rows = db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(asc(schema.messages.createdAt))
    .all();

  return rows.map(toDTO);
}

/**
 * 获取单条消息
 */
export function getMessage(id: string): MessageDTO | null {
  const db = getDatabase();
  const row = db.select().from(schema.messages).where(eq(schema.messages.id, id)).get();

  return row ? toDTO(row) : null;
}

/**
 * 创建消息
 */
export function createMessage(input: {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelId?: string;
  promptTokens?: number;
  completionTokens?: number;
}): MessageDTO {
  const db = getDatabase();
  const now = new Date();
  const id = crypto.randomUUID();

  const newMessage: schema.NewMessage = {
    id,
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    modelId: input.modelId || null,
    promptTokens: input.promptTokens || null,
    completionTokens: input.completionTokens || null,
    createdAt: now,
  };

  db.insert(schema.messages).values(newMessage).run();

  // 更新会话的 updatedAt
  updateConversation(input.conversationId, {});

  return toDTO({ ...newMessage, createdAt: now });
}

/**
 * 更新消息内容
 */
export function updateMessage(
  id: string,
  updates: Partial<Pick<MessageDTO, "content" | "promptTokens" | "completionTokens">>,
): MessageDTO | null {
  const db = getDatabase();

  const updateData: Partial<schema.Message> = {};

  if (updates.content !== undefined) {
    updateData.content = updates.content;
  }
  if (updates.promptTokens !== undefined) {
    updateData.promptTokens = updates.promptTokens;
  }
  if (updates.completionTokens !== undefined) {
    updateData.completionTokens = updates.completionTokens;
  }

  db.update(schema.messages).set(updateData).where(eq(schema.messages.id, id)).run();

  return getMessage(id);
}

/**
 * 删除消息
 */
export function deleteMessage(id: string): boolean {
  const db = getDatabase();
  const result = db.delete(schema.messages).where(eq(schema.messages.id, id)).run();

  return result.changes > 0;
}

/**
 * 删除会话中的所有消息
 */
export function deleteMessagesByConversation(conversationId: string): number {
  const db = getDatabase();
  const result = db
    .delete(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .run();

  return result.changes;
}

/**
 * 转换为 DTO
 */
function toDTO(row: schema.Message): MessageDTO {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    modelId: row.modelId,
    promptTokens: row.promptTokens,
    completionTokens: row.completionTokens,
    createdAt: row.createdAt.toISOString(),
  };
}
