import { useState } from "react";
import { Check, Copy, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { Message } from "@/types/electron.d";

interface MessageBubbleProps {
  message: Message;
  isEditing: boolean;
  editContent: string;
  onEditContentChange: (content: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onRegenerate?: () => void;
  isGenerating: boolean;
}

export function MessageBubble({
  message,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onRegenerate,
  isGenerating,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex gap-3 group", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {isUser ? "U" : "AI"}
      </div>

      <div className={cn("flex-1 max-w-[80%]", isUser && "flex flex-col items-end")}>
        {isEditing ? (
          <div className="w-full space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              className="w-full min-h-[100px] p-3 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={onCancelEdit}
                className="px-3 py-1.5 text-sm border border-input rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={onSaveEdit}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "rounded-lg p-3",
                isUser ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {message.content ? (
                isUser ? (
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                ) : (
                  <MarkdownRenderer content={message.content} />
                )
              ) : (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="animate-spin" size={16} />
                  思考中...
                </span>
              )}
            </div>

            {message.content && (
              <div
                className={cn(
                  "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
                  isUser && "flex-row-reverse",
                )}
              >
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="复制"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>

                {isUser && (
                  <button
                    onClick={onStartEdit}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="编辑"
                  >
                    <Pencil size={14} />
                  </button>
                )}

                {isUser && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    disabled={isGenerating}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="重新生成"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}

                <button
                  onClick={onDelete}
                  className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
