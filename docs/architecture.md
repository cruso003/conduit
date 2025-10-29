# Conduit Architecture

This document explains the internal architecture of Conduit.

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Conduit Server                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   HTTP/SSE   │  │  MCP Protocol │  │ ML Inference │  │
│  │    Layer     │  │     Layer     │  │    Layer     │  │
│  └──────┬───────┘  └──────┬────────┘  └──────┬──────┘  │
│         │                 │                   │         │
│  ┌──────┴─────────────────┴───────────────────┴──────┐  │
│  │              Request Router                       │  │
│  └──────┬───────────────────────────────────────┬────┘  │
│         │                                       │       │
│  ┌──────┴──────┐                         ┌─────┴────┐  │
│  │  Parallel   │                         │  Event   │  │
│  │  Workers    │                         │   Loop   │  │
│  └──────┬──────┘                         └─────┬────┘  │
│         │                                       │       │
│  ┌──────┴───────────────────────────────────────┴────┐  │
│  │            Network Layer (epoll/kqueue)          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Network Layer

**Responsibilities:**

- TCP socket management
- Non-blocking I/O via epoll (Linux) or kqueue (macOS)
- Connection lifecycle management
- Low-level buffer handling

**Key Files:**

- `conduit/net/socket.codon` - Socket abstraction
- `conduit/net/epoll.codon` - Event loop implementation
- `conduit/net/connection.codon` - Connection state machine

**Design Decisions:**

- Edge-triggered epoll for maximum efficiency
- Zero-copy where possible
- Buffer pooling to reduce allocations
- Direct C FFI for system calls (no overhead)

### 2. HTTP Layer

**Responsibilities:**

- HTTP/1.1 protocol parsing
- Request/response formatting
- SSE streaming
- Header management

**Key Files:**

- `conduit/http/request.codon` - HTTP request parser
- `conduit/http/response.codon` - HTTP response builder
- `conduit/http/router.codon` - Route matching
- `conduit/http/sse.codon` - Server-Sent Events

**Design Decisions:**

- Minimal HTTP parser (only what we need for speed)
- Streaming-first design
- Connection reuse (keep-alive)
- Efficient header lookups

### 3. MCP Layer

**Responsibilities:**

- JSON-RPC message handling
- MCP protocol implementation
- Tool registration and execution
- Transport abstraction (SSE, stdio)

**Key Files:**

- `conduit/mcp/protocol.codon` - MCP message types
- `conduit/mcp/server.codon` - MCP server implementation
- `conduit/mcp/sse_transport.codon` - SSE transport
- `conduit/mcp/stdio_transport.codon` - stdio transport

**Design Decisions:**

- Transport-agnostic core
- Async tool execution
- Streaming support for long-running operations

### 4. ML Layer

**Responsibilities:**

- Model loading and caching
- Batch inference
- GPU acceleration
- Request batching

**Key Files:**

- `conduit/ml/model.codon` - Model interface
- `conduit/ml/registry.codon` - Model management
- `conduit/ml/batch.codon` - Batch processing
- `conduit/ml/parallel.codon` - Parallel inference

**Design Decisions:**

- Lazy model loading
- LRU cache for memory management
- Native NumPy integration
- GPU kernel support via `@gpu.kernel`

## Request Flow

### HTTP Request

```
1. Client connects
   └─> epoll detects EPOLLIN on server socket

2. Accept connection
   └─> Create Connection object
   └─> Add to epoll with EPOLLIN | EPOLLOUT

3. Read data (non-blocking)
   └─> Accumulate in read buffer
   └─> Parse HTTP request when complete

4. Route request
   └─> Match path and method
   └─> Submit to worker pool

5. Process in parallel worker
   └─> Execute handler
   └─> Build response

6. Write response (non-blocking)
   └─> Buffer data
   └─> Write when socket ready (EPOLLOUT)

7. Close or reuse connection
   └─> Keep-alive: wait for next request
   └─> Close: remove from epoll
```

### SSE Streaming

```
1. Client connects to SSE endpoint
   └─> Send SSE headers
   └─> Keep connection open

2. Create SSE connection object
   └─> Add to connection registry
   └─> Start event stream generator

3. Events arrive
   └─> Format as SSE (data: ...\n\n)
   └─> Write to socket
   └─> Repeat

4. Keepalive
   └─> Send comment every 30s
   └─> Detect disconnections

5. Close
   └─> Clean up resources
   └─> Remove from registry
```

### MCP Request

```
1. Client establishes SSE connection
   └─> GET /mcp/sse
   └─> Receive connection ID

2. Client sends MCP request
   └─> POST /mcp with connection ID
   └─> Parse JSON-RPC message

3. Handle request
   └─> Route to appropriate handler
   └─> initialize, tools/list, tools/call, etc.

4. Execute tool (if tools/call)
   └─> Find tool in registry
   └─> Validate parameters
   └─> Execute handler

5. Send response via SSE
   └─> Format as JSON-RPC
   └─> Send over SSE connection
   └─> Client receives result
```

## Concurrency Model

### Event Loop (Main Thread)

- Handles all I/O via epoll
- Accepts connections
- Reads/writes data
- Delegates work to workers

### Worker Pool

- Processes requests in parallel
- Uses Codon's `@par` directive
- No GIL = true parallelism
- Dynamic work stealing

**Example:**

```python
@par(schedule='dynamic', num_threads=16)
for i in range(len(requests)):
    process_request(requests[i])
```

### Threading Model

```
Main Thread (Event Loop)
├─> Worker 1: Processing request A
├─> Worker 2: Processing request B
├─> Worker 3: Processing request C
├─> ...
└─> Worker 16: Processing request P

No GIL = All workers run in parallel
```

## Memory Management

### Buffer Pooling

- Pre-allocate buffers
- Reuse for connections
- Reduce malloc/free overhead

```python
class BufferPool:
    available: list[ptr[byte]]

    def acquire(self) -> ptr[byte]:
        return self.available.pop() or allocate_new()

    def release(self, buffer: ptr[byte]):
        self.available.append(buffer)
```

### Model Caching

- LRU eviction policy
- Memory limits
- Lazy loading

```python
class ModelRegistry:
    models: dict[str, Model]
    max_memory: int

    def load(self, name: str) -> Model:
        if model not in cache:
            if would_exceed_limit:
                evict_lru()
            load_model()
        return cached_model
```

## Performance Optimizations

### Zero-Copy Techniques

- Direct socket buffer access
- Minimize data copying
- Use pointers where safe

### Connection Pooling

- Reuse connections (HTTP keep-alive)
- Avoid connection overhead
- TCP Fast Open support (future)

### Batch Processing

- Group requests for ML inference
- Amortize overhead
- Better GPU utilization

### Edge-Triggered epoll

- Only notified on state changes
- More efficient than level-triggered
- Requires careful handling

## Benchmarking Strategy

### Key Metrics

1. **Throughput**: Requests per second
2. **Latency**: p50, p95, p99 response times
3. **Concurrency**: Max concurrent connections
4. **Memory**: Per-connection overhead
5. **CPU**: Utilization under load

### Tools

- `wrk` for HTTP benchmarking
- Custom MCP benchmarking tool
- `perf` for profiling
- `valgrind` for memory analysis

---

## Future Improvements

- [ ] HTTP/2 support
- [ ] WebSocket implementation
- [ ] io_uring on Linux 5.1+
- [ ] QUIC/HTTP/3 (ambitious)
- [ ] Custom memory allocator
- [ ] SIMD optimizations

---

For implementation details, see the source code in `conduit/`.
