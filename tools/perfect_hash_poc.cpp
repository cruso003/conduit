/**
 * Proof of Concept: Perfect Hash Generation for Route Optimization
 * 
 * This POC demonstrates:
 * 1. FNV-1a hash function implementation
 * 2. Offset-based perfect hash generation
 * 3. Validation with sample routes
 * 
 * Compile: g++ -std=c++17 -o perfect_hash_poc perfect_hash_poc.cpp
 * Run: ./perfect_hash_poc
 */

#include <iostream>
#include <vector>
#include <string>
#include <unordered_set>
#include <algorithm>
#include <map>
#include <set>

// FNV-1a hash function
uint32_t fnv1a_hash(const std::string& str) {
    uint32_t hash = 2166136261u;
    for (char c : str) {
        hash ^= static_cast<uint32_t>(static_cast<unsigned char>(c));
        hash *= 16777619u;
    }
    return hash;
}

// Route representation
struct Route {
    std::string method;
    std::string path;
    std::string handler;
    
    std::string key() const {
        return method + ":" + path;
    }
};

// Perfect hash result
struct PerfectHashResult {
    std::map<uint32_t, int> hash_to_offset;  // Maps full hash -> offset
    std::vector<int> slot_to_route;
    int table_size;
    bool success;
};

// Generate perfect hash using offset method with map-based storage
PerfectHashResult generatePerfectHash(const std::vector<Route>& routes) {
    int n = routes.size();
    
    // Try different table sizes (start at n, go up to 2n)
    for (int table_size = n; table_size <= n * 2; ++table_size) {
        std::map<uint32_t, int> hash_to_offset;
        std::vector<int> slot_to_route(table_size, -1);
        std::vector<bool> used(table_size, false);
        
        bool success = true;
        
        // Try to place each route
        for (int i = 0; i < n; ++i) {
            std::string key = routes[i].key();
            uint32_t h = fnv1a_hash(key);
            
            bool placed = false;
            
            // Try different offsets
            for (int offset = 0; offset < table_size && !placed; ++offset) {
                uint32_t slot = (h + offset) % table_size;
                
                if (!used[slot]) {
                    // Found empty slot!
                    used[slot] = true;
                    slot_to_route[slot] = i;
                    hash_to_offset[h] = offset;  // Store offset for this exact hash
                    placed = true;
                }
            }
            
            if (!placed) {
                success = false;
                break;
            }
        }
        
        if (success) {
            std::cout << "✅ Found perfect hash with table size " << table_size 
                      << " (load factor: " << (100.0 * n / table_size) << "%)\n";
            return {hash_to_offset, slot_to_route, table_size, true};
        }
    }
    
    std::cout << "❌ Could not find perfect hash (this shouldn't happen!)\n";
    return {{}, {}, 0, false};
}

// Lookup route using perfect hash
int perfectHashLookup(const std::string& key, 
                      const std::map<uint32_t, int>& hash_to_offset,
                      int table_size) {
    uint32_t h = fnv1a_hash(key);
    auto it = hash_to_offset.find(h);
    if (it == hash_to_offset.end()) {
        return -1;  // Not found
    }
    int offset = it->second;
    uint32_t slot = (h + offset) % table_size;
    return slot;
}

// Verify perfect hash works correctly
bool verifyPerfectHash(const std::vector<Route>& routes,
                       const PerfectHashResult& result) {
    std::cout << "\n📋 Verification:\n";
    
    bool all_correct = true;
    std::unordered_set<int> seen_slots;
    
    for (int i = 0; i < routes.size(); ++i) {
        std::string key = routes[i].key();
        int slot = perfectHashLookup(key, result.hash_to_offset, result.table_size);
        
        if (slot == -1) {
            std::cout << "  ❌ " << key << " -> hash not found in offset table!\n";
            all_correct = false;
            continue;
        }
        
        // Check if slot maps to correct route
        if (result.slot_to_route[slot] != i) {
            std::cout << "  ❌ " << key << " -> slot " << slot 
                      << " (expected route " << i << ", got " 
                      << result.slot_to_route[slot] << ")\n";
            all_correct = false;
        } else {
            std::cout << "  ✅ " << key << " -> slot " << slot << " ✓\n";
        }
        
        // Check for collisions
        if (seen_slots.count(slot)) {
            std::cout << "  ❌ Collision detected at slot " << slot << "!\n";
            all_correct = false;
        }
        seen_slots.insert(slot);
    }
    
    return all_correct;
}

// Print statistics
void printStatistics(const std::vector<Route>& routes,
                    const PerfectHashResult& result) {
    std::cout << "\n📊 Statistics:\n";
    std::cout << "  Routes: " << routes.size() << "\n";
    std::cout << "  Table size: " << result.table_size << "\n";
    std::cout << "  Load factor: " << (100.0 * routes.size() / result.table_size) << "%\n";
    std::cout << "  Hash entries: " << result.hash_to_offset.size() << "\n";
    std::cout << "  Hash table size: " << result.hash_to_offset.size() * (sizeof(uint32_t) + sizeof(int)) << " bytes\n";
    std::cout << "  Jump table size: " << result.table_size * sizeof(void*) << " bytes\n";
    std::cout << "  Total overhead: " << (result.hash_to_offset.size() * (sizeof(uint32_t) + sizeof(int)) + 
                                           result.table_size * sizeof(void*)) << " bytes\n";
}

int main() {
    std::cout << "🔬 Perfect Hash POC for Route Optimization\n";
    std::cout << "==========================================\n\n";
    
    // Sample routes (same as in test_plugin_minimal.codon)
    std::vector<Route> routes = {
        {"GET", "/", "index"},
        {"POST", "/users", "create_user"},
        {"GET", "/users/:id", "get_user"},
        {"PUT", "/users/:id", "update_user"},
        {"DELETE", "/users/:id", "delete_user"},
        {"GET", "/posts", "list_posts"},
        {"POST", "/posts", "create_post"},
        {"GET", "/posts/:id", "get_post"},
        {"PUT", "/posts/:id", "update_post"},
        {"DELETE", "/posts/:id", "delete_post"},
    };
    
    std::cout << "📝 Input routes:\n";
    for (size_t i = 0; i < routes.size(); ++i) {
        std::cout << "  [" << i << "] " << routes[i].method << " " 
                  << routes[i].path << " -> " << routes[i].handler << "\n";
    }
    std::cout << "\n";
    
    // Generate perfect hash
    std::cout << "⚙️  Generating perfect hash...\n";
    auto result = generatePerfectHash(routes);
    
    if (!result.success) {
        std::cerr << "Failed to generate perfect hash!\n";
        return 1;
    }
    
    // Verify correctness
    bool verified = verifyPerfectHash(routes, result);
    
    if (verified) {
        std::cout << "\n✅ Perfect hash verified!\n";
    } else {
        std::cout << "\n❌ Perfect hash verification failed!\n";
        return 1;
    }
    
    // Print statistics
    printStatistics(routes, result);
    
    // Print generated lookup code (pseudo-code)
    std::cout << "\n💡 Generated dispatch code would be:\n";
    std::cout << "```cpp\n";
    std::cout << "// Hash-to-offset map (compile-time lookup in actual implementation)\n";
    std::cout << "// Map size: " << result.hash_to_offset.size() << " entries\n";
    std::cout << "// In practice, this would be a generated switch/if-else or binary search\n\n";
    
    std::cout << "Response (*handlers[" << result.table_size << "])(Request) = {\n";
    for (int i = 0; i < result.table_size; ++i) {
        int route_idx = result.slot_to_route[i];
        std::cout << "  ";
        if (route_idx >= 0) {
            std::cout << routes[route_idx].handler;
        } else {
            std::cout << "nullptr";
        }
        if (i < result.table_size - 1) std::cout << ",";
        std::cout << "\n";
    }
    std::cout << "};\n\n";
    
    std::cout << "Response dispatch(string method, string path, Request req) {\n";
    std::cout << "  uint32_t h = fnv1a_hash(method + \":\" + path);\n";
    std::cout << "  int offset = lookup_offset(h);  // Binary search or switch\n";
    std::cout << "  int slot = (h + offset) % " << result.table_size << ";\n";
    std::cout << "  return handlers[slot](req);\n";
    std::cout << "}\n";
    std::cout << "```\n";
    
    std::cout << "\n🎯 Conclusion:\n";
    std::cout << "  Perfect hashing is viable for route optimization!\n";
    std::cout << "  Ready to implement in Codon IR plugin.\n";
    
    return 0;
}
