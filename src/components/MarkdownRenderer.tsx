/**
 * Markdown 渲染组件
 *
 * 支持：
 * - GFM（GitHub Flavored Markdown）
 * - 代码高亮
 * - 代码块复制
 * - 表格
 * - 任务列表
 */

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

// 导入代码高亮样式
import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        // 自定义代码块渲染
        pre({ children, ...props }) {
          return (
            <div className="relative group">
              <pre {...props} className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm">
                {children}
              </pre>
            </div>
          );
        },
        // 自定义代码渲染（带复制按钮）
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match;

          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono" {...props}>
                {children}
              </code>
            );
          }

          return (
            <CodeBlock language={match[1]} {...props}>
              {children}
            </CodeBlock>
          );
        },
        // 自定义链接
        a({ href, children, ...props }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              {...props}
            >
              {children}
            </a>
          );
        },
        // 自定义表格
        table({ children, ...props }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse" {...props}>
                {children}
              </table>
            </div>
          );
        },
        th({ children, ...props }) {
          return (
            <th
              className="border border-border px-4 py-2 bg-muted text-left font-medium"
              {...props}
            >
              {children}
            </th>
          );
        },
        td({ children, ...props }) {
          return (
            <td className="border border-border px-4 py-2" {...props}>
              {children}
            </td>
          );
        },
        // 自定义列表
        ul({ children, ...props }) {
          return (
            <ul className="list-disc list-inside space-y-1 my-2" {...props}>
              {children}
            </ul>
          );
        },
        ol({ children, ...props }) {
          return (
            <ol className="list-decimal list-inside space-y-1 my-2" {...props}>
              {children}
            </ol>
          );
        },
        // 自定义引用块
        blockquote({ children, ...props }) {
          return (
            <blockquote
              className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4"
              {...props}
            >
              {children}
            </blockquote>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/**
 * 代码块组件（带复制按钮）
 */
interface CodeBlockProps {
  language: string;
  children: React.ReactNode;
}

function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = extractText(children);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {/* 语言标签 */}
      <div className="absolute top-0 left-0 px-2 py-1 text-xs text-zinc-400 bg-zinc-800 rounded-tl-lg rounded-br-lg">
        {language}
      </div>
      {/* 复制按钮 */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
        title="复制代码"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <code className="block pt-8">{children}</code>
    </div>
  );
}

/**
 * 从 React children 中提取文本
 */
function extractText(children: React.ReactNode): string {
  if (typeof children === "string") {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(extractText).join("");
  }
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as React.ReactElement).props.children);
  }
  return "";
}
