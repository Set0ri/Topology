# Agent Collaboration Guidelines for Topology

Whenever executing multi-step projects, complex architectures, or long-running refactors:
1. **Auto-Started Visualizer**: Topology MCP tools automatically start the visualizer dev server in the background on http://localhost:5173 if currently offline (with single-instance locking). You can also explicitly call `topology_ensure_server` (or `node scripts/topology-log.mjs server`).
2. **Multi-Plan Fleet Execution**: Each agent can register its own dedicated plan by passing `planId`, `agentId`, and `agentRole` to `topology_create_plan`. Multiple agents run concurrent graphs side-by-side on the same server without clashing.
3. **Initialize the Plan in Topology**: Call `topology_create_plan` with decomposed nodes and causal dependency edges so the user can visualize progress on http://localhost:5173.
4. **Stream Live Reasoning**: Before executing significant actions or tools, emit your active thought using `topology_emit_thought` (or `topology_update_node`). Include your `planId` and `agentRole`.
5. **Report Status Continuously**: When starting work on a task, set `status: "in_progress"`; when finishing, set `status: "completed"` and pass output artifacts.
6. **Switch & Inspect Plans**: List active plans across all agents with `topology_list_plans` (or `node scripts/topology-log.mjs plans`). Switch the displayed canvas plan using `topology_switch_plan` (or `node scripts/topology-log.mjs switch <planId>`).
7. **Human-in-the-Loop Review Gates**: If a step requires user verification or breaking change sign-off, invoke `topology_request_approval`. The user can inspect the canvas and approve it directly to unblock execution.
8. **Shared Blackboard Knowledge**: For cross-agent coordination, write architectural decisions, DB schemas, or contracts to `topology_write_shared_context`, and read them with `topology_read_shared_context`.
9. **Local Advisory Locking**: When modifying shared resources or taking ownership of a node, acquire a process-safe advisory lease using `topology_acquire_lock` (or `node scripts/topology-log.mjs lock <resource>`). Release it upon task completion with `topology_release_lock`.
10. **Append-Only Execution Logging**: All actions automatically write to `.topology/topology.log`. Custom progress events or checkpoints can be appended directly via `topology_log_event`.
11. **Distributed Git Synchronization**: For multi-agent workflows spanning branches or remotes, sync state using `topology_sync_git_log` or `node scripts/topology-log.mjs sync --push`.

## Non-Critical Infrastructure & Fail-Safe Execution

Topology is strictly an **observability and orchestration companion**, NOT a critical piece of operational infrastructure.
- **Fail-Open Resilience**: If http://localhost:5173 is offline, ports are busy, or requests fail, Topology tools will never throw fatal errors or crash your agent execution. State is safely cached to `.topology/` on disk.
- **Never Block on Observability**: If an error notice or code (e.g. `TOPOLOGY_ERR_BRIDGE_OFFLINE`) is returned, your core coding and task execution remains 100% unblocked. Continue implementing the task.
- **Deadlock Safeguard at Review Gates (`TOPOLOGY_ERR_GATE_UNATTENDED`)**: If `topology_request_approval` returns unattended/offline status, do NOT hang indefinitely. Prompt the supervisor directly in your conversation chat to approve, or proceed autonomously if safe.
- **Lock Lease Expiration**: All advisory locks are lease-based (`ttlSeconds`, default 30s). If an agent crashes or disconnects without releasing, the lock expires automatically—preventing permanent deadlocks.

### Standard Error Codes (`TOPOLOGY_ERR_*`)
- `TOPOLOGY_ERR_BRIDGE_OFFLINE`: Dev server/bridge is offline; state cached to `.topology/`. Proceed normally.
- `TOPOLOGY_ERR_BRIDGE_TIMEOUT`: Bridge request exceeded 1500ms threshold; cached to disk. Proceed normally.
- `TOPOLOGY_ERR_CACHE_IO_FAILED`: Disk IO error in `.topology/`; runs in-memory fallback.
- `TOPOLOGY_ERR_INVALID_SCHEMA`: Malformed parameters; defaulted automatically to keep execution unblocked.
- `TOPOLOGY_ERR_GATE_UNATTENDED`: HITL review gate opened while UI is offline; prompt user in chat to approve.
- `TOPOLOGY_ERR_LOCK_CONTENTION`: Another active agent currently holds an unexpired advisory lease on the requested resource.
- `TOPOLOGY_ERR_SSE_DROPPED`: Real-time SSE stream re-connecting; UI remains interactive.
- `TOPOLOGY_ERR_UI_RENDER_CRASH`: Render tree recovered with 1-click state reset.

### Zero-Dependency CLI Reference (`scripts/topology-log.mjs`)
Agents without direct MCP access can run commands from the project root:
```bash
# Ensure server is running
node scripts/topology-log.mjs server

# List all active agent workflow plans
node scripts/topology-log.mjs plans

# Switch active visual canvas plan
node scripts/topology-log.mjs switch backend-refactor

# Acquire advisory lock
node scripts/topology-log.mjs lock node:step-1 --agent="AgentA" --ttl=30

# Append execution log entry / update plan node
node scripts/topology-log.mjs log --action="node_updated" --plan="backend-refactor" --nodeId="step-1" --status="completed"

# Release advisory lock
node scripts/topology-log.mjs unlock node:step-1 --agent="AgentA"

# Distributed Git rebase and push
node scripts/topology-log.mjs sync --push
```
