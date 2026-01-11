import { generateText, streamText, type LanguageModel, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import type { ChatOptions, ChatResult, IAIProvider } from "@prismax/core";

export type OpenAIProviderConfig = {
  apiKey?: string;
  baseURL?: string;
};

export class OpenAIProvider implements IAIProvider {
  private readonly openai: ReturnType<typeof createOpenAI>;

  constructor(config: OpenAIProviderConfig = {}) {
    this.openai = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  getModel(modelId: string): LanguageModel {
    return this.openai(modelId) as unknown as LanguageModel;
  }

  async streamChat(messages: ModelMessage[], options?: ChatOptions): Promise<any> {
    const modelId = options?.model ?? "gpt-4o-mini";

    return streamText({
      model: this.getModel(modelId),
      messages,
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      tools: options?.tools,
    });
  }

  async chat(messages: ModelMessage[], options?: ChatOptions): Promise<ChatResult> {
    const modelId = options?.model ?? "gpt-4o-mini";

    const result = await generateText({
      model: this.getModel(modelId),
      messages,
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
      tools: options?.tools,
    });

    const usage =
      typeof result.usage?.inputTokens === "number" &&
      typeof result.usage?.outputTokens === "number" &&
      typeof result.usage?.totalTokens === "number"
        ? {
            promptTokens: result.usage.inputTokens,
            completionTokens: result.usage.outputTokens,
            totalTokens: result.usage.totalTokens,
          }
        : undefined;

    return { content: result.text, usage };
  }
}
