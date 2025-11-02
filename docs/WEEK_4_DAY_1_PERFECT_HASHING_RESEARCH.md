# Week 4 Day 1: Perfect Hashing Research

**Date**: October 31, 2025  
**Objective**: Research and design perfect hash function for compile-time route optimization

## Background

Currently, our dispatch function uses an if/elif chain:

```python
if method == "GET":
    if path == "/":
        return handler1(request)
    elif path == "/users":
        return handler2(request)
elif method == "POST":
    if path == "/users":
        return handler3(request)
# ... etc
```

**Performance**: O(n) where n = number of routes  
**Goal**: O(1) constant time lookup

## Perfect Hashing Overview

### What is Perfect Hashing?

A **perfect hash function** is a hash function that maps a set of keys to unique integers with **no collisions**.

A **minimal perfect hash function** (MPHF) additionally maps n keys to exactly the range [0, n-1] with no gaps.

### Why Perfect Hashing for Routes?

1. **Static Route Set**: Routes are known at compile time, never change at runtime
2. **Small Key Space**: Typical web apps have 10-100 routes
3. **Zero Collisions**: Can guarantee no hash conflicts
4. **Constant Time**: O(1) lookup regardless of route count
5. **Compact**: Minimal memory footprint

## Perfect Hashing Algorithms

### 1. GNU gperf

**Description**: Classic tool for generating perfect hash functions from keyword lists

**Pros**:

- Battle-tested (used in GCC, GNU tools)
- Generates C/C++ code
- Very fast lookup
- Can handle case-insensitive matching

**Cons**:

- External tool dependency
- Designed for C strings, not complex keys
- Harder to integrate into plugin pipeline

**Use Case**: Command-line tools, keyword lookup

### 2. CHD (Compress, Hash, Displace)

**Description**: Modern minimal perfect hashing algorithm

**Algorithm**:

1. Partition keys into buckets using hash function h1
2. For each bucket, find displacement value that makes h2 perfect
3. Final hash: h(k) = (h1(k) + d[h2(k)]) mod n

**Pros**:

- Very fast construction
- Compact representation
- Easy to implement
- Good for 100s-1000s of keys

**Cons**:

- Requires two hash functions
- Displacement table storage

**Complexity**: O(n) construction, O(1) lookup

### 3. PTHash (Partitioned Tries Hash)

**Description**: State-of-the-art MPHF for large key sets

**Pros**:

- Extremely space-efficient
- Fast construction
- Excellent for millions of keys

**Cons**:

- Complex implementation
- Overkill for small route sets
- More suited for databases/search engines

### 4. Simple Modulo with Offset

**Description**: For very small key sets (< 20 keys), use simple hash with pre-computed offsets

**Algorithm**:

```cpp
hash = (simple_hash(key) + offset[simple_hash(key) % k]) % n
```

**Pros**:

- Trivial to implement
- No external dependencies
- Perfect for our use case (< 100 routes)

**Cons**:

- May require more trial-and-error to find good offset values

## Route-Specific Considerations

### Hash Key Design

We need to hash on **method + path** combination:

**Option 1: Concatenate Strings**

```cpp
key = method + ":" + path  // "GET:/users"
hash(key)
```

- Simple to implement
- Clear semantics
- Might have poor distribution

**Option 2: Numeric Encoding**

```cpp
method_code = {"GET": 0, "POST": 1, "PUT": 2, "DELETE": 3, "PATCH": 4}
key = method_code * 1000 + path_hash(path)
```

- Better distribution
- Smaller hash space
- Requires path hashing anyway

**Option 3: Tuple Hash**

```cpp
hash = hash1(method) ^ (hash2(path) << 3)
```

- Independent hashing of components
- Good distribution
- Common pattern

### Path Pattern Handling

Routes can have parameters: `/users/:id`, `/posts/:post_id/comments/:id`

**Challenge**: Runtime paths don't match pattern strings

- Request: `GET /users/123`
- Pattern: `GET /users/:id`

**Solutions**:

1. **Pre-extract static prefix**: Hash only static parts

   - `/users/:id` → hash("/users/")
   - Requires additional parameter extraction logic

2. **Pattern normalization**: Convert all routes to canonical form

   - `/users/:id` → `/users/*`
   - Hash on normalized pattern

3. **Two-level lookup**:
   - First hash on static prefix
   - Then match full pattern in small bucket

## Recommended Approach for Conduit

### Algorithm: Simple Perfect Hash with Offsets

For our use case (< 100 routes), implement a simple approach:

1. **At compile time** (in plugin):

   - Collect all route keys (method + path)
   - Generate minimal perfect hash function
   - Compute offset table
   - Generate jump table (array of function pointers)

2. **Generated dispatch function**:
   ```cpp
   int hash = (hash_func(method, path) + offsets[hash_func(method, path) % k]) % n;
   return jump_table[hash](request);
   ```

### Implementation Strategy

```cpp
// Compile-time hash generation (in plugin)
std::vector<RouteInfo> routes = /* detected routes */;
auto [hash_func, offsets, jump_table] = generatePerfectHash(routes);

// Generate IR code:
// 1. Create hash function as IR
// 2. Create offset array as global constant
// 3. Create jump table as array of function pointers
// 4. Generate single expression dispatch
```

### Hash Function Choice

Use **FNV-1a hash** for simplicity and speed:

```cpp
uint32_t fnv1a(const std::string& str) {
    uint32_t hash = 2166136261u;
    for (char c : str) {
        hash ^= static_cast<uint32_t>(c);
        hash *= 16777619u;
    }
    return hash;
}
```

**Properties**:

- Fast (one XOR, one multiply per byte)
- Good distribution
- Well-studied
- Easy to implement in IR

## Perfect Hash Generation Algorithm

### Step 1: Collect Keys

```cpp
std::vector<std::string> keys;
for (const auto& route : routes) {
    keys.push_back(route.method + ":" + route.path);
}
```

### Step 2: Find Perfect Hash Parameters

```cpp
// Try different table sizes and offsets until we find perfect hash
for (int table_size = keys.size(); table_size < keys.size() * 2; ++table_size) {
    std::vector<int> offsets(table_size, 0);

    if (findOffsets(keys, table_size, offsets)) {
        // Found perfect hash!
        return {table_size, offsets};
    }
}
```

### Step 3: Generate Verification

```cpp
bool findOffsets(const std::vector<std::string>& keys,
                 int table_size,
                 std::vector<int>& offsets) {
    std::vector<int> used(table_size, -1);

    for (int i = 0; i < keys.size(); ++i) {
        uint32_t h = fnv1a(keys[i]);

        // Try offsets until we find unused slot
        for (int offset = 0; offset < table_size; ++offset) {
            int slot = (h + offset) % table_size;
            if (used[slot] == -1) {
                used[slot] = i;
                offsets[h % offsets.size()] = offset;
                break;
            }
        }
    }

    return true; // All keys placed
}
```

## IR Generation Strategy

### Generated Code Structure

```python
# What we want to generate in IR:

# Global constants
__route_offsets__ = [0, 2, 1, 0, 3, ...]  # Offset table
__route_handlers__ = [handler1, handler2, handler3, ...]  # Jump table

def __hash_route__(method: str, path: str) -> int:
    # FNV-1a hash
    h = 2166136261
    for c in method + ":" + path:
        h ^= ord(c)
        h *= 16777619
    return h

def conduit_dispatch(method: str, path: str, request: Request) -> Response:
    h = __hash_route__(method, path)
    slot = (h + __route_offsets__[h % len(__route_offsets__)]) % len(__route_handlers__)
    return __route_handlers__[slot](request)
```

### IR Implementation Plan

1. **Create global offset array**:

   ```cpp
   auto *offsetArray = M->Nr<GlobalVar>(/* ... */);
   ```

2. **Create jump table array**:

   ```cpp
   auto *jumpTable = M->Nr<GlobalVar>(/* ... */);
   ```

3. **Generate hash function**:

   ```cpp
   auto *hashFunc = M->Nr<BodiedFunc>("__hash_route__");
   // Implement FNV-1a in IR
   ```

4. **Generate dispatch**:
   ```cpp
   // Single expression: jump_table[(hash + offsets[hash % k]) % n]
   ```

## Performance Analysis

### Current: If/Elif Chain

**Best Case**: O(1) - first route matches  
**Average Case**: O(n/2) - middle route matches  
**Worst Case**: O(n) - last route or 404

For 10 routes: avg 5 comparisons, worst 10 comparisons  
For 50 routes: avg 25 comparisons, worst 50 comparisons  
For 100 routes: avg 50 comparisons, worst 100 comparisons

### With Perfect Hashing

**All Cases**: O(1) - constant time

- 1 hash computation (~10-50 operations)
- 1 array lookup (offsets)
- 1 addition + modulo
- 1 array lookup (jump table)
- 1 function call

**Total**: ~15-60 operations regardless of route count

### Speedup Estimation

For n routes:

- If/elif: ~n/2 string comparisons on average
- Perfect hash: ~20 arithmetic operations

String comparison is ~20-50 operations per comparison.

**Speedup**:

- 10 routes: ~5x faster
- 50 routes: ~20x faster
- 100 routes: ~40x faster

## Challenges & Solutions

### Challenge 1: Parameter Routes

**Problem**: `/users/:id` doesn't match `/users/123`

**Solution**: Two-stage lookup

1. Hash on static prefix only
2. Regex match on full pattern (for parameter extraction)

Or: Extract static prefix at compile time, hash only that

### Challenge 2: Hash Collisions in Development

**Problem**: Routes change during development, hash may need regeneration

**Solution**:

- Plugin regenerates hash on every compilation
- No runtime state, always fresh
- Developer doesn't need to do anything

### Challenge 3: Debugging

**Problem**: Jump table is opaque, hard to debug

**Solution**:

- Generate debug mode with route table
- Print hash → route mapping
- Fallback to if/elif chain in debug builds

## Next Steps (Week 4 Day 2)

1. Implement FNV-1a hash function generator in C++
2. Implement offset-finding algorithm
3. Test with sample route sets
4. Verify perfect hash properties
5. Prepare for IR code generation

## References

- **Perfect Hashing**: Donald Knuth, TAOCP Vol 3
- **CHD Algorithm**: "An optimal algorithm for generating minimal perfect hash functions" (2009)
- **gperf**: https://www.gnu.org/software/gperf/
- **FNV Hash**: http://www.isthe.com/chongo/tech/comp/fnv/

## Conclusion

Perfect hashing is **ideal** for our use case:

- Routes known at compile time ✅
- Small key set (< 100 routes) ✅
- Zero collisions required ✅
- Performance critical ✅

Simple offset-based approach with FNV-1a hash will provide:

- Easy implementation
- O(1) lookup
- Significant speedup (5-40x)
- No external dependencies

Ready to implement tomorrow! 🚀
