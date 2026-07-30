#!/usr/bin/env node
/**
 * Black-box end-to-end smoke test for the published MCP server.
 *
 * Spawns `node index.js` as a real subprocess and speaks JSON-RPC over
 * stdio exactly as an external MCP client (Claude Desktop, Cursor, etc.)
 * would. Does not import any internal class or call any handler method
 * directly — if this test passes, a third-party client plugging the
 * package in will see the same behavior.
 *
 * Protocol notes: the stdio transport is newline-delimited JSON-RPC.
 * stderr carries log/banner output and must never be parsed as protocol.
 *
 * Usage:
 *   node tests/e2e-stdio-smoke.js
 *   OPTIMIZER_API_KEY=sk-opt-... node tests/e2e-stdio-smoke.js   (also runs the live tools/call check)
 */

const { spawn } = require('child_process');
const path = require('path');

const INDEX_JS = path.join(__dirname, '..', 'index.js');
const FAKE_BUT_WELL_FORMED_KEY = 'sk-dev-test-key-1234567890abcdef';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

/**
 * Spawn the server and exchange JSON-RPC messages over stdio.
 * Resolves with { rpcResponses, stderr, exitCode, exitedBeforeAnyRpc }.
 */
function runServer({ env, requests, timeoutMs = 15000, waitForId = null }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [INDEX_JS], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdoutBuf = '';
    let stderrBuf = '';
    const rpcResponses = [];
    let settled = false;

    const finish = (extra = {}) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { child.kill(); } catch (_) {}
      resolve({ rpcResponses, stderr: stderrBuf, exitCode: child.exitCode, ...extra });
    };

    const timer = setTimeout(() => finish({ timedOut: true }), timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString('utf8');
      let idx;
      while ((idx = stdoutBuf.indexOf('\n')) >= 0) {
        const line = stdoutBuf.slice(0, idx).trim();
        stdoutBuf = stdoutBuf.slice(idx + 1);
        if (!line) continue;
        let parsed;
        try {
          parsed = JSON.parse(line);
          rpcResponses.push(parsed);
        } catch (_) {
          // Non-JSON line on stdout would itself be a protocol violation;
          // record it as a synthetic response so assertions can catch it.
          rpcResponses.push({ __nonJsonStdoutLine: line });
        }
        if (waitForId !== null && parsed && parsed.id === waitForId) {
          // Grace period for any trailing output, then tear down via kill()
          // — never via stdin.end(), which some stdio transports treat as an
          // immediate shutdown signal and can race the in-flight response.
          setTimeout(() => finish(), 150);
        }
      }
    });

    child.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString('utf8');
    });

    child.on('exit', (code) => {
      finish({ exitCode: code });
    });

    child.on('error', (err) => {
      finish({ spawnError: err });
    });

    // Fire the requests, one per tick, giving the process time to boot.
    // requests[] entries are { msg, delayAfterMs } — delayAfterMs is
    // harness-only timing and must never be embedded in the JSON-RPC
    // payload itself (an SDK with strict request-schema validation will
    // reject/silently drop a message carrying an unrecognized top-level
    // field).
    (async () => {
      for (const { msg, delayAfterMs } of requests) {
        if (child.exitCode !== null || settled) break;
        try {
          child.stdin.write(JSON.stringify(msg) + '\n');
        } catch (_) {
          break;
        }
        await new Promise((r) => setTimeout(r, delayAfterMs ?? 400));
      }
    })();
  });
}

const wire = (msg, delayAfterMs) => ({ msg, delayAfterMs });

const initializeRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'e2e-smoke-test', version: '1.0.0' },
  },
};

const initializedNotification = { jsonrpc: '2.0', method: 'notifications/initialized' };

const toolsListRequest = { jsonrpc: '2.0', id: 2, method: 'tools/list' };

async function testNoApiKeyFailsCleanly() {
  console.log('\n[1] Server with no OPTIMIZER_API_KEY exits cleanly (no hang, no stack trace on stdout)');
  const result = await runServer({
    env: { OPTIMIZER_API_KEY: '' },
    requests: [],
    timeoutMs: 8000,
  });
  assert(!result.timedOut, 'process exits on its own instead of hanging forever');
  assert(result.exitCode === 1, `exits with code 1 (got ${result.exitCode})`);
  assert(result.rpcResponses.length === 0, 'never writes anything JSON-RPC-shaped to stdout (stdout stays a clean channel)');
  assert(/API key required/i.test(result.stderr), 'stderr explains the missing key in plain language');
}

async function testMalformedApiKeyFailsCleanly() {
  console.log('\n[2] Server with a malformed API key rejects fast, without ever hitting the network');
  const start = Date.now();
  const result = await runServer({
    env: { OPTIMIZER_API_KEY: 'not-a-real-key-format' },
    requests: [],
    timeoutMs: 8000,
  });
  const elapsedMs = Date.now() - start;
  assert(!result.timedOut, 'process exits on its own instead of hanging');
  assert(result.exitCode === 1, `exits with code 1 (got ${result.exitCode})`);
  assert(elapsedMs < 5000, `fails fast (${elapsedMs}ms) — a format error must not go through network retry/backoff`);
  assert(result.rpcResponses.length === 0, 'never writes anything JSON-RPC-shaped to stdout');
}

async function testWellFormedButUnknownKeyReachesLiveBackend() {
  console.log('\n[3] Well-formed but unregistered key: real round trip to the deployed backend');
  const start = Date.now();
  const result = await runServer({
    env: { OPTIMIZER_API_KEY: FAKE_BUT_WELL_FORMED_KEY },
    requests: [],
    timeoutMs: 20000,
  });
  const elapsedMs = Date.now() - start;
  assert(!result.timedOut, 'process exits on its own instead of hanging (backend reachable, retry/backoff terminates)');
  assert(result.exitCode === 1, `exits with code 1 for a key the backend does not recognize (got ${result.exitCode})`);
  assert(/Validating API key/i.test(result.stderr), 'attempted real backend validation (this is a live contract check, not a mock)');
  assert(/(Invalid|API key validation failed)/i.test(result.stderr), 'surfaces the backend rejection reason to the user');
  console.log(`  (live backend round trip took ${elapsedMs}ms)`);
}

async function testFullProtocolWithRealKey() {
  const realKey = process.env.OPTIMIZER_API_KEY;
  if (!realKey) {
    console.log('\n[4] SKIPPED: initialize -> tools/list -> tools/call optimize_prompt');
    console.log('    No OPTIMIZER_API_KEY provided to this test run. This package cannot be');
    console.log('    functionally smoke-tested end-to-end without a real, backend-registered');
    console.log('    API key — there is no mock/dev bypass reachable from index.js (developmentMode');
    console.log('    is hardcoded false; see api-key-manager.js "SECURITY: Mock validation removed").');
    console.log('    Re-run with: OPTIMIZER_API_KEY=sk-opt-... node tests/e2e-stdio-smoke.js');
    return;
  }

  console.log('\n[4] Full protocol round trip with a real API key');
  const result = await runServer({
    env: { OPTIMIZER_API_KEY: realKey },
    requests: [
      wire(initializeRequest, 500),
      wire(initializedNotification, 300),
      wire(toolsListRequest, 500),
      wire(
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'optimize_prompt',
            arguments: { prompt: 'help me write a function that reverses a linked list', goals: ['clarity'] },
          },
        },
        1000
      ),
    ],
    timeoutMs: 30000,
    waitForId: 3,
  });

  const initResp = result.rpcResponses.find((r) => r.id === 1);
  assert(!!initResp && !!initResp.result, 'initialize returns a result object');
  assert(initResp?.result?.serverInfo?.name === 'mcp-prompt-optimizer', 'serverInfo.name matches package identity');

  const listResp = result.rpcResponses.find((r) => r.id === 2);
  assert(!!listResp?.result?.tools, 'tools/list returns a tools array');
  const toolNames = (listResp?.result?.tools || []).map((t) => t.name);
  for (const expected of ['optimize_prompt', 'get_quota_status', 'search_templates']) {
    assert(toolNames.includes(expected), `tools/list advertises "${expected}"`);
  }

  const callResp = result.rpcResponses.find((r) => r.id === 3);
  assert(!!callResp, 'tools/call optimize_prompt returns a response before the process exits');
  const text = callResp?.result?.content?.[0]?.text || '';
  assert(typeof text === 'string' && text.length > 0, 'tools/call response carries non-empty text content');

  const promptWords = 'reverses a linked list'.split(' ');
  const hitCount = promptWords.filter((w) => text.toLowerCase().includes(w.toLowerCase())).length;
  assert(
    hitCount >= 2,
    'optimized output actually reflects the user\'s prompt (catches the "template rewrite discards the prompt" bug class end-to-end)'
  );
}

(async () => {
  console.log('='.repeat(80));
  console.log('E2E STDIO SMOKE TEST — real subprocess, real JSON-RPC, zero internal coupling');
  console.log('='.repeat(80));

  await testNoApiKeyFailsCleanly();
  await testMalformedApiKeyFailsCleanly();
  await testWellFormedButUnknownKeyReachesLiveBackend();
  await testFullProtocolWithRealKey();

  console.log('\n' + '='.repeat(80));
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));
  process.exit(failed > 0 ? 1 : 0);
})();
