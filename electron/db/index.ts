/**
 * 数据库初始化和连接管理
 *
 * 职责：
 * - 创建/打开 SQLite 数据库
 * - 初始化表结构
 * - 提供 Drizzle ORM 实例
 */

import path from "node:path";
import { app } from "electron";
import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

let db: BetterSQLite3Database<typeof schema> | null = null;
let sqlite: Database.Database | null = null;

/**
 * 获取数据库文件路径
 */
function getDatabasePath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "prismax.db");
}

/**
 * 初始化数据库
 * 创建表结构（如果不存在）
 */
export function initDatabase(): BetterSQLite3Database<typeof schema> {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();
  console.log(`[DB] 初始化数据库: ${dbPath}`);

  // 创建 SQLite 连接
  sqlite = new Database(dbPath);

  // 启用 WAL 模式（提高并发性能）
  sqlite.pragma("journal_mode = WAL");

  // 创建 Drizzle 实例
  db = drizzle(sqlite, { schema });

  // 创建表结构
  createTables();

  // 初始化默认数据
  initDefaultData();

  console.log("[DB] 数据库初始化完成");
  return db;
}

/**
 * 创建表结构
 * 使用 IF NOT EXISTS 确保幂等性
 */
function createTables(): void {
  if (!sqlite) return;

  // 会话表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      model_id TEXT,
      assistant_id TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // 消息表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      model_id TEXT,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      created_at INTEGER NOT NULL
    )
  `);

  // 创建消息表索引
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
    ON messages(conversation_id)
  `);

  // 设置表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // 提供商表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      api_key TEXT,
      base_url TEXT,
      enabled INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // 模型表
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      capabilities TEXT,
      context_window INTEGER,
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
}

/**
 * 初始化默认数据
 * 预置模型提供商和模型列表
 */
function initDefaultData(): void {
  if (!db) return;

  const now = Date.now();

  // 检查是否已有提供商数据
  const existingProviders = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.providers)
    .get();

  if (existingProviders && existingProviders.count > 0) {
    return; // 已有数据，跳过初始化
  }

  console.log("[DB] 初始化默认提供商和模型数据");

  // 预置提供商
  const defaultProviders: schema.NewProvider[] = [
    {
      id: "openai",
      name: "OpenAI",
      enabled: false,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    },
    {
      id: "anthropic",
      name: "Anthropic",
      enabled: false,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    },
    {
      id: "ollama",
      name: "Ollama",
      baseUrl: "http://localhost:11434",
      enabled: false,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      baseUrl: "https://api.deepseek.com",
      enabled: false,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    },
  ];

  for (const provider of defaultProviders) {
    db.insert(schema.providers).values(provider).run();
  }

  // 预置模型
  const defaultModels: schema.NewModel[] = [
    // OpenAI
    {
      id: "gpt-4o",
      providerId: "openai",
      name: "GPT-4o",
      capabilities: JSON.stringify(["chat", "vision", "function_calling"]),
      contextWindow: 128000,
      isDefault: true,
      sortOrder: 1,
    },
    {
      id: "gpt-4o-mini",
      providerId: "openai",
      name: "GPT-4o Mini",
      capabilities: JSON.stringify(["chat", "vision", "function_calling"]),
      contextWindow: 128000,
      isDefault: false,
      sortOrder: 2,
    },
    {
      id: "gpt-4-turbo",
      providerId: "openai",
      name: "GPT-4 Turbo",
      capabilities: JSON.stringify(["chat", "vision", "function_calling"]),
      contextWindow: 128000,
      isDefault: false,
      sortOrder: 3,
    },
    // Anthropic
    {
      id: "claude-3-5-sonnet-latest",
      providerId: "anthropic",
      name: "Claude 3.5 Sonnet",
      capabilities: JSON.stringify(["chat", "vision"]),
      contextWindow: 200000,
      isDefault: false,
      sortOrder: 1,
    },
    {
      id: "claude-3-5-haiku-latest",
      providerId: "anthropic",
      name: "Claude 3.5 Haiku",
      capabilities: JSON.stringify(["chat", "vision"]),
      contextWindow: 200000,
      isDefault: false,
      sortOrder: 2,
    },
    // DeepSeek
    {
      id: "deepseek-chat",
      providerId: "deepseek",
      name: "DeepSeek Chat",
      capabilities: JSON.stringify(["chat"]),
      contextWindow: 64000,
      isDefault: false,
      sortOrder: 1,
    },
    {
      id: "deepseek-reasoner",
      providerId: "deepseek",
      name: "DeepSeek Reasoner",
      capabilities: JSON.stringify(["chat"]),
      contextWindow: 64000,
      isDefault: false,
      sortOrder: 2,
    },
  ];

  for (const model of defaultModels) {
    db.insert(schema.models).values(model).run();
  }

  // 初始化默认设置
  const defaultSettings = [
    { key: "theme", value: JSON.stringify("system") },
    { key: "language", value: JSON.stringify("zh-CN") },
    { key: "sendKey", value: JSON.stringify("enter") },
    { key: "defaultModelId", value: JSON.stringify("gpt-4o") },
  ];

  for (const setting of defaultSettings) {
    db.insert(schema.settings)
      .values({
        key: setting.key,
        value: setting.value,
        updatedAt: new Date(now),
      })
      .run();
  }
}

/**
 * 获取数据库实例
 */
export function getDatabase(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
    console.log("[DB] 数据库连接已关闭");
  }
}

// 导出 schema 供其他模块使用
export { schema };
