# TurboX Deployment Guide

Guide for deploying TurboX applications to production servers.

## Typical Deployment Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   macOS     │         │    Linux     │         │  Production │
│ Development │  ──────>│    Build     │  ──────>│   Server    │
│ Environment │         │   Server     │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
   (default)          (configure once)            (deploy binary)
```

## Step-by-Step Production Deployment

### 1. Development (macOS)

Develop and test locally with default settings:

```bash
# Works out of the box
CODON_PATH="/path/to/TurboX" codon run your_app.codon
```

### 2. Prepare for Linux Build

**One-time configuration** before building for Linux:

Edit `turbox/net/socket.codon` (around line 30):

```python
# Change these 3 lines:
SOL_SOCKET = 65535      # -> Change to: 1
SO_REUSEADDR = 4        # -> Change to: 2
_IS_MACOS = True        # -> Change to: False
```

**Tip:** Use environment-specific branches:
```bash
git checkout main              # macOS development
git checkout production-linux  # Linux deployment config
```

### 3. Build on Linux Server

```bash
# On your Linux build server
CODON_PATH="/path/to/TurboX" codon build your_app.codon -o app

# Copy OpenMP library if needed
cp ~/.codon/lib/codon/libomp.so ./

# Test
./app
```

### 4. Deploy Binary

```bash
# Package
tar -czf app.tar.gz app libomp.so

# Deploy
scp app.tar.gz user@production-server:/opt/myapp/
ssh user@production-server 'cd /opt/myapp && tar -xzf app.tar.gz'

# Run
ssh user@production-server '/opt/myapp/app'
```

## Docker Deployment

### Dockerfile for Linux Build

```dockerfile
FROM ubuntu:22.04

# Install Codon
RUN apt-get update && apt-get install -y curl
RUN curl -sSL https://github.com/exaloop/codon/releases/download/v0.16.0/codon-linux-x86_64.sh | bash

# Copy source
COPY . /app
WORKDIR /app

# Configure for Linux (this could be automated with sed)
RUN sed -i 's/SOL_SOCKET = 65535/SOL_SOCKET = 1/' turbox/net/socket.codon && \
    sed -i 's/SO_REUSEADDR = 4/SO_REUSEADDR = 2/' turbox/net/socket.codon && \
    sed -i 's/_IS_MACOS = True/_IS_MACOS = False/' turbox/net/socket.codon

# Build
RUN CODON_PATH="/app" ~/.codon/bin/codon build your_app.codon -o app

# Runtime
FROM ubuntu:22.04
COPY --from=0 /app/app /app
COPY --from=0 /root/.codon/lib/codon/libomp.so /lib/
EXPOSE 8080
CMD ["/app"]
```

### Build and Run

```bash
docker build -t turbox-app .
docker run -p 8080:8080 turbox-app
```

## Platform Configuration Quick Reference

| Setting | Development (macOS) | Production (Linux) |
|---------|--------------------|--------------------|
| `SOL_SOCKET` | 65535 | 1 |
| `SO_REUSEADDR` | 4 | 2 |
| `_IS_MACOS` | True | False |
| File | `turbox/net/socket.codon` | Same file |
| When | Default (no change) | Before build |

## Automation Script

Create `scripts/configure-platform.sh`:

```bash
#!/bin/bash
# Configure TurboX for target platform

PLATFORM=${1:-linux}
SOCKET_FILE="turbox/net/socket.codon"

if [ "$PLATFORM" = "linux" ]; then
    echo "Configuring for Linux..."
    sed -i.bak 's/SOL_SOCKET = 65535/SOL_SOCKET = 1/' $SOCKET_FILE
    sed -i.bak 's/SO_REUSEADDR = 4/SO_REUSEADDR = 2/' $SOCKET_FILE
    sed -i.bak 's/_IS_MACOS = True/_IS_MACOS = False/' $SOCKET_FILE
    echo "✓ Configured for Linux production"
elif [ "$PLATFORM" = "macos" ]; then
    echo "Configuring for macOS..."
    sed -i.bak 's/SOL_SOCKET = 1/SOL_SOCKET = 65535/' $SOCKET_FILE
    sed -i.bak 's/SO_REUSEADDR = 2/SO_REUSEADDR = 4/' $SOCKET_FILE
    sed -i.bak 's/_IS_MACOS = False/_IS_MACOS = True/' $SOCKET_FILE
    echo "✓ Configured for macOS development"
else
    echo "Usage: $0 [linux|macos]"
    exit 1
fi
```

Usage:
```bash
chmod +x scripts/configure-platform.sh
./scripts/configure-platform.sh linux   # Before Linux build
./scripts/configure-platform.sh macos   # Revert to macOS
```

## CI/CD Pipeline Example

### GitHub Actions

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Codon
        run: curl -sSL https://exaloop.io/install.sh | bash
      
      - name: Configure for Linux
        run: ./scripts/configure-platform.sh linux
      
      - name: Build
        run: |
          export CODON_PATH="${PWD}"
          ~/.codon/bin/codon build your_app.codon -o app
      
      - name: Upload artifact
        uses: actions/upload-artifact@v2
        with:
          name: app-linux
          path: |
            app
            ~/.codon/lib/codon/libomp.so
```

## Best Practices

1. **Version Control**
   - Keep socket.codon with macOS defaults in main branch
   - Configure platform as part of build process, not commit

2. **Build Once, Deploy Many**
   - Build on Linux server matching production OS
   - Deploy same binary to all production servers

3. **Environment Separation**
   - Dev: macOS with default config
   - Staging: Linux with production config
   - Prod: Same binary as staging

4. **Testing**
   - Test on macOS during development
   - Integration test on Linux before deployment
   - Use Docker for consistent Linux builds

## Troubleshooting

### Binary won't run on Linux
```bash
# Check architecture
file ./app

# Missing libomp.so
ldd ./app
cp ~/.codon/lib/codon/libomp.so /usr/local/lib/
```

### Wrong platform configuration
```bash
# Check current settings
grep "SOL_SOCKET\|SO_REUSEADDR\|_IS_MACOS" turbox/net/socket.codon

# Reconfigure
./scripts/configure-platform.sh linux
```

### Port already in use
```bash
# Change port in your app or kill process
lsof -ti :8080 | xargs kill
```

## Future Improvements

- Automatic platform detection at runtime
- Windows support
- FreeBSD/OpenBSD support
- Build matrix for multi-platform binaries

---

**TL;DR:** Change 3 lines in `turbox/net/socket.codon` before building for Linux. That's it! 🚀
