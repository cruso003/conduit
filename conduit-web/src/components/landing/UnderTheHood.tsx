"use client";

import { motion } from "framer-motion";
import { ArrowRight, Cpu, FileCode, Layers, Zap } from "lucide-react";

export function UnderTheHood() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Under the Hood: <span className="text-gradient">The Magic</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            How Conduit achieves C++ performance with Python syntax.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -translate-y-1/2 hidden md:block" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
            {/* Step 1: Python Code */}
            <Step 
              icon={FileCode} 
              title="Python Code" 
              desc="You write standard Python" 
              delay={0} 
            />

            {/* Step 2: Compiler */}
            <Step 
              icon={Layers} 
              title="Codon Compiler" 
              desc="Static analysis & type checking" 
              delay={0.2} 
              highlight
            />

            {/* Step 3: Optimization */}
            <Step 
              icon={Zap} 
              title="LLVM IR" 
              desc="Advanced optimizations" 
              delay={0.4} 
            />

            {/* Step 4: Native Code */}
            <Step 
              icon={Cpu} 
              title="Native Binary" 
              desc="Runs on CPU/GPU" 
              delay={0.6} 
              final
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ icon: Icon, title, desc, delay, highlight, final }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="relative flex flex-col items-center text-center"
    >
      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border ${
        highlight 
          ? "bg-primary/20 border-primary text-primary shadow-[0_0_30px_rgba(0,112,243,0.3)]" 
          : final
          ? "bg-green-500/20 border-green-500 text-green-500 shadow-[0_0_30px_rgba(0,255,136,0.3)]"
          : "bg-white/5 border-white/10 text-gray-400"
      }`}>
        <Icon className="w-10 h-10" />
      </div>
      
      <h3 className={`text-lg font-bold mb-2 ${highlight ? "text-primary" : final ? "text-green-400" : "text-white"}`}>
        {title}
      </h3>
      <p className="text-sm text-gray-400">{desc}</p>

      {/* Mobile Arrow */}
      <div className="md:hidden mt-4 text-gray-600">
        {!final && <ArrowRight className="w-6 h-6 rotate-90" />}
      </div>
    </motion.div>
  );
}
