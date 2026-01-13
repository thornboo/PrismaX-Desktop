export const IPC_CHANNELS = {
  system: {
    getAppVersion: "system:getAppVersion",
    getAppInfo: "system:getAppInfo",
    checkUpdate: "system:checkUpdate",
    openExternal: "system:openExternal",
    openPath: "system:openPath",
    selectDirectory: "system:selectDirectory",
    minimize: "system:minimize",
    close: "system:close",
  },
  chat: {
    send: "chat:send",
    cancel: "chat:cancel",
    history: "chat:history",
  },
  db: {
    getConversations: "db:getConversations",
    getConversation: "db:getConversation",
    createConversation: "db:createConversation",
    updateConversation: "db:updateConversation",
    deleteConversation: "db:deleteConversation",
    getMessages: "db:getMessages",
    createMessage: "db:createMessage",
    updateMessage: "db:updateMessage",
    deleteMessage: "db:deleteMessage",
  },
  provider: {
    getAll: "provider:getAll",
    get: "provider:get",
    update: "provider:update",
    getModels: "provider:getModels",
  },
  model: {
    getAvailable: "model:getAvailable",
    getDefault: "model:getDefault",
    setDefault: "model:setDefault",
  },
  settings: {
    get: "settings:get",
    set: "settings:set",
    getAll: "settings:getAll",
  },
  data: {
    exportConversations: "data:exportConversations",
    exportSettings: "data:exportSettings",
    importConversations: "data:importConversations",
    importSettings: "data:importSettings",
    clearAllConversations: "data:clearAllConversations",
    resetApp: "data:resetApp",
    migrateDataRoot: "data:migrateDataRoot",
  },
  kb: {
    list: "kb:list",
    create: "kb:create",
    update: "kb:update",
    delete: "kb:delete",
    getStats: "kb:getStats",
    getVectorConfig: "kb:getVectorConfig",
    rebuildVectorIndex: "kb:rebuildVectorIndex",
    buildVectorIndex: "kb:buildVectorIndex",
    resumeVectorIndex: "kb:resumeVectorIndex",
    semanticSearch: "kb:semanticSearch",
    listDocuments: "kb:listDocuments",
    deleteDocument: "kb:deleteDocument",
    selectFiles: "kb:selectFiles",
    importFiles: "kb:importFiles",
    listJobs: "kb:listJobs",
    pauseJob: "kb:pauseJob",
    resumeJob: "kb:resumeJob",
    cancelJob: "kb:cancelJob",
    search: "kb:search",
    createNote: "kb:createNote",
  },
} as const;

export const IPC_EVENTS = {
  chat: {
    token: "chat:token",
    done: "chat:done",
    error: "chat:error",
  },
  kb: {
    jobUpdate: "kb:jobUpdate",
  },
  ui: {
    newConversation: "new-conversation",
    openSettings: "open-settings",
  },
} as const;

export type UiEventChannel = (typeof IPC_EVENTS.ui)[keyof typeof IPC_EVENTS.ui];
export const UI_EVENT_CHANNELS: readonly UiEventChannel[] = [
  IPC_EVENTS.ui.newConversation,
  IPC_EVENTS.ui.openSettings,
] as const;

export function isUiEventChannel(channel: string): channel is UiEventChannel {
  return (UI_EVENT_CHANNELS as readonly string[]).includes(channel);
}
