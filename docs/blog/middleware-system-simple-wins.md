# Building a Middleware System in Codon: Why Simple Wins

**November 3, 2025** • _TurboX Development Blog_

---

You know that satisfying moment when you delete hundreds of lines of complex code and replace them with something simple that just _works_? That was today.

## The Problem: Adding Cross-Cutting Concerns

Every web framework needs middleware. Whether you're logging requests, adding CORS headers, timing responses, or authenticating users, you need a way to intercept and modify HTTP traffic without cluttering your route handlers.

In Python (or Express.js, or any mature framework), this is trivial:

```python
# Python/Flask
@app.before_request
def log_request():
    print(f"Request: {request.method} {request.path}")

@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response
```

But we're not in Python. We're in **Codon** - a Python-syntax language that compiles to native code with a much stricter type system.

## Attempt #1: The "Obvious" Solution (That Didn't Work)

Coming from Python, I tried the classic chain-of-responsibility pattern:

```codon
class Middleware:
    def process(self, request, next_handler):
        # Do something before
        response = next_handler(request)
        # Do something after
        return response

def execute_chain(middlewares, request, handler):
    # Build nested closures
    def build_chain(index):
        if index >= len(middlewares):
            return handler
        middleware = middlewares[index]
        next = build_chain(index + 1)
        return lambda req: middleware.process(req, next)

    chain = build_chain(0)
    return chain(request)
```

**Result:** `error: cannot typecheck 'build_chain(...)'`

Turns out Codon's type inference doesn't love recursive closure building. Who knew? 🤷

## Attempt #2: The Inheritance Trap

Okay, fine. Let's use inheritance and polymorphism like civilized developers:

```codon
class Middleware:
    def process(self, request, next_handler):
        pass

class LoggerMiddleware(Middleware):
    prefix: str
    def process(self, request, next_handler):
        print(f"{self.prefix} {request.method}")
        return next_handler(request)

# Factory function
def logger_middleware(prefix: str) -> Middleware:  # ← The problem
    return LoggerMiddleware(prefix)
```

This compiles! Ship it!

```bash
$ ./server
[DEBUG] Middleware type: Middleware  # Wait, what?
[DEBUG] isinstance check: False      # Oh no
```

**The Issue:** When you return a `LoggerMiddleware` as type `Middleware`, Codon performs type erasure. The concrete type information is lost, so `isinstance()` checks fail.

This is a fundamental difference from Python's dynamic typing. In Codon, the type annotation **matters**.

## The Breakthrough: Embrace Simplicity

After two hours of fighting the type system, I had an epiphany: _What if we just... don't use inheritance?_

```codon
# No base class, no polymorphism, just plain classes

class LoggerMiddleware:
    prefix: str

    def apply(self, request, response):
        """Simple method that modifies response"""
        print(f"{self.prefix} {request.method} {request.path}")
        print(f"{self.prefix} -> {response.status_code}")

class CORSMiddleware:
    origin: str

    def apply(self, request, response):
        response.set_header("Access-Control-Allow-Origin", self.origin)
        response.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

class TimingMiddleware:
    def apply(self, request, response):
        response.set_header("X-Response-Time", "0.00ms")
```

And instead of trying to store them in a generic `List[Middleware]`, just use separate typed lists:

```codon
class MiddlewareChain:
    loggers: List[LoggerMiddleware]       # Specific type
    cors_middleware: List[CORSMiddleware]  # Specific type
    timings: List[TimingMiddleware]        # Specific type

    def execute_post_process(self, request, response):
        for logger in self.loggers:
            logger.apply(request, response)
        for cors in self.cors_middleware:
            cors.apply(request, response)
        for timing in self.timings:
            timing.apply(request, response)
        return response
```

**Registration:**

```codon
def use(self, middleware):
    if isinstance(middleware, LoggerMiddleware):
        self.middleware_chain.add_logger(middleware)
    elif isinstance(middleware, CORSMiddleware):
        self.middleware_chain.add_cors(middleware)
    elif isinstance(middleware, TimingMiddleware):
        self.middleware_chain.add_timing(middleware)
```

**And it just works.** No type erasure, no failed isinstance checks, no complex closures.

## The Result

```codon
from conduit import Conduit
from conduit.http.middleware import logger_middleware, cors_middleware, timing_middleware

app = Conduit(port=8081)

app.use(logger_middleware("[MW-TEST]"))
app.use(cors_middleware("http://example.com"))
app.use(timing_middleware())

@app.get("/")
def index(request):
    return HTTPResponse().json({"message": "Hello, middleware!"})

app.run()
```

Testing it:

```bash
$ curl -i http://localhost:8081/

HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: http://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
X-Response-Time: 0.00ms
Content-Length: 35

{"message": "Hello, middleware!"}
```

Console output:

```
[MW-TEST] GET /
[MW-TEST] -> 200
```

**Perfect.**

## Why This Approach Works

### 1. **No Type Erasure**

Factory functions return concrete types:

```codon
def logger_middleware(prefix: str) -> LoggerMiddleware:  # Concrete!
    return LoggerMiddleware(prefix)
```

The type system knows exactly what you're passing to `use()`.

### 2. **isinstance() Just Works**

No inheritance hierarchy to confuse things:

```codon
if isinstance(middleware, LoggerMiddleware):  # ✅ True
    self.loggers.append(middleware)
```

### 3. **Compile-Time Safety**

Separate typed lists mean the compiler can verify you're calling the right methods:

```codon
for logger in self.loggers:  # Type: LoggerMiddleware
    logger.apply(request, response)  # ✅ Method exists
```

### 4. **Zero Runtime Overhead**

No dynamic dispatch, no vtable lookups. The compiler knows exactly which `apply()` method to call.

## Trade-offs

**What we gave up:**

- Generic middleware interface
- Dynamic middleware ordering
- Chain-of-responsibility pattern

**What we gained:**

- Type safety
- Zero overhead
- Code that actually compiles
- Simplicity

## The Lesson

When working with statically-typed compiled languages (even ones with Python syntax), **fight complexity with simplicity**.

- Don't reach for inheritance when composition works
- Don't build generic abstractions when specific types suffice
- Don't create clever solutions when boring code works

The Python way of thinking doesn't always translate. And that's okay.

## What's Next?

The middleware system is complete for v1.0, but there's room to grow:

**Future enhancements:**

- Pre-processing middleware (modify requests before routing)
- Short-circuit support (return early without calling handler)
- Async middleware for I/O operations
- Custom user-defined middleware

For now though, we have:

- ✅ Request logging
- ✅ CORS headers
- ✅ Response timing
- ✅ Clean, simple API
- ✅ Type-safe implementation
- ✅ Zero overhead

Sometimes the best code is the code you don't write.

## Try It Yourself

```bash
# Clone TurboX
git clone https://github.com/cruso003/TurboX
cd TurboX

# Build example
CODON_PATH=. codon build -plugin conduit tests/test_middleware.codon -o server

# Run
./server

# Test
curl -i http://localhost:8081/
```

See the full middleware code at [`conduit/http/middleware.codon`](https://github.com/cruso003/TurboX/blob/main/conduit/http/middleware.codon).

---

**Tags:** #codon #middleware #webdev #typesystems #lessonslearned

**Discussion:** What middleware would you want in a web framework? Authentication? Rate limiting? Request validation? Let me know what you'd like to see in v2.0!

---

_This is part of the TurboX development blog series. Follow along as we build a high-performance web framework in Codon._

**Previous:** [Week 6 Day 1-2: Compile-Time Routing Optimization](week6-day1-2-routing-optimization.md)  
**Next:** Coming soon - v1.0 preparation
