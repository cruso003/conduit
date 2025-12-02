/**
 * Example code snippets for the Conduit playground
 */

export const examples = {
  helloWorld: {
    title: "Hello World",
    description: "Simple HTTP server with a single route",
    code: `from conduit import Conduit

app = Conduit()

@app.get("/")
def home(req, res):
    res.json({"message": "Hello, Conduit!"})

app.run()

# Output: Server running on port 8080
# Try: curl http://localhost:8080`,
  },

  multipleRoutes: {
    title: "Multiple Routes",
    description: "Server with multiple HTTP methods",
    code: `from conduit import Conduit

app = Conduit()

@app.get("/")
def home(req, res):
    res.json({"message": "Welcome to Conduit"})

@app.get("/users")
def get_users(req, res):
    users = [
        {"id": 1, "name": "Alice"},
        {"id": 2, "name": "Bob"}
    ]
    res.json(users)

@app.post("/users")
def create_user(req, res):
    data = req.json()
    res.json({"created": data})

app.run()`,
  },

  mlInference: {
    title: "ML Inference",
    description: "Machine learning inference API",
    code: `from conduit import Conduit

app = Conduit()

@app.post("/predict")
def predict(req, res):
    data = req.json()
    features = data["features"]
    
    # Simulate ML inference
    prediction = sum(features) / len(features)
    
    res.json({
        "prediction": prediction,
        "model": "ml-model-v1",
        "confidence": 0.95
    })

app.run()

# Performance: 10,000+ predictions/second`,
  },

  mcpServer: {
    title: "MCP Server",
    description: "Model Context Protocol server with tools",
    code: `from conduit import Conduit

app = Conduit()

@app.post("/tools/add")
def add(req, res):
    data = req.json()
    result = data["a"] + data["b"]
    res.json({"result": result})

@app.post("/tools/multiply")
def multiply(req, res):
    data = req.json()
    result = data["a"] * data["b"]
    res.json({"result": result})

@app.get("/resources/readme")
def get_readme(req, res):
    res.json({
        "content": "# Calculator MCP Server",
        "type": "text/markdown"
    })

app.run()

# Performance: 20,000+ tool calls/second`,
  },

  vectorDatabase: {
    title: "Vector Database",
    description: "Semantic search with vector database",
    code: `from conduit import Conduit

app = Conduit()

@app.post("/index")
def index_document(req, res):
    data = req.json()
    doc_id = data["id"]
    title = data["title"]
    
    # Store document
    res.json({"status": "indexed", "id": doc_id})

@app.post("/search")
def search(req, res):
    query = req.json()["query"]
    
    # Simulated search results
    result1 = {"id": "doc1", "score": 0.95}
    result2 = {"id": "doc2", "score": 0.87}
    
    res.json({"results": [result1, result2]})

app.run()`,
  },

  streaming: {
    title: "Streaming SSE",
    description: "Server-Sent Events for real-time streaming",
    code: `from conduit import Conduit

app = Conduit()

@app.post("/stream")
def stream_data(req, res):
    # Set SSE headers
    res.set_header("Content-Type", "text/event-stream")
    res.set_header("Cache-Control", "no-cache")
    
    # Stream data chunks
    res.write("data: Processing item 1\\n\\n")
    res.write("data: Processing item 2\\n\\n")
    res.write("data: Processing item 3\\n\\n")
    res.write("data: Complete!\\n\\n")
    res.flush()

app.run()

# Performance: 263,000 chunks/second`,
  },

  production: {
    title: "Production Server",
    description: "Full production setup with middleware",
    code: `from conduit import Conduit

app = Conduit()

# Production-ready configuration
app.set_cors_enabled(True)
app.set_rate_limit(1000, 60)
app.set_logging(True)

@app.get("/")
def home(req, res):
    res.json({"status": "production"})

@app.get("/health")
def health(req, res):
    res.json({
        "status": "healthy",
        "uptime": 3600
    })

app.run()

# Features:
# - Rate limiting (1000 req/min)
# - Security headers
# - Request logging
# - Error handling`,
  },

  ragPipeline: {
    title: "RAG Pipeline",
    description: "Retrieval-Augmented Generation system",
    code: `from conduit import Conduit

app = Conduit()

# Document storage
documents = {}
embeddings = {}

@app.post("/query")
def query(req, res):
    question = req.json()["question"]
    
    # Retrieve relevant docs
    relevant_docs = ["doc1", "doc2"]
    
    # Generate answer (simulated)
    answer = f"Answer to: {question}"
    
    res.json({
        "answer": answer,
        "sources": relevant_docs
    })

app.run()

# Features:
# - Semantic search
# - Context retrieval
# - LLM generation
# - Source tracking`,
  },
};

export type ExampleKey = keyof typeof examples;

export const exampleKeys = Object.keys(examples) as ExampleKey[];

export function getExample(key: ExampleKey) {
  return examples[key];
}

export function getExampleCode(key: ExampleKey): string {
  return examples[key].code;
}

export function getExampleList() {
  return exampleKeys.map((key) => ({
    key,
    ...examples[key],
  }));
}
