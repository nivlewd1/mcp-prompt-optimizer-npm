'use strict';
/**
 * MCP tool annotations (readOnlyHint / destructiveHint / idempotentHint / openWorldHint), written for MCP clients that may
 * auto-approve read-only tools. Classified by each tool's own effect on the hosted service or the local disk:
 *  - readOnlyHint true ONLY for tools that issue GET requests and change nothing (checked in index.js handlers).
 *  - A wrong `true` is the risky direction, so every POST tool stays `false`, including optimize_prompt (spends quota, may auto-save
 *    a template) and the Context Engineer tools (spend credits).
 *  - destructiveHint true only where existing stored data is overwritten or removed.
 *  - Local bookkeeping files (~/.mcp-cloud-api-cache.json, ~/.mcp-cloud-health.json) are server-level and are not counted as a tool
 *    effect; they are documented in the README.
 * Every tool talks to the hosted backend, so openWorldHint is true throughout.
 */
const READ = { readOnlyHint: true, idempotentHint: true, openWorldHint: true };
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true };
const DESTROY = { readOnlyHint: false, destructiveHint: true, openWorldHint: true };

const TOOL_ANNOTATIONS = {
  // GET only
  get_quota_status: READ,
  get_ce_quota_status: READ,
  get_template: READ,
  search_templates: READ,
  list_recent_templates: READ,
  list_template_versions: READ,
  get_prompt_by_slug: READ,
  get_real_time_status: READ,
  get_optimization_insights: READ,
  // creates or changes data, or spends quota/credits, without overwriting existing stored data
  optimize_prompt: WRITE,
  detect_ai_context: WRITE,
  create_template: WRITE,
  publish_template: WRITE,
  compile_prompt: WRITE,
  run_quick_evaluation: WRITE,
  generate_agent_sop: WRITE,
  generate_skill_package: WRITE,
  transform_for_framework: WRITE,
  score_sop: WRITE,
  explore_sop_approaches: WRITE,
  generate_harness_bundle: WRITE, // also saves a new timestamped ZIP under the output folder; never overwrites
  // overwrites or removes stored data
  update_template: DESTROY,
  delete_template: DESTROY,
  rollback_template: DESTROY,
};

// Unknown tool: assume it writes (safe direction).
const FALLBACK = WRITE;

function withAnnotations(tools) {
  return tools.map((t) => ({ ...t, annotations: { ...(TOOL_ANNOTATIONS[t.name] || FALLBACK) } }));
}

module.exports = { TOOL_ANNOTATIONS, withAnnotations };
