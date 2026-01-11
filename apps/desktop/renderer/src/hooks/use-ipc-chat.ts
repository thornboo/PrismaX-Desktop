"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatMessage } from "@prismax/ui";

type ChatStatus = "ready" | "streaming" | "error";

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (crypto as any).randomUUID() as string;
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function useIpcChat(options?: { conversationId?: string; modelId?: string }) {
  const conversationId = options?.conversationId ?? "default";
  const modelId = options?.modelId ?? "gpt-4o-mini";

  const [bridgeReady, setBridgeReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [error, setError] = useState<string | null>(null);

  const current = useRef<{ requestId: string | null; assistantLocalId: string | null }>({
    requestId: null,
    assistantLocalId: null,
  });

  useEffect(() => {
    setBridgeReady(!!window.electron?.chat);
  }, []);

  const reloadHistory = useCallback(async () => {
    if (!window.electron?.chat) return;
    const history = await window.electron.chat.history(conversationId);
    setMessages(
      history.messages.map((m) => ({
        id: m.id,
        role: m.role === "assistant" || m.role === "system" ? m.role : "user",
        content: m.content,
      })),
    );
  }, [conversationId]);

  useEffect(() => {
    if (!bridgeReady) return;
    void reloadHistory();
  }, [bridgeReady, reloadHistory]);

  useEffect(() => {
    if (!bridgeReady || !window.electron?.chat) return;

    const offToken = window.electron.chat.onToken(({ requestId, token }) => {
      if (!token) return;
      if (!current.current.requestId || current.current.requestId !== requestId) return;
      const assistantLocalId = current.current.assistantLocalId;
      if (!assistantLocalId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantLocalId ? { ...m, content: m.content + token } : m,
        ),
      );
    });

    const offDone = window.electron.chat.onDone(({ requestId }) => {
      if (!current.current.requestId || current.current.requestId !== requestId) return;
      current.current.requestId = null;
      current.current.assistantLocalId = null;
      setStatus("ready");
      void reloadHistory();
    });

    const offError = window.electron.chat.onError(({ requestId, message }) => {
      if (!current.current.requestId || current.current.requestId !== requestId) return;
      current.current.requestId = null;
      setStatus("error");
      const errorText = message || "发送失败";
      setError(errorText);

      const assistantLocalId = current.current.assistantLocalId;
      if (!assistantLocalId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantLocalId && m.content.trim().length === 0
            ? { ...m, content: `（${errorText}）` }
            : m,
        ),
      );
    });

    return () => {
      offToken();
      offDone();
      offError();
    };
  }, [bridgeReady, reloadHistory]);

  const canSend = useMemo(() => input.trim().length > 0 && status === "ready", [input, status]);

  const sendMessage = useCallback(async () => {
    if (!window.electron?.chat) return;
    if (!canSend) return;

    const content = input.trim();
    if (!content) return;

    setError(null);
    setStatus("streaming");
    setInput("");

    const userLocalId = makeId();
    const assistantLocalId = makeId();

    setMessages((prev) => [
      ...prev,
      { id: userLocalId, role: "user", content },
      { id: assistantLocalId, role: "assistant", content: "" },
    ]);

    const result = await window.electron.chat.send({ conversationId, content, modelId });
    current.current.requestId = result.requestId;
    current.current.assistantLocalId = assistantLocalId;

    if (result.error) {
      current.current.requestId = null;
      current.current.assistantLocalId = null;
      setStatus("error");
      setError(result.error);
    }
  }, [canSend, conversationId, input, modelId]);

  return {
    bridgeReady,
    messages,
    input,
    setInput,
    status,
    error,
    canSend,
    sendMessage,
    reloadHistory,
  };
}
