import type { ModelMessage } from "ai";

import type { IAIProvider } from "../ai/types";
import type { IMemoryProvider } from "../memory/types";
import type { IChatRepository, MessageRole } from "../repositories/chat";

export type SendMessageInput = {
  userId: string;
  conversationId: string;
  content: string;
  modelId: string;
  assistantId?: string;
  maxHistoryMessages?: number;
};

export type SendMessageResult = {
  userMessageId: string;
  assistantMessageId: string;
  stream: AsyncIterable<string>;
};

function requireNonEmpty(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} must not be empty`);
  return trimmed;
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    Symbol.asyncIterator in (value as Record<PropertyKey, unknown>)
  );
}

function toModelRole(role: MessageRole): "system" | "user" | "assistant" {
  switch (role) {
    case "system":
      return "system";
    case "assistant":
      return "assistant";
    case "user":
      return "user";
    default:
      return "user";
  }
}

function buildSystemPrompt(input: {
  persona?: string | null;
  archivalSnippets?: string[];
}): string {
  const lines: string[] = [];
  lines.push("你是 PrismaX 的助手。请用简体中文回答。");

  if (input.persona && input.persona.trim().length > 0) {
    lines.push("");
    lines.push("用户画像/偏好（Persona）：");
    lines.push(input.persona.trim());
  }

  const snippets = (input.archivalSnippets ?? []).filter((s) => s.trim().length > 0);
  if (snippets.length > 0) {
    lines.push("");
    lines.push("相关背景资料（可选参考）：");
    for (const snippet of snippets.slice(0, 8)) {
      lines.push(`- ${snippet.trim()}`);
    }
  }

  return lines.join("\n").trim();
}

export class ChatService {
  constructor(
    private readonly chatRepository: IChatRepository,
    private readonly aiProvider: IAIProvider,
    private readonly memoryProvider: IMemoryProvider | null,
  ) {}

  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const userId = requireNonEmpty(input.userId, "userId");
    const conversationId = requireNonEmpty(input.conversationId, "conversationId");
    const content = requireNonEmpty(input.content, "content");
    const modelId = requireNonEmpty(input.modelId, "modelId");
    const assistantId = (input.assistantId ?? userId).trim() || userId;

    const maxHistoryMessages =
      typeof input.maxHistoryMessages === "number" ? input.maxHistoryMessages : 20;
    const historyLimit = Math.max(1, Math.min(maxHistoryMessages, 100));

    const conversation = await this.chatRepository.getConversation({ id: conversationId, userId });
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();

    await this.chatRepository.addMessage({
      id: userMessageId,
      conversationId,
      role: "user",
      content,
      userId,
    });

    const allMessages = await this.chatRepository.getMessages({ conversationId, userId });
    const recent = allMessages.slice(-historyLimit);

    const persona = this.memoryProvider
      ? await this.memoryProvider
          .getCoreMemory({ assistantId, label: "persona" })
          .then((m) => m?.content ?? null)
          .catch(() => null)
      : null;

    const archival = this.memoryProvider
      ? await this.memoryProvider
          .searchArchivalMemory({ assistantId, query: content, limit: 5 })
          .then((rows) => rows.map((r) => r.content))
          .catch(() => [])
      : [];

    const systemPrompt = buildSystemPrompt({
      persona,
      archivalSnippets: archival,
    });

    const modelMessages: ModelMessage[] = [
      { role: "system", content: systemPrompt },
      ...recent.map((m) => ({
        role: toModelRole(m.role),
        content: m.content,
      })),
    ];

    const streamResult = await this.aiProvider.streamChat(modelMessages, { model: modelId });
    const tokenStream =
      isAsyncIterable<string>(streamResult) ? streamResult : isAsyncIterable<string>((streamResult as any)?.textStream)
        ? (streamResult as any).textStream
        : null;

    if (!tokenStream) {
      throw new Error("AI provider did not return a token stream");
    }

    const stream = this.createPersistedAssistantStream({
      userId,
      conversationId,
      assistantMessageId,
      tokenStream,
    });

    return { userMessageId, assistantMessageId, stream };
  }

  private createPersistedAssistantStream(input: {
    userId: string;
    conversationId: string;
    assistantMessageId: string;
    tokenStream: AsyncIterable<string>;
  }): AsyncIterable<string> {
    const { userId, conversationId, assistantMessageId, tokenStream } = input;

    const repo = this.chatRepository;

    async function* generator() {
      let assistantContent = "";

      try {
        for await (const token of tokenStream) {
          assistantContent += token;
          yield token;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI 请求失败";
        assistantContent = `（AI 响应失败：${message}）`;
        yield assistantContent;
      } finally {
        await repo.addMessage({
          id: assistantMessageId,
          conversationId,
          role: "assistant",
          content: assistantContent,
          userId,
        });
      }
    }

    return { [Symbol.asyncIterator]: generator };
  }
}
