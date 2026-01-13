/**
 * AI 服务
 *
 * 封装多个 AI 提供商的调用逻辑
 * 支持流式响应
 */

import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type CoreMessage } from "ai";
import { BrowserWindow } from "electron";
import { getProvider, getProviderApiKey } from "./provider";
import { createMessage, updateMessage } from "./message";
import { updateConversation } from "./conversation";

// 请求上下文，用于取消请求
const activeRequests = new Map<string, AbortController>();

export interface ChatInput {
  conversationId: string;
  content: string;
  modelId?: string;
  history?: CoreMessage[];
}

export interface ChatResult {
  requestId: string;
  messageId: string;
}

/**
 * 发送聊天消息并获取流式响应
 */
export async function sendChatMessage(
  input: ChatInput,
  window: BrowserWindow,
): Promise<ChatResult> {
  const requestId = crypto.randomUUID();
  const abortController = new AbortController();
  activeRequests.set(requestId, abortController);

  try {
    // 解析模型 ID，获取提供商
    const modelId = input.modelId || "gpt-4o";
    const providerId = getProviderIdFromModel(modelId);
    const provider = getProvider(providerId);

    if (!provider) {
      throw new Error(`未找到提供商: ${providerId}`);
    }

    if (!provider.enabled) {
      throw new Error(`提供商 ${provider.name} 未启用`);
    }

    // 获取解密后的 API Key
    const apiKey = getProviderApiKey(providerId);
    if (!apiKey && providerId !== "ollama") {
      throw new Error(`提供商 ${provider.name} 未配置 API Key`);
    }

    // 保存用户消息
    const _userMessage = createMessage({
      conversationId: input.conversationId,
      role: "user",
      content: input.content,
      modelId,
    });

    // 创建 AI 客户端
    const client = createAIClient(providerId, apiKey, provider.baseUrl);

    // 构建消息历史
    const messages: CoreMessage[] = input.history || [];
    messages.push({ role: "user", content: input.content });

    // 创建助手消息占位
    const assistantMessage = createMessage({
      conversationId: input.conversationId,
      role: "assistant",
      content: "",
      modelId,
    });

    // 调用 AI
    const result = streamText({
      model: client(modelId),
      messages,
      abortSignal: abortController.signal,
    });

    // 处理流式响应
    let fullContent = "";

    // 异步处理流
    (async () => {
      try {
        for await (const chunk of result.textStream) {
          fullContent += chunk;

          // 发送 token 到渲染进程
          window.webContents.send("chat:token", {
            requestId,
            token: chunk,
          });
        }

        // 更新消息内容
        updateMessage(assistantMessage.id, {
          content: fullContent,
        });

        // 更新会话标题（如果是第一条消息）
        if (!input.history || input.history.length === 0) {
          // 使用用户消息的前 20 个字符作为标题
          const title = input.content.slice(0, 20) + (input.content.length > 20 ? "..." : "");
          updateConversation(input.conversationId, { title });
        }

        // 发送完成事件
        window.webContents.send("chat:done", { requestId });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // 请求被取消
          window.webContents.send("chat:done", { requestId });
        } else {
          const message = error instanceof Error ? error.message : "AI 调用失败";
          window.webContents.send("chat:error", { requestId, message });
        }
      } finally {
        activeRequests.delete(requestId);
      }
    })();

    return {
      requestId,
      messageId: assistantMessage.id,
    };
  } catch (error) {
    activeRequests.delete(requestId);
    const message = error instanceof Error ? error.message : "发送消息失败";
    window.webContents.send("chat:error", { requestId, message });
    throw error;
  }
}

/**
 * 取消聊天请求
 */
export function cancelChatRequest(requestId: string): boolean {
  const controller = activeRequests.get(requestId);
  if (controller) {
    controller.abort();
    activeRequests.delete(requestId);
    return true;
  }
  return false;
}

/**
 * 根据模型 ID 获取提供商 ID
 */
function getProviderIdFromModel(modelId: string): string {
  if (modelId.startsWith("gpt-") || modelId.startsWith("o1") || modelId.startsWith("o3")) {
    return "openai";
  }
  if (modelId.startsWith("claude-")) {
    return "anthropic";
  }
  if (modelId.startsWith("deepseek-")) {
    return "deepseek";
  }
  if (modelId.startsWith("gemini-")) {
    return "google";
  }
  // 默认假设是 Ollama 本地模型
  return "ollama";
}

/**
 * 创建 AI 客户端
 */
function createAIClient(providerId: string, apiKey: string | null, baseUrl: string | null) {
  switch (providerId) {
    case "openai":
      return createOpenAI({
        apiKey: apiKey || "",
        baseURL: baseUrl || undefined,
      });

    case "anthropic":
      // Anthropic 使用 OpenAI 兼容模式
      return createOpenAI({
        apiKey: apiKey || "",
        baseURL: baseUrl || "https://api.anthropic.com/v1",
        // 注意：实际使用需要 @ai-sdk/anthropic
      });

    case "deepseek":
      return createOpenAI({
        apiKey: apiKey || "",
        baseURL: baseUrl || "https://api.deepseek.com",
      });

    case "ollama":
      return createOpenAI({
        apiKey: "ollama", // Ollama 不需要真正的 API Key
        baseURL: baseUrl || "http://localhost:11434/v1",
      });

    default:
      // 默认使用 OpenAI 兼容模式
      return createOpenAI({
        apiKey: apiKey || "",
        baseURL: baseUrl || undefined,
      });
  }
}
