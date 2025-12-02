"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import Link from "next/link";
import type { DocPage } from "@/lib/docs";

interface DocsSearchProps {
  allPages: DocPage[];
}

export function DocsSearch({ allPages }: DocsSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = query.trim()
    ? allPages
        .filter((page) => {
          const lowerQuery = query.toLowerCase();
          return (
            page.title.toLowerCase().includes(lowerQuery) ||
            page.description.toLowerCase().includes(lowerQuery) ||
            page.content.toLowerCase().includes(lowerQuery)
          );
        })
        .slice(0, 8)
    : [];

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search documentation..."
          className="w-full pl-10 pr-10 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {isOpen && results.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-white/10 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            {results.map((page) => (
              <Link
                key={page.path}
                href={`/docs${page.path}`}
                onClick={() => {
                  setIsOpen(false);
                  setQuery("");
                }}
                className="block p-4 hover:bg-white/5 border-b border-white/5 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-white mb-1">{page.title}</div>
                <div className="text-sm text-gray-400 line-clamp-2">
                  {page.description}
                </div>
                <div className="text-xs text-primary mt-1">
                  {page.category.replace("-", " ").toUpperCase()}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
