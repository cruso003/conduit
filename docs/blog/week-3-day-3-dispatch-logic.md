# Week 3 Day 3: Building the Dispatch Logic

**Date**: October 31, 2025  
**Branch**: `feature/framework-core`  
**Objective**: Implement if/elif chain control flow for route matching

## Overview

Today we completed the core dispatch logic by implementing a backward-constructed if/elif chain that matches incoming requests to registered routes. The plugin now generates a complete `conduit_dispatch` function with proper conditional branching.

## Implementation

### Challenge: String Comparison in IR

Initially attempted to use `str.__eq__` method directly:

```cpp
auto *eqMethod = M->getOrRealizeMethod(strType, "__eq__", {strType});
```

**Problems encountered**:

- `getOrRealizeMethod` couldn't find the method at plugin compile time
- `util::eq()` doesn't exist in the IR utilities
- `getModule("str")` - wrong API (takes no parameters)

**Solution**: Used a placeholder approach for now:

```cpp
Value* createStringEquals(Module *M, Var *var, const std::string &literal) {
    // Placeholder returns true - allows structure to generate correctly
    std::cout << "    [DEBUG] Comparison: " << var->getName() << " == \"" << literal << "\"\n";
    return M->getBool(true);
}
```

This lets us validate the if/elif structure while deferring proper string comparison to Day 4.

### If/Elif Chain Construction

Implemented **backward construction** pattern:

```cpp
// Start with 404 as final else clause
auto *notFoundFlow = M->Nr<SeriesFlow>();
notFoundFlow->push_back(M->Nr<ReturnInstr>(create404Response(M)));
Flow *currentElse = notFoundFlow;

// Iterate routes in REVERSE to build nested structure
for (auto it = routes.rbegin(); it != routes.rend(); ++it) {
    const auto &route = *it;

    // Create conditions
    auto *methodEq = createStringEquals(M, methodVar, route.method);
    auto *pathEq = createStringEquals(M, pathVar, route.path);

    // Create true branch (placeholder response)
    auto *trueBranch = M->Nr<SeriesFlow>();
    auto *response = M->getString("Matched: " + route.method + " " + route.path);
    trueBranch->push_back(M->Nr<ReturnInstr>(response));

    // Nested if: outer for method, inner for path
    auto *pathIf = M->Nr<IfFlow>(pathEq, trueBranch, currentElse);
    auto *pathIfSeries = M->Nr<SeriesFlow>();
    pathIfSeries->push_back(pathIf);

    currentElse = M->Nr<IfFlow>(methodEq, pathIfSeries, currentElse);
}

body->push_back(currentElse);
```

### Generated Structure

For 4 routes, the plugin generates:

```
if method == "GET":
    if path == "/":
        return "Matched: GET /"
    else:
        if method == "POST":
            if path == "/users":
                return "Matched: POST /users"
            else:
                ... (more routes)
else:
    return "404 Not Found"
```

## Test Results

Successfully validated with `test_plugin_minimal.codon`:

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

## Key Learnings

### 1. Backward Construction Pattern

Building conditionals from end to start simplifies nesting logic. Each iteration creates a new outer if with the previous structure as the else clause.

### 2. Flow Type Hierarchy

- `Flow*` is the base type for control flow nodes
- `SeriesFlow` holds sequences of instructions (has `push_back()`)
- `IfFlow` creates conditional branches (condition, true, false)
- Can't call `push_back()` on `Flow*` - must use `SeriesFlow*`

**Bug fix**:

```cpp
// WRONG - Flow doesn't have push_back
Flow *currentElse = M->Nr<SeriesFlow>();
currentElse->push_back(...);  // ERROR!

// CORRECT - Create as SeriesFlow, then assign to Flow*
auto *notFoundFlow = M->Nr<SeriesFlow>();
notFoundFlow->push_back(...);
Flow *currentElse = notFoundFlow;
```

### 3. Nested Conditionals for AND Logic

To check `method == X AND path == Y`, we nest IfFlow nodes:

```cpp
// Outer if checks method
// Inner if checks path
auto *pathIf = M->Nr<IfFlow>(pathEq, trueBranch, currentElse);
auto *methodIf = M->Nr<IfFlow>(methodEq, pathIfSeries, currentElse);
```

This simulates logical AND without needing a separate AND operator.

## Code Changes

**File**: `plugins/conduit/conduit.cpp`

**Added Functions**:

- `createStringEquals()` - Helper for string comparison (placeholder)
- `create404Response()` - Returns "404 Not Found" string

**Modified Functions**:

- `generateDispatchFunction()` - Now builds complete if/elif chain:
  - Extracts argument variables
  - Creates backward-constructed nested IfFlow nodes
  - Adds 404 fallback
  - Returns placeholder responses

**Line Count**: ~265 lines (up from ~160)

## What Works

✅ Plugin compiles without errors  
✅ Dispatch function generates successfully  
✅ If/elif chain structure is correct  
✅ All 4 routes detected and processed  
✅ 404 fallback included  
✅ Debug output shows route processing

## Known Limitations

⚠️ **String comparison uses placeholder** - Returns `true` for all comparisons  
⚠️ **Handler responses are strings** - Not calling actual handler functions  
⚠️ **Handler names show `<handler>`** - Metadata matching needs improvement

These will be addressed in Week 3 Day 4.

## Next Steps (Week 3 Day 4)

1. **Implement proper string comparison**

   - Research how to properly call `str.__eq__` in IR
   - Or use operator overloading mechanism
   - Replace `M->getBool(true)` with actual comparison

2. **Generate handler function calls**

   - Replace `M->getString("Matched: ...")` with `util::call(handler, {request})`
   - Link to actual handler `BodiedFunc*` pointers
   - Handle return value properly

3. **Fix handler name detection**

   - Improve `add_route_metadata` matching in Pass 2
   - Store actual function names in `RouteInfo`
   - Display in debug output

4. **End-to-end testing**
   - Create test that invokes `conduit_dispatch()`
   - Verify correct handler is called for each route
   - Test 404 handling for unknown routes

## Technical Debt

- Remove unused `patternArg` variable (line 56)
- Remove unused `requestVar` variable (line 195) - will be used in Day 4
- Add proper error handling for edge cases
- Consider optimization opportunities (perfect hashing in Week 4)

## Conclusion

Week 3 Day 3 successfully implemented the dispatch logic structure. The if/elif chain generation works correctly, and the plugin can now create a complete routing function. While string comparison and handler invocation are still placeholders, the control flow foundation is solid and ready for the final pieces in Day 4.

The backward construction pattern proved to be elegant and maintainable, and the nested IfFlow approach effectively simulates AND logic for matching both HTTP method and path.

**Status**: Week 3 Day 3 ✅ Complete | Week 3 Day 4 🚧 Ready to Start
