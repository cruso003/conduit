# Week 5 Day 1: Jump Table Research - COMPLETE ✅

**Date**: November 1, 2025  
**Focus**: Research true O(1) dispatch with jump tables and design Week 5 implementation  
**Status**: ✅ **COMPLETE**

---

## Objectives

- [x] Research Codon IR array types and function pointers
- [x] Analyze FNV-1a hash implementation complexity in IR
- [x] Evaluate jump table vs enhanced dispatch approaches
- [x] Design Week 5 implementation roadmap
- [x] Document findings and recommendations

## Key Findings

### 1. Full Jump Table May Be Over-Engineering

**Research Conclusion**: Implementing full FNV-1a hashing in IR for true O(1) dispatch is technically feasible but may not be the best use of effort.

**Why**:

- Routes are known at compile time
- Week 4's hash-optimized if/elif already provides excellent performance
- Full FNV-1a in IR requires 3-4 days of complex implementation
- Expected runtime speedup: ~2x (100-200ns → 50-100ns)
- **Diminishing returns**: High complexity for modest gains

### 2. Codon IR Array/Function Pointer Patterns

**Arrays in Codon IR**:

```cpp
// Arrays are RecordType with {len: int, ptr: Ptr[T]}
auto *arrayType = M->Nr<types::RecordType>(
    "HandlerArray",
    std::vector<types::Type*>{M->getIntType(), M->unsafeGetPointerType(elemType)},
    std::vector<std::string>{"len", "ptr"}
);
```

**Function Types**:

```cpp
// Create function type: (request: str) -> str
auto *handlerFuncType = M->unsafeGetFuncType(
    "HandlerFunc",
    M->getStringType(),  // return type
    {M->getStringType()}  // arg types
);
```

**Accessing Members**:

```cpp
auto *lenValue = util::tupleGet(arrayValue, 0);  // Get array.len
auto *ptrValue = util::tupleGet(arrayValue, 1);  // Get array.ptr
```

### 3. FNV-1a Implementation Complexity

**Required IR Operations**:

1. String struct access (len, ptr fields)
2. Loop construction (WhileFlow for character iteration)
3. Integer arithmetic (XOR, multiply, modulo)
4. Type conversions (byte → uint32)
5. Pointer arithmetic (ptr[i] indexing)

**Estimated Effort**: 1-2 days just for hash function, 3-4 days total with testing

**Alternative**: Compiler may auto-optimize if/elif to jump table anyway (LLVM optimization)

### 4. Real Bottleneck: String Comparison

**Current Limitation**: Using `M->getBool(true)` placeholders means dispatch doesn't actually route!

**Impact**:

```cpp
// Current (Week 4):
if true:  // Placeholder!
    return "Handler: <handler>"

// Needed:
if method == "GET" and path == "/users":  // Actual comparison
    return handler(request)
```

**Priority**: Implementing real string comparison provides immediate value vs. optimizing already-working dispatch.

## Design Decisions

### Decision 1: Revised Week 5 Focus

**Original Plan**: Implement full jump table with FNV-1a hashing

**Revised Plan**: Focus on practical functionality over premature optimization

**Rationale**:

- Week 4 validated perfect hash works (100% load, sub-linear scaling)
- Dispatch structure is already optimal
- Missing pieces are string ops and handler calls, not hashing

**New Priorities**:

1. **Day 2**: String comparison in IR (make dispatch work)
2. **Day 3**: Handler function linking (call real handlers)
3. **Day 4**: Runtime benchmarking and optimization analysis

### Decision 2: Alternative Optimizations

**Method-Based Bucketing** (simpler than full hashing):

```python
if method == "GET":
    if path == "/": return handler_0(request)
    elif path == "/users": return handler_1(request)
elif method == "POST":
    if path == "/users": return handler_3(request)
# ... etc
```

**Benefit**: 5x reduction in comparisons (5 HTTP methods)  
**Effort**: 1 day vs 3-4 days for full jump table  
**Speedup**: Similar to jump table for typical route counts

### Decision 3: Defer Full Jump Table

**If Needed**: Implement as Week 6 "Advanced Optimizations"

**Triggers for implementation**:

- Benchmarks show dispatch is bottleneck
- Application has 500+ routes
- Compiler doesn't auto-optimize if/elif

**For now**: Focus on making dispatch functional and measuring real-world performance

## Implementation Roadmap

### Week 5 Day 2: String Comparison in IR

**Goal**: Implement string equality to make dispatch actually route requests

**Tasks**:

1. Implement `createStringEquals(Module *M, Var *str1, const std::string &literal)`

   - Extract string.len and string.ptr using util::tupleGet
   - Compare lengths first (fast path)
   - Loop to compare bytes if lengths match
   - Return boolean result

2. Implement AND logic for conditions

   - `method == "GET" AND path == "/users"`
   - Either nested IfFlow or boolean operation

3. Update dispatch generation
   - Replace `M->getBool(true)` with real comparisons
   - Test with actual route matching

**Complexity**: Medium (string operations in IR)

**Expected Output**: Dispatch that correctly routes based on method + path

### Week 5 Day 3: Handler Function Linking

**Goal**: Connect handler placeholders to actual functions

**Tasks**:

1. Improve handler detection

   - Parse `handler.__name__` from add_route_metadata calls
   - Search module for matching BodiedFunc
   - Store function pointers in RouteInfo

2. Update dispatch to call real handlers

   - Replace placeholder strings
   - Use `util::call(handler_func, {requestValue})`
   - Handle missing handlers gracefully

3. Test end-to-end routing
   - Verify each route calls correct handler
   - Check handler receives request parameter

**Complexity**: Medium-High (decorator context analysis)

**Expected Output**: Working dispatch that calls actual handler functions

### Week 5 Day 4: Optimization & Benchmarking

**Goal**: Measure runtime performance and analyze optimizations

**Tasks**:

1. Create runtime benchmark harness

   - Generate test requests
   - Measure dispatch time per request
   - Compare Week 4 vs Week 5

2. Analyze compiler optimizations

   - Examine LLVM IR output
   - Check if if/elif compiles to jump table
   - Profile generated code

3. Evaluate method bucketing

   - Implement if worthwhile
   - Benchmark improvement

4. Document findings and recommendations

**Complexity**: Low-Medium (testing and analysis)

**Expected Output**: Performance data and Week 6 recommendations

## Technical Challenges Identified

### Challenge 1: String Member Access

**Pattern** (from Codon source):

```cpp
// String type: RecordType("str", {int, Ptr[byte]}, {"len", "ptr"})

// Access len:
auto *lenValue = util::tupleGet(stringVar, 0);

// Access ptr:
auto *ptrValue = util::tupleGet(stringVar, 1);
```

**Usage in comparison**:

```cpp
// if len(str1) != len(literal):
auto *len1 = util::tupleGet(str1, 0);
auto *len2 = M->getInt(literal.length());
auto *lenEq = createIntEquals(M, len1, len2);
```

### Challenge 2: Loop Construction in IR

**Need**: Iterate over string bytes for comparison

**Pattern**:

```cpp
// Create loop variable
auto *iVar = M->Nr<Var>(M->getIntType(), "i");

// Loop condition: i < len
auto *condition = createIntLessThan(M, iVar, lenValue);

// Loop body
auto *body = M->Nr<SeriesFlow>();
// ... byte comparison logic

// While loop
auto *loop = M->Nr<WhileFlow>(condition, body);
```

**Complexity**: Medium (need to understand Codon IR control flow)

### Challenge 3: Boolean Operations

**Need**: Combine conditions with AND/OR

**Options**:

1. **Nested IfFlow** (simpler):

```cpp
auto *methodCheck = createMethodEquals(...);
auto *pathCheck = createPathEquals(...);

if methodCheck:
    if pathCheck:
        return handler(request)
```

2. **Boolean Operation** (cleaner):

```cpp
auto *andOp = createBoolAnd(methodCheck, pathCheck);

if andOp:
    return handler(request)
```

**Recommendation**: Start with nested if (simpler), optimize to boolean op later

## Research Artifacts

**Files Created**:

- `docs/WEEK_5_DAY_1_RESEARCH.md` - Complete research documentation
- `docs/WEEK_5_DAY_1_COMPLETE.md` - This summary

**Key Resources Referenced**:

- Codon IR source (`codon/cir/types/types.cpp`, `codon/cir/module.cpp`)
- Codon util functions (`codon/cir/util/irtools.cpp`)
- Week 4 benchmark results
- Perfect hash implementation (Week 4 Days 1-3)

## Design Principles

### 1. Functionality Before Optimization

**Principle**: Make it work, then make it fast

**Application**: Implement string comparison and handler calling (core functionality) before optimizing dispatch speed

### 2. Simplicity Over Sophistication

**Principle**: Choose the simplest solution that meets requirements

**Application**: Method bucketing or compiler-optimized if/elif instead of manual jump table implementation

### 3. Measure Before Optimizing

**Principle**: Don't optimize without data

**Application**: Benchmark Week 4 vs Week 5 before implementing complex optimizations like FNV-1a

### 4. Incremental Progress

**Principle**: Small, testable improvements

**Application**: Day-by-day progression (strings → handlers → benchmarks) rather than big-bang rewrite

## Success Criteria

### Week 5 Goals (Revised)

**Must Have**:

- ✅ Research complete (Day 1)
- ⏳ String comparison working (Day 2)
- ⏳ Handler linking working (Day 3)
- ⏳ End-to-end routing functional (Day 4)

**Nice to Have**:

- Method-based bucketing (if benchmarks show value)
- Compiler optimization analysis
- Runtime performance data

**Deferred to Week 6**:

- Full FNV-1a implementation
- True jump table with function pointers
- Advanced optimizations

## Lessons Learned

### 1. Research Prevents Rework

Spending Day 1 researching saved 3-4 days of potentially unnecessary implementation work.

**Avoided**:

- Complex FNV-1a implementation
- Function pointer array management
- Debugging low-level IR operations

**Gained**:

- Clear understanding of what's actually needed
- Simpler, more achievable roadmap
- Focus on high-value improvements

### 2. Compile-Time Optimization Often Sufficient

When inputs are known at compile time, runtime optimizations may be overkill.

**Week 4 Insight**: Compile-time perfect hash slot assignment + runtime if/elif works well

**Week 5 Insight**: Don't need runtime hashing when we have compile-time route knowledge

### 3. Real Bottlenecks vs. Theoretical Bottlenecks

**Theoretical**: O(n) if/elif is slower than O(1) jump table

**Real**: String comparison placeholders and missing handler calls are the actual blockers

**Takeaway**: Fix blocking issues before optimizing working code

## Next Steps

### Immediate (Day 2 Prep)

1. **Design String Comparison Function**:

   - Sketch IR structure
   - Identify Codon IR operations needed
   - Plan error handling

2. **Study Codon IR Examples**:

   - Look at string operations in Codon stdlib
   - Find loop construction patterns
   - Understand control flow primitives

3. **Set Up Testing**:
   - Prepare test cases for string equality
   - Design validation approach
   - Plan incremental testing

### Day 2 Implementation

**Goal**: Working string comparison → functional dispatch

**Deliverables**:

- `createStringEquals()` helper function
- `createBoolAnd()` for combining conditions
- Updated dispatch with real comparisons
- Test showing correct route matching

**Success Metric**: Test file compiles and dispatch chooses correct route based on method + path

---

## Conclusion

Week 5 Day 1 research successfully evaluated jump table implementation approaches and concluded that **practical functionality improvements** (string comparison, handler linking) provide more value than **premature runtime optimization** (full FNV-1a hashing).

**Key Recommendation**: Focus Week 5 on making dispatch work end-to-end, defer advanced optimizations to Week 6 based on performance data.

**Status**: ✅ Day 1 complete. Research documented. Design decisions made. Ready for Day 2 string comparison implementation.

---

**Commit message**: "Week 5 Day 1: Research jump table implementation, recommend focusing on string ops and handler linking over full FNV-1a implementation"
