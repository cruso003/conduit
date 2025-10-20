#!/bin/bash
set -e

echo "Installing TurboX..."

# Check if Codon is installed
if ! command -v codon &> /dev/null; then
    echo "Codon not found. Installing..."
    /bin/bash -c "$(curl -fsSL https://exaloop.io/install.sh)"
fi

# Build TurboX
echo "Building TurboX..."
./scripts/build.sh

# Install to user directory (optional)
echo ""
echo "✓ TurboX installed!"
echo ""
echo "Next steps:"
echo "  1. Try an example: codon run examples/hello_world.codon"
echo "  2. Read the docs: cat docs/getting-started.md"
echo "  3. Build something cool!"
