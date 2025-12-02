"""
MCP Server Performance Benchmark
Compares Conduit vs Python/Node.js MCP implementations

Metrics:
- Request latency (p50, p95, p99)
- Throughput (requests/second)
- Memory usage
- Cold start time
"""

import time
import requests
import statistics
import json
import psutil
import subprocess
import os
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class BenchmarkResult:
    """Results from a benchmark run"""
    name: str
    requests: int
    duration: float
    latencies: List[float]
    memory_mb: float
    cold_start_ms: float
    
    @property
    def rps(self) -> float:
        """Requests per second"""
        return self.requests / self.duration
    
    @property
    def p50(self) -> float:
        """50th percentile latency (median)"""
        return statistics.median(self.latencies) * 1000  # ms
    
    @property
    def p95(self) -> float:
        """95th percentile latency"""
        return statistics.quantiles(self.latencies, n=20)[18] * 1000  # ms
    
    @property
    def p99(self) -> float:
        """99th percentile latency"""
        return statistics.quantiles(self.latencies, n=100)[98] * 1000  # ms
    
    @property
    def avg(self) -> float:
        """Average latency"""
        return statistics.mean(self.latencies) * 1000  # ms


class MCPBenchmark:
    """Benchmark harness for MCP servers"""
    
    def __init__(self, port: int = 8080):
        self.port = port
        self.base_url = f"http://localhost:{port}"
        
    def benchmark_server(self, name: str, start_cmd: List[str], 
                        num_requests: int = 1000) -> BenchmarkResult:
        """
        Benchmark an MCP server
        
        Args:
            name: Server name (e.g., "Conduit", "Python-FastAPI")
            start_cmd: Command to start server
            num_requests: Number of requests to send
        """
        print(f"\n{'='*60}")
        print(f"Benchmarking: {name}")
        print(f"{'='*60}")
        
        # Measure cold start time
        start_time = time.time()
        process = subprocess.Popen(
            start_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for server to be ready
        for _ in range(50):  # 5 seconds max
            try:
                requests.get(f"{self.base_url}/health", timeout=0.1)
                break
            except:
                time.sleep(0.1)
        
        cold_start = (time.time() - start_time) * 1000  # ms
        print(f"Cold start: {cold_start:.2f}ms")
        
        # Warm up
        for _ in range(100):
            try:
                self._send_mcp_request("tools/list", {})
            except:
                pass
        
        # Benchmark requests
        latencies = []
        start = time.time()
        
        for i in range(num_requests):
            req_start = time.time()
            try:
                self._send_mcp_request("tools/list", {})
                latencies.append(time.time() - req_start)
            except Exception as e:
                print(f"Request {i} failed: {e}")
            
            if (i + 1) % 100 == 0:
                print(f"Progress: {i + 1}/{num_requests}")
        
        duration = time.time() - start
        
        # Measure memory
        try:
            proc = psutil.Process(process.pid)
            memory_mb = proc.memory_info().rss / 1024 / 1024
        except:
            memory_mb = 0
        
        # Cleanup
        process.terminate()
        process.wait(timeout=5)
        
        result = BenchmarkResult(
            name=name,
            requests=len(latencies),
            duration=duration,
            latencies=latencies,
            memory_mb=memory_mb,
            cold_start_ms=cold_start
        )
        
        self._print_results(result)
        return result
    
    def _send_mcp_request(self, method: str, params: Dict[str, Any]) -> Any:
        """Send MCP JSON-RPC request"""
        response = requests.post(
            f"{self.base_url}/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": method,
                "params": params
            },
            timeout=5
        )
        response.raise_for_status()
        return response.json()
    
    def _print_results(self, result: BenchmarkResult):
        """Print benchmark results"""
        print(f"\n{result.name} Results:")
        print(f"  Requests:     {result.requests:,}")
        print(f"  Duration:     {result.duration:.2f}s")
        print(f"  Throughput:   {result.rps:,.0f} req/s")
        print(f"  Latency (avg): {result.avg:.3f}ms")
        print(f"  Latency (p50): {result.p50:.3f}ms")
        print(f"  Latency (p95): {result.p95:.3f}ms")
        print(f"  Latency (p99): {result.p99:.3f}ms")
        print(f"  Memory:       {result.memory_mb:.1f} MB")
        print(f"  Cold start:   {result.cold_start_ms:.2f}ms")


def benchmark_python_fastapi():
    """Benchmark Python FastAPI MCP server"""
    # Create Python FastAPI MCP server
    code = '''
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

app = FastAPI()

class JSONRPCRequest(BaseModel):
    jsonrpc: str
    id: int
    method: str
    params: dict

class JSONRPCResponse(BaseModel):
    jsonrpc: str
    id: int
    result: dict

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/mcp")
def mcp_handler(request: JSONRPCRequest):
    if request.method == "tools/list":
        return JSONRPCResponse(
            jsonrpc="2.0",
            id=request.id,
            result={"tools": [
                {"name": "add", "description": "Add two numbers"},
                {"name": "multiply", "description": "Multiply two numbers"}
            ]}
        )
    return JSONRPCResponse(
        jsonrpc="2.0",
        id=request.id,
        result={}
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="error")
'''
    
    with open("/tmp/mcp_python.py", "w") as f:
        f.write(code)
    
    bench = MCPBenchmark(8080)
    return bench.benchmark_server(
        "Python FastAPI",
        ["python", "/tmp/mcp_python.py"],
        num_requests=1000
    )


def benchmark_conduit_mcp():
    """Benchmark Conduit MCP server"""
    # We'll create a simple Conduit MCP server
    code = '''
from conduit.mcp import MCPServer, Tool
from conduit import Conduit

app = Conduit()

# Create MCP server
mcp = MCPServer(
    name="benchmark-server",
    version="1.0.0"
)

# Add tools
@mcp.tool("add")
def add_tool(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@mcp.tool("multiply")
def multiply_tool(a: int, b: int) -> int:
    """Multiply two numbers"""
    return a * b

# Health check
@app.get("/health")
def health(req, res):
    res.json({"status": "ok"})

# MCP endpoint
@app.post("/mcp")
def mcp_handler(req, res):
    result = mcp.handle_request(req.json())
    res.json(result)

if __name__ == "__main__":
    app.run(port=8080)
'''
    
    with open("/tmp/mcp_conduit.codon", "w") as f:
        f.write(code)
    
    # Compile Conduit server
    subprocess.run(
        ["codon", "build", "-o", "/tmp/mcp_conduit", "/tmp/mcp_conduit.codon"],
        check=True
    )
    
    bench = MCPBenchmark(8080)
    return bench.benchmark_server(
        "Conduit",
        ["/tmp/mcp_conduit"],
        num_requests=1000
    )


def compare_results(results: List[BenchmarkResult]):
    """Compare and display results"""
    print(f"\n{'='*80}")
    print("BENCHMARK COMPARISON")
    print(f"{'='*80}\n")
    
    # Find baseline (Python)
    baseline = next(r for r in results if "Python" in r.name)
    
    print(f"{'Metric':<20} {'Python FastAPI':<20} {'Conduit':<20} {'Speedup':<15}")
    print(f"{'-'*80}")
    
    for result in results:
        if result == baseline:
            continue
        
        speedup_rps = result.rps / baseline.rps
        speedup_latency = baseline.avg / result.avg
        speedup_memory = baseline.memory_mb / result.memory_mb
        speedup_cold = baseline.cold_start_ms / result.cold_start_ms
        
        print(f"{'Throughput':<20} {baseline.rps:>18,.0f}  {result.rps:>18,.0f}  {speedup_rps:>13.1f}x")
        print(f"{'Avg Latency':<20} {baseline.avg:>17.3f}ms {result.avg:>17.3f}ms {speedup_latency:>13.1f}x")
        print(f"{'P95 Latency':<20} {baseline.p95:>17.3f}ms {result.p95:>17.3f}ms {baseline.p95/result.p95:>13.1f}x")
        print(f"{'P99 Latency':<20} {baseline.p99:>17.3f}ms {result.p99:>17.3f}ms {baseline.p99/result.p99:>13.1f}x")
        print(f"{'Memory Usage':<20} {baseline.memory_mb:>17.1f}MB {result.memory_mb:>17.1f}MB {speedup_memory:>13.1f}x")
        print(f"{'Cold Start':<20} {baseline.cold_start_ms:>17.1f}ms {result.cold_start_ms:>17.1f}ms {speedup_cold:>13.1f}x")
    
    print(f"\n{'='*80}")
    print(f"Summary: Conduit is {speedup_rps:.1f}x faster with {speedup_memory:.1f}x less memory")
    print(f"{'='*80}\n")


def save_results(results: List[BenchmarkResult], filename: str = "mcp_benchmark_results.json"):
    """Save results to JSON"""
    data = {
        "timestamp": time.time(),
        "results": [
            {
                "name": r.name,
                "requests": r.requests,
                "duration": r.duration,
                "rps": r.rps,
                "latency_avg": r.avg,
                "latency_p50": r.p50,
                "latency_p95": r.p95,
                "latency_p99": r.p99,
                "memory_mb": r.memory_mb,
                "cold_start_ms": r.cold_start_ms
            }
            for r in results
        ]
    }
    
    with open(filename, "w") as f:
        json.dump(data, f, indent=2)
    
    print(f"Results saved to {filename}")


if __name__ == "__main__":
    print("MCP Server Benchmark Suite")
    print("Comparing Conduit vs Python FastAPI\n")
    
    results = []
    
    # Benchmark Python
    try:
        results.append(benchmark_python_fastapi())
    except Exception as e:
        print(f"Python benchmark failed: {e}")
    
    # Benchmark Conduit
    try:
        results.append(benchmark_conduit_mcp())
    except Exception as e:
        print(f"Conduit benchmark failed: {e}")
    
    # Compare
    if len(results) >= 2:
        compare_results(results)
        save_results(results)
    else:
        print("\nNot enough results to compare")
