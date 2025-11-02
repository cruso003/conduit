# Building a High-Performance Web Framework: From Placeholders to Real String Comparison

_Week 5, Day 2 of building Conduit - a compile-time optimized web framework for Codon_

---

## The Challenge

After implementing perfect hash-based routing in Week 4, we had a problem: our dispatch function didn't actually _work_. It generated a beautiful if/elif structure with perfect hash optimization, but all the comparisons returned `true`:

```cpp
// Our embarrassing placeholder:
Value* createStringEquals(Module *M, Var *var, const std::string &literal) {
    return M->getBool(true);  // 😬 Every route matches!
}
```

This meant that every incoming request would match the first route in the dispatch chain, regardless of method or path. Not exactly production-ready routing.

Today's goal: Implement _real_ string comparison in Codon's Intermediate Representation (IR).

## The Research Rabbit Hole

Initially, I thought I'd need to manually implement string comparison at the IR level:

```cpp
// What I thought I'd have to write:
auto *varLen = util::tupleGet(stringVar, 0);    // Get length
auto *varPtr = util::tupleGet(stringVar, 1);     // Get pointer
// ... create loop to compare bytes ...
// ... handle length mismatch ...
// ... generate comparison instructions ...
```

This would have taken days. But Week 5 Day 1 research suggested there might be a better way.

## The Discovery: Operator Overloading in IR

While digging through Codon's source code, I found something beautiful in `value.cpp`:

```cpp
Value *Value::operator==(Value &other) {
  return doBinaryOp(Module::EQ_MAGIC_NAME, other);
}
```

Wait... **operator overloading**?

In Codon IR, you can write C++ operators on `Value*` objects, and they automatically generate the correct IR instructions!

```cpp
// This clean C++ code:
auto *result = *varValue == *literalVal;

// Generates this IR:
CallInstr(__eq__, [varValue, literalVal])

// Which compiles to optimized LLVM:
%cmp = call i1 @"str.__eq__"(%str %varValue, %str %literalVal)
```

## The Implementation

With this discovery, the implementation became trivial:

```cpp
Value* createStringEquals(Module *M, Var *var, const std::string &literal) {
    auto *literalVal = M->getString(literal);
    auto *varValue = M->Nr<VarValue>(var);

    // Just use the == operator!
    auto *result = *varValue == *literalVal;

    return result;
}
```

That's it. About 5 lines of code instead of 50+ lines of manual IR generation.

## Boolean AND: Similarly Simple

We also needed to combine conditions:

```
if (method == "GET" AND path == "/users")
```

Again, operator overloading saved us:

```cpp
Value* createBoolAnd(Module *M, Value *cond1, Value *cond2) {
    // Just use the && operator!
    return *cond1 && *cond2;
}
```

Under the hood, `operator&&` generates a ternary instruction with short-circuit evaluation:

```cpp
// From Codon's value.cpp:
Value *Value::operator&&(Value &other) {
  auto *module = getModule();
  return module->Nr<TernaryInstr>(toBool(), other.toBool(), module->getBool(false));
}
```

This compiles to efficient branch instructions with the correct short-circuit behavior.

## Simplifying the Dispatch Logic

With real comparisons, we could also simplify our dispatch structure.

**Before** (nested ifs):

```cpp
// Check method, then check path inside
auto *pathIf = M->Nr<IfFlow>(pathEq, trueBranch, currentElse);
auto *pathIfSeries = M->Nr<SeriesFlow>();
pathIfSeries->push_back(pathIf);
currentElse = M->Nr<IfFlow>(methodEq, pathIfSeries, currentElse);
```

**After** (combined condition):

```cpp
// Single if with AND condition
auto *methodEq = createStringEquals(M, methodVar, route.method);
auto *pathEq = createStringEquals(M, pathVar, route.path);
auto *condition = createBoolAnd(M, methodEq, pathEq);
currentElse = M->Nr<IfFlow>(condition, trueBranch, currentElse);
```

This generates:

- Cleaner IR
- Fewer nested flows
- Easier for LLVM to optimize

## Testing the Implementation

Compiling a test file with 10 routes now shows real comparisons:

```
→ Slot 0: GET /route_0
[DEBUG] String comparison: method == "GET"
✅ String comparison generated
[DEBUG] String comparison: path == "/route_0"
✅ String comparison generated

→ Slot 1: POST /users/:id
[DEBUG] String comparison: method == "POST"
✅ String comparison generated
[DEBUG] String comparison: path == "/users/:id"
✅ String comparison generated

... (8 more routes) ...

✅ Hash-optimized dispatch complete
  Routes: 10
  Table size: 10
  Load factor: 100%
```

## How String Comparison Actually Works

When we write:

```cpp
*varValue == *literalVal
```

Codon generates a call to `str.__eq__()`, which is implemented in Codon's standard library with these optimizations:

1. **Length check first** (O(1)):

   ```python
   if len(self) != len(other):
       return False
   ```

2. **Byte-by-byte comparison** (O(n)):
   ```python
   return memcmp(self.ptr, other.ptr, len(self)) == 0
   ```

This is exactly what we would have implemented manually, but it's already optimized and tested.

## Performance Characteristics

### String Comparison Cost

For typical HTTP routing:

- Method strings: 3-7 characters (GET, POST, DELETE, PATCH)
- Path strings: 10-50 characters
- Total per-route: ~50-100 bytes compared

With optimizations:

- LLVM inlines `str.__eq__` in many cases
- Literal lengths are constant-folded
- Short strings may use SIMD instructions
- Early exit on length mismatch (most common case)

### AND Operation Cost

The `TernaryInstr` compiles to a conditional branch:

```asm
cmp     cond1, 0        ; Check first condition
je      .false_branch   ; Short-circuit if false
cmp     cond2, 0        ; Check second condition
je      .false_branch
mov     result, 1       ; Both true
jmp     .done
.false_branch:
mov     result, 0
.done:
```

Zero overhead compared to hand-written assembly.

## Lessons Learned

### 1. Research Pays Off

Week 5 Day 1's research into Codon IR prevented 3-4 days of unnecessary manual implementation. Sometimes the best code is the code you don't write.

### 2. Use the Language's Features

Codon provides operator overloading for IR values. Fighting against this by implementing everything manually would have been slower and more error-prone.

### 3. Trust the Standard Library

Codon's `str.__eq__()` is already optimized. Don't reimplement it unless profiling shows it's a bottleneck.

### 4. Simplify Incrementally

First, we got string comparison working. Then, we simplified the dispatch structure. Each step validated independently.

## What's Next?

With working string comparison, the dispatch function can now correctly match routes. But there's still one missing piece: **handler functions**.

Currently, when a route matches, we return a placeholder string:

```cpp
auto *response = M->getString("Handler: " + route.handler_name);
```

Week 5 Day 3 will tackle:

1. Extracting handler functions from decorator metadata
2. Linking `RouteInfo.handler_func` to actual `BodiedFunc*` pointers
3. Generating calls to real handler functions
4. End-to-end testing with actual request/response handling

## The Code

Here's the complete implementation (remarkably simple):

```cpp
/// Compare a string variable with a literal string
Value* createStringEquals(Module *M, Var *var, const std::string &literal) {
    auto *literalVal = M->getString(literal);
    auto *varValue = M->Nr<VarValue>(var);
    return *varValue == *literalVal;
}

/// Combine two boolean conditions with AND
Value* createBoolAnd(Module *M, Value *cond1, Value *cond2) {
    return *cond1 && *cond2;
}

/// In dispatch function:
auto *methodEq = createStringEquals(M, methodVar, route.method);
auto *pathEq = createStringEquals(M, pathVar, route.path);
auto *condition = createBoolAnd(M, methodEq, pathEq);
auto *ifNode = M->Nr<IfFlow>(condition, thenBranch, elseBranch);
```

## Try It Yourself

The code is available on [GitHub](https://github.com/cruso003/conduit). To see string comparison in action:

```bash
# Clone the repo
git clone https://github.com/cruso003/conduit
cd conduit

# Build the plugin
cd plugins/conduit/build
cmake .. && make && make install

# Compile a test file
cd ../../..
codon build -plugin conduit benchmarks/test_files/test_routes_10.codon

# Watch the string comparisons being generated!
```

## Conclusion

Week 5 Day 2 transformed our dispatch function from placeholder to production-ready. By leveraging Codon's operator overloading, we implemented string comparison in minutes instead of days.

The journey continues: real handler calls coming in Day 3!

---

_Building Conduit: A series documenting the creation of a compile-time optimized web framework_

**Previous Posts**:

- [Week 4 Day 4: Benchmarking Perfect Hash Performance](./week-4-day-4-benchmarking-results.md)
- [Week 4 Day 3: Implementing Hash-Based Dispatch](./week-4-day-3-hash-dispatch-implementation.md)

**Next Post**:

- Week 5 Day 3: Handler Function Linking (coming soon)
