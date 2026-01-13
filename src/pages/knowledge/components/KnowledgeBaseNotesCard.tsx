interface KnowledgeBaseNotesCardProps {
  title: string;
  content: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onCreate: () => void;
}

export function KnowledgeBaseNotesCard({
  title,
  content,
  onTitleChange,
  onContentChange,
  onCreate,
}: KnowledgeBaseNotesCardProps) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-sm font-medium">新建笔记</div>
      <div className="mt-3 space-y-2">
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="标题"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="内容（支持 Markdown，保存后会被索引）"
          className="w-full min-h-[140px] px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center justify-end">
          <button
            onClick={onCreate}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            保存并索引
          </button>
        </div>
      </div>
    </div>
  );
}
