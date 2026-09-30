import test from 'node:test';
import assert from 'node:assert/strict';
import { councilOrchestrator } from '../mcp-server/councilOrchestrator.js';
import { budgetTracker } from '../mcp-server/budgetTracker.js';

import fs from 'fs';
import path from 'path';

test('CouncilOrchestrator - 1-Round Fast Consensus Deliberation', async () => {
  budgetTracker.resetBudget();
  const session = await councilOrchestrator.spawnCouncil({
    goal: 'Test 1-Round Deliberation Architecture',
    rounds: 1,
    strategy: 'halt_before_limit',
    members: ['gemini-3.8-flash', 'claude-4.6-opus'],
    constraints: ['Zero borders UI', 'Sub-second response'],
    saveAdr: true,
    handoffToPlan: true,
  });

  assert.equal(session.success, true);
  assert.equal(session.roundsDeliberated, 1);
  assert.ok(session.consensus, 'Consensus data must be present');
  assert.ok(session.consensus.dag?.length > 0, 'Consensus DAG tasks must be generated');
  assert.ok(session.totalTokensUsed > 0, 'Total tokens must be > 0');
  assert.ok(session.estimatedCostUsd >= 0, 'Cost must be non-negative');
  assert.ok(session.adr, 'ADR must be generated');
  assert.ok(session.adr.filePath, 'ADR filePath must be provided');

  // Clean up test generated ADR and session file
  if (session.adr?.filePath && fs.existsSync(session.adr.filePath)) {
    try { fs.unlinkSync(session.adr.filePath); } catch {}
  }
  const sessionFile = path.join(process.cwd(), '.topology', 'councils', `${session.id}.json`);
  if (fs.existsSync(sessionFile)) {
    try { fs.unlinkSync(sessionFile); } catch {}
  }
});

test('CouncilOrchestrator - 3-Round Full Council Deliberation', async () => {
  budgetTracker.resetBudget();
  const session = await councilOrchestrator.spawnCouncil({
    goal: 'Test Full 3-Round Architectural Deliberation',
    rounds: 3,
    strategy: 'halt_before_limit',
    members: ['gemini-3.8-flash', 'claude-4.6-opus', 'gpt-oss-120b'],
    constraints: ['Fail-open resilience'],
    saveAdr: false,
    handoffToPlan: true,
  });

  assert.equal(session.success, true);
  assert.equal(session.roundsDeliberated, 3);
  assert.ok(session.deliberationHistory.length === 3, 'Must contain 3 rounds in history');
  assert.ok(session.consensus.dag?.length >= 4, 'Should contain synthesized execution tasks');

  const sessionFile = path.join(process.cwd(), '.topology', 'councils', `${session.id}.json`);
  if (fs.existsSync(sessionFile)) {
    try { fs.unlinkSync(sessionFile); } catch {}
  }
});

test('CouncilOrchestrator - Session Query & ADR Generation', async () => {
  const sessions = councilOrchestrator.listCouncilSessions(5);
  assert.ok(Array.isArray(sessions), 'Sessions must be an array');
  assert.ok(sessions.length > 0, 'Should find recent sessions');

  const latest = sessions[0];
  const fetched = councilOrchestrator.getCouncilSession(latest.id);
  assert.ok(fetched, 'Should retrieve session by ID');
  assert.equal(fetched.id, latest.id);

  // Test ADR generation
  const adr = councilOrchestrator.generateAdrMarkdown(fetched, { saveToDisk: false });
  assert.ok(adr.markdown.includes('ADR-'), 'Markdown should include ADR header');
  assert.ok(adr.markdown.includes(fetched.goal), 'Markdown should include goal');
});
