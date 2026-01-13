import { Import } from "lucide-react";

interface KnowledgeBaseImportCardProps {
  activeJobsCount: number;
  onImportFiles: () => void;
  onImportDirectory: () => void;
}

export function KnowledgeBaseImportCard({
  activeJobsCount,
  onImportFiles,
  onImportDirectory,
}: KnowledgeBaseImportCardProps) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">导入</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onImportFiles}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Import size={16} />
            <span className="text-sm">导入文件</span>
          </button>
          <button
            onClick={onImportDirectory}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Import size={16} />
            <span className="text-sm">导入目录</span>
          </button>
        </div>
      </div>
      {activeJobsCount > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          当前有 {activeJobsCount} 个未完成任务，导入会自动串行处理（同一知识库一次只跑一个）。
        </div>
      )}
    </div>
  );
}
