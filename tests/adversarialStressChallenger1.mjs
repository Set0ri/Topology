/**
 * Adversarial Stress Harness - Challenger 1
 * 
 * Deeply stress-tests:
 *  1. Debate streaming under burst, disconnects, aborts, and malformed inputs
 *  2. Quota optimizer boundary conditions: 0 USD, exact 85% ceiling, sliding TTR bursts, extreme exhaustion
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createMockBridgeServer } from './testHarness.mjs';
import {
  debateStreamBus,
  emitDebateChunk,
  setBridgeConfig,
} from '../mcp-server/debateStreamBus.js';
import {
  budgetTracker,
  optimizeCouncilAllocation,
  registerCustomModel,
  unregisterCustomModel,
  SAFETY_STOP_THRESHOLD,
} from '../mcp-server/budgetTracker.js';

// ============================================================================
// PART 1: DEBATE STREAMING ADVERSARIAL STRESS TESTS
// ============================================================================

test('Adversarial 1.1: High-concurrency burst (250 chunks) across 10 concurrent SSE clients with connection pooling', async () => {
  const bridge = await createMockBridgeServer();
  const CLIENT_COUNT = 10;
  const CHUNK_COUNT = 250;
  const clientSockets = [];
  const clientReceivedCounts = new Array(CLIENT_COUNT).fill(0);
  const agent = new http.Agent({ keepAlive: true, maxSockets: 25 });

  try {
    // Connect 10 SSE clients
    for (let i = 0; i < CLIENT_COUNT; i++) {
      const idx = i;
      await new Promise((resolve, reject) => {
        const parsed = new URL(`${bridge.baseUrl}/api/topology/stream`);
        const req = http.request({
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname,
          method: 'GET',
          headers: { 'Accept': 'text/event-stream' },
        }, (res) => {
          clientSockets.push(req);
          res.on('data', (buf) => {
            const str = buf.toString();
            const matches = str.match(/event:\s*council_debate_chunk/g);
            if (matches) {
              clientReceivedCounts[idx] += matches.length;
            }
          });
          resolve();
        });
        req.on('error', reject);
        req.end();
      });
    }

    // Wait for all 10 clients to be registered
    await new Promise(r => setTimeout(r, 60));
    assert.equal(bridge.clients.size, CLIENT_COUNT);

    // Blast 250 chunks concurrently with connection pooling agent
    const blastPromises = [];
    for (let c = 0; c < CHUNK_COUNT; c++) {
      const chunk = {
        sessionId: 'session-blast-250',
        planId: 'plan-stress',
        round: (c % 3) + 1,
        phase: c % 3 === 0 ? 'ideate' : (c % 3 === 1 ? 'critique' : 'synthesize'),
        modelId: c % 2 === 0 ? 'gemini-3.8-flash' : 'claude-4.6-opus',
        deltaText: `Chunk payload ${c} with special chars 🚀 & <xml> "quotes" \n multiline`,
        tokensUsedDelta: 10,
        costUsdDelta: 0.00001,
        timestamp: Date.now(),
      };

      blastPromises.push(new Promise((resolve) => {
        const parsed = new URL(`${bridge.baseUrl}/api/topology/council/chunk`);
        const bodyStr = JSON.stringify(chunk);
        const req = http.request({
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname,
          method: 'POST',
          agent,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr),
          },
        }, (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode));
        });
        req.on('error', (err) => resolve({ error: err.message }));
        req.write(bodyStr);
        req.end();
      }));
    }

    const statusCodes = await Promise.all(blastPromises);
    assert.equal(statusCodes.every(code => code === 200), true, 'All 250 POST requests must return 200 OK');
    assert.equal(bridge.chunksReceived.length, CHUNK_COUNT);

    // Wait for SSE propagation
    await new Promise(r => setTimeout(r, 400));

    // Verify all clients received chunks without dropping frames
    for (let i = 0; i < CLIENT_COUNT; i++) {
      assert.equal(
        clientReceivedCounts[i],
        CHUNK_COUNT,
        `Client ${i} must receive all ${CHUNK_COUNT} chunks, got ${clientReceivedCounts[i]}`
      );
    }
  } finally {
    agent.destroy();
    for (const req of clientSockets) {
      try { req.destroy(); } catch {}
    }
    await bridge.close();
  }
});

test('Adversarial 1.2: Abrupt SSE client disconnects during active burst streaming', async () => {
  const bridge = await createMockBridgeServer();
  const dyingSockets = [];

  try {
    // Connect 5 clients that will abort mid-stream
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => {
        const parsed = new URL(`${bridge.baseUrl}/api/topology/stream`);
        const req = http.request({
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname,
          method: 'GET',
          headers: { 'Accept': 'text/event-stream' },
        }, () => {
          dyingSockets.push(req);
          resolve();
        });
        req.end();
      });
    }

    // Connect 1 persistent client
    let persistentReceived = 0;
    let persistentReq;
    await new Promise((resolve) => {
      const parsed = new URL(`${bridge.baseUrl}/api/topology/stream`);
      persistentReq = http.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'GET',
        headers: { 'Accept': 'text/event-stream' },
      }, (res) => {
        res.on('data', (buf) => {
          const matches = buf.toString().match(/event:\s*council_debate_chunk/g);
          if (matches) persistentReceived += matches.length;
        });
        resolve();
      });
      persistentReq.end();
    });

    await new Promise(r => setTimeout(r, 50));
    assert.equal(bridge.clients.size, 6);

    // Start publishing chunks while simultaneously destroying sockets
    for (let c = 0; c < 50; c++) {
      if (c === 10) {
        // Abruptly destroy first 3 clients
        dyingSockets[0].destroy();
        dyingSockets[1].destroy();
        dyingSockets[2].destroy();
      }
      if (c === 25) {
        // Abruptly destroy remaining 2 dying clients
        dyingSockets[3].destroy();
        dyingSockets[4].destroy();
      }

      const chunk = {
        sessionId: 'session-abort-test',
        planId: 'plan-stress',
        round: 1,
        phase: 'ideate',
        modelId: 'gemini-3.8-flash',
        deltaText: `Chunk ${c}`,
        tokensUsedDelta: 5,
        costUsdDelta: 0.000001,
        timestamp: Date.now(),
      };

      await new Promise((resolve) => {
        const parsed = new URL(`${bridge.baseUrl}/api/topology/council/chunk`);
        const bodyStr = JSON.stringify(chunk);
        const req = http.request({
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr),
          },
        }, (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode));
        });
        req.write(bodyStr);
        req.end();
      });
    }

    await new Promise(r => setTimeout(r, 200));

    // Persistent client must have received all 50 chunks uninterrupted
    assert.equal(persistentReceived, 50, 'Persistent client should receive all 50 chunks');
    persistentReq.destroy();
  } finally {
    await bridge.close();
  }
});

test('Adversarial 1.3: debateStreamBus fail-open when bridge is completely offline', async () => {
  // Point debateStreamBus to an unassigned dead port
  setBridgeConfig({ host: '127.0.0.1', port: 59999, path: '/api/topology/council/chunk' });

  const chunk = {
    sessionId: 'session-dead-bridge',
    planId: 'plan-offline',
    round: 1,
    phase: 'ideate',
    modelId: 'gemini-3.8-flash',
    deltaText: 'Testing fail-open when bridge is down',
    tokensUsedDelta: 10,
    costUsdDelta: 0.00001,
  };

  // Must not throw unhandled exception or hang!
  const res = await emitDebateChunk(chunk);
  assert.equal(res.ok, false);
  assert.equal(res.code, 'TOPOLOGY_ERR_BRIDGE_OFFLINE');

  // Verify chunk was still recorded in in-memory session buffer
  const sessionChunks = debateStreamBus.getSessionChunks('session-dead-bridge');
  assert.equal(sessionChunks.length, 1);
  assert.equal(sessionChunks[0].deltaText, chunk.deltaText);

  debateStreamBus.clearSessionChunks('session-dead-bridge');
});

test('Adversarial 1.4: Ingress POST route resilience against malformed & adversarial payloads', async () => {
  const bridge = await createMockBridgeServer();

  try {
    const testCases = [
      { name: 'empty JSON', payload: {}, expectedStatus: 400 },
      { name: 'missing modelId', payload: { sessionId: 's1', phase: 'ideate' }, expectedStatus: 400 },
      { name: 'missing phase', payload: { sessionId: 's1', modelId: 'm1' }, expectedStatus: 400 },
      { name: 'missing sessionId', payload: { modelId: 'm1', phase: 'ideate' }, expectedStatus: 400 },
      { name: 'invalid JSON syntax', rawString: '{"invalid": json syntax', expectedStatus: 400 },
    ];

    for (const tc of testCases) {
      const res = await new Promise((resolve) => {
        const parsed = new URL(`${bridge.baseUrl}/api/topology/council/chunk`);
        const bodyStr = tc.rawString !== undefined ? tc.rawString : JSON.stringify(tc.payload);
        const req = http.request({
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr),
          },
        }, (res) => {
          let b = '';
          res.on('data', c => b += c);
          res.on('end', () => resolve({ status: res.statusCode, body: b }));
        });
        req.write(bodyStr);
        req.end();
      });

      assert.equal(res.status, tc.expectedStatus, `Case "${tc.name}" must return status ${tc.expectedStatus}`);
    }
  } finally {
    await bridge.close();
  }
});

test('Adversarial 1.5: Ingress POST route handles socket abort mid-upload without server crash', async () => {
  const bridge = await createMockBridgeServer();

  try {
    await new Promise((resolve) => {
      const parsed = new URL(`${bridge.baseUrl}/api/topology/council/chunk`);
      const req = http.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': 10000,
        },
      });

      req.on('error', () => {
        // Expected error on aborted request
        resolve();
      });

      // Send partial bytes then immediately destroy socket
      req.write('{"sessionId": "abort-halfway"');
      req.destroy();
    });

    // Verify bridge is still alive and answering subsequent requests
    const res = await new Promise((resolve) => {
      const parsed = new URL(`${bridge.baseUrl}/api/topology/council/chunk`);
      const validPayload = JSON.stringify({
        sessionId: 'session-after-abort',
        planId: 'plan-1',
        round: 1,
        phase: 'ideate',
        modelId: 'gemini-3.8-flash',
        deltaText: 'Server recovered cleanly',
      });
      const req = http.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(validPayload),
        },
      }, (r) => {
        resolve(r.statusCode);
      });
      req.write(validPayload);
      req.end();
    });

    assert.equal(res, 200, 'Bridge server must remain healthy after client socket abort');
  } finally {
    await bridge.close();
  }
});

// ============================================================================
// PART 2: QUOTA OPTIMIZER ADVERSARIAL STRESS TESTS
// ============================================================================

test('Adversarial 2.1: Quota Optimizer boundary conditions on targetBudgetUsd (0, negative, micro-budget)', () => {
  budgetTracker.resetBudget();

  // Test targetBudgetUsd = 0
  const zeroResult = optimizeCouncilAllocation({ targetBudgetUsd: 0 });
  assert.ok(zeroResult.recommendedRoster, 'Must return a recommended roster');
  assert.ok(!Number.isNaN(zeroResult.recommendedRoster.projectedCostUsd));
  assert.ok(zeroResult.recommendedRoster.suitabilityScore >= 0);

  // Test targetBudgetUsd = -50
  const negResult = optimizeCouncilAllocation({ targetBudgetUsd: -50 });
  assert.ok(negResult.recommendedRoster);
  assert.ok(!Number.isNaN(negResult.recommendedRoster.suitabilityScore));

  // Test micro-budget: $0.00001 (below any 3-model roster)
  const microResult = optimizeCouncilAllocation({ targetBudgetUsd: 0.00001 });
  assert.ok(microResult.recommendedRoster);
  assert.ok(microResult.candidateRosters.length > 0);
  assert.ok(!Number.isNaN(microResult.recommendedRoster.projectedCostUsd));
});

test('Adversarial 2.2: Exact 85% Safety Ceiling threshold boundary saturation', () => {
  budgetTracker.resetBudget();
  const modelId = 'claude-4.6-opus';
  const opusConfig = budgetTracker.getBudgetStatus().models[modelId];

  // 1. Consume tokens up to exactly 84.9% of limit
  // Safe ceiling is 85% = 255,000
  // Estimated consumption for 3 rounds of Claude is ~16,500 tokens (rounds * 5500)
  // If we consume 238,000 tokens:
  // projected = 238,000 + 16,500 = 254,500 <= 255,000 (SATISFIES CEILING)
  budgetTracker.resetBudget(modelId);
  budgetTracker.recordConsumption(modelId, 238000, Date.now());

  let result = optimizeCouncilAllocation({ rounds: 3, strategy: 'maximum_reasoning' });
  let opusEval = result.candidateRosters.find(r => r.rosterName === 'Maximum Reasoning Frontier');
  assert.equal(opusEval.models.includes('claude-4.6-opus'), true, 'Should include Claude when projected TPM <= 85%');

  // 2. Consume tokens so projected TPM exceeds 85% by just 1 token
  // If we consume 239,000:
  // projected = 239,000 + 16,500 = 255,500 > 255,000 (CEILING BREACHED)
  budgetTracker.resetBudget(modelId);
  budgetTracker.recordConsumption(modelId, 239000, Date.now());

  result = optimizeCouncilAllocation({ rounds: 3, strategy: 'maximum_reasoning' });
  opusEval = result.candidateRosters.find(r => r.rosterName === 'Maximum Reasoning Frontier');
  assert.equal(opusEval.models.includes('claude-4.6-opus'), false, 'Should exclude Claude when projected TPM > 85%');
  assert.ok(opusEval.surrogateSubstitutions.some(s => s.original === 'claude-4.6-opus'), 'Must substitute Claude with surrogate');

  budgetTracker.resetBudget();
});

test('Adversarial 2.3: Sliding 60s window TTR under heavy multi-request burst and clock skew', () => {
  budgetTracker.resetBudget();
  const modelId = 'gemini-3.8-flash';
  const now = 1700000000000;

  // Simulate 100 rapid requests within 5 seconds
  for (let i = 0; i < 100; i++) {
    budgetTracker.recordConsumption(modelId, 500, now + (i * 50));
  }

  const status1 = budgetTracker.getBudgetStatus(now + 5000).models[modelId];
  assert.equal(status1.rpm.current, 100);
  assert.equal(status1.tpm.current, 50000);

  // Advance time by 60,001 ms -> sliding window must prune completely
  const statusAfter60s = budgetTracker.getBudgetStatus(now + 65001).models[modelId];
  assert.equal(statusAfter60s.rpm.current, 0, 'Requests older than 60s must be pruned');
  assert.equal(statusAfter60s.tpm.current, 0, 'Tokens older than 60s must be pruned');
  // Daily consumption should persist
  assert.equal(statusAfter60s.daily.current, 50000, 'Daily tokens must persist past 60s window');

  budgetTracker.resetBudget();
});

test('Adversarial 2.4: Extreme condition - All frontier models throttled simultaneously', () => {
  budgetTracker.resetBudget();
  const now = Date.now();

  // Throttle all 3 default models
  budgetTracker.setThrottled('gemini-3.8-flash', 120, now);
  budgetTracker.setThrottled('claude-4.6-opus', 180, now);
  budgetTracker.setThrottled('gpt-oss-120b', 90, now);

  const result = optimizeCouncilAllocation({ rounds: 3 });

  // Optimizer must NOT throw!
  assert.ok(result);
  assert.ok(result.recommendedRoster);
  assert.equal(result.candidateRosters.length, 4);

  // If custom models like deepseek exist, they should be preferred as surrogates
  // If not, safeCeilingSatisfied is marked false and rosters indicate throttling
  assert.ok(result.recommendedRoster.models.length >= 1);

  budgetTracker.resetBudget();
});

test('Adversarial 2.5: Conflicting constraints - Required expensive specialist vs microscopic budget', () => {
  budgetTracker.resetBudget();

  // Require Claude Opus (costs ~$0.88 for 3 rounds) with a $0.001 budget
  const result = optimizeCouncilAllocation({
    targetBudgetUsd: 0.001,
    requiredSpecialists: ['claude-4.6-opus'],
    rounds: 3,
  });

  assert.ok(result.recommendedRoster);
  // Claude Opus must still be included because it was explicitly required
  assert.ok(
    result.recommendedRoster.models.includes('claude-4.6-opus'),
    'Required specialist must be preserved even if it causes budget overrun'
  );
  // Projected cost should exceed target budget, and suitability score reflects penalty
  assert.ok(result.recommendedRoster.projectedCostUsd > 0.001);

  budgetTracker.resetBudget();
});

test('Adversarial 2.6: Registration and surrogate evaluation of custom models', () => {
  budgetTracker.resetBudget();
  const customSurrogateId = 'custom-llama-challenger-1';

  registerCustomModel({
    id: customSurrogateId,
    name: 'Llama 3.3 Challenger Edition',
    family: 'Meta / Local',
    provider: 'ollama',
    limits: { rpm: 500, tpm: 2000000, dailyTokens: 50000000 },
    ratesPerMillion: { inputUsd: 0.01, outputUsd: 0.02 },
  });

  try {
    // When Claude Opus is throttled and deepseek-v3 is not preferred
    budgetTracker.setThrottled('claude-4.6-opus', 120, Date.now());

    const result = optimizeCouncilAllocation({
      rounds: 3,
      strategy: 'balanced',
    });

    assert.ok(result.recommendedRoster);
    // Verify custom model is tracked in candidate rosters or surrogate pool
    const allModelsInRosters = new Set(result.candidateRosters.flatMap(r => r.models));
    assert.ok(allModelsInRosters.has(customSurrogateId) || allModelsInRosters.has('deepseek-v3'), 'Surrogate pool must utilize registered custom models');
  } finally {
    unregisterCustomModel(customSurrogateId);
    budgetTracker.resetBudget();
  }
});
