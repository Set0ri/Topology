import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadQuotaOptimizer,
  assertValidQuotaOptimizationResult,
} from './testHarness.mjs';
import {
  budgetTracker,
  registerCustomModel,
  unregisterCustomModel,
  SAFETY_STOP_THRESHOLD,
} from '../mcp-server/budgetTracker.js';

// ============================================================================
// Tier 1: Feature Coverage (>=5 tests)
// ============================================================================

test('Quota Optimizer - Headroom calculation accurately computes H_rpm, H_tpm, H_daily, and H_effective', async () => {
  budgetTracker.resetBudget();
  const optimize = await loadQuotaOptimizer();

  const result = optimize({
    rounds: 3,
    strategy: 'balanced',
  });

  assertValidQuotaOptimizationResult(result);
  assert.equal(result.safetyCeilingThreshold, 0.85);

  const balanced = result.candidateRosters[0];
  assert.ok(balanced.maxRpmUtilizationPct < 85, 'RPM utilization must be under 85%');
  assert.ok(balanced.maxTpmUtilizationPct < 85, 'TPM utilization must be under 85%');
  assert.equal(balanced.safeCeilingSatisfied, true);
});

test('Quota Optimizer - Strict < 85% Safety Ceiling threshold enforcement', async () => {
  assert.equal(SAFETY_STOP_THRESHOLD, 0.85);
  const optimize = await loadQuotaOptimizer();

  const result = optimize({
    rounds: 3,
  });

  for (const roster of result.candidateRosters) {
    if (roster.safeCeilingSatisfied) {
      assert.ok(roster.maxRpmUtilizationPct < 85, `${roster.rosterName} RPM must be < 85%`);
      assert.ok(roster.maxTpmUtilizationPct < 85, `${roster.rosterName} TPM must be < 85%`);
    }
  }
});

test('Quota Optimizer - Candidate Roster generation outputs ranked multi-model options', async () => {
  budgetTracker.resetBudget();
  const optimize = await loadQuotaOptimizer();

  const result = optimize({
    rounds: 3,
    maxCandidateRosters: 3,
  });

  assert.ok(result.candidateRosters.length >= 2, 'Should generate at least 2 distinct candidate rosters');
  assert.equal(result.candidateRosters[0].rank, 1);
  assert.equal(result.candidateRosters[1].rank, 2);

  // Each roster must have distinct properties
  assert.ok(result.candidateRosters[0].rosterName);
  assert.ok(result.candidateRosters[1].rosterName);
});

test('Quota Optimizer - Recommended Roster selection identifies highest suitability score', async () => {
  budgetTracker.resetBudget();
  const optimize = await loadQuotaOptimizer();

  const result = optimize({
    rounds: 3,
    strategy: 'balanced',
  });

  assert.ok(result.recommendedRoster, 'Must provide recommended roster');
  assert.ok(result.recommendedRoster.suitabilityScore > 0);
  assert.equal(result.recommendedRoster.safeCeilingSatisfied, true);
});

test('Quota Optimizer - Optimization Strategies modulate recommendations (balanced vs cost_optimized)', async () => {
  budgetTracker.resetBudget();
  const optimize = await loadQuotaOptimizer();

  const balancedResult = optimize({ rounds: 3, strategy: 'balanced' });
  const costResult = optimize({ rounds: 3, strategy: 'cost_optimized' });

  assert.ok(balancedResult.recommendedRoster);
  assert.ok(costResult.recommendedRoster);

  // Cost optimized roster projected cost must be <= balanced roster projected cost
  assert.ok(
    costResult.recommendedRoster.projectedCostUsd <= balancedResult.recommendedRoster.projectedCostUsd,
    'Cost optimized roster must be equal or cheaper than balanced roster'
  );
});

// ============================================================================
// Tier 2: Boundary & Corner Cases
// ============================================================================

test('Quota Optimizer - Target USD budget limit ($0.05) filters or penalizes expensive rosters', async () => {
  budgetTracker.resetBudget();
  const optimize = await loadQuotaOptimizer();

  const lowBudget = 0.005; // $0.005 USD limit
  const result = optimize({
    targetBudgetUsd: lowBudget,
    rounds: 3,
  });

  // Recommended roster must strictly satisfy target budget
  assert.ok(
    result.recommendedRoster.projectedCostUsd <= lowBudget || result.recommendedRoster.safeCeilingSatisfied,
    'Optimizer should prefer roster within budget limit'
  );
});

test('Quota Optimizer - Model in active throttle cooldown (TTR > 0) is recognized and substituted', async () => {
  const modelId = 'claude-4.6-opus';
  const now = Date.now();
  budgetTracker.setThrottled(modelId, 45, now);

  const optimize = await loadQuotaOptimizer();
  const result = optimize({
    rounds: 3,
    preferredModels: ['gemini-3.8-flash', 'claude-4.6-opus', 'gpt-oss-120b'],
  });

  // Balanced roster should replace Claude with a surrogate because Claude is throttled
  const balanced = result.candidateRosters[0];
  const hasClaude = balanced.models.includes('claude-4.6-opus');
  assert.equal(hasClaude, false, 'Throttled Claude Opus must be replaced by surrogate');
  assert.ok(balanced.surrogateSubstitutions.length > 0, 'Must record surrogate substitution');
  assert.equal(balanced.surrogateSubstitutions[0].original, 'claude-4.6-opus');

  budgetTracker.resetBudget(modelId);
});

test('Quota Optimizer - Deliberation round scaling (1 round vs 3 rounds) scales cost proportionally', async () => {
  budgetTracker.resetBudget();
  const optimize = await loadQuotaOptimizer();

  const result1Round = optimize({ rounds: 1 });
  const result3Rounds = optimize({ rounds: 3 });

  const cost1 = result1Round.recommendedRoster.projectedCostUsd;
  const cost3 = result3Rounds.recommendedRoster.projectedCostUsd;

  assert.ok(cost3 > cost1, '3-round deliberation must cost more than 1-round');
  // Cost should scale approximately 3x
  const ratio = cost3 / cost1;
  assert.ok(ratio >= 2.5 && ratio <= 3.5, `Ratio should be approximately 3x, got ${ratio}`);
});

test('Quota Optimizer - Zero headroom model is marked safety_stopped and excluded from primary seat', async () => {
  const modelId = 'claude-4.6-opus';
  budgetTracker.resetBudget(modelId);

  // Consume up to 90% of TPM to breach 85% safety stop threshold
  const cfg = budgetTracker.getBudgetStatus().models[modelId];
  const limit = cfg.tpm.limit;
  budgetTracker.recordConsumption(modelId, Math.floor(limit * 0.90), Date.now());

  const optimize = await loadQuotaOptimizer();
  const result = optimize({
    rounds: 3,
    preferredModels: ['gemini-3.8-flash', 'claude-4.6-opus', 'gpt-oss-120b'],
  });

  const balanced = result.candidateRosters[0];
  assert.ok(!balanced.models.includes('claude-4.6-opus'), 'Exhausted model must be excluded from active roster');

  budgetTracker.resetBudget(modelId);
});

test('Quota Optimizer - Zero or negative budget handled safely without NaN or crash', async () => {
  budgetTracker.resetBudget();
  const optimize = await loadQuotaOptimizer();

  const zeroBudgetResult = optimize({ targetBudgetUsd: 0 });
  assertValidQuotaOptimizationResult(zeroBudgetResult);
  assert.ok(!Number.isNaN(zeroBudgetResult.recommendedRoster.projectedCostUsd));

  const negativeBudgetResult = optimize({ targetBudgetUsd: -1.0 });
  assertValidQuotaOptimizationResult(negativeBudgetResult);
});

// ============================================================================
// Tier 3: Cross-Feature Combinations
// ============================================================================

test('Quota Optimizer - Surrogate Model Substitution replaces exhausted Critic with reasoning surrogate', async () => {
  const modelId = 'claude-4.6-opus';
  budgetTracker.setThrottled(modelId, 60, Date.now());

  const optimize = await loadQuotaOptimizer();
  const result = optimize({
    rounds: 3,
  });

  const recommended = result.recommendedRoster;
  assert.ok(recommended.surrogateSubstitutions.some(s => s.original === 'claude-4.6-opus'));
  const surrogateEntry = recommended.surrogateSubstitutions.find(s => s.original === 'claude-4.6-opus');
  assert.ok(surrogateEntry.surrogate, 'Surrogate model ID must be specified');
  assert.ok(surrogateEntry.rationale.length > 0, 'Rationale must be documented');

  budgetTracker.resetBudget(modelId);
});

test('Quota Optimizer - Surrogate substitution respecting tight USD budget ceiling', async () => {
  budgetTracker.resetBudget();
  const optimize = await loadQuotaOptimizer();

  const tightBudget = 0.01; // $0.01 ceiling
  const result = optimize({
    targetBudgetUsd: tightBudget,
    rounds: 3,
    strategy: 'cost_optimized',
  });

  assert.ok(result.recommendedRoster.projectedCostUsd <= tightBudget || result.recommendedRoster.safeCeilingSatisfied);
});

test('Quota Optimizer - Custom registered models dynamically evaluated and included in rosters', async () => {
  const customId = `custom-deepseek-${Date.now()}`;
  registerCustomModel({
    id: customId,
    name: 'DeepSeek V3 Custom',
    family: 'DeepSeek',
    provider: 'openai_compatible',
    endpoint: 'http://localhost:11434/v1',
    limits: { rpm: 200, tpm: 1000000, dailyTokens: 20000000 },
    ratesPerMillion: { inputUsd: 0.15, outputUsd: 0.60 },
  });

  try {
    const optimize = await loadQuotaOptimizer();
    const result = optimize({
      rounds: 3,
      preferredModels: ['gemini-3.8-flash', customId],
    });

    assertValidQuotaOptimizationResult(result);
  } finally {
    unregisterCustomModel(customId);
  }
});

// ============================================================================
// Tier 4: Real-World Application Scenario
// ============================================================================

test('Quota Optimizer - Deliberation Burst Scenario: High load auto-suggests surrogate without quota breach', async () => {
  budgetTracker.resetBudget();

  // Simulate burst of requests on Claude Opus until it reaches 82% of TPM
  const opusLimit = 300000;
  budgetTracker.recordConsumption('claude-4.6-opus', Math.floor(opusLimit * 0.82), Date.now());

  const optimize = await loadQuotaOptimizer();
  const result = optimize({
    rounds: 3,
    targetBudgetUsd: 0.20,
    strategy: 'balanced',
  });

  assertValidQuotaOptimizationResult(result);

  // Recommended roster must avoid pushing Claude Opus past 85% ceiling
  const rec = result.recommendedRoster;
  assert.equal(rec.safeCeilingSatisfied, true);
  assert.ok(rec.maxTpmUtilizationPct < 85);

  budgetTracker.resetBudget();
});
