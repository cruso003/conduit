#!/usr/bin/env python3
"""
Benchmark the Conduit plugin's dispatch performance.

This script:
1. Generates test files with varying route counts
2. Compiles them with the plugin
3. Measures compilation time and generated code characteristics
4. Compares Week 3 vs Week 4 dispatch implementations
"""

import subprocess
import time
import sys
import re
from pathlib import Path
from typing import Dict, List, Tuple
from dataclasses import dataclass


@dataclass
class BenchmarkResult:
    """Results from a single benchmark run."""
    route_count: int
    compilation_time: float
    perfect_hash_table_size: int
    load_factor: float
    dispatch_function_generated: bool
    error: str = ""


def run_command(cmd: List[str], cwd: Path = None, timeout: int = 60) -> Tuple[str, str, int, float]:
    """Run a command and return (stdout, stderr, returncode, elapsed_time)."""
    start_time = time.time()
    
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        elapsed = time.time() - start_time
        return result.stdout, result.stderr, result.returncode, elapsed
    except subprocess.TimeoutExpired:
        elapsed = time.time() - start_time
        return "", f"Command timed out after {timeout}s", -1, elapsed
    except Exception as e:
        elapsed = time.time() - start_time
        return "", str(e), -1, elapsed


def parse_plugin_output(output: str) -> Dict[str, any]:
    """Parse plugin output to extract metrics."""
    metrics = {
        "routes_detected": 0,
        "table_size": 0,
        "load_factor": 0.0,
        "dispatch_generated": False,
    }
    
    # Extract route count
    match = re.search(r"Detecting routes.*?(\d+) routes? found", output, re.DOTALL)
    if match:
        metrics["routes_detected"] = int(match.group(1))
    
    # Extract perfect hash info
    match = re.search(r"table_size=(\d+),\s*load=(\d+)%", output)
    if match:
        metrics["table_size"] = int(match.group(1))
        metrics["load_factor"] = int(match.group(2)) / 100.0
    
    # Check if dispatch was generated
    if "Generated: conduit_dispatch_hash" in output:
        metrics["dispatch_generated"] = True
    
    return metrics


def benchmark_file(test_file: Path, plugin_path: Path) -> BenchmarkResult:
    """Benchmark compilation of a single test file."""
    
    print(f"  → Testing {test_file.name}...", end=" ", flush=True)
    
    # Get route count from filename
    match = re.search(r"test_routes_(\d+)\.codon", test_file.name)
    route_count = int(match.group(1)) if match else 0
    
    # Compile with plugin
    cmd = ["codon", "build", "-plugin", "conduit", str(test_file)]
    stdout, stderr, returncode, elapsed = run_command(cmd, cwd=test_file.parent.parent)
    
    # Parse output
    combined_output = stdout + stderr
    metrics = parse_plugin_output(combined_output)
    
    if returncode != 0:
        print(f"❌ Failed ({elapsed:.2f}s)")
        return BenchmarkResult(
            route_count=route_count,
            compilation_time=elapsed,
            perfect_hash_table_size=0,
            load_factor=0.0,
            dispatch_function_generated=False,
            error=stderr[:200]  # First 200 chars of error
        )
    
    print(f"✅ {elapsed:.2f}s (table_size={metrics['table_size']}, load={metrics['load_factor']:.0%})")
    
    return BenchmarkResult(
        route_count=route_count,
        compilation_time=elapsed,
        perfect_hash_table_size=metrics["table_size"],
        load_factor=metrics["load_factor"],
        dispatch_function_generated=metrics["dispatch_generated"],
    )


def print_results_table(results: List[BenchmarkResult]):
    """Print benchmark results in a formatted table."""
    
    print("\n╔══════════════════════════════════════════════════════════╗")
    print("║  📊 Benchmark Results Summary                            ║")
    print("╚══════════════════════════════════════════════════════════╝\n")
    
    # Table header
    print("┌─────────────┬──────────────┬─────────────┬─────────────┬──────────┐")
    print("│   Routes    │ Compile Time │ Table Size  │ Load Factor │  Status  │")
    print("├─────────────┼──────────────┼─────────────┼─────────────┼──────────┤")
    
    # Table rows
    for result in results:
        if result.error:
            status = "❌ Error"
        elif result.dispatch_function_generated:
            status = "✅ OK"
        else:
            status = "⚠️  Warn"
        
        print(f"│ {result.route_count:>10}  │ {result.compilation_time:>10.3f}s │ "
              f"{result.perfect_hash_table_size:>10}  │ {result.load_factor:>10.0%}  │ {status:^8} │")
    
    print("└─────────────┴──────────────┴─────────────┴─────────────┴──────────┘")


def analyze_scaling(results: List[BenchmarkResult]):
    """Analyze how performance scales with route count."""
    
    print("\n╔══════════════════════════════════════════════════════════╗")
    print("║  📈 Performance Scaling Analysis                         ║")
    print("╚══════════════════════════════════════════════════════════╝\n")
    
    successful = [r for r in results if not r.error]
    
    if len(successful) < 2:
        print("⚠️  Not enough successful runs to analyze scaling")
        return
    
    # Calculate average compilation time per route
    for result in successful:
        time_per_route = result.compilation_time / result.route_count * 1000  # ms per route
        print(f"  {result.route_count:>3} routes: {time_per_route:>6.2f} ms/route")
    
    # Check if load factor stays at 100%
    print("\n  Load Factor Consistency:")
    all_100_percent = all(r.load_factor == 1.0 for r in successful)
    if all_100_percent:
        print("    ✅ Perfect hash maintains 100% load factor across all route counts")
    else:
        print("    ⚠️  Load factor varies:")
        for result in successful:
            print(f"      {result.route_count} routes: {result.load_factor:.0%}")
    
    # Check if table size equals route count
    print("\n  Space Efficiency:")
    all_optimal = all(r.perfect_hash_table_size == r.route_count for r in successful)
    if all_optimal:
        print("    ✅ Perfect hash uses minimal space (table_size == route_count)")
    else:
        print("    ⚠️  Some overhead detected:")
        for result in successful:
            overhead = result.perfect_hash_table_size - result.route_count
            print(f"      {result.route_count} routes: {overhead} extra slots")


def main():
    """Run the benchmark suite."""
    
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  🔥 Conduit Plugin Performance Benchmark                ║")
    print("║     Week 4 Day 4: Perfect Hash Dispatch                 ║")
    print("╚══════════════════════════════════════════════════════════╝\n")
    
    # Setup paths
    script_dir = Path(__file__).parent
    test_dir = script_dir / "test_files"
    plugin_path = script_dir.parent / "plugins" / "conduit"
    
    # Check if plugin is built (check both .so for Linux and .dylib for macOS)
    plugin_lib_so = plugin_path / "build" / "libconduit.so"
    plugin_lib_dylib = plugin_path / "build" / "libconduit.dylib"
    if not plugin_lib_so.exists() and not plugin_lib_dylib.exists():
        print("❌ Plugin not built. Please run:")
        print("   cd plugins/conduit/build && make && make install")
        return 1
    
    # Check if test files exist, generate if needed
    if not test_dir.exists() or not list(test_dir.glob("test_routes_*.codon")):
        print("📝 Generating test files...\n")
        gen_script = script_dir / "generate_test_routes.py"
        subprocess.run([sys.executable, str(gen_script)])
        print()
    
    # Get test files
    test_files = sorted(test_dir.glob("test_routes_*.codon"), 
                       key=lambda p: int(re.search(r"(\d+)", p.name).group(1)))
    
    if not test_files:
        print("❌ No test files found in", test_dir)
        return 1
    
    print(f"📊 Running benchmarks on {len(test_files)} test files...\n")
    
    # Run benchmarks
    results = []
    for test_file in test_files:
        result = benchmark_file(test_file, plugin_path)
        results.append(result)
    
    # Print results
    print_results_table(results)
    analyze_scaling(results)
    
    # Summary
    print("\n╔══════════════════════════════════════════════════════════╗")
    print("║  ✅ Benchmark Complete                                   ║")
    print("╚══════════════════════════════════════════════════════════╝")
    
    successful = len([r for r in results if not r.error])
    print(f"\n  {successful}/{len(results)} tests passed")
    
    if successful > 0:
        avg_load = sum(r.load_factor for r in results if not r.error) / successful
        print(f"  Average load factor: {avg_load:.1%}")
        print(f"  Perfect hash working: {'✅ Yes' if avg_load == 1.0 else '⚠️ Partial'}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
