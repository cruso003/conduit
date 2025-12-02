"use client";

import InteractivePlayground from "@/components/InteractivePlayground";

export function Playground() {
  return (
    <section className="py-24 bg-black/50 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Try it <span className="text-gradient">Right Now</span>
          </h2>
          <p className="text-gray-400 mb-4 text-lg max-w-2xl mx-auto">
            Experience Conduit directly in your browser with our interactive
            compiler. Write code, click run, and see it execute instantly.
          </p>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">
            💡 The playground simulates HTTP requests to demonstrate your code
            works. No server needed - this runs entirely in your browser!
          </p>
        </div>

        <InteractivePlayground />
      </div>
    </section>
  );
}
