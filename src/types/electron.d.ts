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

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
  dir: string;
  metaDbPath: string;
}

export interface KnowledgeJob {
  id: string;
  type: string;
  status: string;
  progressCurrent: number;
  progressTotal: number;
  errorMessage: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  updatedAt: number;
  heartbeatAt: number | null;
}

export interface KnowledgeSearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentKind: "file" | "note";
  snippet: string;
  score: number;
}

export interface KnowledgeDocument {
  id: string;
  kind: "file" | "note";
  title: string;
  sourcePath: string | null;
  blobSha256: string | null;
  blobRelPath: string | null;
  mimeType: string | null;
  sizeBytes: number;
  sha256: string | null;
  sourceMtimeMs: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeVectorConfig {
  providerId: string;
  model: string;
  dimension: number;
  updatedAt: number;
}

export interface KnowledgeVectorSearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  distance: number | null;
}

// ============ API 类型 ============

export interface ElectronAPI {
  // 系统相关
  system: {
    getAppVersion: () => Promise<string>;
    getAppInfo: () => Promise<{
      appVersion: string;
      platform: string;
      userDataPath: string;
      databaseFilePath: string;
    }>;
    checkUpdate: () => Promise<{ hasUpdate: boolean; currentVersion: string }>;
    openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
    openPath: (targetPath: string) => Promise<{ success: boolean; error?: string }>;
    selectDirectory: () => Promise<string | null>;
    minimize: () => Promise<void>;
    close: () => Promise<void>;
  };

  // 聊天相关
  chat: {
    send: (input: {
      conversationId: string;
      content: string;
      modelId?: string;
    }) => Promise<{ requestId: string; messageId: string }>;
    cancel: (requestId: string) => Promise<{ success: boolean }>;
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

  // 数据管理
  data: {
    exportConversations: () => Promise<{ filePath: string } | null>;
    exportSettings: () => Promise<{ filePath: string } | null>;
    importConversations: () => Promise<{
      filePath: string;
      conversationsAdded: number;
      messagesAdded: number;
    } | null>;
    importSettings: () => Promise<{
      filePath: string;
      settingsUpdated: number;
      providersUpdated: number;
    } | null>;
    clearAllConversations: () => Promise<{ deletedConversations: number; deletedMessages: number }>;
    resetApp: () => Promise<{ success: boolean }>;
    migrateDataRoot: (targetDir: string) => Promise<{ success: boolean }>;
  };

  // 知识库
  knowledge: {
    listBases: () => Promise<KnowledgeBase[]>;
    createBase: (input: { name: string; description?: string | null }) => Promise<KnowledgeBase>;
    updateBase: (input: {
      kbId: string;
      updates: { name?: string; description?: string | null };
    }) => Promise<KnowledgeBase>;
    deleteBase: (input: { kbId: string; confirmed: boolean }) => Promise<{ success: boolean }>;
    getStats: (kbId: string) => Promise<{ documents: number; chunks: number; jobs: number }>;
    getVectorConfig: (kbId: string) => Promise<{ config: KnowledgeVectorConfig | null }>;
    rebuildVectorIndex: (input: {
      kbId: string;
      confirmed: boolean;
    }) => Promise<{ success: boolean }>;
    buildVectorIndex: (input: {
      kbId: string;
      providerId: string;
      model: string;
    }) => Promise<{ jobId: string }>;
    resumeVectorIndex: (input: {
      kbId: string;
      jobId: string;
      providerId: string;
      model: string;
    }) => Promise<{ success: boolean }>;
    semanticSearch: (input: {
      kbId: string;
      providerId: string;
      model: string;
      query: string;
      topK?: number;
    }) => Promise<{ results: KnowledgeVectorSearchResult[] }>;
    listDocuments: (input: { kbId: string; limit?: number }) => Promise<KnowledgeDocument[]>;
    deleteDocument: (input: {
      kbId: string;
      documentId: string;
      confirmed: boolean;
    }) => Promise<{ success: boolean }>;
    selectFiles: () => Promise<string[] | null>;
    importFiles: (input: {
      kbId: string;
      sources: Array<{ type: string; paths: string[] }>;
    }) => Promise<{
      jobId: string;
    }>;
    listJobs: (kbId: string) => Promise<KnowledgeJob[]>;
    pauseJob: (input: { kbId: string; jobId: string }) => Promise<{ success: boolean }>;
    resumeJob: (input: { kbId: string; jobId: string }) => Promise<{ success: boolean }>;
    cancelJob: (input: { kbId: string; jobId: string }) => Promise<{ success: boolean }>;
    search: (input: { kbId: string; query: string; limit?: number }) => Promise<{
      results: KnowledgeSearchResult[];
    }>;
    createNote: (input: { kbId: string; title: string; content: string }) => Promise<{
      documentId: string;
    }>;
    onJobUpdate: (callback: (payload: unknown) => void) => () => void;
  };

  // 事件监听
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
