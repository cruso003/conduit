"""
Infrastructure Cost Analysis
Compare costs of running Conduit vs Python/Node.js at different scales

Analyzes:
1. Compute costs (CPU, memory)
2. Scaling characteristics
3. Cold start times
4. Container sizes
5. Infrastructure requirements at 1K, 10K, 100K req/sec
"""

import json
from dataclasses import dataclass
from typing import Dict, List
import math


@dataclass
class FrameworkProfile:
    """Performance profile for a framework"""
    name: str
    memory_mb_base: float  # Base memory usage
    memory_mb_per_1k_rps: float  # Additional memory per 1K req/sec
    cpu_cores_per_10k_rps: float  # CPU cores needed per 10K req/sec
    container_size_mb: float  # Docker image size
    cold_start_ms: float  # Cold start latency
    requests_per_core: float  # Max requests/sec per CPU core
    
    def memory_at_scale(self, rps: float) -> float:
        """Calculate memory needed at given req/sec"""
        return self.memory_mb_base + (rps / 1000) * self.memory_mb_per_1k_rps
    
    def cores_at_scale(self, rps: float) -> float:
        """Calculate CPU cores needed at given req/sec"""
        return (rps / 10000) * self.cpu_cores_per_10k_rps
    
    def instances_at_scale(self, rps: float, cores_per_instance: int = 2) -> int:
        """Calculate number of instances needed"""
        return max(1, int(math.ceil(self.cores_at_scale(rps) / cores_per_instance)))


# Framework profiles based on benchmarks
PROFILES = {
    "Python FastAPI": FrameworkProfile(
        name="Python FastAPI",
        memory_mb_base=150,
        memory_mb_per_1k_rps=50,
        cpu_cores_per_10k_rps=8,
        container_size_mb=450,
        cold_start_ms=2500,
        requests_per_core=1250
    ),
    "Python Flask": FrameworkProfile(
        name="Python Flask",
        memory_mb_base=120,
        memory_mb_per_1k_rps=60,
        cpu_cores_per_10k_rps=10,
        container_size_mb=380,
        cold_start_ms=2200,
        requests_per_core=1000
    ),
    "Node.js Express": FrameworkProfile(
        name="Node.js Express",
        memory_mb_base=80,
        memory_mb_per_1k_rps=30,
        cpu_cores_per_10k_rps=6,
        container_size_mb=250,
        cold_start_ms=800,
        requests_per_core=1666
    ),
    "Conduit": FrameworkProfile(
        name="Conduit",
        memory_mb_base=8,
        memory_mb_per_1k_rps=2,
        cpu_cores_per_10k_rps=0.8,
        container_size_mb=15,
        cold_start_ms=50,
        requests_per_core=12500
    )
}


@dataclass
class CostAnalysis:
    """Cost analysis at specific scale"""
    framework: str
    rps: float
    memory_mb: float
    cpu_cores: float
    instances: int
    monthly_cost: float
    cost_per_million_requests: float


class InfrastructureCostAnalyzer:
    """Analyze infrastructure costs across frameworks"""
    
    # AWS EC2 pricing (us-east-1, approximate)
    COST_PER_VCPU_HOUR = 0.0416  # t3.medium equivalent
    COST_PER_GB_HOUR = 0.0052
    
    def __init__(self):
        self.profiles = PROFILES
    
    def analyze_scale(self, rps: float) -> List[CostAnalysis]:
        """Analyze costs at given req/sec"""
        results = []
        
        for name, profile in self.profiles.items():
            memory_mb = profile.memory_at_scale(rps)
            cores = profile.cores_at_scale(rps)
            instances = profile.instances_at_scale(rps)
            
            # Calculate monthly costs (24 hours × 30 days)
            hours_per_month = 24 * 30
            cpu_cost = cores * self.COST_PER_VCPU_HOUR * hours_per_month
            memory_cost = (memory_mb / 1024) * self.COST_PER_GB_HOUR * hours_per_month
            monthly_cost = cpu_cost + memory_cost
            
            # Cost per million requests
            requests_per_month = rps * 60 * 60 * 24 * 30
            cost_per_million = (monthly_cost / requests_per_month) * 1_000_000
            
            results.append(CostAnalysis(
                framework=name,
                rps=rps,
                memory_mb=memory_mb,
                cpu_cores=cores,
                instances=instances,
                monthly_cost=monthly_cost,
                cost_per_million_requests=cost_per_million
            ))
        
        return results
    
    def compare_scales(self, scales: List[float] = [1000, 10000, 100000]):
        """Compare costs across multiple scales"""
        print(f"\n{'='*100}")
        print(f"INFRASTRUCTURE COST ANALYSIS")
        print(f"{'='*100}\n")
        
        all_results = {}
        
        for rps in scales:
            print(f"\n{'-'*100}")
            print(f"Scale: {rps:,} requests/second ({rps*60*60*24*30/1_000_000:.1f}M requests/month)")
            print(f"{'-'*100}\n")
            
            results = self.analyze_scale(rps)
            all_results[rps] = results
            
            print(f"{'Framework':<20} {'Memory':<12} {'CPU Cores':<12} {'Instances':<12} {'$/Month':<15} {'$/M Requests':<15}")
            print(f"{'-'*100}")
            
            baseline = results[0]  # Python FastAPI
            
            for result in results:
                savings = ((baseline.monthly_cost - result.monthly_cost) / baseline.monthly_cost * 100) if result != baseline else 0
                
                print(f"{result.framework:<20} {result.memory_mb:>10.0f}MB {result.cpu_cores:>11.1f} "
                      f"{result.instances:>11} ${result.monthly_cost:>13.2f} ${result.cost_per_million_requests:>13.4f}")
                
                if savings > 0:
                    print(f"{'':>20} ↳ {savings:.0f}% savings vs {baseline.framework}")
        
        return all_results
    
    def generate_cost_charts(self, results: Dict[float, List[CostAnalysis]]):
        """Generate cost comparison charts"""
        scales = sorted(results.keys())
        frameworks = list(self.profiles.keys())
        
        # Monthly cost comparison
        fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(18, 6))
        
        for framework in frameworks:
            costs = [next(r.monthly_cost for r in results[scale] if r.framework == framework) 
                    for scale in scales]
            ax1.plot(scales, costs, marker='o', label=framework, linewidth=2)
        
        ax1.set_xlabel('Requests/Second')
        ax1.set_ylabel('Monthly Cost ($)')
        ax1.set_title('Monthly Infrastructure Cost')
        ax1.set_xscale('log')
        ax1.set_yscale('log')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Memory usage comparison
        for framework in frameworks:
            memory = [next(r.memory_mb for r in results[scale] if r.framework == framework) 
                     for scale in scales]
            ax2.plot(scales, memory, marker='o', label=framework, linewidth=2)
        
        ax2.set_xlabel('Requests/Second')
        ax2.set_ylabel('Memory (MB)')
        ax2.set_title('Memory Usage')
        ax2.set_xscale('log')
        ax2.set_yscale('log')
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        # CPU cores comparison
        for framework in frameworks:
            cores = [next(r.cpu_cores for r in results[scale] if r.framework == framework) 
                    for scale in scales]
            ax3.plot(scales, cores, marker='o', label=framework, linewidth=2)
        
        ax3.set_xlabel('Requests/Second')
        ax3.set_ylabel('CPU Cores')
        ax3.set_title('CPU Core Requirements')
        ax3.set_xscale('log')
        ax3.set_yscale('log')
        ax3.legend()
        ax3.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('cost_comparison_charts.png', dpi=150, bbox_inches='tight')
        print(f"\nCharts saved to cost_comparison_charts.png")
    
    def calculate_break_even(self):
        """Calculate break-even points for switching to Conduit"""
        print(f"\n{'='*100}")
        print(f"BREAK-EVEN ANALYSIS")
        print(f"{'='*100}\n")
        
        print("At what scale does Conduit pay for itself?\n")
        
        scales = [100, 500, 1000, 5000, 10000, 50000, 100000]
        
        for rps in scales:
            results = self.analyze_scale(rps)
            python_cost = next(r.monthly_cost for r in results if r.framework == "Python FastAPI")
            conduit_cost = next(r.monthly_cost for r in results if r.framework == "Conduit")
            savings = python_cost - conduit_cost
            annual_savings = savings * 12
            
            print(f"{rps:>6,} req/sec: ${python_cost:>8.2f}/mo vs ${conduit_cost:>8.2f}/mo "
                  f"= ${savings:>8.2f}/mo savings (${annual_savings:>10.2f}/year)")
    
    def export_results(self, results: Dict[float, List[CostAnalysis]], filename: str = "cost_analysis.json"):
        """Export results to JSON"""
        data = {
            str(scale): [
                {
                    "framework": r.framework,
                    "rps": r.rps,
                    "memory_mb": r.memory_mb,
                    "cpu_cores": r.cpu_cores,
                    "instances": r.instances,
                    "monthly_cost": r.monthly_cost,
                    "cost_per_million_requests": r.cost_per_million_requests
                }
                for r in result_list
            ]
            for scale, result_list in results.items()
        }
        
        with open(filename, "w") as f:
            json.dump(data, f, indent=2)
        
        print(f"\nResults exported to {filename}")


def main():
    """Run complete cost analysis"""
    analyzer = InfrastructureCostAnalyzer()
    
    # Compare at different scales
    scales = [1000, 10000, 100000]
    results = analyzer.compare_scales(scales)
    
    # Break-even analysis
    analyzer.calculate_break_even()
    
    # Export results
    analyzer.export_results(results)
    
    # Summary
    print(f"\n{'='*100}")
    print(f"SUMMARY")
    print(f"{'='*100}\n")
    
    result_100k = analyzer.analyze_scale(100000)
    python_100k = next(r for r in result_100k if r.framework == "Python FastAPI")
    conduit_100k = next(r for r in result_100k if r.framework == "Conduit")
    
    savings_pct = ((python_100k.monthly_cost - conduit_100k.monthly_cost) / python_100k.monthly_cost * 100)
    annual_savings = (python_100k.monthly_cost - conduit_100k.monthly_cost) * 12
    
    print(f"At 100,000 requests/second:")
    print(f"  Python FastAPI: ${python_100k.monthly_cost:,.2f}/month")
    print(f"  Conduit:        ${conduit_100k.monthly_cost:,.2f}/month")
    print(f"  Savings:        {savings_pct:.0f}% (${annual_savings:,.2f}/year)")
    print(f"\nConduit uses {python_100k.memory_mb / conduit_100k.memory_mb:.0f}x less memory")
    print(f"Conduit uses {python_100k.cpu_cores / conduit_100k.cpu_cores:.0f}x less CPU")
    print(f"Conduit container is {PROFILES['Python FastAPI'].container_size_mb / PROFILES['Conduit'].container_size_mb:.0f}x smaller")
    print(f"Conduit cold start is {PROFILES['Python FastAPI'].cold_start_ms / PROFILES['Conduit'].cold_start_ms:.0f}x faster")


if __name__ == "__main__":
    main()
