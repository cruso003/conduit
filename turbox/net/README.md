# TurboX Network Module

Cross-platform TCP socket implementation using Codon's C FFI.

## Platform Support

- ✅ **macOS** - Development environment (default configuration)
- ✅ **Linux** - Production deployment (requires configuration change)
- ⚠️ **Windows** - Not yet supported

## Quick Start (Development)

Works out of the box on macOS:

```python
from turbox.net import Socket

server = Socket()
server.set_reuseaddr()
server.bind("0.0.0.0", 8080)
server.listen(128)

while True:
    client = server.accept()
    data = client.recv(1024)
    client.send(data)
    client.close()
```

## Production Deployment (Linux)

Before building for Linux servers, edit `turbox/net/socket.codon`:

```python
# Change from (macOS dev environment):
SOL_SOCKET = 65535
SO_REUSEADDR = 4
_IS_MACOS = True

# To (Linux production):
SOL_SOCKET = 1
SO_REUSEADDR = 2
_IS_MACOS = False
```

Then build your application:
```bash
CODON_PATH="/path/to/TurboX" codon build your_app.codon -o app
```

## Why This Approach?

**Typical workflow:**
1. **Develop on macOS** - Default settings work perfectly
2. **Deploy to Linux** - Change 3 lines once before building production binary
3. **Ship compiled binary** - No runtime dependencies, native performance

This is a one-time configuration per deployment target, not per build.

## Platform Differences

| Constant | macOS (dev) | Linux (prod) | Purpose |
|----------|-------------|--------------|---------|
| `SOL_SOCKET` | 65535 | 1 | Socket level for setsockopt |
| `SO_REUSEADDR` | 4 | 2 | Allow address reuse option |
| `sockaddr_in` | Has `sin_len` | No `sin_len` | Structure layout |

The `bind()` method automatically handles the different `sockaddr_in` layouts based on `_IS_MACOS`.

## API Reference

### Socket Class

#### `Socket(domain: int = 0, sock_type: int = 0, protocol: int = 0)`
Create a new socket. Defaults to IPv4 TCP socket (AF_INET, SOCK_STREAM).

#### `bind(host: str, port: int)`
Bind socket to address and port. Automatically uses correct structure layout for platform.

#### `listen(backlog: int)`
Listen for incoming connections with specified backlog queue size.

#### `accept() -> Socket`
Accept incoming connection, returns new Socket for the client.

#### `recv(size: int) -> str`
Receive up to `size` bytes from socket. Raises `EOFError` if connection closed.

#### `send(data: str) -> int`
Send data through socket, returns number of bytes sent.

#### `set_reuseaddr()`
Enable SO_REUSEADDR option to allow immediate port reuse after server restart.

#### `close()`
Close the socket file descriptor.

## Performance

Pure C FFI implementation:
- **No Python runtime** - Fully compiled to native code
- **Zero-copy where possible** - Direct memory operations  
- **Small binaries** - ~164KB for echo server example
- **Native speed** - Performance equivalent to C/Go/Rust

## Examples

See `examples/echo_server.codon` for a complete TCP echo server implementation.

## Future Roadmap

- [ ] IPv6 support (AF_INET6)
- [ ] UDP sockets (SOCK_DGRAM)
- [ ] Non-blocking I/O
- [ ] SSL/TLS support
- [ ] Unix domain sockets
- [ ] Windows support
- [ ] Build script for automatic platform detection

## Contributing

When adding platform-specific code, clearly document the differences and update this README.

For implementation details and lessons learned, see `docs/building-sockets-with-codon-ffi.md`.
