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
