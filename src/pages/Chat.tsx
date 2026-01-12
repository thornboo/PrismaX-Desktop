import { useEffect, useRef, useState } from "react";
import { Send, Square, Loader2, Copy, Check, Pencil, Trash2, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversationStore } from "@/stores";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { Message } from "@/types/electron.d";

export function Chat() {
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    currentConversationId,
    messages,
    createConversation,
    addMessage,
    updateMessage,
    loadMessages,
  } = useConversationStore();

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 监听流式响应
  useEffect(() => {
    if (!window.electron) return;

    // 监听 token
    const unsubToken = window.electron.chat.onToken(({ requestId, token }) => {
      if (requestId === currentRequestId) {
        // 更新最后一条消息
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          updateMessage(lastMessage.id, lastMessage.content + token);
        }
      }
    });

    // 监听完成
    const unsubDone = window.electron.chat.onDone(({ requestId }) => {
      if (requestId === currentRequestId) {
        setIsGenerating(false);
        setCurrentRequestId(null);
        // 重新加载消息以获取完整内容
        if (currentConversationId) {
          loadMessages(currentConversationId);
        }
      }
    });

    // 监听错误
    const unsubError = window.electron.chat.onError(({ requestId, message }) => {
      if (requestId === currentRequestId) {
        setIsGenerating(false);
        setCurrentRequestId(null);
        console.error("Chat error:", message);
      }
    });

    return () => {
      unsubToken();
      unsubDone();
      unsubError();
    };
  }, [currentRequestId, messages, updateMessage, loadMessages, currentConversationId]);

  // 发送消息
  const handleSend = async (content?: string) => {
    const messageContent = content || input.trim();
    if (!messageContent || isGenerating) return;

    setInput("");

    try {
      // 如果没有当前会话，先创建一个
      let conversationId = currentConversationId;
      if (!conversationId) {
        const conversation = await createConversation();
        conversationId = conversation.id;
      }

      setIsGenerating(true);

      // 添加用户消息到本地状态（乐观更新）
      const userMessage: Message = {
        id: crypto.randomUUID(),
        conversationId,
        role: "user",
        content: messageContent,
        modelId: null,
        promptTokens: null,
        completionTokens: null,
        createdAt: new Date().toISOString(),
      };
      addMessage(userMessage);

      // 添加助手消息占位
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        conversationId,
        role: "assistant",
        content: "",
        modelId: null,
        promptTokens: null,
        completionTokens: null,
        createdAt: new Date().toISOString(),
      };
      addMessage(assistantMessage);

      // 发送请求
      const result = await window.electron.chat.send({
        conversationId,
        content: messageContent,
      });

      setCurrentRequestId(result.requestId);
    } catch (error) {
      console.error("发送消息失败:", error);
      setIsGenerating(false);
    }
  };

  // 停止生成
  const handleStop = async () => {
    if (currentRequestId) {
      setIsGenerating(false);
      setCurrentRequestId(null);
    }
  };

  // 删除消息
  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("确定要删除这条消息吗？")) return;

    try {
      await window.electron.db.deleteMessage(messageId);
      if (currentConversationId) {
        loadMessages(currentConversationId);
      }
    } catch (error) {
      console.error("删除消息失败:", error);
    }
  };

  // 开始编辑消息
  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;

    try {
      await window.electron.db.updateMessage(editingMessageId, {
        content: editContent.trim(),
      });
      if (currentConversationId) {
        loadMessages(currentConversationId);
      }
      handleCancelEdit();
    } catch (error) {
      console.error("更新消息失败:", error);
    }
  };

  // 重新生成（从某条用户消息开始）
  const handleRegenerate = async (userMessageIndex: number) => {
    if (isGenerating) return;

    const userMessage = messages[userMessageIndex];
    if (userMessage.role !== "user") return;

    // 删除该消息之后的所有消息
    const messagesToDelete = messages.slice(userMessageIndex);
    for (const msg of messagesToDelete) {
      await window.electron.db.deleteMessage(msg.id);
    }

    // 重新发送
    await handleSend(userMessage.content);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 自动调整文本框高度
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <h1 className="text-2xl font-bold mb-2">欢迎使用 PrismaX</h1>
              <p className="text-muted-foreground">开始一段新的对话吧</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isEditing={editingMessageId === message.id}
                  editContent={editContent}
                  onEditContentChange={setEditContent}
                  onStartEdit={() => handleStartEdit(message)}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onDelete={() => handleDeleteMessage(message.id)}
                  onRegenerate={message.role === "user" ? () => handleRegenerate(index) : undefined}
                  isGenerating={isGenerating}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
              className="flex-1 min-h-[48px] max-h-[200px] p-3 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={1}
              disabled={isGenerating}
            />
            {isGenerating ? (
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors self-end"
              >
                <Square size={18} />
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className={cn(
                  "px-4 py-2 rounded-lg transition-colors self-end",
                  input.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                <Send size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 消息气泡组件
 */
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

function MessageBubble({
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
      {/* 头像 */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {isUser ? "U" : "AI"}
      </div>

      {/* 消息内容 */}
      <div className={cn("flex-1 max-w-[80%]", isUser && "flex flex-col items-end")}>
        {isEditing ? (
          // 编辑模式
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
          // 显示模式
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

            {/* 操作按钮 */}
            {message.content && (
              <div
                className={cn(
                  "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
                  isUser && "flex-row-reverse",
                )}
              >
                {/* 复制 */}
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="复制"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>

                {/* 编辑（仅用户消息） */}
                {isUser && (
                  <button
                    onClick={onStartEdit}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="编辑"
                  >
                    <Pencil size={14} />
                  </button>
                )}

                {/* 重新生成（仅用户消息） */}
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

                {/* 删除 */}
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
