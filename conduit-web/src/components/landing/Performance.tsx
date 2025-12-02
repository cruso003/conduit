"use client";

import { motion } from "framer-motion";
import { Zap, Cpu, Box, Activity } from "lucide-react";

const BENCHMARKS = [
  {
    framework: "Conduit",
    reqSpeed: "100K req/s",
    mlSpeed: "10K pred/s",
    memory: "10 MB",
    highlight: true,
  },
  {
    framework: "Flask (Python)",
    reqSpeed: "1K req/s",
    mlSpeed: "100 pred/s",
    memory: "50 MB",
    highlight: false,
  },
  {
    framework: "FastAPI (Python)",
    reqSpeed: "2K req/s",
    mlSpeed: "150 pred/s",
    memory: "60 MB",
    highlight: false,
  },
  {
    framework: "Express (Node)",
    reqSpeed: "15K req/s",
    mlSpeed: "N/A",
    memory: "40 MB",
    highlight: false,
  },
];

const HIGHLIGHTS = [
  {
    icon: Zap,
    title: "$970/Month Saved",
    desc: "Average infrastructure cost reduction",
  },
  {
    icon: Cpu,
    title: "5 Minutes Deploy",
    desc: "Single binary, zero dependencies",
  },
  {
    icon: Activity,
    title: "Sub-10ms Response",
    desc: "60% fewer user drop-offs",
  },
  { icon: Box, title: "10x Faster", desc: "Than Python FastAPI" },
];

export function Performance() {
  return (
    <section className="py-24 bg-black/50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Sub-10ms Responses at{" "}
            <span className="text-gradient">1/10th the Cost</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Deploy in 5 minutes. Save $970/month. Improve user experience by
            60%. Real performance, real savings, real simplicity.
          </p>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {HIGHLIGHTS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <item.icon className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Benchmarks Table */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm"
        >
          <div className="grid grid-cols-4 p-4 border-b border-white/10 bg-white/5 text-sm font-medium text-gray-400">
            <div>Framework</div>
            <div>Request Speed</div>
            <div>ML Inference</div>
            <div>Memory Usage</div>
          </div>
          {BENCHMARKS.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-4 p-4 border-b border-white/5 last:border-0 items-center ${
                row.highlight ? "bg-primary/10" : "hover:bg-white/5"
              }`}
            >
              <div
                className={`font-medium ${
                  row.highlight ? "text-primary" : "text-white"
                }`}
              >
                {row.framework}
              </div>
              <div
                className={
                  row.highlight ? "font-bold text-green-400" : "text-gray-400"
                }
              >
                {row.reqSpeed}
              </div>
              <div
                className={
                  row.highlight ? "font-bold text-green-400" : "text-gray-400"
                }
              >
                {row.mlSpeed}
              </div>
              <div
                className={
                  row.highlight ? "font-bold text-green-400" : "text-gray-400"
                }
              >
                {row.memory}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
