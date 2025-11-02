# The Plugin Works! Phase 3 Integration Complete 🎉

_November 2, 2025_

## It Finally Works!

After days of wrestling with LLVM IR, type systems, and symbol mangling, I'm thrilled to announce: **the Conduit compiler plugin is fully integrated with the framework and working perfectly!**

Here's what it looks like in action:

```bash
$ curl http://localhost:8080/
{"message": "Hello from integrated plugin!"}

$ curl http://localhost:8080/about
{"page": "about", "version": "0.2.0"}

$ curl -X POST http://localhost:8080/submit
{"status": "created", "message": "Data submitted"}
```

All routes work. Handlers execute correctly. The plugin-generated dispatch is calling our code. **It's alive!** 🚀

---

## The Journey So Far

This has been a three-phase adventure:

**Phase 1: Route Detection** ✅  
Getting the plugin to find routes from decorator metadata. This involved diving deep into Codon's IR, understanding how decorators compile, and extracting handler functions from the module.

**Phase 2: Type Resolution** ✅  
Making sure all the types match in LLVM IR. The big discovery here was that Codon classes become `ptr` types in LLVM, not struct types. Once we figured that out, everything clicked into place.

**Phase 3: Framework Integration** ✅  
The final boss. Getting the framework to actually call the plugin-generated dispatch function. This is where things got... interesting.

---

## The Symbol Mangling Problem

Here's the thing about building compiler plugins: you're working at a level where the normal rules don't apply. The framework needs to call a function that the plugin generates, but they compile at different stages. How do you make that work?

My first thought: "Just export the function with C linkage, right?"

Wrong. Codon mangles function names for type safety. The plugin creates `_conduit_plugin_dispatch.15930`, but the framework is looking for `_conduit_plugin_dispatch`. Linking fails.

I tried everything:

- Setting unmangled names (no effect on symbols)
- Using `ExternalFunc` (for declarations only)
- LLVM forward declarations (still mangled)
- Cursing at my computer (therapeutic but ineffective)

Every approach hit the same wall: **function name mangling**.

---

## The Breakthrough: Don't Create, Replace!

Then it hit me: **What if we don't create a new function at all?**

What if the framework defines a stub function, and the plugin just... replaces its body?

Here's how it works:

### 1. Framework Defines Stub

The framework has a simple stub function with the right signature:

```codon
def conduit_plugin_dispatch(method: str, path: str, request: HTTPRequest) -> HTTPResponse:
    # If you see this error, the plugin didn't run!
    return HTTPResponse(500, "ERROR: Plugin did not generate dispatch function")
```

This is just a regular Codon function. No `@llvm` decorator, no special attributes. Just a function that returns an error.

### 2. Plugin Finds Stub

During compilation, the plugin iterates through the module and finds this function:

```cpp
BodiedFunc *dispatch = nullptr;

for (auto it = M->begin(); it != M->end(); ++it) {
    if (auto *func = cast<BodiedFunc>(*it)) {
        if (func->getName().find("conduit_plugin_dispatch") != std::string::npos) {
            dispatch = const_cast<BodiedFunc*>(func);
            break;
        }
    }
}
```

### 3. Plugin Replaces Body

Once we have the function, we just replace its body:

```cpp
dispatch->setBody(optimized_dispatch_logic);
```

That's it! The framework already knows about the function (it compiled it), the types already match (we extracted them from the handlers), and there's only one symbol in the binary (no mangling conflicts).

**Problem solved.**

---

## Why This Works

The beauty of this approach is that it sidesteps the entire symbol export problem. We're not trying to make the plugin-generated function visible to the framework. The framework already has the function! We're just changing what it does.

Think of it like this:

- **Old approach:** Plugin creates a gift (function), tries to wrap it (export), but can't find the right paper (linkage mechanism)
- **New approach:** Framework creates an empty box (stub), plugin fills it with the gift (replaces body)

The framework was always going to open that box. We just changed what's inside.

---

## The Code That Powers It

Here's what the plugin generates for the dispatch function:

```
conduit_plugin_dispatch(method, path, request):
  if method == "GET":
      if path == "/":
          return home(request)
      else if path == "/about":
          return about(request)
      else if path == "/users/:id":
          return get_user(request)
      else:
          return 404_handler(request)
  else if method == "POST":
      if path == "/submit":
          return submit(request)
      else:
          return 404_handler(request)
  else:
      return 404_handler(request)
```

It's a simple if/else chain, but it's optimized by checking the method first. Most requests are GET, so we quickly eliminate POST/PUT/DELETE routes. Then we only check paths for that specific method.

For our test app with 4 routes (3 GET, 1 POST), this means:

- GET requests: 1-3 comparisons (average: 2)
- POST requests: 1-2 comparisons
- Other methods: 1 comparison

Much better than checking all routes regardless of method!

---

## What We Learned

### 1. The Type System Works!

Remember Phase 2 where we discovered that Codon classes compile to `ptr` types in LLVM? That insight was crucial. Our handlers take `ptr` (HTTPRequest) and return `ptr` (HTTPResponse). The dispatch function does the same. LLVM is happy, we're happy, everyone's happy.

### 2. Function Bodies Are Mutable

Codon's `BodiedFunc` type has a `setBody()` method that lets you replace the entire function body. This is powerful! It means plugins can modify existing code, not just add new code.

### 3. Stub Pattern Is Clean

The stub replacement pattern is actually really elegant:

- Framework defines interface (function signature)
- Plugin provides implementation (function body)
- No complex linking or symbol management
- Single source of truth for types

I bet this pattern could work for other plugin scenarios too.

### 4. Debug, Then Clean

Throughout this project, I added tons of debug output to the plugin:

```
    ✓ Found framework stub
    → Stub has 3 arguments
    → Setting body on dispatch function
    → Body set successfully
```

This was invaluable for debugging. But in production, most of it should be quiet or behind a verbose flag. The plugin runs every compilation - users don't need to see all the internals.

---

## What's Next

We now have a working plugin that:

- ✅ Detects routes from decorators
- ✅ Links handler functions
- ✅ Generates optimized dispatch
- ✅ Integrates with the framework
- ✅ Executes handlers correctly

But there's still work to do:

### Path Parameters

Right now, `/users/:id` doesn't work. The route is detected, but the dispatch treats `:id` as a literal string, not a parameter. We need to:

1. Parse route patterns to extract parameter names
2. Generate regex or custom matching code
3. Extract parameter values from the path
4. Pass them to handlers

### Better Optimization

The current if/else chain works, but we can do better. For apps with lots of routes, we could:

- Use perfect hash functions (we started this!)
- Build trie structures for path matching
- Generate jump tables for known routes
- Cache compiled regex patterns

### Error Handling

What happens if a handler throws an exception? Right now: crash. We should:

- Wrap handler calls in try/catch
- Return 500 responses for errors
- Log exceptions for debugging
- Provide custom error handlers

### Testing

We have one integration test. We need:

- Unit tests for route detection
- Tests for each dispatch strategy
- Benchmark comparisons
- Stress tests with many routes

---

## The Big Picture

Building a compiler plugin is hard. Really hard. You're working at a level where there's minimal documentation, few examples, and lots of trial and error.

But it's also incredibly rewarding. When you finally see this:

```bash
$ curl http://localhost:8080/
{"message": "Hello from integrated plugin!"}
```

And you know that message came from a handler, called by a dispatch function, generated by YOUR plugin, that replaced a stub, using types extracted from the code, all compiled to native code...

That's pretty cool.

We've built something that didn't exist before: a compile-time optimized web framework for Codon. Routes are detected and dispatched without runtime overhead. Type safety is enforced by the compiler. And it all happens automatically through a plugin.

---

## Try It Yourself

Want to see it in action? Here's how:

```bash
# Clone the repo
git clone https://github.com/cruso003/conduit
cd conduit

# Build the plugin
cd plugins/conduit/build
cmake .. && make && make install

# Build and run the test
cd ../../..
CODON_PATH=$(pwd) codon build -plugin conduit tests/test_framework_integration.codon -o test_server
DYLD_LIBRARY_PATH=~/.codon/lib/codon ./test_server

# In another terminal
curl http://localhost:8080/
curl http://localhost:8080/about
curl -X POST http://localhost:8080/submit
```

You should see responses from the handlers. That's the plugin at work!

---

## Acknowledgments

This wouldn't have been possible without:

- The Codon team for creating an amazing language
- The Codon community for answering my questions
- Stack Overflow for... existing
- Coffee ☕

---

## Final Thoughts

Phase 3 is complete. The plugin works. All static routes execute correctly.

But this is just the beginning. We've built the foundation for a powerful, compile-time optimized web framework. Now we can build features on top of it:

- Dynamic routing
- Middleware
- WebSockets
- Real-time features
- Whatever we can imagine

The hard part is done. Now comes the fun part: building cool stuff with it!

Stay tuned for Phase 4... 🚀

---

_Next up: Implementing path parameters and unleashing the full power of dynamic routing!_
