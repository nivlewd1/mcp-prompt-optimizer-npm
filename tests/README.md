# 🧪 MCP Prompt Optimizer Test Suite

Comprehensive testing framework for validating package functionality before NPM publication.

## 📋 Test Overview

### 🚀 Quick Test (`npm run test:quick`)
**Duration:** ~30 seconds  
**Purpose:** Rapid validation of core functionality  
**API Key:** Not required (uses mock mode)

Tests:
- ✅ Package structure validation
- ✅ Cross-platform compatibility
- ✅ MCP server instantiation
- ✅ API key format validation
- ✅ AI context detection
- ✅ Mock optimization generation
- ✅ Response formatting
- ✅ Environment variable support

**Use Case:** Quick verification during development

### 🔌 Integration Test (`npm run test:integration`)
**Duration:** ~60 seconds  
**Purpose:** Validate API connectivity and real backend integration  
**API Key:** Optional (falls back to mock mode)

Tests:
- ✅ Backend connectivity
- ✅ Real API key validation
- ✅ Live optimization requests
- ✅ Quota status retrieval
- ✅ Template search functionality
- ✅ Error recovery mechanisms
- ✅ Network resilience

**Use Case:** Pre-deployment validation with real backend

### 🔬 Comprehensive Test (`npm run test:comprehensive`)
**Duration:** ~2 minutes  
**Purpose:** Exhaustive validation of all features and edge cases  
**API Key:** Optional (extensive mock testing)

Tests:
- ✅ All quick test features
- ✅ All integration test features
- ✅ Command-line interface testing
- ✅ Network resilience scenarios
- ✅ Error handling edge cases
- ✅ Package integrity validation
- ✅ MCP protocol compliance
- ✅ Cross-platform script testing

**Use Case:** Full validation before major releases

### 🎯 Test Runner (`npm test` or `npm run test:runner`)
**Duration:** ~3-4 minutes  
**Purpose:** Orchestrates all test suites in optimal order  
**API Key:** Optional (runs all modes)

**Use Case:** Complete pre-publication validation

## 🛠️ Usage Examples

### Basic Testing (No API Key Required)
```bash
# Quick validation
npm run test:quick

# Full test suite in mock mode
npm test
```

### Testing with Real API Key
```bash
# Set your API key
export OPTIMIZER_API_KEY=sk-opt-your-actual-key

# Run integration tests
npm run test:integration

# Run full test suite
npm test
```

### Development Mode Testing
```bash
# Enable development mode
export OPTIMIZER_DEV_MODE=true
export OPTIMIZER_API_KEY=sk-dev-test-key

# Run tests
npm test
```

### Custom Backend Testing
```bash
# Test against custom backend
export OPTIMIZER_BACKEND_URL=https://your-backend.com
export OPTIMIZER_API_KEY=your-key

# Run integration tests
npm run test:integration
```

## 📊 Test Output Examples

### ✅ Success Output
```
🎉 ALL TESTS PASSED - READY FOR PUBLICATION!

🚀 Recommended publication commands:
   npm publish
   git tag v1.4.0
   git push --tags
```

### ❌ Failure Output
```
❌ SOME TESTS FAILED - FIX ISSUES BEFORE PUBLICATION
   Run the comprehensive test suite for detailed analysis:
   node tests/comprehensive-test.js
```

## 🔧 Test Modes

### Mock Mode (Default)
- **Trigger:** No API key provided
- **Behavior:** Uses simulated responses
- **Tests:** All functionality except live API calls
- **Advantage:** Fast, no dependencies

### Development Mode
- **Trigger:** `OPTIMIZER_DEV_MODE=true`
- **Behavior:** Enhanced logging, extended timeouts
- **Tests:** All functionality with debug output
- **Advantage:** Detailed debugging information

### Production Mode
- **Trigger:** Real API key provided
- **Behavior:** Tests against live backend
- **Tests:** Full end-to-end validation
- **Advantage:** Real-world validation

## 🎯 Pre-Publication Checklist

Run this checklist before publishing to NPM:

1. **Quick Test** ✅
   ```bash
   npm run test:quick
   ```

2. **Integration Test** (if you have API key) ✅
   ```bash
   OPTIMIZER_API_KEY=your-key npm run test:integration
   ```

3. **Full Test Suite** ✅
   ```bash
   npm test
   ```

4. **Manual Verification** ✅
   - [ ] Version number updated in package.json
   - [ ] CHANGELOG.md updated
   - [ ] README.md current
   - [ ] All files included in `files` array

5. **Publication** 🚀
   ```bash
   npm publish
   git tag v$(node -p "require('./package.json').version")
   git push --tags
   ```

## 🚨 Troubleshooting

### Common Issues

**"Tests failed with exit code 1"**
- Run individual test suites to identify specific failures
- Check error messages for detailed debugging information

**"Network error during integration tests"**
- Verify internet connection
- Check if backend URL is accessible
- Try running in mock mode first

**"API key validation failed"**
- Verify API key format: `sk-opt-`, `sk-team-`, `sk-dev-`, or `sk-local-`
- Check API key permissions and quota
- Try development mode: `OPTIMIZER_DEV_MODE=true`

**"Cross-platform script issues"**
- Ensure `cross-env` is installed: `npm install`
- Use platform-specific commands if needed:
  - Windows: `npm run dev:windows`
  - Unix/Mac: `npm run dev:unix`

### Debug Commands

```bash
# Verbose test output
DEBUG=* npm test

# Individual test suites
npm run test:quick
npm run test:integration  
npm run test:comprehensive

# Test specific functionality
node lib/validate-key.js
node lib/diagnose.js
```

## 📈 Continuous Integration

For CI/CD pipelines, use:

```yaml
# GitHub Actions example
- name: Run tests
  run: |
    npm ci
    npm run test:quick
  env:
    OPTIMIZER_DEV_MODE: true
```

The test suite is designed to work in CI environments without requiring real API keys.
