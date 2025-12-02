"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { ArrowLeft, ArrowRight, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { DocPage } from "@/lib/docs";
import "highlight.js/styles/github-dark.css";

interface DocsContentProps {
  page: DocPage;
  prev: DocPage | null;
  next: DocPage | null;
}

export function DocsContent({ page, prev, next }: DocsContentProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/docs" className="hover:text-white transition-colors">
            Documentation
          </Link>
          <span>/</span>
          <span className="text-white">{page.category.replace("-", " ")}</span>
        </nav>
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gradient">
        {page.title}
      </h1>
      <p className="text-xl text-gray-400 mb-12">{page.description}</p>

      {/* Content */}
      <article className="prose prose-invert prose-lg max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            rehypeHighlight,
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: "wrap" }],
          ]}
          components={{
            pre: ({ node, children, ...props }) => {
              const codeElement = node?.children?.[0];
              const codeContent =
                codeElement?.type === "element" &&
                codeElement.children?.[0]?.type === "text"
                  ? codeElement.children[0].value
                  : "";

              return (
                <div className="relative group">
                  <button
                    onClick={() => copyToClipboard(codeContent)}
                    className="absolute right-2 top-2 p-2 rounded-lg bg-white/10 border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
                    title="Copy code"
                  >
                    {copiedCode === codeContent ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <pre {...props}>{children}</pre>
                </div>
              );
            },
            code: ({ node, className, children, ...props }) => {
              const isInline = !className;
              return isInline ? (
                <code
                  className="px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30"
                  {...props}
                >
                  {children}
                </code>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            h1: ({ children }) => (
              <h1 className="text-3xl font-bold mt-12 mb-6 text-gradient">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold mt-10 mb-4 text-white">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-semibold mt-8 mb-3 text-white">
                {children}
              </h3>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-primary hover:underline"
                target={href?.startsWith("http") ? "_blank" : undefined}
                rel={
                  href?.startsWith("http") ? "noopener noreferrer" : undefined
                }
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary pl-4 italic text-gray-300 my-6">
                {children}
              </blockquote>
            ),
          }}
        >
          {page.content}
        </ReactMarkdown>
      </article>

      {/* Navigation */}
      <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between gap-4">
        {prev ? (
          <Link
            href={`/docs${prev.path}`}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group flex-1"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <div className="text-left">
              <div className="text-xs text-gray-400 mb-1">Previous</div>
              <div className="font-medium">{prev.title}</div>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        {next ? (
          <Link
            href={`/docs${next.path}`}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group flex-1 text-right"
          >
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">Next</div>
              <div className="font-medium">{next.title}</div>
            </div>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
