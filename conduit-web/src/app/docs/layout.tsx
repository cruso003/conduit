import { getAllDocs } from "@/lib/docs";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DocsSearch } from "@/components/docs/DocsSearch";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = getAllDocs();
  const allPages = categories.flatMap((cat) => cat.pages);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="flex pt-16">
        <DocsSidebar categories={categories} />
        <div className="flex-1 min-w-0">
          <div className="container mx-auto px-4 py-12 max-w-7xl">
            <div className="mb-8 max-w-xl">
              <DocsSearch allPages={allPages} />
            </div>
            {children}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
