import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireLock,
  releaseLock,
  getActiveLocks,
  appendLog,
  readRecentLogs
} from '../mcp-server/gitLock.js';

test('GitLock - Atomic Lease Acquisition and Release', () => {
  const resourceKey = `test-res-${Date.now()}`;
  const agentA = 'AgentAlpha';
  const agentB = 'AgentBeta';

  // 1. Agent Alpha acquires lock
  const resA = acquireLock(resourceKey, agentA, 30, { reason: 'Testing lease' });
  assert.equal(resA.ok, true, 'Agent Alpha should acquire lock');
  assert.equal(resA.agentId, agentA);

  // 2. Agent Beta attempts to acquire same resource -> contention!
  const resB = acquireLock(resourceKey, agentB, 30, { reason: 'Conflicting task' });
  assert.equal(resB.ok, false, 'Agent Beta should encounter contention');
  assert.equal(resB.lockedBy, agentA);
  assert.ok(resB.error.includes(agentA));

  // 3. Inspect active locks
  const active = getActiveLocks();
  const found = active.find(l => l.resourceKey === resourceKey);
  assert.ok(found, 'Lock should appear in active locks');
  assert.equal(found.agentId, agentA);

  // 4. Agent Alpha releases lock
  const rel = releaseLock(resourceKey, agentA);
  assert.equal(rel.ok, true, 'Agent Alpha should release lock');

  // 5. Agent Beta can now acquire
  const resBAfter = acquireLock(resourceKey, agentB, 30);
  assert.equal(resBAfter.ok, true, 'Agent Beta should now succeed');
  releaseLock(resourceKey, agentB);
});

test('GitLock - Append-Only Execution Log', async () => {
  const testId = `test-node-${Date.now()}`;
  const entry = await appendLog({
    action: 'test_action',
    nodeId: testId,
    thought: 'Verifying WAL log append',
    agentId: 'test-agent',
    agentRole: 'Tester',
  });

  assert.ok(entry, 'Log entry should be returned');
  assert.ok(entry.id, 'Entry should have unique ID');
  assert.equal(entry.nodeId, testId);

  const recents = readRecentLogs(10);
  const found = recents.find(e => e.id === entry.id || e.nodeId === testId);
  assert.ok(found, 'Recent logs should include the newly written entry');
});
