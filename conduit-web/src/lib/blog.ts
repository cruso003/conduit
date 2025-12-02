import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "../docs/blog");

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  readTime: number;
  author: string;
  heroImage?: string;
}

function categorizePost(slug: string, content: string): string {
  if (
    slug.includes("mcp") ||
    content.toLowerCase().includes("model context protocol")
  )
    return "MCP";
  if (
    slug.includes("sse") ||
    content.toLowerCase().includes("server-sent events")
  )
    return "Real-Time";
  if (slug.includes("middleware")) return "Architecture";
  if (slug.includes("week-")) return "Development Log";
  if (
    slug.includes("benchmark") ||
    content.toLowerCase().includes("performance")
  )
    return "Performance";
  if (slug.includes("framework")) return "Framework";
  return "Tutorial";
}

function extractTags(content: string): string[] {
  const tags: string[] = [];
  if (content.toLowerCase().includes("codon")) tags.push("Codon");
  if (
    content.toLowerCase().includes("performance") ||
    content.toLowerCase().includes("benchmark")
  )
    tags.push("Performance");
  if (content.toLowerCase().includes("mcp")) tags.push("MCP");
  if (
    content.toLowerCase().includes("real-time") ||
    content.toLowerCase().includes("streaming")
  )
    tags.push("Real-Time");
  if (content.toLowerCase().includes("middleware")) tags.push("Middleware");
  if (content.toLowerCase().includes("http")) tags.push("HTTP");
  return tags.slice(0, 3);
}

function estimateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

function parseDate(dateLine: string | undefined, slug: string): string {
  if (!dateLine) {
    // Infer from filename if it contains week number
    const weekMatch = slug.match(/week-(\d+)/);
    if (weekMatch) {
      const weekNum = parseInt(weekMatch[1]);
      // Assume project started Oct 1, 2025
      const startDate = new Date("2025-10-01");
      startDate.setDate(startDate.getDate() + (weekNum - 1) * 7);
      return startDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    // Default to mid-October for posts without dates
    return "October 15, 2025";
  }
  return dateLine.replace(/_/g, "").replace(/\*\*/g, "").trim();
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) {
    console.warn(`Blog directory not found at ${BLOG_DIR}`);
    return [];
  }

  const files = fs.readdirSync(BLOG_DIR);
  const posts = files
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const fullPath = path.join(BLOG_DIR, file);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const lines = fileContents.split("\n");

      const titleLine = lines.find((line) => line.startsWith("# "));
      const title = titleLine ? titleLine.replace("# ", "").trim() : slug;

      const dateLine = lines.find(
        (line) =>
          (line.trim().startsWith("_") || line.trim().startsWith("**")) &&
          (line.includes("2025") || line.includes("202"))
      );
      const date = parseDate(dateLine, slug);

      const contentLines = lines.filter(
        (line) =>
          !line.startsWith("# ") &&
          !line.startsWith("---") &&
          !line.trim().startsWith("_") &&
          !line.trim().startsWith("**") &&
          line.trim().length > 0
      );
      const excerpt = (contentLines[0] || "").replace(/#+/g, "").trim();

      const category = categorizePost(slug, fileContents);
      const tags = extractTags(fileContents);
      const readTime = estimateReadTime(fileContents);

      return {
        slug,
        title,
        date,
        content: fileContents,
        excerpt: excerpt.slice(0, 160) + (excerpt.length > 160 ? "..." : ""),
        category,
        tags,
        readTime,
        author: "Conduit Team",
      };
    })
    .sort((a, b) => {
      // Parse dates for accurate sorting
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

  return posts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(BLOG_DIR, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, "utf8");

    const lines = fileContents.split("\n");
    const titleLine = lines.find((line) => line.startsWith("# "));
    const title = titleLine ? titleLine.replace("# ", "").trim() : slug;

    const dateLine = lines.find(
      (line) =>
        (line.trim().startsWith("_") || line.trim().startsWith("**")) &&
        (line.includes("2025") || line.includes("202"))
    );
    const date = parseDate(dateLine, slug);

    const contentLines = lines.filter(
      (line) =>
        !line.startsWith("# ") &&
        !line.startsWith("---") &&
        !line.trim().startsWith("_") &&
        !line.trim().startsWith("**") &&
        line.trim().length > 0
    );
    const excerpt = (contentLines[0] || "").replace(/#+/g, "").trim();

    const category = categorizePost(slug, fileContents);
    const tags = extractTags(fileContents);
    const readTime = estimateReadTime(fileContents);

    return {
      slug,
      title,
      date,
      content: fileContents,
      excerpt,
      category,
      tags,
      readTime,
      author: "Conduit Team",
    };
  } catch (e) {
    return null;
  }
}
