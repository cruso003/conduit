#!/usr/bin/env bash
#
# Conduit Build Script
#
# Automatically generates dispatch code and builds Conduit applications
#
# Usage:
#   ./scripts/build_conduit.sh examples/my_app.codon
#   ./scripts/build_conduit.sh examples/my_app.codon -o my_app
#
# What it does:
#   1. Runs generate_dispatch.py to create dispatch code
#   2. Compiles with codon build
#   3. Creates native binary
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC}  $1"
}

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <source.codon> [codon_build_options]"
    echo ""
    echo "Examples:"
    echo "  $0 examples/my_app.codon"
    echo "  $0 examples/my_app.codon -o my_app"
    echo "  $0 examples/my_app.codon -release -o my_app"
    echo ""
    exit 1
fi

SOURCE_FILE="$1"
shift  # Remove first argument, rest are codon build options
CODON_OPTS="$@"

# Check file exists
if [ ! -f "$SOURCE_FILE" ]; then
    error "File not found: $SOURCE_FILE"
    exit 1
fi

# Check it's a .codon file
if [[ ! "$SOURCE_FILE" =~ \.codon$ ]]; then
    error "Expected .codon file, got: $SOURCE_FILE"
    exit 1
fi

echo ""
echo "========================================================================"
echo "  Conduit Build Script"
echo "========================================================================"
echo ""

# Step 1: Generate dispatch code
info "Step 1: Generating dispatch code..."
echo ""

python3 tools/generate_dispatch.py "$SOURCE_FILE"

if [ $? -ne 0 ]; then
    error "Failed to generate dispatch code"
    exit 1
fi

echo ""
success "Dispatch code generated"
echo ""

# Step 2: Build with Codon
info "Step 2: Building with Codon..."
echo ""

# Set CODON_PATH to current directory
export CODON_PATH=.

# Build command
BUILD_CMD="codon build $SOURCE_FILE $CODON_OPTS"
info "Running: $BUILD_CMD"
echo ""

$BUILD_CMD

if [ $? -ne 0 ]; then
    error "Failed to build with Codon"
    exit 1
fi

echo ""
success "Build complete!"
echo ""

# Show output info
if [[ "$CODON_OPTS" =~ -o[[:space:]]+([^[:space:]]+) ]]; then
    OUTPUT_FILE="${BASH_REMATCH[1]}"
else
    # Default output name (source file without .codon extension)
    OUTPUT_FILE="${SOURCE_FILE%.codon}"
fi

echo "========================================================================"
success "Conduit application built successfully!"
echo "========================================================================"
echo ""
info "Binary: $OUTPUT_FILE"
info "Size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
info "Run with: ./$OUTPUT_FILE"
echo ""
