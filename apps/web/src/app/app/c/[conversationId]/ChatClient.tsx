"use client";

import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { TextStreamChatTransport } from "ai";

import { ChatInput, MessageList, type ChatMessage } from "@prismax/ui";

type MessageItem = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type ChatClientProps = {
  conversationId: string;
  initialMessages: MessageItem[];
};

function toTextParts(parts: Array<any>): string {
  return parts
    .filter((p) => p && p.type === "text")
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("");
}

function toChatMessages(messages: Array<any>): ChatMessage[] {
  return messages.map((m) => {
    const role =
      m?.role === "assistant" || m?.role === "system" ? m.role : "user";
    const content =
      typeof m?.content === "string"
        ? m.content
        : Array.isArray(m?.parts)
          ? toTextParts(m.parts)
          : "";
    return {
      id: typeof m?.id === "string" ? m.id : crypto.randomUUID(),
      role,
      content,
    };
  });
}

export function ChatClient({ conversationId, initialMessages }: ChatClientProps) {
  const router = useRouter();
  const [input, setInput] = useState("");

  const transport = useMemo(
    () => new TextStreamChatTransport({ api: "/api/chat" }),
    [],
  );

  const {
    messages,
    error,
    sendMessage,
    status,
  } = useChat({
    transport,
    id: conversationId,
    messages: initialMessages.map((m) => ({
      id: m.id,
      role:
        m.role === "assistant" || m.role === "system"
          ? m.role
          : ("user" as const),
      parts: [{ type: "text", text: m.content }],
      createdAt: new Date(m.createdAt),
    })),
    onFinish: () => {
      router.refresh();
    },
  });

  const isSending = status !== "ready";
  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);
  const chatMessages = useMemo(() => toChatMessages(messages as Array<any>), [messages]);

  const onSubmit = async () => {
    const content = input.trim();
    if (!content || isSending) return;

    setInput("");
    await sendMessage(
      { text: content },
      {
        body: {
          conversationId,
          model: "gpt-4o-mini",
        },
      },
    );
  };

  return (
    <div className="flex h-full flex-col">
      <section className="flex-1 overflow-y-auto px-6 py-6">
        {chatMessages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">
            还没有消息，发第一条吧。
          </div>
        ) : (
          <MessageList messages={chatMessages} />
        )}
      </section>

      <section className="border-t border-white/10 bg-zinc-950/60 px-6 py-4 backdrop-blur">
        <div className="flex items-end gap-3">
          <ChatInput value={input} onChange={setInput} onSubmit={onSubmit} disabled={isSending} />
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={!canSend}
            className="h-11 shrink-0 rounded-xl bg-white px-4 text-sm font-medium text-zinc-900 disabled:opacity-60"
          >
            {isSending ? "发送中…" : "发送"}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-4 text-xs text-zinc-500">
          <div>Enter 发送 · Shift+Enter 换行</div>
          {error ? <div className="truncate text-red-300">{error.message}</div> : null}
        </div>
      </section>
    </div>
  );
}
