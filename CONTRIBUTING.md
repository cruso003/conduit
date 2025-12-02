# Contributing to Conduit

Thank you for your interest in contributing to Conduit! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contribution Workflow](#contribution-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

This project adheres to a Code of Conduct that promotes a welcoming and inclusive environment. Be respectful, constructive, and collaborative. Report unacceptable behavior to the maintainers.

## Getting Started

### Prerequisites

- **Codon 0.16+**: [Installation guide](https://docs.exaloop.io/codon/general/install)
- **Git**: For version control
- **Linux or macOS**: Conduit currently supports Unix-like systems
- **C++ Compiler**: GCC 9+ or Clang 10+ (for building Codon plugins)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/cruso003/conduit.git
cd conduit

# Build Conduit
./scripts/build.sh

# Run tests
./scripts/run_tests.sh

# Try an example
codon run examples/hello_world.codon
```

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/conduit.git
cd conduit
git remote add upstream https://github.com/cruso003/conduit.git
```

### 2. Install Development Dependencies

````bash
# Install Codon (if not already installed)
### PR Template

```markdown
## Description
Brief description of changes

## Motivation
Why is this change needed?

## Changes
- Change 1
- Change 2

## Testing
How were these changes tested?

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
````

### Review Process

1. **Automated Checks**: CI runs tests and linting
2. **Code Review**: Maintainer reviews code
3. **Feedback**: Address review comments
4. **Approval**: Once approved, PR is merged

````

### Best Practices

1. **Type Annotations**: Always use type hints
2. **Error Handling**: Explicit error handling, no silent failures
3. **Documentation**: Docstrings for public functions/classes
4. **Performance**: Consider performance implications
5. **Memory Safety**: Avoid leaks, manage resources properly

## Testing

### Writing Tests

```python
# tests/test_my_feature.codon
from conduit import Conduit

def test_route_matching():
    """Test that routes match correctly"""
    app = Conduit()

    @app.get("/users/:id")
    def get_user(req):
        return {"id": req.params["id"]}

    assert True, "Route matched successfully"

test_route_matching()
print("✓ All tests passed")
````

### Running Tests

```bash
# Run all tests
./scripts/run_tests.sh

# Run specific test
codon run tests/test_routes.codon
```

## Documentation

### Code Documentation

```python
def my_function(param: str, count: int = 1) -> list[str]:
    """
    Brief description of what the function does.

    Args:
        param: Description of param
        count: Description of count (default: 1)

    Returns:
        Description of return value

    Example:
        >>> my_function("hello", 2)
        ["hello", "hello"]
    """
    pass
```

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests added for new functionality
- [ ] All tests pass locally
- [ ] Documentation updated
- [ ] Commit messages are clear

### Reporting Bugs

Before submitting a bug report:

- Check if the bug has already been reported
- Use the latest version of Conduit
- Collect information about the bug (OS, Codon version, steps to reproduce)

**Bug Report Template:**

```
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. ...
2. ...

**Expected behavior**
What you expected to happen.

**Environment:**
- OS: [e.g. Ubuntu 22.04]
- Codon version: [e.g. 0.16.3]
- Conduit version: [e.g. 0.1.0]

**Additional context**
Any other context about the problem.
```

### Suggesting Features

Feature requests are welcome! Please:

- Check if the feature has already been requested
- Explain why this feature would be useful
- Provide examples of how it would be used

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Write clear commit messages**
3. **Add tests** for new functionality
4. **Update documentation** as needed
5. **Ensure tests pass**: `./scripts/test.sh`
6. **Run benchmarks** if performance-related: `./scripts/benchmark.sh`

**PR Template:**

```
**What does this PR do?**
Brief description of changes.

**Why is this needed?**
Explain the motivation.

**How was it tested?**
Describe your testing approach.

**Checklist:**
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Benchmarks run (if applicable)
- [ ] Code follows style guidelines
```

## Development Setup

```bash
# Fork the repository
git clone https://github.com/YOUR_USERNAME/conduit.git
cd conduit

# Install Codon (if not already installed)
/bin/bash -c "$(curl -fsSL https://exaloop.io/install.sh)"

# Build Conduit
./scripts/build.sh

# Run tests
./scripts/test.sh
```

## Code Style

- Follow PEP 8 style guidelines where applicable
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small
- Write docstrings for public APIs

**Example:**

```python
def parse_http_request(data: bytes) -> HTTPRequest:
    """
    Parse raw HTTP request data into HTTPRequest object.

    Args:
        data: Raw bytes from socket

    Returns:
        HTTPRequest object with parsed data

    Raises:
        ValueError: If request is malformed
    """
    # Implementation...
```

## Testing

- Write unit tests for new functionality
- Test edge cases
- Ensure existing tests still pass
- Add integration tests for features

```bash
# Run all tests
./scripts/test.sh

# Run specific test
codon test tests/test_socket.codon
```

## Benchmarking

If your changes affect performance:

```bash
# Run benchmarks
./scripts/benchmark.sh

# Compare with baseline
python benchmarks/compare.py before.json after.json
```

## Documentation

- Update relevant docs in `docs/`
- Add examples if introducing new features
- Keep API reference up to date
- Write clear, concise explanations

## Questions?

- Open a [Discussion](https://github.com/cruso003/conduit/discussions)
- Ask in issues (use the "question" label)

## Recognition

Contributors will be listed in:

- README.md (Contributors section)
- CHANGELOG.md (for significant contributions)
- Release notes

Thank you for contributing to Conduit! 🚀

## Community

### Getting Help

- **GitHub Discussions**: [Ask questions](https://github.com/cruso003/conduit/discussions)
- **Discord**: [Join our community](https://discord.gg/conduit)
- **Issues**: [Report bugs](https://github.com/cruso003/conduit/issues)

### Areas to Contribute

**Good First Issues:**

- Documentation improvements
- Example applications
- Test coverage improvements
- Bug fixes

**Advanced:**

- Performance optimizations
- New framework features
- MCP protocol enhancements
- ML inference improvements

### Recognition

Contributors are recognized in:

- [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Release notes
- Project README

---

**Questions?** Open a [discussion](https://github.com/cruso003/conduit/discussions) or ask in [Discord](https://discord.gg/conduit).

Thank you for contributing to Conduit! 🚀
