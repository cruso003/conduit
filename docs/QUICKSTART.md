# Conduit Quick Start Guide

Get your first Conduit app running in 5 minute

---

## Installation

```bash
# Install Codon (if not already installed)
/bin/bash -c "$(curl -fsSL https://exaloop.io/install.sh)"

# Clone Conduit
git clone https://github.com/cruso003/conduit.git
cd conduit
```

## Your First App (60 seconds)

Create `hello.codon`:

```python
from conduit import Conduit

app = Conduit()

@app.get("/")
def home(req, res):
    res.text("Hello, Conduit!")

@app.get("/json")
def api(req, res):
    res.json({"message": "Hello from Conduit!", "fast": True})

app.run(port=8080)
```

Run it:

```bash
codon run hello.codon
```

Visit: `http://localhost:8080`

**🎉 Done! You have a blazing-fast web server running.**

---

## Hello World with ML (2 minutes)

Create `ml_hello.codon`:

```python
from conduit import Conduit
from conduit.ml import InferenceEngine

app = Conduit()

# Simple prediction model
class SimpleModel:
    def predict(self, features: List[float]) -> List[float]:
        return [sum(features) / len(features)]

engine = InferenceEngine(model=SimpleModel())

@app.post("/predict")
def predict(req, res):
    data = req.json()
    result = engine.predict(data["features"])
    res.json({"prediction": result})

app.run(port=8080)
```

Test it:

```bash
# In terminal 1
codon run ml_hello.codon

# In terminal 2
curl -X POST http://localhost:8080/predict \
  -H "Content-Type: application/json" \
  -d '{"features": [1.0, 2.0, 3.0, 4.0, 5.0]}'
```

**Output**: `{"prediction": [3.0]}`

---

## MCP Server (3 minutes)

Create `mcp_hello.codon`:

```python
from conduit.mcp import MCPServer, Tool

server = MCPServer(name="hello-tools", version="1.0.0")

@server.tool()
def greet(name: str) -> str:
    """Greet a person by name"""
    return f"Hello, {name}!"

@server.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

server.run()
```

Run it:

```bash
codon run mcp_hello.codon
```

Connect from Claude Desktop or any MCP client!

---

## Production Server (5 minutes)

Create `production.codon`:

```python
from conduit import Conduit
from conduit.framework.errors import error_handler
from conduit.framework.monitoring import logging_middleware, create_health_endpoint
from conduit.framework.security import rate_limit, enable_cors

app = Conduit()

# Add production middleware
app.use(enable_cors())
app.use(logging_middleware())
app.use(rate_limit(max_requests=100, window_seconds=60))
app.use(error_handler())

@app.get("/")
def home(req, res):
    res.json({"status": "ok", "service": "My API"})

@app.get("/health")
def health(req, res):
    return create_health_endpoint()(req, res)

@app.post("/api/data")
def process_data(req, res):
    data = req.json()
    # Process data...
    res.json({"result": "processed", "items": len(data)})

app.run(port=8080)
```

This includes:

- ✅ CORS support
- ✅ Request logging
- ✅ Rate limiting (100 req/min)
- ✅ Error handling
- ✅ Health checks

---

## Next Steps

**Learn More**:

- [MCP Server Tutorial](./MCP_TUTORIAL.md) - Build a complete MCP server
- [ML Inference Guide](./ML_INFERENCE_GUIDE.md) - Deploy ML models
- [Production Guide](./PRODUCTION_GUIDE.md) - Enterprise deployment

**Examples**:

- `examples/hello_world.codon` - Basic routing
- `examples/mcp_server.codon` - Full MCP implementation
- `examples/production_server.codon` - Production-ready app
- `examples/ml_api.codon` - ML inference API

**Performance**:

- 10-200x faster than Python frameworks
- Single binary deployment
- Native ML inference
- Zero cold starts

**Ready to build something amazing? 🚀**
