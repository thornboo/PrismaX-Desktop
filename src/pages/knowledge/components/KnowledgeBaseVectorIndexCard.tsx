import { Trash2, Wand2 } from "lucide-react";
import type { KnowledgeVectorConfig, Provider } from "../types";
import { formatDate } from "../utils/format";

interface KnowledgeBaseVectorIndexCardProps {
  providers: Provider[];
  embeddingProviderId: string;
  embeddingModel: string;
  vectorConfig: KnowledgeVectorConfig;
  onEmbeddingProviderIdChange: (value: string) => void;
  onEmbeddingModelChange: (value: string) => void;
  onBuild: () => void;
  onRebuild: () => void;
}

export function KnowledgeBaseVectorIndexCard({
  providers,
  embeddingProviderId,
  embeddingModel,
  vectorConfig,
  onEmbeddingProviderIdChange,
  onEmbeddingModelChange,
  onBuild,
  onRebuild,
}: KnowledgeBaseVectorIndexCardProps) {
  const enabledProviders = providers.filter((p) => p.enabled);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">向量索引（LanceDB）</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onBuild}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Wand2 size={16} />
            <span className="text-sm">构建/增量更新</span>
          </button>
          <button
            onClick={onRebuild}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-destructive/20 text-destructive transition-colors"
          >
            <Trash2 size={16} />
            <span className="text-sm">重建</span>
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <div className="text-xs text-muted-foreground">Embedding Provider</div>
          <select
            value={embeddingProviderId}
            onChange={(e) => onEmbeddingProviderIdChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {enabledProviders.length === 0 ? (
              <option value="" disabled>
                无可用提供商（请先在设置中启用并配置 API Key）
              </option>
            ) : (
              enabledProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">
          <div className="text-xs text-muted-foreground">Embedding Model</div>
          <input
            value={embeddingModel}
            onChange={(e) => onEmbeddingModelChange(e.target.value)}
            placeholder="例如：text-embedding-3-small"
            className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        {vectorConfig ? (
          <>
            已配置：{vectorConfig.providerId} · {vectorConfig.model} · dim {vectorConfig.dimension}·
            更新 {formatDate(vectorConfig.updatedAt)}
          </>
        ) : (
          "未检测到向量索引配置（请先构建）"
        )}
      </div>
    </div>
  );
}
