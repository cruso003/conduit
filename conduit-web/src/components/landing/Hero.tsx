"use client";

import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { motion } from "framer-motion";
import { ArrowRight, Terminal } from "lucide-react";
import Link from "next/link";

const HERO_CODE = `from conduit import Conduit
from conduit.ml import InferenceEngine, load_model

app = Conduit()

# Load ML model
model = InferenceEngine(model=load_model("model.pkl"))

@app.post("/predict")
def predict(req, res):
    features = req.json()["features"]
    result = model.predict(features)
    res.json({"prediction": result})

app.run(port=8080)`;

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-primary/20 to-transparent opacity-30 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-primary mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                v1.0.0 Now Available
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6">
                Stop Burning Money on <br />
                <span className="text-gradient">Slow AI Infrastructure</span>
              </h1>

              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto lg:mx-0">
                Conduit MCP servers run{" "}
                <span className="text-white font-semibold">10x faster</span> and
                cost <span className="text-white font-semibold">90% less</span>{" "}
                than Python. Deploy in{" "}
                <span className="text-white font-semibold">5 minutes</span>.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link href="/docs/QUICKSTART.md">
                  <Button size="lg" className="min-w-[200px]">
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link
                  href="https://github.com/cruso003/conduit"
                  target="_blank"
                >
                  <Button variant="outline" size="lg" className="min-w-[200px]">
                    <Terminal className="mr-2 w-4 h-4" />
                    View on GitHub
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-center lg:justify-start gap-8 text-sm text-gray-500">
                <div>
                  Running on <span className="text-gray-300">Native Code</span>
                </div>
                <div>•</div>
                <div>
                  Zero <span className="text-gray-300">Runtime Overhead</span>
                </div>
                <div>•</div>
                <div>
                  Instant <span className="text-gray-300">Cold Start</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Code Preview */}
          <div className="flex-1 w-full max-w-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-30" />
              <CodeBlock code={HERO_CODE} className="relative shadow-2xl" />

              {/* Floating Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -bottom-6 -right-6 bg-background border border-white/10 p-4 rounded-lg shadow-xl flex items-center gap-3"
              >
                <div className="text-right">
                  <div className="text-xs text-gray-400">Monthly Savings</div>
                  <div className="text-lg font-bold text-green-400">$970</div>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="text-right">
                  <div className="text-xs text-gray-400">Deploy Time</div>
                  <div className="text-lg font-bold text-primary">5 min</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
