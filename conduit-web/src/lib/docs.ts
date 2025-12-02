import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  category: string;
  order: number;
  content: string;
  path: string;
}

export interface DocCategory {
  name: string;
  slug: string;
  order: number;
  pages: DocPage[];
}

// Handle both development and production paths
const docsDirectory = (() => {
  // In development, process.cwd() is conduit-web
  // In production, it's also conduit-web
  const devPath = path.join(process.cwd(), "..", "docs");

  // Check if the path exists
  if (fs.existsSync(devPath)) {
    return devPath;
  }

  // Fallback to absolute path
  return path.join(process.cwd(), "..", "docs");
})();

// Define the documentation structure and order
const categoryConfig = [
  { name: "Getting Started", slug: "getting-started", order: 1 },
  { name: "Framework", slug: "framework", order: 2 },
  { name: "MCP Protocol", slug: "mcp", order: 3 },
  { name: "ML Integration", slug: "ml", order: 4 },
  { name: "Deployment", slug: "deployment", order: 5 },
  { name: "Technical", slug: "technical", order: 6 },
];

// Map of files to categories and metadata
const fileMapping: Record<
  string,
  { category: string; title: string; order: number }
> = {
  "getting-started.md": {
    category: "getting-started",
    title: "Installation & Setup",
    order: 1,
  },
  "QUICKSTART.md": {
    category: "getting-started",
    title: "Quick Start Guide",
    order: 2,
  },
  "framework-guide.md": {
    category: "framework",
    title: "Framework Guide",
    order: 1,
  },
  "api-auto-documentation.md": {
    category: "framework",
    title: "API Documentation",
    order: 2,
  },
  "middleware-implementation.md": {
    category: "framework",
    title: "Middleware",
    order: 3,
  },
  "sse-server-sent-events.md": {
    category: "framework",
    title: "Server-Sent Events",
    order: 4,
  },
  "mcp-protocol.md": {
    category: "mcp",
    title: "MCP Protocol Overview",
    order: 1,
  },
  "MCP_TUTORIAL.md": {
    category: "mcp",
    title: "MCP Tutorial",
    order: 2,
  },
  "MCP_INTEGRATION_GUIDE.md": {
    category: "mcp",
    title: "Integration Guide",
    order: 3,
  },
  "ML_GUIDE.md": {
    category: "ml",
    title: "ML Overview",
    order: 1,
  },
  "ML_INFERENCE_GUIDE.md": {
    category: "ml",
    title: "Model Inference",
    order: 2,
  },
  "ml-pipeline-guide.md": {
    category: "ml",
    title: "ML Pipelines",
    order: 3,
  },
  "deployment.md": {
    category: "deployment",
    title: "Deployment Guide",
    order: 1,
  },
  "PRODUCTION_GUIDE.md": {
    category: "deployment",
    title: "Production Best Practices",
    order: 2,
  },
  "architecture.md": {
    category: "technical",
    title: "Architecture",
    order: 1,
  },
};

function generateSlug(filename: string): string {
  return filename.replace(/\.md$/, "").toLowerCase().replace(/_/g, "-");
}

export function getAllDocs(): DocCategory[] {
  const categories: Map<string, DocCategory> = new Map();

  // Initialize categories
  categoryConfig.forEach((cat) => {
    categories.set(cat.slug, {
      name: cat.name,
      slug: cat.slug,
      order: cat.order,
      pages: [],
    });
  });

  // Read all markdown files
  const files = fs.readdirSync(docsDirectory);

  files.forEach((filename) => {
    if (!filename.endsWith(".md") || !fileMapping[filename]) return;

    const filePath = path.join(docsDirectory, filename);
    const fileContents = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContents);

    const mapping = fileMapping[filename];
    const slug = generateSlug(filename);

    const docPage: DocPage = {
      slug,
      title: data.title || mapping.title,
      description: data.description || extractDescription(content),
      category: mapping.category,
      order: mapping.order,
      content,
      path: `/${mapping.category}/${slug}`,
    };

    const category = categories.get(mapping.category);
    if (category) {
      category.pages.push(docPage);
    }
  });

  // Sort pages within each category
  categories.forEach((category) => {
    category.pages.sort((a, b) => a.order - b.order);
  });

  // Return sorted categories
  return Array.from(categories.values()).sort((a, b) => a.order - b.order);
}

export function getDocByPath(
  category: string,
  slug: string
): DocPage | undefined {
  const categories = getAllDocs();
  const cat = categories.find((c) => c.slug === category);
  return cat?.pages.find((p) => p.slug === slug);
}

export function getAdjacentDocs(currentPath: string): {
  prev: DocPage | null;
  next: DocPage | null;
} {
  const categories = getAllDocs();
  const allPages: DocPage[] = [];

  // Flatten all pages in order
  categories.forEach((cat) => {
    allPages.push(...cat.pages);
  });

  const currentIndex = allPages.findIndex((p) => p.path === currentPath);

  return {
    prev: currentIndex > 0 ? allPages[currentIndex - 1] : null,
    next:
      currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null,
  };
}

function extractDescription(content: string): string {
  // Extract first paragraph as description
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.length > 20) {
      return trimmed.substring(0, 160);
    }
  }
  return "Documentation for Conduit framework";
}

export function searchDocs(query: string): DocPage[] {
  const categories = getAllDocs();
  const allPages: DocPage[] = [];

  categories.forEach((cat) => {
    allPages.push(...cat.pages);
  });

  const lowerQuery = query.toLowerCase();

  return allPages
    .filter((page) => {
      return (
        page.title.toLowerCase().includes(lowerQuery) ||
        page.description.toLowerCase().includes(lowerQuery) ||
        page.content.toLowerCase().includes(lowerQuery)
      );
    })
    .slice(0, 10); // Limit to 10 results
}
