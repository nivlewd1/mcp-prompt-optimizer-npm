# Production Canary Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Catch backend API contract drift (a renamed field, an altered response shape on `/api/v1/mcp/optimize`) before an external user hits it, by running a real `optimize_prompt` tool call against the deployed production backend on a daily schedule.

**Architecture:** A small script (`tests/prod-canary.js`) that instantiates the package's real `MCPPromptOptimizer` class and calls its internal `handleOptimizePrompt` method directly against the real backend — no MCP stdio protocol needed, no new HTTP client, reuses the exact code path a real user's tool call goes through. A new GitHub Actions workflow runs it daily, separate from the existing hermetic `ci.yml` so a live-dependency failure never blocks a PR.

**Tech Stack:** Node.js, GitHub Actions.

**Spec:** `C:\Users\nivle\FastAPI_Backend\docs\superpowers\specs\2026-08-21-production-guardrails-design.md` (Component 6). This plan lives in `mcp-prompt-optimizer-npm`, a separate repo from the spec's home repo — see the spec's header note on scope spanning three repos.

## Global Constraints

- This canary calls the **real production backend** with a **real API key** and consumes real backend quota/spend on every scheduled run — cadence is deliberately daily (per spec), not hourly, and the workflow must not be added to `ci.yml`'s push/PR triggers (that would call prod on every commit).
- No new dependency — reuses the already-installed `MCPPromptOptimizer` class from `index.js` and Node's built-in `assert`.
- The canary must not become a second copy of the HTTP client. It calls `handleOptimizePrompt`, the same method a real MCP tool invocation reaches, so a change to `callBackendAPI`, `ENDPOINTS.OPTIMIZE`, or the response-formatting path is exercised for real, not re-implemented.
- The service account behind `PROD_CANARY_API_KEY` (Task 1) is a normal user-tier API key, not an admin credential — this canary acts as a regular client, not an operator.

---

## File Structure

- `tests/prod-canary.js` — new. Not matched by `.gitignore`'s `test-*.js` / `*-test.js` / `*.test.js` / `*-tests.js` patterns (verified), so it stays tracked, matching `tests/contract-check.js` and `tests/e2e-stdio-smoke.js`.
- `.github/workflows/prod-canary.yml` — new, separate from `ci.yml`.
- `package.json` — add a `test:prod-canary` script (mirrors the existing `test:contract`/`test:e2e` naming convention).

---

### Task 1: Provision the canary API key (manual, one-time)

Not code — do this once before Task 2's workflow can run for real:

- [ ] **Step 1: Issue a scoped API key**

Create (or reuse, if one already exists for this exact purpose) a normal free/low-tier user account against the production backend, and issue it an API key the same way any real user would (through the product's normal signup/key-issuance flow — not through backend admin tooling; this account should have no elevated privileges).

- [ ] **Step 2: Store it as a GitHub repo secret**

In this repo's GitHub Settings → Secrets → Actions, add:
- `PROD_CANARY_API_KEY` — the key from Step 1.
- `PROD_CANARY_BACKEND_URL` — the production backend base URL (same value `OPTIMIZER_BACKEND_URL` defaults to in `index.js:106`, i.e. `https://p01--project-optimizer--fvmrdk8m9k9j.code.run`, unless production has moved — confirm against the actual current deployed URL rather than assuming the hardcoded default is still current).

---

### Task 2: Write the canary script

**Files:**
- Create: `tests/prod-canary.js`
- Modify: `package.json` (add `test:prod-canary` script)

**Interfaces:**
- Consumes: `MCPPromptOptimizer` (exported from `index.js` as `{ MCPPromptOptimizer }`), instantiated with `OPTIMIZER_API_KEY`/`OPTIMIZER_BACKEND_URL` read from the process environment (its constructor already does this — see `index.js:106-107` — so the script just needs those env vars set, not a different constructor call).
- Produces: process exit code 0 on a successful, well-shaped optimize response; nonzero (with a descriptive message on stderr) on any thrown error or shape mismatch. Task 3's workflow step treats this exit code as pass/fail.

This script is not run by `npm test`/`ci.yml` — it's deliberately outside that hermetic suite (see Global Constraints). It's invoked only by Task 3's scheduled workflow (and manually, for verification).

- [ ] **Step 1: Write the script**

```javascript
#!/usr/bin/env node
// tests/prod-canary.js
//
// Calls the real production backend's /api/v1/mcp/optimize through the same
// code path a real MCP tool invocation uses (MCPPromptOptimizer.handleOptimizePrompt),
// to catch backend contract drift before an external user hits it.
//
// Deliberately NOT part of ci.yml — this hits prod and costs real backend
// spend/quota on every run. See .github/workflows/prod-canary.yml (daily cron)
// and docs/superpowers/plans/2026-08-22-prod-canary-workflow.md.

const assert = require('assert');
const { MCPPromptOptimizer } = require('../index');

async function runCanary() {
  const apiKey = process.env.OPTIMIZER_API_KEY;
  const backendUrl = process.env.OPTIMIZER_BACKEND_URL;

  if (!apiKey) {
    console.error('❌ OPTIMIZER_API_KEY not set — canary needs a real production key (see Task 1 of the prod-canary plan).');
    process.exit(1);
  }
  if (!backendUrl) {
    console.error('❌ OPTIMIZER_BACKEND_URL not set — canary must target production explicitly, not fall back to whatever default is hardcoded in index.js.');
    process.exit(1);
  }

  const client = new MCPPromptOptimizer();
  // Constructor reads OPTIMIZER_API_KEY / OPTIMIZER_BACKEND_URL from env
  // itself (index.js:106-107) — asserting here that it picked up what this
  // script just validated is present, not a duplicate config path.
  assert.strictEqual(client.apiKey, apiKey, 'client did not pick up OPTIMIZER_API_KEY from env');
  assert.strictEqual(client.backendUrl, backendUrl, 'client did not pick up OPTIMIZER_BACKEND_URL from env');

  console.log(`🔍 Canary: calling ${backendUrl}${'/api/v1/mcp/optimize'} via handleOptimizePrompt...`);

  const result = await client.handleOptimizePrompt({
    prompt: 'Write a short product description for a wireless mouse.',
    goals: ['clarity'],
  });

  // Shape assertions — this is the contract-drift check. A renamed or
  // removed field here means index.js's assumptions about the backend's
  // response no longer hold, exactly the class of bug this canary exists
  // to catch (see Component 6 of the guardrails spec).
  assert.ok(result && typeof result === 'object', 'result is not an object');
  assert.ok(Array.isArray(result.content), 'result.content is not an array');
  assert.ok(result.content.length > 0, 'result.content is empty');
  const first = result.content[0];
  assert.strictEqual(first.type, 'text', `result.content[0].type is "${first.type}", expected "text"`);
  assert.ok(typeof first.text === 'string' && first.text.length > 0, 'result.content[0].text is empty or not a string');
  assert.ok(!first.text.toLowerCase().includes('fallback_mode'), 'response indicates the client fell back to local rules-based optimization instead of a real backend response — see the fallback branch in index.js handleOptimizePrompt');

  console.log('✅ Canary passed — backend responded with the expected shape.');
  console.log(`   Response preview: ${first.text.slice(0, 120)}...`);
}

runCanary().catch((err) => {
  console.error(`❌ Canary failed: ${err.message}`);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add alongside the existing `test:contract`/`test:e2e` entries:

```json
    "test:prod-canary": "node tests/prod-canary.js",
```

- [ ] **Step 3: Verify locally against production**

Run (with real credentials from Task 1 exported in the shell, never committed):

```bash
OPTIMIZER_API_KEY=<the canary key> OPTIMIZER_BACKEND_URL=<the prod URL> npm run test:prod-canary
```

Expected: exit code 0, "✅ Canary passed" printed, with a real (non-mock) response preview. This is the closest thing to an automated test this task has — it requires real credentials and a real deployed backend, so it cannot run inside a sandboxed CI-less verification step; running it here, once, manually, is the verification for this task before Task 3 schedules it.

- [ ] **Step 4: Commit**

```bash
git add tests/prod-canary.js package.json
git commit -m "feat(guardrails): add production canary script for optimize_prompt"
```

---

### Task 3: Schedule the canary workflow

**Files:**
- Create: `.github/workflows/prod-canary.yml`

**Interfaces:**
- Consumes: `npm run test:prod-canary` (Task 2) exit code; `PROD_CANARY_API_KEY`/`PROD_CANARY_BACKEND_URL` secrets (Task 1).
- Produces: a daily scheduled GitHub Actions check, independent of `ci.yml`.

- [ ] **Step 1: Write the workflow file**

```yaml
name: Production Canary

on:
  schedule:
    - cron: '0 9 * * *'  # daily, 9am UTC
  workflow_dispatch: {}

jobs:
  canary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd  # v5

      - name: Use Node.js 20.x
        uses: actions/setup-node@a309ff8b426b58ec0e2a45f0f869d46889d02405  # v6
        with:
          node-version: '20.x'
          cache: 'npm'

      - run: npm ci

      - name: Run production canary
        env:
          OPTIMIZER_API_KEY: ${{ secrets.PROD_CANARY_API_KEY }}
          OPTIMIZER_BACKEND_URL: ${{ secrets.PROD_CANARY_BACKEND_URL }}
        run: npm run test:prod-canary
```

Note: this workflow intentionally does **not** trigger on `push`/`pull_request` — see Global Constraints. It's a separate file from `ci.yml`, not an added job inside it, so a live-backend blip never blocks a merge.

- [ ] **Step 2: Verify with workflow_dispatch**

After Task 1's secrets are provisioned and Task 2 is merged, trigger this workflow manually (GitHub UI → Actions → Production Canary → Run workflow, or `gh workflow run prod-canary.yml`) and confirm it runs green in the real CI environment (not just locally, per Task 2 Step 3 — CI's Node 20.x and network path may differ from a local machine).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/prod-canary.yml
git commit -m "feat(guardrails): schedule daily production canary workflow"
```
