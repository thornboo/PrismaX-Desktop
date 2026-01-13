import { useEffect, useRef } from "react";
import type { Message } from "@/types/electron.d";

interface UseChatStreamParams {
  currentRequestId: string | null;
  currentConversationId: string | null;
  messages: Message[];
  setIsGenerating: (value: boolean) => void;
  setCurrentRequestId: (value: string | null) => void;
  updateMessage: (messageId: string, content: string) => void;
  loadMessages: (conversationId: string) => void;
}

export function useChatStream({
  currentRequestId,
  currentConversationId,
  messages,
  setIsGenerating,
  setCurrentRequestId,
  updateMessage,
  loadMessages,
}: UseChatStreamParams) {
  const requestIdRef = useRef<string | null>(currentRequestId);
  const conversationIdRef = useRef<string | null>(currentConversationId);
  const messagesRef = useRef<Message[]>(messages);

  useEffect(() => {
    requestIdRef.current = currentRequestId;
  }, [currentRequestId]);

  useEffect(() => {
    conversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!window.electron) return;

    const unsubToken = window.electron.chat.onToken(({ requestId, token }) => {
      if (requestId !== requestIdRef.current) return;

      const lastMessage = messagesRef.current[messagesRef.current.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        updateMessage(lastMessage.id, lastMessage.content + token);
      }
    });

    const unsubDone = window.electron.chat.onDone(({ requestId }) => {
      if (requestId !== requestIdRef.current) return;
      setIsGenerating(false);
      setCurrentRequestId(null);
      const conversationId = conversationIdRef.current;
      if (conversationId) loadMessages(conversationId);
    });

    const unsubError = window.electron.chat.onError(({ requestId, message }) => {
      if (requestId !== requestIdRef.current) return;
      setIsGenerating(false);
      setCurrentRequestId(null);
      console.error("Chat error:", message);
    });

    return () => {
      unsubToken();
      unsubDone();
      unsubError();
    };
  }, [loadMessages, setCurrentRequestId, setIsGenerating, updateMessage]);
}
