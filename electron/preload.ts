import { contextBridge, ipcRenderer } from "electron";

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld("electron", {
  // 系统相关
  system: {
    getAppVersion: () => ipcRenderer.invoke("system:getAppVersion"),
    checkUpdate: () => ipcRenderer.invoke("system:checkUpdate"),
    openExternal: (url: string) => ipcRenderer.invoke("system:openExternal", url),
    minimize: () => ipcRenderer.invoke("system:minimize"),
    close: () => ipcRenderer.invoke("system:close"),
  },

  // 聊天相关
  chat: {
    send: (input: { conversationId: string; content: string; modelId?: string }) =>
      ipcRenderer.invoke("chat:send", input),
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
