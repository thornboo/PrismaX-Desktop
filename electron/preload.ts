import { contextBridge, ipcRenderer } from "electron";

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld("electron", {
  // 系统相关
  system: {
    getAppVersion: () => ipcRenderer.invoke("system:getAppVersion"),
    getAppInfo: () => ipcRenderer.invoke("system:getAppInfo"),
    checkUpdate: () => ipcRenderer.invoke("system:checkUpdate"),
    openExternal: (url: string) => ipcRenderer.invoke("system:openExternal", url),
    openPath: (targetPath: string) => ipcRenderer.invoke("system:openPath", targetPath),
    selectDirectory: () => ipcRenderer.invoke("system:selectDirectory"),
    minimize: () => ipcRenderer.invoke("system:minimize"),
    close: () => ipcRenderer.invoke("system:close"),
  },

  // 聊天相关
  chat: {
    send: (input: { conversationId: string; content: string; modelId?: string }) =>
      ipcRenderer.invoke("chat:send", input),
    cancel: (requestId: string) => ipcRenderer.invoke("chat:cancel", requestId),
    history: (conversationId: string) => ipcRenderer.invoke("chat:history", { conversationId }),
    onToken: (callback: (payload: { requestId: string; token: string }) => void) => {
      const listener = (_event: unknown, payload: { requestId: string; token: string }) =>
        callback(payload);
      ipcRenderer.on("chat:token", listener);
      return () => ipcRenderer.removeListener("chat:token", listener);
    },
    onDone: (callback: (payload: { requestId: string }) => void) => {
      const listener = (_event: unknown, payload: { requestId: string }) => callback(payload);
      ipcRenderer.on("chat:done", listener);
      return () => ipcRenderer.removeListener("chat:done", listener);
    },
    onError: (callback: (payload: { requestId: string; message: string }) => void) => {
      const listener = (_event: unknown, payload: { requestId: string; message: string }) =>
        callback(payload);
      ipcRenderer.on("chat:error", listener);
      return () => ipcRenderer.removeListener("chat:error", listener);
    },
  },

  // 数据库相关 - 会话
  db: {
    // 会话操作
    getConversations: () => ipcRenderer.invoke("db:getConversations"),
    getConversation: (id: string) => ipcRenderer.invoke("db:getConversation", id),
    createConversation: (title?: string) => ipcRenderer.invoke("db:createConversation", title),
    updateConversation: (
      id: string,
      updates: { title?: string; modelId?: string; pinned?: boolean },
    ) => ipcRenderer.invoke("db:updateConversation", id, updates),
    deleteConversation: (id: string) => ipcRenderer.invoke("db:deleteConversation", id),

    // 消息操作
    getMessages: (conversationId: string) => ipcRenderer.invoke("db:getMessages", conversationId),
    createMessage: (input: {
      conversationId: string;
      role: "user" | "assistant" | "system";
      content: string;
      modelId?: string;
    }) => ipcRenderer.invoke("db:createMessage", input),
    updateMessage: (id: string, updates: { content?: string }) =>
      ipcRenderer.invoke("db:updateMessage", id, updates),
    deleteMessage: (id: string) => ipcRenderer.invoke("db:deleteMessage", id),
  },

  // 模型提供商相关
  provider: {
    getAll: () => ipcRenderer.invoke("provider:getAll"),
    get: (id: string) => ipcRenderer.invoke("provider:get", id),
    update: (id: string, updates: { apiKey?: string; baseUrl?: string; enabled?: boolean }) =>
      ipcRenderer.invoke("provider:update", id, updates),
    getModels: (providerId: string) => ipcRenderer.invoke("provider:getModels", providerId),
  },

  // 模型相关
  model: {
    getAvailable: () => ipcRenderer.invoke("model:getAvailable"),
    getDefault: () => ipcRenderer.invoke("model:getDefault"),
    setDefault: (modelId: string) => ipcRenderer.invoke("model:setDefault", modelId),
  },

  // 设置相关
  settings: {
    get: (key: string) => ipcRenderer.invoke("settings:get", key),
    set: (key: string, value: unknown) => ipcRenderer.invoke("settings:set", key, value),
    getAll: () => ipcRenderer.invoke("settings:getAll"),
  },

  // 数据管理
  data: {
    exportConversations: () => ipcRenderer.invoke("data:exportConversations"),
    exportSettings: () => ipcRenderer.invoke("data:exportSettings"),
    importConversations: () => ipcRenderer.invoke("data:importConversations"),
    importSettings: () => ipcRenderer.invoke("data:importSettings"),
    clearAllConversations: () => ipcRenderer.invoke("data:clearAllConversations"),
    resetApp: () => ipcRenderer.invoke("data:resetApp"),
    migrateDataRoot: (targetDir: string) => ipcRenderer.invoke("data:migrateDataRoot", targetDir),
  },

  // 知识库
  knowledge: {
    listBases: () => ipcRenderer.invoke("kb:list"),
    createBase: (input: { name: string; description?: string | null }) =>
      ipcRenderer.invoke("kb:create", input),
    updateBase: (input: {
      kbId: string;
      updates: { name?: string; description?: string | null };
    }) => ipcRenderer.invoke("kb:update", input),
    deleteBase: (input: { kbId: string; confirmed: boolean }) =>
      ipcRenderer.invoke("kb:delete", input),
    getStats: (kbId: string) => ipcRenderer.invoke("kb:getStats", { kbId }),
    getVectorConfig: (kbId: string) => ipcRenderer.invoke("kb:getVectorConfig", { kbId }),
    rebuildVectorIndex: (input: { kbId: string; confirmed: boolean }) =>
      ipcRenderer.invoke("kb:rebuildVectorIndex", input),
    buildVectorIndex: (input: { kbId: string; providerId: string; model: string }) =>
      ipcRenderer.invoke("kb:buildVectorIndex", input),
    resumeVectorIndex: (input: {
      kbId: string;
      jobId: string;
      providerId: string;
      model: string;
    }) => ipcRenderer.invoke("kb:resumeVectorIndex", input),
    semanticSearch: (input: {
      kbId: string;
      providerId: string;
      model: string;
      query: string;
      topK?: number;
    }) => ipcRenderer.invoke("kb:semanticSearch", input),
    listDocuments: (input: { kbId: string; limit?: number }) =>
      ipcRenderer.invoke("kb:listDocuments", input),
    deleteDocument: (input: { kbId: string; documentId: string; confirmed: boolean }) =>
      ipcRenderer.invoke("kb:deleteDocument", input),
    selectFiles: () => ipcRenderer.invoke("kb:selectFiles"),
    importFiles: (input: { kbId: string; sources: Array<{ type: string; paths: string[] }> }) =>
      ipcRenderer.invoke("kb:importFiles", input),
    listJobs: (kbId: string) => ipcRenderer.invoke("kb:listJobs", { kbId }),
    pauseJob: (input: { kbId: string; jobId: string }) => ipcRenderer.invoke("kb:pauseJob", input),
    resumeJob: (input: { kbId: string; jobId: string }) =>
      ipcRenderer.invoke("kb:resumeJob", input),
    cancelJob: (input: { kbId: string; jobId: string }) =>
      ipcRenderer.invoke("kb:cancelJob", input),
    search: (input: { kbId: string; query: string; limit?: number }) =>
      ipcRenderer.invoke("kb:search", input),
    createNote: (input: { kbId: string; title: string; content: string }) =>
      ipcRenderer.invoke("kb:createNote", input),
    onJobUpdate: (callback: (payload: unknown) => void) => {
      const listener = (_event: unknown, payload: unknown) => callback(payload);
      ipcRenderer.on("kb:jobUpdate", listener);
      return () => ipcRenderer.removeListener("kb:jobUpdate", listener);
    },
  },

  // 事件监听
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = ["new-conversation", "open-settings"];
    if (validChannels.includes(channel)) {
      const listener = (_event: unknown, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    return () => {};
  },
});
