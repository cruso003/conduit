# Week 2: Teaching the Compiler to Read Route Decorators

_Building a Codon Plugin for Compile-Time Web Framework Optimization - Part 2_

**Published**: October 31, 2025  
**Series**: Conduit Framework Development  
**Reading Time**: 10 minutes

---

## The Challenge

Last week, we built a "Hello World" Codon plugin that could run during compilation. This week? We taught it to actually **understand** our web framework's routing decorators.

The goal was ambitious: scan through Codon's intermediate representation (IR) and extract complete routing information from decorators like `@app.get("/users/:id")` - including the HTTP method, path pattern, AND the handler function name.

Spoiler: We did it. Let me show you how.

---

## What We're Detecting

When you write a Conduit route:

```python
@app.get("/users/:id")
def get_user(request):
    user_id = request.params.get("id", "")
    return {"user_id": user_id, "name": f"User {user_id}"}
```

The plugin needs to extract:

- **HTTP Method**: `GET`
- **Path Pattern**: `/users/:id`
- **Handler Function**: `get_user`

Sounds simple? Here's the twist: we're not parsing Python code. We're analyzing **compiled IR** - a lower-level representation where decorators have already been transformed into function calls and control flow.

---

## Day 1: Finding the Decorators

### The Hunt Begins

First challenge: What does `@app.get("/path")` look like in Codon's IR?

My initial assumption: It would be a fully-qualified function call like `conduit.framework.conduit.Conduit.get`. I was wrong.

### The Debug Session

I added debug output to see what function calls the plugin was encountering:

```cpp
void handle(CallInstr *v) override {
    auto *func = util::getFunc(v->getCallee());
    if (!func) return;

    std::string funcName = func->getUnmangledName();
    std::cerr << "Found call: " << funcName << "\n";
}
```

The output was illuminating:

```
[CALL #1] __new__
[CALL #2] __new__
[CALL #3] __new__
...
[CALL #12] get (2 args)
[CALL #13] post (2 args)
[CALL #14] get (2 args)
```

**Aha!** The decorators appear as simple function names (`get`, `post`) with exactly 2 arguments.

### Pattern Recognition

The pattern became clear:

- **Function name**: Simple HTTP method name (`get`, `post`, `put`, `delete`, `patch`)
- **Arguments**: 2 (self + path string)
- **Context**: Called on Conduit instance

```cpp
if (v->numArgs() == 2) {
    if (funcName == "get") {
        methodName = "GET";
    } else if (funcName == "post") {
        methodName = "POST";
    }
    // ... etc
}
```

**Day 1 Result**: Successfully detecting all route decorator calls! 🎉

```
Detected 3 route(s):
  GET <path> -> <handler>
  POST <path> -> <handler>
  GET <path> -> <handler>
```

---

## Day 2: Extracting the Path Strings

### From `<path>` to `/users/:id`

Detecting the decorator calls was step one. Now we needed the actual path strings.

The second argument to `app.get()` is the path. But in IR, it's not a Python string - it's a `Value` node. We needed to extract the actual string content.

### Discovery: String Constants in IR

After digging through Codon's headers, I found:

```cpp
#include "codon/cir/const.h"

using StringConst = TemplatedConst<std::string>;
```

Codon represents compile-time strings as `StringConst` nodes with a `getVal()` method!

### The Extraction Code

```cpp
auto args = v->begin();
++args; // Skip 'self' argument

auto *pathArg = *args;
std::string path = "<unknown>";

if (auto *strConst = cast<StringConst>(pathArg)) {
    path = strConst->getVal();  // Got it!
}

routes.emplace_back(methodName, path, "<handler>", nullptr);
```

### Testing with Complex Paths

I created a comprehensive test with various path patterns:

```python
@app.get("/")                        # Root
@app.get("/api/v1/users")           # Nested
@app.get("/users/:id")              # Single param
@app.patch("/users/:id/profile")    # Nested with param
@app.get("/search/:category/:term") # Multiple params
```

**Day 2 Result**: All paths extracted perfectly!

```
Detected 8 route(s):
  GET / -> <handler>
  GET /api/v1/users -> <handler>
  POST /api/v1/users -> <handler>
  GET /users/:id -> <handler>
  PUT /users/:id -> <handler>
  DELETE /users/:id -> <handler>
  PATCH /users/:id/profile -> <handler>
  GET /search/:category/:term -> <handler>
```

---

## Day 3: The Handler Name Mystery

### The Decorator Dance

Here's where it got interesting. In Python, decorators work like this:

```python
def get(self, pattern: str):
    def decorator(handler):           # Returns a function
        # Do something with handler
        return handler
    return decorator                   # Returns the decorator

# Usage:
@app.get("/path")    # Calls get("/path"), gets decorator
def my_handler(...): # Decorator is applied to my_handler
    pass
```

So `app.get("/path")` doesn't directly receive the handler function. It returns a decorator that _then_ receives the handler.

How do we connect the path to the handler name in IR?

### Failed Approach: Flow Tracing

My first idea: trace the decorator flow.

1. Detect `app.get("/path")` → returns decorator
2. Find where decorator is called with handler
3. Extract handler name

Problem: This requires complex dataflow analysis. The decorator might be stored in a temporary variable, passed around, etc. Too complicated.

### Successful Approach: Side Effects

Then I had a realization: decorators have **observable side effects**!

Looking at our Conduit implementation:

```python
def get(self, pattern: str):
    def decorator(handler):
        self.add_route_metadata(pattern, "GET", handler.__name__)
        return handler
    return decorator
```

The decorator calls `add_route_metadata` with the handler name! That's a function call we can detect!

### Two-Pass Strategy

```cpp
// Pass 1: Detect app.get("/path")
if (funcName == "get" && v->numArgs() == 2) {
    // Extract path
    routes.emplace_back("GET", path, "<handler>", nullptr);
}

// Pass 2: Detect add_route_metadata call
if (funcName == "add_route_metadata" && v->numArgs() >= 4) {
    // args: self, pattern, method, handler_name
    auto methodArg = /* extract from args */;
    auto nameArg = /* extract from args */;

    std::string method = cast<StringConst>(methodArg)->getVal();
    std::string handlerName = cast<StringConst>(nameArg)->getVal();

    // Find matching route and update handler name
    for (auto &route : routes) {
        if (route.method == method && route.handler_name == "<handler>") {
            route.handler_name = handlerName;
            break;
        }
    }
}
```

### Day 3 Result: Complete Information!

```
Detected 8 route(s):
  GET / -> index(...)
  GET /api/v1/users -> list_users(...)
  POST /api/v1/users -> create_user(...)
  GET /users/:id -> get_user(...)
  PUT /users/:id -> update_user(...)
  DELETE /users/:id -> delete_user(...)
  PATCH /users/:id/profile -> patch_profile(...)
  GET /search/:category/:term -> search(...)
```

**Perfect!** Every route with its complete information. 🚀

---

## Key Insights

### 1. IR Simplifies Names

Don't assume you'll see fully-qualified names. `Conduit.get` becomes just `get` in IR. Context (argument count, types) is how you disambiguate.

### 2. Look for Side Effects

When direct flow analysis is hard, look for observable side effects. Function calls, assignments, mutations - these leave traces you can follow.

### 3. Closure Variables Aren't Constants

The `pattern` parameter in our decorator is captured by the closure, so when `add_route_metadata` is called with it, it's not a `StringConst` anymore - it's a variable reference.

This is why we couldn't extract the path from the `add_route_metadata` call - we had to get it from the original `app.get()` call where it _was_ a constant.

### 4. Two-Pass Strategies Work

Don't try to solve everything in one pass. Our two-pass approach:

1. First pass: Collect what's easy (decorator calls)
2. Second pass: Enrich with additional info (handler names)

Simple, clean, and it works.

---

## The Numbers

**Test Coverage**:

- ✅ 5/5 HTTP methods (GET, POST, PUT, DELETE, PATCH)
- ✅ 8/8 routes detected with 100% accuracy
- ✅ All path patterns: simple, nested, single param, multi-param
- ✅ All handler names correctly linked

**Code Stats**:

- Started: 47 lines (hello world plugin)
- Ended: 158 lines (full route detection)
- Detection logic: ~60 lines
- Time investment: ~6 hours over 3 days

**Performance**:

- Compile-time overhead: <1ms for 8 routes
- Runtime overhead: 0 (all detection at compile-time)

---

## What's Next?

Week 2 gave us the eyes to see routes. Week 3 will give us the hands to build something with them.

**Next up**: Generating an optimized dispatch function directly in the IR. Instead of:

```python
# Runtime dispatch with if/elif chain
if method == "GET" and path == "/":
    return index(request)
elif method == "POST" and path == "/users":
    return create_user(request)
# ... etc
```

We'll generate this at **compile-time**, built right into the IR. The compiler will know all routes before the program even runs.

That's Week 3. Stay tuned for IR code generation! 💪

---

## Code Snippets

All code from this week is available in the [Conduit repository](https://github.com/cruso003/conduit):

- Plugin source: `plugins/conduit/conduit.cpp`
- Test files: `test_plugin_routes.codon`, `test_plugin_comprehensive.codon`
- Full documentation: `docs/WEEK_2_TECHNICAL_REPORT.md`

---

## Try It Yourself

Want to build your own Codon plugin? Here's the crash course:

1. **Install Codon** 0.19.3 or later
2. **Create plugin structure**:

   ```bash
   mkdir -p plugins/myplugin
   cd plugins/myplugin
   ```

3. **Write your plugin** (`myplugin.cpp`):

   ```cpp
   #include "codon/cir/transform/pass.h"
   #include "codon/dsl/dsl.h"

   using namespace codon::ir;

   class MyPass : public transform::OperatorPass {
       void handle(CallInstr *v) override {
           // Your logic here!
       }
   };

   class MyPlugin : public codon::DSL {
       void addIRPasses(transform::PassManager *pm, bool debug) override {
           pm->registerPass(std::make_unique<MyPass>());
       }
   };

   extern "C" std::unique_ptr<codon::DSL> load() {
       return std::make_unique<MyPlugin>();
   }
   ```

4. **Build it** with CMake
5. **Use it**: `codon run -plugin myplugin your_code.codon`

Start simple, iterate quickly, and have fun!

---

## Acknowledgments

Thanks to the Codon team for building an extensible compiler with a clean plugin API. The IR is well-designed and the headers are (mostly) documented!

---

**Previously**: [Week 1: Hello World Plugin](week-1-plugin-foundation.md)  
**Next**: Week 3: Generating Dispatch Functions in IR (Coming Soon)

---

_Want to follow along with Conduit development? Star the repo and watch for weekly updates!_

---

## Discussion

Have questions about Codon plugins or IR analysis? Found a bug in our detection logic? Want to share your own plugin experiments?

Drop a comment below or open an issue on GitHub! I'd love to hear what you're building.

---

_This is part 2 of a 5-part series on building a compile-time optimized web framework in Codon. Check out [Part 1: The Plugin Foundation](week-1-plugin-foundation.md) if you missed it!_
