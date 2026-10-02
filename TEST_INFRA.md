# Test Infrastructure & Specification: Topology Council & Autonomous Deliberation Upgrade

## 1. Executive Summary & Test Philosophy

This document defines the comprehensive test infrastructure for the **Topology Council & Autonomous Deliberation Upgrade**, covering:
- **Requirement R1**: Real-Time Inter-Model Debate Streaming via Server-Sent Events (SSE) and HTTP Ingress.
- **Requirement R2**: Automated Deliberation Benchmark & Consensus Confidence Scoring Engine.
- **Requirement R3**: Dynamic Quota & Cost Allocation Optimizer (<85% safety ceiling, TTR calculation, surrogate substitution).
- **Requirement R4**: Elevated Zero-Border UI Compliance & Glassmorphic Component Audit.
- **Requirement R5**: Fail-Open Architecture, Self-Cleaning Tests, and 100% E2E Pass Guarantee.

### Key Architectural Tenets:
1. **Zero External Test Dependencies**: Built exclusively upon Node.js native test runner (`node:test`) and strict assertion library (`node:assert/strict`), executing natively via `npm test` (`node --test tests/*.test.mjs`).
2. **Deterministic & Self-Cleaning**: All tests clean up temporary files, mock servers, and socket connections immediately after test completion. No persistent disk or process pollution.
3. **Progressive Testability & Fail-Open Verification**: Tests verify interface contracts, mathematical correctness, edge cases, and cross-feature interactions cleanly both during development and in production.
4. **Adversarial & Boundary Verification**: Hardened against cyclic deadlocks, streaming client socket drops, quota exhaustion, zero/empty inputs, and forbidden border styling classes.

---

## 2. Directory Layout & Test Suite Inventory

```
Topology/
├── tests/
│   ├── testHarness.mjs             # Shared test harness (mock bridge server, mocks, contract assertions, graph math)
│   ├── debateStreaming.test.mjs    # R1: SSE ingress, broadcast, phase segregation, fail-open disconnects
│   ├── benchmarkScoring.test.mjs   # R2: Constraints, robustness, consensus confidence, Tarjan/Kahn coherence
│   ├── quotaOptimizer.test.mjs     # R3: <85% ceiling, headroom, TTR, candidate rosters, surrogates, budget limits
│   ├── zeroBorderAudit.test.mjs    # R4: Automated DOM & AST zero-border utility class audit
│   ├── budgetTracker.test.mjs      # Baseline: Quota tracking, sliding 60s window, custom models
│   ├── councilOrchestrator.test.mjs# Baseline: Council rounds, ADR generation, session query
│   ├── gitLock.test.mjs            # Baseline: Advisory locking, append-only logs
│   ├── oodaLoop.test.mjs           # Baseline: OODA 9-stage sequence, loop clamping
│   └── providerClient.test.mjs     # Baseline: Model provider fallback and env resolution
├── TEST_INFRA.md                   # Complete test infrastructure specification
└── TEST_READY.md                   # Test execution verification and coverage readiness report
```

---

## 3. Four-Tier Testing Methodology

Every test suite is organized into 4 systematic tiers to ensure complete behavioral and architectural rigor:

| Tier | Focus | Scope & Criteria | Threshold |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Feature Coverage** | Primary happy-path behaviors, core API routes, calculation logic, and data schemas. | $\ge 5$ tests per feature |
| **Tier 2** | **Boundary & Corner Cases** | Zero/empty inputs, extreme values, 85% safety limits, circular dependencies, socket drops, and malformed payloads. | Full boundary coverage |
| **Tier 3** | **Cross-Feature Combinations** | Pairwise interactions: Streaming + Quotas, Benchmark Scoring + DAG Deadlocks, Surrogates + Budget Ceilings. | Multi-module interaction |
| **Tier 4** | **Real-World Scenarios** | Multi-round end-to-end deliberation sessions, budget optimization under burst load, and automated ADR generation. | Full system lifecycle |

---

## 4. Test Suite Specifications

### 4.1 Shared Test Harness (`tests/testHarness.mjs`)
Provides shared utilities and contract specifications for all test suites:
- **`createMockBridgeServer(options)`**: Ephemeral Node.js HTTP server simulating Vite's Connect middleware:
  - `GET /api/topology/stream`: SSE bus with heartbeat, client registry, and event broadcasting.
  - `POST /api/topology/council/chunk`: Ingress route receiving `CouncilDebateChunk` and broadcasting `council_debate_chunk`.
  - `GET /api/topology/council/optimize`: Quota optimization query endpoint.
  - Clean shutdown via `server.close()` and socket termination.
- **Contract Assertions**:
  - `assertValidDebateChunk(chunk)`: Validates `sessionId`, `planId`, `round`, `phase`, `modelId`, `deltaText`, `tokensUsedDelta`, `costUsdDelta`, `timestamp`.
  - `assertValidBenchmarkReport(report)`: Validates `constraintSatisfactionPct`, `adversarialResolutionScorePct`, `consensusConfidencePct`, `architecturalCoherence`, and `overallScorePct`.
  - `assertValidQuotaOptimizationResult(result)`: Validates candidate rosters, recommended roster, safety ceiling compliance (< 0.85), and projected costs.
- **Graph Algorithms for Verification**:
  - `detectCyclesTarjan(nodes, edges)`: Tarjan's strongly connected components algorithm to detect circular deadlocks.
  - `topologicalSortKahn(nodes, edges)`: Kahn's algorithm verifying valid causal execution tiers.
- **Self-Cleaning Helpers**:
  - `createTempDir(prefix)` and `cleanupTempDir(dirPath)`: Isolated disk scratch spaces for temporary test artifacts.

### 4.2 Live Debate Streaming (`tests/debateStreaming.test.mjs`)
- **Target Requirement**: R1 (Real-Time Inter-Model Debate Streaming)
- **Tiers Covered**:
  - **Tier 1**: Ingress POST accepts valid chunk; SSE broadcast dispatches `council_debate_chunk`; validates required schema; verifies phases (`ideate`, `critique`, `synthesize`); tracks sequential chunk indexing and token accumulation.
  - **Tier 2**: Empty delta text handling; zero token/cost deltas; malformed payloads return 400 Bad Request; completion chunk (`isComplete: true`) cleanly marks stream termination; burst arrival of 100 concurrent chunks without dropping frames.
  - **Tier 3**: Streaming + live budget consumption update; client socket abrupt termination / network drop handled without crashing orchestrator (fail-open); multi-model concurrent chunk interleaving without state collisions.
  - **Tier 4**: Full 3-round simulated multi-model deliberation stream (Round 1 Ideation ➔ Round 2 Critique ➔ Round 3 Synthesis) with complete transcript assembly and token auditing.

### 4.3 Automated Benchmark Scoring (`tests/benchmarkScoring.test.mjs`)
- **Target Requirement**: R2 (Automated Benchmark & Consensus Confidence Scoring)
- **Tiers Covered**:
  - **Tier 1**: Constraint Satisfaction scoring (% non-negotiable constraints met); Adversarial Robustness scoring (% peer critiques resolved); Consensus Confidence normalized scoring (0–100%); Architectural Coherence validation (Tarjan/Kahn); composite score & status classification (`OPTIMAL`, `VIABLE`, `NEEDS_REFINEMENT`).
  - **Tier 2**: Empty constraints returns 100% unconstrained pass; violated constraints severely penalize score; circular dependency (A ➔ B ➔ C ➔ A) triggers `hasCycle: true` and 50% coherence penalty; disconnected orphan nodes penalized; missing terminal milestone flagged; single-round scoring.
  - **Tier 3**: Scoring + DAG Deadlocks (cycle presence fails coherence gate and drops overall score below 75%); Scoring + Custom Constraint Keywords matching; Scoring + ADR scorecard generation.
  - **Tier 4**: Complete deliberation benchmark evaluation of multi-model council session with verified 0-deadlock DAG, constraint verification, critique resolution, and markdown scorecard export.

### 4.4 Dynamic Quota & Cost Allocation Optimizer (`tests/quotaOptimizer.test.mjs`)
- **Target Requirement**: R3 (Dynamic Quota & Cost Allocation Optimizer)
- **Tiers Covered**:
  - **Tier 1**: Safe headroom calculation ($H_{\text{rpm}}$, $H_{\text{tpm}}$, $H_{\text{daily}}$, $H_{\text{effective}}$); strict < 85% safety ceiling enforcement (`SAFETY_STOP_THRESHOLD = 0.85`); candidate roster generation; recommended roster selection with suitability score; strategy evaluation (`balanced`, `cost_optimized`, `max_performance`, `quota_preserving`).
  - **Tier 2**: Target USD budget enforcement ($0.05, $0.10, $0.50); model in active throttle cooldown ($TTR > 0$); round scaling (1 round vs 3 rounds); zero headroom model marked `safety_stopped`; zero/negative budget resilience.
  - **Tier 3**: Surrogate substitution when primary model exceeds 85% ceiling (e.g. Claude Opus ➔ DeepSeek V3 / GPT-OSS 120b); surrogate substitution respecting USD budget ceiling; dynamic custom model inclusion in candidate rosters.
  - **Tier 4**: Deliberation burst scenario: simulating sequential council runs where primary models approach capacity, optimizer auto-suggests optimal surrogate roster, preventing quota breach.

### 4.5 Zero-Border UI & Elevated Styling Audit (`tests/zeroBorderAudit.test.mjs`)
- **Target Requirement**: R4 (Elevated Zero-Border UI & Live Debate Monitor) & User Global Rules
- **Tiers Covered**:
  - **Tier 1**: Scans all `.tsx` and `.jsx` files in `src/components/council/` and modal components; parses `className` and `class` attributes; validates permitted `border-none` and `border-0`; audits inline `style` objects.
  - **Tier 2**: Negative boundary checks: regex correctly discriminates `border-none` from forbidden border classes (e.g. `border-slate-700`, `border-2`, `border-b`); checks arbitrary value borders (e.g. `border-[1px]`); checks Catppuccin color borders.
  - **Tier 3**: Multi-directory scan across council components and shared cards; asserts presence of required elevated styling (`backdrop-blur-*`, `shadow-*`, `rounded-*`).
  - **Tier 4**: Full workspace council component audit: asserts 0 total border utility violations across all council monitor components.

---

## 5. Verification Commands

To run all test suites natively:
```bash
# Execute entire test suite
npm test

# Run specific test suite
node --test tests/debateStreaming.test.mjs
node --test tests/benchmarkScoring.test.mjs
node --test tests/quotaOptimizer.test.mjs
node --test tests/zeroBorderAudit.test.mjs

# Verify TypeScript compilation
npx tsc -b

# Verify production bundle build
npm run build
```

---

## 6. Self-Cleaning & Isolation Guarantees

1. **Port Isolation**: All network tests use dynamic port assignment (`port: 0`), preventing port clashes or `EADDRINUSE` errors during parallel test execution.
2. **Filesystem Isolation**: Tests that write temporary council sessions or ADRs use dedicated temporary files and clean them up in `after()` or `finally` blocks.
3. **Budget State Isolation**: Tests that modify model quotas invoke `budgetTracker.resetBudget()` before and after execution to prevent state leakage into subsequent tests.
