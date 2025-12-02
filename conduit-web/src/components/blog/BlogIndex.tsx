"use client";

import { BlogCard } from "@/components/blog/BlogCard";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useState, useMemo } from "react";
import { BookOpen, Filter } from "lucide-react";
import type { BlogPost } from "@/lib/blog";

interface BlogIndexProps {
  posts: BlogPost[];
}

export function BlogIndex({ posts }: BlogIndexProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(posts.map((post) => post.category));
    return ["All", ...Array.from(cats).sort()];
  }, [posts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    if (selectedCategory === "All") return posts;
    return posts.filter((post) => post.category === selectedCategory);
  }, [posts, selectedCategory]);

  // Get featured post (most recent)
  const featuredPost = posts[0];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary mb-6">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-medium">
                Conduit Development Blog
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Building the World's <br />
              <span className="text-gradient">Fastest Web Framework</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Deep dives into performance optimization, framework architecture,
              and the journey of building Conduit with Codon.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-semibold">
                ✨ Featured Post
              </div>
            </div>
            <div className="max-w-4xl">
              <BlogCard post={featuredPost} />
            </div>
          </div>
        </section>
      )}

      {/* Category Filter */}
      <section className="pb-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Filter className="w-4 h-4" />
              <span>Filter by:</span>
            </div>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-primary text-white"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {category}
                {category !== "All" && (
                  <span className="ml-2 text-xs opacity-70">
                    ({posts.filter((p) => p.category === category).length})
                  </span>
                )}
                {category === "All" && (
                  <span className="ml-2 text-xs opacity-70">
                    ({posts.length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* All Posts */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">
                No posts found in this category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
