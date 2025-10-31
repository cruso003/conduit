// Conduit Plugin - Compile-time routing optimization for Codon
// Copyright (c) 2025 Conduit Framework
// 
// This plugin generates optimized dispatch code at compile-time for Conduit
// web applications, eliminating runtime overhead from route matching.

#include "codon/cir/transform/pass.h"
#include "codon/dsl/dsl.h"
#include <iostream>

using namespace codon::ir;

/// Hello World pass - verifies plugin loads successfully
class ConduitHelloPass : public transform::Pass {
public:
    static const std::string KEY;
    std::string getKey() const override { return KEY; }
    
    void run(Module *module) override {
        std::cout << "\n";
        std::cout << "╔══════════════════════════════════════════════════════════╗\n";
        std::cout << "║  🚀 Conduit Plugin Loaded!                              ║\n";
        std::cout << "║                                                          ║\n";
        std::cout << "║  Compile-time routing optimization enabled               ║\n";
        std::cout << "║  Module: " << module->getName() << std::string(42 - module->getName().size(), ' ') << "║\n";
        std::cout << "╚══════════════════════════════════════════════════════════╝\n";
        std::cout << "\n";
    }
};

const std::string ConduitHelloPass::KEY = "conduit-hello-pass";

/// Main plugin class
class ConduitPlugin : public codon::DSL {
public:
    void addIRPasses(transform::PassManager *pm, bool debug) override {
        // Insert our pass early in the pipeline
        // In debug mode, insert at end; in release, before constant folding
        std::string insertBefore = debug ? "" : "core-folding-pass-group";
        pm->registerPass(std::make_unique<ConduitHelloPass>(), insertBefore);
    }
};

/// Plugin entry point - called by Codon to load the plugin
extern "C" std::unique_ptr<codon::DSL> load() {
    return std::make_unique<ConduitPlugin>();
}
