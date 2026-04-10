# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.1] - 2025-12-09

### Fixed
- 🔧 **Critical Endpoint Fix**: Corrected quota status endpoint from `/api/v1/api-keys/quota-status` to `/api/v1/mcp/quota-status` for proper API key authentication
- 📊 **Response Mapping**: Updated quota status response handling to support nested structure returned by MCP endpoint
- 🎯 **AG-UI Path**: Fixed AG-UI status endpoint path from `/api/v1/agui/status` to `/api/status` to match backend router mounting
- 🔐 **Authentication**: All quota operations now use API key authentication instead of JWT

### Technical
- 📋 **Backend Alignment**: Comprehensive endpoint verification against FastAPI Backend production-v2.2.0-stable
- 📝 **Documentation**: Added `ENDPOINT_VERIFICATION_REPORT.md` with complete endpoint mapping
- 🚨 **Critical Issue Identified**: Backend MCP router not mounted - requires backend team deployment before v3.0.1 functionality works

### Backend Dependencies
- ⚠️ **REQUIRED**: Backend must mount MCP router at `/api/v1` prefix for quota status to work
- ⚠️ **BLOCKER**: Package will fail quota checks until backend is updated
- 📞 **Action**: Coordinate with backend team before publishing to NPM

### Migration Notes
- This is a patch release fixing critical endpoint mismatches
- No breaking changes for users (transparent fixes)
- Package version changed from v3.0.0 to v3.0.1

## [3.0.0] - 2025-12-08

### Changed (Breaking)
- 🔐 **Security Hardening**: Development mode permanently disabled for production security
- ⏱️ **Cache Reduction**: API key cache reduced from 24 hours to 1 hour
- ⏱️ **Fallback Cache**: Fallback cache reduced from 7 days to 2 hours
- ❌ **Offline Mode**: Removed offline mode support
- ❌ **Mock Validation**: Removed development mode API key bypasses

### Security
- 🛡️ **All API keys** now require backend validation (no client-side bypasses)
- 🔒 **Environment variables** no longer enable development mode
- ✅ **Production-only**: Package now enforces backend connectivity

### Migration from v2.x
- All users must have valid API keys from https://promptoptimizer-blog.vercel.app/pricing
- `OPTIMIZER_DEV_MODE=true` no longer works (intentionally disabled)
- Offline usage no longer supported (requires active backend connection)
- Short-lived caching (1-2 hours) replaces long-term caching

## [1.5.0] - 2025-09-25

### Added
- 🧠 **Bayesian Optimization Support**: Advanced parameter tuning and performance prediction
- ⚡ **AG-UI Real-Time Features**: Streaming optimization and WebSocket support
- 🎯 **Enhanced AI Context Detection**: Improved weighted scoring system with 7 contexts
- 📊 **Advanced Analytics**: New `get_optimization_insights` tool for Bayesian metrics
- 🚀 **Real-Time Status**: New `get_real_time_status` tool for live optimization monitoring
- 🔧 **Feature Flags**: `ENABLE_BAYESIAN_OPTIMIZATION` and `ENABLE_AGUI_FEATURES` environment variables
- 📋 **Enhanced Template Search**: AI-aware filtering by sophistication, complexity, and strategy
- 🎨 **Rich Formatting**: Improved output formatting with better visual organization

### Changed
- 🔄 **Backend API Alignment**: Updated to align with FastAPI Backend production-v2.1.0-bayesian
- 🎯 **Context Detection**: Upgraded algorithm with weighted scoring and negative patterns
- 📊 **Quota Display**: Enhanced quota status with visual indicators and feature breakdown
- 🔍 **Template Search**: Expanded search parameters and improved result formatting
- 🚀 **Startup Process**: Enhanced validation with feature status reporting

### Fixed
- ✅ **API Endpoints**: Corrected backend endpoint URLs for full compatibility
- 🛡️ **Error Handling**: Improved fallback mechanisms for network issues
- 📝 **Template Display**: Fixed template preview and confidence score formatting
- 🔧 **Environment Variables**: Better handling of feature flag defaults

### Technical
- 📦 **Dependencies**: Updated to latest MCP SDK version
- 🏗️ **Architecture**: Modular feature system with conditional tool loading
- 🧪 **Testing**: Enhanced mock responses for development mode
- 📖 **Documentation**: Updated tool descriptions and parameter schemas

### Backend Compatibility
- ✅ **API Version**: v1 (aligned with FastAPI backend)
- ✅ **Endpoint Mapping**: `/api/v1/mcp/*` endpoints fully supported
- ✅ **Feature Parity**: All backend features now accessible via MCP
- ✅ **Error Codes**: Proper HTTP status code handling and user-friendly messages

## [2.2.3] - 2025-11-01

### Fixed
- ✅ **API Key Validation**: Corrected `sk-local-*` API key validation, ensuring they are properly validated against the backend instead of being treated as mock keys.
- ✅ **Context Detection Error**: Resolved `Cannot read properties of undefined (reading 'name')` error in `generateMockContextDetection` by adding robust checks for `detected_parameters`.
- ✅ **Quick Test Failures**: Updated `quick-test.js` to align with current API, fixing `AI Context detection` and removing `Goal enhancement` test.

### Changed
- 🔄 **Endpoint Management**: Centralized all backend API endpoints into a new `ENDPOINTS` object for improved maintainability and consistency.
- 🧠 **Mock Context Detection**: Enhanced `generateMockContextDetection` logic with more accurate keyword matching for `code_generation`, `image_generation`, and `llm_interaction` contexts.
- 🔧 **CLI Flag Defaults**: Clarified default behavior for `ENABLE_BAYESIAN_OPTIMIZATION` and `ENABLE_AGUI_FEATURES` environment variables.
- ⏱️ **Timeout Handling**: Removed redundant `req.setTimeout` call in `callBackendAPI` for cleaner and more consistent timeout management.
- 🛡️ **Defensive Checks**: Added defensive checks for blindly accessed metrics in `formatOptimizationResult` to prevent errors from slim backend responses.
- 📝 **Logging**: Improved `startValidatedMCPServer` logging by using `console.log` for informational messages.
- 📖 **Documentation**: Updated `README.md` to reflect changes in API key usage and context detection patterns.

### Removed
- 📦 **Test Scripts from Package**: Excluded `tests/` directory from the published npm package to reduce package size and focus on core functionality.

## [2.2.0] - 2025-10-31

### Changed
- 🔄 **Backend API Alignment**: Updated to align with FastAPI Backend production-v2.2.0-stable
- 🛠️ **Tool Refinement**: Refined `create_template`, `get_template`, `update_template`, and `detect_ai_context` tools for enhanced functionality and robustness.

### Fixed
- ✅ **API Endpoints**: Ensured all backend endpoint URLs are fully compatible and robust.

### Technical
- 📦 **Dependencies**: Updated to latest MCP SDK version for improved stability.
- 🧪 **Testing**: Comprehensive internal testing to ensure full alignment between NPM package and FastAPI backend.

## [1.4.1] - 2025-09-15

### Fixed
- API key format validation
- Template auto-save threshold

## [1.4.0] - 2025-09-10

### Added
- Template auto-save feature
- Basic optimization insights
- Cross-platform support improvements

### Changed
- Improved context detection
- Enhanced error messages

## [1.3.x] - Previous Versions

Historical versions with basic prompt optimization functionality.
