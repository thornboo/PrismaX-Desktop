/**
 * IPC Handlers - 主进程 IPC 通信处理
 *
 * 职责：注册所有 ipcMain.handle() 处理器
 * 原则：main.ts 只负责 wiring，具体逻辑在各 handler 模块中实现
 */

import fs from "node:fs";
import path from "node:path";
import { ipcMain, app, shell, BrowserWindow, dialog, type IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS, IPC_EVENTS } from "./channels";
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
import * as schema from "../db/schema";
import { setConfiguredDataRoot } from "../services/app-data";
import {
  createKnowledgeBase,
  deleteKnowledgeBaseDir,
  listKnowledgeBases,
  updateKnowledgeBaseManifest,
} from "../knowledge/knowledge-base";
import { getKnowledgeWorkerClient } from "../knowledge/worker-client";
import type { CoreMessage } from "ai";

type IpcSuccess<T> = { success: true; data: T; error: null };
type IpcFailure = { success: false; data: null; error: string };
type IpcResponse<T> = IpcSuccess<T> | IpcFailure;

function ok<T>(data: T): IpcResponse<T> {
  return { success: true, data, error: null };
}

function fail(error: string): IpcFailure {
  return { success: false, data: null, error };
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function handleIpc<TArgs extends unknown[], TResult>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TResult> | TResult,
  fallbackError: string,
): void {
  ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    try {
      const data = await handler(event, ...(args as TArgs));
      return ok(data);
    } catch (error) {
      return fail(toErrorMessage(error, fallbackError));
    }
  });
}

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

async function confirmDangerousOperation(
  event: IpcMainInvokeEvent,
  input: { title: string; message: string; detail?: string },
): Promise<boolean> {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showMessageBox(win ?? undefined, {
    type: "warning",
    title: input.title,
    message: input.message,
    detail: input.detail,
    buttons: ["取消", "继续"],
    defaultId: 1,
    cancelId: 0,
    noLink: true,
  });
  return result.response === 1;
}

/**
 * 系统相关 handlers
 */
function registerSystemHandlers(): void {
  // 获取应用版本
  handleIpc(
    IPC_CHANNELS.system.getAppVersion,
    (_event) => {
      return app.getVersion();
    },
    "获取应用版本失败",
  );

  // 获取应用路径与数据路径信息
  handleIpc(
    IPC_CHANNELS.system.getAppInfo,
    (_event) => {
      return {
        appVersion: app.getVersion(),
        platform: process.platform,
        userDataPath: app.getPath("userData"),
        databaseFilePath: getDatabaseFilePath(),
      };
    },
    "获取应用信息失败",
  );

  // 检查更新（暂时返回无更新）
  handleIpc(
    IPC_CHANNELS.system.checkUpdate,
    async (_event) => {
      // TODO: 实现真正的更新检查逻辑
      return { hasUpdate: false, currentVersion: app.getVersion() };
    },
    "检查更新失败",
  );

  // 打开外部链接（带协议白名单）
  handleIpc(
    IPC_CHANNELS.system.openExternal,
    async (_event, url: string) => {
      // 安全：只允许 http/https 协议
      const allowedProtocols = ["http:", "https:"];
      const urlObj = new URL(url);
      if (!allowedProtocols.includes(urlObj.protocol)) {
        throw new Error(`不允许的协议: ${urlObj.protocol}`);
      }
      await shell.openExternal(url);
      return null;
    },
    "打开链接失败",
  );

  // 打开本地路径（文件夹/文件），用于数据目录等
  handleIpc(
    IPC_CHANNELS.system.openPath,
    async (_event, targetPath: string) => {
      const result = await shell.openPath(targetPath);
      if (result) {
        throw new Error(result);
      }
      return null;
    },
    "打开路径失败",
  );

  // 选择目录（用户交互式）
  handleIpc(
    IPC_CHANNELS.system.selectDirectory,
    async (_event) => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ["openDirectory", "createDirectory"],
      });
      if (canceled || filePaths.length === 0) {
        throw new Error("操作已取消");
      }
      return filePaths[0];
    },
    "选择目录失败",
  );

  // 最小化窗口
  handleIpc(
    IPC_CHANNELS.system.minimize,
    (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.minimize();
      return null;
    },
    "窗口操作失败",
  );

  // 关闭窗口
  handleIpc(
    IPC_CHANNELS.system.close,
    (event) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      win?.close();
      return null;
    },
    "窗口操作失败",
  );
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
  handleIpc(
    IPC_CHANNELS.data.exportConversations,
    async (_event) => {
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
        throw new Error("操作已取消");
      }

      const db = getDatabase();
      const payload = buildConversationsExport(db);
      await writeJsonFile(filePath, payload);
      return { filePath };
    },
    "导出会话失败",
  );

  handleIpc(
    IPC_CHANNELS.data.exportSettings,
    async (_event) => {
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
        throw new Error("操作已取消");
      }

      const settings = settingsService.getAllSettings();
      const providers = providerService
        .getAllProviders()
        .map(({ id, name, baseUrl, enabled }) => ({ id, name, baseUrl, enabled }));

      const db = getDatabase();
      const payload = buildSettingsExport(db, { settings, providers });
      await writeJsonFile(filePath, payload);
      return { filePath };
    },
    "导出设置失败",
  );

  handleIpc(
    IPC_CHANNELS.data.importConversations,
    async (_event) => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "导入会话",
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (canceled || filePaths.length === 0) {
        throw new Error("操作已取消");
      }

      const content = await readJsonFile(filePaths[0]);
      const parsed = parseConversationsExport(content);

      const db = getDatabase();
      const result = withSqliteTransaction(() => importConversationsAsNew(db, parsed));

      return { filePath: filePaths[0], ...result };
    },
    "导入会话失败",
  );

  handleIpc(
    IPC_CHANNELS.data.importSettings,
    async (_event) => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "导入设置",
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (canceled || filePaths.length === 0) {
        throw new Error("操作已取消");
      }

      const content = await readJsonFile(filePaths[0]);
      const parsed = parseSettingsExport(content);

      const db = getDatabase();
      const result = withSqliteTransaction(() => applySettingsImport(db, parsed));

      return { filePath: filePaths[0], ...result };
    },
    "导入设置失败",
  );

  handleIpc(
    IPC_CHANNELS.data.clearAllConversations,
    async (event) => {
      const ok = await confirmDangerousOperation(event, {
        title: "确认清空会话",
        message: "此操作将删除所有会话与消息，且不可恢复。是否继续？",
      });
      if (!ok) throw new Error("操作已取消");

      const db = getDatabase();
      const cleared = withSqliteTransaction(() => {
        // 明确先删 messages，再删 conversations，避免外键未启用时残留孤儿数据
        const deletedMessages = db.delete(schema.messages).run().changes;
        const deletedConversations = db.delete(schema.conversations).run().changes;
        return { deletedConversations, deletedMessages };
      });
      return cleared;
    },
    "清空会话失败",
  );

  handleIpc(
    IPC_CHANNELS.data.resetApp,
    async (event) => {
      const ok = await confirmDangerousOperation(event, {
        title: "确认重置应用",
        message:
          "这将清空所有会话、消息、设置与模型/提供商配置（不含系统 Keychain）。且不可恢复。是否继续？",
      });
      if (!ok) throw new Error("操作已取消");

      resetDatabaseToDefaults();
      return null;
    },
    "重置应用失败",
  );

  handleIpc(
    IPC_CHANNELS.data.migrateDataRoot,
    async (event, targetDir: string) => {
      const ok = await confirmDangerousOperation(event, {
        title: "确认迁移数据目录",
        message: "此操作将复制当前数据目录到新目录，并重启应用。目标目录必须为空。是否继续？",
        detail: `目标目录：${targetDir}`,
      });
      if (!ok) throw new Error("操作已取消");

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

      return null;
    },
    "迁移数据目录失败",
  );
}

/**
 * 设置相关 handlers
 */
function registerSettingsHandlers(): void {
  // 获取单个设置
  handleIpc(
    IPC_CHANNELS.settings.get,
    (_event, key: string) => {
      return settingsService.getSetting(key);
    },
    "读取设置失败",
  );

  // 设置单个值
  handleIpc(
    IPC_CHANNELS.settings.set,
    (_event, key: string, value: unknown) => {
      settingsService.setSetting(key, value);
      return null;
    },
    "保存设置失败",
  );

  // 获取所有设置
  handleIpc(
    IPC_CHANNELS.settings.getAll,
    (_event) => {
      return settingsService.getAllSettings();
    },
    "读取设置失败",
  );
}

/**
 * 数据库相关 handlers（会话和消息）
 */
function registerDatabaseHandlers(): void {
  // ============ 会话操作 ============

  // 获取会话列表
  handleIpc(
    IPC_CHANNELS.db.getConversations,
    (_event) => {
      return conversationService.getAllConversations();
    },
    "加载会话列表失败",
  );

  // 获取单个会话
  handleIpc(
    IPC_CHANNELS.db.getConversation,
    (_event, id: string) => {
      return conversationService.getConversation(id);
    },
    "加载会话失败",
  );

  // 创建会话
  handleIpc(
    IPC_CHANNELS.db.createConversation,
    (_event, title?: string) => {
      return conversationService.createConversation(title);
    },
    "创建会话失败",
  );

  // 更新会话
  handleIpc(
    IPC_CHANNELS.db.updateConversation,
    (
      _event,
      id: string,
      updates: Partial<Pick<conversationService.ConversationDTO, "title" | "modelId" | "pinned">>,
    ) => {
      const updated = conversationService.updateConversation(id, updates);
      if (!updated) throw new Error("会话不存在或已被删除");
      return updated;
    },
    "更新会话失败",
  );

  // 删除会话
  handleIpc(
    IPC_CHANNELS.db.deleteConversation,
    (_event, id: string) => {
      const success = conversationService.deleteConversation(id);
      if (!success) throw new Error("删除会话失败");
      return { id };
    },
    "删除会话失败",
  );

  // ============ 消息操作 ============

  // 获取消息列表
  handleIpc(
    IPC_CHANNELS.db.getMessages,
    (_event, conversationId: string) => {
      return messageService.getMessages(conversationId);
    },
    "加载消息失败",
  );

  // 创建消息
  handleIpc(
    IPC_CHANNELS.db.createMessage,
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
    "创建消息失败",
  );

  // 更新消息
  handleIpc(
    IPC_CHANNELS.db.updateMessage,
    (_event, id: string, updates: Partial<Pick<messageService.MessageDTO, "content">>) => {
      const updated = messageService.updateMessage(id, updates);
      if (!updated) throw new Error("消息不存在或已被删除");
      return updated;
    },
    "更新消息失败",
  );

  // 删除消息
  handleIpc(
    IPC_CHANNELS.db.deleteMessage,
    (_event, id: string) => {
      const success = messageService.deleteMessage(id);
      if (!success) throw new Error("删除消息失败");
      return { id };
    },
    "删除消息失败",
  );
}

/**
 * 模型提供商相关 handlers
 */
function registerProviderHandlers(): void {
  // 获取所有提供商
  handleIpc(
    IPC_CHANNELS.provider.getAll,
    (_event) => {
      return providerService.getAllProviders();
    },
    "加载提供商失败",
  );

  // 获取单个提供商
  handleIpc(
    IPC_CHANNELS.provider.get,
    (_event, id: string) => {
      return providerService.getProvider(id);
    },
    "加载提供商失败",
  );

  // 更新提供商配置
  handleIpc(
    IPC_CHANNELS.provider.update,
    (
      _event,
      id: string,
      updates: Partial<Pick<providerService.ProviderDTO, "apiKey" | "baseUrl" | "enabled">>,
    ) => {
      const updated = providerService.updateProvider(id, updates);
      if (!updated) throw new Error("提供商不存在或已被删除");
      return updated;
    },
    "更新提供商失败",
  );

  // 获取提供商的模型列表
  handleIpc(
    IPC_CHANNELS.provider.getModels,
    (_event, providerId: string) => {
      return providerService.getModelsByProvider(providerId);
    },
    "加载模型列表失败",
  );

  // 获取所有可用模型
  handleIpc(
    IPC_CHANNELS.model.getAvailable,
    (_event) => {
      return providerService.getAvailableModels();
    },
    "加载模型列表失败",
  );

  // 获取默认模型
  handleIpc(
    IPC_CHANNELS.model.getDefault,
    (_event) => {
      return providerService.getDefaultModel();
    },
    "获取默认模型失败",
  );

  // 设置默认模型
  handleIpc(
    IPC_CHANNELS.model.setDefault,
    (_event, modelId: string) => {
      const success = providerService.setDefaultModel(modelId);
      if (!success) throw new Error("设置默认模型失败");
      return null;
    },
    "设置默认模型失败",
  );
}

/**
 * 聊天相关 handlers
 */
function registerChatHandlers(): void {
  // 发送消息
  handleIpc(
    IPC_CHANNELS.chat.send,
    async (event, input: { conversationId: string; content: string; modelId?: string }) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        throw new Error("无法获取窗口实例");
      }

      const messages = messageService.getMessages(input.conversationId);
      const history: CoreMessage[] = messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

      return aiService.sendChatMessage(
        {
          conversationId: input.conversationId,
          content: input.content,
          modelId: input.modelId,
          history,
        },
        window,
      );
    },
    "发送消息失败",
  );

  // 取消请求
  handleIpc(
    IPC_CHANNELS.chat.cancel,
    (_event, requestId: string) => {
      const success = aiService.cancelChatRequest(requestId);
      if (!success) throw new Error("请求不存在或已结束");
      return null;
    },
    "取消请求失败",
  );

  // 获取聊天历史
  handleIpc(
    IPC_CHANNELS.chat.history,
    (_event, input: { conversationId: string }) => {
      return messageService.getMessages(input.conversationId);
    },
    "获取聊天历史失败",
  );
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
            win.webContents.send(IPC_EVENTS.kb.jobUpdate, event.payload);
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
  handleIpc(
    IPC_CHANNELS.kb.list,
    (_event) => {
      return listKnowledgeBases();
    },
    "获取知识库列表失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.create,
    (_event, input: { name: string; description?: string | null }) => {
      return createKnowledgeBase(input);
    },
    "创建知识库失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.update,
    (_event, input: { kbId: string; updates: { name?: string; description?: string | null } }) => {
      return updateKnowledgeBaseManifest(input.kbId, input.updates);
    },
    "更新知识库失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.delete,
    async (_event, input: { kbId: string; confirmed: boolean }) => {
      const worker = getKnowledgeWorker();
      const jobs = await worker.call<any[]>("kb.listJobs", { kbId: input.kbId });
      const hasActive = jobs.some((j) =>
        ["pending", "processing", "paused"].includes(String(j.status)),
      );
      if (hasActive) {
        throw new Error("存在未完成的导入任务，请先取消/完成任务后再删除知识库");
      }

      deleteKnowledgeBaseDir({ kbId: input.kbId, confirmed: input.confirmed });
      return null;
    },
    "删除知识库失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.getStats,
    async (_event, input: { kbId: string }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.getStats", { kbId: input.kbId });
    },
    "获取知识库统计失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.getVectorConfig,
    async (_event, input: { kbId: string }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.getVectorConfig", { kbId: input.kbId });
    },
    "获取向量配置失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.rebuildVectorIndex,
    async (_event, input: { kbId: string; confirmed: boolean }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.rebuildVectorIndex", input);
    },
    "重建向量索引失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.buildVectorIndex,
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
    "构建向量索引失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.resumeVectorIndex,
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
    "继续构建向量索引失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.semanticSearch,
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
    "语义搜索失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.listDocuments,
    async (_event, input: { kbId: string; limit?: number }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.listDocuments", input);
    },
    "获取文档列表失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.deleteDocument,
    async (_event, input: { kbId: string; documentId: string; confirmed: boolean }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.deleteDocument", input);
    },
    "删除文档失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.selectFiles,
    async (_event) => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: "选择要导入的文件",
        properties: ["openFile", "multiSelections"],
      });
      if (canceled || filePaths.length === 0) {
        throw new Error("操作已取消");
      }
      return filePaths;
    },
    "选择文件失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.importFiles,
    async (_event, input: { kbId: string; sources: Array<{ type: string; paths: string[] }> }) => {
      const worker = getKnowledgeWorker();
      return worker.call(
        "kb.importFiles",
        { kbId: input.kbId, sources: input.sources },
        5 * 60_000,
      );
    },
    "导入文件失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.listJobs,
    async (_event, input: { kbId: string }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.listJobs", { kbId: input.kbId });
    },
    "获取任务列表失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.pauseJob,
    async (_event, input: { kbId: string; jobId: string }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.pauseJob", input);
    },
    "暂停任务失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.resumeJob,
    async (_event, input: { kbId: string; jobId: string }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.resumeJob", input);
    },
    "继续任务失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.cancelJob,
    async (_event, input: { kbId: string; jobId: string }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.cancelJob", input);
    },
    "取消任务失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.search,
    async (_event, input: { kbId: string; query: string; limit?: number }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.search", input);
    },
    "搜索失败",
  );

  handleIpc(
    IPC_CHANNELS.kb.createNote,
    async (_event, input: { kbId: string; title: string; content: string }) => {
      const worker = getKnowledgeWorker();
      return worker.call("kb.createNote", input);
    },
    "创建笔记失败",
  );
}
