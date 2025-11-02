#!/bin/bash
set -e

echo "Running Conduit tests..."

# Check if Codon is installed
if ! command -v codon &> /dev/null; then
    echo "Error: Codon is not installed"
    exit 1
fi

# Run all tests
echo "Running unit tests..."
test_count=0
pass_count=0
fail_count=0

for test in tests/*.codon; do
    filename=$(basename "$test")
    test_count=$((test_count + 1))
    
    echo -n "  Testing $filename... "
    
    if codon run "$test" > /dev/null 2>&1; then
        echo "✓ PASS"
        pass_count=$((pass_count + 1))
    else
        echo "✗ FAIL"
        fail_count=$((fail_count + 1))
    fi
done

echo ""
echo "Test Results:"
echo "  Total: $test_count"
echo "  Passed: $pass_count"
echo "  Failed: $fail_count"

if [ $fail_count -gt 0 ]; then
    exit 1
fi

echo ""
echo "✓ All tests passed!"
