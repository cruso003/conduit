"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Github, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold tracking-tight flex items-center gap-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Conduit Logo"
            className="w-8 h-8 rounded-lg"
          />
          <span>Conduit</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/docs"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Documentation
          </Link>
          <Link
            href="/blog"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Blog
          </Link>
          <Link
            href="https://github.com/cruso003/conduit"
            target="_blank"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            GitHub
          </Link>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="https://github.com/cruso003/conduit" target="_blank">
            <Button variant="ghost" size="sm">
              <Github className="w-4 h-4 mr-2" />
              Star
            </Button>
          </Link>
          <Link href="/docs/getting-started/quickstart">
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 bg-background"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              <Link
                href="/docs"
                className="text-sm text-gray-400 hover:text-white"
              >
                Documentation
              </Link>
              <Link
                href="/blog"
                className="text-sm text-gray-400 hover:text-white"
              >
                Blog
              </Link>
              <Link
                href="https://github.com/cruso003/conduit"
                className="text-sm text-gray-400 hover:text-white"
              >
                GitHub
              </Link>
              <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                <Button variant="ghost" className="w-full justify-start">
                  <Github className="w-4 h-4 mr-2" />
                  Star on GitHub
                </Button>
                <Button variant="primary" className="w-full">
                  Get Started
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
