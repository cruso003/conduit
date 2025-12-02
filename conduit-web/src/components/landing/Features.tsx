"use client";

import { CodeBlock } from "@/components/ui/CodeBlock";
import { motion } from "framer-motion";
import { Bot, Database, Globe, Server, Shield, Zap } from "lucide-react";
import { useState } from "react";

const FEATURES = [
  {
    id: "ai",
    title: "AI-First Design",
    desc: "Built for Machine Learning from the ground up. Native inference, vector DBs, and RAG pipelines.",
    icon: Bot,
    code: `from conduit.ml import create_pipeline, create_vector_db, RAGPipeline

# Vector database
vector_db = create_vector_db(dimension=384, metric="cosine")

# ML pipeline
pipeline = create_pipeline([
    ("embed", embedding_model),
    ("classify", classifier)
])

# RAG system
rag = RAGPipeline(vector_db=vector_db, llm=llm_model)
answer = rag.query("What is Conduit?")`
  },
  {
    id: "mcp",
    title: "MCP Protocol",
    desc: "First-class support for Model Context Protocol. Build tools for Claude, GPT, and other agents.",
    icon: Database,
    code: `from conduit.mcp import MCPServer

server = MCPServer(name="my-tools", version="1.0.0")

@server.tool()
def search_docs(query: str) -> str:
    """Search documentation"""
    results = vector_db.search(query)
    return format_results(results)

server.run()`
  },
  {
    id: "prod",
    title: "Production Ready",
    desc: "Battle-tested middleware, security headers, rate limiting, and resilience patterns built-in.",
    icon: Shield,
    code: `from conduit.framework import rate_limit, security_headers
from conduit.ml.resilience import ResilientMLModel

# Production middleware
app.use(security_headers())
app.use(rate_limit(max_requests=1000))

# Resilient ML
model = ResilientMLModel(
    model=base_model,
    use_circuit_breaker=True,
    use_retry=True
)`
  },
  {
    id: "stream",
    title: "Real-Time Streaming",
    desc: "Native Server-Sent Events (SSE) support for streaming LLM tokens and real-time data.",
    icon: Zap,
    code: `@app.post("/stream")
def stream_data(req, res):
    res.set_header("Content-Type", "text/event-stream")

    for chunk in process_stream(req.json()):
        res.write(f"data: {chunk}\\n\\n")
        res.flush()`
  }
];

export function Features() {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <section className="py-24 bg-black/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Everything You Need. <span className="text-gradient">Built In.</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            No more gluing together 10 different libraries. Conduit has everything you need for modern AI apps.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Feature List */}
          <div className="space-y-4">
            {FEATURES.map((feature, index) => (
              <motion.button
                key={feature.id}
                onClick={() => setActiveFeature(index)}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 ${
                  activeFeature === index
                    ? "bg-white/10 border-primary/50 shadow-[0_0_30px_rgba(0,112,243,0.1)]"
                    : "bg-transparent border-transparent hover:bg-white/5"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    activeFeature === index ? "bg-primary text-white" : "bg-white/5 text-gray-400"
                  }`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold mb-2 ${
                      activeFeature === index ? "text-white" : "text-gray-400"
                    }`}>
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Code Preview */}
          <div className="lg:sticky lg:top-32">
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-20" />
              <CodeBlock 
                code={FEATURES[activeFeature].code} 
                className="relative shadow-2xl min-h-[400px]" 
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
