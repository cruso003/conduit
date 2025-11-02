# Conduit Plugin → Framework Migration Guide

**Version**: 1.0  
**Date**: November 1, 2025  
**Audience**: Framework Developers

---

## Overview

This guide explains how to integrate the **Conduit Codon Plugin** (compile-time routing optimization) with the **Conduit Framework** (runtime web server).

**Plugin Status**: ✅ Complete (Weeks 1-12)  
**Framework Status**: 🚧 In Progress (Milestone 2 → 3)

---

## Architecture Overview

### Two-Track Development

```
Track 1: Compiler Plugin (COMPLETE)
├── Compile-time route detection
├── Perfect hash generation
├── Method bucketing
├── Handler linking
└── Dispatch generation

Track 2: Framework Runtime (IN PROGRESS)
├── HTTP server (Milestone 2: COMPLETE)
├── Request/Response objects (Milestone 2: COMPLETE)
├── Router integration (Milestone 3: NEXT)
├── MCP server (Milestone 4)
└── Auto-docs (Milestone 4)
```

### Integration Points

```
Application Code
    ↓
@app.get("/users/:id")  ← Framework decorators
    ↓
[COMPILE TIME]
    ↓
Plugin detects routes  ← Plugin processing
Plugin generates dispatch
    ↓
[RUNTIME]
    ↓
Framework receives request  ← Framework processing
Framework calls conduit_dispatch_bucketed()
Plugin dispatch selects handler
Handler executes with HTTPRequest
Handler returns HTTPResponse
Framework sends HTTP response
```

---

## Step 1: Framework Router Redesign

### Current State (Milestone 2)

```python
# turbox/server/__init__.codon
class Conduit:
    def __init__(self):
        self.routes: Dict[str, Dict[str, Callable]] = {}

    def add_route(self, method: str, path: str, handler: Callable):
        # Stores in runtime dictionary
        if path not in self.routes:
            self.routes[path] = {}
        self.routes[path][method] = handler

    def dispatch(self, method: str, path: str, request: HTTPRequest) -> HTTPResponse:
        # Runtime dictionary lookup (slow)
        if path in self.routes and method in self.routes[path]:
            return self.routes[path][method](request)
        return HTTPResponse(status=404)
```

**Problem**: Runtime dictionary lookups defeat the purpose of compile-time optimization.

### Target State (Milestone 3)

```python
# turbox/server/__init__.codon
from C import conduit_dispatch_bucketed(str, str, HTTPRequest) -> HTTPResponse

class Conduit:
    def __init__(self):
        # Plugin generates conduit_dispatch_bucketed() at compile time
        pass

    def add_route(self, method: str, path: str, handler: Callable):
        # Only for metadata (plugin detects via IR)
        # Mark with decorator for plugin detection
        add_route_metadata(method, path, handler.__name__)

    def dispatch(self, method: str, path: str, request: HTTPRequest) -> HTTPResponse:
        # Call plugin-generated dispatch (fast)
        return conduit_dispatch_bucketed(method, path, request)
```

**Solution**: Framework delegates to plugin-generated dispatch function.

---

## Step 2: Plugin-Framework Communication

### Metadata Registration

The plugin detects routes via decorator calls in the IR. Framework must emit these during compilation:

```python
# turbox/server/__init__.codon

@__internal__  # Mark as IR-visible
def add_route_metadata(method: str, path: str, handler_name: str):
    # Empty function - plugin intercepts the call
    pass

def get(path: str):
    def decorator(func):
        # Plugin detects this call in IR
        add_route_metadata("GET", path, func.__name__)
        return func
    return decorator

def post(path: str):
    def decorator(func):
        add_route_metadata("POST", path, func.__name__)
        return func
    return decorator
```

### Plugin Detection

The plugin intercepts `add_route_metadata()` calls during compilation:

```cpp
// plugins/conduit/conduit.cpp (existing code)

void handle(CallInstr *v) override {
    auto *func = util::getFunc(v->getCallee());
    if (funcName == "add_route_metadata") {
        // Extract: method, path, handler_name
        auto method = getStringLiteralValue(v->front());
        auto path = getStringLiteralValue((*++v->begin()));
        auto handler = getStringLiteralValue((*++++v->begin()));

        routes.push_back(RouteInfo(method, path, handler, nullptr));
    }
}
```

---

## Step 3: Dispatch Function Export

### Plugin Side (Existing)

The plugin already generates `conduit_dispatch_bucketed()`:

```cpp
// plugins/conduit/conduit.cpp (Week 6 Day 2)

BodiedFunc* generateMethodBucketedDispatch(Module *M, const std::map<std::string, MethodBucket>& buckets) {
    auto *httpRequestType = findHTTPRequestType(M);
    auto *httpResponseType = findHTTPResponseType(M);

    // Signature: (method: str, path: str, request: HTTPRequest) -> HTTPResponse
    std::vector<types::Type*> argTypes = {strType, strType, httpRequestType};
    auto *funcType = M->getFuncType(httpResponseType, argTypes);

    auto *dispatchFunc = M->Nr<BodiedFunc>();
    dispatchFunc->setName("conduit_dispatch_bucketed");
    // ... generate dispatch logic ...

    M->push_back(dispatchFunc);  // Export to module
    return dispatchFunc;
}
```

### Framework Side (TODO: Milestone 3)

Framework imports and calls the generated function:

```python
# turbox/server/__init__.codon

from C import conduit_dispatch_bucketed(str, str, HTTPRequest) -> HTTPResponse

class Conduit:
    def dispatch(self, method: str, path: str, request: HTTPRequest) -> HTTPResponse:
        # Call plugin-generated dispatch
        return conduit_dispatch_bucketed(method, path, request)
```

**Key**: The `from C import` statement tells Codon to look for a function exported by the plugin.

---

## Step 4: Type System Integration

### HTTPRequest Type

```python
# turbox/http/request.codon (Milestone 2: COMPLETE)

class HTTPRequest:
    method: str
    path: str
    headers: Dict[str, str]
    body: str
    params: Dict[str, str]  # Path parameters (/users/:id)
    query: Dict[str, str]   # Query parameters (?page=1)

    def __init__(self, method: str, path: str, headers: Dict[str, str], body: str):
        self.method = method
        self.path = path
        self.headers = headers
        self.body = body
        self.params = {}
        self.query = {}
```

### HTTPResponse Type

```python
# turbox/http/response.codon (Milestone 2: COMPLETE)

class HTTPResponse:
    status_code: int
    headers: Dict[str, str]
    body: str

    def __init__(self, status: int = 200, body: str = "", headers: Optional[Dict[str, str]] = None):
        self.status_code = status
        self.body = body
        self.headers = headers if headers else {}

    def json(self, data: Dict[str, Any]) -> HTTPResponse:
        self.headers["Content-Type"] = "application/json"
        self.body = json.dumps(data)
        return self
```

### Plugin Type Resolution (Week 6 Day 2: COMPLETE)

The plugin already searches for these types:

```cpp
// plugins/conduit/conduit.cpp

types::Type* findHTTPRequestType(Module *M) {
    for (auto *type : *M) {
        if (auto *recordType = cast<types::RecordType>(type)) {
            if (typeName.find("HTTPRequest") != std::string::npos) {
                return recordType;  // Found!
            }
        }
    }
    return M->getStringType();  // Fallback to str
}
```

**Action Required**: Ensure `HTTPRequest` and `HTTPResponse` are imported in the module before plugin runs.

---

## Step 5: Path Parameter Extraction

### Plugin Detection (Week 6 Day 3: COMPLETE)

The plugin already detects parameters:

```cpp
// plugins/conduit/conduit.cpp

struct RouteInfo {
    std::vector<std::string> param_names;     // ["id", "post_id"]
    std::vector<int> param_positions;         // [1, 3]

    void parsePathParameters() {
        // Parses "/users/:id/posts/:post_id"
        // Extracts ["id", "post_id"] at positions [1, 3]
    }
};
```

### Framework Extraction (TODO: Milestone 3)

Framework extracts parameter values at runtime:

```python
# turbox/http/request.codon

class HTTPRequest:
    def extract_params(self, route_pattern: str):
        # Example:
        # route_pattern = "/users/:id/posts/:post_id"
        # self.path = "/users/123/posts/456"

        pattern_segments = route_pattern.split('/')
        path_segments = self.path.split('/')

        for i, segment in enumerate(pattern_segments):
            if segment.startswith(':'):
                param_name = segment[1:]  # Remove ':'
                param_value = path_segments[i]
                self.params[param_name] = param_value

        # Result: {"id": "123", "post_id": "456"}
```

### Plugin Dispatch (TODO: Future Enhancement)

Currently, plugin generates:

```python
if path == "/users/:id":
    return get_user(request)
```

**Future**: Generate parameter extraction:

```python
if path_matches("/users/:id", path):
    request.extract_params("/users/:id")
    return get_user(request)
```

---

## Step 6: Error Handling

### Plugin Side

Plugin generates 404 fallback:

```cpp
// plugins/conduit/conduit.cpp (existing)

// else:
//     return HTTPResponse(status=404, body="Not Found")

auto *error404 = M->getInt(404);
auto *errorBody = M->getString("Not Found");
auto *errorResponse = util::call(httpResponseCtor, {error404, errorBody});
elseBlock->push_back(M->Nr<ReturnInstr>(errorResponse));
```

### Framework Side (TODO: Milestone 3)

Framework adds error middleware:

```python
# turbox/server/__init__.codon

class Conduit:
    def handle_request(self, raw_request: bytes) -> bytes:
        try:
            # Parse request
            request = HTTPRequest.from_bytes(raw_request)

            # Dispatch (plugin-generated)
            response = self.dispatch(request.method, request.path, request)

            # Apply middleware
            response = self.apply_middleware(response)

        except Exception as e:
            # Error handling
            response = HTTPResponse(status=500, body=str(e))

        return response.to_bytes()
```

---

## Step 7: Integration Testing

### Test Plan

1. **Basic Routes** (4 routes)

   - Test: GET /, GET /about, POST /submit
   - Expected: Plugin detects all routes, 100% handler linking

2. **Path Parameters** (3 routes)

   - Test: GET /users/:id, POST /users/:id/posts/:post_id
   - Expected: Plugin detects parameters, framework extracts values

3. **Method Bucketing** (10 routes)

   - Test: Mixed GET/POST/PUT/DELETE
   - Expected: 1.4x speedup vs baseline

4. **Large Application** (100 routes)
   - Test: Real-world route count
   - Expected: 2x speedup vs baseline

### Validation Checklist

- [ ] Plugin detects all routes
- [ ] Plugin links all handlers (100% success)
- [ ] Dispatch function compiles
- [ ] Framework imports dispatch function
- [ ] HTTPRequest/HTTPResponse types found
- [ ] Path parameters extracted correctly
- [ ] Error handling works (404, 500)
- [ ] Performance improvement measured (>1.4x)

---

## Step 8: Migration Roadmap

### Phase 1: Minimal Integration (1 week)

**Goal**: Get plugin dispatch working in framework

**Tasks**:

1. Add `add_route_metadata()` to framework decorators
2. Import `conduit_dispatch_bucketed()` in Conduit class
3. Replace runtime dispatch with plugin dispatch
4. Test basic routes (no parameters)

**Success Criteria**: 4-route app compiles and runs

### Phase 2: Type System (3 days)

**Goal**: Use HTTPRequest/HTTPResponse in dispatch

**Tasks**:

1. Ensure HTTPRequest/HTTPResponse imported before plugin runs
2. Verify plugin finds types (not falling back to str)
3. Update handler signatures to use types

**Success Criteria**: Type-safe dispatch confirmed

### Phase 3: Path Parameters (1 week)

**Goal**: Extract path parameter values at runtime

**Tasks**:

1. Implement `HTTPRequest.extract_params()`
2. Update plugin dispatch to call extraction (future)
3. Test multi-parameter routes

**Success Criteria**: /users/:id works correctly

### Phase 4: Performance Validation (3 days)

**Goal**: Confirm 2x speedup in real application

**Tasks**:

1. Build 10-route benchmark app
2. Measure plugin vs baseline performance
3. Build 100-route stress test

**Success Criteria**: >1.4x speedup measured

### Phase 5: Production Hardening (1 week)

**Goal**: Error handling, middleware, edge cases

**Tasks**:

1. Add error middleware
2. Test edge cases (empty routes, conflicts)
3. Add logging/debugging hooks

**Success Criteria**: Production-ready framework

---

## Common Issues & Solutions

### Issue 1: "conduit_dispatch_bucketed not found"

**Cause**: Plugin didn't export function or framework didn't import

**Solution**:

```python
# Ensure framework imports:
from C import conduit_dispatch_bucketed(str, str, HTTPRequest) -> HTTPResponse

# Check plugin exports (add debug):
std::cout << "Exported: conduit_dispatch_bucketed\n";
```

### Issue 2: "HTTPRequest type not found, falling back to str"

**Cause**: HTTPRequest not imported before plugin runs

**Solution**:

```python
# Import HTTPRequest BEFORE defining routes:
from turbox.http.request import HTTPRequest
from turbox.http.response import HTTPResponse

app = Conduit()

@app.get("/")  # Now plugin can find types
def home(request: HTTPRequest) -> HTTPResponse:
    ...
```

### Issue 3: "Handler not linked"

**Cause**: Handler name mismatch or function not exported

**Solution**:

```python
# Ensure handler name matches:
@app.get("/users")
def list_users(request):  # Plugin searches for "list_users"
    ...

# Not: list_users_handler, get_users, etc.
```

### Issue 4: Path parameters not extracted

**Cause**: Framework not calling `extract_params()`

**Solution**:

```python
# Add to dispatch:
def dispatch(self, method: str, path: str, request: HTTPRequest) -> HTTPResponse:
    # Future: Plugin generates this
    request.extract_params(route_pattern)
    return conduit_dispatch_bucketed(method, path, request)
```

---

## Performance Expectations

### Before Plugin

```
10-route app:
- Average: 5.5 comparisons per request
- Performance: ~200K requests/sec

100-route app:
- Average: 50 comparisons per request
- Performance: ~50K requests/sec
```

### After Plugin

```
10-route app:
- Average: 4.0 comparisons per request
- Performance: ~280K requests/sec (1.4x faster)

100-route app:
- Average: 27.5 comparisons per request
- Performance: ~100K requests/sec (2.0x faster)
```

### Production Targets

- Small apps (4 routes): ~1.0x (no benefit expected)
- Medium apps (10 routes): **>1.4x speedup**
- Large apps (100+ routes): **>1.8x speedup**
- Handler linking: **100% success rate**

---

## Next Steps

1. **Start Phase 1**: Minimal integration (this week)
2. **Test basic routes**: Confirm plugin dispatch works
3. **Add type system**: HTTPRequest/HTTPResponse integration
4. **Implement parameters**: Path parameter extraction
5. **Validate performance**: Measure 2x speedup
6. **Production harden**: Error handling, edge cases

---

## Summary

**Plugin Status**: ✅ **COMPLETE**  
**Framework Status**: 🚧 **Milestone 2 → 3**

**Integration Effort**: ~3 weeks (5 phases)

**Key Success Metrics**:

- ✅ Plugin detects routes (100%)
- ✅ Plugin links handlers (100%)
- ✅ Plugin generates dispatch (working)
- ⏳ Framework imports dispatch (Phase 1)
- ⏳ Type system integration (Phase 2)
- ⏳ Path parameters (Phase 3)
- ⏳ Performance validation (Phase 4)
- ⏳ Production hardening (Phase 5)

**Next Action**: Start Phase 1 (minimal integration)

---

_Let's integrate the plugin and unlock 2x performance!_ 🚀
