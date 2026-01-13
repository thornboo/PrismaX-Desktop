import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, IPC_EVENTS, isUiEventChannel } from "./ipc/channels";

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld("electron", {
  // 系统相关
  system: {
    getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.system.getAppVersion),
    getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.system.getAppInfo),
    checkUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.system.checkUpdate),
    openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.system.openExternal, url),
    openPath: (targetPath: string) => ipcRenderer.invoke(IPC_CHANNELS.system.openPath, targetPath),
    selectDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.system.selectDirectory),
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.system.minimize),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.system.close),
  },

  // 聊天相关
  chat: {
    send: (input: { conversationId: string; content: string; modelId?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.chat.send, input),
    cancel: (requestId: string) => ipcRenderer.invoke(IPC_CHANNELS.chat.cancel, requestId),
    history: (conversationId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.chat.history, { conversationId }),
    onToken: (callback: (payload: { requestId: string; token: string }) => void) => {
      const listener = (_event: unknown, payload: { requestId: string; token: string }) =>
        callback(payload);
      ipcRenderer.on(IPC_EVENTS.chat.token, listener);
      return () => ipcRenderer.removeListener(IPC_EVENTS.chat.token, listener);
    },
    onDone: (callback: (payload: { requestId: string }) => void) => {
      const listener = (_event: unknown, payload: { requestId: string }) => callback(payload);
      ipcRenderer.on(IPC_EVENTS.chat.done, listener);
      return () => ipcRenderer.removeListener(IPC_EVENTS.chat.done, listener);
    },
    onError: (callback: (payload: { requestId: string; message: string }) => void) => {
      const listener = (_event: unknown, payload: { requestId: string; message: string }) =>
        callback(payload);
      ipcRenderer.on(IPC_EVENTS.chat.error, listener);
      return () => ipcRenderer.removeListener(IPC_EVENTS.chat.error, listener);
    },
  },

  // 数据库相关 - 会话
  db: {
    // 会话操作
    getConversations: () => ipcRenderer.invoke(IPC_CHANNELS.db.getConversations),
    getConversation: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.db.getConversation, id),
    createConversation: (title?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.db.createConversation, title),
    updateConversation: (
      id: string,
      updates: { title?: string; modelId?: string; pinned?: boolean },
    ) => ipcRenderer.invoke(IPC_CHANNELS.db.updateConversation, id, updates),
    deleteConversation: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.db.deleteConversation, id),

    // 消息操作
    getMessages: (conversationId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.db.getMessages, conversationId),
    createMessage: (input: {
      conversationId: string;
      role: "user" | "assistant" | "system";
      content: string;
      modelId?: string;
    }) => ipcRenderer.invoke(IPC_CHANNELS.db.createMessage, input),
    updateMessage: (id: string, updates: { content?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.db.updateMessage, id, updates),
    deleteMessage: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.db.deleteMessage, id),
  },

  // 模型提供商相关
  provider: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.provider.getAll),
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.provider.get, id),
    update: (id: string, updates: { apiKey?: string; baseUrl?: string; enabled?: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.provider.update, id, updates),
    getModels: (providerId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.provider.getModels, providerId),
  },

  // 模型相关
  model: {
    getAvailable: () => ipcRenderer.invoke(IPC_CHANNELS.model.getAvailable),
    getDefault: () => ipcRenderer.invoke(IPC_CHANNELS.model.getDefault),
    setDefault: (modelId: string) => ipcRenderer.invoke(IPC_CHANNELS.model.setDefault, modelId),
  },

  // 设置相关
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.settings.get, key),
    set: (key: string, value: unknown) => ipcRenderer.invoke(IPC_CHANNELS.settings.set, key, value),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.settings.getAll),
  },

  // 数据管理
  data: {
    exportConversations: () => ipcRenderer.invoke(IPC_CHANNELS.data.exportConversations),
    exportSettings: () => ipcRenderer.invoke(IPC_CHANNELS.data.exportSettings),
    importConversations: () => ipcRenderer.invoke(IPC_CHANNELS.data.importConversations),
    importSettings: () => ipcRenderer.invoke(IPC_CHANNELS.data.importSettings),
    clearAllConversations: () => ipcRenderer.invoke(IPC_CHANNELS.data.clearAllConversations),
    resetApp: () => ipcRenderer.invoke(IPC_CHANNELS.data.resetApp),
    migrateDataRoot: (targetDir: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.data.migrateDataRoot, targetDir),
  },

  // 知识库
  knowledge: {
    listBases: () => ipcRenderer.invoke(IPC_CHANNELS.kb.list),
    createBase: (input: { name: string; description?: string | null }) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.create, input),
    updateBase: (input: {
      kbId: string;
      updates: { name?: string; description?: string | null };
    }) => ipcRenderer.invoke(IPC_CHANNELS.kb.update, input),
    deleteBase: (input: { kbId: string; confirmed: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.delete, input),
    getStats: (kbId: string) => ipcRenderer.invoke(IPC_CHANNELS.kb.getStats, { kbId }),
    getVectorConfig: (kbId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.getVectorConfig, { kbId }),
    rebuildVectorIndex: (input: { kbId: string; confirmed: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.rebuildVectorIndex, input),
    buildVectorIndex: (input: { kbId: string; providerId: string; model: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.buildVectorIndex, input),
    resumeVectorIndex: (input: {
      kbId: string;
      jobId: string;
      providerId: string;
      model: string;
    }) => ipcRenderer.invoke(IPC_CHANNELS.kb.resumeVectorIndex, input),
    semanticSearch: (input: {
      kbId: string;
      providerId: string;
      model: string;
      query: string;
      topK?: number;
    }) => ipcRenderer.invoke(IPC_CHANNELS.kb.semanticSearch, input),
    listDocuments: (input: { kbId: string; limit?: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.listDocuments, input),
    deleteDocument: (input: { kbId: string; documentId: string; confirmed: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.deleteDocument, input),
    selectFiles: () => ipcRenderer.invoke(IPC_CHANNELS.kb.selectFiles),
    importFiles: (input: { kbId: string; sources: Array<{ type: string; paths: string[] }> }) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.importFiles, input),
    listJobs: (kbId: string) => ipcRenderer.invoke(IPC_CHANNELS.kb.listJobs, { kbId }),
    pauseJob: (input: { kbId: string; jobId: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.pauseJob, input),
    resumeJob: (input: { kbId: string; jobId: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.resumeJob, input),
    cancelJob: (input: { kbId: string; jobId: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.cancelJob, input),
    search: (input: { kbId: string; query: string; limit?: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.search, input),
    createNote: (input: { kbId: string; title: string; content: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.kb.createNote, input),
    onJobUpdate: (callback: (payload: unknown) => void) => {
      const listener = (_event: unknown, payload: unknown) => callback(payload);
      ipcRenderer.on(IPC_EVENTS.kb.jobUpdate, listener);
      return () => ipcRenderer.removeListener(IPC_EVENTS.kb.jobUpdate, listener);
    },
  },

  // 事件监听
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if (isUiEventChannel(channel)) {
      const listener = (_event: unknown, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    return () => {};
  },
});
