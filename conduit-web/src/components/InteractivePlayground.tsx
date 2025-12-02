"use client";

import { useState } from "react";
import CodePlayground from "./CodePlayground";
import {
  getExampleList,
  getExampleCode,
  type ExampleKey,
} from "@/lib/examples";

export default function InteractivePlayground() {
  const examples = getExampleList();
  const [selectedExample, setSelectedExample] =
    useState<ExampleKey>("helloWorld");
  const [code, setCode] = useState(getExampleCode("helloWorld"));

  const handleExampleChange = (key: ExampleKey) => {
    setSelectedExample(key);
    setCode(getExampleCode(key));
  };

  const currentExample = examples.find((e) => e.key === selectedExample);

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Try Conduit in Your Browser
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Run Conduit code instantly with our WebAssembly compiler. No
          installation required.
        </p>
      </div>

      {/* Example Selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Choose an Example
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {examples.map((example) => (
            <button
              key={example.key}
              onClick={() => handleExampleChange(example.key as ExampleKey)}
              className={`p-3 rounded-lg text-left transition-all ${
                selectedExample === example.key
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <div className="font-semibold text-sm mb-1">{example.title}</div>
              <div
                className={`text-xs ${
                  selectedExample === example.key
                    ? "text-blue-100"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {example.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Example Info */}
      {currentExample && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
            {currentExample.title}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {currentExample.description}
          </p>
        </div>
      )}

      {/* Code Playground */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6">
        <CodePlayground
          key={selectedExample}
          initialCode={code}
          height="500px"
          showOutput={true}
        />
      </div>

      {/* Performance Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            100,000
          </div>
          <div className="text-sm text-green-700 dark:text-green-300">
            requests/second
          </div>
        </div>
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            10,000
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            ML predictions/second
          </div>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            99%
          </div>
          <div className="text-sm text-purple-700 dark:text-purple-300">
            cost reduction
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            ⚡ Native Performance
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Compiled to native code (LLVM)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>100x faster than Python frameworks</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>5MB single binary deployment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>10ms cold start (100x faster)</span>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            🧠 AI-First Features
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">✓</span>
              <span>Built-in ML inference engine</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">✓</span>
              <span>Vector database for RAG</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">✓</span>
              <span>MCP protocol support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">✓</span>
              <span>GPU acceleration (ONNX)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Ready to Get Started?
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://github.com/cruso003/conduit"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     transition-colors font-semibold shadow-lg hover:shadow-xl
                     flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            Star on GitHub
          </a>
          <a
            href="/docs/quickstart"
            className="px-8 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white 
                     rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors 
                     font-semibold shadow-lg hover:shadow-xl"
          >
            Read Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
