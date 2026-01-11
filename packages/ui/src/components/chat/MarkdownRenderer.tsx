"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

type MarkdownRendererProps = {
  content: string;
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: (props) => (
            <a
              {...props}
              className="underline underline-offset-4 hover:text-white"
              target="_blank"
              rel="noreferrer"
            />
          ),
          pre: (props) => (
            <pre
              {...props}
              className="my-2 overflow-auto rounded-xl border border-white/10 bg-zinc-950/70 p-3"
            />
          ),
          code: (props) => {
            const { className, children, ...rest } = props;
            const isInline = !className;
            return (
              <code
                {...rest}
                className={[
                  className ?? "",
                  isInline
                    ? "rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5"
                    : "text-sm",
                ].join(" ")}
              >
                {children}
              </code>
            );
          },
          ul: (props) => <ul {...props} className="my-2 list-disc pl-5" />,
          ol: (props) => <ol {...props} className="my-2 list-decimal pl-5" />,
          li: (props) => <li {...props} className="my-1" />,
          p: (props) => <p {...props} className="my-2 whitespace-pre-wrap" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

