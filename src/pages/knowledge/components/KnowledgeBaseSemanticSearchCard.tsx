import { Search } from "lucide-react";
import type { SemanticResult } from "../types";

interface KnowledgeBaseSemanticSearchCardProps {
  query: string;
  topK: number;
  results: SemanticResult[];
  onQueryChange: (value: string) => void;
  onTopKChange: (value: number) => void;
  onSearch: () => void;
}

export function KnowledgeBaseSemanticSearchCard({
  query,
  topK,
  results,
  onQueryChange,
  onTopKChange,
  onSearch,
}: KnowledgeBaseSemanticSearchCardProps) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">语义检索（向量）</div>
        <button
          onClick={onSearch}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Search size={16} />
          <span className="text-sm">搜索</span>
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="输入语义检索文本..."
          className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">TopK</span>
          <input
            type="number"
            min={1}
            max={50}
            value={topK}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) return;
              onTopKChange(Math.min(50, Math.max(1, n)));
            }}
            className="w-24 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((r) => (
            <div key={r.chunkId} className="rounded border border-border p-3">
              <div className="text-sm">
                <span className="font-medium">{r.documentTitle}</span>{" "}
                <span className="text-xs text-muted-foreground">
                  {r.distance === null ? "" : `distance ${r.distance.toFixed(4)}`}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                {r.content}
              </div>
            </div>
          ))}
        </div>
      )}
      {results.length === 0 && query.trim() && (
        <div className="mt-3 text-sm text-muted-foreground">无结果</div>
      )}
    </div>
  );
}
