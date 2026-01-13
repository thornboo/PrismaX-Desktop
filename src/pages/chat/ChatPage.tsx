import { useState } from "react";
import { useConversationStore } from "@/stores";
import type { Message } from "@/types/electron.d";
import { ChatInput } from "./components/ChatInput";
import { MessageList } from "./components/MessageList";
import { useChatStream } from "./hooks/useChatStream";

export function ChatPage() {
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const {
    currentConversationId,
    messages,
    createConversation,
    addMessage,
    updateMessage,
    loadMessages,
  } = useConversationStore();

  useChatStream({
    currentRequestId,
    currentConversationId,
    messages,
    setIsGenerating,
    setCurrentRequestId,
    updateMessage,
    loadMessages,
  });

  const handleSend = async (content?: string) => {
    const messageContent = content || input.trim();
    if (!messageContent || isGenerating) return;

    setInput("");
    let conversationId = currentConversationId;
    if (!conversationId) {
      const conversation = await createConversation();
      if (!conversation) return;
      conversationId = conversation.id;
    }

    setIsGenerating(true);

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

    const result = await window.electron.chat.send({
      conversationId,
      content: messageContent,
    });
    if (!result.success) {
      console.error("发送消息失败:", result.error);
      setIsGenerating(false);
      return;
    }

    setCurrentRequestId(result.data.requestId);
  };

  const handleStop = async () => {
    if (!currentRequestId) return;
    try {
      await window.electron.chat.cancel(currentRequestId);
    } finally {
      setIsGenerating(false);
      setCurrentRequestId(null);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("确定要删除这条消息吗？")) return;
    const result = await window.electron.db.deleteMessage(messageId);
    if (!result.success) {
      console.error("删除消息失败:", result.error);
      return;
    }
    if (currentConversationId) loadMessages(currentConversationId);
  };

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;
    const result = await window.electron.db.updateMessage(editingMessageId, {
      content: editContent.trim(),
    });
    if (!result.success) {
      console.error("更新消息失败:", result.error);
      return;
    }
    if (currentConversationId) loadMessages(currentConversationId);
    handleCancelEdit();
  };

  const handleRegenerate = async (userMessageIndex: number) => {
    if (isGenerating) return;
    const userMessage = messages[userMessageIndex];
    if (userMessage.role !== "user") return;

    const messagesToDelete = messages.slice(userMessageIndex);
    for (const msg of messagesToDelete) {
      const res = await window.electron.db.deleteMessage(msg.id);
      if (!res.success) {
        console.error("删除消息失败:", res.error);
        return;
      }
    }

    await handleSend(userMessage.content);
  };

  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={messages}
        isGenerating={isGenerating}
        editingMessageId={editingMessageId}
        editContent={editContent}
        onEditContentChange={setEditContent}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onSaveEdit={handleSaveEdit}
        onDeleteMessage={handleDeleteMessage}
        onRegenerateFromUserMessage={handleRegenerate}
      />

      <ChatInput
        value={input}
        isGenerating={isGenerating}
        onChange={setInput}
        onSend={() => void handleSend()}
        onStop={() => void handleStop()}
      />
    </div>
  );
}
