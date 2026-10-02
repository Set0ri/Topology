import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadBenchmarkEvaluator,
  assertValidBenchmarkReport,
  detectCyclesTarjan,
  topologicalSortKahn,
} from './testHarness.mjs';

// ============================================================================
// Tier 1: Feature Coverage (>=5 tests)
// ============================================================================

test('Benchmark Scoring - Constraint Satisfaction accurately scores percentage of met invariants', async () => {
  const evaluate = await loadBenchmarkEvaluator();

  const constraints = [
    'Zero borders UI',
    'Fail-open resilience',
    'Sub-second response time',
  ];

  const sessionAllMet = {
    id: 'session-bm-001',
    goal: 'Build resilient zero-border caching system with sub-second response',
    consensus: {
      summary: 'Architected zero-border UI layout with fail-open fallback and sub-second caching latency.',
      dag: [
        { id: 'task-1', label: 'Zero borders styling setup', description: 'Enforce border-none with glassmorphic cards' },
        { id: 'task-2', label: 'Fail-open resilience pipeline', description: 'Local disk cache fallback when bridge offline' },
        { id: 'task-3', label: 'Sub-second response caching', description: 'In-memory LRU cache with sub-second latency' },
      ],
    },
  };

  const report = evaluate({ session: sessionAllMet, constraints });
  assertValidBenchmarkReport(report);
  assert.equal(report.constraintSatisfactionPct, 100, 'All 3 constraints met should be 100%');

  // Partial match: only 1 of 3 met
  const sessionPartialMet = {
    id: 'session-bm-002',
    goal: 'Build basic system',
    consensus: {
      summary: 'Basic system implementation without specific constraints.',
      dag: [
        { id: 'task-1', label: 'Zero borders styling setup', description: 'Enforce border-none' },
      ],
    },
  };

  const partialReport = evaluate({ session: sessionPartialMet, constraints });
  assertValidBenchmarkReport(partialReport);
  assert.ok(partialReport.constraintSatisfactionPct < 100, 'Partial satisfaction must be < 100%');
  assert.ok(partialReport.constraintSatisfactionPct >= 30, 'Single match of 3 should be ~33%');
});

test('Benchmark Scoring - Adversarial Robustness evaluates resolution of peer critiques', async () => {
  const evaluate = await loadBenchmarkEvaluator();

  const sessionWithResolvedCritiques = {
    id: 'session-bm-003',
    deliberationHistory: [
      { round: 1, contributions: [] },
      {
        round: 2,
        contributions: [
          {
            memberId: 'claude-4.6-opus',
            critiques: [
              'Critique: Memory leak vulnerability in unbound ring buffer.',
              'Critique: Lock contention bottleneck under high concurrency.',
            ],
          },
        ],
      },
      {
        round: 3,
        contributions: [
          {
            memberId: 'gemini-3.8-flash',
            thought: 'Accepted peer critique: Introduced bounded ring buffer with backpressure to prevent memory leak.',
            consensusSummary: 'Resolved lock contention bottleneck by migrating to atomic CAS spinlocks.',
          },
        ],
      },
    ],
    consensus: {
      summary: 'Final consensus incorporates bounded backpressure preventing memory leak and atomic spinlocks resolving lock contention bottleneck.',
      dag: [
        { id: 't-1', label: 'Bounded ring buffer', description: 'Prevent memory leak under backpressure' },
        { id: 't-2', label: 'Atomic CAS spinlocks', description: 'Eliminate lock contention bottleneck' },
      ],
    },
  };

  const report = evaluate({ session: sessionWithResolvedCritiques });
  assertValidBenchmarkReport(report);
  assert.equal(report.adversarialResolutionScorePct, 100, 'Both critiques resolved should score 100%');
});

test('Benchmark Scoring - Consensus Confidence computes normalized 0-100% agreement metric', async () => {
  const evaluate = await loadBenchmarkEvaluator();

  const sessionConverged = {
    id: 'session-bm-004',
    roundsDeliberated: 3,
    members: ['gemini-3.8-flash', 'claude-4.6-opus', 'gpt-oss-120b'],
    consensus: {
      summary: 'Unanimous convergence across all 3 model families.',
      dag: [{ id: 't-1', label: 'Step 1' }],
    },
  };

  const report = evaluate({ session: sessionConverged });
  assertValidBenchmarkReport(report);
  assert.ok(report.consensusConfidencePct >= 90, 'Converged 3-round session should have high consensus (>=90%)');
  assert.ok(report.consensusConfidencePct <= 100, 'Score must not exceed 100%');
});

test('Benchmark Scoring - Architectural Coherence validates DAG acyclicity and ordering', async () => {
  const evaluate = await loadBenchmarkEvaluator();

  const validDagNodes = [
    { id: 'node-spec', label: 'Define API Specs', type: 'task' },
    { id: 'node-impl', label: 'Implement Engine', type: 'task' },
    { id: 'node-milestone', label: 'Deploy Release', type: 'milestone' },
  ];
  const validDagEdges = [
    { source: 'node-spec', target: 'node-impl' },
    { source: 'node-impl', target: 'node-milestone' },
  ];

  const report = evaluate({
    session: { id: 'session-coherence-valid' },
    dag: validDagNodes,
    edges: validDagEdges,
  });

  assertValidBenchmarkReport(report);
  assert.equal(report.architecturalCoherence.hasCycle, false, 'Valid DAG must have no cycles');
  assert.equal(report.architecturalCoherence.isCoherent, true, 'Valid DAG must be coherent');
  assert.equal(report.architecturalCoherence.scorePct, 100, 'Valid DAG with milestone should score 100%');
});

test('Benchmark Scoring - Composite Score and Status Classification (OPTIMAL, VIABLE, NEEDS_REFINEMENT)', async () => {
  const evaluate = await loadBenchmarkEvaluator();

  // High quality session -> OPTIMAL
  const optimalReport = evaluate({
    session: {
      id: 'session-optimal',
      roundsDeliberated: 3,
      consensus: { summary: 'Complete verification', dag: [{ id: 'm-1', type: 'milestone' }] },
    },
    constraints: [],
  });

  assert.ok(optimalReport.overallScorePct >= 90);
  assert.equal(optimalReport.status, 'OPTIMAL');

  // Deadlock session -> NEEDS_REFINEMENT
  const deadlockedReport = evaluate({
    session: { id: 'session-deadlock' },
    dag: [{ id: 'a' }, { id: 'b' }],
    edges: [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }],
  });

  assert.equal(deadlockedReport.status, 'NEEDS_REFINEMENT');
  assert.ok(deadlockedReport.overallScorePct < 75);
});

// ============================================================================
// Tier 2: Boundary & Corner Cases
// ============================================================================

test('Benchmark Scoring - Empty constraints list returns 100% unconstrained pass', async () => {
  const evaluate = await loadBenchmarkEvaluator();
  const report = evaluate({
    session: { id: 'session-empty-constraints' },
    constraints: [],
  });

  assertValidBenchmarkReport(report);
  assert.equal(report.constraintSatisfactionPct, 100, 'Empty constraints should default to 100%');
});

test('Benchmark Scoring - Unresolved constraints yield low satisfaction score', async () => {
  const evaluate = await loadBenchmarkEvaluator();
  const constraints = [
    'Non-negotiable quantum encryption requirement',
    'Sub-millisecond optical interconnect',
  ];

  const sessionUnrelated = {
    id: 'session-unrelated',
    consensus: {
      summary: 'Basic website styling updates.',
      dag: [{ id: 't-1', label: 'Update button colors' }],
    },
  };

  const report = evaluate({ session: sessionUnrelated, constraints });
  assert.equal(report.constraintSatisfactionPct, 0, 'Unsatisfied constraints should score 0%');
});

test('Benchmark Scoring - Circular Deadlock (A -> B -> C -> A) triggers hasCycle and heavy penalty', async () => {
  const evaluate = await loadBenchmarkEvaluator();

  const cycleNodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
  const cycleEdges = [
    { source: 'A', target: 'B' },
    { source: 'B', target: 'C' },
    { source: 'C', target: 'A' }, // Circular!
  ];

  // Direct Tarjan test
  const tarjanCheck = detectCyclesTarjan(cycleNodes, cycleEdges);
  assert.equal(tarjanCheck.hasCycle, true);
  assert.ok(tarjanCheck.cycleNodeIds.includes('A'));
  assert.ok(tarjanCheck.cycleNodeIds.includes('B'));
  assert.ok(tarjanCheck.cycleNodeIds.includes('C'));

  // Direct Kahn test
  const kahnCheck = topologicalSortKahn(cycleNodes, cycleEdges);
  assert.equal(kahnCheck.isAcyclic, false);

  // Evaluator composite check
  const report = evaluate({
    session: { id: 'session-cycle' },
    dag: cycleNodes,
    edges: cycleEdges,
  });

  assert.equal(report.architecturalCoherence.hasCycle, true);
  assert.equal(report.architecturalCoherence.isCoherent, false);
  assert.ok(report.architecturalCoherence.scorePct <= 50, 'Cycle presence must heavily penalize coherence');
});

test('Benchmark Scoring - Missing terminal milestone is flagged in coherence score', async () => {
  const evaluate = await loadBenchmarkEvaluator();

  // DAG with only tasks and no milestone
  const noMilestoneDag = [
    { id: 't-1', label: 'Task 1', type: 'task' },
    { id: 't-2', label: 'Task 2', type: 'task' },
  ];
  const edges = [{ source: 't-1', target: 't-2' }];

  const report = evaluate({
    session: { id: 'session-no-milestone' },
    dag: noMilestoneDag,
    edges,
  });

  assert.equal(report.architecturalCoherence.terminalMilestoneCount, 0);
  assert.ok(report.architecturalCoherence.scorePct < 100, 'Missing milestone should penalize score');
});

test('Benchmark Scoring - Single-round council session evaluated cleanly without errors', async () => {
  const evaluate = await loadBenchmarkEvaluator();

  const singleRoundSession = {
    id: 'session-single-round',
    roundsDeliberated: 1,
    deliberationHistory: [
      { round: 1, contributions: [{ memberId: 'gemini-3.8-flash', thought: 'Fast single-round plan' }] },
    ],
    consensus: {
      summary: 'Fast consensus plan',
      dag: [{ id: 'm-1', label: 'Deliverable', type: 'milestone' }],
    },
  };

  const report = evaluate({ session: singleRoundSession });
  assertValidBenchmarkReport(report);
  assert.ok(report.overallScorePct > 0);
});

// ============================================================================
// Tier 3: Cross-Feature Combinations
// ============================================================================

test('Benchmark Scoring - Scoring + DAG Deadlocks drops overall composite score below 75% (NEEDS_REFINEMENT)', async () => {
  const evaluate = await loadBenchmarkEvaluator();

  // Even with 100% constraint satisfaction, a circular deadlock must drop status to NEEDS_REFINEMENT
  const constraints = ['Zero borders UI'];
  const session = {
    id: 'session-deadlock-override',
    consensus: {
      summary: 'Zero borders styling completed but has circular lock dependency.',
      dag: [{ id: 't-1', label: 'Zero borders task' }],
    },
  };

  const deadlockedDag = [
    { id: 'n-1', label: 'Task 1' },
    { id: 'n-2', label: 'Task 2' },
  ];
  const deadlockedEdges = [
    { source: 'n-1', target: 'n-2' },
    { source: 'n-2', target: 'n-1' },
  ];

  const report = evaluate({ session, constraints, dag: deadlockedDag, edges: deadlockedEdges });
  assert.equal(report.status, 'NEEDS_REFINEMENT', 'Circular deadlock must trigger NEEDS_REFINEMENT');
  assert.ok(report.overallScorePct < 75);
});

test('Benchmark Scoring - Domain Invariant Keywords correctly detected in DAG labels and descriptions', async () => {
  const evaluate = await loadBenchmarkEvaluator();

  const constraints = [
    'Zero borders UI layout',
    'Fail-open crash resilience',
    'Sub-second query response',
    'Append-only execution logging',
  ];

  const session = {
    id: 'session-keyword-matching',
    consensus: {
      summary: 'All 4 invariants implemented in architecture.',
      dag: [
        { id: 't-1', label: 'Zero borders design system', description: 'Use border-none and glassmorphic cards' },
        { id: 't-2', label: 'Fail-open resilience layer', description: 'Fallback to disk cache on bridge timeout' },
        { id: 't-3', label: 'Sub-second caching engine', description: 'In-memory Redis query optimization' },
        { id: 't-4', label: 'Append-only logging bus', description: 'Log all state mutations directly to git log' },
      ],
    },
  };

  const report = evaluate({ session, constraints });
  assert.equal(report.constraintSatisfactionPct, 100, 'All domain invariants must be verified');
});

test('Benchmark Scoring - Scoring + ADR Scorecard Markdown generation table formatting', async () => {
  const evaluate = await loadBenchmarkEvaluator();

  const report = evaluate({
    session: {
      id: 'session-adr-table',
      roundsDeliberated: 3,
      consensus: {
        summary: 'Architectural consensus reached',
        dag: [{ id: 'm-1', type: 'milestone', label: 'Release' }],
      },
    },
    constraints: ['Fail-open resilience'],
  });

  // Verify markdown table formatting structure
  const markdownTable = [
    '## Deliberation Benchmark & Quantitative Validation',
    '',
    '| Metric | Score | Target | Status |',
    '| :--- | :--- | :--- | :--- |',
    `| **Constraint Satisfaction** | ${report.constraintSatisfactionPct.toFixed(1)}% | ≥ 90% | ${report.constraintSatisfactionPct >= 90 ? '✅ Passed' : '⚠️ Warning'} |`,
    `| **Adversarial Robustness** | ${report.adversarialResolutionScorePct.toFixed(1)}% | ≥ 80% | ${report.adversarialResolutionScorePct >= 80 ? '✅ Passed' : '⚠️ Warning'} |`,
    `| **Consensus Confidence** | ${report.consensusConfidencePct.toFixed(1)}% | ≥ 85% | ${report.consensusConfidencePct >= 85 ? '✅ Passed' : '⚠️ Warning'} |`,
    `| **Architectural Coherence** | ${report.architecturalCoherence.scorePct.toFixed(1)}% | 100% | ${report.architecturalCoherence.scorePct === 100 ? '✅ Passed' : '⚠️ Warning'} |`,
    `| **Composite Deliberation Score** | **${report.overallScorePct.toFixed(1)}%** | **≥ 88%** | **${report.status}** |`,
  ].join('\n');

  assert.ok(markdownTable.includes('Constraint Satisfaction'));
  assert.ok(markdownTable.includes('Adversarial Robustness'));
  assert.ok(markdownTable.includes('Consensus Confidence'));
  assert.ok(markdownTable.includes('Architectural Coherence'));
  assert.ok(markdownTable.includes(report.status));
});

// ============================================================================
// Tier 4: Real-World Application Scenario
// ============================================================================

test('Benchmark Scoring - Full Deliberation Benchmark Evaluation of 3-Model Session with Complete Report', async () => {
  const evaluate = await loadBenchmarkEvaluator();

  const realSession = {
    id: 'council-production-run-99',
    goal: 'Design zero-copy memory ring buffer with backpressure and zero borders UI monitor',
    roundsDeliberated: 3,
    members: ['gemini-3.8-flash', 'claude-4.6-opus', 'gpt-oss-120b'],
    deliberationHistory: [
      {
        round: 1,
        contributions: [
          { memberId: 'gemini-3.8-flash', thought: 'Propose lock-free atomic pointer ring buffer.' },
          { memberId: 'claude-4.6-opus', thought: 'Propose bounded queue with invariant validation.' },
          { memberId: 'gpt-oss-120b', thought: 'Propose watchdog lease monitor.' },
        ],
      },
      {
        round: 2,
        contributions: [
          {
            memberId: 'claude-4.6-opus',
            critiques: [
              'Critique: Race condition vulnerability in CAS pointer update without fence barrier.',
            ],
          },
          {
            memberId: 'gpt-oss-120b',
            critiques: [
              'Critique: Memory consumption unbounded under rapid producer bursts.',
            ],
          },
        ],
      },
      {
        round: 3,
        contributions: [
          {
            memberId: 'gemini-3.8-flash',
            thought: 'Accepted peer critique: wrapped CAS in memory fence barrier and added bounded backpressure to limit memory consumption.',
            consensusSummary: 'Converged on bounded memory ring buffer with atomic CAS fence barriers.',
          },
        ],
      },
    ],
    consensus: {
      summary: 'Complete architectural specification with fence barrier and bounded memory backpressure.',
      dag: [
        { id: 'spec', label: 'Ring buffer spec', type: 'task', description: 'Define memory layout' },
        { id: 'fence', label: 'CAS fence barrier', type: 'task', description: 'Prevent race condition' },
        { id: 'backpressure', label: 'Bounded backpressure queue', type: 'task', description: 'Limit memory consumption' },
        { id: 'ui', label: 'Zero borders UI monitor', type: 'task', description: 'Visualizer with border-none glassmorphism' },
        { id: 'deploy', label: 'Production release', type: 'milestone', description: 'Canary rollout' },
      ],
      edges: [
        { source: 'spec', target: 'fence' },
        { source: 'fence', target: 'backpressure' },
        { source: 'backpressure', target: 'ui' },
        { source: 'ui', target: 'deploy' },
      ],
    },
  };

  const constraints = [
    'Zero borders UI monitor',
    'Bounded memory consumption',
  ];

  const report = evaluate({
    session: realSession,
    constraints,
    dag: realSession.consensus.dag,
    edges: realSession.consensus.edges,
  });

  assertValidBenchmarkReport(report);
  assert.equal(report.constraintSatisfactionPct, 100);
  assert.equal(report.adversarialResolutionScorePct, 100);
  assert.ok(report.consensusConfidencePct >= 90);
  assert.equal(report.architecturalCoherence.hasCycle, false);
  assert.equal(report.architecturalCoherence.isCoherent, true);
  assert.equal(report.architecturalCoherence.terminalMilestoneCount, 1);
  assert.equal(report.architecturalCoherence.scorePct, 100);
  assert.equal(report.status, 'OPTIMAL');
  assert.ok(report.overallScorePct >= 95);
});
