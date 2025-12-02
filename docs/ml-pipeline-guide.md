# ML Pipeline & Ensemble Guide

## Overview

Conduit's ML Pipeline and Ensemble features enable **multi-model orchestration** for complex AI workflows. Build sequential pipelines, parallel ensembles, and conditional routing with minimal code.

## 🎯 Key Features

- **Sequential Pipelines**: Chain multiple models together
- **Parallel Pipelines**: Execute all models with same input
- **Conditional Pipelines**: Smart routing based on input/intermediate results
- **Ensemble Predictions**: Combine multiple models (averaging, voting, max/min)
- **Intermediate Results**: Debug and inspect pipeline stages
- **Performance Tracking**: Built-in statistics for all stages

## 📦 Core Components

### 1. PipelineStage

A single stage in a pipeline, wrapping a model with optional preprocessing/postprocessing.

```python
from conduit.ml.pipeline import PipelineStage
from conduit.ml.loader import load_model

model = load_model("models/classifier.npy")
stage = PipelineStage("classify", model)
```

**With preprocessing:**

```python
def normalize(x):
    return (x - mean) / std

stage = PipelineStage("normalize", model, preprocessor=normalize)
```

### 2. MLPipeline

Multi-stage pipeline for sequential or parallel execution.

```python
from conduit.ml.pipeline import MLPipeline

# Create pipeline
pipeline = MLPipeline("text_processor")

# Add stages
pipeline.add_stage(PipelineStage("tokenize", tokenizer_model))
pipeline.add_stage(PipelineStage("embed", embedding_model))
pipeline.add_stage(PipelineStage("classify", classifier_model))

# Execute sequentially
result = pipeline.execute(input_data)

# Execute in parallel (all stages get same input)
results = pipeline.execute_parallel(input_data)

# Get intermediate results
result = pipeline.execute(input_data, cache_results=True)
# result = {
#     "final_output": ...,
#     "intermediate_results": {
#         "tokenize": {"output": ..., "time_ms": 1.2},
#         "embed": {"output": ..., "time_ms": 2.3},
#         ...
#     }
# }
```

### 3. EnsemblePredictor

Combine multiple models with aggregation strategies.

```python
from conduit.ml.pipeline import EnsemblePredictor, create_ensemble

# Create ensemble from model paths
ensemble = create_ensemble([
    "models/model1.npy",
    "models/model2.npy",
    "models/model3.npy"
], strategy="average")  # Options: average, vote, max, min

# Predict
prediction = ensemble.predict(input_data)
```

**Strategies:**

- `average`: Mean of all predictions (regression)
- `vote`: Majority voting (classification)
- `max`: Maximum values
- `min`: Minimum values

### 4. PipelineBuilder

Fluent builder for creating pipelines.

```python
from conduit.ml.pipeline import create_pipeline

pipeline = create_pipeline("nlp") \
    .add_model("models/tokenizer.npy", "tokenize") \
    .add_model("models/sentiment.npy", "sentiment") \
    .add_model("models/postprocess.npy", "postprocess") \
    .build()
```

### 5. ConditionalPipeline

Route to different pipelines based on conditions.

```python
from conduit.ml.pipeline import ConditionalPipeline

# Create pipelines
fast_pipeline = MLPipeline("fast")
slow_pipeline = MLPipeline("slow")

# Set up conditional routing
conditional = ConditionalPipeline("smart_router")

# Add routes
conditional.add_route(
    lambda data: len(data) < 100,  # Condition
    fast_pipeline                   # Pipeline to use
)

conditional.set_default(slow_pipeline)

# Execute (automatically routes)
result = conditional.execute(input_data)
```

## 🚀 Framework Integration

### Sequential Pipeline Endpoint

```python
from conduit.framework.conduit import Conduit

app = Conduit(ml_enabled=True)

# Create pipeline
pipeline = app.create_pipeline_builder("processor") \
    .add_model("models/step1.npy", "preprocess") \
    .add_model("models/step2.npy", "analyze") \
    .add_model("models/step3.npy", "postprocess") \
    .build()

# Use @app.ml_pipeline() decorator
@app.ml_pipeline("/api/process", pipeline)
def process(request):
    data = parse_json(request.body)
    return data["input"]  # Handler returns input for pipeline
```

**Response:**

```json
{
  "result": [...],
  "pipeline": {
    "name": "processor",
    "stages": 3,
    "executions": 127
  }
}
```

### Ensemble Endpoint

```python
# Create ensemble
ensemble = app.create_ensemble([
    "models/model_a.npy",
    "models/model_b.npy",
    "models/model_c.npy"
], strategy="vote")

# Use @app.ml_ensemble() decorator
@app.ml_ensemble("/api/predict", ensemble)
def predict(request):
    data = parse_json(request.body)
    return data["features"]
```

**Response:**

```json
{
  "prediction": "class_2",
  "ensemble": {
    "num_models": 3,
    "strategy": "vote",
    "total_predictions": 542
  }
}
```

### Manual Pipeline Control

For full control, create pipelines manually:

```python
@app.route("/api/custom", "POST")
def custom_pipeline(request):
    data = parse_json(request.body)

    # Create on-the-fly pipeline
    pipeline = app.create_pipeline("custom")
    pipeline.add_stage(...)

    # Execute with intermediate results
    result = pipeline.execute(data, cache_results=True)

    # Custom response
    return app.json({
        "output": result["final_output"],
        "stages": result["intermediate_results"],
        "stats": pipeline.get_stats()
    })
```

## 📊 Statistics & Monitoring

### Pipeline Statistics

```python
stats = pipeline.get_stats()
# {
#     "name": "processor",
#     "num_stages": 3,
#     "pipeline_executions": 127,
#     "pipeline_errors": 2,
#     "total_stage_executions": 381,  # 127 * 3
#     "total_stage_errors": 2,
#     "stages": [
#         {
#             "name": "preprocess",
#             "model": "step1.npy",
#             "executions": 127,
#             "errors": 0,
#             "avg_time_ms": 1.2
#         },
#         ...
#     ]
# }
```

### Ensemble Statistics

```python
stats = ensemble.get_stats()
# {
#     "num_models": 3,
#     "strategy": "average",
#     "predictions": 542
# }
```

## 🎨 Use Cases

### 1. NLP Pipeline

```python
# Tokenize → Embed → Classify
nlp_pipeline = create_pipeline("text_analysis") \
    .add_model("models/tokenizer.npy", "tokenize") \
    .add_model("models/bert_embeddings.npy", "embed") \
    .add_model("models/sentiment_classifier.npy", "classify") \
    .build()

@app.ml_pipeline("/api/sentiment", nlp_pipeline)
def analyze_sentiment(request):
    data = parse_json(request.body)
    return data["text"]
```

### 2. Image Processing Pipeline

```python
# Resize → Normalize → Feature Extract → Classify
vision_pipeline = create_pipeline("image_analysis") \
    .add_model("models/resizer.npy", "resize") \
    .add_model("models/normalizer.npy", "normalize") \
    .add_model("models/feature_extractor.npy", "extract") \
    .add_model("models/classifier.npy", "classify") \
    .build()
```

### 3. Model Ensemble for Robustness

```python
# Combine 5 models trained on different data
robust_ensemble = app.create_ensemble([
    "models/fold_1.npy",
    "models/fold_2.npy",
    "models/fold_3.npy",
    "models/fold_4.npy",
    "models/fold_5.npy"
], strategy="average")
```

### 4. Multi-Perspective Analysis

```python
# Run same input through different analyzers
@app.route("/api/analyze", "POST")
def multi_perspective(request):
    data = parse_json(request.body)

    # Create parallel pipeline
    pipeline = app.create_pipeline("multi")
    pipeline.add_stage(PipelineStage("sentiment", sentiment_model))
    pipeline.add_stage(PipelineStage("topic", topic_model))
    pipeline.add_stage(PipelineStage("intent", intent_model))

    # Execute in parallel
    results = pipeline.execute_parallel(data["text"])

    return app.json({
        "sentiment": results[0],
        "topic": results[1],
        "intent": results[2]
    })
```

### 5. Conditional Intelligence

```python
# Use simple model for easy cases, complex for hard cases
conditional = ConditionalPipeline("adaptive")

# Simple pipeline
simple = MLPipeline("simple")
simple.add_stage(PipelineStage("fast_model", fast_model))

# Complex pipeline
complex = MLPipeline("complex")
complex.add_stage(PipelineStage("preprocess", prep_model))
complex.add_stage(PipelineStage("deep_model", deep_model))
complex.add_stage(PipelineStage("postprocess", post_model))

# Route based on confidence
def is_easy(data):
    # Quick heuristic or pre-classifier
    return confidence_check(data) > 0.8

conditional.add_route(is_easy, simple)
conditional.set_default(complex)
```

## ⚡ Performance

Pipeline implementation is optimized for speed:

- **31,000+ pipeline executions/second** (Python validation)
- **Sub-millisecond latency** per stage
- **Zero-copy** data flow between stages
- **Lazy evaluation** for conditional routing
- **Efficient caching** for intermediate results

## 🔧 Advanced Features

### Custom Preprocessing

```python
def custom_preprocess(data):
    # Your preprocessing logic
    return normalized_data

stage = PipelineStage(
    "process",
    model,
    preprocessor=custom_preprocess
)
```

### Custom Postprocessing

```python
def custom_postprocess(result):
    # Your postprocessing logic
    return formatted_result

stage = PipelineStage(
    "process",
    model,
    postprocessor=custom_postprocess
)
```

### Error Handling

```python
from conduit.ml.pipeline import PipelineError, ModelExecutionError

try:
    result = pipeline.execute(data)
except ModelExecutionError as e:
    print(f"Stage failed: {e.message}")
except PipelineError as e:
    print(f"Pipeline error: {e.message}")
```

### Dynamic Pipelines

Create pipelines on-demand based on request:

```python
@app.route("/api/dynamic", "POST")
def dynamic_pipeline(request):
    data = parse_json(request.body)

    # Build pipeline based on request
    pipeline = app.create_pipeline("dynamic")

    for model_name in data["models"]:
        model = app.load_model(f"models/{model_name}.npy")
        pipeline.add_stage(PipelineStage(model_name, model))

    result = pipeline.execute(data["input"])
    return app.json({"result": result})
```

## 📚 API Reference

### MLPipeline

- `__init__(name: str)` - Create pipeline
- `add_stage(stage: PipelineStage)` - Add stage
- `execute(input_data, cache_results=False)` - Sequential execution
- `execute_parallel(input_data)` - Parallel execution
- `get_stats()` - Get statistics

### PipelineStage

- `__init__(name, model, preprocessor=None, postprocessor=None)` - Create stage
- `execute(input_data)` - Execute this stage
- `get_stats()` - Get stage statistics

### EnsemblePredictor

- `__init__(models, strategy)` - Create ensemble
- `predict(input_data)` - Generate prediction
- `get_stats()` - Get ensemble statistics

### ConditionalPipeline

- `__init__(name)` - Create conditional pipeline
- `add_route(condition, pipeline)` - Add route
- `set_default(pipeline)` - Set default pipeline
- `execute(input_data)` - Execute with routing

### Conduit Framework Methods

- `create_pipeline(name)` - Create pipeline
- `create_pipeline_builder(name)` - Create builder
- `create_ensemble(model_paths, strategy)` - Create ensemble
- `ml_pipeline(pattern, pipeline)` - Pipeline endpoint decorator
- `ml_ensemble(pattern, ensemble)` - Ensemble endpoint decorator

## 🎯 Best Practices

1. **Name Your Stages**: Use descriptive names for debugging
2. **Monitor Statistics**: Track execution counts and times
3. **Cache Wisely**: Use `cache_results=True` only when debugging
4. **Test Sequentially First**: Validate sequential before parallel
5. **Handle Errors**: Wrap pipeline execution in try/catch
6. **Reuse Pipelines**: Create once, execute many times
7. **Profile Performance**: Use `get_stats()` to find bottlenecks

## 🔗 Related

- [ML Inference Guide](./ml-inference-guide.md)
- [Streaming ML Guide](./streaming-ml-guide.md)
- [Vector Database Guide](./vector-db-guide.md) (coming soon)
- [API Reference](../API_REFERENCE.md)

---

**Performance**: 31K+ executions/sec | **Zero-copy** data flow | **Production-ready**
