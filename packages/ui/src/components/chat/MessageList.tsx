"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "./types";

type MessageListProps = {
  messages: ChatMessage[];
};

const containerVariants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.035, delayChildren: 0.02 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(6px)" },
};

export function MessageList({ messages }: MessageListProps) {
  const reduceMotion = useReducedMotion();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [messages.length, messages.length > 0 ? messages[messages.length - 1]?.content : "", reduceMotion]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            variants={itemVariants}
            exit="exit"
            layout
          >
            <MessageBubble message={message} />
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </motion.div>
  );
}

