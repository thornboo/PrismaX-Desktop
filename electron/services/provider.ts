/**
 * 模型提供商服务
 *
 * 职责：模型提供商和模型的管理
 * 安全：API Key 使用 safeStorage 加密存储
 */

import { eq } from "drizzle-orm";
import { getDatabase, schema } from "../db";
import { encryptString, decryptString } from "./secure-storage";

export interface ProviderDTO {
  id: string;
  name: string;
  apiKey: string | null; // 返回给前端时会被遮蔽
  baseUrl: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModelDTO {
  id: string;
  providerId: string;
  name: string;
  capabilities: string[];
  contextWindow: number | null;
  isDefault: boolean;
  sortOrder: number;
}

/**
 * 获取所有提供商
 * 注意：返回的 apiKey 会被遮蔽，仅显示是否已配置
 */
export function getAllProviders(): ProviderDTO[] {
  const db = getDatabase();
  const rows = db.select().from(schema.providers).all();
  return rows.map((row) => toProviderDTO(row, true)); // 遮蔽 API Key
}

/**
 * 获取单个提供商
 * 注意：返回的 apiKey 会被遮蔽
 */
export function getProvider(id: string): ProviderDTO | null {
  const db = getDatabase();
  const row = db.select().from(schema.providers).where(eq(schema.providers.id, id)).get();

  return row ? toProviderDTO(row, true) : null; // 遮蔽 API Key
}

/**
 * 获取提供商的解密 API Key（仅供内部使用）
 */
export function getProviderApiKey(id: string): string | null {
  const db = getDatabase();
  const row = db.select().from(schema.providers).where(eq(schema.providers.id, id)).get();

  if (!row || !row.apiKey) {
    return null;
  }

  // 解密 API Key
  return decryptString(row.apiKey);
}

/**
 * 更新提供商配置
 */
export function updateProvider(
  id: string,
  updates: Partial<Pick<ProviderDTO, "apiKey" | "baseUrl" | "enabled">>,
): ProviderDTO | null {
  const db = getDatabase();
  const now = new Date();

  const updateData: Partial<schema.Provider> = {
    updatedAt: now,
  };

  if (updates.apiKey !== undefined) {
    // 加密 API Key
    updateData.apiKey = updates.apiKey ? encryptString(updates.apiKey) : null;
  }
  if (updates.baseUrl !== undefined) {
    updateData.baseUrl = updates.baseUrl;
  }
  if (updates.enabled !== undefined) {
    updateData.enabled = updates.enabled;
  }

  db.update(schema.providers).set(updateData).where(eq(schema.providers.id, id)).run();

  return getProvider(id);
}

/**
 * 获取提供商的所有模型
 */
export function getModelsByProvider(providerId: string): ModelDTO[] {
  const db = getDatabase();
  const rows = db
    .select()
    .from(schema.models)
    .where(eq(schema.models.providerId, providerId))
    .all();

  return rows.map(toModelDTO);
}

/**
 * 获取所有可用模型（已启用提供商的模型）
 */
export function getAvailableModels(): ModelDTO[] {
  const db = getDatabase();

  // 获取已启用的提供商
  const enabledProviders = db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.enabled, true))
    .all();

  const providerIds = enabledProviders.map((p) => p.id);

  if (providerIds.length === 0) {
    return [];
  }

  // 获取这些提供商的模型
  const models: ModelDTO[] = [];
  for (const providerId of providerIds) {
    const providerModels = getModelsByProvider(providerId);
    models.push(...providerModels);
  }

  return models;
}

/**
 * 获取默认模型
 */
export function getDefaultModel(): ModelDTO | null {
  const db = getDatabase();
  const row = db.select().from(schema.models).where(eq(schema.models.isDefault, true)).get();

  return row ? toModelDTO(row) : null;
}

/**
 * 设置默认模型
 */
export function setDefaultModel(modelId: string): boolean {
  const db = getDatabase();

  // 先清除所有默认标记
  db.update(schema.models).set({ isDefault: false }).run();

  // 设置新的默认模型
  const result = db
    .update(schema.models)
    .set({ isDefault: true })
    .where(eq(schema.models.id, modelId))
    .run();

  return result.changes > 0;
}

/**
 * 转换为 ProviderDTO
 * @param maskApiKey 是否遮蔽 API Key（返回给前端时应该遮蔽）
 */
function toProviderDTO(row: schema.Provider, maskApiKey = false): ProviderDTO {
  let apiKey = row.apiKey;

  if (apiKey && maskApiKey) {
    // 遮蔽 API Key，只显示是否已配置
    // 解密后检查是否有值
    const decrypted = decryptString(apiKey);
    if (decrypted) {
      // 显示遮蔽后的格式：前4位 + **** + 后4位
      const len = decrypted.length;
      if (len > 8) {
        apiKey = `${decrypted.slice(0, 4)}${"*".repeat(Math.min(len - 8, 20))}${decrypted.slice(-4)}`;
      } else {
        apiKey = "*".repeat(len);
      }
    }
  }

  return {
    id: row.id,
    name: row.name,
    apiKey,
    baseUrl: row.baseUrl,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * 转换为 ModelDTO
 */
function toModelDTO(row: schema.Model): ModelDTO {
  let capabilities: string[] = [];
  if (row.capabilities) {
    try {
      capabilities = JSON.parse(row.capabilities);
    } catch {
      capabilities = [];
    }
  }

  return {
    id: row.id,
    providerId: row.providerId,
    name: row.name,
    capabilities,
    contextWindow: row.contextWindow,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
  };
}
