import { getAllDocs } from "@/lib/docs";
import { BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DocsIndexPage() {
  const categories = getAllDocs();

  return (
    <div className="max-w-5xl">
      {/* Hero */}
      <div className="mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary mb-6">
          <BookOpen className="w-4 h-4" />
          <span className="text-sm font-medium">Documentation</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Welcome to <span className="text-gradient">Conduit</span> Docs
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl">
          Everything you need to build high-performance web services with
          Conduit. From quick starts to advanced deployment strategies.
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((category) => (
          <div
            key={category.slug}
            className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 transition-all group"
          >
            <h2 className="text-2xl font-bold mb-4 group-hover:text-gradient transition-all">
              {category.name}
            </h2>
            <ul className="space-y-3">
              {category.pages.map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/docs${page.path}`}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group/link"
                  >
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover/link:opacity-100 -ml-6 group-hover/link:ml-0 transition-all" />
                    <span>{page.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="mt-16 p-8 rounded-xl bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30">
        <h3 className="text-2xl font-bold mb-4">New to Conduit?</h3>
        <p className="text-gray-300 mb-6">
          Get started with our comprehensive quick start guide that walks you
          through installation, your first server, and core concepts.
        </p>
        <Link
          href="/docs/getting-started/quickstart"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Start Building
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
