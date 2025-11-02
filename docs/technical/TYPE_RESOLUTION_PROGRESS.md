# Type Resolution Fix - Progress Report

## What We Fixed ✅

### 1. Type Resolution Method

**Changed from:** Manual iteration through module types

```cpp
// OLD - Didn't work
for (auto *type : *M) {
    if (auto *recordType = cast<types::RecordType>(type)) {
        if (typeName.find("HTTPRequest") != std::string::npos) {
            return recordType;
        }
    }
}
```

**Changed to:** Bidirectional compilation API

```cpp
// NEW - Works!
auto *requestType = M->getOrRealizeType("HTTPRequest", {});
auto *responseType = M->getOrRealizeType("HTTPResponse", {});
```

**Result:** ✅ Types are now successfully resolved!

- No more "falling back to str" warnings
- Plugin can see HTTPRequest and HTTPResponse types
- Bidirectional compilation invokes type checker on-demand

## Current Issue ❌

### Type Structure Mismatch

**LLVM IR shows:**

```
Call parameter type does not match function signature!
 ptr  %16 = call ptr @"home.0:0[std.conduit.http.request.HTTPRequest.0].1273"({ i64, ptr } %15)
                      ^^^^^^ Handler expects struct { i64, ptr }
Function return type does not match operand type of return inst!
  ret ptr %16
      ^^^ Dispatch returns ptr but handler returns { i64, ptr }
```

**The Problem:**

- HTTPRequest is a **struct type**: `{ i64, ptr }` (likely `{refcount, data}`)
- HTTPResponse is also a **struct type**: `{ i64, ptr }`
- Dispatch function signature uses these types
- But `util::call()` is somehow converting them to simple `ptr` types

**Handler Signatures (actual):**

```llvm
@"home.0:0[std.conduit.http.request.HTTPRequest.0].1273"({ i64, ptr }) -> { i64, ptr }
```

**Dispatch Signature (what we're creating):**

```llvm
@"__plugin_dispatch_impl__"(ptr, ptr, ptr) -> ptr
```

## Root Cause Analysis

The issue is likely in how Codon represents user-defined classes:

1. **Value types**: Passed as structs `{ i64, ptr }`
2. **Reference types**: Passed as pointers `ptr`

HTTPRequest and HTTPResponse are classes, so they're being passed by value (with reference counting).

## Next Steps to Fix

### Option 1: Extract Types from Handler (RECOMMENDED)

Instead of using `getOrRealizeType()`, extract the exact types from the linked handler function:

```cpp
// Get types directly from first handler
auto *firstHandler = routes[0].handler_func;
auto *handlerFuncType = cast<types::FuncType>(firstHandler->getType());
auto *actualRequestType = handlerFuncType->getArgTypes()[0];  // { i64, ptr }
auto *actualResponseType = handlerFuncType->getRetType();     // { i64, ptr }

// Use these EXACT types for dispatch
auto *strType = M->getStringType();
auto *funcType = M->getFuncType(
    actualResponseType,  // Return what handler returns
    {strType, strType, actualRequestType}  // Accept what handler accepts
);
```

**Why this works:**

- Gets the EXACT type representation Codon uses
- No guessing about value vs reference semantics
- Guaranteed to match because it's from the handler itself

### Option 2: Check Type Representation

Examine what `getOrRealizeType()` actually returns:

```cpp
auto *requestType = M->getOrRealizeType("HTTPRequest", {});
std::cout << "Type kind: " << requestType->kind << "\n";
if (auto *recordType = cast<types::RecordType>(requestType)) {
    std::cout << "Is record type\n";
    // Use the record type directly
}
```

The type might need to be wrapped/unwrapped for proper representation.

### Option 3: Use getOrRealizeFunc for Handler Access

If the handlers are defined in the same module, we might be able to resolve them directly:

```cpp
auto *handlerFunc = M->getOrRealizeFunc("home", {httpRequestType});
```

But this requires knowing the exact mangled name, which we already have from linking.

## Recommended Fix

**Update `generateMethodBucketedDispatch()` to:**

```cpp
void generateMethodBucketedDispatch(Module *M) {
    if (routes.empty()) return;

    // Get types from first handler (all handlers have same signature)
    auto *firstHandler = routes[0].handler_func;
    if (!firstHandler) {
        std::cerr << "No handler function linked for first route\n";
        return;
    }

    auto *handlerType = cast<types::FuncType>(firstHandler->getType());
    if (!handlerType) {
        std::cerr << "Handler has invalid function type\n";
        return;
    }

    // Extract EXACT parameter and return types
    std::vector<types::Type*> handlerArgTypes = handlerType->getArgTypes();
    if (handlerArgTypes.empty()) {
        std::cerr << "Handler has no arguments\n";
        return;
    }

    auto *requestType = handlerArgTypes[0];   // HTTPRequest type (actual struct)
    auto *responseType = handlerType->getRetType();  // HTTPResponse type (actual struct)

    std::cout << "  → Using handler's actual types:\n";
    std::cout << "    Request type from handler: (struct)\n";
    std::cout << "    Response type from handler: (struct)\n";

    // Create dispatch with MATCHING types
    auto *strType = M->getStringType();
    auto *funcType = M->getFuncType(
        responseType,  // Return HTTPResponse struct
        {strType, strType, requestType}  // Accept HTTPRequest struct
    );

    auto *dispatch = M->Nr<BodiedFunc>("__plugin_dispatch_impl__");
    dispatch->realize(funcType, {"method", "path", "request"});

    // Now requestVar has the RIGHT type!
    auto *requestVar = dispatch->getArgVar("request");

    // Build dispatch body...
    // util::call(handler, {M->Nr<VarValue>(requestVar)}) should work now!
}
```

## Testing Plan

1. **Implement type extraction from handler**
2. **Rebuild plugin**
3. **Test compilation** - should have no type mismatches
4. **Run server** - handlers should actually execute
5. **Test with curl** - should see real handler responses instead of generic messages

## Success Criteria

✅ No LLVM IR validation errors
✅ Compilation completes successfully  
✅ Server starts and runs
✅ curl requests return actual handler responses (not generic "Route matched")
✅ All 4 handlers execute correctly

## Current Status

**Working:**

- ✅ Type resolution with `getOrRealizeType()`
- ✅ Handler detection and linking (4/4)
- ✅ Plugin compiles and installs
- ✅ Types are found (no fallback to str)

**Needs Fix:**

- ❌ Type representation mismatch (struct vs pointer)
- ❌ Dispatch function signature doesn't match handlers
- ❌ LLVM IR validation fails

**Progress:** 90% complete - just need to match the exact type representation!
