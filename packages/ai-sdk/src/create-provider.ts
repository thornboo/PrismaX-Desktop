import { z } from "zod";

import type { IAIProvider } from "@prismax/core";
import { OpenAIProvider } from "./providers/openai";

const openAiProviderConfigSchema = z.object({
  type: z.literal("openai"),
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
});

export type AIProviderConfig = z.infer<typeof openAiProviderConfigSchema>;

export function createAIProvider(config: AIProviderConfig): IAIProvider {
  const parsed = openAiProviderConfigSchema.parse(config);

  switch (parsed.type) {
    case "openai":
      return new OpenAIProvider({ apiKey: parsed.apiKey, baseURL: parsed.baseURL });
  }
}

