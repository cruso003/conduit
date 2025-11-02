# Changelog

All notable changes to Conduit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for v1.1

- Runtime path parameter matching (`/users/:id`)
- MCP protocol implementation
- Additional middleware (authentication, rate limiting)
- WebSocket support

### Planned for v2.0

- Trie-based routing (2-3x additional speedup)
- Advanced query parameter analysis
- Route conflict detection at compile time
- ML model serving integration

---

## [1.0.0] - 2025-11-03 - **Production Ready** 🚀

### 🎉 Major Release

First production-ready release of Conduit with complete compile-time routing optimization and framework integration.

### Added

#### Core Framework

- ✅ **HTTP/1.1 Server**: Full HTTP server with request/response handling
- ✅ **Routing Decorators**: `@app.get()`, `@app.post()`, `@app.put()`, `@app.delete()`
- ✅ **Query Parameters**: Automatic query string parsing (`request.query`)
- ✅ **JSON Parsing**: Request body JSON parsing (`request.parse_json()`)
- ✅ **JSON Responses**: Response helper (`response.json(data)`)
- ✅ **Error Handling**: 404 and 500 error responses
- ✅ **Header Management**: Request/response header handling

#### Compiler Plugin (2x Performance)

- ✅ **Compile-Time Routing**: Routes detected and optimized at compile time
- ✅ **Perfect Hash Tables**: O(1) route lookup with 100% efficiency
- ✅ **Method Bucketing**: 2x speedup via method-based dispatch
- ✅ **Handler Linking**: 100% success rate linking handlers to routes
- ✅ **Type-Safe Dispatch**: HTTPRequest/HTTPResponse type preservation

#### Middleware System

- ✅ **Middleware Chain**: Post-processing middleware execution
- ✅ **Logger Middleware**: Request/response logging
- ✅ **CORS Middleware**: Cross-origin resource sharing headers
- ✅ **Timing Middleware**: Response time tracking
- ✅ **Custom Middleware**: Easy to create custom middleware

#### Auto-Documentation

- ✅ **Swagger UI**: Interactive API documentation at `/docs`
- ✅ **OpenAPI 3.0**: Full OpenAPI specification at `/openapi.json`
- ✅ **Auto-Discovery**: Automatic route detection and documentation
- ✅ **Branded UI**: Custom Conduit styling with gradient header
- ✅ **Enable with One Call**: `app.enable_docs(title, version, description)`

### Performance

**Routing Performance** (Compiler Plugin):

- Small apps (4 routes): 1.0x baseline
- Medium apps (10 routes): **1.4x faster**
- Large apps (100 routes): **1.8x faster**
- Enterprise apps (1000 routes): **2.0x faster**

**Success Metrics**:

- Handler linking: **100%** success rate (14/14 tests)
- Perfect hash efficiency: **100%** (zero wasted slots)
- Route detection: **100%** accuracy

### Examples

- ✅ `examples/hello_world.codon` - Minimal hello world server
- ✅ `examples/echo_server.codon` - Echo server with POST
- ✅ `examples/api_with_docs.codon` - Full API with auto-documentation
- ✅ `tests/test_middleware.codon` - Middleware integration tests
- ✅ `tests/test_autodocs.codon` - Auto-documentation tests

### Documentation

- ✅ **QUICKSTART.md**: 5-minute getting started guide
- ✅ **API_REFERENCE.md**: Complete API documentation
- ✅ **docs/framework-guide.md**: Comprehensive framework guide
- ✅ **docs/middleware-implementation.md**: Middleware system details
- ✅ **docs/plugin/PLUGIN_COMPLETE.md**: Plugin architecture and internals
- ✅ **docs/ROADMAP.md**: Development roadmap and future plans

### Known Limitations

1. **Path Parameters**: Pattern detection works (`:id` syntax), but runtime matching not yet implemented

   - Workaround: Use static routes for v1.0
   - Planned for: v1.1

2. **Middleware**: Post-processing only (no pre-processing or short-circuit)

   - Reason: Codon type system constraints
   - Still useful for: Logging, CORS, headers, timing

3. **JSON**: Dict[str, str] only (no nested objects or arrays)
   - Workaround: Use string conversion for complex data
   - Sufficient for: Most REST APIs

### Breaking Changes

None - This is the first stable release.

### Migration from v0.2.0

If upgrading from v0.2.0 (plugin-only release):

1. Update decorator usage to framework style:

```python
# Old (v0.2.0 - plugin test only)
def add_route_metadata(pattern, method, handler_name):
    pass

# New (v1.0.0 - framework decorators)
from conduit import Conduit
app = Conduit()

@app.get("/users")
def list_users(request):
    return HTTPResponse().json({"users": "..."})
```

2. Import HTTPRequest and HTTPResponse:

```python
from conduit.http.request import HTTPRequest
from conduit.http.response import HTTPResponse
```

3. Build with framework plugin:

```bash
CODON_PATH=/path/to/conduit codon build -plugin conduit app.codon -o app
```

See [QUICKSTART.md](QUICKSTART.md) for complete examples.

---

## [0.2.0] - 2025-11-01 - **Compiler Plugin Complete** ✅

### Added

#### Compiler Plugin (Weeks 1-12)

- **Perfect Hash Routing** (Week 4): O(1) route lookup with 100% load factor
- **Method Bucketing** (Week 6 Day 1): 2x speedup via HTTP method pre-filtering
- **Handler Linking** (Week 5 Day 3): 100% success rate, zero overhead calls
- **Type System Support** (Week 6 Day 2): HTTPRequest/HTTPResponse detection with graceful fallback
- **Path Parameter Detection** (Week 6 Day 3): Automatic detection of `:id`, `:name` patterns
- **Performance Benchmarking** (Week 11): Comprehensive analysis proving 2x speedup
- **Complete Documentation** (Week 12): Plugin overview, migration guide, API reference

#### Documentation

- `docs/PLUGIN_COMPLETE.md`: Comprehensive plugin documentation
- `docs/PLUGIN_MIGRATION_GUIDE.md`: Framework integration guide
- `docs/WEEK_11_BENCHMARKING_RESULTS.md`: Performance analysis
- `docs/WEEK_12_SUMMARY.md`: Plugin completion summary
- `docs/blog/week-6-day-1-method-bucketing.md`: Developer blog post

#### Tests

- `tests/test_handler_linking.codon`: Handler linking validation (100% success)
- `tests/test_path_parameters.codon`: Path parameter detection (5/5 detected)
- `tests/test_method_bucketing.codon`: Method bucketing performance
- `tests/test_perfect_hash.codon`: Perfect hash efficiency

### Performance

- **Small apps (4 routes)**: 1.0x speedup (baseline)
- **Medium apps (10 routes)**: **1.4x speedup** ✅
- **Large apps (100+ routes)**: **2.0x speedup** ✅
- **Handler linking**: **100% success** (14/14 tests)
- **Perfect hash efficiency**: **100%** (zero wasted slots)

### Changed

- README updated with plugin features and performance metrics
- Roadmap updated to show completed plugin work (Weeks 1-12)
- Project branding standardized to **Conduit** throughout codebase

### Deferred

- **Weeks 7-10**: Postponed to **Plugin Phase 2** (after framework integration)
  - Week 7: Trie-based routing (2-3x additional speedup potential)
  - Week 8: Compile-time query parameter analysis
  - Week 9: Route conflict detection (compile-time warnings)
  - Week 10: Static analysis & optimization hints
  - **Note**: These are legitimate compiler optimizations that will be implemented after validating the current plugin with the framework in real-world applications.

---

## [0.1.0] - 2025-10-20

### Added

- Initial project structure
- Basic socket implementation
- HTTP request/response parsing (Milestone 2)
- Routing system foundation
- SSE streaming foundation
- Basic README and contributing guidelines
- Development roadmap

---

## Release Template

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- New features

### Changed

- Changes in existing functionality

### Deprecated

- Soon-to-be removed features

### Removed

- Removed features

### Fixed

- Bug fixes

### Security

- Security fixes
```
