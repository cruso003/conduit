# Priority Plan - Week 13: MCP Implementation Kickoff

**Week Starting**: November 4, 2025  
**Sprint Goal**: Begin MCP protocol implementation - the strategic differentiator  
**Target**: Foundation for v1.1 "The MCP Release"

---

## 🎯 Strategic Context

### Why MCP First?

1. **Unique Market Position**: First compile-time optimized MCP server framework
2. **First-Mover Advantage**: MCP ecosystem is young, growing rapidly with AI tooling
3. **Natural Fit**: Existing compile-time route optimization → perfect for tool registration
4. **Compelling Value Prop**: "Handle 10,000+ concurrent Claude Desktop connections"
5. **Differentiator**: Generic web frameworks exist; compile-time MCP frameworks don't

### Success Metrics

- ✅ JSON-RPC 2.0 request/response handling
- ✅ Basic tool registration system (`@mcp.tool()` decorator)
- ✅ `tools/list` endpoint working
- ✅ `tools/call` endpoint working
- ✅ At least 1 working example MCP server
- ✅ Compile-time tool detection (plugin integration)

---

## 📅 Week 13 Daily Plan

### Day 1 (Monday): Research & Design

**Goal**: Understand MCP spec thoroughly, design architecture

#### Tasks

- [ ] **Deep dive MCP specification**

  - Read official MCP docs (protocol, transports, tool schema)
  - Study TypeScript SDK implementation
  - Study Python SDK implementation
  - Document key differences from HTTP/REST

- [ ] **Design Conduit MCP architecture**

  - Sketch decorator API (`@mcp.tool()`, `@mcp.prompt()`, `@mcp.resource()`)
  - Design tool schema format (how to express input/output types)
  - Plan plugin integration (compile-time tool detection)
  - Design internal tool registry

- [ ] **Create technical spec document**
  - File: `docs/technical/MCP_IMPLEMENTATION_SPEC.md`
  - Include: Architecture diagram, API design, plugin flow, examples

#### Deliverables

- `docs/technical/MCP_IMPLEMENTATION_SPEC.md` (design document)
- List of dependencies/requirements
- Decision: stdio vs SSE transport first (recommendation: stdio - simpler)

---

### Day 2 (Tuesday): JSON-RPC 2.0 Core

**Goal**: Implement JSON-RPC 2.0 message handling

#### Tasks

- [ ] **Create MCP module structure**

  ```
  conduit/mcp/
  ├── __init__.codon
  ├── jsonrpc.codon       # JSON-RPC 2.0 protocol
  ├── protocol.codon      # MCP protocol layer
  ├── tools.codon         # Tool registration/execution
  └── server.codon        # MCP server (stdio transport)
  ```

- [ ] **Implement JSON-RPC 2.0 parser**

  - Request format: `{"jsonrpc": "2.0", "id": 1, "method": "...", "params": {...}}`
  - Response format: `{"jsonrpc": "2.0", "id": 1, "result": {...}}`
  - Error format: `{"jsonrpc": "2.0", "id": 1, "error": {"code": -32600, "message": "..."}}`
  - Notification format (no id, no response expected)

- [ ] **Create test suite**
  - `tests/test_jsonrpc.codon`
  - Test: Parse valid request
  - Test: Parse notification
  - Test: Generate response
  - Test: Generate error
  - Test: Invalid JSON handling

#### Deliverables

- `conduit/mcp/jsonrpc.codon` (complete JSON-RPC implementation)
- `tests/test_jsonrpc.codon` (passing tests)

---

### Day 3 (Wednesday): Tool Registration System

**Goal**: Implement tool registration and storage

#### Tasks

- [ ] **Design tool schema**

  ```python
  class MCPTool:
      name: str
      description: str
      input_schema: str  # JSON schema as string
      handler: Function  # Reference to handler function
  ```

- [ ] **Implement tool registry**

  - Global tool storage (compile-time + runtime)
  - Tool registration function
  - Tool lookup by name
  - Tool validation

- [ ] **Create decorator API**

  ```python
  from conduit.mcp import MCPServer

  mcp = MCPServer()

  @mcp.tool(
      name="get_weather",
      description="Get current weather for a location",
      input_schema={
          "type": "object",
          "properties": {
              "location": {"type": "string"}
          },
          "required": ["location"]
      }
  )
  def get_weather(location: str) -> str:
      return f"Weather in {location}: Sunny, 72°F"
  ```

- [ ] **Test tool registration**
  - `tests/test_mcp_tools.codon`
  - Test: Register tool
  - Test: Lookup tool by name
  - Test: Multiple tools
  - Test: Duplicate name detection

#### Deliverables

- `conduit/mcp/tools.codon` (tool registry + decorator)
- `tests/test_mcp_tools.codon` (passing tests)
- Working example: `examples/mcp_tool_registration.codon`

---

### Day 4 (Thursday): MCP Protocol Methods

**Goal**: Implement `tools/list` and `tools/call`

#### Tasks

- [ ] **Implement `tools/list` handler**

  - Returns list of all registered tools
  - Format: JSON array of tool schemas
  - Include: name, description, input_schema

- [ ] **Implement `tools/call` handler**

  - Parse: tool name + arguments from request
  - Validate: tool exists, arguments match schema
  - Execute: call tool handler function
  - Return: tool result or error

- [ ] **Create MCP protocol layer**

  - `conduit/mcp/protocol.codon`
  - Route JSON-RPC methods to handlers
  - Handle `initialize` handshake
  - Handle `tools/list`
  - Handle `tools/call`

- [ ] **Test protocol methods**
  - `tests/test_mcp_protocol.codon`
  - Test: initialize handshake
  - Test: tools/list returns all tools
  - Test: tools/call executes tool
  - Test: tools/call with invalid tool name
  - Test: tools/call with invalid arguments

#### Deliverables

- `conduit/mcp/protocol.codon` (MCP protocol handlers)
- `tests/test_mcp_protocol.codon` (passing tests)

---

### Day 5 (Friday): stdio Transport + First Example

**Goal**: Complete stdio transport, build working MCP server

#### Tasks

- [ ] **Implement stdio transport**

  - Read JSON-RPC messages from stdin (line-delimited)
  - Write responses to stdout
  - Handle message framing (newline-separated JSON)
  - Error handling (invalid messages)

- [ ] **Create MCPServer class**

  ```python
  class MCPServer:
      def __init__(self):
          self.tools = []

      def tool(self, name, description, input_schema):
          # Decorator for tool registration
          ...

      def run_stdio(self):
          # Main loop: read stdin, process, write stdout
          ...
  ```

- [ ] **Build complete example**

  - `examples/mcp_filesystem_server.codon`
  - Tools: `list_directory`, `read_file`, `write_file`
  - Full MCP server running over stdio
  - README with instructions to test with MCP Inspector

- [ ] **Test end-to-end**

  - Manual testing with MCP Inspector
  - Test: List tools
  - Test: Call list_directory
  - Test: Call read_file
  - Test: Error handling

- [ ] **Documentation**
  - Update `docs/ROADMAP.md` with MCP progress
  - Create `docs/MCP_QUICKSTART.md` (basic usage guide)
  - Add MCP section to main `README.md`

#### Deliverables

- `conduit/mcp/server.codon` (complete stdio server)
- `examples/mcp_filesystem_server.codon` (working example)
- `docs/MCP_QUICKSTART.md` (getting started guide)
- Updated `README.md` with MCP feature

---

## 🎯 End-of-Week Success Criteria

### Must Have ✅

- [ ] JSON-RPC 2.0 parser working
- [ ] Tool registration decorator working
- [ ] `tools/list` returns registered tools
- [ ] `tools/call` executes tools and returns results
- [ ] stdio transport functional
- [ ] At least 1 complete example MCP server
- [ ] All tests passing

### Nice to Have 🌟

- [ ] Plugin integration started (compile-time tool detection)
- [ ] 2-3 example MCP servers (filesystem, calculator, simple DB)
- [ ] Performance baseline (tools/call latency)
- [ ] Error handling comprehensive

### Stretch Goals 🚀

- [ ] SSE transport started
- [ ] `prompts/list` and `prompts/get` (if time allows)
- [ ] Benchmarks vs Python/TypeScript MCP SDKs

---

## 📊 Progress Tracking

### Daily Standup Questions

1. What did I complete yesterday?
2. What am I working on today?
3. Any blockers?

### End-of-Day Checklist

- [ ] Code committed to feature branch
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Tomorrow's tasks reviewed

---

## 🔧 Technical Decisions

### Transport Priority

**Decision**: Start with stdio transport

- **Why**: Simpler than SSE, no HTTP server needed
- **Benefit**: Faster to implement, easier to test
- **Later**: Add SSE in Week 14 (can reuse HTTP server)

### Tool Schema Format

**Decision**: Use JSON Schema strings (Dict[str, str] for now)

- **Why**: Aligns with MCP spec
- **Limitation**: v1.0 JSON parser (Dict[str,str] only)
- **Later**: Enhance JSON parser for nested schemas in v1.2

### Plugin Integration Timing

**Decision**: Manual registration first, plugin integration Week 14

- **Why**: Get protocol working first, optimize second
- **Benefit**: Can validate MCP protocol without plugin complexity
- **Later**: Plugin auto-detects `@mcp.tool()` decorators

---

## 🎬 Week 14 Preview (Nov 11-15)

### SSE Transport + Plugin Integration

- Implement SSE transport (reuse HTTP server)
- Plugin: Compile-time tool detection
- Plugin: Generate optimal tool dispatch code
- Example: MCP server with both stdio and SSE transports
- Benchmarking: Conduit vs Python/TypeScript MCP SDKs

### Week 15 Preview (Nov 18-22)

- Additional MCP features (`prompts`, `resources`)
- Polish and documentation
- Blog post: "Building the world's fastest MCP framework"
- **v1.1 Release Candidate**

---

## 📚 Resources

### MCP Specification

- Official docs: https://modelcontextprotocol.io/
- Protocol spec: https://spec.modelcontextprotocol.io/
- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Python SDK: https://github.com/modelcontextprotocol/python-sdk

### Testing Tools

- MCP Inspector: https://github.com/modelcontextprotocol/inspector
- JSON-RPC test suites
- Claude Desktop (for real-world testing)

### Conduit Context

- Existing work: `examples/mcp_server.codon`, `examples/mcp_demo_server.codon`
- Plugin architecture: `plugins/conduit/conduit.cpp`
- HTTP foundation: `conduit/framework/conduit.codon`

---

## 🎉 Motivation

**This week launches Conduit's strategic differentiator!**

By Week 13 end:

- First compile-time optimized MCP framework exists
- Working MCP servers in Codon
- Foundation for "10,000 concurrent connections" claim

By v1.1 (Week 15):

- Complete MCP implementation
- Published benchmarks showing superiority
- Ready for HN launch: "Show HN: Conduit - 5x faster MCP servers"

**Let's build something the AI ecosystem has never seen before.** 🚀

---

**Status**: 📋 Planning  
**Next Action**: Day 1 - MCP spec research and architecture design  
**Accountability**: Daily commits to `feature/mcp-implementation` branch
