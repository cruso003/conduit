# Conduit API Reference

**Version**: 1.0.0  
**Last Updated**: November 3, 2025

Complete API documentation for the Conduit web framework.

---

## Table of Contents

- [Conduit Class](#conduit-class)
- [HTTPRequest Class](#httprequest-class)
- [HTTPResponse Class](#httpresponse-class)
- [Middleware](#middleware)
- [Decorators](#decorators)

---

## Conduit Class

The main application class for creating web servers.

### Constructor

```python
Conduit(host: str = "0.0.0.0", port: int = 8000)
```

**Parameters**:

- `host` (str, optional): Host to bind to. Default: `"0.0.0.0"`
- `port` (int, optional): Port to listen on. Default: `8000`

**Example**:

```python
from conduit import Conduit

# Default host and port
app = Conduit()

# Custom port
app = Conduit(port=8080)

# Custom host and port
app = Conduit(host="127.0.0.1", port=3000)
```

---

### Route Decorators

#### `@app.get(pattern: str)`

Register a GET route handler.

**Parameters**:

- `pattern` (str): URL pattern (e.g., `"/"`, `"/users"`, `"/users/:id"`)

**Returns**: Decorator function

**Example**:

```python
@app.get("/")
def index(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({"message": "Hello"})

@app.get("/users")
def list_users(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({"users": "Alice, Bob"})
```

---

#### `@app.post(pattern: str)`

Register a POST route handler.

**Parameters**:

- `pattern` (str): URL pattern

**Returns**: Decorator function

**Example**:

```python
@app.post("/users")
def create_user(request: HTTPRequest) -> HTTPResponse:
    data = request.parse_json()
    return HTTPResponse(201).json({"created": str(data)})
```

---

#### `@app.put(pattern: str)`

Register a PUT route handler.

**Parameters**:

- `pattern` (str): URL pattern

**Returns**: Decorator function

**Example**:

```python
@app.put("/users")
def update_user(request: HTTPRequest) -> HTTPResponse:
    data = request.parse_json()
    return HTTPResponse().json({"updated": str(data)})
```

---

#### `@app.delete(pattern: str)`

Register a DELETE route handler.

**Parameters**:

- `pattern` (str): URL pattern

**Returns**: Decorator function

**Example**:

```python
@app.delete("/users")
def delete_user(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({"deleted": "true"})
```

---

### Middleware

#### `use(middleware)`

Register middleware to execute on all requests.

**Parameters**:

- `middleware`: Middleware instance (LoggerMiddleware, CORSMiddleware, etc.)

**Returns**: None

**Example**:

```python
from conduit.http.middleware import logger_middleware, cors_middleware

app.use(logger_middleware(prefix="[API]"))
app.use(cors_middleware(origin="https://example.com"))
```

**Note**: Middleware executes in the order registered (FIFO).

---

### Auto-Documentation

#### `enable_docs(title: str, version: str, description: str)`

Enable automatic API documentation.

**Parameters**:

- `title` (str, optional): API title. Default: `"API Documentation"`
- `version` (str, optional): API version. Default: `"1.0.0"`
- `description` (str, optional): API description. Default: `"API built with Conduit"`

**Returns**: None

**Side Effects**:

- Creates `/docs` endpoint (Swagger UI)
- Creates `/openapi.json` endpoint (OpenAPI 3.0 spec)

**Example**:

```python
app.enable_docs(
    title="My API",
    version="1.0.0",
    description="A simple REST API"
)
```

**Endpoints Created**:

- `GET /docs` - Interactive Swagger UI
- `GET /openapi.json` - OpenAPI 3.0 specification (JSON)

---

### Server

#### `run(host: str = "", port: int = 0)`

Start the HTTP server.

**Parameters**:

- `host` (str, optional): Override constructor host. Default: uses constructor value
- `port` (int, optional): Override constructor port. Default: uses constructor value

**Returns**: None (blocks until server stopped)

**Example**:

```python
# Use constructor values
app = Conduit(port=8080)
app.run()

# Override at runtime
app = Conduit()
app.run(host="127.0.0.1", port=3000)
```

**Console Output**:

```
======================================================================
Conduit Framework
======================================================================

Server running at http://0.0.0.0:8000

Registered routes:
  5 route(s) registered

Press Ctrl+C to stop
```

---

## HTTPRequest Class

Represents an HTTP request.

### Properties

#### `method: str`

HTTP method (GET, POST, PUT, DELETE, etc.)

**Example**:

```python
if request.method == "GET":
    # Handle GET request
```

---

#### `path: str`

Request path (e.g., `"/users"`, `"/api/v1/products"`)

**Example**:

```python
if request.path == "/health":
    return HTTPResponse().json({"status": "healthy"})
```

---

#### `query_string: str`

Raw query string (e.g., `"page=1&limit=10"`)

**Example**:

```python
# For URL: http://example.com/search?q=widget
# request.query_string == "q=widget"
```

---

#### `query: Dict[str, str]`

Parsed query parameters.

**Example**:

```python
@app.get("/search")
def search(request: HTTPRequest) -> HTTPResponse:
    # URL: /search?q=widget&limit=5
    query = request.query.get("q", "")      # "widget"
    limit = request.query.get("limit", "10") # "5"

    return HTTPResponse().json({
        "query": query,
        "limit": limit
    })
```

**Access Methods**:

```python
# Get with default
value = request.query.get("key", "default")

# Check existence
if "key" in request.query:
    value = request.query["key"]
```

---

#### `headers: Dict[str, str]`

Request headers (case-insensitive keys).

**Example**:

```python
content_type = request.headers.get("Content-Type", "")
auth = request.headers.get("Authorization", "")
```

---

#### `body: str`

Raw request body.

**Example**:

```python
@app.post("/data")
def receive_data(request: HTTPRequest) -> HTTPResponse:
    raw_body = request.body
    return HTTPResponse().json({"received": str(len(raw_body))})
```

---

#### `params: Dict[str, str]`

Path parameters (populated at runtime).

**Note**: Path parameter extraction (`:id` syntax) is detected but not yet runtime-matched in v1.0.

**Example** (planned for v1.1):

```python
@app.get("/users/:id")
def get_user(request: HTTPRequest) -> HTTPResponse:
    user_id = request.params.get("id", "")
    return HTTPResponse().json({"id": user_id})
```

---

### Methods

#### `get_header(name: str, default: str = "") -> str`

Get request header (case-insensitive).

**Parameters**:

- `name` (str): Header name
- `default` (str, optional): Default value if header not found. Default: `""`

**Returns**: Header value or default

**Example**:

```python
@app.get("/protected")
def protected(request: HTTPRequest) -> HTTPResponse:
    auth = request.get_header("Authorization", "")

    if not auth:
        return HTTPResponse(401).json({"error": "Unauthorized"})

    return HTTPResponse().json({"message": "Access granted"})
```

---

#### `parse_json() -> Dict[str, str]`

Parse JSON request body.

**Returns**: Dictionary with string keys and values

**Raises**: No exceptions - returns empty dict on parse failure

**Limitations**:

- Only supports `Dict[str, str]` (string values)
- No nested objects or arrays

**Example**:

```python
@app.post("/users")
def create_user(request: HTTPRequest) -> HTTPResponse:
    data = request.parse_json()

    name = data.get("name", "")
    email = data.get("email", "")

    return HTTPResponse(201).json({
        "created": f"{name} <{email}>"
    })
```

**Request Body**:

```json
{
  "name": "Alice",
  "email": "alice@example.com"
}
```

**Workaround for Complex Data**:

```python
# For nested data, use string encoding
data = request.parse_json()
user_json = data.get("user", "{}")
# Parse user_json manually or use str() conversion
```

---

## HTTPResponse Class

Represents an HTTP response.

### Constructor

```python
HTTPResponse(status_code: int = 200)
```

**Parameters**:

- `status_code` (int, optional): HTTP status code. Default: `200`

**Example**:

```python
# 200 OK
response = HTTPResponse()

# 201 Created
response = HTTPResponse(201)

# 404 Not Found
response = HTTPResponse(404)

# 500 Internal Server Error
response = HTTPResponse(500)
```

---

### Properties

#### `status_code: int`

HTTP status code.

**Example**:

```python
response = HTTPResponse()
response.status_code = 404
```

---

#### `headers: Dict[str, str]`

Response headers.

**Example**:

```python
response = HTTPResponse()
response.headers["Content-Type"] = "application/json"
response.headers["Cache-Control"] = "no-cache"
```

---

#### `body: str`

Response body.

**Example**:

```python
response = HTTPResponse()
response.body = '{"message": "Hello"}'
```

---

### Methods

#### `set_header(name: str, value: str)`

Set response header.

**Parameters**:

- `name` (str): Header name
- `value` (str): Header value

**Returns**: None

**Example**:

```python
response = HTTPResponse()
response.set_header("Content-Type", "application/json")
response.set_header("X-Custom-Header", "MyValue")
response.set_header("Cache-Control", "max-age=3600")
```

---

#### `get_header(name: str, default: str = "") -> str`

Get response header.

**Parameters**:

- `name` (str): Header name
- `default` (str, optional): Default value. Default: `""`

**Returns**: Header value or default

**Example**:

```python
response = HTTPResponse()
response.set_header("X-Request-ID", "12345")

request_id = response.get_header("X-Request-ID")  # "12345"
```

---

#### `json(data: Dict[str, str]) -> HTTPResponse`

Set JSON body and content-type header.

**Parameters**:

- `data` (Dict[str, str]): Dictionary with string keys and values

**Returns**: Self (for chaining)

**Side Effects**:

- Sets `Content-Type: application/json`
- Serializes data to JSON and sets body

**Example**:

```python
@app.get("/users")
def list_users(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({
        "users": "Alice, Bob, Charlie",
        "count": "3"
    })
```

**Chaining**:

```python
return HTTPResponse(201).json({
    "status": "created",
    "id": "123"
})
```

**Limitations**:

```python
# This works
data = {"name": "Alice", "age": "30"}  # String values ✅

# This doesn't work
data = {"name": "Alice", "age": 30}    # Int value ❌

# Workaround
data = {"name": "Alice", "age": str(30)}  # Convert to string ✅
```

---

## Middleware

Middleware allows you to add cross-cutting concerns to your application.

### Built-in Middleware

#### `logger_middleware(prefix: str = "[REQUEST]")`

Logs request method, path, and response status.

**Parameters**:

- `prefix` (str, optional): Log message prefix. Default: `"[REQUEST]"`

**Returns**: LoggerMiddleware instance

**Example**:

```python
from conduit.http.middleware import logger_middleware

app.use(logger_middleware(prefix="[API]"))
```

**Console Output**:

```
[API] GET /users
[API] -> 200
[API] POST /users
[API] -> 201
```

---

#### `cors_middleware(origin: str = "*")`

Adds CORS headers to responses.

**Parameters**:

- `origin` (str, optional): Allowed origin. Default: `"*"` (all origins)

**Returns**: CORSMiddleware instance

**Headers Added**:

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`

**Example**:

```python
from conduit.http.middleware import cors_middleware

# Allow all origins
app.use(cors_middleware())

# Allow specific origin
app.use(cors_middleware(origin="https://example.com"))
```

**Response Headers**:

```
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

#### `timing_middleware()`

Adds response time header.

**Returns**: TimingMiddleware instance

**Headers Added**:

- `X-Response-Time` (currently fixed at `0.00ms` - placeholder)

**Example**:

```python
from conduit.http.middleware import timing_middleware

app.use(timing_middleware())
```

**Response Headers**:

```
X-Response-Time: 0.00ms
```

---

### Custom Middleware

Create custom middleware by implementing the `apply(request, response)` method.

**Example**:

```python
class CustomMiddleware:
    def __init__(self):
        pass

    def apply(self, request, response):
        # Modify response
        response.set_header("X-Powered-By", "Conduit")
        response.set_header("X-Version", "1.0.0")

# Usage
app.use(CustomMiddleware())
```

**Important**: v1.0 middleware is post-processing only (executes after handler).

---

## Decorators

### Route Decorators

All route decorators follow the same pattern:

```python
@app.METHOD(pattern)
def handler(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse()
```

**Supported Methods**:

- `@app.get(pattern)` - GET requests
- `@app.post(pattern)` - POST requests
- `@app.put(pattern)` - PUT requests
- `@app.delete(pattern)` - DELETE requests

**Pattern Syntax**:

- Static: `"/users"`, `"/api/v1/products"`
- Parameter (v1.1+): `"/users/:id"`, `"/posts/:post_id"`

**Handler Signature**:

```python
def handler_name(request: HTTPRequest) -> HTTPResponse:
    # request: HTTPRequest instance
    # Returns: HTTPResponse instance
    pass
```

---

## Error Handling

### HTTP Status Codes

```python
# Success
HTTPResponse(200)  # OK
HTTPResponse(201)  # Created
HTTPResponse(204)  # No Content

# Client Errors
HTTPResponse(400)  # Bad Request
HTTPResponse(401)  # Unauthorized
HTTPResponse(403)  # Forbidden
HTTPResponse(404)  # Not Found

# Server Errors
HTTPResponse(500)  # Internal Server Error
HTTPResponse(503)  # Service Unavailable
```

### Error Response Pattern

```python
@app.get("/users")
def get_user(request: HTTPRequest) -> HTTPResponse:
    user_id = request.query.get("id", "")

    if not user_id:
        return HTTPResponse(400).json({
            "error": "Missing user ID"
        })

    # Simulate user not found
    if user_id == "999":
        return HTTPResponse(404).json({
            "error": "User not found"
        })

    return HTTPResponse().json({
        "id": user_id,
        "name": "Alice"
    })
```

---

## Complete Example

```python
from conduit import Conduit
from conduit.http.request import HTTPRequest
from conduit.http.response import HTTPResponse
from conduit.http.middleware import logger_middleware, cors_middleware, timing_middleware

# Create application
app = Conduit(port=8080)

# Add middleware
app.use(logger_middleware(prefix="[API]"))
app.use(cors_middleware(origin="https://example.com"))
app.use(timing_middleware())

# Enable documentation
app.enable_docs(
    title="My API",
    version="1.0.0",
    description="Complete API example"
)

# Routes
@app.get("/")
def index(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({
        "message": "Welcome to My API",
        "version": "1.0.0",
        "docs": "/docs"
    })

@app.get("/users")
def list_users(request: HTTPRequest) -> HTTPResponse:
    page = request.query.get("page", "1")
    limit = request.query.get("limit", "10")

    return HTTPResponse().json({
        "users": "Alice, Bob, Charlie",
        "page": page,
        "limit": limit
    })

@app.post("/users")
def create_user(request: HTTPRequest) -> HTTPResponse:
    data = request.parse_json()

    name = data.get("name", "")
    if not name:
        return HTTPResponse(400).json({
            "error": "Name required"
        })

    return HTTPResponse(201).json({
        "status": "created",
        "name": name
    })

@app.get("/health")
def health_check(request: HTTPRequest) -> HTTPResponse:
    return HTTPResponse().json({
        "status": "healthy",
        "timestamp": "2025-11-03"
    })

# Start server
if __name__ == "__main__":
    app.run()
```

**Build and run**:

```bash
CODON_PATH=/path/to/conduit codon build -plugin conduit app.codon -o app
./app
```

**Test**:

```bash
curl http://localhost:8080/
curl http://localhost:8080/users?page=2&limit=20
curl -X POST http://localhost:8080/users -d '{"name": "David"}'
curl http://localhost:8080/health
open http://localhost:8080/docs
```

---

## See Also

- [QUICKSTART.md](../QUICKSTART.md) - Getting started guide
- [docs/framework-guide.md](framework-guide.md) - Comprehensive framework guide
- [docs/middleware-implementation.md](middleware-implementation.md) - Middleware details
- [CHANGELOG.md](../CHANGELOG.md) - Release notes

---

**Need help?** Check the [examples/](../examples/) directory for more code samples!
