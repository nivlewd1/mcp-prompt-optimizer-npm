# Contributing to MCP Prompt Optimizer

Thank you for your interest in contributing to the MCP Prompt Optimizer! We welcome contributions from the community to help make this tool better for everyone.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please search our [GitHub Issues](https://github.com/prompt-optimizer/mcp-prompt-optimizer/issues) to see if it has already been reported. If not, please open a new issue and include:

- A clear and descriptive title.
- Steps to reproduce the issue.
- Expected vs. actual behavior.
- Your environment (Node.js version, OS, MCP client).

### Suggesting Enhancements

We love hearing new ideas! Please open an issue with the "enhancement" label and describe:

- The goal of the enhancement.
- How it should work.
- Why it would be useful.

### Pull Requests

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies**: `npm install`
3. **Make your changes**: Ensure your code follows the existing style.
4. **Test your changes**: Run `npm test` to ensure everything is working correctly.
5. **Update documentation**: If you've added new features, update the `README.md` or relevant docs.
6. **Submit a Pull Request**: Provide a clear description of the changes and link to any related issues.

## Development Setup

The project uses Node.js (>=16). 

```bash
git clone https://github.com/prompt-optimizer/mcp-prompt-optimizer.git
cd mcp-prompt-optimizer
npm install
```

### Running Tests

We have several test suites:

- `npm run test:quick`: Fast verification of core logic.
- `npm run test:integration`: Verification with the backend.
- `npm run test:comprehensive`: Full system check.

## Security

If you discover a security vulnerability, please do NOT open a public issue. Instead, email us at support@promptoptimizer.xyz.

## License

By contributing, you agree that your contributions will be licensed under the project's [LICENSE](LICENSE).
