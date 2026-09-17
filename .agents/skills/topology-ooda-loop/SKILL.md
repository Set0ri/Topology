---
name: topology-ooda-loop
description: Orchestrates iterative multi-loop OODA deliberation cycles with the multi-model council (Flash, Opus, GPT-OSS) across 9 stages. Emits real-time loop telemetry to Topology visualizer.
---

# Topology Multi-Loop OODA & Council Iteration Skill

This skill guides Antigravity agents in executing iterative, multi-loop architectural reasoning and deliberation using the **9-stage OODA Council Cycle**:

$$\text{Observe} \rightarrow \text{Understand} \rightarrow \text{Evaluate Council} \rightarrow \text{Adversarial Critique} \rightarrow \text{Member Plans} \rightarrow \text{Share \& Vote} \rightarrow \text{Iterate Plan} \rightarrow \text{Propose Plan} \rightarrow \text{Update}$$

Agents can repeat this entire cycle across multiple loops (Loop 1, Loop 2, Loop 3...) until architectural convergence is reached.

---

## The 9 Stages of the OODA Council Cycle

| Stage ID | Stage Title | Purpose & Agent Responsibilities |
|---|---|---|
| `observe` | **Observe 👁️** | Inspect the repository, read source files, identify dependencies, active state, and AST structures. |
| `understand` | **Understand 💡** | Analyze system invariants, non-functional requirements, constraints, security boundaries, and formulate the exact problem. |
| `evaluate_with_council` | **Evaluate with Council 🏛️** | Convene the multi-model council (Flash, Opus, GPT-OSS) for high-level architectural feasibility assessment. |
| `adversarial_council_evaluation` | **Adversarial Council Evaluation ⚔️** | Red-team the architecture. Identify edge cases, race conditions, memory bottlenecks, security loopholes, and cascading failures. |
| `each_member_plans` | **Each Member Plans 📝** | Each council member independently generates a distinct candidate architecture proposal (Flash: efficiency/speed, Opus: deep reasoning/invariants, GPT-OSS: adversarial safeguards). |
| `share_and_vote_on_plan` | **Share and Vote on Plan 🗳️** | Cross-model peer review. Each model scores and ranks candidate proposals (1-10 scale), synthesizing democratic alignment. |
| `iterate_on_plan` | **Iterate on Plan 🔄** | Synthesize peer feedback and address adversarial critiques. Refine proposals with concrete amendments. If convergence is low, trigger another loop! |
| `propose_plan` | **Propose Plan 📋** | Consolidate the winning architecture into a unified specification ready for DAG task creation or code mutation. |
| `update` | **Update & Execute ⚡** | Apply changes to the codebase, synthesize files, update DAG nodes in Topology, and advance execution. Set status to `converged` when final! |

---

## Emitting Loop Telemetry via MCP Tools

At each stage of an iteration cycle, emit telemetry using `topology_emit_loop_telemetry`.

### 1. Starting Loop 1: Observation
```json
{
  "planId": "distributed-task-engine",
  "loopNumber": 1,
  "totalLoops": 3,
  "stage": "observe",
  "stageName": "Observe 👁️",
  "thought": "Scanned 14 source files in src/queue and verified BullMQ connection pooling behavior.",
  "observations": [
    "Worker loop holds advisory lock for >500ms during Redis roundtrips",
    "Max listener leak detected under burst loads"
  ],
  "status": "in_progress"
}
```

### 2. Understanding Invariants
```json
{
  "planId": "distributed-task-engine",
  "loopNumber": 1,
  "totalLoops": 3,
  "stage": "understand",
  "stageName": "Understand 💡",
  "thought": "Identified core invariant: zero job loss during graceful server restarts.",
  "understandings": [
    "Redis ACK must precede lock release",
    "Worker concurrency ceiling capped at 256 parallel tasks"
  ],
  "status": "in_progress"
}
```

### 3. Evaluating with Council
```json
{
  "planId": "distributed-task-engine",
  "loopNumber": 1,
  "totalLoops": 3,
  "stage": "evaluate_with_council",
  "stageName": "Evaluate with Council 🏛️",
  "thought": "Council evaluated two fundamental models: in-memory ring buffer vs distributed stream.",
  "councilEvaluations": [
    "Ring buffer reduces p99 latency to <2ms but introduces cross-process sync overhead",
    "Stream ensures partition tolerance at the cost of network hops"
  ],
  "status": "in_progress"
}
```

### 4. Adversarial Red-Teaming
```json
{
  "planId": "distributed-task-engine",
  "loopNumber": 1,
  "totalLoops": 3,
  "stage": "adversarial_council_evaluation",
  "stageName": "Adversarial Council Evaluation ⚔️",
  "thought": "Red-team critique identified split-brain vulnerability if Redis connection drops.",
  "adversarialCritiques": [
    "Split-brain vulnerability: multiple workers can assume ownership if lease expires during long GC pause",
    "Memory leak vulnerability: unconsumed messages in ring buffer can cause OOM without hard backpressure"
  ],
  "status": "in_progress"
}
```

### 5. Candidate Member Plans
```json
{
  "planId": "distributed-task-engine",
  "loopNumber": 1,
  "totalLoops": 3,
  "stage": "each_member_plans",
  "stageName": "Each Member Plans 📝",
  "thought": "Flash, Opus, and GPT-OSS submitted 3 candidate architectures.",
  "memberPlans": [
    {
      "memberId": "gemini-3.8-flash",
      "memberName": "Gemini 3.8 Flash",
      "avatar": "⚡",
      "role": "Synthesizer",
      "proposal": "Atomic CAS index pointers with ring-buffer chunking",
      "voteScore": 9.1
    },
    {
      "memberId": "claude-4.6-opus",
      "memberName": "Claude 4.6 Opus",
      "avatar": "🧠",
      "role": "Lead Architect",
      "proposal": "Partitioned memory segments with IPC heartbeat fencing tokens",
      "voteScore": 9.6
    },
    {
      "memberId": "gpt-oss-120b",
      "memberName": "GPT-OSS (120B)",
      "avatar": "🛡️",
      "role": "Adversarial Critic",
      "proposal": "Two-phase commit fence with token lease renewal to prevent split-brain",
      "voteScore": 9.3
    }
  ],
  "status": "in_progress"
}
```

### 6. Sharing & Voting on Plans
```json
{
  "planId": "distributed-task-engine",
  "loopNumber": 1,
  "totalLoops": 3,
  "stage": "share_and_vote_on_plan",
  "stageName": "Share & Vote on Plan 🗳️",
  "thought": "Claude Opus proposal ranked #1 (9.6/10), incorporating GPT-OSS fencing token safeguard.",
  "voteSummary": "Consensus reached on Opus architecture with GPT-OSS fencing token requirement.",
  "status": "in_progress"
}
```

### 7. Iterating on the Plan (Refinements)
```json
{
  "planId": "distributed-task-engine",
  "loopNumber": 1,
  "totalLoops": 3,
  "stage": "iterate_on_plan",
  "stageName": "Iterate on Plan 🔄",
  "thought": "Refined architecture to address GC pause edge case.",
  "refinements": [
    "Added fencing token header to queue message payloads",
    "Introduced sliding window lease renewal before job execution starts"
  ],
  "status": "in_progress"
}
```

### 8. Proposing the Consolidated Plan
```json
{
  "planId": "distributed-task-engine",
  "loopNumber": 1,
  "totalLoops": 3,
  "stage": "propose_plan",
  "stageName": "Propose Plan 📋",
  "thought": "Synthesized unified 4-node execution DAG for Topology.",
  "proposedPlanSummary": "High-throughput partitioned queue with fencing token isolation and atomic backpressure.",
  "status": "in_progress"
}
```

### 9. Updating DAG & Reaching Convergence
```json
{
  "planId": "distributed-task-engine",
  "loopNumber": 1,
  "totalLoops": 1,
  "stage": "update",
  "stageName": "Update & Execute ⚡",
  "thought": "DAG tasks created and code synthesized. Architecture fully converged.",
  "updatesApplied": [
    "Created src/queue/partitionedQueue.ts",
    "Registered node-task-fencing and node-task-worker in Topology DAG"
  ],
  "metrics": {
    "consensusScorePercent": 96,
    "invariantsVerifiedCount": 5,
    "tokensUsed": 12840,
    "costUsd": 0.0425,
    "durationMs": 4200
  },
  "status": "converged"
}
```

---

## Querying Loop Progress (`topology_get_loop_telemetry`)

Inspect current loop status, active stage, and iteration history:
```json
{
  "planId": "distributed-task-engine"
}
```

---

## Zero-Dependency CLI Usage (`scripts/topology-log.mjs`)

Agents can emit or query telemetry directly from the command line:

```bash
# Emit stage telemetry
node scripts/topology-log.mjs loop \
  --plan="distributed-task-engine" \
  --loop=1 \
  --totalLoops=3 \
  --stage="observe" \
  --thought="Scanned codebase and identified zero-copy requirements"

# Inspect loop progress and history for all plans
node scripts/topology-log.mjs loops

# Inspect loop progress for a specific plan
node scripts/topology-log.mjs loops --plan="distributed-task-engine"
```

---

## Visualizer Canvas Inspection

All emitted loops and stages stream live to `http://localhost:5173`:
- **Top Bar Badge**: Shows active loop iteration count and stage (e.g. `🔄 Loop 1/3 • Understand`).
- **OODA Modal Inspector**: Clicking the badge opens the glassmorphic modal with:
  - 9-stage interactive visual cycle stepper.
  - Multi-loop timeline tabs (Loop 1, Loop 2, Loop 3...).
  - Candidate member plans grid with avatars and vote scores.
  - Detailed telemetry metrics (Consensus %, tokens, costs, duration).
