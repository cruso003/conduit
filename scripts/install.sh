#!/bin/bash
set -e

echo "Building TurboX..."

# Check if Codon is installed
if ! command -v codon &> /dev/null; then
    echo "Error: Codon is not installed"
    echo "Install from: https://github.com/exaloop/codon"
    exit 1
fi

# Set CODON_PATH to include current directory
export CODON_PATH="$(pwd):$CODON_PATH"

# Build examples
echo "Building examples..."
mkdir -p build/examples

for example in examples/*.codon; do
    filename=$(basename "$example" .codon)
    echo "  Building $filename..."
    codon build -release "$example" -o "build/examples/$filename"
done

# Build tests
echo "Building tests..."
mkdir -p build/tests

for test in tests/*.codon; do
    filename=$(basename "$test" .codon)
    echo "  Building $filename..."
    codon build "$test" -o "build/tests/$filename"
done

echo "✓ Build complete!"
echo ""
echo "Binaries available in build/"
echo "  Examples: build/examples/"
echo "  Tests: build/tests/"
