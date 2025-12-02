"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Search,
} from "lucide-react";
import type { DocCategory } from "@/lib/docs";

interface DocsSidebarProps {
  categories: DocCategory[];
}

export function DocsSidebar({ categories }: DocsSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.slug))
  );

  const toggleCategory = (slug: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(slug)) {
      newExpanded.delete(slug);
    } else {
      newExpanded.add(slug);
    }
    setExpandedCategories(newExpanded);
  };

  const isActive = (path: string) => pathname === `/docs${path}`;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Documentation</h2>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-6">
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.slug);

          return (
            <div key={category.slug} className="mb-6">
              <button
                onClick={() => toggleCategory(category.slug)}
                className="flex items-center justify-between w-full text-left mb-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
              >
                <span>{category.name}</span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {isExpanded && (
                <ul className="space-y-1 ml-2">
                  {category.pages.map((page) => (
                    <li key={page.slug}>
                      <Link
                        href={`/docs${page.path}`}
                        onClick={() => setMobileOpen(false)}
                        className={`block py-2 px-3 rounded-lg text-sm transition-colors ${
                          isActive(page.path)
                            ? "bg-primary text-white font-medium"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background">
          <div className="h-full overflow-y-auto pt-20">{sidebarContent}</div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-80 border-r border-white/10 bg-background/50 sticky top-0 h-screen overflow-y-auto">
        {sidebarContent}
      </aside>
    </>
  );
}
