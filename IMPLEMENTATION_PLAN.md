# Conduit Framework Implementation Plan

**Goal:** Build the complete framework API as promised in README.md

**Timeline:** 3-4 weeks of focused development

---

## Phase 1: Core Framework (Week 1)

### 1.1 Conduit Class - The Main Framework API

**File:** `conduit/framework/conduit.codon`

**Features:**

- [ ] `Conduit()` class initialization
- [ ] Route registration system (internal Dict)
- [ ] HTTP method decorators: `@app.get()`, `@app.post()`, `@app.put()`, `@app.delete()`
- [ ] Middleware chain support
- [ ] `app.run(host, port)` method
- [ ] Integration with existing HTTP server

**API:**

```python
app = Conduit()

@app.get("/")
def index(request):
    return {"hello": "world"}

@app.post("/users")
def create_user(request):
    return {"user": request.json}

app.run(host="0.0.0.0", port=8000)
```

---

### 1.2 Request Enhancement

**File:** `conduit/http/request.codon`

**Enhancements:**

- [ ] `request.query` - Dict of query parameters
- [ ] `request.json` - Auto-parse JSON body
- [ ] `request.form` - Parse form data
- [ ] `request.params` - Path parameters (e.g., `/user/:id`)
- [ ] `request.cookies` - Cookie parsing
- [ ] `request.headers` - Improved header access

**Before:**

```python
# Manual parsing required
body = request.body
```

**After:**

```python
user_id = request.params["id"]
search = request.query["q"]
data = request.json
```

---

### 1.3 Response Enhancement

**File:** `conduit/http/response.codon`

**Enhancements:**

- [ ] Auto JSON serialization for Dict return values
- [ ] `response.json(data)` helper
- [ ] `response.html(content)` helper
- [ ] `response.redirect(url)` helper
- [ ] `response.file(path)` for static files
- [ ] Custom status codes and headers

**Before:**

```python
return HTTPResponse(200, "OK", "{\"hello\":\"world\"}")
```

**After:**

```python
return {"hello": "world"}  # Auto-serialized
# or
return response.json({"hello": "world"}, status=201)
```

---

### 1.4 Router System

**File:** `conduit/http/router.codon`

**Features:**

- [ ] Path pattern matching with parameters (`/user/:id`, `/post/:slug`)
- [ ] Route priority (exact match > pattern match)
- [ ] HTTP method routing
- [ ] Route grouping/prefixes
- [ ] Wildcard routes

**Example:**

```python
@app.get("/user/:id")
def get_user(request):
    user_id = request.params["id"]
    return {"user_id": user_id}

@app.get("/posts/:year/:month")
def get_posts(request):
    year = request.params["year"]
    month = request.params["month"]
    return {"year": year, "month": month}
```

---

## Phase 2: MCP Framework Integration (Week 2)

### 2.1 MCP Framework Integration

**File:** `conduit/framework/mcp_integration.codon`

**Features:**

- [ ] `app.enable_mcp(transport="sse")` method
- [ ] `@app.tool()` decorator for tool registration
- [ ] Auto-generate JSON-RPC endpoints
- [ ] Schema inference from function signatures
- [ ] Tool discovery endpoint (`/mcp/tools`)
- [ ] Tool execution endpoint (`/mcp/call`)

**API:**

```python
app = Conduit()
app.enable_mcp(transport="sse")

@app.tool(
    name="calculator",
    description="Perform math operations"
)
def calculate(expr: str) -> str:
    return str(eval(expr))

# Auto-creates:
# - POST /mcp/tools (tool discovery)
# - POST /mcp/call (tool execution)
# - GET /stream/:tool (SSE streaming)
```

---

### 2.2 MCP stdio Transport

**File:** `conduit/mcp/stdio_transport.codon`

**Features:**

- [ ] Read JSON-RPC from stdin
- [ ] Write responses to stdout
- [ ] Line-delimited JSON protocol
- [ ] Error handling for malformed input
- [ ] `app.enable_mcp(transport="stdio")` support

**Usage:**

```python
app.enable_mcp(transport="stdio")
app.run_stdio()  # Blocks reading from stdin
```

---

### 2.3 Tool Schema Auto-generation

**File:** `conduit/mcp/schema.codon`

**Features:**

- [ ] Infer parameter types from function signature
- [ ] Generate JSON Schema from Codon types
- [ ] Support for optional parameters
- [ ] Custom schema via decorator arguments

**Example:**

```python
@app.tool("search")
def search(query: str, limit: int = 10) -> str:
    # Schema auto-generated:
    # {
    #   "type": "object",
    #   "properties": {
    #     "query": {"type": "string"},
    #     "limit": {"type": "integer", "default": 10}
    #   },
    #   "required": ["query"]
    # }
    pass
```

---

## Phase 3: Middleware & Production Features (Week 3)

### 3.1 Middleware System

**File:** `conduit/framework/middleware.codon`

**Features:**

- [ ] Middleware chain execution
- [ ] `@app.middleware` decorator
- [ ] `next(request)` pattern
- [ ] Before/after request hooks
- [ ] Global and route-specific middleware

**API:**

```python
@app.middleware
def logger(request, next):
    print(f"[{request.method}] {request.path}")
    response = next(request)
    print(f"[{response.status}]")
    return response

@app.middleware
def auth(request, next):
    if "Authorization" not in request.headers:
        return {"error": "Unauthorized"}, 401
    return next(request)
```

---

### 3.2 Built-in Middleware

**File:** `conduit/middleware/`

**Middleware to implement:**

- [ ] CORS middleware
- [ ] Request logging
- [ ] Request timing/metrics
- [ ] Rate limiting (token bucket)
- [ ] Authentication (Bearer token)
- [ ] Request size limits
- [ ] Static file serving

**Usage:**

```python
from conduit.middleware import cors, rate_limit, auth

app.use(cors(allow_origins=["*"]))
app.use(rate_limit(requests_per_minute=60))
app.use(auth(verify_token=my_verify_fn))
```

---

### 3.3 Error Handling

**File:** `conduit/framework/errors.codon`

**Features:**

- [ ] Custom exception classes
- [ ] `@app.error_handler(404)` decorator
- [ ] Global error handling
- [ ] Development vs production error pages
- [ ] Error logging

**API:**

```python
class ValidationError(Exception):
    pass

@app.error_handler(ValidationError)
def handle_validation(error):
    return {"error": str(error)}, 400

@app.error_handler(404)
def not_found(error):
    return {"error": "Not found"}, 404
```

---

## Phase 4: Advanced Features (Week 4)

### 4.1 Request Validation

**File:** `conduit/validation/`

**Features:**

- [ ] Schema validation for request bodies
- [ ] Query parameter validation
- [ ] Type coercion (string -> int)
- [ ] Custom validators

**API:**

```python
from conduit.validation import validate

@app.post("/user")
@validate(schema={
    "name": str,
    "age": int,
    "email": str
})
def create_user(request):
    # request.json is validated
    return {"created": request.json}
```

---

### 4.2 Static File Serving

**File:** `conduit/static/files.codon`

**Features:**

- [ ] Serve files from directory
- [ ] MIME type detection
- [ ] Caching headers (ETag, Last-Modified)
- [ ] Range requests support
- [ ] Directory listing (optional)

**API:**

```python
app.static("/static", "./public")
# Serves files from ./public at /static/*
```

---

### 4.3 Template Rendering (Optional)

**File:** `conduit/templates/`

**Features:**

- [ ] Simple template engine (Jinja2-like)
- [ ] Variable substitution
- [ ] Loops and conditionals
- [ ] Template inheritance

**API:**

```python
@app.get("/")
def index():
    return app.render("index.html", {"title": "Welcome"})
```

---

## Phase 5: ML Inference Layer (Future)

### 5.1 Model Loading

**File:** `conduit/ml/loader.codon`

**Features:**

- [ ] Load NumPy models (.npz)
- [ ] Load ONNX models
- [ ] Model caching
- [ ] Lazy loading

---

### 5.2 Inference Endpoints

**File:** `conduit/ml/inference.codon`

**Features:**

- [ ] `@app.ml_endpoint()` decorator
- [ ] Batch inference support
- [ ] Input preprocessing
- [ ] Output postprocessing
- [ ] GPU support (if available)

**API:**

```python
from conduit.ml import load_model

model = load_model("classifier.npz")

@app.ml_endpoint("/predict", model)
def preprocess(input_data):
    return np.array(input_data["features"])
```

---

## Testing Strategy

### Unit Tests

- [ ] Test each component in isolation
- [ ] Mock HTTP requests/responses
- [ ] Test routing logic
- [ ] Test middleware chain
- [ ] Test MCP tool registration

### Integration Tests

- [ ] Full request/response cycle
- [ ] Multiple routes
- [ ] Middleware interactions
- [ ] MCP tool execution
- [ ] Error handling

### Performance Tests

- [ ] Benchmark requests/sec
- [ ] Memory usage under load
- [ ] Connection handling
- [ ] Response latency (p50, p95, p99)

---

## Documentation Updates

- [ ] Update README with real examples
- [ ] API reference documentation
- [ ] Migration guide from examples to framework
- [ ] Performance benchmarks with real data
- [ ] Deployment guide

---

## Milestones

### Milestone 1: Hello World (End of Week 1)

```python
from conduit import Conduit

app = Conduit()

@app.get("/")
def index(request):
    return {"message": "Hello, World!"}

app.run()
```

**Status:** ❌ Not working yet

---

### Milestone 2: MCP Integration (End of Week 2)

```python
from conduit import Conduit

app = Conduit()
app.enable_mcp()

@app.tool("calculator")
def calc(expr: str):
    return str(eval(expr))

app.run()
```

**Status:** ❌ Not working yet

---

### Milestone 3: Production Features (End of Week 3)

```python
from conduit import Conduit
from conduit.middleware import cors, auth

app = Conduit()
app.use(cors())
app.use(auth())

@app.get("/api/data")
def get_data(request):
    return {"data": [1, 2, 3]}

app.run()
```

**Status:** ❌ Not working yet

---

### Milestone 4: Full Framework (End of Week 4)

- All README examples work
- MCP stdio transport
- Middleware system
- Error handling
- Documentation complete
- Benchmarks published

**Status:** ❌ Not started

---

## Success Criteria

1. ✅ All README examples run without modification
2. ✅ MCP servers can be built in <20 lines of code
3. ✅ Framework handles 10K+ req/sec (verified benchmark)
4. ✅ Zero crashes under normal load
5. ✅ Complete API documentation
6. ✅ 5+ working example applications

---

## Notes

- Delete this file after implementation complete
- Focus on getting Milestone 1 working first
- Don't optimize prematurely - get it working, then make it fast
- Use existing Socket/HTTP/MCP code as foundation
- Keep backward compatibility with example servers
