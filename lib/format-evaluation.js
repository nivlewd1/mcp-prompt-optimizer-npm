'use strict';

/**
 * Render a /quick-evaluate response for the MCP client.
 * A judge that errored produced no verdict: never show it as a score or a plain "No".
 * Works against old backends too (no `degraded` field): per-assertion `evaluator_error`
 * has always been returned.
 */
function formatQuickEvaluation(result) {
  const assertions = Array.isArray(result.assertion_results) ? result.assertion_results : [];
  const errored = Number.isInteger(result.errored_count)
    ? result.errored_count
    : assertions.filter((a) => a && a.evaluator_error).length;
  const degraded = result.degraded === true || errored > 0;
  const allErrored = assertions.length > 0 && errored >= assertions.length;
  const score = result.overall_score != null ? (result.overall_score * 100).toFixed(1) + '%' : 'N/A';

  let out = `# 📊 Quick Evaluation Result\n\n`;
  if (allErrored) {
    out += `**Result:** ⚠️ Not judged. The evaluator failed, so there is no score and no pass/fail.\n`;
  } else if (degraded) {
    out += `**Result:** ⚠️ Not fully judged. ${errored} of ${assertions.length || '?'} assertions could not be graded, so this is not a pass.\n`;
    out += `**Score (graded assertions only):** ${score}\n`;
  } else {
    out += `**Score:** ${score}\n`;
    out += `**Passed:** ${result.passed ? '✅ Yes' : '❌ No'}\n`;
    if (result.passed && Number.isInteger(result.failed_count) && result.failed_count > 0) {
      out += `**Note:** ${result.failed_count} assertion(s) failed on their own; the weighted average still passed. Re-run with strict to require every assertion.\n`;
    }
  }
  if (degraded && Array.isArray(result.failure_reasons)) {
    for (const r of result.failure_reasons.filter((x) => /NOT JUDGED/.test(x))) out += `- ${r}\n`;
  }
  // A failed verdict without its reason is a bare number the user can't act on.
  if (!degraded && !result.passed && Array.isArray(result.failure_reasons) && result.failure_reasons.length) {
    out += `\n**Why it failed:**\n${result.failure_reasons.map((r) => `- ${r}`).join('\n')}\n`;
  }
  if (result.evaluator_model) out += `**Judge:** ${result.evaluator_model}\n`;
  if (result.context_detected) out += `**Context:** ${result.context_detected}\n`;
  if (result.actionable_feedback && result.actionable_feedback.length) {
    out += `\n**Feedback:**\n${result.actionable_feedback.map((f) => `- ${f}`).join('\n')}\n`;
  }
  return out;
}

module.exports = { formatQuickEvaluation };
