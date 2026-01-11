"use client";

import { useState } from "react";

import { MarkdownRenderer } from "./MarkdownRenderer";
import type { ChatMessage } from "./types";

type MessageBubbleProps = {
  message: ChatMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div className="group relative max-w-[85%]">
        <div
          className={[
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-white text-zinc-900"
              : "border border-white/10 bg-white/[0.04] text-zinc-100",
          ].join(" ")}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        <button
          type="button"
          className={[
            "absolute -top-3 right-2 hidden h-7 rounded-full px-2 text-[11px]",
            "border border-white/10 bg-zinc-950/70 text-zinc-200",
            "backdrop-blur hover:bg-zinc-950/90 group-hover:inline-flex",
          ].join(" ")}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(message.content);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 800);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
    </div>
  );
}

