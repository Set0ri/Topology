import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  createMockBridgeServer,
  assertValidDebateChunk,
} from './testHarness.mjs';
import { budgetTracker } from '../mcp-server/budgetTracker.js';

// Helper to perform HTTP POST to bridge
function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyStr = JSON.stringify(data);
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
      let resBody = '';
      res.on('data', chunk => { resBody += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resBody) });
        } catch {
          resolve({ status: res.statusCode, body: resBody });
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// Helper to open SSE connection and capture emitted events
function listenToSse(url, onEvent) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      },
    }, (res) => {
      let buffer = '';
      res.on('data', chunk => {
        buffer += chunk.toString();
        const messages = buffer.split('\n\n');
        buffer = messages.pop(); // keep remainder

        for (const msg of messages) {
          if (!msg.trim()) continue;
          const lines = msg.split('\n');
          let eventType = 'message';
          let eventData = null;

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              const rawData = line.replace('data:', '').trim();
              try {
                eventData = JSON.parse(rawData);
              } catch {
                eventData = rawData;
              }
            }
          }

          if (eventData !== null) {
            onEvent({ type: eventType, data: eventData });
          }
        }
      });

      resolve({ req, res });
    });

    req.on('error', reject);
    req.end();
  });
}

// ============================================================================
// Tier 1: Feature Coverage (>=5 tests)
// ============================================================================

test('Debate Streaming - Ingress POST /api/topology/council/chunk accepts valid chunk and returns 200', async () => {
  const bridge = await createMockBridgeServer();
  try {
    const chunk = {
      sessionId: 'session-t1-001',
      planId: 'plan-e2e',
      round: 1,
      phase: 'ideate',
      modelId: 'gemini-3.8-flash',
      deltaText: 'Initial proposal for scalable caching layer...',
      tokensUsedDelta: 120,
      costUsdDelta: 0.000036,
      timestamp: Date.now(),
    };

    const res = await postJson(`${bridge.baseUrl}/api/topology/council/chunk`, chunk);
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(bridge.chunksReceived.length, 1);
    assert.equal(bridge.chunksReceived[0].deltaText, chunk.deltaText);
  } finally {
    await bridge.close();
  }
});

test('Debate Streaming - SSE /api/topology/stream connects and broadcasts council_debate_chunk events', async () => {
  const bridge = await createMockBridgeServer();
  try {
    const receivedEvents = [];
    const { req: clientReq } = await listenToSse(`${bridge.baseUrl}/api/topology/stream`, (evt) => {
      receivedEvents.push(evt);
    });

    // Wait a brief moment for connection to register in bridge
    await new Promise(r => setTimeout(r, 50));
    assert.equal(bridge.clients.size, 1);

    const chunk = {
      sessionId: 'session-t1-002',
      planId: 'plan-e2e',
      round: 1,
      phase: 'ideate',
      modelId: 'claude-4.6-opus',
      deltaText: 'Examining concurrent lock invariants...',
      tokensUsedDelta: 85,
      costUsdDelta: 0.006375,
      timestamp: Date.now(),
    };

    await postJson(`${bridge.baseUrl}/api/topology/council/chunk`, chunk);

    // Wait for SSE transport
    await new Promise(r => setTimeout(r, 80));

    assert.ok(receivedEvents.length >= 1, 'Should have received at least 1 SSE event');
    const debateEvent = receivedEvents.find(e => e.type === 'council_debate_chunk');
    assert.ok(debateEvent, 'Must receive council_debate_chunk event');
    assert.equal(debateEvent.data.modelId, 'claude-4.6-opus');
    assert.equal(debateEvent.data.deltaText, chunk.deltaText);

    clientReq.destroy();
  } finally {
    await bridge.close();
  }
});

test('Debate Streaming - Schema Contract Verification for all required chunk fields', async () => {
  const validChunk = {
    sessionId: 'session-schema-check',
    planId: 'plan-stream-spec',
    round: 2,
    phase: 'critique',
    modelId: 'gpt-oss-120b',
    deltaText: 'Adversarial analysis: potential split-brain race condition.',
    tokensUsedDelta: 210,
    costUsdDelta: 0.000126,
    timestamp: Date.now(),
  };

  // Must not throw assertion error
  assertValidDebateChunk(validChunk);

  // Assert invalid chunk throws descriptive error
  const invalidChunk = { ...validChunk, phase: 'invalid_phase' };
  assert.throws(() => {
    assertValidDebateChunk(invalidChunk);
  }, /phase must be/);
});

test('Debate Streaming - Deliberation Phase Segregation (ideate, critique, synthesize)', async () => {
  const bridge = await createMockBridgeServer();
  try {
    const phases = ['ideate', 'critique', 'synthesize'];
    for (let r = 1; r <= 3; r++) {
      const phase = phases[r - 1];
      const chunk = {
        sessionId: 'session-phases',
        planId: 'plan-phase-test',
        round: r,
        phase,
        modelId: 'gemini-3.8-flash',
        deltaText: `Chunk for round ${r} in phase ${phase}`,
        tokensUsedDelta: 100,
        costUsdDelta: 0.00003,
        timestamp: Date.now(),
      };
      const res = await postJson(`${bridge.baseUrl}/api/topology/council/chunk`, chunk);
      assert.equal(res.status, 200);
      assertValidDebateChunk(chunk);
    }

    assert.equal(bridge.chunksReceived.length, 3);
    assert.equal(bridge.chunksReceived[0].phase, 'ideate');
    assert.equal(bridge.chunksReceived[1].phase, 'critique');
    assert.equal(bridge.chunksReceived[2].phase, 'synthesize');
  } finally {
    await bridge.close();
  }
});

test('Debate Streaming - Sequential Chunk Indexing and Text Accumulation across multi-token streams', async () => {
  const bridge = await createMockBridgeServer();
  try {
    const words = ['We', ' propose', ' an', ' append-only', ' log', ' architecture.'];
    let accumulated = '';
    let totalTokens = 0;

    for (let i = 0; i < words.length; i++) {
      accumulated += words[i];
      totalTokens += 15;
      const chunk = {
        sessionId: 'session-indexing',
        planId: 'plan-accumulate',
        round: 1,
        phase: 'ideate',
        modelId: 'claude-4.6-opus',
        deltaText: words[i],
        tokensUsedDelta: 15,
        costUsdDelta: 0.001125,
        timestamp: Date.now(),
        isComplete: i === words.length - 1,
      };

      const res = await postJson(`${bridge.baseUrl}/api/topology/council/chunk`, chunk);
      assert.equal(res.status, 200);
    }

    assert.equal(bridge.chunksReceived.length, words.length);
    const fullText = bridge.chunksReceived.map(c => c.deltaText).join('');
    assert.equal(fullText, 'We propose an append-only log architecture.');
    assert.equal(bridge.chunksReceived[words.length - 1].isComplete, true);
  } finally {
    await bridge.close();
  }
});

// ============================================================================
// Tier 2: Boundary & Corner Cases
// ============================================================================

test('Debate Streaming - Empty delta text string ("") is handled cleanly without corruption', async () => {
  const bridge = await createMockBridgeServer();
  try {
    const emptyChunk = {
      sessionId: 'session-empty-delta',
      planId: 'plan-corner',
      round: 1,
      phase: 'ideate',
      modelId: 'gemini-3.8-flash',
      deltaText: '',
      tokensUsedDelta: 0,
      costUsdDelta: 0,
      timestamp: Date.now(),
    };

    const res = await postJson(`${bridge.baseUrl}/api/topology/council/chunk`, emptyChunk);
    assert.equal(res.status, 200);
    assert.equal(bridge.chunksReceived[0].deltaText, '');
    assertValidDebateChunk(emptyChunk);
  } finally {
    await bridge.close();
  }
});

test('Debate Streaming - Zero token and zero cost deltas handled without NaN or undefined', async () => {
  const chunk = {
    sessionId: 'session-zero-cost',
    planId: 'plan-zero-cost',
    round: 1,
    phase: 'ideate',
    modelId: 'gpt-oss-120b',
    deltaText: 'Heartbeat thought marker',
    tokensUsedDelta: 0,
    costUsdDelta: 0.0,
    timestamp: Date.now(),
  };

  assertValidDebateChunk(chunk);
  assert.equal(chunk.tokensUsedDelta, 0);
  assert.equal(chunk.costUsdDelta, 0.0);
  assert.ok(!Number.isNaN(chunk.costUsdDelta));
});

test('Debate Streaming - Malformed payload or missing required fields returns 400 Bad Request', async () => {
  const bridge = await createMockBridgeServer();
  try {
    // Missing sessionId and phase
    const badPayload = {
      modelId: 'gemini-3.8-flash',
      deltaText: 'Missing required metadata',
    };

    const res = await postJson(`${bridge.baseUrl}/api/topology/council/chunk`, badPayload);
    assert.equal(res.status, 400);
    assert.equal(res.body.ok, false);
    assert.ok(res.body.error);
  } finally {
    await bridge.close();
  }
});

test('Debate Streaming - Completion flag (isComplete: true) marks clean stream termination', async () => {
  const bridge = await createMockBridgeServer();
  try {
    const terminalChunk = {
      sessionId: 'session-terminal',
      planId: 'plan-terminal',
      round: 3,
      phase: 'synthesize',
      modelId: 'claude-4.6-opus',
      deltaText: 'Final consensus verified.',
      tokensUsedDelta: 50,
      costUsdDelta: 0.00375,
      timestamp: Date.now(),
      isComplete: true,
    };

    const res = await postJson(`${bridge.baseUrl}/api/topology/council/chunk`, terminalChunk);
    assert.equal(res.status, 200);
    assert.equal(bridge.chunksReceived[0].isComplete, true);
  } finally {
    await bridge.close();
  }
});

test('Debate Streaming - High-throughput burst arrival (100 concurrent chunks without frame drops)', async () => {
  const bridge = await createMockBridgeServer();
  try {
    const burstCount = 100;
    const promises = [];

    for (let i = 0; i < burstCount; i++) {
      const chunk = {
        sessionId: 'session-burst-test',
        planId: 'plan-burst',
        round: 1,
        phase: 'ideate',
        modelId: i % 2 === 0 ? 'gemini-3.8-flash' : 'gpt-oss-120b',
        deltaText: `Chunk #${i}`,
        tokensUsedDelta: 10,
        costUsdDelta: 0.000003,
        timestamp: Date.now(),
      };
      promises.push(postJson(`${bridge.baseUrl}/api/topology/council/chunk`, chunk));
    }

    const responses = await Promise.all(promises);
    for (const res of responses) {
      assert.equal(res.status, 200);
    }
    assert.equal(bridge.chunksReceived.length, burstCount);
  } finally {
    await bridge.close();
  }
});

// ============================================================================
// Tier 3: Cross-Feature Combinations
// ============================================================================

test('Debate Streaming - Streaming Chunks update real-time model token consumption and USD costs', () => {
  budgetTracker.resetBudget('gemini-3.8-flash');
  const beforeStatus = budgetTracker.getBudgetStatus().models['gemini-3.8-flash'];
  const beforeTokens = beforeStatus?.tpm?.current || 0;

  // Stream simulation: record chunk tokens
  const tokensToStream = [250, 400, 350];
  let accumulatedTokens = 0;

  for (const delta of tokensToStream) {
    accumulatedTokens += delta;
    budgetTracker.recordConsumption('gemini-3.8-flash', delta, Date.now(), {
      inputTokens: Math.floor(delta * 0.4),
      outputTokens: Math.floor(delta * 0.6),
    });
  }

  const afterStatus = budgetTracker.getBudgetStatus().models['gemini-3.8-flash'];
  assert.equal(afterStatus.tpm.current, beforeTokens + accumulatedTokens);
  assert.ok(afterStatus.cost.sessionCostUsd > 0);
});

test('Debate Streaming - Fail-Open Resilience: Client socket abort mid-stream does not crash publisher', async () => {
  const bridge = await createMockBridgeServer();
  try {
    // Open client SSE connection and immediately destroy socket
    const { req: clientReq } = await listenToSse(`${bridge.baseUrl}/api/topology/stream`, () => {});
    await new Promise(r => setTimeout(r, 40));
    clientReq.destroy(); // Abrupt disconnect
    await new Promise(r => setTimeout(r, 40));

    // Publisher attempts to broadcast subsequent chunk
    const chunk = {
      sessionId: 'session-resilience',
      planId: 'plan-fail-open',
      round: 1,
      phase: 'ideate',
      modelId: 'gemini-3.8-flash',
      deltaText: 'Continuing unhindered after client disconnect.',
      tokensUsedDelta: 50,
      costUsdDelta: 0.000015,
      timestamp: Date.now(),
    };

    // Must succeed without unhandled exceptions
    const res = await postJson(`${bridge.baseUrl}/api/topology/council/chunk`, chunk);
    assert.equal(res.status, 200);
    assert.equal(bridge.chunksReceived.length, 1);
  } finally {
    await bridge.close();
  }
});

test('Debate Streaming - Multi-Model Concurrent Interleaved Streaming without state collision', async () => {
  const bridge = await createMockBridgeServer();
  try {
    const models = ['gemini-3.8-flash', 'claude-4.6-opus', 'gpt-oss-120b'];
    const interleavedChunks = [];

    for (let round = 1; round <= 2; round++) {
      for (const modelId of models) {
        interleavedChunks.push({
          sessionId: 'session-interleaved',
          planId: 'plan-concurrent-models',
          round,
          phase: round === 1 ? 'ideate' : 'critique',
          modelId,
          deltaText: `[${modelId}] Round ${round} thought fragment`,
          tokensUsedDelta: 100,
          costUsdDelta: 0.0001,
          timestamp: Date.now(),
        });
      }
    }

    await Promise.all(interleavedChunks.map(c => postJson(`${bridge.baseUrl}/api/topology/council/chunk`, c)));

    assert.equal(bridge.chunksReceived.length, 6);
    const flashChunks = bridge.chunksReceived.filter(c => c.modelId === 'gemini-3.8-flash');
    const opusChunks = bridge.chunksReceived.filter(c => c.modelId === 'claude-4.6-opus');
    const gptChunks = bridge.chunksReceived.filter(c => c.modelId === 'gpt-oss-120b');

    assert.equal(flashChunks.length, 2);
    assert.equal(opusChunks.length, 2);
    assert.equal(gptChunks.length, 2);
  } finally {
    await bridge.close();
  }
});

// ============================================================================
// Tier 4: Real-World Application Scenario
// ============================================================================

test('Debate Streaming - Full 3-Round Deliberation Lifecycle (Ideate -> Critique -> Synthesize) with 3 Models', async () => {
  const bridge = await createMockBridgeServer();
  try {
    const sessionId = `council-${Date.now()}`;
    const planId = 'distributed-cache-plan';
    const models = [
      { id: 'gemini-3.8-flash', role: 'Architect' },
      { id: 'claude-4.6-opus', role: 'Invariant Critic' },
      { id: 'gpt-oss-120b', role: 'Auditor' },
    ];

    const phases = [
      { round: 1, phase: 'ideate', text: 'Proposing tiered multi-level LRU cache with non-blocking reads.' },
      { round: 2, phase: 'critique', text: 'Critique: cache stampede vulnerability when TTL expires concurrently.' },
      { round: 3, phase: 'synthesize', text: 'Synthesis: incorporate probabilistic early expiration (XFetch algorithm).' },
    ];

    const eventsCaptured = [];
    const { req: listenerReq } = await listenToSse(`${bridge.baseUrl}/api/topology/stream`, (evt) => {
      eventsCaptured.push(evt);
    });

    await new Promise(r => setTimeout(r, 50));

    // Simulate execution of 3 deliberation rounds
    for (const p of phases) {
      for (const m of models) {
        const chunk = {
          sessionId,
          planId,
          round: p.round,
          phase: p.phase,
          modelId: m.id,
          deltaText: `[${m.role}] ${p.text}`,
          tokensUsedDelta: 300,
          costUsdDelta: 0.0005,
          timestamp: Date.now(),
          isComplete: p.round === 3 && m.id === 'gpt-oss-120b',
        };

        const res = await postJson(`${bridge.baseUrl}/api/topology/council/chunk`, chunk);
        assert.equal(res.status, 200);
      }
    }

    await new Promise(r => setTimeout(r, 100));

    assert.equal(bridge.chunksReceived.length, 9, 'Must receive 9 chunks total (3 rounds x 3 models)');
    const debateEvents = eventsCaptured.filter(e => e.type === 'council_debate_chunk');
    assert.equal(debateEvents.length, 9, 'All 9 chunks must be broadcast over SSE');

    // Verify final chunk marked complete
    const lastChunk = bridge.chunksReceived[bridge.chunksReceived.length - 1];
    assert.equal(lastChunk.isComplete, true);
    assert.equal(lastChunk.phase, 'synthesize');

    listenerReq.destroy();
  } finally {
    await bridge.close();
  }
});
