import Link from "next/link";
import { BlogPost } from "@/lib/blog";
import { Calendar, Clock, ArrowRight, Tag } from "lucide-react";

export function BlogCard({ post }: { post: BlogPost }) {
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
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <div className="h-full p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all flex flex-col">
        {/* Category Badge */}
        <div className="mb-4">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
              categoryColors[post.category] || categoryColors["Tutorial"]
            }`}
          >
            {post.category}
          </span>
        </div>

        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>

        <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-grow">
          {post.excerpt}
        </p>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs text-gray-500"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-white/5 pt-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {post.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.readTime} min read
            </span>
          </div>

          <div className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
            Read <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}
