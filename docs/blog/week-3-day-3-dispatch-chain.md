# Week 3 Day 3: Building the Dispatch Function (Part 1)

_Building a Codon Plugin for Compile-Time Web Framework Optimization - Part 5_

**Published**: October 31, 2025  
**Series**: Conduit Framework Development  
**Reading Time**: 12 minutes

---

## The Mission

We've detected routes. We've extracted metadata. Now comes the real magic: **generating a dispatch function** that routes incoming HTTP requests to the right handler - all at compile time.

Today's goal: Build an if/elif chain in Codon's IR that checks method and path, then calls the appropriate handler. Think of it as hand-writing the routing logic that usually happens at runtime, but baking it directly into the compiled binary.

---

## What We're Building

When your Conduit app has these routes:

```python
@app.get("/")
def home(request):
    return "Home"

@app.post("/users")
def create_user(request):
    return "Created"

@app.get("/users/:id")
def get_user(request):
    return f"User {request.params['id']}"
```

The plugin generates this function (conceptually):

```python
def conduit_dispatch(method: str, path: str, request: Request) -> Response:
    if method == "GET":
        if path == "/":
            return home(request)
        elif path == "/users/:id":
            return get_user(request)
    elif method == "POST":
        if path == "/users":
            return create_user(request)

    return "404 Not Found"
```

Except we're not writing Python - we're **generating IR nodes** that represent this logic.

---

## Day 3: The If/Elif Chain

### Challenge 1: String Comparison

First problem: How do you compare strings in Codon's IR?

My initial thought: Use the `__eq__` method.

```cpp
auto *strType = M->getStringType();
auto *eqMethod = M->getOrRealizeMethod(strType, "__eq__", {strType});
```

**Result**: `Could not find str.__eq__ method`

The method exists in Codon's standard library, but it's not available during the plugin's execution phase. We're running too early in the compilation pipeline.

### Attempt 2: The util Namespace

Maybe there's a utility function?

```cpp
return util::eq(varValue, literalValue);
```

**Error**: `no member named 'eq' in namespace 'codon::ir::util'`

Nope.

### The Pragmatic Solution

For today, we need the **structure** of the if/elif chain to be correct. The actual string comparison can be refined later.

```cpp
Value* createStringEquals(Module *M, Var *var, const std::string &literal) {
    // Placeholder - returns true
    // This lets us validate the control flow structure
    std::cout << "    [DEBUG] Comparison: " << var->getName()
              << " == \"" << literal << "\"\n";
    return M->getBool(true);
}
```

This placeholder allows us to:

- ✅ Generate the correct IR structure
- ✅ Test the if/elif chain construction
- ✅ Verify all routes are processed
- ⏳ Defer actual comparison to tomorrow

---

## Challenge 2: Backward Construction

### The Nested Conditionals Problem

We need to generate:

```
if A: X
elif B: Y
elif C: Z
else: 404
```

In IR, this is actually:

```
if A:
    X
else:
    if B:
        Y
    else:
        if C:
            Z
        else:
            404
```

Each `elif` is an `if` nested inside the previous `else` clause. Building this forward would be painful - you'd need to track where to insert the next condition.

### The Elegant Solution: Build Backward

Start from the end and work back:

```cpp
// Start with 404 as the final else
auto *notFoundFlow = M->Nr<SeriesFlow>();
notFoundFlow->push_back(M->Nr<ReturnInstr>(create404Response(M)));
Flow *currentElse = notFoundFlow;

// Iterate routes in REVERSE
for (auto it = routes.rbegin(); it != routes.rend(); ++it) {
    const auto &route = *it;

    // Create condition and true branch
    auto *condition = createStringEquals(M, methodVar, route.method);
    auto *trueBranch = M->Nr<SeriesFlow>();
    trueBranch->push_back(M->Nr<ReturnInstr>(/* response */));

    // Create if with previous structure as else
    auto *ifNode = M->Nr<IfFlow>(condition, trueBranch, currentElse);

    // This becomes the new else clause for the next iteration
    currentElse = ifNode;
}

// The final result is the complete chain
body->push_back(currentElse);
```

**Why this works**:

1. Start with the innermost else (404)
2. Each iteration wraps it in a new if/else
3. The final `currentElse` is the outermost if
4. Perfect nesting, no tracking needed

---

## Challenge 3: AND Logic with Nested Ifs

We need to check TWO conditions: `method == "GET" AND path == "/"`.

Codon's IR doesn't have a simple AND operator we can use. The solution? **Nested if statements**:

```cpp
// Create both conditions
auto *methodEq = createStringEquals(M, methodVar, route.method);
auto *pathEq = createStringEquals(M, pathVar, route.path);

// Inner if checks path
auto *pathIf = M->Nr<IfFlow>(pathEq, trueBranch, currentElse);
auto *pathIfSeries = M->Nr<SeriesFlow>();
pathIfSeries->push_back(pathIf);

// Outer if checks method (with path check as true branch)
currentElse = M->Nr<IfFlow>(methodEq, pathIfSeries, currentElse);
```

This generates:

```
if method == "GET":
    if path == "/":
        return response
    else:
        <next route>
else:
    <next route>
```

Only when BOTH conditions are true do we return the response. Perfect!

---

## The Bug That Taught Me Types

This looked innocent:

```cpp
Flow *currentElse = M->Nr<SeriesFlow>();
currentElse->push_back(M->Nr<ReturnInstr>(create404Response(M)));
```

**Error**: `no member named 'push_back' in 'codon::ir::Flow'`

The problem: `Flow` is the **base class**. `SeriesFlow` is the **derived class** that has `push_back()`.

**The fix**:

```cpp
// Create as SeriesFlow (has push_back)
auto *notFoundFlow = M->Nr<SeriesFlow>();
notFoundFlow->push_back(M->Nr<ReturnInstr>(create404Response(M)));

// Then assign to Flow* for polymorphism
Flow *currentElse = notFoundFlow;
```

Type hierarchies matter, even in IR generation!

---

## The Victory

After debugging type errors and refining the algorithm, the plugin successfully generates the dispatch function:

```
╔══════════════════════════════════════════════════════════╗
║  ⚡ Generating Dispatch Function                        ║
╚══════════════════════════════════════════════════════════╝
  → Creating function skeleton...
  → Realizing function with signature...
  → Building if/elif chain for 4 routes...
    - PUT /users/:id
    [DEBUG] Comparison: method == "PUT"
    [DEBUG] Comparison: path == "/users/:id"
    - GET /users/:id
    [DEBUG] Comparison: method == "GET"
    [DEBUG] Comparison: path == "/users/:id"
    - POST /users
    [DEBUG] Comparison: method == "POST"
    [DEBUG] Comparison: path == "/users"
    - GET /
    [DEBUG] Comparison: method == "GET"
    [DEBUG] Comparison: path == "/"
  → Dispatch logic complete!
✅ Generated: conduit_dispatch
   Signature: (method: str, path: str, request: Request) -> Response
   Routes: 4
```

The structure is **perfect**. Four routes, all properly nested with method and path checks, plus a 404 fallback.

---

## What We Built Today

**New Helper Functions**:

```cpp
// String comparison (placeholder for now)
Value* createStringEquals(Module *M, Var *var, const std::string &literal);

// 404 response generator
Value* create404Response(Module *M);
```

**Enhanced Dispatch Generator**:

- ✅ Extracts function arguments (method, path, request)
- ✅ Builds backward-constructed if/elif chain
- ✅ Creates nested conditions for AND logic
- ✅ Includes 404 fallback
- ✅ Processes all detected routes

**Code Stats**:

- Added ~100 lines of dispatch logic
- Total plugin size: ~265 lines
- Helper functions: 3
- Control flow complexity: Nested if/elif chains

---

## What's Still Missing

The dispatch function **structure** is complete, but we're using placeholders:

1. **String comparison returns true** - Need actual `str.__eq__` calls
2. **Responses are strings** - Need actual handler invocations
3. **Handler names show `<handler>`** - Need better metadata matching

These are tomorrow's problems.

---

## The Lesson: Structure First, Details Later

Today's approach was pragmatic:

1. ✅ Get the control flow **structure** correct
2. ✅ Validate it compiles and runs
3. ✅ Verify all routes are processed
4. ⏳ Defer implementation details to next iteration

This is how you tackle complex compiler work: **layer by layer**, validating each step.

The dispatch function exists. It has the right signature. It processes every route. The if/elif chain is properly nested.

Now we just need to make the comparisons actually _work_ and the handlers actually get _called_.

---

## Next Time

**Week 3 Day 4**: Implementing proper string comparison and handler invocation. We'll:

- Research how to properly use `str.__eq__` in IR
- Replace placeholder responses with actual `util::call()` to handlers
- Fix handler name detection
- Test the complete dispatch function end-to-end

The finish line for Week 3 is in sight!

---

**Code**: [GitHub - plugins/conduit/conduit.cpp](https://github.com/cruso003/conduit)  
**Previous**: [Week 3 Day 2: Dispatch Function Skeleton](week-3-day-2-dispatch-skeleton.md)  
**Next**: [Week 3 Day 4: Handler Invocation](week-3-day-4-handler-calls.md)

_Follow the series to see how we build a production-ready compile-time web framework optimizer._
