# Changelog

All notable changes to Conduit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### In Progress

- Framework + Plugin integration (Phase 2)
- MCP protocol implementation
- Path parameter extraction at runtime

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
