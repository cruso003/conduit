# Building a TCP Socket Server with Codon's C FFI: A Journey from Python to Native Performance

## Introduction

Building TurboX, a high-performance web framework in Codon, presented an interesting challenge: Codon doesn't include a built-in socket library. This is the story of how we implemented low-level TCP sockets using Codon's Foreign Function Interface (FFI) to call POSIX C functions directly, achieving native performance while learning valuable lessons about systems programming.

## The Challenge

When we started, the goal seemed straightforward: create a simple TCP echo server. However, we quickly discovered that:

1. **Codon is not Python** - Despite similar syntax, Codon is a statically compiled language
2. **No standard socket library** - Unlike Python, Codon doesn't ship with a socket module
3. **Different exception model** - Custom exceptions don't work the same way
4. **Platform-specific quirks** - macOS has different socket constants and structures than Linux

## The Journey

### Attempt 1: The Python Way (Failed)

Our first instinct was to try importing Python's socket module:

```python
from python import socket  # This requires Python runtime
```

While this works, it defeats the purpose of using Codon - we'd be calling back to Python, losing all performance benefits. We needed a pure native solution.

### Attempt 2: Learning C FFI Syntax

We discovered Codon's C FFI allows direct function imports from C libraries:

```python
from C import socket(int, int, int) -> int
```

But this led to our first major error:

```
error: int takes 0 generics (1 given)
```

**The Problem:** The function name `socket` conflicted with our `Socket` class name!

**The Solution:** Use aliases to avoid naming conflicts:

```python
from C import socket(int, int, int) -> int as c_socket
from C import bind(int, cobj, u32) -> int as c_bind
from C import listen(int, int) -> int as c_listen
```

### Challenge 1: Reserved Keywords

```python
def __init__(self, domain: int = 0, type: int = 0, protocol: int = 0):
```

**Error:** `type` is a reserved keyword in Codon!

**Solution:** Rename to `sock_type`:

```python
def __init__(self, domain: int = 0, sock_type: int = 0, protocol: int = 0):
```

### Challenge 2: Exception Handling

We tried creating a custom exception:

```python
class SocketError(Exception):
    pass
```

**Error:** `exceptions must derive from BaseException`

Then we tried:

```python
class SocketError(BaseException):
    pass
```

**Error:** `__init__() missing 1 required positional argument: 'message'`

**The Realization:** Codon's exception system is fundamentally different from Python's. It doesn't support polymorphic classes or `super()` calls.

**Solution:** Just use `ValueError` directly:

```python
if self.fd < 0:
    raise ValueError("Failed to create socket")
```

### Challenge 3: Platform-Specific Constants

We initially used "standard" POSIX values:

```python
SOL_SOCKET = 1
SO_REUSEADDR = 2
```

But on macOS, these values are different! We wrote a quick C test program:

```c
printf("SOL_SOCKET = %d\n", SOL_SOCKET);     // 65535!
printf("SO_REUSEADDR = %d\n", SO_REUSEADDR); // 4!
```

**The Fix:**

```python
# Socket constants (macOS values)
SOL_SOCKET = 65535  # 0xFFFF on macOS
SO_REUSEADDR = 4
```

### Challenge 4: The sockaddr_in Structure

The most subtle bug was in the `bind()` function. On Linux, `struct sockaddr_in` starts with:

- `sin_family` (2 bytes)
- `sin_port` (2 bytes)

But on macOS, there's an extra field at the beginning:

- `sin_len` (1 byte) - **macOS specific!**
- `sin_family` (1 byte)
- `sin_port` (2 bytes)

Our initial code:

```python
addr[0] = byte(AF_INET & 0xFF)  # Wrong offset!
addr[1] = byte((AF_INET >> 8) & 0xFF)
```

**The Fix:**

```python
# macOS sockaddr_in layout
addr[0] = byte(16)        # sin_len (structure size)
addr[1] = byte(AF_INET)   # sin_family
addr[2] = byte(port_be & 0xFF)      # sin_port (network byte order)
addr[3] = byte((port_be >> 8) & 0xFF)
```

We discovered this by writing a C test program to check structure offsets:

```c
struct sockaddr_in addr;
printf("offsetof sin_len = %lu\n", (unsigned long)&addr.sin_len - (unsigned long)&addr);
printf("offsetof sin_family = %lu\n", (unsigned long)&addr.sin_family - (unsigned long)&addr);
```

### Challenge 5: Pointer Type Conversions

The `accept()` function needed a pointer to `socklen_t` (a `u32`):

```python
addrlen = u32(16)
client_fd = c_accept(self.fd, addr.ptr, Ptr[u32](__ptr__(addrlen)))  # Failed!
```

**Error:** `'Ptr[UInt[32]]' does not match expected type 'Ptr[byte]'`

**Solution:** Use an array and cast to `cobj`:

```python
addrlen = Array[u32](1)
addrlen[0] = u32(16)
client_fd = c_accept(self.fd, addr.ptr, cobj(addrlen.ptr))
```

### Challenge 6: Object Construction

Creating a new Socket instance for accepted connections:

```python
client = Socket.__new__(Socket)  # Error: __new__() takes 0 arguments
```

**Solution:**

```python
client = Socket.__new__()
client.fd = client_fd
```

### Challenge 7: Runtime Dependencies

When we finally compiled the binary:

```bash
$ ./echo_server
dyld: Library not loaded: @loader_path/libomp.dylib
```

Codon uses OpenMP for parallelism, and the binary needed the library at runtime.

**Solution:** Copy the library to the binary's directory:

```bash
cp /Users/rgt/.codon/lib/codon/libomp.dylib ./
```

## The Joy of Success

After all these challenges, when we finally ran:

```bash
Terminal 1: ./echo_server
TurboX Echo Server
==================
✓ Server listening on 0.0.0.0:8080
✓ Waiting for connections...

Terminal 2: echo "Hello TurboX" | nc localhost 8080
Hello TurboX  # IT WORKS! 🎉
```

The satisfaction was immense! We had successfully:

- ✅ Built a pure native TCP server with C FFI
- ✅ No Python runtime dependency
- ✅ 164KB compiled binary
- ✅ C-level performance
- ✅ Full control over socket operations

## Key Lessons Learned

1. **Codon is not Python** - Similar syntax doesn't mean same behavior. It's a compiled language with different semantics.

2. **Read the error messages carefully** - Each error taught us something about Codon's type system and compilation model.

3. **Platform matters** - Socket programming is platform-specific. Always verify constants and structure layouts.

4. **C FFI requires precision** - Type signatures must be exact. Pointers, sizes, and byte order all matter.

5. **Testing incrementally helps** - We created small test programs (`test_c_ffi.codon`, `test_exception.codon`) to verify concepts before integrating them.

6. **Debug with C** - When in doubt, write equivalent C code to verify what the correct values and structures should be.

## The Final Implementation

Here's a simplified view of our socket wrapper:

```python
# C function imports with aliases
from C import socket(int, int, int) -> int as c_socket
from C import bind(int, cobj, u32) -> int as c_bind
from C import listen(int, int) -> int as c_listen
from C import accept(int, cobj, cobj) -> int as c_accept
from C import recv(int, cobj, int, int) -> int as c_recv
from C import send(int, cobj, int, int) -> int as c_send
from C import close(int) -> int as c_close
from C import setsockopt(int, int, int, cobj, u32) -> int as c_setsockopt
from C import htons(u16) -> u16

# macOS socket constants
AF_INET = 2
SOCK_STREAM = 1
SOL_SOCKET = 65535
SO_REUSEADDR = 4

class Socket:
    fd: int

    def __init__(self, domain: int = 0, sock_type: int = 0, protocol: int = 0):
        if domain == 0:
            domain = AF_INET
        if sock_type == 0:
            sock_type = SOCK_STREAM

        self.fd = c_socket(domain, sock_type, protocol)

        if self.fd < 0:
            raise ValueError("Failed to create socket")

    def bind(self, host: str, port: int):
        # Create macOS sockaddr_in structure
        addr = Array[byte](16)
        addr[0] = byte(16)              # sin_len
        addr[1] = byte(AF_INET)         # sin_family

        port_be = int(htons(u16(port)))
        addr[2] = byte(port_be & 0xFF)
        addr[3] = byte((port_be >> 8) & 0xFF)

        # INADDR_ANY (0.0.0.0)
        for i in range(4, 8):
            addr[i] = byte(0)

        result = c_bind(self.fd, addr.ptr, u32(16))
        if result < 0:
            raise ValueError(f"Failed to bind to {host}:{port}")

    # ... more methods
```

## Performance Benefits

Because we're using C FFI directly:

- **No Python interpreter overhead** - Pure native code
- **Zero-copy operations** - Direct memory manipulation
- **Compile-time optimization** - LLVM optimizes everything
- **Small binary size** - 164KB for a complete TCP server

## Future Improvements

1. **Cross-platform support** - Abstract platform-specific constants
2. **IPv6 support** - Add AF_INET6 handling
3. **Non-blocking sockets** - Add fcntl/epoll/kqueue support
4. **SSL/TLS** - Integrate OpenSSL via FFI
5. **UDP support** - Add SOCK_DGRAM operations

## Conclusion

Building sockets with Codon's C FFI was challenging but incredibly rewarding. We learned about:

- Systems programming fundamentals
- Platform-specific socket implementations
- The differences between interpreted and compiled languages
- How to debug low-level C FFI issues
- The importance of understanding the underlying platform

The result is a high-performance, native socket implementation that forms the foundation for TurboX's networking capabilities. This journey proves that Codon can be used for serious systems programming while maintaining Python-like syntax.

The struggles made the success sweeter, and now we have a solid foundation to build a truly high-performance web framework!

## Try It Yourself

Clone the TurboX repository and try the echo server:

```bash
git clone https://github.com/cruso003/TurboX.git
cd TurboX
git checkout feature/socket-implementation

# Build
CODON_PATH="$(pwd)" codon build examples/echo_server.codon -o echo_server

# Copy OpenMP library
cp ~/.codon/lib/codon/libomp.dylib ./

# Run
./echo_server

# Test (in another terminal)
echo "Hello!" | nc localhost 8080
```

Happy hacking! 🚀

---

_Written after successfully implementing TCP sockets in Codon through trial, error, and perseverance._
