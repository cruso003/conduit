# Conduit Quick Start Guide

Get up and running with Conduit in 5 minutes!

---

## Prerequisites

- [Codon](https://github.com/exaloop/codon) 0.16 or higher installed
- Basic familiarity with Python/web APIs

---

## Installation

1. **Clone the repository**:

```bash
git clone https://github.com/cruso003/conduit.git
cd conduit
```

2. **Set up Codon path**:

```bash
export CODON_PATH=$(pwd)
```

3. **Verify installation**:

```bash
codon --version  # Should show 0.16 or higher
```

---

## Example 1: Hello World (30 seconds)

Create `hello.codon`:

```python
from conduit import Conduit
from conduit.http.request import HTTPRequest
from conduit.http.response import HTTPResponse

app = Conduit()

@app.get("/")
def hello(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({"message": "Hello, World!"})

app.run()
```

**Build and run**:

```bash
CODON_PATH=/path/to/conduit codon build -plugin conduit hello.codon -o hello
./hello
```

**Test it**:

```bash
curl http://localhost:8000/
# {"message": "Hello, World!"}
```

---

## Example 2: API with Multiple Routes (2 minutes)

Create `api.codon`:

```python
from conduit import Conduit
from conduit.http.request import HTTPRequest
from conduit.http.response import HTTPResponse

app = Conduit(port=8080)

@app.get("/")
def index(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({
        "message": "Welcome to my API",
        "version": "1.0"
    })

@app.get("/users")
def list_users(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({
        "users": "Alice, Bob, Charlie"
    })

@app.post("/users")
def create_user(request: HTTPRequest) -> HTTPResponse:
    data = request.parse_json()
    return HTTPResponse(201).json({
        "status": "created",
        "user": str(data)
    })

@app.get("/health")
def health(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({"status": "healthy"})

app.run()
```

**Build and run**:

```bash
CODON_PATH=/path/to/conduit codon build -plugin conduit api.codon -o api
./api
```

**Test routes**:

```bash
# GET requests
curl http://localhost:8080/
curl http://localhost:8080/users
curl http://localhost:8080/health

# POST request
curl -X POST http://localhost:8080/users \
  -H "Content-Type: application/json" \
  -d '{"name": "David"}'
```

---

## Example 3: API with Auto-Documentation (3 minutes)

Create `documented_api.codon`:

```python
from conduit import Conduit
from conduit.http.request import HTTPRequest
from conduit.http.response import HTTPResponse

app = Conduit()

# Enable auto-documentation
app.enable_docs(
    title="My API",
    version="1.0.0",
    description="A simple API with auto-generated documentation"
)

@app.get("/")
def index(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({
        "message": "Welcome!",
        "docs": "/docs"
    })

@app.get("/products")
def list_products(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({
        "products": "Widget, Gadget, Gizmo"
    })

@app.post("/products")
def create_product(request: HTTPRequest) -> HTTPResponse:
    data = request.parse_json()
    return HTTPResponse(201).json({
        "status": "created",
        "product": str(data)
    })

app.run()
```

**Build and run**:

```bash
CODON_PATH=/path/to/conduit codon build -plugin conduit documented_api.codon -o documented_api
./documented_api
```

**Explore documentation**:

```bash
# View OpenAPI specification
curl http://localhost:8000/openapi.json | jq

# Open interactive Swagger UI in browser
open http://localhost:8000/docs
```

The Swagger UI provides:

- 📋 List of all endpoints
- 🧪 Interactive testing ("Try it out" button)
- 📖 Request/response schemas
- 🎨 Branded Conduit styling

---

## Example 4: API with Middleware (4 minutes)

Create `middleware_api.codon`:

```python
from conduit import Conduit
from conduit.http.request import HTTPRequest
from conduit.http.response import HTTPResponse
from conduit.http.middleware import logger_middleware, cors_middleware, timing_middleware

app = Conduit()

# Add middleware
app.use(logger_middleware(prefix="[API]"))
app.use(cors_middleware(origin="https://example.com"))
app.use(timing_middleware())

@app.get("/")
def index(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({"message": "Hello with middleware!"})

@app.get("/data")
def get_data(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({
        "data": "Some data",
        "timestamp": "2025-11-03"
    })

app.run()
```

**Build and run**:

```bash
CODON_PATH=/path/to/conduit codon build -plugin conduit middleware_api.codon -o middleware_api
./middleware_api
```

**Test with headers**:

```bash
curl -i http://localhost:8000/
```

You'll see middleware-added headers:

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
X-Response-Time: 0.00ms
```

Server console shows logs:

```
[API] GET /
[API] -> 200
```

---

## Example 5: Query Parameters (5 minutes)

Create `query_api.codon`:

```python
from conduit import Conduit
from conduit.http.request import HTTPRequest
from conduit.http.response import HTTPResponse

app = Conduit()

@app.get("/search")
def search(request: HTTPRequest) -> HTTPResponse:
    # Access query parameters
    query = request.query.get("q", "")
    limit = request.query.get("limit", "10")

    return HTTPResponse().json({
        "query": query,
        "limit": limit,
        "results": "Search results here"
    })

@app.get("/users")
def list_users(request: HTTPRequest) -> HTTPResponse:
    # Pagination with query params
    page = request.query.get("page", "1")
    per_page = request.query.get("per_page", "20")

    return HTTPResponse().json({
        "page": page,
        "per_page": per_page,
        "users": "User list here"
    })

app.run()
```

**Test with query parameters**:

```bash
curl "http://localhost:8000/search?q=widget&limit=5"
# {"query": "widget", "limit": "5", "results": "Search results here"}

curl "http://localhost:8000/users?page=2&per_page=50"
# {"page": "2", "per_page": "50", "users": "User list here"}
```

---

## Key Features Overview

### 🚀 Compile-Time Routing Optimization

Conduit's plugin generates optimized dispatch code at compile time:

```python
@app.get("/users")     # Detected at compile time
@app.post("/products") # Perfect hash table generated
@app.get("/orders")    # O(1) route lookup
```

**Performance**: 2x faster routing for apps with 100+ routes

### 📚 Auto-Documentation

One method call enables full Swagger UI:

```python
app.enable_docs(title="My API", version="1.0.0")
# Automatic:
#   - /docs endpoint (Swagger UI)
#   - /openapi.json (OpenAPI 3.0 spec)
#   - Route discovery
```

### 🔧 Middleware System

Add cross-cutting concerns easily:

```python
app.use(logger_middleware())      # Request/response logging
app.use(cors_middleware("*"))     # CORS headers
app.use(timing_middleware())      # Response timing
```

### 📊 Native Performance

Compiled to machine code:

- 10-100x faster than CPython
- ~1MB binaries
- No runtime dependencies
- True parallelism (no GIL)

---

## Common Patterns

### Error Responses

```python
@app.get("/error")
def error_demo(request: HTTPRequest) -> HTTPResponse:
    # 404 Not Found
    return HTTPResponse(404).json({"error": "Not found"})

    # 500 Internal Server Error
    return HTTPResponse(500).json({"error": "Server error"})

    # 201 Created
    return HTTPResponse(201).json({"status": "created"})
```

### JSON Parsing

```python
@app.post("/data")
def create_data(request: HTTPRequest) -> HTTPResponse:
    # Parse JSON body
    data = request.parse_json()

    # Access fields
    name = data.get("name", "")
    email = data.get("email", "")

    return HTTPResponse().json({
        "received": f"Name: {name}, Email: {email}"
    })
```

### Headers

```python
@app.get("/custom")
def custom_headers(request: HTTPRequest) -> HTTPResponse:
    # Read request header
    auth = request.get_header("Authorization", "")

    # Set response headers
    response = HTTPResponse()
    response.set_header("X-Custom-Header", "MyValue")
    response.set_header("Cache-Control", "no-cache")
    response.body = '{"message": "Headers set"}'

    return response
```

---

## Build Tips

### Development Mode

Quick compilation for testing:

```bash
codon build -plugin conduit app.codon -o app
```

### Production Mode

Optimized build with smaller binary:

```bash
codon build -release -plugin conduit app.codon -o app
```

### Debug Output

See plugin optimization details:

```bash
codon build -plugin conduit -debug app.codon -o app 2>&1 | grep "Conduit"
```

---

## Next Steps

1. **Read the full documentation**: [docs/framework-guide.md](docs/framework-guide.md)
2. **Explore examples**: Check `examples/` directory
3. **API Reference**: [API_REFERENCE.md](API_REFERENCE.md)
4. **Middleware Guide**: [docs/middleware-implementation.md](docs/middleware-implementation.md)
5. **Plugin Details**: [docs/plugin/PLUGIN_COMPLETE.md](docs/plugin/PLUGIN_COMPLETE.md)

---

## Troubleshooting

### Build Fails

**Issue**: `Plugin not found`

```bash
# Solution: Set CODON_PATH
export CODON_PATH=/path/to/conduit
```

**Issue**: `Type errors in handlers`

```python
# Make sure to import types
from conduit.http.request import HTTPRequest
from conduit.http.response import HTTPResponse

# Use proper type annotations
def handler(request: HTTPRequest) -> HTTPResponse:
    ...
```

### Server Won't Start

**Issue**: `Port already in use`

```python
# Use a different port
app = Conduit(port=8080)  # or 8081, 8082, etc.
```

**Issue**: `Failed to bind`

```bash
# Check if another process is using the port
lsof -i :8000
kill <PID>
```

### Runtime Errors

**Issue**: JSON parsing fails

```python
# JSON only supports Dict[str, str]
# This works:
data = {"name": "Alice", "age": "30"}  # string values

# This doesn't:
data = {"name": "Alice", "age": 30}    # int value
```

---

## Getting Help

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/cruso003/conduit/issues)
- **Examples**: [examples/](examples/)

---

**You're ready to build high-performance APIs with Conduit! 🚀**
