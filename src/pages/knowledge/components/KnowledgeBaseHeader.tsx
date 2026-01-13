import { Link } from "react-router-dom";
import { ArrowLeft, FolderOpen, Trash2 } from "lucide-react";

interface KnowledgeBaseHeaderProps {
  name: string;
  description: string;
  onOpenDir: () => void;
  onDeleteBase: () => void;
}

export function KnowledgeBaseHeader({
  name,
  description,
  onOpenDir,
  onDeleteBase,
}: KnowledgeBaseHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/knowledge" className="p-2 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{name}</h1>
          <div className="text-xs text-muted-foreground truncate">{description}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenDir}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <FolderOpen size={16} />
          <span className="text-sm">打开目录</span>
        </button>
        <button
          onClick={onDeleteBase}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-destructive/20 text-destructive transition-colors"
        >
          <Trash2 size={16} />
          <span className="text-sm">删除</span>
        </button>
      </div>
    </div>
  );
}
