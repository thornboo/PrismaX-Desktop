import type { LanguageModel, ModelMessage, ToolSet } from "ai";

export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolSet;
}

export interface ChatResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IAIProvider {
  /**
   * Get the underlying Vercel AI SDK language model
   */
  getModel(modelId: string): LanguageModel;

  /**
   * Stream a chat completion
   */
  streamChat(messages: ModelMessage[], options?: ChatOptions): Promise<any>; // Return type depends on Vercel AI SDK stream type

  /**
   * Non-streaming chat completion
   */
  chat(messages: ModelMessage[], options?: ChatOptions): Promise<ChatResult>;
}
