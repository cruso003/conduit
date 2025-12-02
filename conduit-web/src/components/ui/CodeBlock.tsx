"use client";

import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language = "python", className, showLineNumbers = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative rounded-lg overflow-hidden border border-white/10 bg-black/50 backdrop-blur-sm group", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
        </div>
        <div className="text-xs text-gray-400 font-mono">{language}</div>
      </div>

      {/* Code */}
      <div className="relative p-4 overflow-x-auto">
        <button
          onClick={copyToClipboard}
          className="absolute top-4 right-4 p-2 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
        <pre className="font-mono text-sm leading-relaxed">
          <code>
            {code.split("\n").map((line, i) => (
              <div key={i} className="table-row">
                {showLineNumbers && (
                  <span className="table-cell text-right pr-4 text-gray-600 select-none w-8">
                    {i + 1}
                  </span>
                )}
                <span className="table-cell text-gray-300 whitespace-pre">
                  {/* Basic syntax highlighting simulation */}
                  {line.split(" ").map((token, j) => {
                    if (token.startsWith("def") || token.startsWith("class") || token.startsWith("import") || token.startsWith("from") || token.startsWith("return")) {
                      return <span key={j} className="text-purple-400">{token} </span>;
                    }
                    if (token.startsWith('"') || token.startsWith("'")) {
                      return <span key={j} className="text-green-400">{token} </span>;
                    }
                    if (token.includes("(") && !token.startsWith('"')) {
                      return (
                        <span key={j}>
                          <span className="text-blue-400">{token.split("(")[0]}</span>
                          <span className="text-gray-300">(</span>
                          {token.split("(")[1]} 
                        </span>
                      );
                    }
                    return <span key={j}>{token} </span>;
                  })}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
