'use strict';
const assert = require('assert');
const { formatQuickEvaluation } = require('../lib/format-evaluation');

const ok = { type: 'llm-rubric', passed: true, score: 0.9, evaluator_error: false };
const bad = { type: 'llm-rubric', passed: false, score: 0.0, evaluator_error: true };

// healthy pass: unchanged wording
let t = formatQuickEvaluation({ overall_score: 0.9, passed: true, assertion_results: [ok], context_detected: 'x' });
assert(/\*\*Score:\*\* 90\.0%/.test(t) && /✅ Yes/.test(t) && !/Not judged|Not fully/.test(t));
// healthy judged failure: plain No
t = formatQuickEvaluation({ overall_score: 0.2, passed: false, assertion_results: [{ ...ok, passed: false, score: 0.2 }] });
assert(/❌ No/.test(t) && !/Not judged/.test(t));
// every assertion errored (old backend: 0.0 / passed false, no degraded field): no percentage, no "No"
t = formatQuickEvaluation({ overall_score: 0.0, passed: false, assertion_results: [bad] });
assert(/Not judged/.test(t) && !/0\.0%/.test(t) && !/❌ No/.test(t));
// partial failure, new backend: not a pass, score labelled
t = formatQuickEvaluation({ overall_score: 1.0, passed: false, degraded: true, errored_count: 1,
  assertion_results: [ok, bad], failure_reasons: ['llm-rubric — NOT JUDGED: 404'] });
assert(/Not fully judged\. 1 of 2/.test(t) && /graded assertions only/.test(t) && /NOT JUDGED: 404/.test(t) && !/✅ Yes/.test(t));
// partial failure, OLD backend (passed true, no degraded field): still caught from evaluator_error
t = formatQuickEvaluation({ overall_score: 1.0, passed: true, assertion_results: [ok, bad] });
assert(/Not fully judged/.test(t) && !/✅ Yes/.test(t));
// weighted mean passed while an assertion failed on its own: say so
t = formatQuickEvaluation({ overall_score: 0.8, passed: true, failed_count: 1, assertion_results: [ok, { ...ok, passed: false }] });
assert(/✅ Yes/.test(t) && /1 assertion\(s\) failed on their own/.test(t));
// no assertion_results at all: do not crash
t = formatQuickEvaluation({ overall_score: 0.5, passed: false });
assert(/\*\*Score:\*\* 50\.0%/.test(t));
console.log('format-evaluation: 7 passed');
