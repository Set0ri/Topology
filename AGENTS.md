# Agent Collaboration Guidelines for Topology

Whenever executing multi-step projects, complex architectures, or long-running refactors:
1. **Initialize the Plan in Topology**: Call `topology_create_plan` with decomposed nodes and causal dependency edges so the user can visualize progress on http://localhost:5173.
2. **Stream Live Reasoning**: Before executing significant actions or tools, emit your active thought using `topology_emit_thought` (or `topology_update_node`).
3. **Report Status Continuously**: When starting work on a task, set `status: "in_progress"`; when finishing, set `status: "completed"` and pass output artifacts.
4. **Human-in-the-Loop Review Gates**: If a step requires user verification or breaking change sign-off, invoke `topology_request_approval`. The user can inspect the canvas and approve it directly to unblock execution.
