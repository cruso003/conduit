"use client";

import { useState, useEffect } from "react";
import { compileConduit, type CompileResult } from "@/lib/conduit-compiler";

interface CodePlaygroundProps {
  initialCode?: string;
  height?: string;
  showOutput?: boolean;
}

export default function CodePlayground({
  initialCode = "",
  height = "400px",
  showOutput = true,
}: CodePlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<CompileResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runCode = () => {
    setIsRunning(true);

    // Simulate async execution for better UX
    setTimeout(() => {
      const compileResult = compileConduit(code, { debug: false });
      setResult(compileResult);
      setIsRunning(false);
    }, 100);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Code Editor
          </h3>
          <button
            onClick={runCode}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors
                     text-sm font-medium flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Run Code
              </>
            )}
          </button>
        </div>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full p-4 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg 
                   border border-gray-700 focus:border-blue-500 focus:outline-none
                   resize-none"
          style={{ height }}
          spellCheck={false}
          placeholder="# Write your Conduit code here..."
        />
      </div>

      {showOutput && result && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Output
          </h3>
          <div
            className={`p-4 rounded-lg font-mono text-sm ${
              result.success
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            }`}
          >
            {result.success ? (
              <div>
                <pre className="whitespace-pre-wrap text-green-900 dark:text-green-100">
                  {result.output}
                </pre>
                {result.executionTime && (
                  <div
                    className="mt-2 pt-2 border-t border-green-200 dark:border-green-800 
                                text-xs text-green-700 dark:text-green-300"
                  >
                    Executed in {result.executionTime.toFixed(2)}ms
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="font-semibold text-red-900 dark:text-red-100 mb-2">
                  ❌ Compilation Error
                </div>
                <pre className="whitespace-pre-wrap text-red-800 dark:text-red-200">
                  {result.error}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
