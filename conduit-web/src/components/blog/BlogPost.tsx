"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { BlogPost as BlogPostType } from "@/lib/blog";
import { Calendar, Clock, ArrowLeft, Tag, User } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "highlight.js/styles/github-dark.css";

export function BlogPost({ post }: { post: BlogPostType }) {
  const categoryColors: Record<string, string> = {
    MCP: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "Real-Time": "bg-green-500/20 text-green-400 border-green-500/30",
    Architecture: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Performance: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Framework: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    Tutorial: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    "Development Log": "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />

      <article className="pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Button */}
          <Link
            href="/blog"
            className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Blog
          </Link>

          {/* Article Header */}
          <header className="mb-12">
            {/* Category */}
            <div className="flex items-center gap-3 mb-6">
              <span
                className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold border ${
                  categoryColors[post.category] || categoryColors["Tutorial"]
                }`}
              >
                {post.category}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-gradient">
              {post.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 pb-6 border-b border-white/10">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <time>{post.date}</time>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.readTime} min read</span>
              </div>
            </div>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Article Content */}
          <div
            className="prose prose-invert prose-lg max-w-none 
            prose-headings:font-bold prose-headings:text-white prose-headings:scroll-mt-24
            prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b prose-h2:border-white/10
            prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
            prose-p:text-gray-300 prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white prose-strong:font-semibold
            prose-code:text-primary prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
            prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl
            prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-white/5 prose-blockquote:py-1 prose-blockquote:px-6
            prose-ul:text-gray-300 prose-ol:text-gray-300
            prose-li:marker:text-primary
            prose-table:border-collapse prose-table:border prose-table:border-white/10
            prose-th:bg-white/5 prose-th:border prose-th:border-white/10 prose-th:px-4 prose-th:py-2
            prose-td:border prose-td:border-white/10 prose-td:px-4 prose-td:py-2
            prose-img:rounded-xl prose-img:border prose-img:border-white/10
          "
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight, rehypeSlug]}
              components={{
                pre: ({ node, ...props }) => (
                  <pre
                    {...props}
                    className="rounded-xl overflow-hidden !bg-black/50 !p-0 border border-white/10"
                  />
                ),
                code: ({ node, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "");
                  return match ? (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  ) : (
                    <code
                      className="bg-white/10 rounded px-1.5 py-0.5 text-sm font-mono text-primary"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                h2: ({ node, children, ...props }) => (
                  <h2 {...props}>
                    <span className="text-gradient">{children}</span>
                  </h2>
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Article Footer */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Posts
            </Link>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}
