# MCP Prompt Optimizer v3.1.3

[![NPM Version](https://img.shields.io/npm/v/mcp-prompt-optimizer)](https://www.npmjs.com/package/mcp-prompt-optimizer)
[![License](https://img.shields.io/badge/license-Commercial-blue.svg)](LICENSE)
[![CI](https://github.com/prompt-optimizer/mcp-prompt-optimizer/actions/workflows/ci.yml/badge.svg)](https://github.com/prompt-optimizer/mcp-prompt-optimizer/actions)
[![Snyk Health](https://snyk.io/advisor/npm-package/mcp-prompt-optimizer/badge.svg)](https://snyk.io/advisor/npm-package/mcp-prompt-optimizer)

ðŸš€ **Professional cloud-based MCP server** for AI-powered prompt optimization with intelligent context detection, template management, team collaboration, and enterprise-grade reliability. Starting at $0/month.



## ✨ Key Features

🧠 **AI Context Detection** — Automatically detects and optimizes for code, creative writing, image generation, communication, and more
📁 **Template Management** — Auto-save high-confidence optimizations, search & reuse patterns
👥 **Team Collaboration** — Shared quotas, team templates, role-based access
📊 **Confidence Scoring** — Honest quality signal with per-tier annotations
☁️ **Cloud Processing** — Always up-to-date AI models via backend LLM pipeline
🔧 **Resilient Fallback** — Structured local optimization if the backend is unreachable
🎛️ **Personal Model Choice** — Use your own OpenRouter models via WebUI configuration
🔧 **Universal MCP** — Works with Claude Desktop, Cursor, Windsurf, Cline, VS Code, Zed, Replit

---

## 🚀 Quick Start

**1. Get your API key (required):**

- **🆓 Free Tier** (`sk-local-*`): 5 daily optimizations — [promptoptimizer.xyz/pricing](https://promptoptimizer.xyz/pricing)
- **⭐ Paid Tiers** (`sk-opt-*`, `sk-team-*`): Higher quotas, team features, advanced capabilities

**2. Install:**
```bash
npm install -g mcp-prompt-optimizer
```

**3. Configure your MCP client:**

Add to `~/.claude/claude_desktop_config.json` (Claude Desktop):
```json
{
  "mcpServers": {
    "prompt-optimizer": {
      "command": "npx",
      "args": ["mcp-prompt-optimizer"],
      "env": {
        "OPTIMIZER_API_KEY": "sk-local-your-key-here"
      }
    }
  }
}
```

**4. Restart your MCP client** and start optimizing.

> **Note:** API keys are validated against the backend server. An internet connection is required (responses are cached for up to 2 hours for reliability).

---

## ⚙️ How Optimization Works

Prompts are routed through a three-tier pipeline based on complexity and context. Each tier produces a different output format and confidence range.

### Tier 1 — LLM Optimization (backend, confidence 70–95%)

The backend routes complex or high-sophistication prompts through a Gemini Flash LLM pass that genuinely rewrites and enriches the prompt. This is the highest-quality output.

```
# 🎯 Optimized Prompt

My Python script crashes with a KeyError on line 47. I need help diagnosing
the root cause. I am using Python 3.11 with pandas 2.0. The error occurs
when accessing dictionary keys after a merge operation.

**Confidence:** 82.0%
**AI Context:** code_generation
```

### Tier 2 — Backend Rules Optimization (backend, confidence < 25%)

For simpler or lower-sophistication prompts the backend applies rules-based optimization without an LLM. When this happens, confidence will be below 25% and a note will appear explaining what to check if you expected full LLM enhancement.

```
# 🎯 Optimized Prompt

My Python script crashes with a KeyError. Please provide the error message
and relevant code.

> ℹ️ *Low confidence indicates the backend applied rules-based optimization
> (no LLM). Ensure `OPENROUTER_API_KEY` is configured in the backend for
> full LLM enhancement.*

**Confidence:** 18.0%
**AI Context:** code_generation
```

### Tier 3 — Local Rules Fallback (npm, confidence 35–55%)

If the backend is unreachable, the npm package applies optimization locally using a library of domain-specific templates. The output is a structured, user-facing prose prompt — no XML scaffolding. The confidence annotation makes the quality tier explicit.

```
# 🔧 Rules-Based Optimization Applied

⚠️ *Backend unreachable — your prompt has been structured using local rule
templates (no LLM). Re-run when the backend is available for full LLM
optimization.*

**Template:** `debugging_request`

**Optimized Prompt:**
```
My Python script crashes with a KeyError

To address this effectively:
- Identify the most likely root causes given the error description.
- Request the full error message and stack trace, plus the relevant code snippet.
- Ask about expected vs. actual behavior, programming language, and library versions.

*Response format: Step-by-step debugging walkthrough with a specific fix or next diagnostic steps.*
```

**Confidence:** 51.0% *(rules-based — LLM optimization typically 70–95%)*
**AI Context:** code_generation
```

---

## 🧠 AI Context Detection

The server automatically detects your prompt type and routes it to the appropriate optimization template.

| Context | `ai_context` value | Example patterns |
|---|---|---|
| Code & debugging | `code_generation` | `debug`, `fix`, `error`, `python`, `sql`, `refactor` |
| Web development | `code_generation` | `landing page`, `react`, `css`, `html`, `tailwind` |
| API & integration | `api_automation` | `api`, `rest`, `endpoint`, `oauth`, `webhook` |
| DevOps & automation | `technical_automation` | `deploy`, `docker`, `ci/cd`, `terraform`, `bash` |
| Data & schemas | `structured_output` | `json`, `schema`, `csv`, `yaml`, `transform` |
| Analysis & research | `llm_interaction` | `analyze`, `explain`, `compare`, `research` |
| Creative writing | `creative_writing` | `story`, `poem`, `script`, `blog`, `copywriting` |
| Email & communication | `human_communication` | `email`, `letter`, `memo`, `formal`, `reply` |
| Image generation | `image_generation` | `photorealistic`, `midjourney`, `dall-e`, `portrait` |
| Business & Strategy | `business_strategy` | `market analysis`, `swot`, `business plan` |
| Technical Strategy | `technical_strategy` | `architecture`, `system design`, `migration plan` |
| Legal & Compliance | `legal_compliance` | `contract`, `gdpr`, `terms of service`, `audit` |
| Medical & Health | `medical_healthcare` | `clinical`, `diagnosis`, `treatment`, `hipaa` |
| Education | `educational_content` | `lesson plan`, `syllabus`, `curriculum`, `quiz` |
| General | `general_assistant` | Everything else |

### Image Generation

Image prompts are handled separately. The local fallback appends style-matched quality boosters directly to the prompt (comma-separated), rather than producing structured bullets. This matches how image generation models consume prompts.

```
Input:  "Draw a photorealistic portrait of an astronaut"
Output: "Draw a photorealistic portrait of an astronaut, ultra realistic,
         sharp focus, professional photography, dynamic lighting, balanced
         composition, high quality, 4K"
```

---

## 🛠️ Available MCP Tools

### `optimize_prompt`
AI optimization with context detection, auto-save, and insights.
```json
{
  "prompt": "Your prompt text",
  "goals": ["clarity", "specificity"],
  "ai_context": "code_generation",
  "enable_bayesian": true
}
```

### `detect_ai_context`
Detect the AI context for a given prompt.
```json
{
  "prompt": "The prompt text for which to detect the AI context"
}
```

### `create_template`
Save an optimization as a reusable template.
```json
{
  "title": "Template title",
  "description": "Optional description",
  "original_prompt": "The original prompt",
  "optimized_prompt": "The optimized prompt",
  "optimization_goals": ["clarity"],
  "confidence_score": 0.9,
  "ai_context_detected": "code_generation",
  "is_public": false,
  "tags": ["debugging", "python"]
}
```

### `get_template`
Retrieve a saved template by ID.
```json
{
  "template_id": "the-template-id"
}
```

### `update_template`
Update an existing template.
```json
{
  "template_id": "the-template-id",
  "title": "Updated title",
  "is_public": true
}
```

### `search_templates`
Search your saved template library.
```json
{
  "query": "debugging",
  "ai_context": "code_generation",
  "limit": 5,
  "sort_by": "confidence_score",
  "sort_order": "desc"
}
```

### `get_quota_status`
Check subscription status and quota usage. No parameters required.

### `get_optimization_insights` *(conditional)*
Bayesian optimization insights and parameter tuning recommendations. Requires the feature to be enabled in the backend; returns mock data otherwise.
```json
{
  "analysis_depth": "detailed",
  "include_recommendations": true
}
```

### `get_real_time_status` *(conditional)*
Real-time optimization status and AG-UI capabilities. Requires the feature to be enabled in the backend; returns mock data otherwise. No parameters required.

---

## 🤖 Context Engineer (CE) Tools

Requires a Creator or Innovator subscription. CE tools generate agentic scaffolding artifacts (SOPs, skill packages, framework code) directly in your IDE.

### `generate_agent_sop`
Generate a structured SOP document for an AI agent from a goal description. Returns markdown SOP ready for use.
```json
{
  "goal": "What the agent should accomplish",
  "context": "Additional context, constraints, or domain info (optional)",
  "model_id": "Model to use (optional)"
}
```

### `generate_skill_package`
Generate a complete skill package (SOP + SKILL.md + reference + examples + helper.py) for a given agent goal. Takes 30–90 seconds (async with polling).
```json
{
  "goal": "What the agent should accomplish",
  "format": "knowledge_doc",
  "model_id": "Model to use (optional)"
}
```
`format` is one of `knowledge_doc` (default) or `agent_spec`.

### `transform_for_framework`
Transform a SOP into native code for your agent framework: LangChain tool, AutoGen agent, or Claude Code skill.
```json
{
  "sop_content": "The SOP markdown content",
  "goal": "What the agent should accomplish",
  "framework": "langchain_tool"
}
```
`framework` is one of `langchain_tool`, `autogen_agent`, or `claude_skill`.

### `get_ce_quota_status`
Check your Context Engineer credit balance and what workflows are available at your tier. No parameters required.

---

## 🎛️ Advanced Model Configuration (Optional)

Configure custom models in the WebUI and the MCP server uses them automatically.

**Step 1 — Configure in WebUI:**
1. Visit [Dashboard](https://promptoptimizer-blog.vercel.app/dashboard)
2. Go to Settings → User Settings
3. Add your OpenRouter API key (from [openrouter.ai](https://openrouter.ai))
4. Select your preferred models for optimization and evaluation

**Step 2 — Use the npm package as normal.** Your WebUI model settings are applied automatically — no changes to the MCP configuration required.

### Model Selection Priority
```
1. Your WebUI-configured models  (highest priority)
2. Request-specific model override
3. System default (google/gemini-flash-1.5-8b)
```

### Example Model Recommendations

| Use case | Optimization model | Evaluation model |
|---|---|---|
| Creative / complex | `anthropic/claude-3-5-sonnet` | `google/gemini-pro-1.5` |
| Fast / simple | `openai/gpt-4o-mini` | `openai/gpt-3.5-turbo` |
| Code / technical | `anthropic/claude-3-5-sonnet` | `anthropic/claude-3-haiku` |

> **Two different API keys:**
> - **Service key** (`sk-opt-*`) — your MCP Prompt Optimizer subscription
> - **OpenRouter key** — your personal OpenRouter account for model usage costs

---

## 💰 Subscription Plans

| Plan | Price | Optimizations/month | CE Credits | Team members |
|---|---|---|---|---|
| 🎯 Explorer | $2.99/mo | 20 | 5 | 1 |
| 🎨 Creator | $29/mo | 18,000 | 30 | 2 + 1 key |
| 🚀 Innovator | $99/mo | 75,000 | Unlimited | 5 + 10 keys |

🆓 **Free trial:** 5 optimizations with full feature access.

All plans include AI context detection, template management, personal model configuration, and optimization insights.

---

## 🔧 CLI Commands

```bash
mcp-prompt-optimizer check-status   # Check API key and quota status
mcp-prompt-optimizer validate-key   # Validate API key with backend
mcp-prompt-optimizer test           # Test backend integration
mcp-prompt-optimizer diagnose       # Run comprehensive diagnostic
mcp-prompt-optimizer clear-cache    # Clear validation cache
mcp-prompt-optimizer help           # Show help and setup instructions
mcp-prompt-optimizer version        # Show version information
```

---

## 🏢 Team Collaboration

### Team API Keys (`sk-team-*`)
- Shared quotas across team members
- Centralized billing and management
- Team template libraries for consistency
- Role-based access control

### Individual API Keys (`sk-opt-*`)
- Personal quotas and billing
- Individual template libraries
- Account self-management

---

## 🔐 Security & Privacy

- Encrypted data transmission
- API key validation with secure backend authentication
- Quota enforcement with real-time usage tracking
- No prompt data retained — processed and discarded immediately
- GDPR compliant

---

## 🔧 Universal MCP Client Support

### Claude Desktop
```json
{
  "mcpServers": {
    "prompt-optimizer": {
      "command": "npx",
      "args": ["mcp-prompt-optimizer"],
      "env": { "OPTIMIZER_API_KEY": "sk-opt-your-key-here" }
    }
  }
}
```

### Cursor IDE
Add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "prompt-optimizer": {
      "command": "npx",
      "args": ["mcp-prompt-optimizer"],
      "env": { "OPTIMIZER_API_KEY": "sk-opt-your-key-here" }
    }
  }
}
```

### Other clients
Windsurf, Cline, VS Code, Zed, Replit, JetBrains IDEs, and Neovim are all supported via standard MCP server configuration.

---

## 📦 Changelog

### v3.0.3
- **Rules fallback output rewritten** — local optimization now produces user-facing prose prompts instead of raw XML scaffolding. The output is directly usable as a prompt without modification.
- **All 18 local templates reworded** — template principles are now phrased as user request guidance rather than AI-assistant directives, producing more natural and actionable structured prompts.
- **`creative_writing` context** now routes correctly to the creative writing template (previously fell through to a generic fallback).
- **`general_assistant` context** now maps explicitly to the LLM interaction template.
- **Backend rules-tier detection** — when the backend returns confidence below 25% (indicating it ran its own rules tier without an LLM), a note appears explaining the cause and how to resolve it (`OPENROUTER_API_KEY` configuration).
- **Confidence scale annotation** — rules-based fallback confidence now shows `*(rules-based — LLM optimization typically 70–95%)*` so users understand where their result sits relative to full LLM optimization.

### v3.0.2
- Cross-platform binary compatibility improvements
- Bayesian optimization integration
- AG-UI feature flag support

### v3.0.0
- API key now required for all operations
- Development mode and offline mode removed for security
- All keys validated against backend server

---

## 🛠️ Support & Resources

- 📖 **Documentation:** [promptoptimizer-blog.vercel.app/docs](https://promptoptimizer-blog.vercel.app/docs)
- 📊 **Dashboard & model config:** [promptoptimizer-blog.vercel.app/dashboard](https://promptoptimizer-blog.vercel.app/dashboard)
- 🚀 **Pricing & API Keys**: [promptoptimizer.xyz/local-license](https://promptoptimizer.xyz/local-license)
- 🐛 **Issues:** [GitHub Issues](https://github.com/prompt-optimizer/mcp-prompt-optimizer/issues)
- 📄 **License:** [Commercial License](LICENSE)
- 🔒 **Security:** [Security Policy](SECURITY.md)
- 🤝 **Contributing:** [Contributing Guide](CONTRIBUTING.md)
- 📜 **Code of Conduct:** [Contributor Covenant](CODE_OF_CONDUCT.md)
- 📝 **Changelog:** [Release History](CHANGELOG.md)
- 📧 **Email support:** support@promptoptimizer.xyz


---

*Get started with 5 free optimizations at [promptoptimizer.xyz/pricing](https://promptoptimizer.xyz/pricing)*
at [promptoptimizer.xyz/pricing](https://promptoptimizer.xyz/pricing)*
