#!/usr/bin/env node
/**
 * Release check for tool annotations and the harness-bundle save location. Fully offline: the server runs against a local
 * stub backend (OPTIMIZER_BACKEND_URL=http://127.0.0.1:<port>) with a throwaway HOME, so it never touches the live backend
 * or the real ~/.mcp-cloud-*.json files, and spends no quota or credits.
 *
 * Usage: node tests/release-check.js
 */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { resolveOutputDir } = require('../lib/output-path');
const { TOOL_ANNOTATIONS } = require('../lib/tool-annotations');

// RELEASE_CHECK_INDEX lets the same checks run against an installed tarball (npm pack + npm install) instead of this checkout.
const INDEX_JS = process.env.RELEASE_CHECK_INDEX || path.join(__dirname, '..', 'index.js');
let passed = 0, failed = 0;
const assert = (cond, msg) => { if (cond) { console.log(`  ✓ ${msg}`); passed++; } else { console.log(`  ✗ ${msg}`); failed++; } };

// ---- [1] resolveOutputDir (pure)
function testResolveOutputDir() {
  console.log('\n[1] resolveOutputDir keeps writes inside the base folder');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mpo-base-'));
  const env = { OPTIMIZER_OUTPUT_DIR: tmp };
  assert(resolveOutputDir(undefined, env) === path.resolve(tmp), 'no argument -> the base folder');
  assert(resolveOutputDir('', env) === path.resolve(tmp), 'empty string -> the base folder');
  assert(resolveOutputDir('sub/dir', env) === path.join(path.resolve(tmp), 'sub', 'dir'), 'relative subfolder is allowed');
  assert(resolveOutputDir('sub/../ok', env) === path.join(path.resolve(tmp), 'ok'), 'a path that stays inside after normalisation is allowed');
  for (const bad of ['..', '../x', 'a/../../x', path.resolve(os.tmpdir(), 'elsewhere'), process.platform === 'win32' ? 'C:\\Windows\\x' : '/etc/x']) {
    let threw = false; try { resolveOutputDir(bad, env); } catch (_) { threw = true; }
    assert(threw, `rejects ${JSON.stringify(bad)}`);
  }
  let threwType = false; try { resolveOutputDir(42, env); } catch (_) { threwType = true; }
  assert(threwType, 'rejects a non-string');
  assert(resolveOutputDir(undefined, {}, '/t').endsWith('mcp-prompt-optimizer'), 'default base is <tmp>/mcp-prompt-optimizer');
}

// ---- stub backend
function startStub() {
  const log = [];
  const zip = Buffer.from('504b0506' + '00'.repeat(18), 'hex'); // minimal empty ZIP (end-of-central-directory record)
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      log.push({ method: req.method, url: req.url });
      const json = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (/quota-status/.test(req.url)) {
        return json(200, { tier: 'pro', account_type: 'individual', features_available: {}, quota: { allowed: true, limit: 500, used: 0, remaining: 500, unlimited: false } });
      }
      if (/harness/.test(req.url) && req.method === 'POST') {
        res.writeHead(200, { 'content-type': 'application/zip', 'content-disposition': 'attachment; filename="harness-test.zip"' });
        return res.end(zip);
      }
      return json(200, { valid: true, tier: 'pro', ok: true });
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, log, url: `http://127.0.0.1:${server.address().port}` })));
}

// ---- stdio client
function runServer({ env, requests, waitForIds, timeoutMs = 20000 }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [INDEX_JS], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    const responses = {}; let buf = ''; let stderr = ''; let done = false;
    const finish = (extra = {}) => { if (done) return; done = true; clearTimeout(timer); try { child.kill(); } catch (_) {} resolve({ responses, stderr, ...extra }); };
    const timer = setTimeout(() => finish({ timedOut: true }), timeoutMs);
    child.stdout.on('data', (c) => {
      buf += c.toString('utf8'); let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
        try { const m = JSON.parse(line); if (m.id !== undefined) responses[m.id] = m; } catch (_) { responses.__badLine = line; }
        if (waitForIds.every((id) => responses[id])) setTimeout(() => finish(), 150);
      }
    });
    child.stderr.on('data', (c) => { stderr += c.toString('utf8'); });
    child.on('exit', () => finish());
    (async () => { for (const { msg, delayAfterMs } of requests) { if (done) break; try { child.stdin.write(JSON.stringify(msg) + '\n'); } catch (_) { break; } await new Promise((r) => setTimeout(r, delayAfterMs ?? 500)); } })();
  });
}
const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'release-check', version: '1.0.0' } } };
const initialized = { jsonrpc: '2.0', method: 'notifications/initialized' };

async function main() {
  testResolveOutputDir();

  const stub = await startStub();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mpo-home-'));
  const outBase = fs.mkdtempSync(path.join(os.tmpdir(), 'mpo-out-'));
  const baseEnv = { OPTIMIZER_API_KEY: 'sk-opt-releasecheck1234567890abcdef', OPTIMIZER_BACKEND_URL: stub.url, HOME: home, USERPROFILE: home, OPTIMIZER_OUTPUT_DIR: outBase };

  console.log('\n[2] tools/list: every tool carries annotations that match lib/tool-annotations.js (default and with Bayesian tool enabled)');
  for (const extra of [{}, { ENABLE_BAYESIAN_OPTIMIZATION: 'true' }]) {
    const label = Object.keys(extra).length ? 'Bayesian enabled' : 'default';
    const r = await runServer({ env: { ...baseEnv, ...extra }, requests: [{ msg: init }, { msg: initialized }, { msg: { jsonrpc: '2.0', id: 2, method: 'tools/list' } }], waitForIds: [2] });
    const tools = r.responses[2] && r.responses[2].result && r.responses[2].result.tools;
    assert(Array.isArray(tools), `[${label}] tools/list returned a list${r.timedOut ? ' (TIMED OUT)' : ''}`);
    if (!Array.isArray(tools)) { console.log(r.stderr.slice(-600)); continue; }
    console.log(`    ${tools.length} tools listed`);
    assert(!r.responses.__badLine, `[${label}] stdout stayed clean JSON-RPC`);
    const missing = tools.filter((t) => !t.annotations || typeof t.annotations.readOnlyHint !== 'boolean').map((t) => t.name);
    assert(missing.length === 0, `[${label}] every tool has annotations${missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''}`);
    const unknown = tools.filter((t) => !TOOL_ANNOTATIONS[t.name]).map((t) => t.name);
    assert(unknown.length === 0, `[${label}] no tool falls back to the default annotations${unknown.length ? ' (unmapped: ' + unknown.join(', ') + ')' : ''}`);
    const mismatch = tools.filter((t) => TOOL_ANNOTATIONS[t.name] && JSON.stringify(t.annotations) !== JSON.stringify(TOOL_ANNOTATIONS[t.name])).map((t) => t.name);
    assert(mismatch.length === 0, `[${label}] annotations survive the wire unchanged${mismatch.length ? ' (differ: ' + mismatch.join(', ') + ')' : ''}`);
    const writers = tools.filter((t) => t.annotations && t.annotations.readOnlyHint === true).map((t) => t.name);
    const mustNotBeReadOnly = ['optimize_prompt', 'generate_harness_bundle', 'update_template', 'delete_template', 'rollback_template', 'create_template', 'publish_template'];
    assert(mustNotBeReadOnly.every((n) => !writers.includes(n)), 'optimize/harness/template-changing tools are never marked read-only');
    const destructive = tools.filter((t) => t.annotations && t.annotations.destructiveHint === true).map((t) => t.name).sort().join(',');
    assert(destructive === 'delete_template,rollback_template,update_template', `only update/delete/rollback_template are destructive (got ${destructive})`);
    const expected = label === 'Bayesian enabled' ? 24 : 23;
    assert(tools.length === expected && tools.length <= Object.keys(TOOL_ANNOTATIONS).length, `${expected} tools listed (got ${tools.length}); annotation map covers ${Object.keys(TOOL_ANNOTATIONS).length}`);
  }

  console.log('\n[3] generate_harness_bundle: bad output_dir fails BEFORE the backend call; a subfolder saves the ZIP');
  const call = (id, outDir) => ({ msg: { jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'generate_harness_bundle', arguments: { goal: 'release check', sop_content: 'step 1', ...(outDir !== undefined ? { output_dir: outDir } : {}) } } }, delayAfterMs: 800 });
  stub.log.length = 0;
  const bad = await runServer({ env: baseEnv, requests: [{ msg: init }, { msg: initialized }, call(3, '../../escaped')], waitForIds: [3] });
  const harnessCallsBad = stub.log.filter((e) => /harness/.test(e.url) && e.method === 'POST').length;
  const badRes = bad.responses[3];
  assert(badRes && (badRes.error || (badRes.result && badRes.result.isError)), 'path escape returns an error to the client');
  assert(harnessCallsBad === 0, 'path escape never reaches the harness endpoint (no credits spent)');
  assert(!fs.existsSync(path.resolve(outBase, '..', '..', 'escaped')), 'nothing was written outside the base folder');

  stub.log.length = 0;
  const good = await runServer({ env: baseEnv, requests: [{ msg: init }, { msg: initialized }, call(4, 'bundles')], waitForIds: [4] });
  const harnessCallsGood = stub.log.filter((e) => /harness/.test(e.url) && e.method === 'POST').length;
  const goodRes = good.responses[4];
  const text = goodRes && goodRes.result && goodRes.result.content && goodRes.result.content[0] && goodRes.result.content[0].text || '';
  assert(harnessCallsGood === 1, `exactly one harness call for a valid subfolder (got ${harnessCallsGood})`);
  const saved = fs.existsSync(path.join(outBase, 'bundles')) ? fs.readdirSync(path.join(outBase, 'bundles')) : [];
  assert(saved.length === 1 && /harness-test\.zip$/.test(saved[0]), `ZIP saved under OPTIMIZER_OUTPUT_DIR/bundles (got ${JSON.stringify(saved)})`);
  assert(text.includes(path.join(outBase, 'bundles')), 'tool result reports the saved path');
  const homeFiles = fs.readdirSync(home);
  console.log(`    throwaway HOME received: ${homeFiles.join(', ') || '(nothing)'}`);
  assert(homeFiles.every((f) => /^\.mcp-cloud-/.test(f)), 'the only files written to HOME are the documented .mcp-cloud-* cache/health files');

  stub.server.close();
  try { fs.rmSync(home, { recursive: true, force: true }); fs.rmSync(outBase, { recursive: true, force: true }); } catch (_) {}
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
