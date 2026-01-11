"use client";

import { ChatInput, MessageList } from "@prismax/ui";
import { useMemo } from "react";

import { useIpcChat } from "../hooks/use-ipc-chat";

export default function Page() {
  const conversationId = "default";
  const { bridgeReady, messages, input, setInput, status, error, canSend, sendMessage } =
    useIpcChat({ conversationId, modelId: "gpt-4o-mini" });

  const disabled = status !== "ready";
  const chatMessages = useMemo(() => messages, [messages]);

  return (
    <div className="h-full">
      <div className="flex h-full flex-col">
        <header className="border-b border-white/10 bg-zinc-950/60 px-6 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-200">
                PrismaX Desktop
              </div>
              <div className="mt-1 truncate text-xs text-zinc-500">
                会话：{conversationId}
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              {status === "streaming" ? "生成中…" : status === "error" ? "错误" : "就绪"}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto px-6 py-6">
          {!bridgeReady ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">
              当前未检测到 IPC Bridge（请使用 `pnpm --filter \"desktop\" dev` 从 Electron 启动）。
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-zinc-400">
              还没有消息，发第一条吧。
            </div>
          ) : (
            <MessageList messages={chatMessages} />
          )}
        </section>

        <section className="border-t border-white/10 bg-zinc-950/60 px-6 py-4 backdrop-blur">
          <div className="flex items-end gap-3">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={sendMessage}
              disabled={disabled || !bridgeReady}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!canSend || !bridgeReady}
              className="h-11 shrink-0 rounded-xl bg-white px-4 text-sm font-medium text-zinc-900 disabled:opacity-60"
            >
              {status === "streaming" ? "发送中…" : "发送"}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-4 text-xs text-zinc-500">
            <div>Enter 发送 · Shift+Enter 换行</div>
            {error ? <div className="truncate text-red-300">{error}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
