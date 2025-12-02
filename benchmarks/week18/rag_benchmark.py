"""
Real-World RAG Application Benchmark
Tests complete RAG pipeline performance across frameworks

Workflow:
1. Load documents into vector database
2. Accept user query
3. Perform semantic search
4. Retrieve relevant documents
5. Generate response using retrieved context

Metrics:
- End-to-end query latency
- Documents indexed per second
- Search throughput
- Memory usage
"""

import time
import requests
import statistics
import json
import numpy as np
from typing import List, Dict
from dataclasses import dataclass


@dataclass
class RAGBenchmarkResult:
    """RAG benchmark results"""
    framework: str
    num_documents: int
    num_queries: int
    indexing_time: float
    query_latencies: List[float]
    memory_mb: float
    
    @property
    def docs_per_sec(self) -> float:
        """Documents indexed per second"""
        return self.num_documents / self.indexing_time
    
    @property
    def queries_per_sec(self) -> float:
        """Queries per second"""
        return self.num_queries / sum(self.query_latencies)
    
    @property
    def avg_query_latency(self) -> float:
        """Average query latency in ms"""
        return statistics.mean(self.query_latencies) * 1000
    
    @property
    def p95_query_latency(self) -> float:
        """95th percentile query latency in ms"""
        return statistics.quantiles(self.query_latencies, n=20)[18] * 1000


class RAGBenchmark:
    """Benchmark RAG application performance"""
    
    def __init__(self, port: int = 8080):
        self.port = port
        self.base_url = f"http://localhost:{port}"
        self.test_documents = self._generate_test_documents(1000)
        
    def _generate_test_documents(self, num_docs: int) -> List[Dict[str, str]]:
        """Generate synthetic documents for testing"""
        topics = [
            "machine learning", "web development", "data science",
            "cloud computing", "artificial intelligence", "cybersecurity",
            "mobile apps", "databases", "DevOps", "blockchain"
        ]
        
        documents = []
        for i in range(num_docs):
            topic = topics[i % len(topics)]
            doc = {
                "id": f"doc_{i}",
                "title": f"{topic.title()} Article {i}",
                "content": f"This is a comprehensive article about {topic}. "
                          f"It covers various aspects including fundamentals, "
                          f"advanced concepts, best practices, and real-world applications. "
                          f"Document ID: {i}. " * 5  # Make it longer
            }
            documents.append(doc)
        
        return documents
    
    def benchmark_indexing(self, framework: str) -> float:
        """Benchmark document indexing speed"""
        print(f"\n{framework} - Indexing {len(self.test_documents)} documents...")
        
        start = time.time()
        
        try:
            response = requests.post(
                f"{self.base_url}/rag/index",
                json={"documents": self.test_documents},
                timeout=60
            )
            response.raise_for_status()
        except Exception as e:
            print(f"Indexing failed: {e}")
            return 0
        
        indexing_time = time.time() - start
        docs_per_sec = len(self.test_documents) / indexing_time
        
        print(f"  Indexed in {indexing_time:.2f}s ({docs_per_sec:.0f} docs/sec)")
        
        return indexing_time
    
    def benchmark_queries(self, framework: str, num_queries: int = 100) -> List[float]:
        """Benchmark RAG query performance"""
        print(f"\n{framework} - Running {num_queries} queries...")
        
        test_queries = [
            "What is machine learning?",
            "How does web development work?",
            "Explain data science concepts",
            "What is cloud computing?",
            "Tell me about artificial intelligence",
            "How does blockchain work?",
            "What are mobile app best practices?",
            "Explain database optimization",
            "What is DevOps?",
            "Cybersecurity fundamentals"
        ]
        
        latencies = []
        
        for i in range(num_queries):
            query = test_queries[i % len(test_queries)]
            
            start = time.time()
            try:
                response = requests.post(
                    f"{self.base_url}/rag/query",
                    json={"query": query, "top_k": 5},
                    timeout=10
                )
                response.raise_for_status()
                latencies.append(time.time() - start)
            except Exception as e:
                print(f"Query {i} failed: {e}")
            
            if (i + 1) % 20 == 0:
                print(f"  Progress: {i + 1}/{num_queries}")
        
        avg_latency = statistics.mean(latencies) * 1000 if latencies else 0
        print(f"  Avg query latency: {avg_latency:.2f}ms")
        
        return latencies
    
    def run_full_benchmark(self, framework: str) -> RAGBenchmarkResult:
        """Run complete RAG benchmark"""
        print(f"\n{'='*60}")
        print(f"RAG Benchmark: {framework}")
        print(f"{'='*60}")
        
        # Indexing
        indexing_time = self.benchmark_indexing(framework)
        
        # Queries
        query_latencies = self.benchmark_queries(framework, num_queries=100)
        
        result = RAGBenchmarkResult(
            framework=framework,
            num_documents=len(self.test_documents),
            num_queries=len(query_latencies),
            indexing_time=indexing_time,
            query_latencies=query_latencies,
            memory_mb=0  # Would measure with psutil
        )
        
        print(f"\n{framework} Results:")
        print(f"  Indexing: {result.docs_per_sec:.0f} docs/sec")
        print(f"  Queries: {result.queries_per_sec:.0f} queries/sec")
        print(f"  Avg Latency: {result.avg_query_latency:.2f}ms")
        print(f"  P95 Latency: {result.p95_query_latency:.2f}ms")
        
        return result


def create_python_rag_server():
    """Create Python RAG server using LangChain/FAISS"""
    code = '''
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI()

# In-memory vector store
class SimpleVectorStore:
    def __init__(self):
        self.documents = []
        self.vectorizer = TfidfVectorizer(max_features=100)
        self.vectors = None
    
    def index(self, documents: List[Dict]):
        self.documents = documents
        texts = [d["content"] for d in documents]
        self.vectors = self.vectorizer.fit_transform(texts).toarray()
    
    def search(self, query: str, top_k: int = 5):
        query_vec = self.vectorizer.transform([query]).toarray()
        similarities = cosine_similarity(query_vec, self.vectors)[0]
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            results.append({
                "document": self.documents[idx],
                "score": float(similarities[idx])
            })
        return results

vector_store = SimpleVectorStore()

class IndexRequest(BaseModel):
    documents: List[Dict]

class QueryRequest(BaseModel):
    query: str
    top_k: int = 5

@app.post("/rag/index")
def index_documents(request: IndexRequest):
    vector_store.index(request.documents)
    return {"status": "success", "indexed": len(request.documents)}

@app.post("/rag/query")
def query_rag(request: QueryRequest):
    results = vector_store.search(request.query, request.top_k)
    
    # Simulate response generation
    context = " ".join([r["document"]["content"][:100] for r in results])
    response = f"Based on the retrieved context: {context[:200]}..."
    
    return {
        "query": request.query,
        "response": response,
        "sources": results
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="error")
'''
    
    with open("/tmp/rag_python.py", "w") as f:
        f.write(code)


def create_conduit_rag_server():
    """Create Conduit RAG server using native vector DB"""
    code = '''
from conduit import Conduit
from conduit.ml.vectors import VectorDB, VectorDocument

app = Conduit()
vector_db = VectorDB()

@app.post("/rag/index")
def index_documents(req, res):
    data = req.json()
    documents = data["documents"]
    
    # Add documents to vector DB
    for doc in documents:
        vector_db.add(VectorDocument(
            id=doc["id"],
            content=doc["content"],
            metadata={"title": doc["title"]}
        ))
    
    res.json({"status": "success", "indexed": len(documents)})

@app.post("/rag/query")
def query_rag(req, res):
    data = req.json()
    query = data["query"]
    top_k = data.get("top_k", 5)
    
    # Search vector DB
    results = vector_db.search(query, k=top_k)
    
    # Generate response
    context = " ".join([r.document.content[:100] for r in results])
    response = f"Based on the retrieved context: {context[:200]}..."
    
    res.json({
        "query": query,
        "response": response,
        "sources": [{"document": r.document.metadata, "score": r.score} for r in results]
    })

if __name__ == "__main__":
    app.run(port=8080)
'''
    
    with open("/tmp/rag_conduit.codon", "w") as f:
        f.write(code)


def compare_rag_results(results: List[RAGBenchmarkResult]):
    """Compare RAG benchmark results"""
    print(f"\n{'='*80}")
    print("RAG APPLICATION COMPARISON")
    print(f"{'='*80}\n")
    
    baseline = results[0]
    
    print(f"{'Metric':<25} {'Python':<20} {'Conduit':<20} {'Speedup':<15}")
    print(f"{'-'*80}")
    
    for result in results[1:]:
        speedup_index = result.docs_per_sec / baseline.docs_per_sec
        speedup_query = result.queries_per_sec / baseline.queries_per_sec
        speedup_latency = baseline.avg_query_latency / result.avg_query_latency
        
        print(f"{'Indexing Speed':<25} {baseline.docs_per_sec:>18.0f}  {result.docs_per_sec:>18.0f}  {speedup_index:>13.1f}x")
        print(f"{'Query Throughput':<25} {baseline.queries_per_sec:>18.0f}  {result.queries_per_sec:>18.0f}  {speedup_query:>13.1f}x")
        print(f"{'Avg Query Latency':<25} {baseline.avg_query_latency:>17.2f}ms {result.avg_query_latency:>17.2f}ms {speedup_latency:>13.1f}x")
        print(f"{'P95 Query Latency':<25} {baseline.p95_query_latency:>17.2f}ms {result.p95_query_latency:>17.2f}ms {baseline.p95_query_latency/result.p95_query_latency:>13.1f}x")
    
    print(f"\n{'='*80}")


if __name__ == "__main__":
    print("Real-World RAG Application Benchmark")
    print("Testing document indexing and query performance\n")
    
    bench = RAGBenchmark()
    
    # Would run benchmarks for both frameworks
    # For now, create the server implementations
    create_python_rag_server()
    create_conduit_rag_server()
    
    print("RAG server implementations created")
    print("Run with actual servers to get benchmark results")
