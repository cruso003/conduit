# Codon Plugin Research - Week 1 Findings

**Date**: January 2025  
**Project**: Conduit Framework - Milestone 3b  
**Goal**: Build C++ plugin for compile-time routing optimization

---

## Executive Summary

Codon's plugin system is **mature, well-documented, and perfect for our needs**. We can build a C++ shared library that hooks into the compilation pipeline and generates dispatch code during the IR transformation phase.

**Key Findings**:
- ✅ Codon has a complete plugin API with IR transformation framework
- ✅ Official example plugin exists with full source code
- ✅ Pass system allows inserting custom optimizations anywhere in pipeline
- ✅ IR structure is typed, bidirectional, and designed for transformations
- ✅ CMake build system is straightforward

---

## 1. Plugin Architecture Overview

### How Plugins Work

1. **Configuration** (`plugin.toml`): TOML file describing plugin metadata
2. **C++ Implementation**: Shared library (.so/.dylib) with DSL class
3. **Loading**: Codon loads plugin dynamically at compile-time
4. **Execution**: Plugin's IR passes run during compilation pipeline

### Plugin Entry Point

```cpp
extern "C" std::unique_ptr<codon::DSL> load() {
    return std::make_unique<MyPlugin>();
}
```

All plugins must export a `load()` function returning a `DSL` instance.

---

## 2. Core Components

### 2.1 The `DSL` Base Class

Located in `codon/dsl/dsl.h`:

```cpp
namespace codon {
class DSL {
public:
    // Plugin information
    struct Info {
        std::string name;
        std::string description;
        std::string version;
        std::string url;
        std::string stdlibPath;
    };
    
    virtual ~DSL() noexcept = default;
    
    // Register IR passes (our main hook)
    virtual void addIRPasses(ir::transform::PassManager *pm, bool debug) {}
    
    // Register LLVM passes (backend optimization)
    virtual void addLLVMPasses(llvm::PassBuilder *pb, bool debug) {}
    
    // Add custom syntax (not needed for us)
    virtual std::vector<ExprKeyword> getExprKeywords() { return {}; }
    virtual std::vector<BlockKeyword> getBlockKeywords() { return {}; }
};
}
```

**For Conduit**: We only need `addIRPasses()` to inject our routing optimization.

### 2.2 Pass System

Two main types of passes:

#### **OperatorPass** (what we'll use)
```cpp
class MyPass : public transform::OperatorPass {
public:
    static const std::string KEY;
    std::string getKey() const override { return KEY; }
    
    // Called on every AssignInstr node
    void handle(AssignInstr *v) override {
        // Transform IR here
    }
    
    // Called on every CallInstr node
    void handle(CallInstr *v) override {
        // Transform IR here
    }
};
```

#### **Generic Pass**
```cpp
class MyPass : public transform::Pass {
public:
    std::string getKey() const override { return "my-pass"; }
    
    void run(Module *module) override {
        // Manual traversal of module
    }
};
```

**For Conduit**: `OperatorPass` is perfect - we'll use `handle()` methods to detect decorators and generate dispatch.

### 2.3 IR Structure

Codon IR (CIR) is a **typed intermediate representation** between AST and LLVM.

Key node types we'll work with:

1. **Module**: Top-level container for all code
2. **Func**: Function definitions
3. **Var**: Variables (functions are also Vars)
4. **CallInstr**: Function calls (including decorators)
5. **AssignInstr**: Assignments
6. **Value**: Generic values (constants, references, etc.)

#### IR Traversal Example
```cpp
void handle(CallInstr *v) override {
    auto *M = v->getModule();               // Get module
    auto *func = util::getFunc(v->getCallee()); // Get called function
    
    if (!func) return;
    
    std::string name = func->getUnmangledName(); // Get function name
    
    // Check arguments
    if (v->numArgs() != 2) return;
    auto *arg1 = v->front();  // First arg
    auto *arg2 = v->back();   // Second arg
}
```

#### IR Modification
```cpp
// Replace a node
auto *newValue = M->getInt(42);
v->replaceAll(newValue);

// Insert after current node
auto *newCall = util::call(someFunc, {arg1, arg2});
insertAfter(newCall);

// Create new IR nodes
auto *constant = M->getInt(10);
auto *varRef = M->Nr<VarValue>(someVar);
auto *funcCall = util::call(targetFunc, {arg1, arg2});
```

---

## 3. Example Plugin Analysis

### Official Example: `MyValidate`

**Purpose**: Inserts validation calls after `foo()` calls

**Source** (`validate.cpp`):
```cpp
#include "codon/cir/transform/pass.h"
#include "codon/cir/util/irtools.h"
#include "codon/dsl/dsl.h"

using namespace codon::ir;

class ValidateFoo : public transform::OperatorPass {
public:
    static const std::string KEY;
    std::string getKey() const override { return KEY; }
    
    void handle(AssignInstr *v) override {
        auto *M = v->getModule();
        auto *var = v->getLhs();
        auto *call = cast<CallInstr>(v->getRhs());
        if (!call) return;
        
        auto *foo = util::getFunc(call->getCallee());
        if (!foo || foo->getUnmangledName() != "foo")
            return;
        
        auto *arg1 = call->front();         // argument of 'foo' call
        auto *arg2 = M->Nr<VarValue>(var);  // result of 'foo' call
        auto *validate = M->getOrRealizeFunc("validate", {arg1->getType(), arg2->getType()});
        if (!validate) return;
        
        auto *validateCall = util::call(validate, {arg1, arg2});
        insertAfter(validateCall);  // call 'validate' after 'foo'
    }
};

const std::string ValidateFoo::KEY = "validate-foo";

class MyValidate : public codon::DSL {
public:
    void addIRPasses(transform::PassManager *pm, bool debug) override {
        std::string insertBefore = debug ? "" : "core-folding-pass-group";
        pm->registerPass(std::make_unique<ValidateFoo>(), insertBefore);
    }
};

extern "C" std::unique_ptr<codon::DSL> load() {
    return std::make_unique<MyValidate>();
}
```

**Configuration** (`plugin.toml`):
```toml
[about]
name = "MyValidate"
description = "my validation plugin"
version = "0.0.1"
url = "https://example.com"
supported = ">=0.18.0"

[library]
cpp = "build/libmyvalidate"
```

**Build System** (`CMakeLists.txt`):
```cmake
cmake_minimum_required(VERSION 3.14)
project(MyValidate)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -pedantic -Wall -Wno-return-type-c-linkage")
set(CMAKE_CXX_FLAGS_DEBUG "-g -fno-limit-debug-info")
set(CMAKE_CXX_FLAGS_RELEASE "-O3")

add_library(myvalidate SHARED validate.cpp)

find_package(LLVM REQUIRED CONFIG)
separate_arguments(LLVM_DEFINITIONS_LIST NATIVE_COMMAND ${LLVM_DEFINITIONS})
add_definitions(${LLVM_DEFINITIONS_LIST})

if(NOT CODON_PATH)
    set(CODON_PATH "$ENV{HOME}/.codon")
endif()
if(CMAKE_INSTALL_PREFIX_INITIALIZED_TO_DEFAULT)
    set(CMAKE_INSTALL_PREFIX "${CODON_PATH}/lib/codon/plugins/myvalidate" CACHE PATH "" FORCE)
endif()

target_include_directories(myvalidate PRIVATE "${CODON_PATH}/include" ${LLVM_INCLUDE_DIRS})
target_link_directories(myvalidate PRIVATE "${CODON_PATH}/lib/codon")
target_link_libraries(myvalidate PRIVATE codonrt codonc)

install(TARGETS myvalidate DESTINATION build)
install(FILES plugin.toml DESTINATION .)
```

---

## 4. Application to Conduit

### What We Need to Detect

Looking at our Conduit framework:

```codon
app = Conduit()

@app.get("/users/:id")
def get_user(req: Request):
    return Response(f"User {req.params['id']}")

@app.post("/api/data")
def post_data(req: Request):
    data = req.parse_json()
    return Response.json({"received": data})
```

**In IR, decorators become**:
1. **Function definition**: `get_user`, `post_data`
2. **Decorator call**: `app.get("/users/:id")(get_user)`
3. **Route registration**: Adds to `app.route_info` list

### Detection Strategy

We need to find:
1. **CallInstr** nodes calling `Conduit.get`, `Conduit.post`, etc.
2. Extract the **path pattern** (first argument)
3. Extract the **HTTP method** (from method name)
4. Extract the **handler function** (return value used as decorator)
5. Store route info for dispatch generation

### Dispatch Generation Strategy

Once we've collected all routes, generate:

```codon
def conduit_dispatch(method: str, path: str, req: Request) -> Response:
    # Perfect hash on method+path
    hash_val = hash_method_path(method, path)
    
    # Jump table based on hash
    if hash_val == HASH_GET_USERS_ID:
        return get_user(req)
    elif hash_val == HASH_POST_API_DATA:
        return post_data(req)
    # ... etc
    
    return Response(status=404)
```

**Optimization opportunities**:
1. **Perfect hash function**: Generate minimal perfect hash at compile-time
2. **Inlining**: Mark handlers for aggressive inlining
3. **Path extraction**: Pre-parse path patterns, generate specialized matchers
4. **No virtual dispatch**: Direct function calls

---

## 5. Implementation Approach

### Phase 1: Hello World Plugin (Week 1)

**Goal**: Build minimal plugin that prints during compilation

```cpp
#include "codon/cir/transform/pass.h"
#include "codon/dsl/dsl.h"

using namespace codon::ir;

class ConduitHelloPass : public transform::Pass {
public:
    std::string getKey() const override { return "conduit-hello"; }
    
    void run(Module *module) override {
        std::cout << "🎉 Conduit plugin loaded!" << std::endl;
    }
};

class ConduitPlugin : public codon::DSL {
public:
    void addIRPasses(transform::PassManager *pm, bool debug) override {
        pm->registerPass(std::make_unique<ConduitHelloPass>());
    }
};

extern "C" std::unique_ptr<codon::DSL> load() {
    return std::make_unique<ConduitPlugin>();
}
```

**Success criteria**: See "🎉 Conduit plugin loaded!" when compiling Conduit apps

### Phase 2: Route Detection (Week 2)

**Goal**: Find all `@app.get()`, `@app.post()` decorators

```cpp
class ConduitRouteDetector : public transform::OperatorPass {
public:
    struct RouteInfo {
        std::string method;
        std::string path;
        std::string handler_name;
        Func *handler_func;
    };
    
    std::vector<RouteInfo> routes;
    
    void handle(CallInstr *v) override {
        // Detect @app.get("/path") pattern
        auto *func = util::getFunc(v->getCallee());
        if (!func) return;
        
        std::string name = func->getUnmangledName();
        
        // Check if it's Conduit.get, Conduit.post, etc.
        if (name.find("Conduit.get") != std::string::npos) {
            // Extract path from first argument
            // Store route info
            routes.push_back({.method = "GET", ...});
        }
    }
    
    void run(Module *module) override {
        // First pass: detect routes
        OperatorPass::run(module);
        
        // Print what we found
        std::cout << "Found " << routes.size() << " routes:" << std::endl;
        for (auto &r : routes) {
            std::cout << "  " << r.method << " " << r.path 
                      << " -> " << r.handler_name << std::endl;
        }
    }
};
```

### Phase 3: Dispatch Generation (Week 3)

**Goal**: Create `conduit_dispatch()` function in IR

```cpp
class ConduitDispatchGenerator : public transform::Pass {
public:
    void run(Module *module) override {
        // Create new function
        auto *dispatchFunc = module->Nr<BodiedFunc>("conduit_dispatch");
        
        // Add parameters: method, path, req
        auto *methodParam = module->Nr<Var>(module->getStringType(), "method");
        auto *pathParam = module->Nr<Var>(module->getStringType(), "path");
        auto *reqParam = module->Nr<Var>(requestType, "req");
        
        // Build function body with if/elif chain
        auto *body = module->Nr<SeriesFlow>();
        
        for (auto &route : routes) {
            // Generate: if method == "GET" and path_matches(path, "/users/:id"):
            //               return handler(req)
            auto *condition = /* build condition */;
            auto *callHandler = util::call(route.handler_func, {reqParam});
            auto *ifFlow = module->Nr<IfFlow>(condition, callHandler);
            body->push_back(ifFlow);
        }
        
        // Add default 404 response
        auto *notFound = /* create 404 response */;
        body->push_back(notFound);
        
        dispatchFunc->setBody(body);
        module->push_back(dispatchFunc);
    }
};
```

### Phase 4: Optimization (Week 4)

1. **Perfect hashing**: Replace if/elif with hash table lookup
2. **Inlining**: Mark handlers with `__attribute__((always_inline))`
3. **Path parsing**: Generate specialized matchers for `:id` style params
4. **Dead code elimination**: Remove unused route_info list

---

## 6. Build Environment Setup

### Required Tools

1. **Codon**: Installed at `~/.codon` or custom path
2. **LLVM**: Version matching Codon's LLVM (check with `codon --version`)
3. **CMake**: 3.14+
4. **C++ Compiler**: C++17 support (clang++ or g++)

### Environment Variables

```bash
export CODON_PATH="$HOME/.codon"
export LLVM_DIR="$CODON_PATH/lib/cmake/llvm"
export CPATH="$CODON_PATH/include:$CPATH"
export LIBRARY_PATH="$CODON_PATH/lib/codon:$LIBRARY_PATH"
```

### Build Process

```bash
mkdir build
cd build
cmake ..
make
make install  # Installs to $CODON_PATH/lib/codon/plugins/conduit
```

### Usage

```bash
codon build -plugin conduit examples/framework_autogen.codon
```

---

## 7. Key Utilities & Helper Functions

### IR Utilities (`codon/cir/util/irtools.h`)

```cpp
namespace codon::ir::util {
    // Get function from value
    Func* getFunc(Value *v);
    
    // Create function call
    CallInstr* call(Func *f, std::vector<Value*> args);
    
    // Get module from any node
    Module* getModule(Node *n);
}
```

### Casting & Type Checking

```cpp
// Safe cast (returns nullptr if wrong type)
auto *call = cast<CallInstr>(value);
if (call) { /* use it */ }

// Dynamic type check
if (auto *func = cast<Func>(value)) {
    // It's a function
}
```

### String Matching in IR

```cpp
// Get function name
std::string name = func->getUnmangledName();

// Check if it matches pattern
if (name.find("Conduit.") == 0) {
    // It's a Conduit method
}
```

---

## 8. Standard Pass Pipeline

Codon's compilation pipeline (in order):

1. **Pythonic optimizations**: `str + str`, `list + list`, dict operations
2. **Lowering**: Pipeline flows, imperative for loops
3. **Control-flow analysis** (CFG)
4. **Reaching definitions analysis**
5. **Dominator analysis**
6. **Capture/escape analysis**
7. **Global variable analysis**
8. **Side effect analysis**
9. **Constant folding** ← **We insert BEFORE this**
10. **NumPy fusion** (for array ops)
11. **Parallel loop lowering** (OpenMP, GPU)
12. **Global variable demotion**

**Our insertion point**: BEFORE constant folding

```cpp
void addIRPasses(transform::PassManager *pm, bool debug) override {
    std::string insertBefore = debug ? "" : "core-folding-pass-group";
    pm->registerPass(std::make_unique<ConduitDispatchPass>(), insertBefore);
}
```

This ensures:
- All decorators are already processed
- Route info is available
- Constant folding can optimize our generated dispatch code

---

## 9. Testing Strategy

### Unit Tests

Test individual components in isolation:

```cpp
// Test route detection
TEST(ConduitPlugin, DetectsGetRoute) {
    auto module = parseCodon(R"(
        app = Conduit()
        
        @app.get("/test")
        def handler(req):
            return Response("OK")
    )");
    
    ConduitRouteDetector detector;
    detector.run(module.get());
    
    ASSERT_EQ(1, detector.routes.size());
    ASSERT_EQ("GET", detector.routes[0].method);
    ASSERT_EQ("/test", detector.routes[0].path);
}
```

### Integration Tests

Test full compilation with plugin:

```bash
# Test plugin loads
codon build -plugin conduit examples/test_app.codon

# Test generated binary works
./test_app &
curl localhost:8000/test
```

### Benchmark Tests

Compare performance:

```bash
# Without plugin (Python generator)
./scripts/benchmark.sh baseline

# With plugin (compile-time)
./scripts/benchmark.sh plugin

# Expected: 5-10% improvement (no runtime overhead)
```

---

## 10. Documentation References

### Official Docs

1. **Plugin Guide**: `docs/developers/extend.md` in Codon repo
2. **IR Guide**: `docs/developers/ir.md` in Codon repo
3. **Compilation Pipeline**: `docs/developers/compilation.md`

### Source Code to Study

1. **Example plugin**: `github.com/exaloop/example-codon-plugin`
2. **Built-in passes**: `codon/cir/transform/pythonic/`
3. **Pass manager**: `codon/cir/transform/manager.cpp`
4. **IR nodes**: `codon/cir/base.h`

### Key Headers

```cpp
#include "codon/cir/transform/pass.h"      // Pass base classes
#include "codon/cir/transform/manager.h"   // PassManager
#include "codon/cir/util/irtools.h"        // IR helper functions
#include "codon/cir/util/visitor.h"        // Visitor patterns
#include "codon/dsl/dsl.h"                 // DSL base class
```

---

## 11. Next Steps (Week 1 Deliverables)

### Immediate Tasks

1. ✅ **Research complete** - This document
2. ⏭️ **Set up build environment**
   - Install Codon headers/dev files
   - Configure LLVM paths
   - Test CMake setup

3. ⏭️ **Build hello world plugin**
   - Create `plugins/conduit/` directory
   - Write minimal pass that prints message
   - Create CMakeLists.txt
   - Create plugin.toml
   - Build and test loading

4. ⏭️ **Verify plugin loads**
   - Compile example app with `-plugin conduit`
   - See "Conduit plugin loaded!" message
   - Confirm no compilation errors

### Success Criteria for Week 1

- [ ] Build environment configured
- [ ] Hello world plugin compiles
- [ ] Plugin loads successfully during compilation
- [ ] Can compile Conduit apps with plugin enabled
- [ ] Documentation written for setup process

---

## 12. Risk Assessment

### Low Risk ✅

- **Plugin API is stable**: Used by production projects
- **Documentation is comprehensive**: Multiple examples available
- **Build system is standard**: CMake, well-tested
- **IR is well-designed**: Typed, bidirectional, designed for transformations

### Medium Risk ⚠️

- **Decorator detection complexity**: May need to handle various syntax forms
- **IR generation learning curve**: Creating correct IR nodes takes practice
- **Type system integration**: Need to get types right for generated code

### Mitigation Strategies

1. **Start simple**: Hello world first, add complexity gradually
2. **Study examples**: Read built-in passes for patterns
3. **Test incrementally**: Verify each phase works before moving on
4. **Use debug mode**: Codon can dump IR at each stage (`-dump-ir`)

---

## 13. Conclusion

**Codon's plugin system is mature and well-suited for our needs.** We can build a C++ plugin that:

1. Detects `@app.get()` and similar decorators
2. Extracts route information during compilation
3. Generates optimized dispatch code in the IR
4. Leverages Codon's optimization passes

**The path forward is clear**:
- Week 1: Hello world plugin ← **START HERE**
- Week 2: Route detection
- Week 3: Dispatch generation
- Week 4: Optimizations

This approach gives us **true compile-time routing** with **zero runtime overhead** - making Conduit the **only compiled web framework with compile-time routing optimization**.

**Let's build it.** 🚀
