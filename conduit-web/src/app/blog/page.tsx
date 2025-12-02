import { getAllPosts } from "@/lib/blog";
import { BlogIndex } from "@/components/blog/BlogIndex";

export default function BlogPage() {
  const posts = getAllPosts();

  return <BlogIndex posts={posts} />;
}
