# Basic HTTP Server

Learn how to build a basic HTTP server with TurboX.

## Simple GET Endpoint

```python
from turbox import TurboX

app = TurboX()

@app.get("/")
def index(request):
    return {"message": "Hello, World!"}

app.run(port=8000)
```

## Multiple Routes

```python
from turbox import TurboX

app = TurboX()

@app.get("/")
def home(request):
    return {"page": "home"}

@app.get("/about")
def about(request):
    return {"page": "about"}

@app.get("/contact")
def contact(request):
    return {"page": "contact"}

app.run(port=8000)
```

## Handling POST Requests

```python
from turbox import TurboX
import json

app = TurboX()

@app.post("/api/users")
def create_user(request):
    # Parse JSON body
    data = json.loads(request.body.decode('utf-8'))

    name = data.get("name")
    email = data.get("email")

    # Simulate creating user
    user_id = 123

    return {
        "id": user_id,
        "name": name,
        "email": email,
        "created": True
    }

app.run(port=8000)
```

Test it:

```bash
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

## Custom Headers

```python
from turbox import TurboX
from turbox.http import HTTPResponse

app = TurboX()

@app.get("/api/data")
def get_data(request):
    response = HTTPResponse(200, b'{"data": "value"}')
    response.set_header("Content-Type", "application/json")
    response.set_header("X-Custom-Header", "CustomValue")
    response.set_header("Cache-Control", "no-cache")
    return response

app.run(port=8000)
```

## Error Handling

```python
from turbox import TurboX
from turbox.http import HTTPResponse

app = TurboX()

@app.get("/users/{id}")
def get_user(request):
    # Extract user ID from path (simplified)
    user_id = extract_id(request.path)

    # Check if user exists
    user = database.find_user(user_id)

    if not user:
        return HTTPResponse(404, b'{"error": "User not found"}')

    return {"user": user}

app.run(port=8000)
```

## Complete Example

```python
from turbox import TurboX
from turbox.http import HTTPResponse
import json

app = TurboX()

# In-memory storage (for demo)
users = {}
next_id = 1

@app.get("/")
def index(request):
    return {
        "service": "User API",
        "version": "1.0",
        "endpoints": ["/users", "/users/{id}"]
    }

@app.get("/users")
def list_users(request):
    return {"users": list(users.values())}

@app.get("/users/{id}")
def get_user(request):
    user_id = extract_id(request.path)
    user = users.get(user_id)

    if not user:
        return HTTPResponse(404, b'{"error": "Not found"}')

    return {"user": user}

@app.post("/users")
def create_user(request):
    global next_id

    data = json.loads(request.body.decode('utf-8'))

    user = {
        "id": next_id,
        "name": data.get("name"),
        "email": data.get("email")
    }

    users[next_id] = user
    next_id += 1

    response = HTTPResponse(201, json.dumps(user).encode('utf-8'))
    response.set_header("Content-Type", "application/json")
    return response

@app.delete("/users/{id}")
def delete_user(request):
    user_id = extract_id(request.path)

    if user_id not in users:
        return HTTPResponse(404, b'{"error": "Not found"}')

    del users[user_id]
    return HTTPResponse(204, b"")

def extract_id(path: str) -> int:
    # Simple ID extraction (will be improved with proper routing)
    parts = path.split("/")
    return int(parts[-1])

if __name__ == "__main__":
    print("Starting User API on http://0.0.0.0:8000")
    app.run(port=8000)
```

## Next Steps

- [MCP Server Example](mcp-server.md)
- [ML Inference Example](ml-inference.md)
- [API Reference](../api-reference.md)
