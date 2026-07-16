# run_evaluation_suite MCP Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `run_evaluation_suite` MCP tool to the cloud npm package that calls the backend evaluation API and returns a clear pass/fail result, making "prompt evaluation in CI/CD" a first-class native MCP workflow.

**Architecture:** One new handler method (`handleRunEvaluationSuite`) on `MCPPromptOptimizer`, wired into the existing `ListTools` response and `CallTool` switch. Two backend paths: `batch_evaluate` when `dataset_id` is supplied, `quick_evaluate` when inline `assertions` are supplied. Both return `{ passed, score, summary }`.

**Tech Stack:** Node.js ≥16, `@modelcontextprotocol/sdk`, existing `callBackendAPI` helper, no new dependencies.

---

## File Map

| Action | Path |
|--------|------|
| Modify | `index.js` — ENDPOINTS constant, baseTools array, CallTool switch, new handler method |
| Modify | `tests/quick-test.js` — add tool-registration and handler-logic tests |

---

## Task 1: Wire the Two Evaluation Endpoints

**Files:**
- Modify: `index.js:19-65` (ENDPOINTS constant)

The two backend evaluation endpoints:
- `POST /api/v1/evaluations/evaluate/batch` — `BatchEvaluateRequest: { dataset_id, prompt_template, metrics, evaluator_type, evaluator_model }`
- `POST /api/v1/evaluations/quick-evaluate` — `QuickEvaluateRequest: { prompt, assertions, model }`

- [ ] **Step 1: Write the failing test**

Add to `tests/quick-test.js` inside the `run()` method, before the Results block:

```javascript
// 17. run_evaluation_suite endpoint constants
this.test(
    'ENDPOINTS has EVALUATIONS.BATCH and EVALUATIONS.QUICK',
    ENDPOINTS.EVALUATIONS &&
    ENDPOINTS.EVALUATIONS.BATCH === '/api/v1/evaluations/evaluate/batch' &&
    ENDPOINTS.EVALUATIONS.QUICK === '/api/v1/evaluations/quick-evaluate',
    'Evaluation endpoints defined'
);
```

Also add the `ENDPOINTS` import at the top of the test file (after the `require('../index')` line):

```javascript
// Access the ENDPOINTS constant exported from index.js
const { MCPPromptOptimizer, ENDPOINTS } = require('../index');
```

- [ ] **Step 2: Run test to verify it fails**

```
node tests/quick-test.js
```

Expected: `❌ ENDPOINTS has EVALUATIONS.BATCH and EVALUATIONS.QUICK` (ENDPOINTS not yet exported).

- [ ] **Step 3: Add EVALUATIONS to the ENDPOINTS constant in index.js**

In `index.js`, find the `ENDPOINTS` object (lines ~19–65) and add a new key after the `CE` block:

```javascript
  /** Prompt evaluation endpoints */
  EVALUATIONS: {
    /** Batch evaluate prompt against a dataset (POST) */
    BATCH:         '/api/v1/evaluations/evaluate/batch',
    /** Stateless quick evaluation with inline assertions (POST) */
    QUICK:         '/api/v1/evaluations/quick-evaluate',
  },
```

Then update the `module.exports` line at the bottom of `index.js` from:

```javascript
module.exports = { MCPPromptOptimizer };
```

to:

```javascript
module.exports = { MCPPromptOptimizer, ENDPOINTS };
```

- [ ] **Step 4: Run test to verify it passes**

```
node tests/quick-test.js
```

Expected: `✅ ENDPOINTS has EVALUATIONS.BATCH and EVALUATIONS.QUICK`

- [ ] **Step 5: Commit**

```bash
git add index.js tests/quick-test.js
git commit -m "feat(eval): add EVALUATIONS endpoints constant and export ENDPOINTS"
```

---

## Task 2: Register the Tool in ListTools

**Files:**
- Modify: `index.js` — `setupMCPHandlers()` → `baseTools` array (after `get_ce_quota_status` entry, before the closing `]`)
- Modify: `tests/quick-test.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/quick-test.js` inside `run()`:

```javascript
// 18. run_evaluation_suite appears in tool list
try {
    const server = new MCPPromptOptimizer();
    // Directly invoke the ListTools handler
    const { tools } = await server.server.requestHandlers
        .get('tools/list')({ method: 'tools/list', params: {} });
    const evalTool = tools.find(t => t.name === 'run_evaluation_suite');
    this.test(
        'run_evaluation_suite registered in tool list',
        !!evalTool,
        evalTool
            ? `Found: ${evalTool.description.slice(0, 60)}...`
            : 'Tool not found in list'
    );
    if (evalTool) {
        const schema = evalTool.inputSchema;
        this.test(
            'run_evaluation_suite schema has prompt_template (required)',
            schema.required && schema.required.includes('prompt_template'),
            'prompt_template is required'
        );
        this.test(
            'run_evaluation_suite schema has dataset_id (optional)',
            schema.properties && 'dataset_id' in schema.properties,
            'dataset_id optional property present'
        );
        this.test(
            'run_evaluation_suite schema has assertions (optional)',
            schema.properties && 'assertions' in schema.properties,
            'assertions optional property present'
        );
    }
} catch (error) {
    this.test('run_evaluation_suite registered in tool list', false, error.message);
}
```

- [ ] **Step 2: Run tests to verify they fail**

```
node tests/quick-test.js
```

Expected: `❌ run_evaluation_suite registered in tool list`

- [ ] **Step 3: Add the tool schema to baseTools in index.js**

In `index.js`, find the `get_ce_quota_status` tool entry (ends at line ~316) and add immediately after it, still inside the `baseTools` array:

```javascript
        {
          name: "run_evaluation_suite",
          description: "✅ Run a prompt evaluation suite and get a pass/fail result. Provide dataset_id for a full dataset evaluation (batch), or provide inline assertions for a quick stateless check. Returns passed (boolean), score (0-1), and a human-readable summary. Use exit_on_failure=true to surface failures in CI pipelines.",
          inputSchema: {
            type: "object",
            properties: {
              prompt_template: {
                type: "string",
                description: "The prompt text to evaluate"
              },
              dataset_id: {
                type: "string",
                description: "Dataset UUID for batch evaluation. If omitted, assertions must be provided for a quick stateless evaluation."
              },
              assertions: {
                type: "array",
                description: "Inline assertions for quick evaluation (used when dataset_id is not provided).",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: [
                        "contains", "not-contains", "equals", "regex",
                        "is-json", "length-min", "length-max",
                        "constraint-preservation", "llm-rubric", "factuality"
                      ],
                      description: "Assertion type"
                    },
                    value: { type: "string", description: "Expected value or pattern" },
                    threshold: { type: "number", description: "Per-assertion pass threshold (0-1, default 0.6)" },
                    weight: { type: "number", description: "Relative weight for scoring (default 1.0)" }
                  },
                  required: ["type"]
                }
              },
              metrics: {
                type: "array",
                items: { type: "string" },
                default: ["clarity", "accuracy"],
                description: "Evaluation metrics for batch mode (e.g. 'clarity', 'accuracy', 'safety')"
              },
              threshold: {
                type: "number",
                default: 0.7,
                description: "Minimum overall score (0-1) to consider the evaluation passed. Default 0.7."
              },
              evaluator_model: {
                type: "string",
                description: "LLM model for graded assertions (optional, defaults to system model)"
              }
            },
            required: ["prompt_template"]
          }
        },
```

- [ ] **Step 4: Run tests to verify they pass**

```
node tests/quick-test.js
```

Expected: `✅ run_evaluation_suite registered in tool list`, `✅ run_evaluation_suite schema has prompt_template (required)`, `✅ run_evaluation_suite schema has dataset_id (optional)`, `✅ run_evaluation_suite schema has assertions (optional)`

- [ ] **Step 5: Commit**

```bash
git add index.js tests/quick-test.js
git commit -m "feat(eval): register run_evaluation_suite in MCP tool list"
```

---

## Task 3: Add Case to CallTool Switch

**Files:**
- Modify: `index.js:355-378` (`CallToolRequestSchema` switch statement)

- [ ] **Step 1: Write the failing test**

Add to `tests/quick-test.js` inside `run()`:

```javascript
// 19. run_evaluation_suite has a handler in the switch (throws, not "Unknown tool")
try {
    const server = new MCPPromptOptimizer();
    let errorMessage = '';
    try {
        // Missing both dataset_id and assertions — handler should throw its own error,
        // not "Unknown tool: run_evaluation_suite"
        await server.handleRunEvaluationSuite({ prompt_template: 'test' });
    } catch (e) {
        errorMessage = e.message;
    }
    this.test(
        'run_evaluation_suite handler exists (not Unknown tool)',
        !errorMessage.includes('Unknown tool'),
        errorMessage || 'handler found'
    );
} catch (error) {
    this.test('run_evaluation_suite handler exists', false, error.message);
}
```

- [ ] **Step 2: Run test to verify it fails**

```
node tests/quick-test.js
```

Expected: `❌ run_evaluation_suite handler exists (not Unknown tool)` — error message includes "Unknown tool".

- [ ] **Step 3: Add the case to the switch in index.js**

Find the switch statement in `setupMCPHandlers()` (around line 358–378). Add the new case before the `default` case:

```javascript
          case "run_evaluation_suite": return await this.handleRunEvaluationSuite(args);
```

The full switch block after the change:

```javascript
        switch (name) {
          case "optimize_prompt": return await this.handleOptimizePrompt(args);
          case "get_quota_status": return await this.handleGetQuotaStatus();
          case "search_templates": return await this.handleSearchTemplates(args);
          case "list_recent_templates": return await this.handleListRecentTemplates(args);
          case "detect_ai_context": return await this.handleDetectAIContext(args);
          case "create_template": return await this.handleCreateTemplate(args);
          case "get_template": return await this.handleGetTemplate(args);
          case "update_template": return await this.handleUpdateTemplate(args);
          case "get_optimization_insights": return await this.handleGetOptimizationInsights(args);
          case "get_real_time_status": return await this.handleGetRealTimeStatus();
          case "generate_agent_sop": return await this.handleGenerateAgentSop(args);
          case "generate_skill_package": return await this.handleGenerateSkillPackage(args);
          case "transform_for_framework": return await this.handleTransformForFramework(args);
          case "get_ce_quota_status": return await this.handleGetCEQuotaStatus();
          case "run_evaluation_suite": return await this.handleRunEvaluationSuite(args);
          default: throw new Error(`Unknown tool: ${name}`);
        }
```

- [ ] **Step 4: Run test to verify it passes**

```
node tests/quick-test.js
```

Expected: `✅ run_evaluation_suite handler exists (not Unknown tool)`

- [ ] **Step 5: Commit**

```bash
git add index.js tests/quick-test.js
git commit -m "feat(eval): wire run_evaluation_suite case into CallTool switch"
```

---

## Task 4: Implement `handleRunEvaluationSuite`

**Files:**
- Modify: `index.js` — add method after `handleGetCEQuotaStatus` (around line 1053)

The handler has two branches:
- **Batch path** (`dataset_id` present): `POST /api/v1/evaluations/evaluate/batch` with `{ dataset_id, prompt_template, metrics, evaluator_type, evaluator_model }`. Response is `BatchEvaluationResult: { total_test_cases, completed, failed, average_score, pass_rate, failed_cases }`.
- **Quick path** (`assertions` present, no `dataset_id`): `POST /api/v1/evaluations/quick-evaluate` with `{ prompt, assertions, model }`. Response is `QuickEvaluateResponse: { passed, overall_score, assertion_results }`.
- **Neither present**: throw validation error.

Pass/fail is determined by comparing `average_score` (batch) or `overall_score` (quick) against `threshold` (default 0.7).

- [ ] **Step 1: Write the failing tests**

Add to `tests/quick-test.js` inside `run()`:

```javascript
// 20. handleRunEvaluationSuite — quick path: passes when score >= threshold
try {
    const server = new MCPPromptOptimizer();

    // Stub callBackendAPI to return a mock quick-evaluate response
    server.callBackendAPI = async (endpoint, payload) => {
        if (endpoint === ENDPOINTS.EVALUATIONS.QUICK) {
            return {
                passed: true,
                overall_score: 0.85,
                assertion_results: [
                    { type: 'contains', passed: true, score: 0.85, explanation: 'ok', weight: 1 }
                ]
            };
        }
        throw new Error(`Unexpected endpoint: ${endpoint}`);
    };

    const result = await server.handleRunEvaluationSuite({
        prompt_template: 'Explain quantum entanglement clearly.',
        assertions: [{ type: 'contains', value: 'quantum' }],
        threshold: 0.7
    });
    const text = result.content[0].text;
    this.test(
        'handleRunEvaluationSuite quick path: PASSED at 0.85',
        text.includes('PASSED') && text.includes('0.85'),
        text.slice(0, 100)
    );
} catch (error) {
    this.test('handleRunEvaluationSuite quick path', false, error.message);
}

// 21. handleRunEvaluationSuite — quick path: fails when score < threshold
try {
    const server = new MCPPromptOptimizer();
    server.callBackendAPI = async (endpoint, payload) => ({
        passed: false,
        overall_score: 0.55,
        assertion_results: [
            { type: 'contains', passed: false, score: 0.55, explanation: 'missing keyword', weight: 1 }
        ]
    });

    const result = await server.handleRunEvaluationSuite({
        prompt_template: 'bad prompt',
        assertions: [{ type: 'contains', value: 'quantum' }],
        threshold: 0.7
    });
    const text = result.content[0].text;
    this.test(
        'handleRunEvaluationSuite quick path: FAILED at 0.55',
        text.includes('FAILED') && text.includes('0.55'),
        text.slice(0, 100)
    );
} catch (error) {
    this.test('handleRunEvaluationSuite quick path FAILED', false, error.message);
}

// 22. handleRunEvaluationSuite — batch path: passes when average_score >= threshold
try {
    const server = new MCPPromptOptimizer();
    server.callBackendAPI = async (endpoint, payload) => {
        if (endpoint === ENDPOINTS.EVALUATIONS.BATCH) {
            return {
                total_test_cases: 5,
                completed: 5,
                failed: 0,
                average_score: 0.88,
                pass_rate: 1.0,
                failed_cases: []
            };
        }
        throw new Error(`Unexpected endpoint: ${endpoint}`);
    };

    const result = await server.handleRunEvaluationSuite({
        prompt_template: 'Explain {{topic}} simply.',
        dataset_id: 'dataset-uuid-abc123',
        threshold: 0.7
    });
    const text = result.content[0].text;
    this.test(
        'handleRunEvaluationSuite batch path: PASSED at 0.88',
        text.includes('PASSED') && text.includes('0.88'),
        text.slice(0, 100)
    );
} catch (error) {
    this.test('handleRunEvaluationSuite batch path', false, error.message);
}

// 23. handleRunEvaluationSuite — validation: throws when neither dataset_id nor assertions
try {
    const server = new MCPPromptOptimizer();
    let threw = false;
    try {
        await server.handleRunEvaluationSuite({ prompt_template: 'hello' });
    } catch (e) {
        threw = e.message.includes('dataset_id') || e.message.includes('assertions');
    }
    this.test(
        'handleRunEvaluationSuite validates: requires dataset_id or assertions',
        threw,
        'Throws informative error when neither is provided'
    );
} catch (error) {
    this.test('handleRunEvaluationSuite validation', false, error.message);
}
```

- [ ] **Step 2: Run tests to verify they fail**

```
node tests/quick-test.js
```

Expected: 4 FAILs — `handleRunEvaluationSuite is not a function` (or handler throws "Unknown tool").

- [ ] **Step 3: Implement handleRunEvaluationSuite in index.js**

Add this method after `handleGetCEQuotaStatus` (after line ~1053):

```javascript
  async handleRunEvaluationSuite(args) {
    if (!args.prompt_template) throw new Error('prompt_template is required');

    const threshold = typeof args.threshold === 'number' ? args.threshold : 0.7;
    const hasBatch = !!args.dataset_id;
    const hasQuick = Array.isArray(args.assertions) && args.assertions.length > 0;

    if (!hasBatch && !hasQuick) {
      throw new Error(
        'Provide either dataset_id (batch evaluation) or assertions (quick evaluation)'
      );
    }

    try {
      if (hasBatch) {
        // ── Batch path ──────────────────────────────────────────────────────
        const payload = {
          dataset_id: args.dataset_id,
          prompt_template: args.prompt_template,
          metrics: args.metrics || ['clarity', 'accuracy'],
          evaluator_type: 'llm',
        };
        if (args.evaluator_model) payload.evaluator_model = args.evaluator_model;

        const result = await this.callBackendAPI(ENDPOINTS.EVALUATIONS.BATCH, payload);

        const score = result.average_score ?? 0;
        const passed = score >= threshold;
        const passedCount = result.completed - result.failed;
        const total = result.total_test_cases || result.total || result.completed || 0;

        const lines = [
          `## Evaluation Suite: ${passed ? '✅ PASSED' : '❌ FAILED'}`,
          '',
          `**Score:** ${score.toFixed(2)} / 1.00  (threshold: ${threshold})`,
          `**Test Cases:** ${passedCount}/${total} passed  (pass rate: ${((result.pass_rate || 0) * 100).toFixed(1)}%)`,
        ];

        if (!passed && result.failed_cases && result.failed_cases.length > 0) {
          lines.push('', '**Failed Cases:**');
          for (const c of result.failed_cases.slice(0, 5)) lines.push(`- ${c}`);
          if (result.failed_cases.length > 5) {
            lines.push(`- …and ${result.failed_cases.length - 5} more`);
          }
        }

        lines.push('', `*Evaluated with batch dataset: ${args.dataset_id}*`);
        return { content: [{ type: 'text', text: lines.join('\n') }] };

      } else {
        // ── Quick path ──────────────────────────────────────────────────────
        const payload = {
          prompt: args.prompt_template,
          assertions: args.assertions,
        };
        if (args.evaluator_model) payload.model = args.evaluator_model;

        const result = await this.callBackendAPI(ENDPOINTS.EVALUATIONS.QUICK, payload);

        const score = result.overall_score ?? 0;
        const passed = score >= threshold;

        const lines = [
          `## Evaluation Suite: ${passed ? '✅ PASSED' : '❌ FAILED'}`,
          '',
          `**Score:** ${score.toFixed(2)} / 1.00  (threshold: ${threshold})`,
          '',
          '**Assertion Results:**',
        ];

        if (Array.isArray(result.assertion_results)) {
          for (const a of result.assertion_results) {
            const icon = a.passed ? '✅' : '❌';
            lines.push(`${icon} \`${a.type}\` — score: ${(a.score || 0).toFixed(2)}  ${a.explanation || ''}`);
          }
        }

        lines.push('', '*Evaluated with inline assertions (stateless)*');
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }
    } catch (error) {
      throw new Error(`Evaluation suite failed: ${error.message}`);
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```
node tests/quick-test.js
```

Expected: 4 new tests PASS. Overall test count increases by 4.

- [ ] **Step 5: Run the full test suite**

```
npm test
```

Expected: all existing tests still pass, new tests pass.

- [ ] **Step 6: Commit**

```bash
git add index.js tests/quick-test.js
git commit -m "feat(eval): implement handleRunEvaluationSuite with batch and quick-eval paths"
```

---

## Task 5: Version Bump and CHANGELOG

**Files:**
- Modify: `package.json` — bump version `3.1.3` → `3.2.0`
- Modify: `CHANGELOG.md` — add v3.2.0 entry

The version bump is minor (new feature, no breaking changes).

- [ ] **Step 1: Update version in package.json**

In `package.json`, change:

```json
"version": "3.1.3",
```

to:

```json
"version": "3.2.0",
```

Also update `backend_alignment.last_sync`:

```json
"last_sync": "2026-05-01T00:00:00Z"
```

- [ ] **Step 2: Add CHANGELOG entry**

At the top of `CHANGELOG.md` (before the first existing entry), add:

```markdown
## [3.2.0] — 2026-05-01

### Added
- `run_evaluation_suite` MCP tool: run prompt evaluation suites and get pass/fail results natively in any MCP-compatible CI/CD pipeline
  - **Batch mode**: supply `dataset_id` + `prompt_template` to evaluate against a saved dataset
  - **Quick mode**: supply inline `assertions` for a stateless single-prompt check
  - Configurable `threshold` (default 0.7) — compare to `average_score` (batch) or `overall_score` (quick)
  - Returns structured pass/fail summary with per-assertion details in quick mode
- Exported `ENDPOINTS` constant from module for use in external tooling and tests

```

- [ ] **Step 3: Run quick test to confirm version update is reflected**

```
node tests/quick-test.js
```

Expected: `Package.json validity` test shows updated version `3.2.0`.

- [ ] **Step 4: Commit**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump to v3.2.0 — add run_evaluation_suite tool"
```

---

## Self-Review

**Spec coverage check against audit gap:**

| Audit item | Task |
|------------|------|
| "In CI/CD" claim requires a native MCP pass/fail evaluation tool | Tasks 1–4 ✓ |
| Tool appears in `tools/list` response | Task 2 ✓ |
| Batch path calls `POST /api/v1/evaluations/evaluate/batch` | Task 4 ✓ |
| Quick path calls `POST /api/v1/evaluations/quick-evaluate` | Task 4 ✓ |
| Returns `passed` boolean + `score` + human-readable summary | Task 4 ✓ |
| Version bump reflects the new tool | Task 5 ✓ |

**Placeholder scan:** None. All steps contain complete code.

**Type consistency:**
- `ENDPOINTS.EVALUATIONS.BATCH` used in Task 1 definition, Task 4 handler, and Task 3 test stub ✓
- `ENDPOINTS.EVALUATIONS.QUICK` same ✓
- `handleRunEvaluationSuite` named identically in switch (Task 3) and method definition (Task 4) ✓
- `threshold` parameter: default `0.7` in schema (Task 2), handler (Task 4), and test assertions (Task 4) ✓
