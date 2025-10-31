// Conduit Plugin - Compile-time routing optimization for Codon
// Copyright (c) 2025 Conduit Framework
// 
// This plugin generates optimized dispatch code at compile-time for Conduit
// web applications, eliminating runtime overhead from route matching.

#include "codon/cir/transform/pass.h"
#include "codon/cir/util/irtools.h"
#include "codon/cir/const.h"
#include "codon/dsl/dsl.h"
#include <iostream>
#include <vector>
#include <string>

using namespace codon::ir;

/// Route information extracted from decorators
struct RouteInfo {
    std::string method;        // GET, POST, PUT, DELETE, etc.
    std::string path;          // "/users/:id", "/api/data", etc.
    std::string handler_name;  // Function name
    Func *handler_func;        // IR function pointer
    
    RouteInfo(const std::string &m, const std::string &p, const std::string &h, Func *f)
        : method(m), path(p), handler_name(h), handler_func(f) {}
};

/// Route detection pass - finds @app.get/@app.post decorators and extracts route info
class ConduitRouteDetector : public transform::OperatorPass {
private:
    std::vector<RouteInfo> routes;
    // Temporary storage to match decorator calls with handler names
    std::vector<std::pair<std::string, std::string>> pendingRoutes; // (method, path)

public:
    static const std::string KEY;
    
    explicit ConduitRouteDetector() : transform::OperatorPass() {}
    
    std::string getKey() const override { return KEY; }
    
    /// Called for every function call in the IR
    void handle(CallInstr *v) override {
        auto *func = util::getFunc(v->getCallee());
        if (!func) return;
        
        std::string funcName = func->getUnmangledName();
        
        // Strategy 1: Detect add_route_metadata calls to get handler names
        if (funcName == "add_route_metadata" && v->numArgs() >= 4) {
            auto args = v->begin();
            ++args; // skip self
            
            auto *patternArg = *args; ++args;
            auto *methodArg = *args; ++args;
            auto *nameArg = *args;
            
            std::string method = "<unknown>";
            std::string handlerName = "<unknown>";
            
            // Method and handler name should be string constants
            if (auto *methodConst = cast<StringConst>(methodArg)) {
                method = methodConst->getVal();
            }
            if (auto *nameConst = cast<StringConst>(nameArg)) {
                handlerName = nameConst->getVal();
            }
            
            // Find matching route from pendingRoutes and update it
            for (auto &route : routes) {
                if (route.method == method && route.handler_name == "<handler>") {
                    route.handler_name = handlerName;
                    break;
                }
            }
            return;
        }
        
        // Strategy 2: Detect decorator creation calls to get method + path
        std::string methodName;
        
        if (v->numArgs() == 2) {
            if (funcName == "get") {
                methodName = "GET";
            } else if (funcName == "post") {
                methodName = "POST";
            } else if (funcName == "put") {
                methodName = "PUT";
            } else if (funcName == "delete") {
                methodName = "DELETE";
            } else if (funcName == "patch") {
                methodName = "PATCH";
            }
        }
        
        if (!methodName.empty()) {
            if (v->numArgs() >= 2) {
                auto args = v->begin();
                ++args; // Skip self
                auto *pathArg = *args;
                
                std::string path = "<unknown>";
                
                if (auto *strConst = cast<StringConst>(pathArg)) {
                    path = strConst->getVal();
                }
                
                // Add route with placeholder handler name
                // This will be filled in by add_route_metadata call
                routes.emplace_back(methodName, path, "<handler>", nullptr);
            }
        }
    }
    
    /// Called after all IR has been processed
    void run(Module *module) override {
        // Traverse the module to detect routes
        OperatorPass::run(module);
        
        // Print what we found
        if (!routes.empty()) {
            std::cout << "\n";
            std::cout << "╔══════════════════════════════════════════════════════════╗\n";
            std::cout << "║  🔍 Conduit Route Detection                             ║\n";
            std::cout << "╚══════════════════════════════════════════════════════════╝\n";
            std::cout << "\nDetected " << routes.size() << " route(s):\n";
            for (const auto &route : routes) {
                std::cout << "  " << route.method << " " << route.path 
                          << " -> " << route.handler_name << "\n";
            }
            std::cout << "\n";
        }
    }
    
    const std::vector<RouteInfo>& getRoutes() const { return routes; }
};

const std::string ConduitRouteDetector::KEY = "conduit-route-detector";

/// Main plugin class
class ConduitPlugin : public codon::DSL {
public:
    void addIRPasses(transform::PassManager *pm, bool debug) override {
        // Insert route detector before constant folding
        // This ensures we see routes before any optimizations might change them
        std::string insertBefore = debug ? "" : "core-folding-pass-group";
        pm->registerPass(std::make_unique<ConduitRouteDetector>(), insertBefore);
    }
};

/// Plugin entry point - called by Codon to load the plugin
extern "C" std::unique_ptr<codon::DSL> load() {
    return std::make_unique<ConduitPlugin>();
}
