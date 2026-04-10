# Cross-Platform Compatibility Guide

## MCP Prompt Optimizer - Universal Platform Support

This package has been designed and tested to work seamlessly across all major operating systems and architectures.

## ✅ Supported Platforms

### Operating Systems
- **Windows 10/11** (x64)
- **macOS** (Intel x64 & Apple Silicon ARM64)  
- **Linux** (Ubuntu, Debian, CentOS, RHEL, etc.) (x64, ARM64)

### Node.js Versions
- **Minimum:** Node.js 16.0.0
- **Recommended:** Node.js 18.0.0 or higher
- **Tested:** Node.js 16, 18, 20, 21

## 🚀 Installation

The package installs identically on all platforms:

```bash
# Global installation (recommended)
npm install -g mcp-prompt-optimizer

# Local installation
npm install mcp-prompt-optimizer
```

## 🔧 Platform-Specific Setup

### Windows

```powershell
# PowerShell
$env:OPTIMIZER_API_KEY = "sk-opt-your-key-here"
mcp-prompt-optimizer

# Command Prompt
set OPTIMIZER_API_KEY=sk-local-your-key-here
mcp-prompt-optimizer

# Or use the Windows-specific development script
npm run dev:windows
```

### macOS & Linux

```bash
# Bash/Zsh
export OPTIMIZER_API_KEY="sk-local-your-key-here"
mcp-prompt-optimizer

# Or use the Unix-specific development script
npm run dev:unix
```

### Cross-Platform (Recommended)

```bash
# Works on all platforms with cross-env
npm run dev
npm run dev:mock
```

## 📁 File System Behavior

### Cache & Config Files

The package automatically creates platform-appropriate cache files:

- **Windows:** `%USERPROFILE%\.mcp-cloud-api-cache.json`
- **macOS:** `~/.mcp-cloud-api-cache.json`  
- **Linux:** `~/.mcp-cloud-api-cache.json`

### Path Handling

All file paths are handled using Node.js built-in `path` module for cross-platform compatibility:
- Uses `path.join()` for path construction
- Uses `os.homedir()` for user directory location
- Automatically handles Windows backslashes vs Unix forward slashes

## 🛠 Development & Testing

### Cross-Platform Development Scripts

```bash
# Universal development mode (works everywhere)
npm run dev

# Mock mode for testing (works everywhere)  
npm run dev:mock

# Platform-specific alternatives
npm run dev:windows    # Windows only
npm run dev:unix       # macOS/Linux only
```

### Testing Your Installation

```bash
# Health check (works on all platforms)
npm run health-check

# Diagnostic tool
npm run diagnose

# API key validation
npm run validate-key
```

## 🔍 Environment Variables

All environment variables work consistently across platforms:

```bash
# Core configuration
OPTIMIZER_API_KEY=sk-local-your-key-here
OPTIMIZER_BACKEND_URL=https://custom-backend.com
OPTIMIZER_DEV_MODE=true
NODE_ENV=development

# Advanced options
OPTIMIZER_REQUEST_TIMEOUT=30000
OPTIMIZER_MAX_RETRIES=5
```

## 🧪 Platform-Specific Testing

### Windows Testing

```powershell
# PowerShell
$env:OPTIMIZER_API_KEY = "sk-dev-test-key"
$env:OPTIMIZER_DEV_MODE = "true"
node index.js

# Command Prompt  
set OPTIMIZER_API_KEY=sk-dev-test-key
set OPTIMIZER_DEV_MODE=true
node index.js
```

### Unix Testing (macOS/Linux)

```bash
# Direct environment variables
OPTIMIZER_API_KEY=sk-dev-test-key OPTIMIZER_DEV_MODE=true node index.js

# Or export first
export OPTIMIZER_API_KEY=sk-dev-test-key
export OPTIMIZER_DEV_MODE=true
node index.js
```

## 🌐 MCP Client Compatibility

The package works with MCP-compatible applications across all platforms:

### Claude Desktop
- **Windows:** Configure in `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** Configure in `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** Configure in `~/.config/Claude/claude_desktop_config.json`

### Cursor IDE
- **All Platforms:** Configure in `~/.cursor/mcp.json`

### Windsurf
- **All Platforms:** Add via settings or configuration file

## 🚨 Troubleshooting

### Common Platform Issues

#### Windows
- **Issue:** Scripts fail with "cannot be loaded because running scripts is disabled"
- **Solution:** Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell

#### macOS  
- **Issue:** Permission denied when installing globally
- **Solution:** Use `sudo npm install -g mcp-prompt-optimizer` or configure npm to use a different directory

#### Linux
- **Issue:** Node.js not found or wrong version
- **Solution:** Use Node Version Manager: `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash`

### Universal Troubleshooting

```bash
# Check Node.js version (should be 16+)
node --version

# Check npm version  
npm --version

# Clear npm cache
npm cache clean --force

# Reinstall package
npm uninstall -g mcp-prompt-optimizer
npm install -g mcp-prompt-optimizer

# Reset package cache
npm run reset-cache
```

## 📊 Performance Notes

### Platform Performance Characteristics

- **Windows:** Slightly slower file I/O due to Windows Defender scanning
- **macOS:** Excellent performance, especially on Apple Silicon
- **Linux:** Generally fastest performance, especially for server deployments

### Memory Usage

- **Typical:** 15-25 MB RAM usage
- **Peak:** Up to 50 MB during optimization
- **Consistent across all platforms**

## 🔒 Security Considerations

### Platform-Specific Security

- **Windows:** API keys stored in user profile (protected by Windows user permissions)
- **macOS:** API keys stored in user home (protected by macOS file permissions)
- **Linux:** API keys stored with 600 permissions (user-only access)

### Network Security
- All platforms use identical HTTPS connections
- Certificate validation works uniformly across platforms
- Network timeouts and retry logic identical

## 📋 Platform Support Matrix

| Feature | Windows | macOS | Linux | ARM64 | Notes |
|---------|---------|--------|-------|-------|-------|
| Installation | ✅ | ✅ | ✅ | ✅ | npm/yarn |
| MCP Server | ✅ | ✅ | ✅ | ✅ | Full compatibility |
| Claude Desktop | ✅ | ✅ | ✅ | ✅ | All versions |
| Cursor IDE | ✅ | ✅ | ✅ | ✅ | Latest versions |
| Development Mode | ✅ | ✅ | ✅ | ✅ | Mock responses |
| Cache System | ✅ | ✅ | ✅ | ✅ | Platform-appropriate paths |
| Error Handling | ✅ | ✅ | ✅ | ✅ | Identical behavior |
| Network Resilience | ✅ | ✅ | ✅ | ✅ | Same retry logic |

## 🎯 Best Practices

### Universal Setup

1. **Use cross-env for development:** Always prefer `npm run dev` over platform-specific commands
2. **Environment variables:** Use `.env` files for consistent configuration
3. **Path handling:** Never hardcode paths - the package handles this automatically
4. **Testing:** Test on your target platform before deployment

### Production Deployment

- **Docker:** Package works excellently in containers (all Linux distros)
- **Cloud:** Tested on AWS, Google Cloud, Azure, Railway, Vercel, Render
- **Edge:** Works on edge computing platforms supporting Node.js 16+

## 📞 Support

If you encounter platform-specific issues:

1. **Check this guide first**
2. **Run diagnostics:** `npm run diagnose`
3. **Contact support:** support@promptoptimizer.help
4. **Include:** OS version, Node.js version, error messages

The MCP Prompt Optimizer is committed to providing identical functionality and performance across all supported platforms.
