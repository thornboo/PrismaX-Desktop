/**
 * 数据库 Schema 定义
 *
 * 使用 Drizzle ORM 定义 SQLite 表结构
 * 遵循 KISS 原则：只定义 MVP 必需的表和字段
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * 会话表
 * 存储用户的聊天会话
 */
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(), // UUID
  title: text("title").notNull().default("新对话"),
  // 关联的模型 ID（可选，用于记住该会话使用的模型）
  modelId: text("model_id"),
  // 关联的助手 ID（可选，用于预设助手）
  assistantId: text("assistant_id"),
  // 是否置顶
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  // 时间戳（Unix 毫秒）
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * 消息表
 * 存储会话中的消息
 */
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(), // UUID
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  // 角色：user | assistant | system
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  // 消息内容（Markdown 格式）
  content: text("content").notNull(),
  // 使用的模型 ID（记录生成该消息时使用的模型）
  modelId: text("model_id"),
  // Token 统计（可选）
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  // 时间戳
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * 设置表
 * 键值对存储应用设置
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON 序列化的值
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * 模型提供商配置表
 * 存储各 AI 提供商的配置（API Key 等）
 */
export const providers = sqliteTable("providers", {
  id: text("id").primaryKey(), // 如 "openai", "anthropic", "ollama"
  name: text("name").notNull(),
  // API Key（加密存储，MVP 阶段先明文，后续接入 keytar）
  apiKey: text("api_key"),
  // 自定义端点
  baseUrl: text("base_url"),
  // 是否启用
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  // 时间戳
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * 模型表
 * 存储可用的 AI 模型
 */
export const models = sqliteTable("models", {
  id: text("id").primaryKey(), // 如 "gpt-4o", "claude-3.5-sonnet"
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // 模型能力标签
  capabilities: text("capabilities"), // JSON 数组：["chat", "vision", "function_calling"]
  // 上下文窗口大小
  contextWindow: integer("context_window"),
  // 是否为默认模型
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  // 排序权重
  sortOrder: integer("sort_order").notNull().default(0),
});

// 类型导出
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Setting = typeof settings.$inferSelect;

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;

export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
