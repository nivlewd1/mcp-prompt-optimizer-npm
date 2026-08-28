# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.8.2] - 2026-08-27

### Added
- **Surface CE structural warnings in tool output.** The backend `/context-engineer/transform`
  and `/context-engineer/generate-skill-package` responses now carry a non-fatal `warnings`
  array (dropped SOP stages, duplicated tables, fabricated headings). `transform_for_framework`
  and `generate_skill_package` previously discarded it, so a structurally degraded artifact
  shipped silently. Both now render a `## ⚠️ Structural Warnings` section when the array is
  non-empty. No change when it is empty (the normal case) — output is byte-identical.

## [3.8.1] - 2026-07-29

### Fixed
- **Security: the validation cache let any API key inherit a different key's cached identity.**
  `~/.mcp-cloud-api-cache.json` is a single file per machine, not namespaced per key. Found live
  while testing against a real registered key: validating key A succeeds and caches its result;
  minutes later, validating a completely different, invalid key B gets a clean 401 from the
  backend — but the client's fallback logic didn't check *which* key the cached entry belonged to,
  and didn't check whether the error was a definitive rejection versus a network outage. It
  silently returned key A's cached "valid" data and started the server authenticated as A's
  account, having never actually validated B. Any string passed as `OPTIMIZER_API_KEY` within the
  cache's 1-hour window (2 hours via the short-term fallback tier) would have worked, as long as
  *some* real key had been validated on that machine recently.
  Fixed two ways: (1) a cached entry is only used if its stored `apiKeyPrefix` matches the key
  currently being validated, and (2) cache fallback is skipped entirely on a 4xx rejection —
  it's reserved for genuine network/5xx outages of the *same* already-cached key, which was
  always the intent (the surrounding code already distinguished 4xx from network errors for its
  error-message hint text; the fallback branch above it just never used that distinction).
  Added a network-free regression test (`tests/quick-test.js`) that seeds the cache with one
  key's data, forces a 401 for a different key, and asserts the second key never inherits the
  first's identity — and a second check confirming the legitimate same-key network-outage
  fallback still works unchanged.

## [3.8.0] - 2026-07-29

### Added
- **`optimize_prompt` gains `reasoning_effort` and `execution_shape`**, the two Track C1 controls
  that previously only reached `/api/v1/optimize` (the WebUI's endpoint) — `/api/v1/mcp/optimize`
  (what this tool actually calls) never had them wired in at all, a pre-existing architectural
  gap, not a regression. These matter *more* for a programmatic/agentic caller than a WebUI user:
  there's no human watching each call to decide whether a prompt is worth paying for deeper
  reasoning, or to notice a `multi_agent` request quietly running the LLM engine regardless of
  the prompt's complexity. `multi_agent` is gated the same way on this endpoint as it is on
  `/optimize` (`_gate_execution_shape`, downgraded to `direct` on tiers without repair access);
  the response echoes back the *effective* shape that ran, and the formatter now surfaces a
  downgrade when one happens. `stop_rule` (the third Track C1 control) is deliberately **not**
  exposed here: this endpoint never runs the quick-eval-then-repair flow that gives `stop_rule`
  any effect, so accepting it would advertise a guardrail that does nothing. Backend change
  landed alongside this (`app/api/mcp_router.py`), verified with new endpoint tests covering the
  free-tier downgrade, the pro-tier non-downgrade, and the team/enterprise-default non-downgrade
  path (the last one guards against team keys getting silently capped if their tier lookup ever
  comes back empty) — full backend suite (1740 passed) confirmed no regressions.
- **`generate_harness_bundle` gains `agent_read_only` and `agent_harness`**, mirroring the two
  optional fields the backend's `HarnessBundleRequest` already accepts. `agent_harness` lets the
  caller pick the generated agent.yaml's execution backend (`claude-sdk`/`codex`/`pi`) to match
  whichever API key they actually have available wherever the bundle runs — without it, the
  bundle silently defaults per-deploy-target (usually `claude-sdk`) and fails at runtime with a
  missing-credential error if that's not the key the user holds. `agent_read_only` narrows the
  generated subagent's tools to Read/Grep/Glob, for audit/review workflows that should never be
  able to edit or execute anything. Both optional, both already validated server-side (a bad
  `agent_harness` value gets a clear 422 listing valid choices).
- **`tests/e2e-stdio-smoke.js`**: black-box test that spawns the published binary as a real
  subprocess and speaks JSON-RPC over stdio, exactly as an external MCP client would. Confirms
  clean startup/shutdown behavior for missing/malformed/unregistered keys, including a live round
  trip to the deployed backend. Full `tools/call` coverage requires `OPTIMIZER_API_KEY` set to a
  real, backend-registered key — this package has no reachable mock/dev bypass (`developmentMode`
  is hardcoded `false` in `index.js`; see the `dev`/`dev:mock` npm scripts, which are currently
  dead for the same reason).

## [3.7.5] - 2026-07-18

### Fixed
- **10 MCP tools were unconditionally broken**: `generate_agent_sop`, `transform_for_framework`, `generate_harness_bundle`, `explore_sop_approaches`, `get_prompt_by_slug`, `compile_prompt`, `list_template_versions`, `rollback_template`, `publish_template`, and `run_quick_evaluation` all called backend routes that only accepted a JWT — a credential this stdio client can never obtain (no browser, no login flow). Every call to these tools failed with an auth error, always. Backend now accepts API-key auth on these routes; verified the fix doesn't expand what a key is authorized to do (every route is scoped to the calling account's own data, same as routes that already worked).
- **Tier-upgrade messages never fired**: the 403-detection check looked for the literal string `'403'` inside the error body, which never appears there — only the HTTP status code carries it. Now checks the real status code, so upgrade prompts actually show up when a real tier gate is hit.
- **Fabricated fallback data**: `get_optimization_insights` and `get_real_time_status` silently returned hardcoded fake numbers (fake optimization counts, fake AG-UI metrics) on any backend error, indistinguishable from real account data. Both now say the data is unavailable instead of inventing it.
- **`formatRealTimeStatus` read the wrong fields**: it never matched the AG-UI status endpoint's actual response shape, even when the call succeeded.
- **`formatQuotaStatus` invented a fake `5000` quota limit** when the backend didn't report one.
- **Free-tier quota text said 7/month**; the real limit is 20.
- **Dead domain and wrong key-format references**: `promptoptimizer-blog.vercel.app` no longer resolves; some messages also claimed `sk-local-*` was a valid key format for this package (that's the sibling local package's prefix, not this one's).

## [3.7.4] - 2026-07-16

### Fixed
- **CLI commands were mostly non-functional**: the README documented 8 `mcp-prompt-optimizer <command>` subcommands, but the argv dispatcher only ever recognized `connect`. Running any of `check-status`, `validate-key`, `diagnose`, `clear-cache`, `help`, or `version` silently started the blocking stdio MCP server instead, hanging the terminal. All six are now wired to their existing `lib/*.js` implementations.
- **Unrecognized commands no longer fall through to the server.** Any argument that isn't a known command now prints an error and usage to stderr and exits 1, instead of silently starting the MCP server. This closes the bug class for future commands too, not just the six fixed here.
- **Dropped `test` from the documented CLI commands.** It mapped to `tests/test-runner.js`, a maintainer-only pre-publish validation script that isn't included in the published npm package (`tests/` is not in `files`), so it could never have worked for an end user.

## [3.7.3] - 2026-07-16

### Fixed
- **Stale free-tier quota in README**: docs said 7 optimizations/month, live enforcement is 20. Docs-only fix, no code change.

## [3.7.2] - 2026-07-05

### Fixed
- **Stdout JSON-RPC corruption risk**: MCP server startup logs (banner, status lines, key validation, mode indicators) now route to **stderr** instead of stdout. On stdio transports, stdout is the JSON-RPC channel — any non-protocol writes from the server can corrupt the stream and cause client-side parse failures. All server-side logging in `startValidatedMCPServer` and `CloudApiKeyManager._log` (`success`/`info` levels) is now stderr-safe.

### Internal
- **Contract test** (`tests/contract-check.js` + `tests/fixtures/optimize-response.json`): pins the `/optimize` response shape against the backend Pydantic model (`OptimizeResponse`), including runtime-injected fields (`quota_used`, `quota_limit`) and metadata (`ai_context`, `routing_score`, `routing_tier`, `model_used`). Catches backend response drift before publish. Runs with no network/API key via `npm run test:contract`.
- **CI workflow** (`.github/workflows/ci.yml`): runs `npm ci`, health check, and the contract check on push/PR across Node 18, 20, and 22. The contract check is the publish gate.

## [3.6.0] - 2026-06-11

### Fixed
- Free-tier API key validation now works end-to-end. Free accounts (subscription_status NULL) can create one `sk-opt-*` key and use it with the MCP server for 7 LLM optimizations/month. Previously blocked by a bug where the free-tier launch patched an unused service module while the live enforcement layer retained the old 0-key/5-quota/none-MCP config.

### Added
- `connect` wizard: `npx mcp-prompt-optimizer connect` interactively adds your API key to Claude Desktop config. Supports macOS, Windows, and Linux config paths. Creates the server entry if absent, updates the key if the entry exists.
- Upsell block in local fallback output: when no API key is configured, the rules-based result includes a one-command signup path (`npx mcp-prompt-optimizer connect`).

## [3.5.0] - 2026-06-02

### Added
- LLM upsell block added to local fallback output
- `connect` subcommand (interactive Claude Desktop config wizard)

## [3.4.1] - 2026-05-28

### Changed
- Tier names updated from Explorer/Creator/Innovator to Free/Pro/Enterprise (D6 pricing migration)

## [3.4.0] - 2026-05-26

### Added
- `explore_sop_approaches` tool: generates 3 parallel SOP variants (process-oriented, decision-tree, role-based) for comparison. Optionally accepts `blend_description` to blend variants directly into a single SOP. Innovator tier required.

## [3.1.3] - 2026-04-13

### Changed
- 📦 **Version Bump**: Incremented version to 3.1.3 to ensure clean publishing and link alignment.
- 🔗 **Link Alignment**: Unified API key signup links to https://promptoptimizer.xyz/local-license.

## [3.1.2] - 2026-04-12

### Added
- 🛡️ **Security Policy**: Added `SECURITY.md` for coordinated vulnerability disclosure.
- 🤝 **Community Guidelines**: Added `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` to foster open-source participation.
- 🤖 **CI/CD Automation**: Integrated GitHub Actions (`ci.yml`) for automated build and test validation.
- 🏷️ **Snyk Health Badges**: Added professional health and status badges to `README.md`.

### Changed
- 📝 **Metadata Optimization**: Standardized `package.json` keywords and license strings for better registry visibility.
- 📂 **Package Distribution**: Updated included files list to include new community and security documentation.
- 📄 **Documentation Refresh**: Centralized resource links in README for better developer experience.

## [3.1.1] - 2026-04-10

### Changed
- 💰 **Pricing Alignment**: Updated README to reflect current subscription tiers and optimization quotas.
- 📦 **Version Bump**: Incremented version to v3.1.1 to resolve npm publishing conflict with existing v3.1.0 on the registry.

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
- All users must have valid API keys from https://promptoptimizer.xyz/pricing
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
