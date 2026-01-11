import { randomUUID } from "node:crypto";
import path from "node:path";
import { ipcMain } from "electron";

import { OpenAIProvider } from "@prismax/ai-sdk";
import { ChatService, type IAIProvider } from "@prismax/core";
import {
  DesktopChatRepository,
  NativeMemoryRepository,
  createDesktopDb,
  ensureDesktopSchema,
} from "@prismax/database";

const DEFAULT_CONVERSATION_ID = "default";
const DEFAULT_USER_ID = "local";
const DEFAULT_ASSISTANT_ID = "desktop";

function createFallbackProvider(): IAIProvider {
  return {
    getModel() {
      throw new Error("Desktop: fallback provider does not support getModel()");
    },
    async streamChat(messages: Array<any>) {
      const lastUser = [...messages].reverse().find((m) => m?.role === "user");
      const content = typeof lastUser?.content === "string" ? lastUser.content : "";
      const answer = `（未配置 OPENAI_API_KEY，使用本地回显）\n\n你说：${content}`;

      async function* generator() {
        for (const char of answer) {
          yield char;
        }
      }

      return generator();
    },
    async chat(messages: Array<any>) {
      const lastUser = [...messages].reverse().find((m) => m?.role === "user");
      const content = typeof lastUser?.content === "string" ? lastUser.content : "";
      return { content: `（未配置 OPENAI_API_KEY）你说：${content}` };
    },
  };
}

export function registerIpc(options: { userDataPath: string }) {
  const dbPath = path.join(options.userDataPath, "prismax.sqlite");

  const { db, sqlite } = createDesktopDb(dbPath);
  ensureDesktopSchema(sqlite);

  const chatRepository = new DesktopChatRepository(db);
  const memoryRepository = new NativeMemoryRepository(db);

  const aiProvider =
    process.env.OPENAI_API_KEY
      ? new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY,
          baseURL: process.env.OPENAI_BASE_URL,
        })
      : createFallbackProvider();

  const chatService = new ChatService(chatRepository, aiProvider, memoryRepository);

  async function ensureConversation(conversationId: string) {
    const existing = await chatRepository.getConversation({ id: conversationId });
    if (existing) return;
    await chatRepository.createConversation({
      id: conversationId,
      folderId: null,
      title: "Desktop 会话",
    });
  }

  ipcMain.handle("db:hello", async () => {
    const folderId = randomUUID();
    await chatRepository.createFolder({
      id: folderId,
      name: "Hello Desktop",
      parentId: null,
    });

    const folders = await chatRepository.listFolders({ parentId: null });
    return {
      insertedFolderId: folderId,
      folderCount: folders.length,
      folders: folders.map((f) => ({ id: f.id, name: f.name, createdAt: f.createdAt.toISOString() })),
    };
  });

  ipcMain.handle("chat:ensure", async () => {
    await ensureConversation(DEFAULT_CONVERSATION_ID);
    return { conversationId: DEFAULT_CONVERSATION_ID };
  });

  ipcMain.handle("chat:history", async (_event, input: { conversationId?: unknown }) => {
    const conversationId =
      typeof input?.conversationId === "string" && input.conversationId.trim().length > 0
        ? input.conversationId.trim()
        : DEFAULT_CONVERSATION_ID;

    await ensureConversation(conversationId);

    const rows = await chatRepository.getMessages({ conversationId });
    return {
      conversationId,
      messages: rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
    };
  });

  ipcMain.handle(
    "chat:send",
    async (
      event,
      input: { conversationId?: unknown; content?: unknown; modelId?: unknown },
    ) => {
      const conversationId =
        typeof input?.conversationId === "string" && input.conversationId.trim().length > 0
          ? input.conversationId.trim()
          : DEFAULT_CONVERSATION_ID;

      const content =
        typeof input?.content === "string" ? input.content.trim() : "";

      const modelId =
        typeof input?.modelId === "string" && input.modelId.trim().length > 0
          ? input.modelId.trim()
          : process.env.OPENAI_MODEL ?? "gpt-4o-mini";

      if (!content) {
        return { requestId: randomUUID(), error: "EMPTY_CONTENT" };
      }

      await ensureConversation(conversationId);

      const requestId = randomUUID();

      void (async () => {
        try {
          const { assistantMessageId, stream, userMessageId } = await chatService.sendMessage({
            userId: DEFAULT_USER_ID,
            assistantId: DEFAULT_ASSISTANT_ID,
            conversationId,
            content,
            modelId,
          });

          event.sender.send("chat:meta", { requestId, userMessageId, assistantMessageId });

          for await (const token of stream) {
            event.sender.send("chat:token", { requestId, token });
          }

          event.sender.send("chat:done", { requestId });
        } catch (error) {
          const message = error instanceof Error ? error.message : "CHAT_FAILED";
          event.sender.send("chat:error", { requestId, message });
        }
      })();

      return { requestId };
    },
  );
}
