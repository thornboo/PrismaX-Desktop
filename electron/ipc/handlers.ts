/**
 * IPC Handlers - 主进程 IPC 通信处理
 *
 * 职责：注册所有 ipcMain.handle() 处理器
 * 原则：main.ts 只负责 wiring，具体逻辑在各 handler 模块中实现
 */

import { ipcMain, app, shell, BrowserWindow } from "electron";
import * as conversationService from "../services/conversation";
import * as messageService from "../services/message";
import * as settingsService from "../services/settings";
import * as providerService from "../services/provider";
import * as aiService from "../services/ai";
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
