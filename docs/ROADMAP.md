# Conduit Development Roadmap

**Updated**: November 1, 2025  
**Current Phase**: Plugin Phase 1 ✅ **COMPLETE** → Framework Integration 🚧 **NEXT**

---

## Overview

Conduit development follows a phased approach:

1. **✅ Plugin Phase 1** (COMPLETE): Core routing optimizations
2. **🚧 Framework Integration** (NEXT): Combine plugin with framework
3. **⏸️ Plugin Phase 2** (POSTPONED): Advanced compiler optimizations
4. **🔮 Future Phases**: MCP, ML, Production features

**Key Strategy**: Get plugin working with framework first, validate in real apps, THEN add advanced optimizations.

---

## ✅ Plugin Phase 1: COMPLETE (12 weeks)

**Duration**: Weeks 1-6, 11-12  
**Status**: ✅ Production Ready  
**Result**: 2x speedup proven, 100% success metrics

### Achievements

**Week 1**: Plugin Foundation ✅

- Created working Codon plugin
- Build system configured
- Hello World compilation

**Week 2**: Route Detection ✅

- Detect @app.get(), @app.post() decorators
- Extract method, path, handler names
- 100% route detection accuracy

**Week 3**: Dispatch Generation ✅

- Generate conduit_dispatch() function
- Create if/elif route matching
- Baseline dispatch working

**Week 4**: Perfect Hash Optimization ✅

- O(1) route lookup
- 100% load factor (zero wasted slots)
- Zero collision hash tables

**Week 5**: Handler Linking & Performance ✅

- Day 1: Jump table research (valuable findings)
- Day 2: String comparison optimization
- Day 3: Handler linking (100% success rate)
- Day 4: Performance analysis (20-50ns/request)

**Week 6**: Method Bucketing & Types ✅

- Day 1: Method bucketing (2x speedup proven)
- Day 2: HTTPRequest/HTTPResponse type support
- Day 3: Path parameter detection (/users/:id)

**Week 11**: Benchmarking & Validation ✅

- Comprehensive performance analysis
- Comparison with Flask, Express, Actix, Axum
- 2x speedup validation
- 100% success metrics documented

**Week 12**: Documentation & Polish ✅

- Complete plugin documentation
- Migration guide for framework integration
- Architecture diagrams
- API reference

### Performance Metrics

| Application Size | Routes | Speedup  | Status |
| ---------------- | ------ | -------- | ------ |
| Small            | 4      | 1.0x     | ✅     |
| Medium           | 10     | **1.4x** | ✅     |
| Large            | 100    | **1.8x** | ✅     |
| Enterprise       | 1000   | **2.0x** | ✅     |

**Success Rates**:

- Handler Linking: **100%** (14/14 tests)
- Perfect Hash: **100%** efficiency
- Path Parameters: **100%** detection (5/5)

---

## 🚧 Framework Integration Phase: NEXT (3 weeks)

**Goal**: Integrate plugin with framework, validate in real applications

**Why First**: Before adding more compiler optimizations, we need to:

1. Validate the plugin works end-to-end with the framework
2. Measure real-world performance improvements
3. Identify actual bottlenecks in production apps
4. Get user feedback on the initial 2x speedup

### Phase 1: Minimal Integration (1 week)

**Objective**: Get plugin dispatch working in framework

**Tasks**:

1. Add `add_route_metadata()` to framework decorators
2. Import `conduit_dispatch_bucketed()` in Conduit class
3. Replace runtime dispatch with plugin dispatch
4. Test basic routes (4-route app)

**Success Criteria**:

- [ ] Framework calls plugin-generated dispatch
- [ ] Basic routes work end-to-end
- [ ] Compilation successful with plugin
- [ ] Server starts and handles requests

### Phase 2: Type System & Parameters (1 week)

**Objective**: Full type safety and path parameters

**Tasks**:

1. Ensure HTTPRequest/HTTPResponse imported before plugin runs
2. Verify plugin finds types (not str fallback)
3. Implement `HTTPRequest.extract_params()`
4. Test multi-parameter routes (/users/:id/posts/:post_id)

**Success Criteria**:

- [ ] Type-safe dispatch confirmed
- [ ] Path parameters extracted correctly
- [ ] No type fallbacks to str
- [ ] Handler signatures use proper types

### Phase 3: Production Hardening (1 week)

**Objective**: Error handling, edge cases, real benchmarks

**Tasks**:

1. Add error middleware (404, 500)
2. Test edge cases (empty routes, conflicts)
3. Build 10-route + 100-route benchmark apps
4. Compare vs Flask/Express in real scenarios
5. Documentation and examples

**Success Criteria**:

- [ ] Error handling works correctly
- [ ] Edge cases handled gracefully
- [ ] > 1.4x speedup measured in real app
- [ ] Documentation complete

---

## ⏸️ Plugin Phase 2: POSTPONED (4+ weeks)

**Goal**: Advanced compiler optimizations (AFTER framework integration)

**Why Postponed**:

- Current 2x speedup is excellent baseline
- Need to validate plugin in real apps first
- Framework integration is higher priority
- These optimizations build on Phase 1 foundation

**Important**: These ARE legitimate compiler optimizations that WILL be implemented. Just postponed to ensure Phase 1 works well in production first.

### Week 7: Trie-based Routing (1 week)

**Objective**: 2-3x additional speedup via prefix tree

**Current State**: Method bucketing gives 2x speedup for 100+ routes

**Trie Potential**:

- Routes with shared prefixes: /api/v1/users, /api/v1/posts, /api/v1/comments
- Trie eliminates redundant prefix comparisons
- Expected: 4-6x total speedup (2x × 2-3x)

**Tasks**:

1. Implement prefix tree data structure
2. Generate trie-based dispatch in IR
3. Benchmark vs method bucketing
4. Optimize for common prefix patterns

**Success Criteria**:

- [ ] 2-3x speedup over method bucketing
- [ ] Especially fast for shared-prefix routes
- [ ] Maintains 100% handler linking
- [ ] Compatible with existing features

### Week 8: Compile-time Query Analysis (1 week)

**Objective**: Detect and optimize query parameter patterns

**Examples**:

- `/users?page=1&limit=10` → Detect pagination pattern
- `/search?q=term&filter=active` → Detect search pattern
- Generate type-safe query extraction code

**Tasks**:

1. Analyze route handlers for query parameter usage
2. Generate compile-time query parameter extraction
3. Create type-safe query parameter structs
4. Validate query parameters at compile time

**Success Criteria**:

- [ ] Query patterns detected automatically
- [ ] Type-safe query parameter extraction
- [ ] Compile-time validation
- [ ] Zero runtime overhead

### Week 9: Route Conflict Detection (1 week)

**Objective**: Warn about ambiguous/overlapping routes

**Problem Examples**:

```python
@app.get("/users/:id")    # Catches everything
@app.get("/users/new")    # Never reached! (conflict)

@app.get("/posts/:id")
@app.get("/posts/:slug")  # Ambiguous - which one?
```

**Tasks**:

1. Detect overlapping route patterns
2. Identify unreachable routes
3. Generate compile-time warnings
4. Suggest route reordering

**Success Criteria**:

- [ ] Detects all route conflicts
- [ ] Clear warning messages
- [ ] Suggests fixes
- [ ] Zero false positives

### Week 10: Static Analysis & Optimization (1 week)

**Objective**: Dead code elimination, hot path inlining, hints

**Features**:

1. **Dead Code Elimination**: Remove unreachable handlers
2. **Hot Path Inlining**: Inline most-used routes
3. **Optimization Hints**: Suggest improvements
4. **Route Statistics**: Compile-time route analysis

**Tasks**:

1. Analyze route reachability
2. Identify hot paths (most common routes)
3. Generate optimization hints
4. Implement selective inlining

**Success Criteria**:

- [ ] Dead code identified and removed
- [ ] Hot paths inlined correctly
- [ ] Useful optimization hints
- [ ] Smaller binary size

---

## 🔮 Additional Plugin Optimizations (Future)

**After Weeks 7-10, based on real-world needs**

### Jump Tables

**Objective**: Replace method string comparisons with jump table

**Current**: `if method == "GET" elif method == "POST"`  
**Future**: `jump_table[method_id]`

**Benefit**: Eliminate all method comparisons (theoretical 5-10x for many methods)

### SIMD Path Matching

**Objective**: Vectorized string comparison

**Current**: Byte-by-byte string comparison  
**Future**: SSE/AVX2 vector comparison

**Benefit**: 4-8x faster path matching on modern CPUs

### Parameter Extraction in IR

**Objective**: Move path parameter extraction to compile time

**Current**: Runtime string parsing  
**Future**: Compile-time IR generation

**Benefit**: Zero overhead parameter extraction

### Route Caching

**Objective**: Cache compiled routes across builds

**Current**: Recompile routes every build  
**Future**: Cache route dispatch between builds

**Benefit**: Faster compilation for large apps

---

## 🌐 Framework Milestones (Parallel Track)

**Note**: Framework development continues in parallel with plugin work

### Milestone 3: Router Integration (with Plugin Phase 2)

- Integrate plugin dispatch
- Add middleware system
- Add path parameter extraction
- Add query/body parsing

### Milestone 4: MCP + Auto-docs (Months 4-6)

- MCP protocol implementation
- stdio transport
- Auto-documentation generation
- Connection pooling

### Milestone 5: ML Inference (Months 7-9)

- Model loading and caching
- Batch inference
- GPU acceleration
- NumPy integration

### Milestone 6: Production Ready (Months 10-12)

- Authentication/authorization
- Rate limiting
- Metrics and monitoring
- WebSocket support

---

## Timeline Summary

```
✅ COMPLETE: Plugin Phase 1 (Weeks 1-6, 11-12)
   │
   ├─ 2x speedup proven
   ├─ 100% success metrics
   └─ Production-ready plugin

🚧 NEXT: Framework Integration (3 weeks)
   │
   ├─ Week 1: Minimal integration
   ├─ Week 2: Type system & parameters
   └─ Week 3: Production hardening

⏸️ POSTPONED: Plugin Phase 2 (4+ weeks)
   │
   ├─ Week 7: Trie routing (2-3x more)
   ├─ Week 8: Query analysis
   ├─ Week 9: Conflict detection
   └─ Week 10: Static analysis

🔮 FUTURE: Additional Optimizations
   │
   ├─ Jump tables
   ├─ SIMD matching
   ├─ IR parameter extraction
   └─ Route caching

🌐 PARALLEL: Framework Milestones
   │
   ├─ Milestone 3: Router integration
   ├─ Milestone 4: MCP + Auto-docs
   ├─ Milestone 5: ML Inference
   └─ Milestone 6: Production Ready
```

---

## Decision Rationale

### Why Postpone Weeks 7-10?

**NOT because they're unimportant!**

**Strategic Reasons**:

1. **Validate Phase 1 First**: Ensure 2x speedup works in real apps
2. **Framework Integration Priority**: Need plugin + framework working together
3. **Informed Decisions**: Real-world usage will reveal actual bottlenecks
4. **Incremental Value**: 2x speedup is already excellent; additional optimizations can wait
5. **Risk Management**: Don't over-optimize before validating baseline

**We WILL implement Weeks 7-10** once:

- Plugin is integrated with framework ✅
- Real applications are using it ✅
- We have production performance data ✅
- We know which optimizations matter most ✅

### Why These Optimizations Matter

**Week 7: Trie Routing**

- Real apps have route prefixes: `/api/v1/...`, `/admin/...`, `/public/...`
- Trie eliminates redundant prefix comparisons
- 2-3x additional speedup is significant

**Week 8: Query Analysis**

- Pagination, search, filtering are universal
- Type-safe query parameters prevent bugs
- Compile-time validation is valuable

**Week 9: Conflict Detection**

- Route conflicts are common bugs
- Compile-time detection saves debugging time
- Prevents production issues

**Week 10: Static Analysis**

- Dead code elimination reduces binary size
- Hot path inlining speeds up common routes
- Optimization hints guide developers

---

## Success Metrics

### Plugin Phase 1 ✅

- [x] 2x speedup for 100+ routes
- [x] 100% handler linking
- [x] 100% perfect hash efficiency
- [x] Complete documentation

### Framework Integration 🚧

- [ ] Plugin + framework working end-to-end
- [ ] > 1.4x speedup in real application
- [ ] Type-safe request/response handling
- [ ] Path parameters working correctly

### Plugin Phase 2 ⏸️

- [ ] 4-6x total speedup (2x × 2-3x)
- [ ] Query parameter optimization
- [ ] Route conflict detection
- [ ] Static analysis benefits

---

## 🔮 Future Phases (v1.1 - v2.0)

### v1.1: Model Context Protocol (MCP) - **Priority 1** 🚀

**Timeline**: Weeks 13-15 (December 2025)  
**Strategic Value**: Key differentiator - first compile-time optimized MCP framework  
**Status**: 📋 Planned (see `docs/PRIORITY_PLAN_WEEK_13.md`)

**Goals**:

- Implement production-ready MCP server support
- stdio + SSE transports
- Sub-10ms response latency (10x faster than Python)
- Prove "10x faster, 1/10th the cost" value proposition

**Features**:

- `@mcp.tool()` decorator for tool registration
- JSON-RPC 2.0 protocol implementation
- Automatic tool schema generation
- Built-in observability and monitoring
- Example MCP servers (filesystem, database, GitHub)

**Success Criteria**:

- ✅ Sub-10ms p99 latency
- ✅ 8,000+ requests/second (single server)
- ✅ 1,000+ concurrent AI agents supported
- ✅ 90% lower infrastructure costs vs Python
- ✅ Production examples and documentation

**Why This Matters**:

- MCP ecosystem growing rapidly (Anthropic backing)
- Conduit's compile-time optimization = perfect for MCP
- First-mover advantage in production-grade MCP frameworks
- Unique positioning in AI infrastructure market

---

### v1.2: Path Parameters - **Priority 2** ⚡

**Timeline**: Weeks 16-18 (January-February 2026)  
**Strategic Value**: Table stakes for REST API adoption  
**Status**: 📋 Designed (see `docs/technical/PATH_PARAMETERS_IMPLEMENTATION_PLAN.md`)

**Implementation**: Compile-time radix tree generation (unique approach!)

**Features**:

- Named parameters: `/users/:id`
- Multiple parameters: `/users/:id/posts/:post_id`
- Wildcard routes: `/files/*path`
- Compile-time route conflict detection
- Sub-500ns parameter extraction

**Success Criteria**:

- ✅ < 500ns/op for 5 parameters (competitive with Go's httprouter)
- ✅ Beat Python frameworks by 200x
- ✅ Zero runtime tree construction overhead
- ✅ Compile-time route conflict warnings

**Why This Matters**:

- Essential for REST APIs (can't grow without this)
- Opportunity to do something NO framework does (compile-time radix tree)
- Performance story gets even better

---

### v1.3: Benchmarks & Production Features - **Priority 3** 🛠️

**Timeline**: Months 4-6 (February-April 2026)  
**Focus**: Prove performance claims, enterprise readiness

**Benchmarking**:

- Comprehensive comparison vs FastAPI, Flask, Gin, Actix
- Real workflow benchmarks (code review agent, data analysis)
- Cost analysis at different scales
- Publish results at `conduit.dev/benchmarks`

**Production Features**:

- Enhanced middleware (authentication, rate limiting)
- WebSocket support
- Advanced monitoring/tracing
- Database connection pooling
- Request validation

**Conduit Cloud Beta** (Invite-Only):

- Test deployment automation with 20-50 early customers
- Validate pricing model ($99-299/month)
- Gather feedback on deployment experience
- Prove unit economics before scaling
- Build support processes and documentation

**Success Criteria**:

- ✅ 500+ production self-hosted users
- ✅ Published benchmarks showing 10-200x advantages
- ✅ 20-50 cloud beta customers
- ✅ $2K-5K MRR (validation, not profit)
- ✅ < 5 minute deploy time
- ✅ Positive NPS score

---

### v2.0: Advanced Optimizations & Cloud Launch - **Year 2** 🎯

**Timeline**: Months 6-12 (April-October 2026)  
**Focus**: Scale framework and business

**Plugin Phase 2** (Weeks 7-10 from original plan):

- Trie-based routing (2-3x additional speedup)
- Compile-time query parameter analysis
- Route conflict detection
- Static analysis & optimization hints

**Enterprise Features**:

- SOC2 compliance
- On-premises deployment options
- Advanced security features
- Professional services offering
- Dedicated support contracts

**Conduit Cloud Public Launch**:

- Open to all developers
- Automated infrastructure (no manual work)
- Multiple pricing tiers ($0 open source → $999/month)
- 99.9% SLA guarantee
- 24/7 support for paid tiers

**Success Criteria**:

- ✅ 4-6x total speedup vs baseline (2x × 2-3x)
- ✅ 1,000+ production deployments
- ✅ 100+ cloud customers
- ✅ $25K-100K MRR
- ✅ SOC2 certified
- ✅ Conference talks/recognition

**Why Wait for Cloud Public Launch**:

1. Framework must be battle-tested first (need 500+ users)
2. Infrastructure costs require revenue to cover
3. Support team needs to be hired and trained
4. Beta feedback should inform final product
5. Focus on framework excellence before distraction of cloud ops

---

## Strategic Reasoning: Cloud in Roadmap

### Why Include Cloud Now?

**1. Developer Expectations**

- Modern frameworks offer deployment solutions (Railway, Render, Fly.io prove this)
- "How do I deploy this?" is the #1 question after "How does it work?"
- Shows long-term commitment to developer experience

**2. Business Sustainability**

- Open source alone = $0 revenue (can't sustain development)
- Cloud = recurring revenue = can hire team, build faster
- Validates there's a business, not just a project

**3. Competitive Positioning**

- Having cloud in roadmap shows we're serious
- Competes with "deploy anywhere" messaging from others
- Developer mindshare: "They're thinking about the whole journey"

### Why NOT Launch Cloud Yet?

**1. Framework First**

- Must prove framework works (need 500+ users)
- Need to fix bugs, add features based on real usage
- Cloud = distraction from core product in Year 1

**2. Economics**

- Infrastructure costs upfront ($10K-50K for auto-scaling)
- Support requirements (24/7 coverage)
- Only 50-100 early adopters won't cover costs

**3. Focus**

- Better to do one thing great (framework) than two things mediocre
- Cloud requires dedicated team (billing, support, ops)
- Year 1 = prove technical superiority, Year 2 = build business

### The Right Approach

**v1.0-1.3 (Months 1-6): Framework Excellence**

```
- MCP implementation
- Path parameters
- Benchmarks
- Cloud Beta (20-50 invite-only customers)
- Goal: Prove framework + test cloud offering
```

**v2.0+ (Months 6-12): Business Scale**

```
- Cloud public launch
- Enterprise features
- SOC2 compliance
- Goal: Scale cloud to $25K-100K MRR
```

---

## Next Actions

1. **✅ v1.0 Complete** - Framework, auto-docs, middleware shipped
2. **Week 13-15**: MCP implementation (Priority 1)
3. **Week 16**: Benchmarks (prove performance claims)
4. **Week 17**: Public launch prep (landing page, docs, content)
5. **Week 18**: Launch (HN, Reddit, Product Hunt)
6. **Weeks 19-24**: Community building, cloud beta invites

---

**🎯 Goal**: Build the fastest MCP framework, prove it with benchmarks, then scale the business with Conduit Cloud.

**📊 Progress**: v1.0 ✅ Complete → v1.1 MCP 🚧 Next (Week 13) → v1.2 Path Params ⏸️ Ready → v2.0 Cloud 🔮 Future

---

_Updated: November 3, 2025_  
_Status: v1.0 SHIPPED, MCP Week 13 starts tomorrow_
