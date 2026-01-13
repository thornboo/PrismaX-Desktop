import { Search } from "lucide-react";
import type { SearchResult } from "../types";

interface KnowledgeBaseFtsSearchCardProps {
  query: string;
  results: SearchResult[];
  onQueryChange: (value: string) => void;
  onSearch: () => void;
}

export function KnowledgeBaseFtsSearchCard({
  query,
  results,
  onQueryChange,
  onSearch,
}: KnowledgeBaseFtsSearchCardProps) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">检索（FTS5）</div>
        <button
          onClick={onSearch}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Search size={16} />
          <span className="text-sm">搜索</span>
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="输入关键词 / FTS 查询..."
          className="flex-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((r) => (
            <div key={r.chunkId} className="rounded border border-border p-3">
              <div className="text-sm">
                <span className="font-medium">{r.documentTitle}</span>{" "}
                <span className="text-xs text-muted-foreground">({r.documentKind})</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                {r.snippet}
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
