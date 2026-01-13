export type OpenAICompatibleEmbeddingConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type EmbeddingResult = {
  vectors: number[][];
  dimension: number;
};

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "https://api.openai.com";
  }
  return trimmed;
}

function buildEmbeddingsUrl(baseUrl: string): string {
  const root = normalizeBaseUrl(baseUrl);
  if (root.endsWith("/v1")) return `${root}/embeddings`;
  return `${root}/v1/embeddings`;
}

export async function embedTextsOpenAICompatible(
  config: OpenAICompatibleEmbeddingConfig,
  inputs: string[],
): Promise<EmbeddingResult> {
  if (!config.apiKey) throw new Error("Embedding API Key 为空");
  if (!config.model) throw new Error("Embedding model 为空");
  if (inputs.length === 0) throw new Error("inputs 不能为空");

  const url = buildEmbeddingsUrl(config.baseUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: inputs,
    }),
  });

  if (!res.ok) {
    const raw = await safeReadText(res);
    throw new Error(`Embedding 请求失败: ${res.status} ${res.statusText}${raw ? ` - ${raw}` : ""}`);
  }

  const json = (await res.json()) as any;
  const data = Array.isArray(json?.data) ? json.data : [];
  const vectors: number[][] = new Array(inputs.length);
  let dimension = 0;

  for (const item of data) {
    const index = Number(item?.index);
    const embedding = Array.isArray(item?.embedding) ? (item.embedding as number[]) : null;
    if (!Number.isFinite(index) || !embedding) {
      continue;
    }
    vectors[index] = embedding;
    if (!dimension) dimension = embedding.length;
  }

  const missing = vectors.some((v) => !v || v.length === 0);
  if (missing) {
    throw new Error("Embedding 返回数据不完整");
  }
  if (!dimension) {
    throw new Error("无法解析 embedding 维度");
  }

  return { vectors, dimension };
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
