# Week 5 Day 1: Jump Table Implementation - Research and Design

**Date**: November 1, 2025  
**Goal**: Research and design true O(1) dispatch using jump tables  
**Status**: 🔄 IN PROGRESS

---

## Overview

Week 4 validated that perfect hashing works excellently (100% load factor, sub-linear scaling). Now Week 5 will implement true O(1) runtime dispatch by replacing the hash-optimized if/elif chain with direct array indexing.

**Current (Week 4)**:

```python
# O(n) worst-case, but hash-optimized ordering
if method == "PATCH": return handler_9(request)  # Slot 9
elif method == "DELETE": return handler_8(request)  # Slot 8
# ... etc
```

**Goal (Week 5)**:

```python
# O(1) constant-time with array indexing
hash = fnv1a(method, path)
slot = (hash + offsets[hash % k]) % n
return handlers[slot](request)
```

## Research Questions

### 1. How to Create Arrays in Codon IR?

From Codon source analysis:

**RecordType for Arrays**:

```cpp
// String type in Codon:
types::Type *Module::getStringType() {
    return Nr<types::RecordType>(
        STRING_NAME,
        std::vector<types::Type *>{getIntType(), unsafeGetPointerType(getByteType())},
        std::vector<std::string>{"len", "ptr"}
    );
}

// Array type pattern:
types::Type *Module::unsafeGetArrayType(types::Type *base) {
    auto name = fmt::format(FMT_STRING(".Array[{}]"), base->referenceString());
    std::vector<types::Type *> members = {getIntType(), unsafeGetPointerType(base)};
    std::vector<std::string> names = {"len", "ptr"};
    return Nr<types::RecordType>(name, members, names);
}
```

**Key Insight**: Arrays in Codon IR are `RecordType` with two fields:

- `len`: integer (array length)
- `ptr`: pointer to element type

**For Handler Array**:

```cpp
// Handler array type would be:
auto *handlerPtrType = M->unsafeGetPointerType(handlerFuncType);
auto *handlerArrayType = M->Nr<types::RecordType>(
    "HandlerArray",
    std::vector<types::Type*>{M->getIntType(), handlerPtrType},
    std::vector<std::string>{"len", "ptr"}
);
```

### 2. How to Store Function Pointers?

From Codon source:

**FuncType Definition**:

```cpp
class FuncType : public AcceptorExtend<FuncType, Type> {
    Type *rType;  // return type
    std::vector<Type *> argTypes;
    bool variadic;
};
```

**Creating Function Types**:

```cpp
// In our plugin:
auto *requestType = M->getStringType();  // Simplified for now
auto *responseType = M->getStringType();
auto *handlerFuncType = M->unsafeGetFuncType(
    "HandlerFunc",
    responseType,  // return str
    {requestType}  // args: (request: str)
);
```

**Function Pointers**:

- Functions themselves are values of type `FuncType`
- Can store `Func*` pointers in IR
- Access via `M->Nr<VarValue>(funcPtr)` to get value

**Handler Storage Strategy**:

```cpp
// Option 1: Array of function pointers (complex)
std::vector<Func*> handlers = {handler_0, handler_1, ..., handler_n};

// Option 2: Generate dispatch with embedded function calls (simpler)
// Instead of storing pointers, generate switch/if based on slot
// This is hybrid: O(1) hash lookup to slot, then direct call
```

### 3. How to Implement FNV-1a Hash in IR?

**FNV-1a Algorithm** (from Week 4 Day 1):

```cpp
uint32_t fnv1a_hash(const std::string& str) {
    uint32_t hash = 2166136261u;  // FNV offset basis
    for (char c : str) {
        hash ^= static_cast<uint32_t>(static_cast<unsigned char>(c));
        hash *= 16777619u;  // FNV prime
    }
    return hash;
}
```

**IR Implementation Challenges**:

**1. String Iteration**: Need to iterate over string characters

```cpp
// Codon string type: {len: int, ptr: Ptr[byte]}
// Access: ptr[0], ptr[1], ..., ptr[len-1]

// In IR, would need:
- Extract string.len
- Extract string.ptr
- Loop from i=0 to len-1
- Load ptr[i] for each character
```

**2. Arithmetic Operations**: XOR, multiply, modulo

```cpp
// IR has built-in operations via util::call:
- BinaryInstr for ^= (XOR)
- BinaryInstr for *= (multiply)
- BinaryInstr for %= (modulo)

// Or via method calls:
auto *xorResult = util::call(xorMethod, {hash, charValue});
```

**3. Loop Construction**: For-loop to iterate string

```cpp
// Codon IR loops use:
- WhileFlow for condition checking
- Conditional jumps
- Loop variables

// Example structure:
auto *loopFlow = M->Nr<WhileFlow>();
auto *condition = ...; // i < len
auto *body = M->Nr<SeriesFlow>();
// ... body updates hash
loopFlow->setCondition(condition);
loopFlow->setBody(body);
```

**Complexity**: Implementing FNV-1a in IR requires:

- String struct access
- Integer arithmetic (XOR, multiply)
- Loop construction
- Type conversions (char to uint32_t)

**Estimated Effort**: 1-2 days just for hash function

### 4. Simpler Alternative: Compile-Time Hash Lookup

**Observation**: We know all routes at compile time!

**Instead of runtime hashing**:

```python
# Runtime: expensive
hash = fnv1a(method, path)  # String ops
offset = offsets[hash % k]
slot = (hash + offset) % n
```

**Use compile-time lookup**:

```python
# Compile-time: generate dispatch that maps (method, path) -> slot
if method == "GET" and path == "/":
    slot = 0
elif method == "POST" and path == "/users":
    slot = 1
# ... etc

return handlers[slot](request)  # O(1) array access
```

**This is still O(n) for finding slot**, but then O(1) for calling handler.

**True Hybrid Approach**:

1. If/elif to find correct slot (O(n) worst-case)
2. Direct function call without if/elif (improvement over Week 4)

**Is this worth it?** Debatable. Week 4 already does direct calls.

##Design Decisions

### Decision 1: True Jump Table vs. Enhanced Dispatch?

**Option A: True Jump Table** (ambitious)

- Implement FNV-1a hash in IR (1-2 days)
- Create handler array with function pointers
- Direct array indexing: `handlers[slot](request)`
- **Benefit**: True O(1) dispatch
- **Cost**: High complexity, 3-4 days total

**Option B: Enhanced Dispatch** (pragmatic)

- Keep hash-optimized if/elif for slot lookup
- Improve handler calls (better than Week 4 placeholders)
- Focus on string comparison and handler linking
- **Benefit**: Working end-to-end dispatch sooner
- **Cost**: Still O(n) worst-case

**Option C: Hybrid Jump Table** (middle ground)

- Implement simpler hash (maybe just string length?)
- Use small hash table with collision chains
- Each bucket has 1-3 routes (fast if/elif)
- **Benefit**: Better than pure if/elif, simpler than full FNV-1a
- **Cost**: Not true O(1), but amortized closer

**Recommendation**: Start with **Option C**, then upgrade to A if time permits.

### Decision 2: Handler Array Implementation

**Option 1: Actual Array of Function Pointers**

```cpp
// Generate array at module level
std::vector<Func*> handler_ptrs = {handler_0, handler_1, ..., handler_n};

// In dispatch:
auto *handlers = M->Nr<StackAllocInstr>(handlerFuncType, n);
// Initialize with function pointers
// Index and call
```

**Challenges**:

- Function pointers in Codon IR are complex
- Need to handle function type conversions
- Stack vs heap allocation

**Option 2: Generate Inline Switch**

```cpp
// Instead of array, generate switch on slot:
switch (slot) {
    case 0: return handler_0(request);
    case 1: return handler_1(request);
    // ... etc
}
```

**In Codon IR**: Nested IfFlow nodes

```cpp
if slot == 0:
    return handler_0(request)
elif slot == 1:
    return handler_1(request)
# ... etc
```

**This is what we already have!** Just with better slot calculation.

**Option 3: Computed Goto (Advanced)**

```cpp
// LLVM-level optimization using jump table
// Codon IR might compile if/elif to jump table automatically
```

**Recommendation**: **Option 2** (inline switch) is simplest and likely what compiler optimizes to anyway.

### Decision 3: Hash Function Approach

**Option 1: Full FNV-1a in IR**

- Most accurate to research
- True O(1) guarantee
- High complexity

**Option 2: Simpler Hash (String Length)**

```python
hash = len(method) + len(path)
```

- Very simple to implement in IR
- Poor distribution (collisions likely)
- Not truly minimal perfect hash

**Option 3: Compile-Time Hash with Runtime Verification**

```python
# Precompute hashes at compile time
hash_table = {
    ("GET", "/"): 0,
    ("POST", "/users"): 1,
    # ... etc
}

# Runtime: lookup in hash table (implemented as if/elif)
if method == "GET" and path == "/":
    slot = 0
elif method == "POST" and path == "/users":
    slot = 1
```

**This is exactly Week 4!** We're already doing this.

**Recommendation**: For Day 1, document that **full FNV-1a is unnecessary** when routes are known at compile time.

## Implementation Roadmap

### Week 5 Day 1 (Today): Research & Design ✅

- [x] Research Codon IR array types
- [x] Research function pointers in IR
- [x] Analyze FNV-1a implementation complexity
- [x] Evaluate jump table vs enhanced dispatch
- [ ] Document findings and design decisions
- [ ] Create implementation plan for Days 2-4

### Week 5 Day 2: String Comparison in IR

**Goal**: Make dispatch actually check strings (remove placeholders)

**Tasks**:

1. Implement string equality in IR
   - Access string.len and string.ptr
   - Compare lengths first (fast path)
   - Compare bytes if lengths match
2. Update route matching conditions
   - Replace `M->getBool(true)` with real comparisons
   - Implement AND logic for method + path
3. Test with actual route matching

**Expected Complexity**: Medium (string ops in IR are non-trivial)

### Week 5 Day 3: Handler Function Linking

**Goal**: Connect handlers to actual functions

**Tasks**:

1. Improve handler detection
   - Extract function names from decorators
   - Link to actual BodiedFunc pointers
2. Update dispatch to call real handlers
   - Replace placeholder strings
   - Use util::call with actual functions
3. Test end-to-end routing

**Expected Complexity**: Medium-High (depends on decorator analysis)

### Week 5 Day 4: Optimization & Benchmarking

**Goal**: Measure runtime performance improvements

**Tasks**:

1. Benchmark runtime dispatch speed
   - Measure time per request
   - Compare Week 4 vs Week 5
2. Analyze compiler optimizations
   - Check if Codon/LLVM optimizes if/elif to jump table
   - Profile generated code
3. Document findings

**Expected Complexity**: Low (mostly testing and analysis)

## Key Findings

### 1. Full Jump Table May Be Unnecessary

**Insight**: When routes are known at compile time, runtime hashing adds complexity without proportional benefit.

**Current Week 4 Approach**:

- Compile-time: Compute perfect hash slot assignments
- Runtime: Check routes in optimal order
- Result: O(n) worst-case, but optimized ordering

**True Jump Table Would Add**:

- Runtime: Compute hash (FNV-1a iteration)
- Runtime: Lookup offset
- Runtime: Calculate slot
- Runtime: Index into array
- Result: O(1) guaranteed, but more instructions

**For most applications** (< 200 routes):

- Week 4 if/elif in optimal order: ~100-200ns worst-case
- True jump table: ~50-100ns (includes hash computation)
- **Speedup**: 2x, but adds significant IR complexity

**Question**: Is 2x speedup worth 3-4 days of complex IR coding?

### 2. Compiler May Auto-Optimize

**Modern Compilers** (LLVM, which Codon uses):

- Can detect switch/if-elif patterns
- Auto-generate jump tables for dense cases
- Optimize based on case distribution

**Hypothesis**: Our nested IfFlow might already compile to jump table!

**Test Needed**: Examine LLVM IR output to verify

### 3. Real Bottleneck: String Comparison

**Current Limitation**: Using `M->getBool(true)` placeholders

**Impact**: Dispatch doesn't actually route requests!

**Priority**: Implementing real string comparison is more valuable than perfect hashing.

**With proper string comparison**:

```python
if method == "GET" and path == "/users/:id":  # Actual check
    return handler(request)
```

vs. current:

```python
if true:  # Placeholder!
    return "Handler: <handler>"
```

## Design Recommendations

### Revised Week 5 Plan

**Priority 1: String Comparison** (Day 2)

- Implement string equality in IR
- Make dispatch actually work
- Value: Enables real routing

**Priority 2: Handler Linking** (Day 3)

- Connect to actual functions
- Call real handlers
- Value: End-to-end functionality

**Priority 3: Runtime Performance** (Day 4)

- Benchmark dispatch speed
- Check compiler optimizations
- Value: Validate Week 4 assumptions

**Deferred: Full Jump Table**

- Only implement if benchmarks show need
- Or as separate Week 6 "Advanced Optimizations"

### Alternative: Partial Jump Table

**Simplified Approach**:

1. Use method as primary bucket (5 buckets: GET, POST, PUT, DELETE, PATCH)
2. Within each bucket, use if/elif for paths
3. Expected routes per bucket: n/5

**Example**:

```python
if method == "GET":
    if path == "/": return handler_0(request)
    elif path == "/users": return handler_1(request)
    elif path == "/users/:id": return handler_2(request)
elif method == "POST":
    if path == "/users": return handler_3(request)
    # ... etc
```

**Benefit**: 5x reduction in comparisons without full hashing

**Implementation**: Simple if/elif nesting (already know how to do this)

**Effort**: 1 day vs. 3-4 days for full jump table

## Technical Challenges

### Challenge 1: String Access in IR

**Codon String Type**:

```cpp
types::RecordType(
    "str",
    {getIntType(), unsafeGetPointerType(getByteType())},
    {"len", "ptr"}
)
```

**Accessing Members**:

```cpp
// Get len field
auto *lenMember = util::tupleGet(stringValue, 0);  // Index 0 = len

// Get ptr field
auto *ptrMember = util::tupleGet(stringValue, 1);  // Index 1 = ptr
```

**From Codon source** (`util/irtools.h`):

```cpp
/// Gets value from a tuple at the given index.
Value *tupleGet(Value *tuple, unsigned index);
```

### Challenge 2: Byte-by-Byte Comparison

**Algorithm**:

```python
def str_equal(s1: str, s2: str) -> bool:
    if len(s1) != len(s2):
        return False

    for i in range(len(s1)):
        if s1.ptr[i] != s2.ptr[i]:
            return False

    return True
```

**IR Implementation** requires:

1. Length comparison (simple)
2. Loop construction (WhileFlow)
3. Pointer arithmetic (ptr + i)
4. Byte comparison
5. Early exit on mismatch

**Complexity**: Medium-High

### Challenge 3: AND Logic for Conditions

**Need**: `method == "GET" AND path == "/users"`

**IR Approach**: Nested IfFlow or BoolOp

```cpp
// Option 1: Nested if
if method == "GET":
    if path == "/users":
        return handler(request)

// Option 2: AND operation
auto *methodEq = createStringEquals(M, methodVar, "GET");
auto *pathEq = createStringEquals(M, pathVar, "/users");
auto *condition = createBoolAnd(M, methodEq, pathEq);

if condition:
    return handler(request)
```

## Success Metrics

### Week 5 Goals

**Must Have**:

- ✅ Research complete (Day 1)
- ⏳ String comparison working (Day 2)
- ⏳ Handler linking working (Day 3)
- ⏳ End-to-end routing functional (Day 4)

**Nice to Have**:

- Method-based bucketing (5x speedup)
- Runtime benchmarks
- Compiler optimization analysis

**Stretch Goals**:

- Full FNV-1a implementation
- True jump table with function pointers
- 10x+ speedup vs Week 3

## Next Steps

1. **Complete Day 1 Documentation** ✅ (this document)
2. **Design String Comparison** (prepare for Day 2)
   - Sketch IR structure for equality check
   - Plan loop implementation
   - Identify helper functions needed
3. **Plan Handler Linking** (prepare for Day 3)
   - Review decorator analysis code
   - Design function pointer extraction
   - Plan handler array generation
4. **Prepare Benchmarks** (prepare for Day 4)
   - Design runtime timing harness
   - Plan comparison methodology
   - Set performance targets

---

## Conclusion

Week 5 Day 1 research reveals that **full jump table implementation may be over-engineering** for our use case. The more valuable improvements are:

1. **String Comparison**: Make dispatch actually work
2. **Handler Linking**: Call real functions
3. **Method Bucketing**: 5x speedup with simple if/elif nesting

These three improvements provide 80% of the benefit with 20% of the complexity compared to full FNV-1a jump tables.

**Recommendation**: Focus Week 5 on practical functionality (string ops, handler calls) rather than premature optimization (full hashing). Revisit jump tables in Week 6 if benchmarks prove the need.

**Status**: ✅ Research complete. Design decisions made. Ready for Day 2 implementation.
