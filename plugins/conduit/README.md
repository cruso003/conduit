# Conduit Plugin

Compile-time routing optimization plugin for the Conduit web framework.

## Overview

This plugin transforms Conduit web applications during compilation, generating optimized dispatch code that eliminates runtime overhead from route matching.

## Building

### Prerequisites

- Codon 0.16.0 or later
- CMake 3.14+
- C++17 compiler (clang++ or g++)
- LLVM (optional, improves compatibility)

### Build Steps

```bash
cd plugins/conduit
mkdir build
cd build
cmake ..
make
make install
```

This installs the plugin to `~/.codon/lib/codon/plugins/conduit/`

### Custom Installation Path

```bash
cmake -DCMAKE_INSTALL_PREFIX=/custom/path ..
```

### Custom Codon Path

```bash
cmake -DCODON_PATH=/custom/codon/path ..
```

## Usage

Compile Conduit applications with the plugin enabled:

```bash
codon build -plugin conduit examples/my_app.codon
```

Or run directly:

```bash
codon run -plugin conduit examples/my_app.codon
```

## Development Status

**Week 1**: ✅ Hello World Plugin (current)

- Basic plugin structure
- Loads during compilation
- Prints confirmation message

**Week 2**: Route Detection (planned)

- Detect `@app.get()` and similar decorators
- Extract route information from IR
- Print detected routes for verification

**Week 3**: Dispatch Generation (planned)

- Generate `conduit_dispatch()` function
- Create if/elif routing chain
- Replace manual dispatch

**Week 4**: Optimization (planned)

- Perfect hash function for route lookup
- Inline handler functions
- Path parameter extraction
- Dead code elimination

## Testing

```bash
# Test plugin loads successfully
codon build -plugin conduit -release examples/framework_autogen.codon

# Should see:
# ╔══════════════════════════════════════════════════════════╗
# ║  🚀 Conduit Plugin Loaded!                              ║
# ║                                                          ║
# ║  Compile-time routing optimization enabled               ║
# ╚══════════════════════════════════════════════════════════╝
```

## License

MIT License - See LICENSE file in project root
