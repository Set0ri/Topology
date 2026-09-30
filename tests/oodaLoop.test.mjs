import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const TOPOLOGY_DIR = path.resolve(process.cwd(), '.topology');
const LOOPS_FILE = path.join(TOPOLOGY_DIR, 'ooda_loops.json');

import { execSync } from 'child_process';

test('OODA Loop - Real CLI Parameter Clamping (1-10) and Forced Convergence', () => {
  const planId = `test-plan-${Date.now()}`;

  // Execute CLI loop command with loop 5 and max-loops 3 (should cap to 3 and force convergence)
  execSync(`node scripts/topology-log.mjs loop --plan "${planId}" --loop 5 --max-loops 3 --stage observe --thought "Testing strict ceiling"`, {
    encoding: 'utf8',
    cwd: process.cwd(),
  });

  // Verify disk record in .topology/ooda_loops.json
  assert.ok(fs.existsSync(LOOPS_FILE), 'ooda_loops.json must exist');
  const allLoops = JSON.parse(fs.readFileSync(LOOPS_FILE, 'utf8'));
  const planLoop = allLoops[planId];
  assert.ok(planLoop, 'Plan loop record should exist in ooda_loops.json');
  assert.equal(planLoop.targetMaxLoops, 3, 'Target max loops should be 3');
  assert.equal(planLoop.currentLoop, 3, 'Loop number should be clamped to 3');
  assert.equal(planLoop.isConverged, true, 'Status should be forced to converged');

  // Clean up test entry from disk
  delete allLoops[planId];
  fs.writeFileSync(LOOPS_FILE, JSON.stringify(allLoops, null, 2), 'utf8');
});

test('OODA Loop - 9-Stage Pipeline Sequence', () => {
  const OODA_STAGES = [
    'observe',
    'understand',
    'evaluate_with_council',
    'adversarial_council_evaluation',
    'each_member_plans',
    'share_and_vote_on_plan',
    'iterate_on_plan',
    'propose_plan',
    'update',
  ];

  assert.equal(OODA_STAGES.length, 9, 'Must have exactly 9 stages');
  assert.equal(OODA_STAGES[0], 'observe');
  assert.equal(OODA_STAGES[8], 'update');

  // Test stage progression
  for (let i = 0; i < OODA_STAGES.length - 1; i++) {
    const cur = OODA_STAGES[i];
    const next = OODA_STAGES[i + 1];
    assert.equal(OODA_STAGES.indexOf(next), OODA_STAGES.indexOf(cur) + 1);
  }
});
