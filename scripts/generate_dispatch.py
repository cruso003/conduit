#!/usr/bin/env python3
"""
Conduit Dispatch Code Generator

Automatically generates the handler dispatch code from your route definitions.

Usage:
    python scripts/generate_dispatch.py your_app.codon

This scans your .codon file for @app.get/@app.post decorators and generates
the dispatch if/elif chain automatically.
"""

import re
import sys
from pathlib import Path

def extract_routes(codon_file: Path):
    """Extract route decorators and function names from Codon file"""
    routes = []
    content = codon_file.read_text()
    
    # Pattern: @app.METHOD("pattern")  followed by  def function_name(request):
    pattern = r'@app\.(get|post|put|delete|patch)\("([^"]+)"\)\s+def\s+(\w+)\s*\('
    
    for match in re.finditer(pattern, content):
        method = match.group(1).upper()
        route_pattern = match.group(2)
        function_name = match.group(3)
        routes.append({
            'method': method,
            'pattern': route_pattern,
            'function': function_name
        })
    
    return routes

def generate_dispatch_code(routes):
    """Generate the if/elif dispatch chain"""
    lines = []
    lines.append("# Auto-generated dispatch code")
    lines.append("# Regenerate with: python scripts/generate_dispatch.py your_app.codon")
    lines.append("")
    lines.append("if not matched:")
    lines.append("    response = app.not_found_response()")
    lines.append("else:")
    lines.append("    result = None")
    lines.append("")
    
    for idx, route in enumerate(routes):
        if idx == 0:
            lines.append(f"    if route_idx == {idx}:  # {route['method']} {route['pattern']}")
        else:
            lines.append(f"    elif route_idx == {idx}:  # {route['method']} {route['pattern']}")
        lines.append(f"        result = {route['function']}(request)")
    
    lines.append("    else:")
    lines.append("        response = app.error_response(\"Unknown route index\")")
    lines.append("")
    lines.append("    if result is not None:")
    lines.append("        response = app.to_response(result)")
    
    return "\n".join(lines)

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/generate_dispatch.py your_app.codon")
        sys.exit(1)
    
    codon_file = Path(sys.argv[1])
    if not codon_file.exists():
        print(f"Error: File '{codon_file}' not found")
        sys.exit(1)
    
    print(f"📝 Analyzing {codon_file.name}...")
    routes = extract_routes(codon_file)
    
    if not routes:
        print("⚠️  No routes found. Make sure you have @app.get/@app.post decorators.")
        sys.exit(1)
    
    print(f"✅ Found {len(routes)} routes:")
    for idx, route in enumerate(routes):
        print(f"   [{idx}] {route['method']:6} {route['pattern']:30} → {route['function']}()")
    
    print("\n" + "="*70)
    print("Generated Dispatch Code:")
    print("="*70 + "\n")
    
    dispatch_code = generate_dispatch_code(routes)
    print(dispatch_code)
    
    print("\n" + "="*70)
    print("📋 Copy the code above into your server loop")
    print("="*70)

if __name__ == "__main__":
    main()
