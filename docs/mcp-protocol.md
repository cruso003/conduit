# Model Context Protocol (MCP) Implementation

## Overview

The Model Context Protocol (MCP) is a standardized protocol for AI assistants to discover and execute tools. Conduit implements MCP using JSON-RPC 2.0 for communication, enabling seamless integration with AI systems.

## Architecture

### Core Components

1. **Tool System** (`conduit/mcp/tool.codon`)

   - `Tool` class for defining executable tools
   - JSON serialization for tool discovery

2. **JSON-RPC Protocol** (`conduit/mcp/jsonrpc.codon`)

   - `JSONRPCRequest` - Incoming requests
   - `JSONRPCResponse` - Successful responses
   - `JSONRPCError` - Error responses with standard error codes

3. **Server Implementations**
   - Basic MCP server
   - Advanced tools server
   - Streaming SSE server

### Protocol Flow

```
Client                          MCP Server
  |                                  |
  |------ tools/list request ------->|
  |<----- tools/list response -------|
  |                                  |
  |------ tools/call request ------->|
  |        (with tool name)          |
  |<----- tool execution result -----|
```

## JSON-RPC 2.0 Specification

### Request Format

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "method": "tools/list | tools/call",
  "params": {
    "name": "tool_name",
    "param1": "value1"
  }
}
```

### Response Format

**Success:**

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "result": {
    "output": { ... }
  }
}
```

**Error:**

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  }
}
```

### Standard Error Codes

| Code   | Meaning          | Description                    |
| ------ | ---------------- | ------------------------------ |
| -32700 | Parse error      | Invalid JSON received          |
| -32600 | Invalid Request  | JSON-RPC format error          |
| -32601 | Method not found | Requested method doesn't exist |
| -32602 | Invalid params   | Invalid method parameters      |
| -32603 | Internal error   | Server-side processing error   |

## Creating Tools

### Basic Tool Definition

```codon
from conduit.mcp import Tool

# Define a tool
calculator = Tool(
    "calculator",
    "Performs basic arithmetic operations (e.g., '5+3', '10*2')"
)

# Tool discovery (tools/list response)
tools_json = calculator.to_json()
```

### Tool Implementation Pattern

```codon
# In your request handler
if "calculator" in request_body:
    # Extract parameters from request
    if '"expr":"' in request_body:
        start = request_body.find('"expr":"') + 8
        end = request_body.find('"', start)
        expr = request_body[start:end]

        # Execute tool logic
        if "+" in expr:
            parts = expr.split("+")
            result = str(float(parts[0]) + float(parts[1]))

        # Return JSON response
        output = '{"expression":"' + expr + '","result":"' + result + '"}'
```

### Advanced Tool with Error Handling

```codon
if "math_eval" in request_body:
    if '"expr":"' in request_body:
        start = request_body.find('"expr":"') + 8
        end = request_body.find('"', start)
        expr = request_body[start:end]

        if "/" in expr:
            parts = expr.split("/")
            if float(parts[1]) != 0.0:
                result = str(float(parts[0]) / float(parts[1]))
            else:
                output = '{"error":"Division by zero"}'
                continue

        output = '{"expression":"' + expr + '","result":"' + result + '"}'
    else:
        output = '{"error":"Missing expr parameter"}'
```

## Server Implementations

### 1. Simple MCP Server

**File:** `examples/mcp_simple_server.codon`

Basic MCP server with three tools:

- `calculator` - Basic arithmetic
- `echo` - Echo text back
- `timestamp` - Current Unix timestamp

**Usage:**

```bash
CODON_PATH=. codon run examples/mcp_simple_server.codon
```

**Test:**

```bash
# List tools
curl -X POST http://localhost:9090/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list"}'

# Execute calculator
curl -X POST http://localhost:9090/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"calculator","expr":"5+3"}}'
```

### 2. Modular MCP Server

**File:** `examples/mcp_modular_server.codon`

Demonstrates modular architecture using `conduit` imports:

- Imports `Socket` from `conduit.net`
- Imports `Tool`, `JSONRPCResponse`, `JSONRPCError` from `conduit.mcp`
- Same functionality as simple server but organized modularly

**Key Difference:**

```codon
# Modular approach
from conduit.net import Socket
from conduit.mcp import Tool, JSONRPCResponse, JSONRPCError

# vs Simple approach (all code inline)
# Socket class defined in same file
```

### 3. Advanced Tools Server

**File:** `examples/mcp_advanced_server.codon`

Production-ready tools for real-world applications:

**Tools:**

- `math_eval` - Full arithmetic expression evaluator
- `string_upper` - Convert text to uppercase
- `string_lower` - Convert text to lowercase
- `string_reverse` - Reverse a string
- `timestamp` - Current Unix timestamp

**Example:**

```bash
# String manipulation
curl -X POST http://localhost:9090/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"string_upper","text":"hello world"}}'

# Returns: {"jsonrpc":"2.0","id":"1","result":{"output":{"original":"hello world","result":"HELLO WORLD"}}}
```

### 4. Streaming Server (SSE)

**File:** `examples/mcp_streaming_server.codon`

Real-time tool execution with Server-Sent Events for long-running operations.

**Streaming Tools:**

- `stream_compute` - Progress updates for computations
- `stream_tokens` - Token-by-token text generation
- `stream_file` - File processing with stage updates

**Regular Tools:**

- `math_eval` - Quick math calculations
- `timestamp` - Instant timestamp

**SSE Format:**

```
event: progress
id: 1
data: {"step":1,"total":5,"progress":20}

event: progress
id: 2
data: {"step":2,"total":5,"progress":40}

event: done
id: final
data: {"status":"completed","total_steps":5}
```

**Usage:**

```bash
# Start server (runs on port 9091)
CODON_PATH=. codon run examples/mcp_streaming_server.codon

# Stream computation progress
curl --no-buffer 'http://localhost:9091/stream/compute?iterations=10'

# Stream token generation
curl --no-buffer 'http://localhost:9091/stream/tokens?text=Hello%20World'

# Stream file processing
curl --no-buffer 'http://localhost:9091/stream/file?filename=example.txt'

# Regular MCP tools (non-streaming)
curl -X POST http://localhost:9091/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"math_eval","expr":"25*4"}}'
```

## Best Practices

### 1. JSON String Construction

**❌ Avoid:** F-strings with nested braces (causes parser errors in Codon)

```codon
output = f'{{"key":"{value}"}}'  # SYNTAX ERROR
```

**✅ Use:** String concatenation

```codon
output = '{"key":"' + value + '"}'
```

### 2. Error Handling

Always validate inputs and return proper error messages:

```codon
if "text" in request_body:
    # Extract parameter
    if '"text":"' in request_body:
        start = request_body.find('"text":"') + 8
        end = request_body.find('"', start)
        text = request_body[start:end]
        # Process...
    else:
        output = '{"error":"Missing text parameter"}'
else:
    # Return METHOD_NOT_FOUND error
    error = JSONRPCError("1", ERROR_METHOD_NOT_FOUND, "Tool not found")
```

### 3. Tool Discovery

Make tool names and descriptions clear:

```codon
Tool("math_eval", "Evaluate simple math expression (e.g., '5+3', '10*2')")
# Clear: Shows what it does AND how to use it

Tool("calculator", "Calculator")
# Unclear: Too vague
```

### 4. Running Servers

Always set `CODON_PATH` when using modular imports:

```bash
# From project root
CODON_PATH=. codon run examples/mcp_modular_server.codon

# Without CODON_PATH (will fail with import errors)
codon run examples/mcp_modular_server.codon  # ❌ Error
```

### 5. Port Configuration

Use `SO_REUSEADDR` to allow quick server restarts:

```codon
server = Socket()
server.setsockopt(1, 1)  # SO_REUSEADDR
server.bind(("127.0.0.1", 9090))
```

## SSE Streaming Implementation

### Event Types

Define clear event types for different stages:

```codon
def send_sse_event(client: Socket, event: str, data: str, id: str = ""):
    """Send a Server-Sent Event to the client"""
    msg = ""
    if event:
        msg += "event: " + event + "\n"
    if id:
        msg += "id: " + id + "\n"
    msg += "data: " + data + "\n\n"
    client.send(msg)
```

### Progress Updates

```codon
# Computation progress
for i in range(iterations):
    progress_data = '{"step":' + str(i+1) + ',"total":' + str(iterations) + ',"progress":' + str((i+1) * 100 // iterations) + '}'
    send_sse_event(client, "progress", progress_data, str(i+1))
    time.sleep(1)  # Simulate work

# Final completion
send_sse_event(client, "done", '{"status":"completed","total_steps":' + str(iterations) + '}', "final")
```

### Token Streaming

```codon
words = text.split(" ")
for i, word in enumerate(words):
    token_data = '{"token":"' + word + '","position":' + str(i) + '}'
    send_sse_event(client, "token", token_data, str(i))
    time.sleep(0.1)  # Natural pacing
```

## Testing

### Manual Testing with curl

```bash
# Test tool discovery
curl -X POST http://localhost:9090/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/list"}'

# Test tool execution
curl -X POST http://localhost:9090/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"calculator","expr":"15+27"}}'

# Test streaming (SSE)
curl --no-buffer 'http://localhost:9091/stream/compute?iterations=5'
```

### Expected Responses

**tools/list:**

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "tools": [
      { "name": "calculator", "description": "Performs basic arithmetic..." },
      { "name": "echo", "description": "Echo text back to user" },
      { "name": "timestamp", "description": "Get current Unix timestamp" }
    ]
  }
}
```

**tools/call:**

```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "result": {
    "output": {
      "expression": "15+27",
      "result": "42"
    }
  }
}
```

## Troubleshooting

### Import Errors

**Problem:** `cannot import name 'Socket' from 'conduit.net'`

**Solution:** Set `CODON_PATH` environment variable:

```bash
CODON_PATH=. codon run examples/mcp_modular_server.codon
```

### Port Already in Use

**Problem:** `Address already in use`

**Solution:**

1. Find and kill the process:

```bash
lsof -ti:9090 | xargs kill -9
```

2. Or use a different port:

```codon
server.bind(("127.0.0.1", 9091))  # Different port
```

### Syntax Errors with JSON

**Problem:** `error: unexpected indentation` or `syntax error expecting '('`

**Solution:** Don't use f-strings with nested braces:

```codon
# ❌ Wrong
output = f'{{"key":"{value}"}}'

# ✅ Correct
output = '{"key":"' + value + '"}'
```

### Segmentation Faults

**Problem:** Server crashes with segfault during tool execution

**Common Causes:**

1. C function imports causing memory issues
2. Invalid string operations
3. Missing error handling

**Solution:** Use standard library instead of C imports:

```codon
# ❌ Can cause segfaults
from C import getpid() -> int
from C import time() -> int as c_time

# ✅ Use standard library
import time
ts = int(time.time())
```

## Performance Considerations

### Socket Configuration

```codon
server = Socket()
server.setsockopt(1, 1)      # SO_REUSEADDR: Quick restarts
server.bind(("127.0.0.1", 9090))
server.listen(5)              # Backlog: 5 connections
```

### Request Handling

- Process requests sequentially (simple servers)
- For production: Consider connection pooling
- Stream large responses with SSE
- Use background processing for long operations

### Memory Management

```codon
# Close connections after each request
client.send(response)
client.close()  # Important: Free resources
```

## Integration Examples

### Python Client

```python
import requests
import json

# List available tools
response = requests.post(
    'http://localhost:9090/mcp',
    headers={'Content-Type': 'application/json'},
    json={
        'jsonrpc': '2.0',
        'id': '1',
        'method': 'tools/list'
    }
)
tools = response.json()['result']['tools']

# Call a tool
response = requests.post(
    'http://localhost:9090/mcp',
    headers={'Content-Type': 'application/json'},
    json={
        'jsonrpc': '2.0',
        'id': '2',
        'method': 'tools/call',
        'params': {
            'name': 'calculator',
            'expr': '100+50'
        }
    }
)
result = response.json()['result']['output']
print(result)  # {"expression":"100+50","result":"150"}
```

### JavaScript Client (SSE)

```javascript
const eventSource = new EventSource(
  "http://localhost:9091/stream/compute?iterations=10"
);

eventSource.addEventListener("progress", (e) => {
  const data = JSON.parse(e.data);
  console.log(`Progress: ${data.progress}%`);
});

eventSource.addEventListener("done", (e) => {
  const data = JSON.parse(e.data);
  console.log("Completed:", data);
  eventSource.close();
});
```

## Future Enhancements

### Planned Features

1. **Authentication & Authorization**

   - API key validation
   - Role-based tool access

2. **Advanced Tools**

   - File system operations
   - Database queries
   - External API integrations
   - Code execution sandboxing

3. **Performance**

   - Async request handling
   - Connection pooling
   - Request caching

4. **Monitoring**
   - Tool execution metrics
   - Error logging
   - Performance profiling

## References

- JSON-RPC 2.0 Specification: https://www.jsonrpc.org/specification
- Server-Sent Events: https://html.spec.whatwg.org/multipage/server-sent-events.html
- Model Context Protocol: https://modelcontextprotocol.io/

## Contributing

When adding new tools:

1. Define clear tool descriptions
2. Validate all input parameters
3. Return consistent JSON structures
4. Add error handling
5. Test with curl
6. Update this documentation
7. Add examples

## License

See project LICENSE file.
