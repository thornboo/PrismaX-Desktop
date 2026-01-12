// Electron API 类型定义

// ============ 数据类型 ============

export interface Conversation {
  id: string;
  title: string;
  modelId: string | null;
  assistantId: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelId: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  createdAt: string;
}

export interface Provider {
  id: string;
  name: string;
  apiKey: string | null;
  baseUrl: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Model {
  id: string;
  providerId: string;
  name: string;
  capabilities: string[];
  contextWindow: number | null;
  isDefault: boolean;
  sortOrder: number;
}

// ============ API 类型 ============

export interface ElectronAPI {
  // 系统相关
  system: {
    getAppVersion: () => Promise<string>;
    checkUpdate: () => Promise<{ hasUpdate: boolean; currentVersion: string }>;
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
    minimize: () => Promise<void>;
    close: () => Promise<void>;
  };

  // 聊天相关
  chat: {
    send: (input: {
      conversationId: string;
      content: string;
      modelId?: string;
    }) => Promise<{ requestId: string }>;
    history: (conversationId: string) => Promise<Message[]>;
    onToken: (callback: (payload: { requestId: string; token: string }) => void) => () => void;
    onDone: (callback: (payload: { requestId: string }) => void) => () => void;
    onError: (callback: (payload: { requestId: string; message: string }) => void) => () => void;
  };

  // 数据库相关 - 会话和消息
  db: {
    // 会话操作
    getConversations: () => Promise<Conversation[]>;
    getConversation: (id: string) => Promise<Conversation | null>;
    createConversation: (title?: string) => Promise<Conversation>;
    updateConversation: (
      id: string,
      updates: { title?: string; modelId?: string; pinned?: boolean },
    ) => Promise<Conversation | null>;
    deleteConversation: (id: string) => Promise<{ success: boolean; id: string }>;

    // 消息操作
    getMessages: (conversationId: string) => Promise<Message[]>;
    createMessage: (input: {
      conversationId: string;
      role: "user" | "assistant" | "system";
      content: string;
      modelId?: string;
    }) => Promise<Message>;
    updateMessage: (id: string, updates: { content?: string }) => Promise<Message | null>;
    deleteMessage: (id: string) => Promise<{ success: boolean; id: string }>;
  };

  // 模型提供商相关
  provider: {
    getAll: () => Promise<Provider[]>;
    get: (id: string) => Promise<Provider | null>;
    update: (
      id: string,
      updates: { apiKey?: string; baseUrl?: string; enabled?: boolean },
    ) => Promise<Provider | null>;
    getModels: (providerId: string) => Promise<Model[]>;
  };

  // 模型相关
  model: {
    getAvailable: () => Promise<Model[]>;
    getDefault: () => Promise<Model | null>;
    setDefault: (modelId: string) => Promise<{ success: boolean }>;
  };

  // 设置相关
  settings: {
    get: <T = unknown>(key: string) => Promise<T | null>;
    set: (key: string, value: unknown) => Promise<{ success: boolean }>;
    getAll: () => Promise<Record<string, unknown>>;
  };

  // 事件监听
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
