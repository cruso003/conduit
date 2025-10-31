// Conduit Plugin - Compile-time routing optimization for Codon
// Copyright (c) 2025 Conduit Framework
// 
// This plugin generates optimized dispatch code at compile-time for Conduit
// web applications, eliminating runtime overhead from route matching.

#include "codon/cir/transform/pass.h"
#include "codon/cir/util/irtools.h"
#include "codon/cir/const.h"
#include "codon/cir/instr.h"
#include "codon/cir/flow.h"
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
            std::cout << "[DEBUG] Found add_route_metadata call with " << v->numArgs() << " args\n";
            
            auto args = v->begin();
            ++args; // skip self
            
            auto *patternArg = *args; ++args;
            auto *methodArg = *args; ++args;
            auto *nameArg = *args;
            
            std::string pattern = "<unknown>";
            std::string method = "<unknown>";
            std::string handlerName = "<unknown>";
            
            // Pattern, method, and handler name should be string constants
            if (auto *patternConst = cast<StringConst>(patternArg)) {
                pattern = patternConst->getVal();
                std::cout << "[DEBUG]   Pattern: " << pattern << "\n";
            }
            if (auto *methodConst = cast<StringConst>(methodArg)) {
                method = methodConst->getVal();
                std::cout << "[DEBUG]   Method: " << method << "\n";
            }
            if (auto *nameConst = cast<StringConst>(nameArg)) {
                handlerName = nameConst->getVal();
                std::cout << "[DEBUG]   Handler: " << handlerName << "\n";
            } else {
                std::cout << "[DEBUG]   Handler name is not a string constant (might be __name__ access)\n";
            }
            
            // Find matching route from pendingRoutes and update it
            for (auto &route : routes) {
                if (route.method == method && route.handler_name == "<handler>") {
                    route.handler_name = handlerName;
                    
                    // Try to find the handler function in the module
                    // The handler function should be defined somewhere in the IR
                    // We'll search for it by name
                    auto *M = v->getModule();
                    for (auto *funcInModule : *M) {
                        if (auto *bodiedFunc = cast<BodiedFunc>(funcInModule)) {
                            std::string funcUnmangledName = bodiedFunc->getUnmangledName();
                            if (funcUnmangledName == handlerName) {
                                route.handler_func = bodiedFunc;
                                std::cout << "    ✓ Linked handler: " << handlerName << "\n";
                                break;
                            }
                        }
                    }
                    
                    if (!route.handler_func) {
                        std::cout << "    ⚠ Could not find function: " << handlerName << "\n";
                    }
                    
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
            
            // Week 3: Generate dispatch function
            std::cout << "╔══════════════════════════════════════════════════════════╗\n";
            std::cout << "║  ⚡ Generating Dispatch Function                        ║\n";
            std::cout << "╚══════════════════════════════════════════════════════════╝\n";
            
            BodiedFunc *dispatchFunc = generateDispatchFunction(module);
            if (dispatchFunc) {
                std::cout << "✅ Generated: " << dispatchFunc->getName() << "\n";
                std::cout << "   Signature: (method: str, path: str, request: Request) -> Response\n";
                std::cout << "   Routes: " << routes.size() << "\n\n";
            } else {
                std::cout << "❌ Failed to generate dispatch function\n\n";
            }
        }
    }
    
    const std::vector<RouteInfo>& getRoutes() const { return routes; }
    
private:
    /// Generate the dispatch function in IR
    /// Create string equality comparison: var == "literal"
    /// For now using a placeholder - will be improved in Week 3 Day 4
    Value* createStringEquals(Module *M, Var *var, const std::string &literal) {
        // PLACEHOLDER: Return boolean true for now
        // This allows the if/elif structure to generate correctly
        // Week 3 Day 4 will implement proper string comparison
        
        // The actual comparison should be: var.__eq__(literal)
        // But for structural testing, we use a placeholder
        std::cout << "    [DEBUG] Comparison: " << var->getName() << " == \"" << literal << "\"\n";
        return M->getBool(true);
    }
    
    /// Create 404 response for unmatched routes
    Value* create404Response(Module *M) {
        return M->getString("404 Not Found");
    }
    
    BodiedFunc* generateDispatchFunction(Module *M) {
        std::cout << "  → Creating function skeleton...\n";
        
        // Step 1: Create function node
        auto *dispatch = M->Nr<BodiedFunc>("conduit_dispatch");
        
        // Step 2: Create function type
        // For now, use simple types (str, str, str) -> str
        // TODO: Later use actual Request/Response types from framework
        auto *strType = M->getStringType();
        std::vector<types::Type*> argTypes = {strType, strType, strType};
        auto *funcType = M->getFuncType(strType, argTypes);
        
        std::cout << "  → Realizing function with signature...\n";
        
        // Step 3: Realize function with argument names
        std::vector<std::string> argNames = {"method", "path", "request"};
        dispatch->realize(funcType, argNames);
        
        // Get argument variables for use in dispatch logic
        auto *methodVar = dispatch->getArgVar("method");
        auto *pathVar = dispatch->getArgVar("path");
        auto *requestVar = dispatch->getArgVar("request");
        
        // Step 4: Build dispatch logic
        std::cout << "  → Building if/elif chain for " << routes.size() << " routes...\n";
        auto *body = M->Nr<SeriesFlow>();
        
        if (routes.empty()) {
            // No routes - just return 404
            body->push_back(M->Nr<ReturnInstr>(create404Response(M)));
        } else {
            // Build if/elif chain from end to start (backward construction)
            // Start with 404 as the final else clause
            auto *notFoundFlow = M->Nr<SeriesFlow>();
            notFoundFlow->push_back(M->Nr<ReturnInstr>(create404Response(M)));
            Flow *currentElse = notFoundFlow;
            
            // Iterate routes in reverse to build nested if/elif structure
            for (auto it = routes.rbegin(); it != routes.rend(); ++it) {
                const auto &route = *it;
                
                std::cout << "    - " << route.method << " " << route.path << "\n";
                
                // Create condition: method == "GET" AND path == "/"
                auto *methodEq = createStringEquals(M, methodVar, route.method);
                auto *pathEq = createStringEquals(M, pathVar, route.path);
                
                // Combine with logical AND
                // For now, use a simple approach: if (method == X) { if (path == Y) { ... } }
                // TODO: Optimize to single condition with AND operator
                
                // Create true branch: call handler function
                auto *trueBranch = M->Nr<SeriesFlow>();
                Value *response;
                
                if (route.handler_func) {
                    // Call the actual handler function with request argument
                    std::vector<Value*> handlerArgs;
                    handlerArgs.push_back(M->Nr<VarValue>(requestVar));
                    response = util::call(route.handler_func, handlerArgs);
                    std::cout << "      ✓ Calling handler: " << route.handler_name << "\n";
                } else {
                    // Fallback if handler wasn't found
                    response = M->getString("Handler not found: " + route.handler_name);
                    std::cout << "      ⚠ Handler not found: " << route.handler_name << "\n";
                }
                
                trueBranch->push_back(M->Nr<ReturnInstr>(response));
                
                // Create nested if for path check inside method check
                auto *pathIf = M->Nr<IfFlow>(pathEq, trueBranch, currentElse);
                auto *pathIfSeries = M->Nr<SeriesFlow>();
                pathIfSeries->push_back(pathIf);
                
                // Create outer if for method check
                currentElse = M->Nr<IfFlow>(methodEq, pathIfSeries, currentElse);
            }
            
            // Add the complete if/elif chain to body
            body->push_back(currentElse);
        }
        
        // Step 5: Set function body
        dispatch->setBody(body);
        
        std::cout << "  → Dispatch logic complete!\n";
        
        return dispatch;
    }
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
