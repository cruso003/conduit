cmake_minimum_required(VERSION 3.14)
project(ConduitPlugin VERSION 0.1.0)

# C++ Standard - Codon headers require C++20 for std::ranges
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -pedantic -Wall -Wno-return-type-c-linkage")
set(CMAKE_CXX_FLAGS_DEBUG "-g -fno-limit-debug-info")
set(CMAKE_CXX_FLAGS_RELEASE "-O3")

# Project info
message(STATUS "Building Conduit Plugin v${PROJECT_VERSION}")

# Codon installation path
if(NOT CODON_PATH)
    set(CODON_PATH "$ENV{HOME}/.codon")
endif()
message(STATUS "Codon path: ${CODON_PATH}")

# Installation path - default to Codon's plugin directory
if(CMAKE_INSTALL_PREFIX_INITIALIZED_TO_DEFAULT)
    set(CMAKE_INSTALL_PREFIX "${CODON_PATH}/lib/codon/plugins/conduit" 
        CACHE PATH "Install to Codon's plugin directory" FORCE)
endif()
message(STATUS "Install prefix: ${CMAKE_INSTALL_PREFIX}")

# Build shared library
add_library(conduit SHARED conduit.cpp)

# Find LLVM - Codon requires LLVM for compilation
# First try to find LLVM via cmake
find_package(LLVM CONFIG QUIET)

if(NOT LLVM_FOUND)
    # If cmake config not found, try pkg-config
    find_package(PkgConfig QUIET)
    if(PkgConfig_FOUND)
        pkg_check_modules(LLVM QUIET llvm)
    endif()
endif()

if(LLVM_FOUND)
    message(STATUS "Found LLVM ${LLVM_VERSION}")
    if(LLVM_DEFINITIONS)
        separate_arguments(LLVM_DEFINITIONS_LIST NATIVE_COMMAND ${LLVM_DEFINITIONS})
        add_definitions(${LLVM_DEFINITIONS_LIST})
    endif()
    if(LLVM_INCLUDE_DIRS)
        target_include_directories(conduit PRIVATE ${LLVM_INCLUDE_DIRS})
    endif()
else()
    message(WARNING "LLVM not found via cmake/pkg-config. Plugin may still work if Codon has embedded LLVM.")
endif()

# Include Codon headers
target_include_directories(conduit PRIVATE "${CODON_PATH}/include")

# Link Codon libraries
target_link_directories(conduit PRIVATE "${CODON_PATH}/lib/codon")
target_link_libraries(conduit PRIVATE codonrt codonc)

# Check if headers exist
if(NOT EXISTS "${CODON_PATH}/include/codon/dsl/dsl.h")
    message(FATAL_ERROR "Codon headers not found at ${CODON_PATH}/include/codon/")
endif()

# Install plugin
install(TARGETS conduit DESTINATION build)
install(FILES plugin.toml DESTINATION .)

# Print build summary
message(STATUS "")
message(STATUS "=== Build Configuration ===")
message(STATUS "  Codon path:     ${CODON_PATH}")
message(STATUS "  Install to:     ${CMAKE_INSTALL_PREFIX}")
message(STATUS "  C++ compiler:   ${CMAKE_CXX_COMPILER}")
message(STATUS "  Build type:     ${CMAKE_BUILD_TYPE}")
if(LLVM_FOUND)
    message(STATUS "  LLVM version:   ${LLVM_VERSION}")
endif()
message(STATUS "===========================")
message(STATUS "")
