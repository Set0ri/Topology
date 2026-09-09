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
Initializes or replaces the workflow DAG with tasks and dependencies:
```json
{
  "title": "Distributed Task Engine",
  "description": "Implement rate limiting, worker queue, and API authentication",
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
  "nodeId": "task-spec",
  "thought": "Synthesizing schema contracts and validating against zero-trust policy...",
  "toolName": "ast_analyzer"
}
```

### 3. `topology_update_node`
Update a node's progress as you make changes:
```json
{
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
  "nodeId": "gate-review",
  "notes": "Completed queue worker and token handling. Ready for supervisor security sign-off before proceeding to deployment.",
  "proposedArtifacts": ["src/services/queue.ts", "src/auth/token.ts"]
}
```

### 5. `topology_get_plan`
Read the current DAG, node states, and whether human approval has been granted:
```json
{
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
| `TOPOLOGY_ERR_SSE_DROPPED` | Real-time Sync | Browser SSE stream disconnected from dev server | Background exponential backoff auto-reconnects. UI remains interactive. |
| `TOPOLOGY_ERR_UI_RENDER_CRASH` | Frontend UI | React component error boundary caught render exception | Use 1-click "Reset to Safe Canvas" or reload state. External agents unhindered. |
| `TOPOLOGY_ERR_INTERNAL` | Internal | Uncaught exception in MCP server execution | Non-fatal result returned. Agent loop is never terminated. |

