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

export type IpcResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

export interface ElectronAPI {
  // 系统相关
  system: {
    getAppVersion: () => Promise<IpcResponse<string>>;
    getAppInfo: () => Promise<
      IpcResponse<{
        appVersion: string;
        platform: string;
        userDataPath: string;
        databaseFilePath: string;
      }>
    >;
    checkUpdate: () => Promise<IpcResponse<{ hasUpdate: boolean; currentVersion: string }>>;
    openExternal: (url: string) => Promise<IpcResponse<null>>;
    openPath: (targetPath: string) => Promise<IpcResponse<null>>;
    selectDirectory: () => Promise<IpcResponse<string>>;
    minimize: () => Promise<IpcResponse<null>>;
    close: () => Promise<IpcResponse<null>>;
  };

  // 聊天相关
  chat: {
    send: (input: {
      conversationId: string;
      content: string;
      modelId?: string;
    }) => Promise<IpcResponse<{ requestId: string; messageId: string }>>;
    cancel: (requestId: string) => Promise<IpcResponse<null>>;
    history: (conversationId: string) => Promise<IpcResponse<Message[]>>;
    onToken: (callback: (payload: { requestId: string; token: string }) => void) => () => void;
    onDone: (callback: (payload: { requestId: string }) => void) => () => void;
    onError: (callback: (payload: { requestId: string; message: string }) => void) => () => void;
  };

  // 数据库相关 - 会话和消息
  db: {
    // 会话操作
    getConversations: () => Promise<IpcResponse<Conversation[]>>;
    getConversation: (id: string) => Promise<IpcResponse<Conversation | null>>;
    createConversation: (title?: string) => Promise<IpcResponse<Conversation>>;
    updateConversation: (
      id: string,
      updates: { title?: string; modelId?: string; pinned?: boolean },
    ) => Promise<IpcResponse<Conversation>>;
    deleteConversation: (id: string) => Promise<IpcResponse<{ id: string }>>;

    // 消息操作
    getMessages: (conversationId: string) => Promise<IpcResponse<Message[]>>;
    createMessage: (input: {
      conversationId: string;
      role: "user" | "assistant" | "system";
      content: string;
      modelId?: string;
    }) => Promise<IpcResponse<Message>>;
    updateMessage: (id: string, updates: { content?: string }) => Promise<IpcResponse<Message>>;
    deleteMessage: (id: string) => Promise<IpcResponse<{ id: string }>>;
  };

  // 模型提供商相关
  provider: {
    getAll: () => Promise<IpcResponse<Provider[]>>;
    get: (id: string) => Promise<IpcResponse<Provider | null>>;
    update: (
      id: string,
      updates: { apiKey?: string; baseUrl?: string; enabled?: boolean },
    ) => Promise<IpcResponse<Provider>>;
    getModels: (providerId: string) => Promise<IpcResponse<Model[]>>;
  };

  // 模型相关
  model: {
    getAvailable: () => Promise<IpcResponse<Model[]>>;
    getDefault: () => Promise<IpcResponse<Model | null>>;
    setDefault: (modelId: string) => Promise<IpcResponse<null>>;
  };

  // 设置相关
  settings: {
    get: <T = unknown>(key: string) => Promise<IpcResponse<T | null>>;
    set: (key: string, value: unknown) => Promise<IpcResponse<null>>;
    getAll: () => Promise<IpcResponse<Record<string, unknown>>>;
  };

  // 数据管理
  data: {
    exportConversations: () => Promise<IpcResponse<{ filePath: string }>>;
    exportSettings: () => Promise<IpcResponse<{ filePath: string }>>;
    importConversations: () => Promise<
      IpcResponse<{
        filePath: string;
        conversationsAdded: number;
        messagesAdded: number;
      }>
    >;
    importSettings: () => Promise<
      IpcResponse<{
        filePath: string;
        settingsUpdated: number;
        providersUpdated: number;
      }>
    >;
    clearAllConversations: () => Promise<
      IpcResponse<{ deletedConversations: number; deletedMessages: number }>
    >;
    resetApp: () => Promise<IpcResponse<null>>;
    migrateDataRoot: (targetDir: string) => Promise<IpcResponse<null>>;
  };

  // 知识库
  knowledge: {
    listBases: () => Promise<IpcResponse<KnowledgeBase[]>>;
    createBase: (input: {
      name: string;
      description?: string | null;
    }) => Promise<IpcResponse<KnowledgeBase>>;
    updateBase: (input: {
      kbId: string;
      updates: { name?: string; description?: string | null };
    }) => Promise<IpcResponse<KnowledgeBase>>;
    deleteBase: (input: { kbId: string; confirmed: boolean }) => Promise<IpcResponse<null>>;
    getStats: (
      kbId: string,
    ) => Promise<IpcResponse<{ documents: number; chunks: number; jobs: number }>>;
    getVectorConfig: (
      kbId: string,
    ) => Promise<IpcResponse<{ config: KnowledgeVectorConfig | null }>>;
    rebuildVectorIndex: (input: {
      kbId: string;
      confirmed: boolean;
    }) => Promise<IpcResponse<{ success: boolean }>>;
    buildVectorIndex: (input: {
      kbId: string;
      providerId: string;
      model: string;
    }) => Promise<IpcResponse<{ jobId: string }>>;
    resumeVectorIndex: (input: {
      kbId: string;
      jobId: string;
      providerId: string;
      model: string;
    }) => Promise<IpcResponse<{ success: boolean }>>;
    semanticSearch: (input: {
      kbId: string;
      providerId: string;
      model: string;
      query: string;
      topK?: number;
    }) => Promise<IpcResponse<{ results: KnowledgeVectorSearchResult[] }>>;
    listDocuments: (input: {
      kbId: string;
      limit?: number;
    }) => Promise<IpcResponse<KnowledgeDocument[]>>;
    deleteDocument: (input: {
      kbId: string;
      documentId: string;
      confirmed: boolean;
    }) => Promise<IpcResponse<{ success: boolean }>>;
    selectFiles: () => Promise<IpcResponse<string[]>>;
    importFiles: (input: {
      kbId: string;
      sources: Array<{ type: string; paths: string[] }>;
    }) => Promise<
      IpcResponse<{
        jobId: string;
      }>
    >;
    listJobs: (kbId: string) => Promise<IpcResponse<KnowledgeJob[]>>;
    pauseJob: (input: {
      kbId: string;
      jobId: string;
    }) => Promise<IpcResponse<{ success: boolean }>>;
    resumeJob: (input: {
      kbId: string;
      jobId: string;
    }) => Promise<IpcResponse<{ success: boolean }>>;
    cancelJob: (input: {
      kbId: string;
      jobId: string;
    }) => Promise<IpcResponse<{ success: boolean }>>;
    search: (input: { kbId: string; query: string; limit?: number }) => Promise<
      IpcResponse<{
        results: KnowledgeSearchResult[];
      }>
    >;
    createNote: (input: { kbId: string; title: string; content: string }) => Promise<
      IpcResponse<{
        documentId: string;
      }>
    >;
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
