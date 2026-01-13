interface KnowledgeBaseOverviewCardProps {
  busy: boolean;
  stats: { documents: number; chunks: number; jobs: number } | null;
}

export function KnowledgeBaseOverviewCard({ busy, stats }: KnowledgeBaseOverviewCardProps) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-sm font-medium">概览</div>
      <div className="mt-2 text-sm text-muted-foreground">
        {stats ? (
          <>
            文档 {stats.documents} · 分块 {stats.chunks} · 任务 {stats.jobs}
          </>
        ) : (
          "加载中..."
        )}
      </div>
      {busy && <div className="mt-2 text-xs text-muted-foreground">处理中...</div>}
    </div>
  );
}
