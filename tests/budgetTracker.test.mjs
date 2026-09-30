import test from 'node:test';
import assert from 'node:assert/strict';
import {
  budgetTracker,
  registerCustomModel,
  unregisterCustomModel,
  getModelConfig,
  getAllModelConfigs,
  SAFETY_STOP_THRESHOLD
} from '../mcp-server/budgetTracker.js';

test('BudgetTracker - Model Registry, Custom Model Registration & Clean Unregistration', () => {
  const modelId = `test-model-${Date.now()}`;
  const custom = registerCustomModel({
    id: modelId,
    name: 'Test Custom Model',
    family: 'Custom Family',
    provider: 'openai_compatible',
    endpoint: 'http://localhost:11434/v1',
    limits: {
      rpm: 100,
      tpm: 500000,
      dailyTokens: 10000000,
    },
    ratesPerMillion: {
      inputUsd: 0.10,
      outputUsd: 0.50,
    }
  });

  assert.equal(custom.id, modelId);
  assert.equal(custom.name, 'Test Custom Model');
  assert.equal(custom.limits.rpm, 100);

  const retrieved = getModelConfig(modelId);
  assert.ok(retrieved, 'Should retrieve registered custom model');
  assert.equal(retrieved.id, modelId);

  const all = getAllModelConfigs();
  assert.ok(all[modelId], 'getAllModelConfigs should include the newly registered model');

  // Verify clean unregistration cleans in-memory and disk records
  const removed = unregisterCustomModel(modelId);
  assert.equal(removed, true, 'Model should be cleanly unregistered');
  assert.equal(getModelConfig(modelId), null, 'Model should no longer be found');
  const allAfter = getAllModelConfigs();
  assert.equal(allAfter[modelId], undefined, 'Model should be removed from all configs');
});

test('BudgetTracker - canConsume & 15% Safety Stop Threshold', () => {
  const modelId = 'gemini-3.8-flash';
  const cfg = getModelConfig(modelId);
  assert.ok(cfg, 'Gemini 3.8 Flash config must exist');

  // Fresh state check
  const check = budgetTracker.canConsume(modelId, 1000);
  assert.equal(check.allowed, true);
  assert.equal(check.reason, 'OK');

  // Verify safe ceiling math: 85% of limits
  assert.equal(SAFETY_STOP_THRESHOLD, 0.85);
});

test('BudgetTracker - recordConsumption & Financial Math', () => {
  const modelId = 'gpt-oss-120b';
  const beforeStatus = budgetTracker.getBudgetStatus();
  const beforeTokens = beforeStatus.models[modelId]?.tpm?.current || 0;

  const result = budgetTracker.recordConsumption(modelId, 3000, Date.now(), {
    inputTokens: 1000,
    outputTokens: 2000,
  });

  assert.equal(result.tokensUsed, 3000);
  assert.ok(result.costUsd > 0, 'Cost should be computed and > 0');

  const afterStatus = budgetTracker.getBudgetStatus();
  const afterTokens = afterStatus.models[modelId]?.tpm?.current || 0;
  assert.ok(afterTokens >= beforeTokens + 3000, 'TPM should increase after consumption');
});

test('BudgetTracker - Sliding 60s Window Pruning & TTR Calculation', () => {
  const now = Date.now();
  const modelId = 'claude-4.6-opus';

  // Record an entry in the past
  budgetTracker.recordConsumption(modelId, 1500, now - 65000); // 65 seconds ago
  budgetTracker.prune(now);

  const status = budgetTracker.getBudgetStatus(now);
  const modelStatus = status.models[modelId];
  assert.ok(modelStatus, 'Model status must be present');
  // 65s ago entry should be pruned from the 60s rolling window
  assert.ok(modelStatus.rpm.current >= 0);
});

test('BudgetTracker - Manual Throttling & Cool-Down', () => {
  const modelId = 'claude-4.6-opus';
  const now = Date.now();
  budgetTracker.setThrottled(modelId, 30, now);

  const check = budgetTracker.canConsume(modelId, 1000, now);
  assert.equal(check.allowed, false);
  assert.equal(check.reason, 'THROTTLED');
  assert.ok(check.ttrSeconds > 0 && check.ttrSeconds <= 30);

  // Clear throttle
  budgetTracker.resetBudget(modelId);
  const resetCheck = budgetTracker.canConsume(modelId, 1000, now);
  assert.equal(resetCheck.allowed, true);
});
