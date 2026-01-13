import { useEffect, useRef } from "react";
import type { Message } from "@/types/electron.d";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  isGenerating: boolean;
  editingMessageId: string | null;
  editContent: string;
  onEditContentChange: (content: string) => void;
  onStartEdit: (message: Message) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDeleteMessage: (messageId: string) => void;
  onRegenerateFromUserMessage: (userMessageIndex: number) => void;
}

export function MessageList({
  messages,
  isGenerating,
  editingMessageId,
  editContent,
  onEditContentChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteMessage,
  onRegenerateFromUserMessage,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
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
                onEditContentChange={onEditContentChange}
                onStartEdit={() => onStartEdit(message)}
                onCancelEdit={onCancelEdit}
                onSaveEdit={onSaveEdit}
                onDelete={() => onDeleteMessage(message.id)}
                onRegenerate={
                  message.role === "user" ? () => onRegenerateFromUserMessage(index) : undefined
                }
                isGenerating={isGenerating}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
