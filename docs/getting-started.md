# Getting Started with TurboX

This guide will walk you through installing TurboX and building your first server.

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+, Debian 11+, etc.) or macOS (10.15+)
- **CPU**: x86_64 architecture
- **RAM**: 2GB minimum, 4GB recommended
- **Disk**: 500MB for Codon + TurboX

### Required Software

- [Codon](https://github.com/exaloop/codon) 0.16 or higher
- Git (for cloning the repository)
- curl (for installation scripts)

## Installation

### Step 1: Install Codon

```bash
# Install Codon
/bin/bash -c "$(curl -fsSL https://exaloop.io/install.sh)"

# Verify installation
codon --version
# Should output: Codon 0.16.x or higher
```

### Step 2: Install TurboX

```bash
# Clone the repository
git clone https://github.com/sir-george2500/turboX.git
cd turbox

# Build TurboX (optional, for development)
./scripts/build.sh
```

### Step 3: Verify Installation

```bash
# Test with a simple example
codon run examples/hello_world.codon
```

## Your First TurboX Server

### Hello World

Create a file called `hello.codon`:

```python
from turbox import TurboX

app = TurboX()

@app.get("/")
def index(request):
    return {"message": "Hello, World!"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
```

**Run it:**

```bash
codon run hello.codon
```

**Test it:**

```bash
curl http://localhost:8000/
# Output: {"message": "Hello, World!"}
```

### Compiling for Production

For maximum performance, compile your server:

```bash
# Compile with optimizations
codon build -release hello.codon

# Run the compiled binary
./hello
```

**Benefits of compiling:**

- Faster startup time
- Lower memory usage
- No Codon runtime needed
- Can be deployed anywhere

## Basic Routing

```python
from turbox import TurboX

app = TurboX()

@app.get("/")
def index(request):
    return {"message": "Home page"}

@app.get("/about")
def about(request):
    return {"message": "About page"}

@app.post("/submit")
def submit(request):
    # Access request body
    data = request.body.decode('utf-8')
    return {"received": data}

app.run()
```

## Request and Response

### Accessing Request Data

```python
@app.get("/user")
def get_user(request):
    # Access headers
    auth = request.headers.get("Authorization", "")

    # Access method
    method = request.method  # "GET"

    # Access path
    path = request.path  # "/user"

    # Access body (for POST/PUT)
    body = request.body

    return {"auth": auth, "method": method}
```

### Custom Responses

```python
from turbox.http import HTTPResponse

@app.get("/custom")
def custom(request):
    response = HTTPResponse(status=201, body=b"Created\n")
    response.set_header("X-Custom-Header", "value")
    return response
```

## Configuration

### Server Options

```python
app.run(
    host="0.0.0.0",      # Bind address
    port=8000,            # Port number
    workers=16            # Number of worker threads
)
```

### Performance Tuning

```python
# For high-concurrency scenarios
app.run(
    host="0.0.0.0",
    port=8000,
    workers=32,           # More workers for CPU-bound tasks
    backlog=2048          # Larger connection queue
)
```

## Next Steps

- [Architecture Overview](architecture.md) - Understand how TurboX works
- [MCP Guide](mcp-guide.md) - Build MCP servers
- [ML Guide](ml-guide.md) - Serve ML models
- [API Reference](api-reference.md) - Complete API documentation
- [Examples](../examples/) - More example code

## Troubleshooting

### Codon not found

```bash
# Add Codon to PATH
export PATH="$HOME/.codon/bin:$PATH"

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export PATH="$HOME/.codon/bin:$PATH"' >> ~/.bashrc
```

### Permission denied on port 80/443

```bash
# Use a port > 1024 or run with sudo
app.run(port=8080)  # Or any port > 1024
```

### Build errors

```bash
# Ensure Codon is up to date
codon update

# Clear build cache
rm -rf .codon_cache
```

## Getting Help

- [GitHub Issues](https://github.com/sir-george2500/turboX/issues)
- [Discussions](https://github.com/sir-george2500/turboX/discussions)
- [Codon Documentation](https://docs.exaloop.io/codon)

Happy building! 🚀
