# Conduit Framework Guide

## Overview

Conduit is a high-performance web framework built on Codon that provides a Flask/FastAPI-like decorator-based API while delivering native compiled performance.

## Quick Start

### Installation

```bash
# Install Codon
/bin/bash -c "$(curl -fsSL https://exaloop.io/install.sh)"

# Clone Conduit
git clone https://github.com/cruso003/conduit.git
cd conduit
```

### Hello World

```python
from conduit import Conduit

app = Conduit()

@app.get("/")
def index(request):
    return {"message": "Hello, World!"}

# Then manually start the server (see complete example below)
```

**Complete Working Example:**

```python
from conduit import Conduit
from conduit.net.socket import Socket
from conduit.http.request import parse_http_request

app = Conduit()

@app.get("/")
def index(request):
    return {"message": "Hello, World!"}

@app.get("/users/:id")
def get_user(request):
    user_id = request.params["id"]
    return {"user_id": user_id, "name": "User " + user_id}

# Manual server loop (required in current version)
def start_server():
    sock = Socket()
    sock.bind("0.0.0.0", 8000)
    sock.listen(128)

    print(f"Server running at http://0.0.0.0:8000")

    while True:
        client = sock.accept()
        data = client.recv(4096)

        if len(data) > 0:
            request = parse_http_request(data)
            matched, route_idx, params = app.match_route(request)

            if matched:
                # Dispatch to your handlers based on route_idx
                if route_idx == 0:
                    response = app.to_response(index(request))
                elif route_idx == 1:
                    response = app.to_response(get_user(request))
                else:
                    response = app.not_found_response()
            else:
                response = app.not_found_response()

            client.send(response.to_bytes())

        client.close()

if __name__ == "__main__":
    start_server()
```

**Run it:**

```bash
CODON_PATH=. codon run your_app.codon &
curl http://localhost:8000/
curl http://localhost:8000/users/123
```

---

## Core Concepts

### 1. The Conduit Application

```python
from conduit import Conduit

app = Conduit(host="0.0.0.0", port=8000)
```

The `Conduit` class is the main application object that manages routes, handles requests, and provides the decorator API.

### 2. Route Decorators

Conduit provides HTTP method decorators:

```python
@app.get("/path")       # GET requests
@app.post("/path")      # POST requests
@app.put("/path")       # PUT requests
@app.delete("/path")    # DELETE requests
@app.patch("/path")     # PATCH requests
```

### 3. Path Parameters

Extract dynamic values from URLs:

```python
@app.get("/users/:id")
def get_user(request):
    user_id = request.params["id"]  # Access path parameter
    return {"user_id": user_id}

@app.get("/posts/:year/:month")
def get_posts(request):
    year = request.params["year"]
    month = request.params["month"]
    return {"year": year, "month": month}
```

### 4. Request Object

The `HTTPRequest` object contains:

```python
request.method      # HTTP method (GET, POST, etc.)
request.path        # Request path
request.headers     # Dict[str, str] of headers
request.body        # Request body as string
request.params      # Dict[str, str] of path parameters
```

**Get headers:**

```python
@app.get("/")
def index(request):
    user_agent = request.get_header("User-Agent", "unknown")
    return {"user_agent": user_agent}
```

### 5. Response Formats

Conduit automatically serializes responses:

**Dict → JSON (most common):**

```python
@app.get("/data")
def get_data(request):
    return {"status": "success", "value": "123"}
# Returns: {"status": "success", "value": "123"}
# Content-Type: application/json
```

**String → Plain Text:**

```python
@app.get("/text")
def get_text(request):
    return "Hello, World!"
# Returns: Hello, World!
# Content-Type: text/plain
```

**Important Note:** Due to Codon's strict typing, all dict values must be the same type. Use strings for mixed-type data:

```python
# ✅ Works - all strings
return {"name": "Alice", "age": "25", "active": "true"}

# ❌ Won't compile - mixed types
return {"name": "Alice", "age": 25, "active": True}
```

---

## Route Matching

### Exact Matches

```python
@app.get("/users")
def list_users(request):
    return {"users": "list"}
```

### Path Parameters

```python
@app.get("/users/:id")
def get_user(request):
    return {"id": request.params["id"]}

@app.get("/files/:path/:name")
def get_file(request):
    path = request.params["path"]
    name = request.params["name"]
    return {"path": path, "name": name}
```

### Method-Specific Routes

Same path, different methods:

```python
@app.get("/users")
def list_users(request):
    return {"action": "list"}

@app.post("/users")
def create_user(request):
    return {"action": "create"}
```

---

## Error Handling

### 404 Not Found

Conduit automatically returns 404 for unmatched routes:

```python
# No route registered for this path
curl http://localhost:8000/notfound
# Returns: {"error": "Route not found"}
```

### Custom Error Responses

```python
@app.get("/error")
def error_endpoint(request):
    return app.error_response("Something went wrong")
# Returns: {"error": "Something went wrong"}
# Status: 500
```

---

## Advanced Features

### Route Registration

Routes are registered in order:

```python
@app.get("/")          # Route index 0
def home(request):
    return {"page": "home"}

@app.get("/users")     # Route index 1
def users(request):
    return {"page": "users"}

@app.get("/users/:id") # Route index 2
def user(request):
    return {"page": "user"}
```

### Route Metadata

Access registered routes:

```python
for info in app.route_info:
    print(f"{info.method} {info.pattern} - {info.name}")

# Output:
# GET / - home
# GET /users - users
# GET /users/:id - user
```

### Custom Response Objects

Return `HTTPResponse` directly for full control:

```python
from conduit.http.response import HTTPResponse

@app.get("/custom")
def custom(request):
    response = HTTPResponse(200, '{"custom": "response"}')
    response.set_content_type("application/json")
    response.set_header("X-Custom-Header", "value")
    return response
```

---

## Working with Codon's Type System

### Understanding Limitations

Codon is statically typed and compiles to native code, which means:

1. **No dynamic function storage:** Can't store arbitrary `Callable` types
2. **Strict type checking:** Dict values must be homogeneous
3. **Manual dispatch required:** Route handlers dispatched via if/elif chains

### Best Practices

**1. Use string values in dicts:**

```python
# ✅ Good
return {"count": "42", "active": "true"}

# ❌ Causes type errors
return {"count": 42, "active": True}
```

**2. Manual route dispatch:**

```python
# Required pattern for now
matched, route_idx, params = app.match_route(request)

if route_idx == 0:
    result = handler_0(request)
elif route_idx == 1:
    result = handler_1(request)
# ... etc
```

**3. Keep handlers simple:**

```python
@app.get("/simple")
def simple_handler(request):
    # Simple dict return
    return {"status": "ok"}
```

---

## Example Applications

### REST API

```python
from conduit import Conduit

app = Conduit()

@app.get("/api/status")
def status(request):
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/api/users/:id")
def get_user(request):
    user_id = request.params["id"]
    return {
        "id": user_id,
        "name": "User " + user_id,
        "email": "user" + user_id + "@example.com"
    }

@app.post("/api/users")
def create_user(request):
    return {"created": "true", "message": "User created"}
```

### Multi-Route Application

```python
@app.get("/")
def home(request):
    return {"page": "home"}

@app.get("/about")
def about(request):
    return {"page": "about", "version": "1.0"}

@app.get("/posts/:year/:month")
def posts(request):
    return {
        "year": request.params["year"],
        "month": request.params["month"]
    }
```

---

## Performance Tips

### 1. Compile in Release Mode

```bash
codon build -release your_app.codon
./your_app
```

### 2. Use Native Types

Codon's native types are faster than Python compatibility mode:

```python
# Fast
user_id: str = request.params["id"]

# Also fast (type inferred)
user_id = request.params["id"]
```

### 3. Minimize String Operations

```python
# Efficient
return {"id": request.params["id"]}

# Less efficient (multiple concatenations)
return {"message": "User " + user_id + " created at " + timestamp}
```

---

## Troubleshooting

### "Type cannot be inferred"

**Problem:** Codon can't determine the type of a variable.

**Solution:** Add explicit type hints or simplify the code.

```python
# ❌ Type inference fails
handlers = []  # What type?

# ✅ Explicit type
handlers: List[str] = []
```

### "Does not match expected type"

**Problem:** Mixing types in a collection.

**Solution:** Use consistent types, typically all strings for dict values.

```python
# ❌ Mixed types
return {"name": "Alice", "age": 25}

# ✅ Consistent types
return {"name": "Alice", "age": "25"}
```

### CODON_PATH errors

**Problem:** Module not found when running examples.

**Solution:** Set `CODON_PATH` to project root:

```bash
cd /path/to/conduit
CODON_PATH=. codon run examples/your_app.codon
```

---

## API Reference

### Conduit Class

```python
class Conduit:
    def __init__(self, host: str = "0.0.0.0", port: int = 8000)

    # Decorators
    def get(self, pattern: str)
    def post(self, pattern: str)
    def put(self, pattern: str)
    def delete(self, pattern: str)
    def patch(self, pattern: str)

    # Routing
    def match_route(self, request: HTTPRequest) -> (bool, int, Dict[str, str])

    # Response helpers
    def to_response(self, result) -> HTTPResponse
    def not_found_response(self) -> HTTPResponse
    def error_response(self, error_msg: str) -> HTTPResponse
```

### HTTPRequest

```python
class HTTPRequest:
    method: str                    # HTTP method
    path: str                      # Request path
    headers: Dict[str, str]        # Headers
    body: str                      # Request body
    params: Dict[str, str]         # Path parameters

    def get_header(self, name: str, default: str = "") -> str
```

### HTTPResponse

```python
class HTTPResponse:
    status_code: int
    status_text: str
    headers: Dict[str, str]
    body: str

    def set_header(self, name: str, value: str)
    def set_content_type(self, content_type: str)
    def to_bytes(self) -> str
```

---

## What's Next

The framework is actively being developed. Upcoming features:

- **Automatic handler dispatch:** Remove manual route switching
- **Query parameters:** `request.query["param"]`
- **JSON body parsing:** `request.json`
- **Middleware system:** `@app.middleware`
- **MCP integration:** `@app.tool()` decorator
- **Static file serving:** `app.static("/static", "./public")`

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

---

## License

MIT License - see [LICENSE](../LICENSE) for details.
