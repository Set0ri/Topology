import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { handleToolCall, rl } from '../mcp-server/index.js';

// ============================================================================
// 1. Pure Calculation Functions (imported from mcp-server/planBudget.js)
// ============================================================================

import { getNodeBudgetMetrics, computePlanBudgetMetrics } from '../mcp-server/planBudget.js';

// ============================================================================
// Tier 1: Unit Calculations for Node & Plan Budget Metrics
// ============================================================================

test('Node Budget Metrics - Handles empty, missing, or malformed nodes safely', () => {
  const emptyRes = getNodeBudgetMetrics(null);
  assert.equal(emptyRes.costUsd, 0);
  assert.equal(emptyRes.budgetLimitUsd, undefined);
  assert.equal(emptyRes.totalTokens, 0);

  const bareNode = { id: 'step-1', label: 'Bare' };
  const bareRes = getNodeBudgetMetrics(bareNode);
  assert.equal(bareRes.costUsd, 0);
  assert.equal(bareRes.budgetLimitUsd, undefined);
  assert.equal(bareRes.totalTokens, 0);
});

test('Node Budget Metrics - Extracts flat context metrics and nested budget records', () => {
  const nodeWithFlat = {
    id: 'n1',
    label: 'Extract',
    context: {
      costUsd: 0.0125,
      budgetLimitUsd: 0.10,
      tokensUsed: { input: 1200, output: 400, total: 1600 }
    }
  };
  const m1 = getNodeBudgetMetrics(nodeWithFlat);
  assert.equal(m1.costUsd, 0.0125);
  assert.equal(m1.budgetLimitUsd, 0.10);
  assert.equal(m1.inputTokens, 1200);
  assert.equal(m1.outputTokens, 400);
  assert.equal(m1.totalTokens, 1600);

  const nodeWithNested = {
    id: 'n2',
    label: 'Transform',
    budget: {
      costUsd: 0.0345,
      budgetLimitUsd: 0.25,
      inputTokens: 3000,
      outputTokens: 800,
      totalTokens: 3800
    }
  };
  const m2 = getNodeBudgetMetrics(nodeWithNested);
  assert.equal(m2.costUsd, 0.0345);
  assert.equal(m2.budgetLimitUsd, 0.25);
  assert.equal(m2.totalTokens, 3800);
});

test('Plan Budget Metrics - Computes aggregate cost, tokens, and headroom accurately', () => {
  const plan = {
    id: 'plan-alpha',
    title: 'Alpha Pipeline',
    budgetLimitUsd: 1.50,
    nodes: [
      {
        id: 'n1',
        label: 'Step 1',
        budget: { costUsd: 0.1200, budgetLimitUsd: 0.50, inputTokens: 5000, outputTokens: 1000, totalTokens: 6000 }
      },
      {
        id: 'n2',
        label: 'Step 2',
        budget: { costUsd: 0.2800, budgetLimitUsd: 0.50, inputTokens: 10000, outputTokens: 2500, totalTokens: 12500 }
      }
    ]
  };

  const metrics = computePlanBudgetMetrics(plan);
  assert.equal(metrics.costUsd, 0.4000);
  assert.equal(metrics.budgetLimitUsd, 1.50);
  assert.equal(metrics.remainingUsd, 1.1000);
  assert.equal(metrics.utilizationPercent, 27); // 0.40 / 1.50 = 26.67% -> 27%
  assert.equal(metrics.totalInputTokens, 15000);
  assert.equal(metrics.totalOutputTokens, 3500);
  assert.equal(metrics.totalTokens, 18500);
});

test('Plan Budget Metrics - Falls back to sum of node limits or $1.00 default when unconfigured', () => {
  const planWithNodeLimits = {
    id: 'plan-auto-limit',
    nodes: [
      { id: 'n1', budget: { costUsd: 0.05, budgetLimitUsd: 0.30 } },
      { id: 'n2', budget: { costUsd: 0.10, budgetLimitUsd: 0.70 } }
    ]
  };
  const res1 = computePlanBudgetMetrics(planWithNodeLimits);
  assert.equal(res1.budgetLimitUsd, 1.00); // 0.30 + 0.70 = 1.00
  assert.equal(res1.costUsd, 0.15);
  assert.equal(res1.remainingUsd, 0.85);

  const planWithNoLimits = {
    id: 'plan-no-limits',
    nodes: [
      { id: 'n1', budget: { costUsd: 0.05 } }
    ]
  };
  const res2 = computePlanBudgetMetrics(planWithNoLimits);
  assert.equal(res2.budgetLimitUsd, 1.00); // Fallback $1.00 default
  assert.equal(res2.costUsd, 0.05);
  assert.equal(res2.remainingUsd, 0.95);
});

test('Plan Budget Metrics - Clamps utilization to 100% and calculates overrun correctly', () => {
  const overspentPlan = {
    id: 'plan-over',
    budgetLimitUsd: 0.50,
    nodes: [
      { id: 'n1', budget: { costUsd: 0.75, budgetLimitUsd: 0.50 } }
    ]
  };
  const metrics = computePlanBudgetMetrics(overspentPlan);
  assert.equal(metrics.costUsd, 0.75);
  assert.equal(metrics.budgetLimitUsd, 0.50);
  assert.equal(metrics.remainingUsd, 0); // Headroom cannot be negative
  assert.equal(metrics.utilizationPercent, 100); // Progress bar clamped to 100%
});

test('Plan Budget Metrics - Preserves flat totalTokens when inputTokens and outputTokens are not split', () => {
  const plan = {
    id: 'plan-flat-tokens',
    budgetLimitUsd: 1.00,
    nodes: [
      { id: 'n1', context: { tokensUsed: 12000, costUsd: 0.02 } },
      { id: 'n2', budget: { totalTokens: 8000, costUsd: 0.015 } }
    ]
  };
  const metrics = computePlanBudgetMetrics(plan);
  assert.equal(metrics.totalTokens, 20000, 'Total tokens should be 20000 even when input/output tokens are not split');
  assert.equal(metrics.costUsd, 0.0350);
});

test('Plan Budget Metrics - Zero budget ceiling with positive cost yields 100% utilization', () => {
  const plan = {
    id: 'plan-zero-limit',
    budgetLimitUsd: 0,
    nodes: [
      { id: 'n1', budget: { costUsd: 0.05, budgetLimitUsd: 0 } }
    ]
  };
  const metrics = computePlanBudgetMetrics(plan);
  assert.equal(metrics.budgetLimitUsd, 0);
  assert.equal(metrics.costUsd, 0.05);
  assert.equal(metrics.remainingUsd, 0);
  assert.equal(metrics.utilizationPercent, 100, 'Should report 100% utilization when spend exceeds zero limit');
});

test('Node Budget Metrics - Handles null, NaN, or cleared limits cleanly', () => {
  const nodeCleared = {
    id: 'n-cleared',
    budget: { budgetLimitUsd: null, costUsd: 0.02 }
  };
  const m = getNodeBudgetMetrics(nodeCleared);
  assert.equal(m.budgetLimitUsd, undefined, 'Null budget limit should resolve to undefined');
  assert.equal(m.costUsd, 0.02);

  const nodeNaN = {
    id: 'n-nan',
    budget: { budgetLimitUsd: NaN, costUsd: NaN }
  };
  const mNaN = getNodeBudgetMetrics(nodeNaN);
  assert.equal(mNaN.budgetLimitUsd, undefined);
  assert.equal(mNaN.costUsd, 0);
});

// ============================================================================
// Tier 2: MCP Server Budget Tool Invocations
// ============================================================================

test('MCP Tool - topology_create_plan accepts and registers budgetLimitUsd', async () => {
  const planId = `test-plan-budget-${Date.now()}`;
  const response = await handleToolCall('topology_create_plan', {
    planId,
    title: 'Budget Verification Plan',
    budgetLimitUsd: 2.50,
    nodes: [
      { id: 'step-1', label: 'Initial Step', estimatedMinutes: 5, budgetLimitUsd: 0.50 },
      { id: 'step-2', label: 'Followup Step', estimatedMinutes: 10, budgetLimitUsd: 1.00 }
    ],
    edges: [
      { source: 'step-1', target: 'step-2' }
    ]
  });

  assert.ok(response && !response.isError, 'topology_create_plan should succeed');
  assert.ok(response.content[0].text.includes(planId));
  assert.ok(response.content[0].text.includes('$2.50'), 'Output should mention budget ceiling $2.50');
});

test('MCP Tool - topology_update_node records costUsd and tokensUsed', async () => {
  const planId = `test-update-budget-${Date.now()}`;
  await handleToolCall('topology_create_plan', {
    planId,
    title: 'Update Budget Test Plan',
    budgetLimitUsd: 1.00,
    nodes: [
      { id: 'task-a', label: 'Task A' },
      { id: 'task-b', label: 'Task B' }
    ]
  });

  const updateRes = await handleToolCall('topology_update_node', {
    planId,
    nodeId: 'task-a',
    status: 'in_progress',
    costUsd: 0.0450,
    tokensUsed: 12000,
    activeThought: 'Processing initial batch of tokens'
  });

  assert.ok(updateRes && !updateRes.isError);
  assert.ok(updateRes.content[0].text.includes('$0.0450'), 'Output must report updated node spend');
});

test('MCP Tool - topology_complete_node updates final cost and formats plan budget status', async () => {
  const planId = `test-complete-budget-${Date.now()}`;
  await handleToolCall('topology_create_plan', {
    planId,
    title: 'Complete Budget Test Plan',
    budgetLimitUsd: 3.00,
    nodes: [
      { id: 'exec-1', label: 'Execute Task', budgetLimitUsd: 0.50 }
    ]
  });

  const completeRes = await handleToolCall('topology_complete_node', {
    planId,
    nodeId: 'exec-1',
    summary: 'Finished processing deliverables',
    costUsd: 0.0825,
    tokensUsed: 24500
  });

  assert.ok(completeRes && !completeRes.isError);
  const text = completeRes.content[0].text;
  assert.ok(text.includes('$0.0825'), 'Output must display final node spend');
  assert.ok(text.includes('Plan Budget Status'), 'Output must display overall plan budget status');
  assert.ok(text.includes('headroom remaining'), 'Output must display remaining headroom');
});

after(() => {
  if (rl && typeof rl.close === 'function') {
    rl.close();
  }
  process.stdin.destroy();
});
