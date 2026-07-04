#!/usr/bin/env node
/**
 * CONTRACT TEST (#18) — pins the /optimize response shape the client depends on.
 *
 * The npm client reads fields off the backend's optimize response. Some are
 * declared on the backend Pydantic model (app/models/optimize.py::OptimizeResponse)
 * and some are injected by the endpoint at runtime (quota_used/quota_limit,
 * metadata.routing_*). When the backend drifts, this test fails HERE — at the
 * consumer — instead of silently degrading in production.
 *
 * The single source of truth is tests/fixtures/optimize-response.json. Regenerate
 * it from a real backend response when the contract changes; this test enforces
 * that the fixture carries every field the client actually reads and that the
 * client's formatter accepts the shape.
 *
 * No network, no API key. Run: node tests/contract-check.js  (or npm run test:contract)
 * (Named *-check.js not *-test.js because .gitignore excludes tests/*-test.js.)
 */

const assert = require('assert');
const path = require('path');
const { MCPPromptOptimizer } = require('../index.js');

const fixture = require('./fixtures/optimize-response.json');

// Fields the backend Pydantic model guarantees on every success response.
const REQUIRED_TOP_LEVEL = [
  'original_prompt',
  'optimized_prompt',
  'confidence_score',
  'status',
  'metadata',
];

// Runtime-injected top-level fields the client reads (not on the Pydantic model).
const CLIENT_INJECTED_TOP_LEVEL = ['quota_used', 'quota_limit'];

// metadata sub-fields the client reads for the optimization summary.
const METADATA_READS = ['ai_context', 'routing_score', 'routing_tier', 'model_used'];

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures++;
    console.error(`  ✗ ${name}\n      ${e.message}`);
  }
}

console.log('Contract: /optimize response shape');

check('fixture has all backend-guaranteed top-level fields', () => {
  for (const f of REQUIRED_TOP_LEVEL) {
    assert.ok(f in fixture, `missing top-level field: ${f}`);
  }
});

check('fixture carries runtime-injected fields the client reads', () => {
  for (const f of CLIENT_INJECTED_TOP_LEVEL) {
    assert.ok(f in fixture, `missing injected field: ${f}`);
  }
});

check('fixture metadata carries the sub-fields the client reads', () => {
  for (const f of METADATA_READS) {
    assert.ok(f in fixture.metadata, `missing metadata.${f}`);
  }
  assert.ok(
    fixture.metadata.context_detection &&
      'ai_context' in fixture.metadata.context_detection,
    'missing metadata.context_detection.ai_context'
  );
});

check('optimized_prompt is a non-empty string', () => {
  assert.strictEqual(typeof fixture.optimized_prompt, 'string');
  assert.ok(fixture.optimized_prompt.length > 0);
});

check('confidence_score is a number in [0,1]', () => {
  assert.strictEqual(typeof fixture.confidence_score, 'number');
  assert.ok(fixture.confidence_score >= 0 && fixture.confidence_score <= 1);
});

const optimizer = new MCPPromptOptimizer();
const ctx = { detectedContext: 'CODE_GENERATION' };

check('formatter renders the LLM response (reads optimized_prompt + confidence)', () => {
  const out = optimizer.formatOptimizationResult(fixture, ctx);
  assert.strictEqual(typeof out, 'string');
  assert.ok(out.includes(fixture.optimized_prompt), 'output omits optimized_prompt');
  assert.ok(out.includes('87.0%'), 'output omits confidence percentage');
});

check('formatter handles rules_based variant', () => {
  const rules = Object.assign({}, fixture, { rules_based: true, template_used: 'code_gen' });
  const out = optimizer.formatOptimizationResult(rules, ctx);
  assert.ok(out.includes('code_gen'), 'rules-based output omits template_used');
  assert.ok(out.includes(fixture.optimized_prompt));
});

check('formatter handles fallback_mode variant', () => {
  const fb = Object.assign({}, fixture, { fallback_mode: true });
  const out = optimizer.formatOptimizationResult(fb, ctx);
  assert.ok(out.includes(fixture.optimized_prompt));
});

check('confidence_score is depended upon — absent -> visible NaN, not silent', () => {
  // The formatter does not crash without confidence_score, but the confidence
  // line renders "NaN%". This pins the dependency: if the backend stops sending
  // confidence_score, users see garbage rather than a clean number.
  const broken = Object.assign({}, fixture);
  delete broken.confidence_score;
  const out = optimizer.formatOptimizationResult(broken, ctx);
  assert.ok(out.includes('NaN'), 'expected NaN% to surface the missing confidence_score');
});

if (failures) {
  console.error(`\nCONTRACT TEST FAILED — ${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nContract test passed.');
