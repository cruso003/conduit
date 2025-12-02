import { getDocByPath, getAllDocs, getAdjacentDocs } from "@/lib/docs";
import { DocsContent } from "@/components/docs/DocsContent";
import { notFound } from "next/navigation";

interface DocsPageProps {
  params: Promise<{
    category: string;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const categories = getAllDocs();
  const params: { category: string; slug: string }[] = [];

  categories.forEach((category) => {
    category.pages.forEach((page) => {
      params.push({
        category: category.slug,
        slug: page.slug,
      });
    });
  });

  return params;
}

export default async function DocPage({ params }: DocsPageProps) {
  const resolvedParams = await params;
  const page = getDocByPath(resolvedParams.category, resolvedParams.slug);

  if (!page) {
    notFound();
  }

  const { prev, next } = getAdjacentDocs(page.path);

  return <DocsContent page={page} prev={prev} next={next} />;
}
