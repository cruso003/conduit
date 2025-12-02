# Conduit ML Guide

# Complete Guide to Machine Learning Features in Conduit

## Overview

Conduit provides a **complete AI-first framework** with production-ready machine learning capabilities. This guide covers all ML features from basic inference to advanced RAG pipelines.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Model Loading & Inference](#model-loading--inference)
3. [Streaming ML Responses](#streaming-ml-responses)
4. [Multi-Model Pipelines](#multi-model-pipelines)
5. [Ensemble Predictions](#ensemble-predictions)
6. [Vector Database & Semantic Search](#vector-database--semantic-search)
7. [RAG (Retrieval-Augmented Generation)](#rag-retrieval-augmented-generation)
8. [ONNX Models & GPU Support](#onnx-models--gpu-support)
9. [Performance Optimization](#performance-optimization)
10. [Best Practices](#best-practices)

---

## Quick Start

### Installation

```bash
# Basic ML support
pip install numpy

# ONNX support (optional)
pip install onnxruntime        # CPU-only
pip install onnxruntime-gpu    # With GPU support

# For creating ONNX models
pip install onnx
```

### Simple ML Endpoint

```python
from conduit.framework.conduit import Conduit
import numpy as np

app = Conduit(ml_enabled=True)

# Load a model
model = app.load_model("models/classifier.npy")

@app.ml_endpoint("/predict", "models/classifier.npy")
def predict(request):
    data = parse_json(request.body)
    features = np.array(data["features"])
    return features

app.run(port=8080)
```

---

## Model Loading & Inference

### Supported Formats

- **NumPy** (`.npy`, `.npz`) - Simple matrix-based models
- **ONNX** (`.onnx`) - Industry-standard format with GPU support

### Loading Models

```python
# Load NumPy model
numpy_model = app.load_model("models/weights.npy")

# Load ONNX model (CPU)
onnx_model = app.load_model("models/model.onnx")

# Load ONNX model (GPU)
from conduit.ml.onnx_support import load_onnx_model
gpu_model = load_onnx_model("models/model.onnx", device="cuda")
```

### Basic Inference

```python
from conduit.ml.inference import InferenceEngine

# Create inference engine
engine = InferenceEngine(model)

# Single prediction
result = engine.predict(input_data)

# Batch prediction
results = engine.predict_batch([input1, input2, input3])

# Get statistics
stats = engine.get_stats()
# {
#   "inference_count": 127,
#   "avg_time_ms": 1.2,
#   "predictions_per_sec": 833
# }
```

### Preprocessing & Postprocessing

```python
# Add preprocessing
def normalize(data):
    return (data - mean) / std

engine.set_preprocessor(normalize)

# Add postprocessing
def format_output(result):
    return {"class": int(np.argmax(result)), "confidence": float(np.max(result))}

engine.set_postprocessor(format_output)

# Now predictions include both steps
result = engine.predict(raw_input)
```

---

## Streaming ML Responses

Stream predictions in real-time using Server-Sent Events (SSE).

### Basic Streaming

```python
from conduit.ml.streaming import StreamingInferenceEngine

# Create streaming engine
streaming = StreamingInferenceEngine(model, chunk_size=10)

# Stream predictions
for chunk in streaming.stream_predict(input_data):
    print(f"Chunk {chunk.index}: {chunk.data}")
    # Send to client via SSE
```

### Streaming Endpoint

```python
@app.ml_stream("/stream", streaming_engine)
def stream_prediction(request):
    data = parse_json(request.body)
    return np.array(data["features"])

# Response format (SSE):
# data: {"index": 0, "data": [0.1, 0.2], "timestamp": 1234567890}
#
# data: {"index": 1, "data": [0.3, 0.4], "timestamp": 1234567891}
```

### Custom Chunk Sizes

```python
# Small chunks for real-time updates
fast_streaming = StreamingInferenceEngine(model, chunk_size=1)

# Larger chunks for efficiency
batch_streaming = StreamingInferenceEngine(model, chunk_size=100)
```

**Performance**: 263K+ chunks/sec, <100ms latency

---

## Multi-Model Pipelines

Chain multiple models together for complex workflows.

### Sequential Pipeline

```python
from conduit.ml.pipeline import create_pipeline

# Build pipeline
pipeline = create_pipeline("nlp_pipeline") \
    .add_model("models/tokenizer.npy", "tokenize") \
    .add_model("models/embeddings.npy", "embed") \
    .add_model("models/classifier.npy", "classify") \
    .build()

# Execute pipeline
result = pipeline.execute(input_data)
```

### Pipeline Endpoint

```python
@app.ml_pipeline("/process", pipeline)
def process_text(request):
    data = parse_json(request.body)
    return data["text"]

# Response:
# {
#   "result": [...],
#   "pipeline": {
#     "name": "nlp_pipeline",
#     "stages": 3,
#     "executions": 127
#   }
# }
```

### Parallel Execution

```python
# Execute all stages in parallel (each gets same input)
results = pipeline.execute_parallel(input_data)

# Use case: multi-perspective analysis
# - Sentiment analysis
# - Topic detection
# - Intent classification
# All running simultaneously on same input
```

### Intermediate Results

```python
# Execute with debugging
result = pipeline.execute(input_data, cache_results=True)

# {
#   "final_output": [...],
#   "intermediate_results": {
#     "tokenize": {"output": [...], "time_ms": 1.2},
#     "embed": {"output": [...], "time_ms": 2.3},
#     "classify": {"output": [...], "time_ms": 0.8}
#   }
# }
```

### Conditional Pipelines

```python
from conduit.ml.pipeline import ConditionalPipeline

# Create pipelines for different scenarios
simple_pipeline = create_pipeline("simple").add_model(...).build()
complex_pipeline = create_pipeline("complex").add_model(...).build()

# Set up routing
conditional = ConditionalPipeline("adaptive")

# Route based on input characteristics
conditional.add_route(
    lambda data: len(data) < 100,  # Condition
    simple_pipeline                 # Pipeline to use
)
conditional.set_default(complex_pipeline)

# Automatically routes to appropriate pipeline
result = conditional.execute(input_data)
```

**Performance**: 31K+ pipeline executions/sec

---

## Ensemble Predictions

Combine multiple models for improved accuracy and robustness.

### Creating Ensembles

```python
from conduit.ml.pipeline import create_ensemble

# Average strategy (regression)
ensemble = create_ensemble([
    "models/model1.npy",
    "models/model2.npy",
    "models/model3.npy"
], strategy="average")

# Voting strategy (classification)
voting_ensemble = create_ensemble([
    "models/classifier_a.npy",
    "models/classifier_b.npy",
    "models/classifier_c.npy"
], strategy="vote")
```

### Ensemble Endpoint

```python
@app.ml_ensemble("/ensemble/predict", ensemble)
def ensemble_predict(request):
    data = parse_json(request.body)
    return np.array(data["features"])

# Response:
# {
#   "prediction": [0.72, 0.28],
#   "ensemble": {
#     "num_models": 3,
#     "strategy": "average",
#     "total_predictions": 542
#   }
# }
```

### Aggregation Strategies

- **`average`**: Mean of all predictions (regression, soft voting)
- **`vote`**: Majority voting (classification)
- **`max`**: Maximum values across predictions
- **`min`**: Minimum values across predictions

---

## Vector Database & Semantic Search

In-memory vector database for semantic similarity and search.

### Creating a Vector Database

```python
from conduit.ml.vectors import create_vector_db

# Create database with cosine similarity
vector_db = create_vector_db("knowledge_base", metric="cosine")

# Add documents
vector_db.add(
    id="doc1",
    vector=embedding_vector,
    metadata={"text": "Document content", "category": "tech"}
)

# Batch add
documents = [
    ("doc2", vec2, {"text": "...", "category": "science"}),
    ("doc3", vec3, {"text": "...", "category": "tech"}),
]
vector_db.add_batch(documents)
```

### Semantic Search

```python
# Search for similar documents
query_vector = embedder.embed("artificial intelligence")

results = vector_db.search(
    query_vector=query_vector,
    top_k=5
)

for result in results:
    print(f"{result.rank}. {result.document.metadata['text']}")
    print(f"   Score: {result.score:.4f}")
```

### Filtered Search

```python
# Search within a category
filter_fn = lambda meta: meta["category"] == "tech"

results = vector_db.search(
    query_vector=query_vector,
    top_k=5,
    filter_fn=filter_fn
)
```

### Distance Metrics

- **`cosine`**: Cosine similarity (0-1, higher is more similar)
- **`euclidean`**: Euclidean distance (lower is more similar)
- **`manhattan`**: Manhattan/L1 distance (lower is more similar)
- **`dot`**: Dot product similarity (higher is more similar)

**Performance**: 149 searches/sec on 1K documents

---

## RAG (Retrieval-Augmented Generation)

Combine vector search with context generation for LLM prompts.

### Creating RAG Pipeline

```python
from conduit.ml.vectors import create_rag_pipeline

# Create vector database
vector_db = create_vector_db("knowledge")

# Add knowledge base
for doc in knowledge_base:
    vector_db.add(doc["id"], doc["embedding"], doc["metadata"])

# Create RAG pipeline
rag = create_rag_pipeline(vector_db, top_k=3)
```

### RAG Query

```python
# Retrieve relevant documents
query_vector = embedder.embed("How does machine learning work?")
results = rag.retrieve(query_vector)

# Build context from results
context = rag.build_context(results, max_length=2000)

# Augment query for LLM
augmented_query = rag.augment_query(
    "How does machine learning work?",
    context
)

# Result:
# """
# Context:
# Machine learning is a subset of AI that enables computers to learn from data...
# Neural networks are computing systems inspired by biological neural networks...
# Deep learning uses multiple layers to progressively extract features...
#
# Question: How does machine learning work?
#
# Answer based on the context above:
# """
```

### RAG Endpoint

```python
@app.rag_endpoint("/api/rag", rag)
def rag_query(request):
    data = parse_json(request.body)
    query_vector = embedder.embed(data["query"])
    return {
        "query_vector": query_vector,
        "query_text": data["query"]
    }

# Response:
# {
#   "context": "...",
#   "augmented_query": "...",
#   "retrieved_documents": [...],
#   "count": 3
# }
```

---

## ONNX Models & GPU Support

Production-grade models with GPU acceleration.

### Loading ONNX Models

```python
from conduit.ml.onnx_support import load_onnx_model, DeviceManager

# Check available devices
devices = DeviceManager.get_available_devices()
# ['cpu', 'cuda', 'tensorrt']

# Load on CPU
cpu_model = load_onnx_model("models/resnet.onnx", device="cpu")

# Load on GPU (CUDA)
gpu_model = load_onnx_model("models/resnet.onnx", device="cuda")

# Auto-select best device
auto_model = load_onnx_model("models/resnet.onnx", device="auto")
```

### Model Information

```python
info = gpu_model.get_info()

# {
#   "device": "cuda",
#   "providers": ["CUDAExecutionProvider", "CPUExecutionProvider"],
#   "active_provider": "CUDAExecutionProvider",
#   "num_inputs": 1,
#   "num_outputs": 1,
#   "inputs": [{"name": "input", "shape": [None, 3, 224, 224], "type": "tensor(float)"}],
#   "outputs": [{"name": "output", "shape": [None, 1000], "type": "tensor(float)"}],
#   "inference_count": 1523,
#   "avg_time_ms": 0.016
# }
```

### GPU Warmup

```python
# Warmup GPU kernels for optimal performance
gpu_model.warmup(num_runs=10)

# Now inference is faster
result = gpu_model.predict(input_data)
```

### Device Detection

```python
from conduit.ml.onnx_support import has_gpu_support, get_onnx_providers

if has_gpu_support():
    print("GPU acceleration available!")

providers = get_onnx_providers()
# ['CUDAExecutionProvider', 'TensorrtExecutionProvider', 'CPUExecutionProvider']
```

**Performance**: 63K+ inferences/sec on CPU, much faster on GPU

---

## Performance Optimization

### Model Caching

```python
from conduit.ml.loader import ModelCache

# Create cache
cache = ModelCache(max_models=10)

# Load with caching
def load_with_cache(path):
    model = cache.get(path)
    if model is None:
        model = load_model(path)
        cache.put(path, model)
    return model

# Cache stats
stats = cache.get_stats()
# {"cached_models": 5, "hit_rate": 0.87, "cache_size_mb": 45.2}
```

### Batch Processing

```python
# Process multiple inputs at once
batch_results = engine.predict_batch([
    input1, input2, input3, input4, input5
])

# More efficient than:
# for inp in inputs:
#     result = engine.predict(inp)  # ❌ Slower
```

### Preprocessing Optimization

```python
# Cache expensive preprocessing
from functools import lru_cache

@lru_cache(maxsize=1000)
def preprocess(data):
    # Expensive operation
    return normalized_data

engine.set_preprocessor(preprocess)
```

### Pipeline Optimization

```python
# Reuse pipelines instead of recreating
pipeline = create_pipeline("nlp").add_model(...).build()

# Good: Reuse
for data in dataset:
    result = pipeline.execute(data)  # ✅ Fast

# Bad: Recreate
for data in dataset:
    p = create_pipeline(...).build()  # ❌ Slow
    result = p.execute(data)
```

---

## Best Practices

### 1. Model Management

```python
# ✅ Good: Organize models by version
models/
  v1/
    classifier.onnx
    embeddings.npy
  v2/
    classifier.onnx
    embeddings.npy

# ✅ Good: Use meaningful names
models/sentiment_classifier_v2.onnx

# ❌ Bad: Generic names
models/model1.npy
```

### 2. Error Handling

```python
from conduit.ml.loader import ModelError
from conduit.ml.onnx_support import ONNXError

try:
    result = engine.predict(data)
except ModelError as e:
    return app.json({"error": f"Model error: {e.message}"}, status=500)
except ONNXError as e:
    return app.json({"error": f"ONNX error: {e.message}"}, status=500)
```

### 3. Monitoring

```python
# Track performance metrics
@app.route("/ml/stats", "GET")
def ml_stats(request):
    return app.json({
        "models": app.get_ml_stats(),
        "pipelines": pipeline.get_stats(),
        "vector_db": vector_db.get_stats(),
        "ensembles": ensemble.get_stats()
    })
```

### 4. Input Validation

```python
def validate_input(data):
    if not isinstance(data, np.ndarray):
        raise ValueError("Input must be numpy array")

    if data.shape[1] != expected_features:
        raise ValueError(f"Expected {expected_features} features")

    return data

engine.set_preprocessor(validate_input)
```

### 5. Resource Management

```python
# Clear caches periodically
cache.clear()
vector_db.clear()

# Remove unused models
model = None  # Release memory
```

---

## Complete Example

```python
from conduit.framework.conduit import Conduit
from conduit.ml.pipeline import create_pipeline
from conduit.ml.vectors import create_vector_db, create_rag_pipeline
import numpy as np

app = Conduit(ml_enabled=True)

# 1. Create ML pipeline
pipeline = create_pipeline("nlp") \
    .add_model("models/tokenizer.npy", "tokenize") \
    .add_model("models/embeddings.npy", "embed") \
    .add_model("models/classifier.npy", "classify") \
    .build()

# 2. Create vector database
vector_db = create_vector_db("knowledge", metric="cosine")
# ... add documents ...

# 3. Create RAG pipeline
rag = create_rag_pipeline(vector_db, top_k=3)

# 4. ML endpoint
@app.ml_pipeline("/api/analyze", pipeline)
def analyze_text(request):
    data = parse_json(request.body)
    return data["text"]

# 5. RAG endpoint
@app.rag_endpoint("/api/rag", rag)
def rag_query(request):
    data = parse_json(request.body)
    query_vector = embedder.embed(data["query"])
    return {"query_vector": query_vector, "query_text": data["query"]}

# 6. Statistics endpoint
@app.route("/api/stats", "GET")
def stats(request):
    return app.json({
        "pipeline": pipeline.get_stats(),
        "vector_db": vector_db.get_stats(),
        "rag": rag.get_stats()
    })

app.run(port=8080)
```

---

## Additional Resources

- [ML Pipeline Guide](./ml-pipeline-guide.md) - Detailed pipeline documentation
- [Vector DB Guide](./vector-db-guide.md) - Vector search deep dive
- [ONNX Guide](./onnx-guide.md) - ONNX and GPU optimization
- [API Reference](../API_REFERENCE.md) - Complete API documentation
- [Examples](../examples/) - Code examples and demos

---

## Performance Summary

| Feature             | Performance      | Details                       |
| ------------------- | ---------------- | ----------------------------- |
| **Basic Inference** | 50K+ pred/sec    | NumPy models, sub-5ms latency |
| **ONNX Inference**  | 63K+ pred/sec    | CPU, 0.016ms latency          |
| **Streaming**       | 263K+ chunks/sec | SSE, <100ms chunk latency     |
| **Pipelines**       | 31K+ exec/sec    | Multi-stage, zero-copy        |
| **Vector Search**   | 149 searches/sec | 1K docs, cosine similarity    |
| **Ensembles**       | Model-dependent  | Parallel execution            |

---

**Built with ❤️ by the Conduit Team**

For questions, issues, or contributions, visit our [GitHub repository](https://github.com/cruso003/conduit).
