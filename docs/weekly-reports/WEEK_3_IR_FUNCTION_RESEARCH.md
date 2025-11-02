# Week 3 Research: IR Function Creation API

## Overview

This document compiles research on Codon's CIR (Codon Intermediate Representation) API for creating and manipulating functions programmatically within a compiler plugin.

## Key Classes & APIs

### 1. Module API

**Location**: `~/.codon/include/codon/cir/module.h`

**Function Creation Methods**:

```cpp
// Get or create a function with specific signature
Func *getOrRealizeFunc(const std::string &funcName,
                       std::vector<types::Type *> args,
                       std::vector<types::Generic> generics = {},
                       const std::string &module = "");

// Get or create a method (function attached to a type)
Func *getOrRealizeMethod(types::Type *parent,
                          const std::string &methodName,
                          std::vector<types::Type *> args,
                          std::vector<types::Generic> generics = {});

// Get function type
types::Type *getFuncType(types::Type *rType,
                          std::vector<types::Type *> argTypes,
                          bool variadic = false);

// Get basic types
types::Type *getVoidType();
types::Type *getBoolType();
types::Type *getIntType();
types::Type *getFloatType();
types::Type *getStringType();
```

**Node Creation (Nr<T>)**:

```cpp
// Module::Nr<T>() creates new IR nodes
auto *func = M->Nr<BodiedFunc>("function_name");
auto *series = M->Nr<SeriesFlow>();
auto *ifFlow = M->Nr<IfFlow>(condition, trueBranch, falseBranch);
auto *var = M->Nr<Var>(type, isGlobal, isExternal, "var_name");
```

### 2. BodiedFunc (Function with Body)

**Location**: `~/.codon/include/codon/cir/func.h`

**Key Features**:

- Represents functions with actual implementation bodies
- Contains list of arguments and local variables (symbols)
- Has a body (Flow\*) representing control flow

**API**:

```cpp
class BodiedFunc : public AcceptorExtend<BodiedFunc, Func> {
  // Initialize function with type and argument names
  void realize(types::Type *newType, const std::vector<std::string> &names);

  // Set function body (control flow graph)
  void setBody(Flow *b);
  Flow *getBody();

  // Add local variables/symbols
  void push_back(Var *v);

  // Function arguments
  auto arg_begin();
  auto arg_end();
  Var *arg_front();
  Var *arg_back();
  Var *getArgVar(const std::string &name);

  // Local variables
  auto begin();  // iterate symbols
  auto end();
};
```

**Creation Pattern** (from GitHub examples):

```cpp
// 1. Create function node
auto *M = module;
auto *fn = M->Nr<BodiedFunc>("my_function");

// 2. Create function type
auto *returnType = M->getIntType();
std::vector<types::Type*> argTypes = {M->getStringType(), M->getStringType()};
auto *fnType = M->getFuncType(returnType, argTypes);

// 3. Realize function with argument names
std::vector<std::string> argNames = {"method", "path"};
fn->realize(fnType, argNames);

// 4. Create function body
auto *body = M->Nr<SeriesFlow>();
fn->setBody(body);

// 5. Add local variables if needed
auto *var = M->Nr<Var>(M->getIntType(), false, false, "result");
fn->push_back(var);
```

### 3. Flow Types (Control Flow)

**Location**: `~/.codon/include/codon/cir/flow.h`

#### SeriesFlow (Sequential Execution)

```cpp
class SeriesFlow : public AcceptorExtend<SeriesFlow, Flow> {
  void push_back(Value *f);  // Add instruction/flow to sequence
  auto begin() / end();      // Iterate contents
  Value *front() / back();   // Access first/last element
};
```

#### IfFlow (Conditional)

```cpp
class IfFlow : public AcceptorExtend<IfFlow, Flow> {
  // Constructor
  IfFlow(Value *cond, Flow *trueBranch, Flow *falseBranch = nullptr);

  // Getters/Setters
  Value *getCond();
  void setCond(Value *c);
  Flow *getTrueBranch();
  void setTrueBranch(Flow *f);
  Flow *getFalseBranch();
  void setFalseBranch(Flow *f);
};
```

**Usage Example**:

```cpp
// Create if/elif/else chain
auto *cond1 = /* comparison */;
auto *trueBranch1 = M->Nr<SeriesFlow>();
auto *elseBranch = M->Nr<SeriesFlow>();

// Nested if = elif
auto *cond2 = /* another comparison */;
auto *trueBranch2 = M->Nr<SeriesFlow>();
auto *ifFlow2 = M->Nr<IfFlow>(cond2, trueBranch2, elseBranch);

auto *ifFlow1 = M->Nr<IfFlow>(cond1, trueBranch1, ifFlow2);
```

#### WhileFlow (Loop)

```cpp
class WhileFlow : public AcceptorExtend<WhileFlow, Flow> {
  WhileFlow(Value *cond, Flow *body);
  Value *getCond();
  Flow *getBody();
};
```

### 4. IR Instructions

**Location**: `~/.codon/include/codon/cir/instr.h`

#### CallInstr (Function Call)

```cpp
// Create call instruction (util/irtools.h)
CallInstr *call(Func *func, const std::vector<Value *> &args);

// Example
auto *handler = /* get handler function */;
auto *request = /* get request value */;
auto *callResult = util::call(handler, {request});
```

#### AssignInstr (Assignment)

```cpp
auto *assignInstr = M->Nr<AssignInstr>(targetVar, sourceValue);
```

#### ReturnInstr (Return Statement)

```cpp
auto *returnInstr = M->Nr<ReturnInstr>(valueToReturn);
```

### 5. Utility Functions

**Location**: `~/.codon/include/codon/cir/util/irtools.h`

```cpp
namespace util {
  // Create function call
  CallInstr *call(Func *func, const std::vector<Value *> &args);

  // Create and assign new variable
  Var *makeVar(Value *x, SeriesFlow *flow, BodiedFunc *parent,
               bool prepend = false);

  // Build series flow
  template<typename... Args>
  SeriesFlow *series(Args... args);

  // Create tuple
  Value *makeTuple(const std::vector<Value *> &args, Module *M = nullptr);
}
```

### 6. Constants & Literals

**Location**: `~/.codon/include/codon/cir/const.h`

```cpp
// String constant
auto *str = M->getString("hello");

// Integer constant
auto *num = M->getInt(42);

// Boolean constant
auto *bool_val = M->getBool(true);

// Template for custom constants
template<typename T>
class TemplatedConst : public AcceptorExtend<TemplatedConst<T>, Const> {
  T getVal() const;
};

using StringConst = TemplatedConst<std::string>;
using IntConst = TemplatedConst<int64_t>;
```

### 7. Variables & Values

**Location**: `~/.codon/include/codon/cir/var.h`, `value.h`

```cpp
// Create variable
auto *var = M->Nr<Var>(type, isGlobal, isExternal, "name");

// Reference variable
auto *varValue = M->Nr<VarValue>(var);

// Pointer value
auto *ptrValue = M->Nr<PointerValue>(var);
```

## Real-World Example from Codon Source

### Example 1: Creating Reduction Combiner Function

**From**: `codon/cir/transform/parallel/openmp.cpp:958-968`

```cpp
BodiedFunc *makeTaskRedCombFunc(Reduction *reduction) {
  auto *M = parent->getModule();

  // 1. Define argument types
  auto *argType = M->getPointerType(reduction->getType());

  // 2. Create function type (void return, 2 pointer args)
  auto *funcType = M->getFuncType(M->getNoneType(), {argType, argType});

  // 3. Create BodiedFunc node
  auto *reducer = M->Nr<BodiedFunc>("__red_comb");

  // 4. Realize with argument names
  reducer->realize(funcType, {"lhs", "rhs"});

  // 5. Get arguments
  auto *lhsVar = reducer->arg_front();
  auto *rhsVar = reducer->arg_back();

  // 6. Create body
  auto *body = M->Nr<SeriesFlow>();

  // 7. Add operations to body
  auto *lhsPtr = M->Nr<VarValue>(lhsVar);
  body->push_back(util::ptrStore(lhsPtr, reduction->getInitial()));

  // 8. Set function body
  reducer->setBody(body);

  return reducer;
}
```

### Example 2: Building If/Else Control Flow

**From**: `test/cir/analyze/reaching.cpp`

```cpp
auto *f = module->Nr<BodiedFunc>("test_f");
auto *b = module->Nr<SeriesFlow>();
f->setBody(b);

// Create variable
auto *v = module->Nr<Var>(module->getIntType());
f->push_back(v);

// Create values
auto *first = module->getInt(1);
auto *second = module->getInt(2);

// Create instructions
auto *start = module->getBool(false);
auto *firstAssign = module->Nr<AssignInstr>(v, first);
auto *secondAssign = module->Nr<AssignInstr>(v, second);
auto *end = module->getBool(false);

// Build series
b->push_back(start);
b->push_back(firstAssign);
b->push_back(secondAssign);
b->push_back(end);
```

### Example 3: Function with While Loop

```cpp
auto *loopBody = module->Nr<SeriesFlow>();
auto *whileFlow = module->Nr<WhileFlow>(module->getBool(false), loopBody);
auto *b = module->Nr<SeriesFlow>();
f->setBody(b);

b->push_back(start);
b->push_back(firstAssign);
b->push_back(whileFlow);
loopBody->push_back(secondAssign);
b->push_back(end);
```

## Plan for Dispatch Function

Based on this research, here's how to create `conduit_dispatch()`:

```cpp
BodiedFunc* createDispatchFunction(Module *M, const std::vector<RouteInfo> &routes) {
  // 1. Get Request and Response types (from Conduit framework)
  auto *RequestType = M->getOrRealizeType("Request", {}, "conduit");
  auto *ResponseType = M->getOrRealizeType("Response", {}, "conduit");
  auto *StringType = M->getStringType();

  // 2. Create function type: (str, str, Request) -> Response
  std::vector<types::Type*> argTypes = {StringType, StringType, RequestType};
  auto *funcType = M->getFuncType(ResponseType, argTypes);

  // 3. Create and realize function
  auto *dispatch = M->Nr<BodiedFunc>("conduit_dispatch");
  dispatch->realize(funcType, {"method", "path", "request"});

  // 4. Get argument variables
  auto *methodVar = dispatch->getArgVar("method");
  auto *pathVar = dispatch->getArgVar("path");
  auto *requestVar = dispatch->getArgVar("request");

  // 5. Create function body
  auto *body = M->Nr<SeriesFlow>();

  // 6. Build if/elif chain for route matching
  Flow *currentElse = create404Response(M);  // fallback

  for (auto it = routes.rbegin(); it != routes.rend(); ++it) {
    const auto &route = *it;

    // Create condition: method == "GET" and path == "/users"
    auto *methodEq = createStringCompare(M, methodVar, route.method);
    auto *pathEq = createStringCompare(M, pathVar, route.path);
    auto *condition = createLogicalAnd(M, methodEq, pathEq);

    // Create true branch: call handler
    auto *trueBranch = M->Nr<SeriesFlow>();
    auto *handler = route.handler_func;
    auto *callResult = util::call(handler, {M->Nr<VarValue>(requestVar)});
    trueBranch->push_back(M->Nr<ReturnInstr>(callResult));

    // Create if/elif
    currentElse = M->Nr<IfFlow>(condition, trueBranch, currentElse);
  }

  body->push_back(currentElse);

  // 7. Set function body
  dispatch->setBody(body);

  return dispatch;
}
```

## Key Insights

1. **Nr<T>() Template**: Module has `Nr<T>()` method for creating any IR node type
2. **Two-Step Function Creation**: Create node, then `realize()` with type and arg names
3. **Flow Graph Construction**: Build nested Flow objects, set as body
4. **Backward Assembly**: For if/elif chains, build from end to start (nest else branches)
5. **Variable References**: Use `VarValue` to reference variables in expressions
6. **Type Lookup**: Can use `getOrRealizeType()` to find framework types
7. **String Comparison**: Need to call string `__eq__` method for comparisons
8. **Logical Operators**: Need to call `and`/`or` operators or create BinaryInstr

## Next Steps

1. ✅ Research complete
2. **Week 3 Day 2**: Implement basic dispatch skeleton
   - Create empty `conduit_dispatch()` function
   - Add to module
   - Verify it compiles
3. **Week 3 Day 3**: Build route matching logic
   - Implement string comparison helper
   - Build if/elif chain
   - Call handler functions
4. **Week 3 Day 4**: Add 404 handling and testing
   - Create fallback response
   - Test all routes dispatch correctly
   - Benchmark performance

## References

- Codon IR Headers: `~/.codon/include/codon/cir/`
- Key Files:
  - `module.h` - Module and type APIs
  - `func.h` - Function classes (BodiedFunc, etc.)
  - `flow.h` - Control flow (IfFlow, SeriesFlow, etc.)
  - `instr.h` - Instructions (CallInstr, AssignInstr, etc.)
  - `util/irtools.h` - Helper functions
  - `const.h` - Constants and literals
- Example Code:
  - `codon/cir/transform/parallel/openmp.cpp` - Function creation
  - `test/cir/analyze/reaching.cpp` - Control flow construction
  - `codon/cir/util/outlining.cpp` - Complex IR transformation
