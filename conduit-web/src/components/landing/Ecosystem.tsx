"use client";

import { motion } from "framer-motion";

const LOGOS = [
  "PyTorch", "TensorFlow", "Hugging Face", "OpenAI", 
  "Anthropic", "Docker", "Kubernetes", "AWS", 
  "Google Cloud", "Azure", "NVIDIA", "Ray"
];

export function Ecosystem() {
  return (
    <section className="py-24 border-y border-white/5 bg-white/[0.02]">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl font-bold mb-12 text-gray-400">
          Seamlessly Integrates With Your Stack
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 md:gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          {LOGOS.map((logo, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-center font-bold text-xl hover:text-white transition-colors cursor-default"
            >
              {logo}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
