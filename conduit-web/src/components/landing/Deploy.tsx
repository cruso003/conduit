"use client";

import { CodeBlock } from "@/components/ui/CodeBlock";
import { motion } from "framer-motion";
import { Cloud, Container, Server } from "lucide-react";

const DEPLOY_OPTIONS = [
  {
    title: "Docker",
    icon: Container,
    desc: "Tiny 10MB Alpine-based images. Zero dependencies.",
    code: `docker run -p 8080:8080 conduit-app`
  },
  {
    title: "Kubernetes",
    icon: Server,
    desc: "Native health checks, metrics, and graceful shutdown.",
    code: `kubectl apply -f deployment.yaml`
  },
  {
    title: "Serverless",
    icon: Cloud,
    desc: "Deploy to AWS Lambda, Google Cloud Run, or Vercel.",
    code: `conduit deploy --target lambda`
  }
];

export function Deploy() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Deploy <span className="text-gradient">Anywhere</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            From edge devices to massive GPU clusters. Conduit runs where you need it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {DEPLOY_OPTIONS.map((option, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                <option.icon className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-bold mb-2">{option.title}</h3>
              <p className="text-gray-400 mb-6 h-12">{option.desc}</p>
              
              <CodeBlock 
                code={option.code} 
                language="bash" 
                showLineNumbers={false}
                className="text-xs"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
