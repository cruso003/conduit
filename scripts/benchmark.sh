#!/bin/bash
set -e

echo "Running TurboX benchmarks..."

# Check dependencies
if ! command -v wrk &> /dev/null; then
    echo "Warning: wrk not found. Install for HTTP benchmarks."
    echo "  Ubuntu/Debian: sudo apt-get install wrk"
    echo "  macOS: brew install wrk"
fi

# Build benchmarks
echo "Building benchmarks..."
mkdir -p build/benchmarks

for bench in benchmarks/*.codon; do
    filename=$(basename "$bench" .codon)
    echo "  Building $filename..."
    codon build -release "$bench" -o "build/benchmarks/$filename"
done

echo ""
echo "Benchmarks built in build/benchmarks/"
echo ""
echo "To run HTTP benchmark:"
echo "  1. Start server: ./build/benchmarks/http_benchmark"
echo "  2. In another terminal: wrk -t4 -c100 -d30s http://localhost:8000/"
