# HTTP Router Module

Pattern-matching URL router for Conduit HTTP servers.

## Features

- ✅ Exact path matching: `/api/users`
- ✅ Path parameters: `/users/:id` → `params["id"]`
- ✅ Multiple parameters: `/users/:id/posts/:post_id`
- ✅ Wildcard routes: `/static/*`
- ✅ HTTP method filtering: GET, POST, PUT, DELETE
- ✅ Zero dependencies
- ✅ All tests passing

## Usage

### Basic Routing

```codon
from conduit.http.router import Router

router = Router()

# Add routes
router.add_route("/", "GET")
router.add_route("/api/users/:id", "GET")
router.add_route("/api/users/:id/posts/:post_id", "GET")
router.add_route("/static/*", "GET")

# Match incoming request
matched, route_idx, params = router.match("/api/users/123", "GET")

if matched:
    print(f"Matched route {route_idx}")
    print(f"User ID: {params['id']}")  # "123"
```

### Complete Server Example

```codon
from conduit.net.socket import Socket
from conduit.http.request import parse_http_request
from conduit.http.router import Router

router = Router()
router.add_route("/", "GET")
router.add_route("/api/users/:id", "GET")

sock = Socket()
sock.bind("0.0.0.0", 8080)
sock.listen(5)

while True:
    client = sock.accept()
    data = client.recv(4096)
    request = parse_http_request(data)
    
    matched, idx, params = router.match(request.path, request.method)
    
    if matched:
        if idx == 0:
            response = '{"message": "Welcome!"}'
        elif idx == 1:
            uid = params["id"]
            response = f'{{"user_id": "{uid}"}}'
    else:
        response = '{"error": "Not found"}'
    
    client.send(f"HTTP/1.1 200 OK\r\n\r\n{response}")
    client.close()
```

## Known Limitations

### Codon Module Import Issues

⚠️ **Current Status**: Due to limitations in Codon 0.19.3's module system, importing `Router` through the `conduit.http` package may fail with compilation errors.

**Workaround**: Copy `router.codon` directly into your project and use it standalone:

```bash
# Copy router to your project
cp conduit/http/router.codon my_project/

# Use it
from router import Router  # Works!
```

This is a known issue with Codon's module re-export system. The Router code itself is production-ready and fully tested.

### Alternative: Inline Integration

For complete control, inline the Router classes directly in your server file:

```codon
# Copy the Route and Router class definitions from router.codon
# into your server file - no imports needed!

class Route:
    # ... router code here ...

class Router:
    # ... router code here ...

# Your server code
router = Router()
router.add_route("/api/users/:id", "GET")
# ... rest of server ...
```

## API Reference

### `Route` Class

Represents a single URL route pattern.

```codon
class Route:
    pattern: str          # URL pattern like "/users/:id"
    method: str           # HTTP method (GET, POST, etc.)
    param_names: List[str]  # Extracted parameter names
    is_wildcard: bool     # True if pattern uses /*
```

**Methods:**
- `matches(path: str, method: str) -> bool` - Check if route matches request
- `extract_params(path: str) -> Dict[str, str]` - Extract parameter values

### `Router` Class

Manages collection of routes and matches incoming requests.

```codon
class Router:
    routes: List[Route]
```

**Methods:**

- `add_route(pattern: str, method: str = "GET")` - Register a route
- `match(path: str, method: str = "GET")` - Find matching route
  - Returns: `(matched: bool, route_index: int, params: Dict[str, str])`
- `get_route(index: int) -> Route` - Get route by index

## Pattern Syntax

| Pattern | Matches | Example Match | Params |
|---------|---------|---------------|--------|
| `/` | Exact root | `/` | `{}` |
| `/about` | Exact path | `/about` | `{}` |
| `/users/:id` | Single param | `/users/123` | `{"id": "123"}` |
| `/users/:id/posts/:post_id` | Multiple params | `/users/5/posts/42` | `{"id": "5", "post_id": "42"}` |
| `/static/*` | Wildcard | `/static/css/style.css` | `{}` |

## Testing

Run the router tests:

```bash
codon run tests/test_router.codon
```

Expected output:
```
=== Router Tests ===

Test 1: Exact match
  / (GET): matched=True, route_idx=0

Test 2: Nested exact match
  /api/users (GET): matched=True, route_idx=1

Test 3: Single parameter
  /api/users/123 (GET): matched=True, route_idx=2
  Params: {'id': '123'}

Test 4: Multiple parameters
  /api/users/123/posts/456 (GET): matched=True, route_idx=3
  Params: {'id': '123', 'post_id': '456'}

Test 5: Wildcard
  /static/css/style.css (GET): matched=True, route_idx=4

Test 6: Method matching
  /api/users (POST): matched=True, route_idx=5
  /api/users (DELETE): matched=False, route_idx=-1

Test 7: No match
  /notfound (GET): matched=False, route_idx=-1

✅ Router tests complete!
```

## Performance

- O(n) route matching where n = number of routes
- No regex compilation overhead
- Zero-cost parameter extraction
- Native performance via Codon compilation

## Future Improvements

When Codon's module system matures:
- Proper package-level exports
- Integration with HTTP server classes
- Decorator-based routing syntax
- Route grouping/prefixes
- Middleware support

## See Also

- [Building HTTP Server with Codon](../../docs/building-http-server-with-codon.md)
- [Request Parser](request.codon)
- [Response Builder](response.codon)
- [Socket Wrapper](../net/socket.codon)
