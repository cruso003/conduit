# Auto-Documentation Integration Plan

**Status:** Core implementation ✅ exists, needs framework integration

---

## What We Already Have

### 🎨 Beautiful Conduit-Branded Swagger UI

**File:** `conduit/http/docs.codon` (426 lines)

**Features:**

- ✅ `APIDocGenerator` class - generates OpenAPI 3.0 specs
- ✅ `RouteDoc` class - documents individual routes
- ✅ Branded Swagger UI HTML with:
  - Gradient header: `linear-gradient(135deg, #00D9FF 0%, #0066FF 100%)`
  - Brand colors: Deep Blue (#0066FF), Electric Cyan (#00D9FF), Navy (#001F3F)
  - Conduit logo placement
  - "Native Speed" badge
  - Custom styled operation blocks

**Working Examples:**

- `examples/documented_api_demo.codon` - Manual OpenAPI spec
- `examples/live_docs_server.codon` - Live demo with branded UI (511 lines)

**Created:** Commit `4527f47` - "feat(docs): Add auto-documentation with Conduit branding"

---

## What Needs Integration

### 🔌 Wire into Conduit Framework

**Current State:**

```python
# Standalone - works but not integrated
from conduit.http.docs import APIDocGenerator, RouteDoc

docs = APIDocGenerator("My API", "1.0.0")

route = RouteDoc("/users/:id", "GET")
route.set_summary("Get user")
route.add_param("id", "integer")
docs.add_route(route)

openapi_json = docs.generate_openapi_json()
swagger_html = docs.generate_swagger_html()
```

**Goal State:**

```python
# Integrated with framework
from conduit import Conduit

app = Conduit()
app.enable_docs(title="My API", version="1.0.0")

@app.get("/users/:id")
@app.doc(
    summary="Get user by ID",
    params={"id": "integer"},
    response={"user_id": "integer", "name": "string"}
)
def get_user(request):
    return {"user_id": request.params["id"]}

app.run()
# Auto-serves /docs and /openapi.json
```

---

## Integration Tasks

### 1. Extend Conduit Class

**File:** `conduit/framework/conduit.codon`

```python
from conduit.http.docs import APIDocGenerator, RouteDoc

class Conduit:
    # ... existing fields ...

    # NEW fields:
    doc_generator: APIDocGenerator
    docs_enabled: bool

    def enable_docs(self, title: str = "API", version: str = "1.0.0"):
        """Enable auto-documentation at /docs and /openapi.json"""
        self.docs_enabled = True
        self.doc_generator = APIDocGenerator(title, version)

        # Auto-register /docs endpoint
        self._register_docs_routes()

    def doc(self, summary: str = "", description: str = "",
            params: Dict[str, str] = None, response: Dict[str, str] = None):
        """Decorator to add documentation to a route"""
        # Return decorator that captures metadata
        # Store in route_info for later OpenAPI generation
        ...

    def _register_docs_routes(self):
        """Auto-register /docs and /openapi.json endpoints"""
        # Add RouteInfo for /docs (serves Swagger UI HTML)
        # Add RouteInfo for /openapi.json (serves OpenAPI spec)
        ...

    def _generate_openapi_spec(self) -> str:
        """Generate OpenAPI spec from registered routes"""
        # Iterate through route_info
        # Create RouteDoc for each route
        # Add to doc_generator
        # Return JSON string
        ...
```

### 2. Handler Dispatch for Doc Routes

**In server loop (current manual dispatch):**

```python
if matched:
    if route_idx == 0:
        response = handler_0(request)
    # ... existing handlers ...
    elif route_idx == N:  # /docs
        response = serve_swagger_ui()
    elif route_idx == N+1:  # /openapi.json
        response = serve_openapi_json()
```

**Helper functions:**

```python
def serve_swagger_ui() -> HTTPResponse:
    """Serve branded Swagger UI"""
    html = app.doc_generator.generate_swagger_html()
    response = HTTPResponse()
    return response.html(html)

def serve_openapi_json() -> HTTPResponse:
    """Serve OpenAPI 3.0 spec"""
    spec = app._generate_openapi_spec()
    response = HTTPResponse()
    response.body = spec
    response.set_content_type("application/json")
    return response
```

### 3. Extract Metadata from Routes

**When @app.get() is called:**

```python
def get(self, pattern: str):
    def decorator(func):
        # Existing: Add to route_info
        route = RouteInfo(pattern, "GET", func.__name__)
        self.route_info.append(route)

        # NEW: If docs enabled, prepare RouteDoc
        if self.docs_enabled:
            # Extract params from pattern (/users/:id -> {"id": "string"})
            # Store for later OpenAPI generation
            ...

        return func
    return decorator
```

**When @app.doc() is called:**

```python
def doc(self, summary="", description="", params=None, response=None):
    def decorator(func):
        # Store metadata in route_info
        # Find the last added route (the one this decorator is applied to)
        if len(self.route_info) > 0:
            last_route = self.route_info[-1]
            # Attach metadata to last_route
            # (Need to extend RouteInfo class to hold doc metadata)
            ...

        return func
    return decorator
```

### 4. Extend RouteInfo Class

```python
class RouteInfo:
    pattern: str
    method: str
    name: str

    # NEW documentation fields:
    doc_summary: str
    doc_description: str
    doc_params: Dict[str, str]
    doc_response: str
    doc_tags: List[str]
```

---

## Implementation Sequence

1. **Phase 1: Basic Integration (1-2 hours)**

   - Add `doc_generator` field to Conduit
   - Implement `enable_docs()` method
   - Auto-register /docs and /openapi.json routes

2. **Phase 2: Route Documentation (2-3 hours)**

   - Implement `@app.doc()` decorator
   - Extend RouteInfo with doc fields
   - Extract metadata from decorators

3. **Phase 3: OpenAPI Generation (2-3 hours)**

   - Implement `_generate_openapi_spec()`
   - Convert route_info to RouteDoc objects
   - Generate OpenAPI JSON from routes

4. **Phase 4: Handler Dispatch (1 hour)**

   - Add manual dispatch for /docs
   - Add manual dispatch for /openapi.json
   - Serve Swagger UI HTML and OpenAPI JSON

5. **Phase 5: Testing (1-2 hours)**
   - Create comprehensive test example
   - Verify all routes documented
   - Verify Swagger UI loads correctly
   - Verify brand consistency

**Total Time:** ~8-12 hours of focused work

---

## Testing Strategy

### Test Example

```python
from conduit import Conduit

app = Conduit()
app.enable_docs(title="Test API", version="1.0.0")

@app.get("/")
@app.doc(summary="API info", response={"message": "string"})
def index(request):
    return {"message": "Hello"}

@app.get("/users/:id")
@app.doc(
    summary="Get user",
    params={"id": "integer"},
    response={"user_id": "integer", "name": "string"}
)
def get_user(request):
    return {"user_id": request.params["id"], "name": "Test"}

@app.post("/users")
@app.doc(
    summary="Create user",
    response={"created": "boolean"}
)
def create_user(request):
    return {"created": "true"}

app.run()
```

**Manual Tests:**

1. Visit `http://localhost:8000/docs` - Should show Swagger UI with Conduit branding
2. Verify gradient header renders correctly
3. Verify all 3 routes appear in Swagger UI
4. Verify "Try it out" works for each route
5. Visit `http://localhost:8000/openapi.json` - Should return valid OpenAPI 3.0 spec
6. Verify brand colors match: #0066FF, #00D9FF, #001F3F

---

## Brand Consistency Checklist

- [ ] Gradient header: `linear-gradient(135deg, #00D9FF 0%, #0066FF 100%)`
- [ ] Deep Blue (#0066FF) for GET operations
- [ ] Electric Cyan (#00D9FF) for POST operations
- [ ] Navy (#001F3F) for DELETE operations
- [ ] Conduit logo displayed in header
- [ ] "Native Speed" badge visible
- [ ] Version badge shows correct version
- [ ] Custom button styles (Execute button with gradient)
- [ ] Font matches brand guidelines (SF Pro / Inter)

---

## Performance Notes

- **Zero runtime overhead** - OpenAPI spec generated once at startup
- **Native performance** - /docs endpoint serves static HTML (~100K+ req/sec)
- **No external dependencies** - Swagger UI loaded from CDN
- **Small binary impact** - ~10-15KB for docs.codon code

---

## Future Enhancements

- [ ] Auto-extract param types from function signatures
- [ ] Support for request body schemas
- [ ] Support for multiple response codes (200, 404, 500)
- [ ] Support for authentication documentation
- [ ] Support for example values
- [ ] Support for deprecated routes
- [ ] Export OpenAPI spec to file
- [ ] Support for custom Swagger UI themes

---

## Success Criteria

1. ✅ `app.enable_docs()` works with zero configuration
2. ✅ `/docs` serves beautiful Conduit-branded Swagger UI
3. ✅ `/openapi.json` returns valid OpenAPI 3.0 spec
4. ✅ All registered routes appear in documentation
5. ✅ "Try it out" works for all routes
6. ✅ Brand colors and logo consistent
7. ✅ No performance degradation
8. ✅ Works with all existing Milestone 1 & 2 features

---

**Next Step:** Implement after Milestone 3 (automatic dispatch) is complete.

**Priority:** Medium-High (improves developer experience significantly)

**Difficulty:** Medium (integration work, not new implementation)
