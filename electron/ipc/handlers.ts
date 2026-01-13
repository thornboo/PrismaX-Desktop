/**
 * IPC Handlers - 主进程 IPC 通信处理
 *
 * 职责：注册所有 ipcMain.handle() 处理器
 * 原则：main.ts 只负责 wiring，具体逻辑在各 handler 模块中实现
 */

import fs from "node:fs";
import path from "node:path";
import { ipcMain, app, shell, BrowserWindow, dialog } from "electron";
import * as conversationService from "../services/conversation";
import * as messageService from "../services/message";
import * as settingsService from "../services/settings";
import * as providerService from "../services/provider";
import * as aiService from "../services/ai";
import {
  buildConversationsExport,
  buildSettingsExport,
  applySettingsImport,
  importConversationsAsNew,
  parseConversationsExport,
  parseSettingsExport,
  readJsonFile,
  writeJsonFile,
} from "../services/data";
import {
  getDatabase,
  getDatabaseFilePath,
  resetDatabaseToDefaults,
  withSqliteTransaction,
} from "../db";
import { setConfiguredDataRoot } from "../services/app-data";
import {
  createKnowledgeBase,
  deleteKnowledgeBaseDir,
  listKnowledgeBases,
  updateKnowledgeBaseManifest,
} from "../knowledge/knowledge-base";
import { getKnowledgeWorkerClient } from "../knowledge/worker-client";
import type { CoreMessage } from "ai";

/**
 * 注册所有 IPC handlers
 */
export function registerIpcHandlers(): void {
  // ============ System Handlers ============
  registerSystemHandlers();

  // ============ Settings Handlers ============
  registerSettingsHandlers();

  // ============ Database Handlers ============
  registerDatabaseHandlers();

  // ============ Provider Handlers ============
  registerProviderHandlers();

  // ============ Data Management Handlers ============
  registerDataHandlers();

  // ============ Knowledge Base Handlers ============
  registerKnowledgeBaseHandlers();

  // ============ Chat Handlers (Stub) ============
  registerChatHandlers();
}

/**
 * 系统相关 handlers
 */
function registerSystemHandlers(): void {
  // 获取应用版本
  ipcMain.handle("system:getAppVersion", () => {
    return app.getVersion();
  });

  // 获取应用路径与数据路径信息
  ipcMain.handle("system:getAppInfo", () => {
    return {
      appVersion: app.getVersion(),
      platform: process.platform,
      userDataPath: app.getPath("userData"),
      databaseFilePath: getDatabaseFilePath(),
    };
  });

  // 检查更新（暂时返回无更新）
  ipcMain.handle("system:checkUpdate", async () => {
    // TODO: 实现真正的更新检查逻辑
    return { hasUpdate: false, currentVersion: app.getVersion() };
  });

  // 打开外部链接（带协议白名单）
  ipcMain.handle("system:openExternal", async (_event, url: string) => {
    // 安全：只允许 http/https 协议
    const allowedProtocols = ["http:", "https:"];
    try {
      const urlObj = new URL(url);
      if (!allowedProtocols.includes(urlObj.protocol)) {
        throw new Error(`不允许的协议: ${urlObj.protocol}`);
      }
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "打开链接失败";
      return { success: false, error: message };
    }
  });

  // 打开本地路径（文件夹/文件），用于数据目录等
  ipcMain.handle("system:openPath", async (_event, targetPath: string) => {
    try {
      const result = await shell.openPath(targetPath);
      if (result) {
        return { success: false, error: result };
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "打开路径失败";
      return { success: false, error: message };
    }
  });

  // 选择目录（用户交互式）
  ipcMain.handle("system:selectDirectory", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (canceled || filePaths.length === 0) {
      return null;
    }
    return filePaths[0];
  });

  // 最小化窗口
  ipcMain.handle("system:minimize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  // 关闭窗口
  ipcMain.handle("system:close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });
}

function formatDateForFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * 数据管理相关 handlers
 *
 * 说明：
 * - 仅处理用户显式触发的导入/导出/清理/重置等能力
 * - API Key 不参与设置导出（避免敏感数据外泄）
 */
function registerDataHandlers(): void {
  ipcMain.handle("data:exportConversations", async () => {
    const now = new Date();
    const defaultPath = path.join(
      app.getPath("downloads"),
      `prismax-conversations-${formatDateForFileName(now)}.json`,
    );
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "导出会话",
      defaultPath,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePath) {
      return null;
    }

    const db = getDatabase();
    const payload = buildConversationsExport(db);
    await writeJsonFile(filePath, payload);
    return { filePath };
  });

  ipcMain.handle("data:exportSettings", async () => {
    const now = new Date();
    const defaultPath = path.join(
      app.getPath("downloads"),
      `prismax-settings-${formatDateForFileName(now)}.json`,
    );
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "导出设置",
      defaultPath,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePath) {
      return null;
    }

    const settings = settingsService.getAllSettings();
    const providers = providerService
      .getAllProviders()
      .map(({ id, name, baseUrl, enabled }) => ({ id, name, baseUrl, enabled }));

    const db = getDatabase();
    const payload = buildSettingsExport(db, { settings, providers });
    await writeJsonFile(filePath, payload);
    return { filePath };
  });

  ipcMain.handle("data:importConversations", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "导入会话",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || filePaths.length === 0) {
      return null;
    }

    const content = await readJsonFile(filePaths[0]);
    const parsed = parseConversationsExport(content);

    const db = getDatabase();
    const result = withSqliteTransaction(() => importConversationsAsNew(db, parsed));

    return { filePath: filePaths[0], ...result };
  });

  ipcMain.handle("data:importSettings", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "导入设置",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || filePaths.length === 0) {
      return null;
    }

    const content = await readJsonFile(filePaths[0]);
    const parsed = parseSettingsExport(content);

    const db = getDatabase();
    const result = withSqliteTransaction(() => applySettingsImport(db, parsed));

    return { filePath: filePaths[0], ...result };
  });

  ipcMain.handle("data:clearAllConversations", async () => {
    const db = getDatabase();
    const cleared = withSqliteTransaction(() => {
      // 明确先删 messages，再删 conversations，避免外键未启用时残留孤儿数据
      const deletedMessages = db.delete(schema.messages).run().changes;
      const deletedConversations = db.delete(schema.conversations).run().changes;
      return { deletedConversations, deletedMessages };
    });
    return cleared;
  });

  ipcMain.handle("data:resetApp", async () => {
    resetDatabaseToDefaults();
    return { success: true };
  });

  ipcMain.handle("data:migrateDataRoot", async (_event, targetDir: string) => {
    const current = app.getPath("userData");
    const resolvedTarget = path.resolve(targetDir);
    const resolvedCurrent = path.resolve(current);

    if (resolvedTarget === resolvedCurrent) {
      throw new Error("目标目录与当前数据目录相同");
    }

    await fs.promises.mkdir(resolvedTarget, { recursive: true });
    const entries = await fs.promises.readdir(resolvedTarget);
    if (entries.length > 0) {
      throw new Error("目标目录非空，请选择一个空目录");
    }

    await fs.promises.cp(resolvedCurrent, resolvedTarget, { recursive: true });

    setConfiguredDataRoot(resolvedTarget);

    // 重启应用以应用新的 userDataPath
    app.relaunch();
    app.exit(0);

    return { success: true };
  });
}

/**
 * 设置相关 handlers
 */
function registerSettingsHandlers(): void {
  // 获取单个设置
  ipcMain.handle("settings:get", (_event, key: string) => {
    return settingsService.getSetting(key);
  });

  // 设置单个值
  ipcMain.handle("settings:set", (_event, key: string, value: unknown) => {
    settingsService.setSetting(key, value);
    return { success: true };
  });

  // 获取所有设置
  ipcMain.handle("settings:getAll", () => {
    return settingsService.getAllSettings();
  });
}

/**
 * 数据库相关 handlers（会话和消息）
 */
function registerDatabaseHandlers(): void {
  // ============ 会话操作 ============

  // 获取会话列表
  ipcMain.handle("db:getConversations", () => {
    return conversationService.getAllConversations();
  });

  // 获取单个会话
  ipcMain.handle("db:getConversation", (_event, id: string) => {
    return conversationService.getConversation(id);
  });

  // 创建会话
  ipcMain.handle("db:createConversation", (_event, title?: string) => {
    return conversationService.createConversation(title);
  });

  // 更新会话
  ipcMain.handle(
    "db:updateConversation",
    (
      _event,
      id: string,
      updates: Partial<Pick<conversationService.ConversationDTO, "title" | "modelId" | "pinned">>,
    ) => {
      return conversationService.updateConversation(id, updates);
    },
  );

  // 删除会话
  ipcMain.handle("db:deleteConversation", (_event, id: string) => {
    const success = conversationService.deleteConversation(id);
    return { success, id };
  });

  // ============ 消息操作 ============

  // 获取消息列表
  ipcMain.handle("db:getMessages", (_event, conversationId: string) => {
    return messageService.getMessages(conversationId);
  });

  // 创建消息
  ipcMain.handle(
    "db:createMessage",
    (
      _event,
      input: {
        conversationId: string;
        role: "user" | "assistant" | "system";
        content: string;
        modelId?: string;
      },
    ) => {
      return messageService.createMessage(input);
    },
  );

  // 更新消息
  ipcMain.handle(
    "db:updateMessage",
    (_event, id: string, updates: Partial<Pick<messageService.MessageDTO, "content">>) => {
      return messageService.updateMessage(id, updates);
    },
  );

  // 删除消息
  ipcMain.handle("db:deleteMessage", (_event, id: string) => {
    const success = messageService.deleteMessage(id);
    return { success, id };
  });
}

/**
 * 模型提供商相关 handlers
 */
function registerProviderHandlers(): void {
  // 获取所有提供商
  ipcMain.handle("provider:getAll", () => {
    return providerService.getAllProviders();
  });

  // 获取单个提供商
  ipcMain.handle("provider:get", (_event, id: string) => {
    return providerService.getProvider(id);
  });

  // 更新提供商配置
  ipcMain.handle(
    "provider:update",
    (
      _event,
      id: string,
      updates: Partial<Pick<providerService.ProviderDTO, "apiKey" | "baseUrl" | "enabled">>,
    ) => {
      return providerService.updateProvider(id, updates);
    },
  );

  // 获取提供商的模型列表
  ipcMain.handle("provider:getModels", (_event, providerId: string) => {
    return providerService.getModelsByProvider(providerId);
  });

  // 获取所有可用模型
  ipcMain.handle("model:getAvailable", () => {
    return providerService.getAvailableModels();
  });

  // 获取默认模型
  ipcMain.handle("model:getDefault", () => {
    return providerService.getDefaultModel();
  });

  // 设置默认模型
  ipcMain.handle("model:setDefault", (_event, modelId: string) => {
    const success = providerService.setDefaultModel(modelId);
    return { success };
  });
}

/**
 * 聊天相关 handlers
 */
function registerChatHandlers(): void {
  // 发送消息
  ipcMain.handle(
    "chat:send",
    async (event, input: { conversationId: string; content: string; modelId?: string }) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error("无法获取窗口实例");
      }

      // 获取历史消息
      const messages = messageService.getMessages(input.conversationId);
      const history: CoreMessage[] = messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

      // 发送消息并获取流式响应
      const result = await aiService.sendChatMessage(
        {
          conversationId: input.conversationId,
          content: input.content,
          modelId: input.modelId,
          history,
        },
        window,
      );

      return result;
    },
  );

  // 取消请求
  ipcMain.handle("chat:cancel", (_event, requestId: string) => {
    const success = aiService.cancelChatRequest(requestId);
    return { success };
  });

  // 获取聊天历史
  ipcMain.handle("chat:history", (_event, input: { conversationId: string }) => {
    return messageService.getMessages(input.conversationId);
  });
}

let knowledgeWorkerWired = false;
function getKnowledgeWorker() {
  const client = getKnowledgeWorkerClient(app.getPath("userData"));
  if (!knowledgeWorkerWired) {
    knowledgeWorkerWired = true;
    client.onEvent((event) => {
      if (event.event === "job:update") {
        for (const win of BrowserWindow.getAllWindows()) {
          try {
            win.webContents.send("kb:jobUpdate", event.payload);
          } catch {
            // ignore
          }
        }
      }
    });
  }
  return client;
}

function registerKnowledgeBaseHandlers(): void {
  ipcMain.handle("kb:list", () => {
    return listKnowledgeBases();
  });

  ipcMain.handle("kb:create", (_event, input: { name: string; description?: string | null }) => {
    return createKnowledgeBase(input);
  });

  ipcMain.handle(
    "kb:update",
    (_event, input: { kbId: string; updates: { name?: string; description?: string | null } }) => {
      return updateKnowledgeBaseManifest(input.kbId, input.updates);
    },
  );

  ipcMain.handle("kb:delete", async (_event, input: { kbId: string; confirmed: boolean }) => {
    // 安全：存在未结束任务时不允许删除（避免中途删除导致数据不一致）
    const worker = getKnowledgeWorker();
    const jobs = await worker.call<any[]>("kb.listJobs", { kbId: input.kbId });
    const hasActive = jobs.some((j) =>
      ["pending", "processing", "paused"].includes(String(j.status)),
    );
    if (hasActive) {
      throw new Error("存在未完成的导入任务，请先取消/完成任务后再删除知识库");
    }

    deleteKnowledgeBaseDir({ kbId: input.kbId, confirmed: input.confirmed });
    return { success: true };
  });

  ipcMain.handle("kb:getStats", async (_event, input: { kbId: string }) => {
    const worker = getKnowledgeWorker();
    return worker.call("kb.getStats", { kbId: input.kbId });
  });

  ipcMain.handle("kb:getVectorConfig", async (_event, input: { kbId: string }) => {
    const worker = getKnowledgeWorker();
    return worker.call("kb.getVectorConfig", { kbId: input.kbId });
  });

  ipcMain.handle(
    "kb:rebuildVectorIndex",
    async (_event, input: { kbId: string; confirmed: boolean }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.rebuildVectorIndex", input);
    },
  );

  ipcMain.handle(
    "kb:buildVectorIndex",
    async (_event, input: { kbId: string; providerId: string; model: string }) => {
      const provider = providerService.getProvider(input.providerId);
      if (!provider) throw new Error(`未找到提供商: ${input.providerId}`);
      if (!provider.enabled) throw new Error(`提供商 ${provider.name} 未启用`);

      const apiKey = providerService.getProviderApiKey(input.providerId);
      if (!apiKey) throw new Error(`提供商 ${provider.name} 未配置 API Key`);

      const worker = getKnowledgeWorker();
      return worker.call(
        "kb.buildVectorIndex",
        {
          kbId: input.kbId,
          providerId: input.providerId,
          model: input.model,
          embedding: { baseUrl: provider.baseUrl ?? "", apiKey, model: input.model },
        },
        5 * 60_000,
      );
    },
  );

  ipcMain.handle(
    "kb:resumeVectorIndex",
    async (_event, input: { kbId: string; jobId: string; providerId: string; model: string }) => {
      const provider = providerService.getProvider(input.providerId);
      if (!provider) throw new Error(`未找到提供商: ${input.providerId}`);
      if (!provider.enabled) throw new Error(`提供商 ${provider.name} 未启用`);

      const apiKey = providerService.getProviderApiKey(input.providerId);
      if (!apiKey) throw new Error(`提供商 ${provider.name} 未配置 API Key`);

      const worker = getKnowledgeWorker();
      return worker.call(
        "kb.resumeVectorIndex",
        {
          kbId: input.kbId,
          jobId: input.jobId,
          providerId: input.providerId,
          model: input.model,
          embedding: { baseUrl: provider.baseUrl ?? "", apiKey, model: input.model },
        },
        5 * 60_000,
      );
    },
  );

  ipcMain.handle(
    "kb:semanticSearch",
    async (
      _event,
      input: { kbId: string; providerId: string; model: string; query: string; topK?: number },
    ) => {
      const provider = providerService.getProvider(input.providerId);
      if (!provider) throw new Error(`未找到提供商: ${input.providerId}`);
      if (!provider.enabled) throw new Error(`提供商 ${provider.name} 未启用`);

      const apiKey = providerService.getProviderApiKey(input.providerId);
      if (!apiKey) throw new Error(`提供商 ${provider.name} 未配置 API Key`);

      const worker = getKnowledgeWorker();
      return worker.call(
        "kb.semanticSearch",
        {
          kbId: input.kbId,
          providerId: input.providerId,
          model: input.model,
          query: input.query,
          topK: input.topK,
          embedding: { baseUrl: provider.baseUrl ?? "", apiKey, model: input.model },
        },
        60_000,
      );
    },
  );

  ipcMain.handle("kb:listDocuments", async (_event, input: { kbId: string; limit?: number }) => {
    const worker = getKnowledgeWorker();
    return worker.call("kb.listDocuments", input);
  });

  ipcMain.handle(
    "kb:deleteDocument",
    async (_event, input: { kbId: string; documentId: string; confirmed: boolean }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.deleteDocument", input);
    },
  );

  ipcMain.handle("kb:selectFiles", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "选择要导入的文件",
      properties: ["openFile", "multiSelections"],
    });
    if (canceled || filePaths.length === 0) {
      return null;
    }
    return filePaths;
  });

  ipcMain.handle(
    "kb:importFiles",
    async (_event, input: { kbId: string; sources: Array<{ type: string; paths: string[] }> }) => {
      const worker = getKnowledgeWorker();
      return worker.call(
        "kb.importFiles",
        { kbId: input.kbId, sources: input.sources },
        5 * 60_000,
      );
    },
  );

  ipcMain.handle("kb:listJobs", async (_event, input: { kbId: string }) => {
    const worker = getKnowledgeWorker();
    return worker.call("kb.listJobs", { kbId: input.kbId });
  });

  ipcMain.handle("kb:pauseJob", async (_event, input: { kbId: string; jobId: string }) => {
    const worker = getKnowledgeWorker();
    return worker.call("kb.pauseJob", input);
  });

  ipcMain.handle("kb:resumeJob", async (_event, input: { kbId: string; jobId: string }) => {
    const worker = getKnowledgeWorker();
    return worker.call("kb.resumeJob", input);
  });

  ipcMain.handle("kb:cancelJob", async (_event, input: { kbId: string; jobId: string }) => {
    const worker = getKnowledgeWorker();
    return worker.call("kb.cancelJob", input);
  });

  ipcMain.handle(
    "kb:search",
    async (_event, input: { kbId: string; query: string; limit?: number }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.search", input);
    },
  );

  ipcMain.handle(
    "kb:createNote",
    async (_event, input: { kbId: string; title: string; content: string }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.createNote", input);
    },
  );
}
