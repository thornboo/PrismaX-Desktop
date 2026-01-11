"use client";

import { useEffect, useRef } from "react";

type ChatInputProps = {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatInput({
  value,
  disabled,
  placeholder = "输入消息…",
  onChange,
  onSubmit,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 max-h-40 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-white/20 disabled:opacity-70"
      placeholder={placeholder}
      disabled={disabled}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        if (event.shiftKey) return;
        event.preventDefault();
        onSubmit();
      }}
    />
  );
}

