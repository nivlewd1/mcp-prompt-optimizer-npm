#!/usr/bin/env node
/**
 * REQUEST CONTRACT TEST — pins the request bodies the CE tools send to the backend.
 *
 * generate_agent_sop sent `goal` where the backend requires `prompt`, and
 * transform_for_framework sent `goal` where it requires `user_goal`; both failed
 * 100% of the time against production. REQUIRED below mirrors the backend Pydantic
 * request models (app/models/context_engineer.py); update it when those change.
 *
 * No network, no API key. Run: node tests/ce-request-contract-check.js
 */

const assert = require('assert');
const { MCPPromptOptimizer, formatErrorDetail } = require('../index.js');

// endpoint suffix -> fields the backend model marks required
const REQUIRED = {
  '/context-engineer/sop': ['prompt'],                                   // GenerateSOPRequest
  '/context-engineer/transform': ['sop_content', 'user_goal', 'framework'], // TransformSOPRequest
  '/context-engineer/harness-bundle': ['sop_content', 'user_goal'],      // HarnessBundleRequest
  '/context-engineer/sop-explore': ['goal'],                             // SOPExploreRequest
};

let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures++;
    console.error(`  ✗ ${name}\n      ${e.message}`);
  }
}

function recordingOptimizer(responder) {
  const opt = new MCPPromptOptimizer();
  opt.calls = [];
  opt.callBackendAPI = async (endpoint, data, method = 'POST') => {
    opt.calls.push({ endpoint, data, method });
    return responder(endpoint);
  };
  return opt;
}

function assertRequired(opt, suffix) {
  const call = opt.calls.find((c) => c.endpoint.endsWith(suffix));
  assert.ok(call, `no request sent to ${suffix}`);
  for (const f of REQUIRED[suffix]) {
    assert.ok(call.data && call.data[f] !== undefined && call.data[f] !== '', `${suffix} body is missing required field "${f}" (sent: ${Object.keys(call.data || {}).join(', ')})`);
  }
}

(async () => {
  console.log('Contract: CE request bodies');

  await check('generate_agent_sop sends `prompt` (goal + context folded in)', async () => {
    const opt = recordingOptimizer(() => ({ content: 'sop' }));
    await opt.handleGenerateAgentSop({ goal: 'Summarize PRs', context: 'repo is large' });
    assertRequired(opt, '/context-engineer/sop');
    const body = opt.calls[0].data;
    assert.ok(body.prompt.includes('Summarize PRs') && body.prompt.includes('repo is large'));
  });

  await check('generate_agent_sop carries intent_frame into the prompt (backend has no such field)', async () => {
    const opt = recordingOptimizer(() => ({ content: 'sop' }));
    await opt.handleGenerateAgentSop({ goal: 'g', intent_frame: { perspective: 'DevOps engineer', out_of_scope: 'billing', success_definition: 'zero failed deploys' } });
    const body = opt.calls[0].data;
    assert.ok(!('intent_frame' in body), 'unknown field sent to backend');
    assert.ok(/DevOps engineer/.test(body.prompt) && /billing/.test(body.prompt) && /zero failed deploys/.test(body.prompt));
  });

  await check('generate_agent_sop surfaces the backend `content` field', async () => {
    const opt = recordingOptimizer(() => ({ content: 'THE-SOP-BODY' }));
    const out = await opt.handleGenerateAgentSop({ goal: 'g' });
    assert.ok(out.content[0].text.includes('THE-SOP-BODY'));
  });

  await check('transform_for_framework sends `user_goal`', async () => {
    const opt = recordingOptimizer(() => ({ content: 'code', warnings: [] }));
    await opt.handleTransformForFramework({ sop_content: '# SOP', goal: 'g', framework: 'claude_skill' });
    assertRequired(opt, '/context-engineer/transform');
  });

  await check('generate_harness_bundle sends required fields and saves the ZIP', async () => {
    const os = require('os');
    const fs = require('fs');
    const path = require('path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-contract-'));
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 1, 2, 255]);
    const opt = recordingOptimizer(() => ({ _binary: true, contentType: 'application/zip', size: zip.length, body: zip, filename: 'harness-claude_code.zip' }));
    const out = await opt.handleGenerateHarnessBundle({ goal: 'g', sop_content: '# SOP', output_dir: dir });
    assertRequired(opt, '/context-engineer/harness-bundle');
    const saved = fs.readdirSync(dir);
    assert.strictEqual(saved.length, 1, 'ZIP was not written');
    assert.ok(fs.readFileSync(path.join(dir, saved[0])).equals(zip), 'saved bytes differ from the response');
    assert.ok(out.content[0].text.includes(saved[0]), 'output does not tell the user where the file is');
  });

  await check('explore_sop_approaches sends `goal`', async () => {
    const opt = recordingOptimizer(() => ({ variants: [{ id: 'A', approach: 'process_oriented', content: 'x' }], recommended: 'A' }));
    await opt.handleExploreSopApproaches({ goal: 'g' });
    assertRequired(opt, '/context-engineer/sop-explore');
  });

  await check('explore_sop_approaches 403 message names Enterprise, not Innovator', async () => {
    const opt = new MCPPromptOptimizer();
    opt.callBackendAPI = async () => { const e = new Error('nope'); e.statusCode = 403; throw e; };
    const out = await opt.handleExploreSopApproaches({ goal: 'g' });
    assert.ok(/Enterprise/.test(out.content[0].text) && !/Innovator/.test(out.content[0].text));
  });

  await check('create_template output shows the slug', async () => {
    const opt = recordingOptimizer(() => ({ id: 'i', title: 't', slug: 't-abc12345', confidence_score: 0.8, optimized_prompt: 'p' }));
    const out = await opt.handleCreateTemplate({ title: 't', original_prompt: 'o', optimized_prompt: 'p', confidence_score: 0.8 });
    assert.ok(out.content[0].text.includes('t-abc12345'));
  });

  await check('list_template_versions renders a bare-array response', async () => {
    const opt = recordingOptimizer(() => [{ version_number: 2, created_at: 'x', change_summary: 'edit' }, { version_number: 1, created_at: 'y' }]);
    const out = await opt.handleListTemplateVersions({ template_id: 't' });
    assert.ok(out.content[0].text.includes('Version 2') && !out.content[0].text.includes('No version history'));
  });

  await check('backend error details are readable, codes preserved', async () => {
    assert.strictEqual(formatErrorDetail({ missing_variables: ['x', 'y'] }), 'Missing variables: x, y');
    assert.strictEqual(formatErrorDetail([{ loc: ['path', 'template_id'], msg: 'String should match pattern' }]), 'template_id: String should match pattern');
    assert.ok(/TIER_LIMIT_REACHED/.test(formatErrorDetail({ error: 'TIER_LIMIT_REACHED', message: 'needs Enterprise' })));
    assert.ok(/UNKNOWN_DEPLOY_TARGET.*not_a_platform/.test(formatErrorDetail({ error: 'UNKNOWN_DEPLOY_TARGET', unknown_targets: ['not_a_platform'] })));
    assert.strictEqual(formatErrorDetail('plain'), 'plain');
  });

  await check('generate_skill_package shows the session id so generate_harness_bundle can reuse it', async () => {
    const opt = recordingOptimizer((endpoint) => (endpoint.endsWith('/generate-skill-package') ? { session_id: 'sess-123' } : { workflow_state: 'complete', artifacts: { sop: 'THE SOP' } }));
    const out = await opt.handleGenerateSkillPackage({ goal: 'g' });
    assert.ok(/sess-123/.test(out.content[0].text) && /session_id/.test(out.content[0].text));
  });

  await check('backend-down fallback says so, picks a sensible context, and does not pitch a sign-up to a keyed user', async () => {
    const opt = new MCPPromptOptimizer();
    const r = opt.rulesBasedOptimize('write a python function to sort a list', opt.generateMockContextDetection('write a python function to sort a list').primary_context, ['clarity']);
    r.fallback_mode = true;
    const out = opt.formatOptimizationResult(r, { detectedContext: 'code_generation' });
    assert.ok(/backend unreachable/i.test(out), 'does not say the backend is unreachable');
    assert.ok(!/connect your API key|Unlock LLM|Sign up at|npx mcp-prompt-optimizer connect/i.test(out), 'pitches sign-up to a user who already has a key');
    assert.ok(/software_engineering|code/i.test(r.template_used), `code prompt got template ${r.template_used}`);
  });

  if (failures) {
    console.error(`\nREQUEST CONTRACT TEST FAILED — ${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nRequest contract test passed.');
})();
