# Conduit Codon Plugin - Implementation Plan

**Milestone 3b: True Compile-Time Routing Optimization**

---

## Goal

Build a Codon compiler plugin that:

1. Recognizes `@app.get/@app.post` decorators at compile-time
2. Generates optimal dispatch code during compilation
3. Eliminates need for external code generation scripts
4. Provides best possible performance (hash tables, inline handlers, etc.)

---

## Why a Plugin?

**Current (Milestone 3a):**

```bash
python tools/generate_dispatch.py my_app.codon  # External script
codon build my_app.codon                         # Then compile
```

**With Plugin (Milestone 3b):**

```bash
codon build my_app.codon  # Plugin runs automatically during compilation
```

**Benefits:**

- ✅ Cleaner developer experience (one command)
- ✅ True compile-time optimization
- ✅ Can optimize based on actual code structure
- ✅ Can inline small handlers
- ✅ Can generate perfect hash tables
- ✅ Makes Conduit unique in ecosystem

---

## Codon Plugin Architecture

### What is a Codon Plugin?

Codon plugins are shared libraries (.so/.dylib) that hook into the compilation process.

**Plugin Lifecycle:**

1. Codon loads plugin at compile start
2. Plugin receives IR (Intermediate Representation) module
3. Plugin analyzes/transforms IR
4. Codon continues normal compilation with transformed IR

**Plugin API** (C++):

```cpp
#include "codon/compiler/compiler.h"
#include "codon/sir/sir.h"

class MyPlugin : public codon::ir::transform::Pass {
public:
    const std::string KEY = "my-plugin";

    void run(codon::ir::Module *module) override {
        // Analyze and transform the IR
    }
};

// Register plugin
CODON_PLUGIN(MyPlugin)
```

---

## Implementation Plan

### Phase 1: Research & Setup (Week 1)

**Tasks:**

1. Study Codon's IR structure

   - How functions are represented
   - How decorators work in IR
   - How to create new IR nodes

2. Set up plugin development environment

   - Install Codon headers/development files
   - Create CMakeLists.txt for plugin
   - Build minimal "hello world" plugin

3. Learn IR transformation API
   - How to iterate over functions
   - How to detect decorators
   - How to generate new IR nodes

**Deliverable:** Minimal working plugin that prints "Hello from Conduit Plugin"

---

### Phase 2: Route Detection (Week 2)

**Goal:** Detect `@app.get/@app.post` decorators in IR

**Implementation:**

```cpp
class ConduitRoutingPlugin : public codon::ir::transform::Pass {
public:
    struct RouteInfo {
        std::string method;
        std::string path;
        codon::ir::Func *handler;
    };

    std::vector<RouteInfo> detectRoutes(codon::ir::Module *module) {
        std::vector<RouteInfo> routes;

        for (auto *func : module->functions()) {
            // Check for @app.get, @app.post, etc decorators
            if (auto route = extractRouteDecorator(func)) {
                routes.push_back(*route);
            }
        }

        return routes;
    }

    std::optional<RouteInfo> extractRouteDecorator(codon::ir::Func *func) {
        // Parse function metadata/attributes
        // Look for Conduit route decorators
        // Extract method and path
        return std::nullopt;  // Or RouteInfo if found
    }
};
```

**Deliverable:** Plugin that prints list of detected routes during compilation

---

### Phase 3: Dispatch Generation (Week 3)

**Goal:** Generate optimal dispatch function in IR

**Strategies:**

1. **Small apps (<10 routes):** Simple if/elif chain (current approach)
2. **Medium apps (10-100 routes):** Binary search on route table
3. **Large apps (100+ routes):** Perfect hash table

**Implementation:**

```cpp
void generateDispatchFunction(codon::ir::Module *module,
                               const std::vector<RouteInfo> &routes) {
    if (routes.size() < 10) {
        generateLinearDispatch(module, routes);
    } else if (routes.size() < 100) {
        generateBinarySearchDispatch(module, routes);
    } else {
        generateHashTableDispatch(module, routes);
    }
}

void generateLinearDispatch(codon::ir::Module *module,
                             const std::vector<RouteInfo> &routes) {
    // Create new function: conduit_dispatch(app, request, route_idx)
    auto *dispatchFunc = module->create<codon::ir::Func>("conduit_dispatch");

    // Add parameters
    dispatchFunc->addParam(/*app*/, /*request*/, /*route_idx*/);

    // Generate if/elif chain
    for (size_t i = 0; i < routes.size(); i++) {
        auto *route = routes[i];

        // if route_idx == i:
        //     return app.to_response(handler(request))
        generateRouteCase(dispatchFunc, i, route);
    }

    // Default: return app.not_found_response()
    generateDefaultCase(dispatchFunc);
}
```

**Deliverable:** Plugin generates working dispatch function

---

### Phase 4: Optimization (Week 4)

**Advanced Optimizations:**

1. **Handler Inlining**

   - Inline small handlers directly into dispatch
   - Eliminates function call overhead

2. **Perfect Hash Tables**

   - For large apps, generate minimal perfect hash function
   - O(1) route lookup

3. **Static Route Analysis**
   - Detect unreachable routes at compile-time
   - Warn about route conflicts

**Implementation:**

```cpp
void optimizeDispatch(codon::ir::Module *module,
                      const std::vector<RouteInfo> &routes) {
    for (auto &route : routes) {
        if (shouldInlineHandler(route.handler)) {
            inlineHandlerIntoDispatch(route);
        }
    }

    if (routes.size() > 100) {
        generatePerfectHashTable(routes);
    }
}

bool shouldInlineHandler(codon::ir::Func *handler) {
    // Inline if:
    // - Small function (< 50 IR instructions)
    // - No complex control flow
    // - No external dependencies
    return handler->size() < 50 && isSimpleFunction(handler);
}
```

**Deliverable:** Optimized dispatch with inlining and perfect hashing

---

## Plugin Structure

```
conduit-plugin/
├── CMakeLists.txt          # Build configuration
├── src/
│   ├── plugin.cpp          # Main plugin entry point
│   ├── route_detector.cpp  # Route detection logic
│   ├── dispatch_gen.cpp    # Dispatch generation
│   └── optimizer.cpp       # Advanced optimizations
├── include/
│   └── conduit_plugin.h    # Plugin headers
├── tests/
│   ├── test_detection.cpp  # Unit tests
│   └── test_codegen.cpp
└── README.md               # Plugin documentation
```

---

## Build System

**CMakeLists.txt:**

```cmake
cmake_minimum_required(VERSION 3.14)
project(conduit-plugin)

set(CMAKE_CXX_STANDARD 17)

# Find Codon
find_package(Codon REQUIRED)

# Plugin sources
add_library(conduit-plugin SHARED
    src/plugin.cpp
    src/route_detector.cpp
    src/dispatch_gen.cpp
    src/optimizer.cpp
)

target_include_directories(conduit-plugin
    PRIVATE ${CODON_INCLUDE_DIRS}
    PRIVATE include/
)

target_link_libraries(conduit-plugin
    ${CODON_LIBRARIES}
)

# Install to Codon plugin directory
install(TARGETS conduit-plugin
    LIBRARY DESTINATION ${CODON_PLUGIN_DIR}
)
```

**Build:**

```bash
mkdir build && cd build
cmake ..
make
sudo make install  # Installs to Codon plugin directory
```

---

## Developer Experience

**Without Plugin (Milestone 3a):**

```bash
# Two-step build
python tools/generate_dispatch.py my_app.codon
codon build my_app.codon
```

**With Plugin (Milestone 3b):**

```bash
# One command - plugin runs automatically
codon build my_app.codon
```

**User's app stays the same:**

```python
from conduit import Conduit

app = Conduit()

@app.get("/")
def index(request):
    return {"message": "Hello"}

app.run()
```

**Plugin does the magic during compilation!**

---

## Testing Strategy

### Unit Tests (C++)

```cpp
TEST(RouteDetection, DetectsGetRoute) {
    // Create mock IR with @app.get("/") decorator
    auto module = createTestModule();

    ConduitPlugin plugin;
    auto routes = plugin.detectRoutes(module);

    ASSERT_EQ(routes.size(), 1);
    ASSERT_EQ(routes[0].method, "GET");
    ASSERT_EQ(routes[0].path, "/");
}
```

### Integration Tests (Codon)

```bash
# Test compilation with plugin
codon build test_app.codon

# Verify dispatch function exists
./test_app
```

---

## Performance Targets

| Metric                         | Target          |
| ------------------------------ | --------------- |
| Plugin load time               | < 10ms          |
| Route detection                | < 1ms per route |
| Dispatch generation            | < 50ms total    |
| Binary size impact             | < 5KB overhead  |
| Runtime dispatch (10 routes)   | O(1) with hash  |
| Runtime dispatch (100 routes)  | O(1) with hash  |
| Runtime dispatch (1000 routes) | O(1) with hash  |

---

## Success Criteria

1. ✅ Plugin loads successfully during Codon compilation
2. ✅ Detects all `@app.get/@app.post` decorators
3. ✅ Generates working dispatch function
4. ✅ Compiled apps run without external code generation
5. ✅ Performance better than Milestone 3a (same or better)
6. ✅ No changes to user's application code required
7. ✅ Documentation for plugin development

---

## Timeline

- **Week 1:** Research + minimal plugin
- **Week 2:** Route detection working
- **Week 3:** Dispatch generation working
- **Week 4:** Optimizations + polish

**Total: 3-4 weeks** for complete Codon plugin

---

## Resources

**Codon Documentation:**

- Plugin API: https://docs.exaloop.io/codon/advanced/plugins
- IR Reference: https://github.com/exaloop/codon/tree/develop/codon/sir
- Example plugins: https://github.com/exaloop/codon/tree/develop/stdlib

**Learning Path:**

1. Read Codon plugin docs
2. Study example plugins in Codon stdlib
3. Experiment with IR manipulation
4. Build Conduit plugin incrementally

---

## Risk Mitigation

**Risk:** Plugin API might change between Codon versions

**Mitigation:**

- Pin to specific Codon version initially
- Monitor Codon releases
- Update plugin as needed

**Risk:** Complex IR manipulation bugs

**Mitigation:**

- Start simple (linear dispatch first)
- Add optimizations incrementally
- Comprehensive testing at each step

**Risk:** Performance might not improve

**Mitigation:**

- Benchmark at each stage
- Compare with Milestone 3a baseline
- Keep code generation as fallback

---

## Next Steps

1. Research Codon plugin API (1-2 days)
2. Set up plugin development environment (1 day)
3. Build minimal "hello world" plugin (1 day)
4. Start route detection implementation (Week 2)

**Let's build the best routing system in any compiled language!** 🚀
