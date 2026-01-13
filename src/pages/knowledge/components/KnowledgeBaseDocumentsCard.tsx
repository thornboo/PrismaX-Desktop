import { Trash2 } from "lucide-react";
import type { KnowledgeDocument } from "../types";
import { formatBytes, formatDate } from "../utils/format";

interface KnowledgeBaseDocumentsCardProps {
  documents: KnowledgeDocument[];
  onDeleteDocument: (documentId: string) => void;
}

export function KnowledgeBaseDocumentsCard({
  documents,
  onDeleteDocument,
}: KnowledgeBaseDocumentsCardProps) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-sm font-medium">文档</div>
      {documents.length === 0 ? (
        <div className="mt-2 text-sm text-muted-foreground">暂无文档</div>
      ) : (
        <div className="mt-3 space-y-2">
          {documents.slice(0, 50).map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded border border-border p-3"
            >
              <div className="min-w-0">
                <div className="text-sm truncate">
                  {doc.title} <span className="text-xs text-muted-foreground">({doc.kind})</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {doc.sourcePath ? doc.sourcePath : "—"} · {formatBytes(doc.sizeBytes)} · 更新{" "}
                  {formatDate(doc.updatedAt)}
                </div>
              </div>
              <button
                onClick={() => onDeleteDocument(doc.id)}
                className="p-2 rounded hover:bg-destructive/20 text-destructive transition-colors"
                title="删除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {documents.length > 50 && (
            <div className="text-xs text-muted-foreground">仅显示最近 50 条</div>
          )}
        </div>
      )}
    </div>
  );
}
