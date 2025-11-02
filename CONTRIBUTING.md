# Contributing to Conduit

First off, thank you for considering contributing to Conduit! 🎉

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something cool.

## How Can I Contribute?

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
