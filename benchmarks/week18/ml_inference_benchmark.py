"""
ML Inference Performance Benchmark
Compares Conduit vs Flask/FastAPI for ML inference workloads

Tests:
1. Scikit-learn model inference
2. ONNX model inference
3. Streaming inference (SSE)
4. Multi-model pipeline execution
"""

import time
import requests
import statistics
import json
import numpy as np
import subprocess
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class MLBenchmarkResult:
    """ML benchmark results"""
    name: str
    framework: str
    test_type: str
    iterations: int
    duration: float
    latencies: List[float]
    throughput: float  # inferences/sec
    
    @property
    def avg_latency(self) -> float:
        return statistics.mean(self.latencies) * 1000  # ms
    
    @property
    def p95_latency(self) -> float:
        return statistics.quantiles(self.latencies, n=20)[18] * 1000  # ms


class MLInferenceBenchmark:
    """Benchmark ML inference across frameworks"""
    
    def __init__(self, port: int = 8080):
        self.port = port
        self.base_url = f"http://localhost:{port}"
        
    def benchmark_sklearn_inference(self, name: str, num_inferences: int = 1000) -> MLBenchmarkResult:
        """Benchmark scikit-learn model inference"""
        print(f"\nBenchmarking {name} - Scikit-learn Inference")
        
        # Generate test data
        test_data = np.random.randn(100, 10).tolist()
        
        latencies = []
        start = time.time()
        
        for i in range(num_inferences):
            req_start = time.time()
            try:
                response = requests.post(
                    f"{self.base_url}/predict",
                    json={"features": test_data[i % 100]},
                    timeout=5
                )
                response.raise_for_status()
                latencies.append(time.time() - req_start)
            except Exception as e:
                print(f"Request {i} failed: {e}")
            
            if (i + 1) % 200 == 0:
                print(f"  Progress: {i + 1}/{num_inferences}")
        
        duration = time.time() - start
        throughput = len(latencies) / duration
        
        result = MLBenchmarkResult(
            name=name,
            framework=name.split()[0],
            test_type="sklearn",
            iterations=len(latencies),
            duration=duration,
            latencies=latencies,
            throughput=throughput
        )
        
        print(f"  Throughput: {throughput:,.0f} inferences/sec")
        print(f"  Avg Latency: {result.avg_latency:.3f}ms")
        print(f"  P95 Latency: {result.p95_latency:.3f}ms")
        
        return result
    
    def benchmark_onnx_inference(self, name: str, num_inferences: int = 1000) -> MLBenchmarkResult:
        """Benchmark ONNX model inference"""
        print(f"\nBenchmarking {name} - ONNX Inference")
        
        # Generate test data (batch of 32)
        test_data = np.random.randn(32, 10).astype(np.float32).tolist()
        
        latencies = []
        start = time.time()
        
        for i in range(num_inferences):
            req_start = time.time()
            try:
                response = requests.post(
                    f"{self.base_url}/predict_onnx",
                    json={"input": test_data},
                    timeout=5
                )
                response.raise_for_status()
                latencies.append(time.time() - req_start)
            except Exception as e:
                print(f"Request {i} failed: {e}")
            
            if (i + 1) % 200 == 0:
                print(f"  Progress: {i + 1}/{num_inferences}")
        
        duration = time.time() - start
        throughput = len(latencies) * 32 / duration  # Batch size 32
        
        result = MLBenchmarkResult(
            name=name,
            framework=name.split()[0],
            test_type="onnx",
            iterations=len(latencies),
            duration=duration,
            latencies=latencies,
            throughput=throughput
        )
        
        print(f"  Throughput: {throughput:,.0f} inferences/sec")
        print(f"  Avg Latency: {result.avg_latency:.3f}ms")
        print(f"  P95 Latency: {result.p95_latency:.3f}ms")
        
        return result
    
    def benchmark_streaming_inference(self, name: str, num_streams: int = 100) -> MLBenchmarkResult:
        """Benchmark streaming inference with SSE"""
        print(f"\nBenchmarking {name} - Streaming Inference")
        
        latencies = []
        total_chunks = 0
        start = time.time()
        
        for i in range(num_streams):
            req_start = time.time()
            try:
                response = requests.get(
                    f"{self.base_url}/stream_predict",
                    params={"features": json.dumps(np.random.randn(10).tolist())},
                    stream=True,
                    timeout=10
                )
                
                chunks = 0
                for line in response.iter_lines():
                    if line:
                        chunks += 1
                
                total_chunks += chunks
                latencies.append(time.time() - req_start)
            except Exception as e:
                print(f"Stream {i} failed: {e}")
            
            if (i + 1) % 20 == 0:
                print(f"  Progress: {i + 1}/{num_streams}")
        
        duration = time.time() - start
        throughput = total_chunks / duration
        
        result = MLBenchmarkResult(
            name=name,
            framework=name.split()[0],
            test_type="streaming",
            iterations=len(latencies),
            duration=duration,
            latencies=latencies,
            throughput=throughput
        )
        
        print(f"  Throughput: {throughput:,.0f} chunks/sec")
        print(f"  Avg Latency: {result.avg_latency:.3f}ms")
        print(f"  Total Chunks: {total_chunks:,}")
        
        return result
    
    def benchmark_pipeline(self, name: str, num_executions: int = 500) -> MLBenchmarkResult:
        """Benchmark multi-model pipeline"""
        print(f"\nBenchmarking {name} - Multi-Model Pipeline")
        
        test_data = np.random.randn(10).tolist()
        
        latencies = []
        start = time.time()
        
        for i in range(num_executions):
            req_start = time.time()
            try:
                response = requests.post(
                    f"{self.base_url}/pipeline",
                    json={"features": test_data},
                    timeout=5
                )
                response.raise_for_status()
                latencies.append(time.time() - req_start)
            except Exception as e:
                print(f"Request {i} failed: {e}")
            
            if (i + 1) % 100 == 0:
                print(f"  Progress: {i + 1}/{num_executions}")
        
        duration = time.time() - start
        throughput = len(latencies) / duration
        
        result = MLBenchmarkResult(
            name=name,
            framework=name.split()[0],
            test_type="pipeline",
            iterations=len(latencies),
            duration=duration,
            latencies=latencies,
            throughput=throughput
        )
        
        print(f"  Throughput: {throughput:,.0f} pipelines/sec")
        print(f"  Avg Latency: {result.avg_latency:.3f}ms")
        print(f"  P95 Latency: {result.p95_latency:.3f}ms")
        
        return result


def create_python_ml_server():
    """Create Python FastAPI ML server for comparison"""
    code = '''
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import joblib
import numpy as np
import json
from typing import List
import time

app = FastAPI()

# Mock model (simple linear model)
class SimpleModel:
    def predict(self, X):
        return np.dot(X, np.random.randn(10)) + 0.5

model = SimpleModel()

@app.post("/predict")
def predict(data: dict):
    features = np.array(data["features"])
    prediction = model.predict(features)
    return {"prediction": float(prediction)}

@app.post("/predict_onnx")
def predict_onnx(data: dict):
    # Simulate ONNX inference
    input_data = np.array(data["input"])
    predictions = np.dot(input_data, np.random.randn(10, 1))
    return {"predictions": predictions.tolist()}

@app.get("/stream_predict")
def stream_predict(features: str):
    def generate():
        feat_array = np.array(json.loads(features))
        prediction = model.predict(feat_array)
        
        # Stream result in chunks
        result = str(prediction)
        for i in range(0, len(result), 10):
            chunk = result[i:i+10]
            yield f"data: {chunk}\\n\\n"
            time.sleep(0.001)
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/pipeline")
def pipeline(data: dict):
    # Simulate 3-model pipeline
    features = np.array(data["features"])
    
    # Model 1
    result1 = model.predict(features)
    
    # Model 2
    result2 = model.predict(features * 2)
    
    # Model 3 (ensemble)
    final = (result1 + result2) / 2
    
    return {"prediction": float(final)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="error")
'''
    
    with open("/tmp/ml_python.py", "w") as f:
        f.write(code)
    
    return ["python", "/tmp/ml_python.py"]


def run_full_ml_benchmark():
    """Run comprehensive ML benchmark suite"""
    print("="*80)
    print("ML INFERENCE BENCHMARK SUITE")
    print("="*80)
    
    all_results = []
    
    # Test Python FastAPI
    print("\n" + "="*80)
    print("PYTHON FASTAPI")
    print("="*80)
    
    cmd = create_python_ml_server()
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(2)  # Wait for server to start
    
    bench = MLInferenceBenchmark()
    
    try:
        all_results.append(bench.benchmark_sklearn_inference("Python FastAPI", 1000))
        all_results.append(bench.benchmark_onnx_inference("Python FastAPI", 1000))
        all_results.append(bench.benchmark_streaming_inference("Python FastAPI", 100))
        all_results.append(bench.benchmark_pipeline("Python FastAPI", 500))
    finally:
        process.terminate()
        process.wait()
    
    # Results would go here for Conduit (to be implemented)
    
    # Compare results
    print("\n" + "="*80)
    print("COMPARISON SUMMARY")
    print("="*80)
    
    for test_type in ["sklearn", "onnx", "streaming", "pipeline"]:
        results = [r for r in all_results if r.test_type == test_type]
        if len(results) >= 2:
            baseline = results[0]
            comparison = results[1]
            speedup = comparison.throughput / baseline.throughput
            
            print(f"\n{test_type.upper()}:")
            print(f"  {baseline.framework}: {baseline.throughput:,.0f}/sec")
            print(f"  {comparison.framework}: {comparison.throughput:,.0f}/sec")
            print(f"  Speedup: {speedup:.1f}x")
    
    # Save results
    with open("ml_benchmark_results.json", "w") as f:
        json.dump([{
            "name": r.name,
            "framework": r.framework,
            "test_type": r.test_type,
            "throughput": r.throughput,
            "avg_latency": r.avg_latency,
            "p95_latency": r.p95_latency
        } for r in all_results], f, indent=2)
    
    print("\nResults saved to ml_benchmark_results.json")


if __name__ == "__main__":
    run_full_ml_benchmark()
