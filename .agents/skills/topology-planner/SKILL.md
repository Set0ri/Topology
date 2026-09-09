---
name: topology-planner
description: Creates, manages, and updates visual DAG workflows and task plans in Topology. Use whenever planning multi-step architectures, running autonomous background tasks, streaming live progress thoughts, or requesting human-in-the-loop review.
---

# Topology Visual DAG Planner Skill

This skill teaches Antigravity agents how to use the **Topology Visual Planner** to structure multi-step workflows into dependency graphs, stream live reasoning thoughts to the user's canvas, and pause safely at human-in-the-loop review gates.

---

## When to Use This Skill

- Whenever the user asks you to build, refactor, or orchestrate a multi-step task or project.
- To provide the user with a live visual dashboard at `http://localhost:5173` showing what you are doing.
- To stream your live reasoning thoughts and active tools onto interactive cards.
- When an execution step requires human sign-off before making breaking changes.

---

## Available MCP Tools

When the Topology MCP server is configured in `mcp_config.json`, you have access to the following tools:

### 1. `topology_create_plan`
Initializes or replaces a workflow DAG with tasks and dependencies. Pass `planId`, `agentId`, and `agentRole` to create an isolated graph that runs alongside other agents' graphs without collisions:
```json
{
  "planId": "distributed-task-engine",
  "agentId": "agent-sage",
  "agentRole": "Architect",
  "title": "Distributed Task Engine",
  "description": "Implement rate limiting, worker queue, and API authentication",
  "makeActive": true,
  "nodes": [
    {
      "id": "task-spec",
      "label": "API Contracts & Schema",
      "type": "task",
      "role": "Architect",
      "description": "Define TypeScript schemas and invariant validation rules",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "id": "task-impl",
      "label": "Queue Worker Implementation",
      "type": "task",
      "role": "CodeGenerator",
      "description": "Implement BullMQ worker process",
      "status": "pending",
      "priority": "medium"
    },
    {
      "id": "gate-review",
      "label": "Supervisor Security Audit",
      "type": "decision",
      "role": "SecurityAnalyst",
      "description": "Human operator verification of token secret isolation",
      "status": "pending",
      "priority": "critical",
      "requiresApproval": true
    },
    {
      "id": "task-ship",
      "label": "Production Canary Deploy",
      "type": "milestone",
      "role": "Synthesizer",
      "status": "pending",
      "priority": "critical"
    }
  ],
  "edges": [
    { "source": "task-spec", "target": "task-impl", "label": "contracts" },
    { "source": "task-impl", "target": "gate-review", "label": "audit" },
    { "source": "gate-review", "target": "task-ship", "label": "deploy" }
  ]
}
```

### 2. `topology_emit_thought`
Stream your live reasoning thoughts to the node card in real-time while you work:
```json
{
  "planId": "distributed-task-engine",
  "nodeId": "task-spec",
  "thought": "Synthesizing schema contracts and validating against zero-trust policy...",
  "toolName": "ast_analyzer"
}
```

### 3. `topology_update_node`
Update a node's progress as you make changes:
```json
{
  "planId": "distributed-task-engine",
  "nodeId": "task-spec",
  "status": "completed",
  "outputArtifacts": ["src/types/contract.ts"],
  "terminalLog": "[00:03] Schema validation passed: 0 regressions found."
}
```

### 4. `topology_request_approval`
Pause execution at a Human-in-the-Loop review gate and await supervisor sign-off:
```json
{
  "planId": "distributed-task-engine",
  "nodeId": "gate-review",
  "notes": "Completed queue worker and token handling. Ready for supervisor security sign-off before proceeding to deployment.",
  "proposedArtifacts": ["src/services/queue.ts", "src/auth/token.ts"]
}
```

### 5. `topology_list_plans`
List all running agent plans and workflows currently registered on the Topology server:
```json
{}
```

### 6. `topology_switch_plan`
Switch the visible canvas plan to another registered plan ID:
```json
{
  "planId": "distributed-task-engine"
}
```

### 7. `topology_get_plan`
Read a specific plan or the active plan, node states, and approval statuses:
```json
{
  "planId": "distributed-task-engine",
  "includeApprovals": true
}
```

### 6. `topology_write_shared_context`
Write shared contracts, schemas, invariants, or intermediate state to the dual-tier blackboard repository:
```json
{
  "scope": "global",
  "key": "system_architecture",
  "value": {
    "version": "2.0.0",
    "strictIsolation": true,
    "invariants": ["zero cycles", "immutable payloads"]
  },
  "authorAgentRole": "Architect"
}
```
Or scope it directly to a specific node:
```json
{
  "scope": "node",
  "nodeId": "task-spec",
  "key": "validated_schema",
  "value": { "endpoints": ["/api/users", "/api/tasks"] },
  "authorAgentRole": "Architect"
}
```

### 7. `topology_read_shared_context`
Read shared context entries written by other agents or by the human supervisor:
```json
{
  "scope": "global",
  "key": "system_architecture"
}
```

### 8. `topology_acquire_lock`
Acquire a process-safe advisory lease on a node or shared resource to prevent race conditions:
```json
{
  "resource": "node:task-spec",
  "agentId": "agent-worker-1",
  "agentName": "CodeGenerator",
  "ttlSeconds": 30
}
```

### 9. `topology_release_lock`
Release an advisory lease when finishing work on a node or resource:
```json
{
  "resource": "node:task-spec",
  "agentId": "agent-worker-1"
}
```

### 10. `topology_log_event`
Append an immutable JSONL event directly to `.topology/topology.log`:
```json
{
  "action": "checkpoint_created",
  "nodeId": "task-spec",
  "agentId": "agent-worker-1",
  "status": "completed",
  "details": { "testsPassed": 42 }
}
```

### 11. `topology_sync_git_log`
Synchronize `.topology/topology.log` across Git branches and remotes using rebase and push:
```json
{
  "commitMessage": "topology: sync agent execution log",
  "push": true
}
```

### 12. `topology_ensure_server`
Verify and auto-start the Topology visualizer dev server in the background:
```json
{
  "port": 5173
}
```

---

## Standalone Zero-Dependency CLI (`scripts/topology-log.mjs`)

Agents without direct MCP access can run commands from the project root:
```bash
# Ensure visualizer server is running on http://localhost:5173 (auto-starts if offline)
node scripts/topology-log.mjs server

# List all active agent workflow plans
node scripts/topology-log.mjs plans

# Switch active visible canvas plan
node scripts/topology-log.mjs switch distributed-task-engine

# Acquire advisory lease
node scripts/topology-log.mjs lock node:task-spec --agent="AgentA" --ttl=30

# Append execution log entry / update node in a specific plan
node scripts/topology-log.mjs log --action="node_updated" --plan="distributed-task-engine" --nodeId="task-spec" --status="in_progress"

# View active advisory leases
node scripts/topology-log.mjs locks

# Release advisory lease
node scripts/topology-log.mjs unlock node:task-spec --agent="AgentA"

# Pull rebase & push to remote repository
node scripts/topology-log.mjs sync --push
```

---

## Fallback: Direct HTTP / File Sync

If MCP is temporarily unavailable, you can also send direct HTTP updates:
```bash
# Create plan
curl -X POST http://localhost:5173/api/topology/plan \
  -H "Content-Type: application/json" \
  -d '{"title":"My Plan","nodes":[{"id":"step1","label":"Initial Step"}],"edges":[]}'

# Update node status
curl -X POST http://localhost:5173/api/topology/node \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"step1","status":"completed","thought":"Finished step 1"}'
```
Or write directly to `.topology/plan.json` using `write_to_file`.

---

## Non-Critical Infrastructure & Standard Error Codes

Topology operates strictly as a **visualization and observability companion**. It is NEVER a critical dependency for agent execution. If the dev server is stopped, or any tool returns an error code, agents must treat the tool call as non-fatal and proceed with their tasks.

### Error Codes Taxonomy (`TOPOLOGY_ERR_*`)

| Error Code | Category | Meaning | Agent Action |
|---|---|---|---|
| `TOPOLOGY_ERR_BRIDGE_OFFLINE` | Infrastructure | Web bridge at `http://localhost:5173` is not reachable | State is safely saved to `.topology/` on disk. **Do not halt.** Continue execution normally. |
| `TOPOLOGY_ERR_BRIDGE_TIMEOUT` | Network | Request to bridge exceeded 1500ms timeout | State is safely preserved on disk. **Do not retry endlessly.** Proceed with work. |
| `TOPOLOGY_ERR_CACHE_IO_FAILED` | Filesystem | Error reading/writing to `.topology/` directory | In-memory fallback engaged. Proceed with work. |
| `TOPOLOGY_ERR_INVALID_SCHEMA` | Validation | Missing or malformed parameters passed to tool | Tool supplies default values and reports warning. Proceed with valid inputs. |
| `TOPOLOGY_ERR_GATE_UNATTENDED` | HITL Review | Review gate triggered while supervisor UI is offline | **Do not deadlock.** Prompt supervisor in chat, or proceed autonomously if safe. |
| `TOPOLOGY_ERR_LOCK_CONTENTION` | Concurrency | Another agent currently holds an active lease | Backoff and retry, or work on an unlocked node. Leases auto-expire via TTL. |
| `TOPOLOGY_ERR_SSE_DROPPED` | Real-time Sync | Browser SSE stream disconnected from dev server | Background exponential backoff auto-reconnects. UI remains interactive. |
| `TOPOLOGY_ERR_UI_RENDER_CRASH` | Frontend UI | React component error boundary caught render exception | Use 1-click "Reset to Safe Canvas" or reload state. External agents unhindered. |
| `TOPOLOGY_ERR_INTERNAL` | Internal | Uncaught exception in MCP server execution | Non-fatal result returned. Agent loop is never terminated. |


