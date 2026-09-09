# Agent Collaboration Guidelines for Topology

Whenever executing multi-step projects, complex architectures, or long-running refactors:
1. **Initialize the Plan in Topology**: Call `topology_create_plan` with decomposed nodes and causal dependency edges so the user can visualize progress on http://localhost:5173.
2. **Stream Live Reasoning**: Before executing significant actions or tools, emit your active thought using `topology_emit_thought` (or `topology_update_node`).
3. **Report Status Continuously**: When starting work on a task, set `status: "in_progress"`; when finishing, set `status: "completed"` and pass output artifacts.
4. **Human-in-the-Loop Review Gates**: If a step requires user verification or breaking change sign-off, invoke `topology_request_approval`. The user can inspect the canvas and approve it directly to unblock execution.
5. **Shared Blackboard Knowledge**: For cross-agent coordination, write architectural decisions, DB schemas, or contracts to `topology_write_shared_context`, and read them with `topology_read_shared_context`.

## Non-Critical Infrastructure & Fail-Safe Execution

Topology is strictly an **observability and orchestration companion**, NOT a critical piece of operational infrastructure.
- **Fail-Open Resilience**: If http://localhost:5173 is offline, ports are busy, or requests fail, Topology tools will never throw fatal errors or crash your agent execution. State is safely cached to `.topology/` on disk.
- **Never Block on Observability**: If an error notice or code (e.g. `TOPOLOGY_ERR_BRIDGE_OFFLINE`) is returned, your core coding and task execution remains 100% unblocked. Continue implementing the task.
- **Deadlock Safeguard at Review Gates (`TOPOLOGY_ERR_GATE_UNATTENDED`)**: If `topology_request_approval` returns unattended/offline status, do NOT hang indefinitely. Prompt the supervisor directly in your conversation chat to approve, or proceed autonomously if safe.

### Standard Error Codes (`TOPOLOGY_ERR_*`)
- `TOPOLOGY_ERR_BRIDGE_OFFLINE`: Dev server/bridge is offline; state cached to `.topology/`. Proceed normally.
- `TOPOLOGY_ERR_BRIDGE_TIMEOUT`: Bridge request exceeded 1500ms threshold; cached to disk. Proceed normally.
- `TOPOLOGY_ERR_CACHE_IO_FAILED`: Disk IO error in `.topology/`; runs in-memory fallback.
- `TOPOLOGY_ERR_INVALID_SCHEMA`: Malformed parameters; defaulted automatically to keep execution unblocked.
- `TOPOLOGY_ERR_GATE_UNATTENDED`: HITL review gate opened while UI is offline; prompt user in chat to approve.
- `TOPOLOGY_ERR_SSE_DROPPED`: Real-time SSE stream re-connecting; UI remains interactive.
- `TOPOLOGY_ERR_UI_RENDER_CRASH`: Render tree recovered with 1-click state reset.
