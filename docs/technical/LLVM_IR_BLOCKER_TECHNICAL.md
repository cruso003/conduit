# LLVM IR Generation Blocker - Technical Analysis

**Problem:** Plugin crashes with "Generated LLVM IR is invalid" when creating dispatch function  
**File:** `plugins/conduit/conduit.cpp` lines 820-920  
**Error Location:** `/Users/runner/work/codon/codon/codon/cir/llvm/optimize.cpp:1070`

---

## Exact Error Output

```
✓ Linked: GET / -> home()
✓ Linked: GET /about -> about()
✓ Linked: POST /submit -> submit()
✓ Linked: GET /users/:id -> get_user()
→ Linked: 4/4 handlers

→ Creating __plugin_dispatch_impl__ function
[WARNING] HTTPRequest type not found, falling back to str
[WARNING] HTTPResponse type not found, falling back to str
→ Dispatch signature: (method: str, path: str, request: str) -> str

Assert failed: Generated LLVM IR is invalid and has been dumped to '_dump.ll'
Expression: !broken
Source: /Users/runner/work/codon/codon/codon/cir/llvm/optimize.cpp:1070
zsh: abort      CODON_PATH=/Users/rgt/Desktop/BITS/TurboX codon build -plugin conduit
```

---

## The Problematic Code

### Location: `plugins/conduit/conduit.cpp` lines 820-920

```cpp
void generateMethodBucketedDispatch(Module *M) {
    std::cout << "\n→ Creating __plugin_dispatch_impl__ function\n";

    // Try to find HTTPRequest/HTTPResponse types
    auto *httpRequestType = findHTTPRequestType(M);
    auto *httpResponseType = findHTTPResponseType(M);

    if (!httpRequestType || !httpResponseType) {
        std::cout << "[WARNING] HTTPRequest type not found, falling back to str\n";
        std::cout << "[WARNING] HTTPResponse type not found, falling back to str\n";
        httpRequestType = M->getStringType();
        httpResponseType = M->getStringType();
    }

    // Create function signature
    auto *strType = M->getStringType();
    auto *funcType = M->Nr<types::FuncType>(
        httpResponseType,
        std::vector<types::Type*>{strType, strType, httpRequestType}
    );

    std::cout << "→ Dispatch signature: (method: str, path: str, request: str) -> str\n";

    // Create function
    auto *dispatch = M->Nr<BodiedFunc>("__plugin_dispatch_impl__");
    dispatch->realize(funcType, {"method", "path", "request"});

    // Get function parameters
    auto *methodVar = dispatch->arg("method");
    auto *pathVar = dispatch->arg("path");
    auto *requestVar = dispatch->arg("request");

    // Build function body
    auto *body = M->Nr<SeriesFlow>();
    Flow *currentElse = nullptr;

    // For each method bucket (GET, POST, etc.)
    for (auto &entry : buckets) {
        auto *bucket = &entry.second;

        // Create condition: method == "GET"
        auto *methodConst = M->getString(bucket->method);
        auto *methodEq = *methodVar == *methodConst;

        // Build inner flow for path matching
        auto *innerFlow = M->Nr<SeriesFlow>();
        Flow *innerElse = nullptr;

        // For each route in this method bucket
        for (int idx : bucket->route_indices) {
            auto &route = routes[idx];

            // Create condition: path == route.path
            auto *pathConst = M->getString(route.path);
            auto *pathEq = *pathVar == *pathConst;

            // ====== THIS IS WHERE IT BREAKS ======
            // Try to create call to route.handler_func

            // Approach 1: Direct call
            auto *handlerCall = M->Nr<CallInstr>(route.handler_func, requestVar);
            auto *returnFlow = M->Nr<SeriesFlow>();
            returnFlow->push_back(M->Nr<ReturnInstr>(handlerCall));

            // Add to if/elif chain
            auto *ifFlow = M->Nr<IfFlow>(pathEq, returnFlow, innerElse);

            if (!innerElse) {
                innerFlow->push_back(ifFlow);
            }
            innerElse = ifFlow;
        }

        // Add method check to outer if/elif chain
        auto *methodIf = M->Nr<IfFlow>(methodEq, innerFlow, currentElse);
        if (!currentElse) {
            body->push_back(methodIf);
        }
        currentElse = methodIf;
    }

    // Add 404 fallback
    auto *notFoundResponse = M->getString("{\"error\": \"Not found\"}");
    auto *notFoundReturn = M->Nr<SeriesFlow>();
    notFoundReturn->push_back(M->Nr<ReturnInstr>(notFoundResponse));
    body->push_back(notFoundReturn);

    // Set function body
    dispatch->setBody(body);

    std::cout << "✓ Dispatch function created\n";
}
```

---

## Type Analysis

### Handler Function Signatures (from test file)

```python
# tests/test_framework_integration.codon

@app.get("/")
def home(request: HTTPRequest) -> HTTPResponse:
    response = HTTPResponse(200, '{"message": "Hello from integrated plugin!"}')
    response.set_content_type("application/json")
    return response

@app.get("/about")
def about(request: HTTPRequest) -> HTTPResponse:
    response = HTTPResponse(200, '{"message": "About page"}')
    response.set_content_type("application/json")
    return response
```

**Actual Handler Type:** `(HTTPRequest) -> HTTPResponse`

### Generated Dispatch Function Signature

```
(method: str, path: str, request: str) -> str
```

**Problem:** Type mismatch!

- Dispatch receives `request: str`
- Handler expects `request: HTTPRequest`
- Dispatch returns `str`
- Handler returns `HTTPResponse`

---

## Type Finding Functions (Lines 61-90)

```cpp
types::Type* findHTTPRequestType(Module *M) {
    // Search for RecordType with name containing "HTTPRequest"
    for (auto *type : *M) {
        if (auto *recordType = cast<types::RecordType>(type)) {
            std::string typeName = recordType->getName();
            if (typeName.find("HTTPRequest") != std::string::npos) {
                std::cout << "[DEBUG] Found HTTPRequest type: " << typeName << "\n";
                return recordType;
            }
        }
    }

    std::cout << "[DEBUG] HTTPRequest type not found in module\n";
    return nullptr;  // Not found
}

types::Type* findHTTPResponseType(Module *M) {
    // Search for RecordType with name containing "HTTPResponse"
    for (auto *type : *M) {
        if (auto *recordType = cast<types::RecordType>(type)) {
            std::string typeName = recordType->getName();
            if (typeName.find("HTTPResponse") != std::string::npos) {
                std::cout << "[DEBUG] Found HTTPResponse type: " << typeName << "\n";
                return recordType;
            }
        }
    }

    std::cout << "[DEBUG] HTTPResponse type not found in module\n";
    return nullptr;  // Not found
}
```

**Issue:** Both return `nullptr` because:

1. Types are defined in `conduit/http/request.codon` and `conduit/http/response.codon`
2. Main module imports them but plugin only sees main module
3. Imported types may not be in `Module`'s type iterator

---

## What the Handler Functions Look Like in IR

From successful linking output:

```
✓ Linked: GET / -> home()
```

This means we have:

```cpp
route.handler_func = bodiedFunc;  // BodiedFunc* pointer
```

The `BodiedFunc` has:

- Unmangled name: `home`
- Type: Function type `(HTTPRequest) -> HTTPResponse`
- Body: IR for the actual handler code

**We successfully FOUND the function, but cannot CALL it with wrong types.**

---

## The Invalid CallInstr

```cpp
// This creates invalid IR:
auto *handlerCall = M->Nr<CallInstr>(route.handler_func, requestVar);

// Why invalid?
// - route.handler_func expects HTTPRequest
// - requestVar is type str
// - No type conversion happens automatically
```

**LLVM IR validator sees:**

```llvm
; Expected: call @home(%HTTPRequest* %request)
; Got:      call @home(i8* %request)  ; Wrong type!
```

---

## Attempted Fix Ideas (Not Yet Tried)

### Option 1: Find Types via Handler Function

Instead of searching module types, get types from the handler function itself:

```cpp
// Get the actual types from the handler
auto *handlerFuncType = cast<types::FuncType>(route.handler_func->getType());
auto *actualRequestType = handlerFuncType->getArgTypes()[0];
auto *actualResponseType = handlerFuncType->getRetType();

// Use these types for dispatch signature
auto *funcType = M->Nr<types::FuncType>(
    actualResponseType,
    std::vector<types::Type*>{strType, strType, actualRequestType}
);
```

**Pros:** Uses actual handler types, no search needed  
**Cons:** All handlers must have same types (they do!)

### Option 2: Inject Type Conversions

If we must use `str`, inject conversion code:

```cpp
// Convert str -> HTTPRequest
auto *parseRequest = findFunction(M, "HTTPRequest.__init__");
auto *requestObj = M->Nr<CallInstr>(parseRequest, requestVar);

// Call handler
auto *handlerCall = M->Nr<CallInstr>(route.handler_func, requestObj);

// Convert HTTPResponse -> str
auto *responseToStr = findMethod(handlerCall->getType(), "to_bytes");
auto *responseStr = M->Nr<CallInstr>(responseToStr, handlerCall);

return responseStr;
```

**Pros:** Bridges type gap  
**Cons:** Complex, requires finding conversion functions

### Option 3: Skip Dispatch Function Entirely

Instead of creating a separate dispatch function, inject handler calls directly into `handle_request`:

```cpp
// Find handle_request function in framework
auto *handleRequest = findFunction(M, "Conduit.handle_request");

// Modify its body to include if/elif with handler calls
// This way types are already correct - HTTPRequest is there
```

**Pros:** Types already match, simpler  
**Cons:** More invasive, modifies user code directly

### Option 4: Use Generic/Any Types

Check if Codon supports generic/variant types:

```cpp
auto *anyType = M->getAnyType();  // If this exists
auto *funcType = M->Nr<types::FuncType>(
    anyType,
    std::vector<types::Type*>{strType, strType, anyType}
);
```

**Pros:** Flexible  
**Cons:** May not exist in Codon, loses type safety

---

## Debugging Steps

### 1. Examine `_dump.ll` File

```bash
cd /Users/rgt/Desktop/BITS/TurboX
ls -lh _dump.ll
# File is 3.5MB - contains full LLVM IR

# Look for the dispatch function
grep -A 50 "__plugin_dispatch_impl__" _dump.ll > dispatch_ir.txt

# Look for type errors
grep -i "error\|invalid\|type mismatch" _dump.ll
```

### 2. Print Handler Function Types

Add debug output in plugin:

```cpp
for (auto &route : routes) {
    if (route.handler_func) {
        auto *funcType = cast<types::FuncType>(route.handler_func->getType());
        std::cout << "Handler " << route.handler_name << " type:\n";
        std::cout << "  Args: " << funcType->getArgTypes().size() << "\n";
        for (auto *argType : funcType->getArgTypes()) {
            std::cout << "    - " << argType->toString() << "\n";
        }
        std::cout << "  Return: " << funcType->getRetType()->toString() << "\n";
    }
}
```

### 3. Test Minimal Case

Create simpler test with just one route:

```python
# test_minimal.codon
from conduit import Conduit

app = Conduit(port=8080)

@app.get("/")
def home(request):  # Try without type hint first
    return "Hello"   # Return simple string

if __name__ == "__main__":
    app.run()
```

See if plugin can generate valid IR for this simpler case.

### 4. Compare with Working Code

Look at how Codon's built-in functions create CallInstr:

```bash
# Search Codon source code
find /path/to/codon/source -name "*.cpp" -exec grep -l "CallInstr" {} \;

# Look for patterns of calling user functions from generated code
```

---

## Key Questions for Codon Community

1. **How to access imported types in plugin?**

   - Module only shows main file's types
   - Need HTTPRequest/HTTPResponse from imported modules

2. **How to create CallInstr with proper types?**

   - Have BodiedFunc\* for handler
   - Have Var\* for request parameter (wrong type)
   - How to bridge the gap?

3. **Can function arguments be cast/converted in IR?**

   - Need str -> HTTPRequest conversion
   - Or need to declare dispatch with correct types

4. **Are there plugin examples that call user functions?**
   - Need reference implementation
   - Current approach may be fundamentally wrong

---

## Workaround Currently In Use

Framework uses manual dispatch (no plugin):

```python
def handle_request(self, request: HTTPRequest) -> HTTPResponse:
    matched, route_idx, params = self.match_route(request)
    if not matched:
        return self.not_found_response()

    # Manually call handler based on route_idx
    # (Current implementation just returns generic message)
    response = HTTPResponse(200, '{"message": "Route matched"}')
    return response
```

**Works but:** No performance benefits, no actual handler execution

---

## Success Criteria

✅ **Handler detection:** 4/4 routes found  
✅ **Handler linking:** 4/4 functions found in IR  
✅ **Route matching:** All routes work with manual dispatch  
❌ **Plugin dispatch:** Invalid LLVM IR generated

**Need:** Valid LLVM IR for dispatch function that calls handlers with correct types

---

## Files to Examine

1. `_dump.ll` - The invalid LLVM IR (3.5MB)
2. `/Users/runner/work/codon/codon/codon/cir/llvm/optimize.cpp:1070` - Validation code
3. Codon IR headers: `codon/cir/func.h`, `codon/cir/types/*.h`, `codon/cir/flow.h`
4. Codon plugin examples (if any exist in repo)

---

## Potential Solution Path

**Most Likely Fix: Use handler's actual types**

```cpp
void generateMethodBucketedDispatch(Module *M) {
    // Get types from first handler (all handlers have same signature)
    auto *firstHandler = routes[0].handler_func;
    auto *handlerType = cast<types::FuncType>(firstHandler->getType());
    auto *requestType = handlerType->getArgTypes()[0];
    auto *responseType = handlerType->getRetType();

    // Create dispatch with CORRECT types
    auto *strType = M->getStringType();
    auto *funcType = M->Nr<types::FuncType>(
        responseType,  // Return HTTPResponse, not str
        std::vector<types::Type*>{strType, strType, requestType}  // Accept HTTPRequest
    );

    auto *dispatch = M->Nr<BodiedFunc>("__plugin_dispatch_impl__");
    dispatch->realize(funcType, {"method", "path", "request"});

    auto *requestVar = dispatch->arg("request");

    // Now requestVar is HTTPRequest type - matches handler!
    auto *handlerCall = M->Nr<CallInstr>(route.handler_func, requestVar);
    // This should generate valid IR!
}
```

**Try this first!** It avoids the type search problem by using the handler's own type information.
