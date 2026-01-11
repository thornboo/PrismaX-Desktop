export {};

declare global {
  interface Window {
    electron?: {
      db: {
        hello: () => Promise<{
          insertedFolderId: string;
          folderCount: number;
          folders: Array<{ id: string; name: string; createdAt: string }>;
        }>;
      };
      chat: {
        ensure: () => Promise<{ conversationId: string }>;
        history: (conversationId: string) => Promise<{
          conversationId: string;
          messages: Array<{ id: string; role: string; content: string }>;
        }>;
        send: (input: { conversationId: string; content: string; modelId?: string }) => Promise<{
          requestId: string;
          error?: string;
        }>;
        onMeta: (callback: (payload: { requestId: string; userMessageId: string; assistantMessageId: string }) => void) => () => void;
        onToken: (callback: (payload: { requestId: string; token: string }) => void) => () => void;
        onDone: (callback: (payload: { requestId: string }) => void) => () => void;
        onError: (callback: (payload: { requestId: string; message: string }) => void) => () => void;
      };
    };
  }
}
