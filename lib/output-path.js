'use strict';
/**
 * Where generate_harness_bundle may save its ZIP.
 *
 * The base folder is OPTIMIZER_OUTPUT_DIR or <tmpdir>/mcp-prompt-optimizer. Only the user's environment can move
 * the base. A tool argument (`output_dir`) may name a SUBFOLDER of the base, never an absolute path or `..`.
 */
const os = require('os');
const path = require('path');

function resolveOutputDir(requested, env = process.env, tmp = os.tmpdir()) {
  const base = path.resolve(env.OPTIMIZER_OUTPUT_DIR || path.join(tmp, 'mcp-prompt-optimizer'));
  if (requested === undefined || requested === null || requested === '') return base;
  if (typeof requested !== 'string') throw new Error('output_dir must be a string');
  const fail = () => new Error(`output_dir must be a relative subfolder of ${base} (set OPTIMIZER_OUTPUT_DIR to move the base folder)`);
  if (path.isAbsolute(requested)) throw fail();
  const resolved = path.resolve(base, requested);
  const rel = path.relative(base, resolved);
  if (rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel)) throw fail();
  return resolved;
}

module.exports = { resolveOutputDir };
