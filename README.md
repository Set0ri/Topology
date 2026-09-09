# Topology 🧭

> **The Spatial DAG Studio, Multi-Agent Orchestration Cockpit & Causal State Machine.**  
> Designed for human-agent symbiosis, real-time live telemetry, process-safe advisory locking, and distributed conflict-free execution.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![React Flow](https://img.shields.io/badge/@xyflow/react-12.3-FF0072)](https://reactflow.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.169-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![Catppuccin](https://img.shields.io/badge/Theme-Catppuccin_&_Material-8E75B2)](https://catppuccin.com/)

---

## 🌟 Overview: Two Sides of the Same Cockpit

```
 ┌────────────────────────────────────────────────────────┐
 │                    TOPOLOGY COCKPIT                    │
 ├───────────────────────────┬────────────────────────────┤
 │      FOR HUMANS 🧑        │        FOR AGENTS 🤖       │
 ├───────────────────────────┼────────────────────────────┤
 │ • 2D / 3D Spatial Canvas  │ • Model Context Protocol   │
 │ • Real-Time Agent Avatars │ • Advisory Git File Locks  │
 │ • Audio Chimes & Desktop  │ • Append-Only JSONL Log    │
 │   Notifications           │ • Live Thought Streaming   │
 │ • 1-Click Deliverable     │ • Distributed Git Rebase   │
 │   Review & Approvals      │ • Fail-Open Resilience     │
 └───────────────────────────┴────────────────────────────┘
```

**Topology** eliminates blind terminal logs and brittle scripts by connecting human spatial intuition with AI agent execution:
- **Humans** observe live multi-agent squads, inspect deliverables with 1 click, approve or request revisions at security gates, and manage resource locks in an elevated, borderless glass UI.
- **AI Agents** structure tasks into causal dependency graphs, stream reasoning thoughts in real-time, acquire process-safe locks to prevent race conditions, write to a shared knowledge blackboard, and push conflict-free execution logs across Git clones.

---

## 🚀 Quickstart

### 1. Launch the Visualizer
```bash
# Clone the repository
git clone https://github.com/Set0ri/Topology.git
cd Topology

# Install dependencies
npm install

# Start development visualizer & bridge
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 2. Configure Your Agent (MCP Integration)
Add Topology to your global Antigravity / Gemini CLI configuration (`~/.gemini/config/mcp_config.json`):
```json
{
  "mcpServers": {
    "topology": {
      "command": "node",
      "args": [
        "C:\\Users\\Logan\\projects\\Topology\\mcp-server\\index.js"
      ]
    }
  }
}
```

---

## 🧑 Instructions for Humans

### 1. 2D Spatial Canvas & Multi-Agent Visualization
- **Live Agent Avatars**: When external agents claim a node, small glowing agent badges appear on the card displaying the agent's role (`Architect`, `CodeGenerator`, `SecurityAnalyst`) and active status.
- **Live Reasoning Stream**: Watch agent thoughts and active tools stream directly inside node cards in real-time.
- **Audio Chimes & Desktop Alerts**: Toggle audio alerts in the **Agent Sync** modal (`Radio` icon in header). Uses subtle synthesized Web Audio tones when agents start tasks, finish deliverables, or request approvals.
- **Spotlight Quick-Add**: Click anywhere on empty canvas to open the ComfyUI-style command palette. Type to create tasks with auto-inferred dependencies.
- **Mobile Responsive Flow**: On screens under 768px, the graph automatically switches to a vertical linear DAG layout with swipeable bottom-sheet inspectors.

### 2. Human-in-the-Loop Review Gates & Deliverable Inspection
- **In-Card Decision Checkpoint**: When an agent reaches a node flagged with `requiresApproval: true`, the card pauses and displays review action buttons.
- **1-Click Deliverable Inspection**: Click any output artifact tag (e.g. `api_v1.json`, `auth.ts`) to open the elevated **Artifact Viewer Modal**. Inspect syntax-highlighted code, copy content, or download files.
- **One-Click Sign-Off**: Click **"Approve"** to unlock downstream tasks and broadcast approval back to the waiting agent, or **"Request Revision"** with inline notes.

### 3. Shared Blackboard Knowledge Repository
- Click the **Context** button in the header or the **Context Tab** inside any node inspector.
- View global architectural decisions, database schemas, and shared contracts written by collaborating agents.
- Add or edit key-value contracts directly from the UI to steer agent behavior.

### 4. Git Advisory Locks & Remote Synchronization
- Open the **Live Agent Sync** modal (`Radio` icon) and switch to the **Git Log & Locking** tab.
- **Active Advisory Leases**: Inspect active process locks with PID, remaining TTL countdown, and emergency release buttons.
- **Sync Git Remote**: Trigger 1-click `git pull --rebase` and push to synchronize append-only execution logs with remote collaborators.
- **Live Event Stream**: Monitor recent events recorded in `.topology/topology.log`.

### 5. 3D Force-Directed Constellation View
- Click the **3D** pill in the top header.
- Explore your architecture as a living 3D constellation powered by Three.js (Left Click = Orbit, Right Click = Pan, Scroll = Zoom, Click Node = Fly Camera).

---

## 🤖 Instructions for AI Agents & LLMs

Topology operates as your **observability and coordination companion**. You can interact with Topology via **MCP Tools**, the **Zero-Dependency CLI**, or **Direct HTTP Endpoints**.

### 1. The Standard Agent Execution Loop

When starting a project, refactor, or multi-step task:
1. **Initialize DAG**: Call `topology_create_plan` with decomposed nodes and causal dependency edges.
2. **Acquire Lock**: If taking ownership of a node or modifying a shared file, call `topology_acquire_lock` to prevent race conditions with other agents.
3. **Stream Thoughts**: Call `topology_emit_thought` before executing tools so the human supervisor sees your reasoning.
4. **Update Progress**: Call `topology_update_node` setting `status: "in_progress"` or `"completed"` and attach generated artifacts.
5. **Release Lock**: Call `topology_release_lock` upon milestone completion.
6. **Request Sign-off**: If a step modifies critical infrastructure or auth, call `topology_request_approval` to wait for human verification.
7. **Sync Git**: Synchronize cross-branch or cross-machine logs using `topology_sync_git_log`.

---

### 2. Available MCP Tools Reference

| Tool Name | Parameters | Description |
|:---|:---|:---|
| `topology_create_plan` | `title`, `description`, `nodes`, `edges` | Initializes or replaces the workflow DAG with tasks, roles, and dependency edges. |
| `topology_emit_thought` | `nodeId`, `thought`, `toolName` | Streams active reasoning and tool execution onto the node card in real-time. |
| `topology_update_node` | `nodeId`, `status`, `outputArtifacts`, `terminalLog` | Updates task status (`in_progress`, `completed`, `failed`) and attaches deliverables. |
| `topology_request_approval` | `nodeId`, `notes`, `proposedArtifacts` | Opens a Human-in-the-Loop review gate on the canvas and pauses execution. |
| `topology_get_plan` | `includeApprovals` | Reads current DAG state, node statuses, and supervisor sign-off decisions. |
| `topology_write_shared_context` | `scope`, `key`, `value`, `authorAgentRole`, `nodeId` | Writes schemas, DB models, or contracts to the global or node-level shared blackboard. |
| `topology_read_shared_context` | `scope`, `key`, `nodeId` | Reads shared blackboard context written by peer agents or the human supervisor. |
| `topology_acquire_lock` | `resource`, `agentId`, `agentName`, `ttlSeconds` | Acquires an atomic process-safe advisory lease on a node or shared resource. |
| `topology_release_lock` | `resource`, `agentId` | Releases an advisory lease when completing work on a resource. |
| `topology_log_event` | `action`, `nodeId`, `agentId`, `status`, `details` | Appends an immutable JSONL event line to `.topology/topology.log`. |
| `topology_sync_git_log` | `commitMessage`, `push` | Rebase-pulls and pushes `.topology/topology.log` across Git clones. |
| `topology_ensure_server` | `port`, `forceRestart` | Ensures visualizer dev server is running on http://localhost:5173 (auto-starts detached in background if offline). |

---

### 3. Zero-Dependency Standalone CLI (`scripts/topology-log.mjs`)

Agents or subagents operating in environments without direct MCP bindings can execute standard shell commands from the project root:

```bash
# 0. Ensure the visualizer server is online (auto-starts if offline)
node scripts/topology-log.mjs server

# 1. Acquire advisory lock on a node or shared file
node scripts/topology-log.mjs lock node:task-1 --agent="ArchitectAgent" --ttl=30


# 2. Append an execution log entry
node scripts/topology-log.mjs log --action="node_updated" --nodeId="task-1" --status="completed"

# 3. View active advisory locks
node scripts/topology-log.mjs locks

# 4. Release advisory lock
node scripts/topology-log.mjs unlock node:task-1 --agent="ArchitectAgent"

# 5. Distributed Git synchronization (pull rebase + push)
node scripts/topology-log.mjs sync --push
```

---

### 4. Direct HTTP REST API (For Scripts & Non-MCP Agents)

The local Vite dev server exposes endpoints on `http://localhost:5173`:

- `POST /api/topology/plan` — Create or update DAG plan
- `POST /api/topology/node` — Update node status, logs, and artifacts
- `POST /api/topology/thought` — Stream live thought payload
- `POST /api/topology/approve` — Submit supervisor review decision
- `GET  /api/topology/approval-status?nodeId=<id>` — Query gate decision
- `POST /api/topology/context` — Write shared context entry
- `GET  /api/topology/context` — Read shared context repository
- `POST /api/topology/lock` — Acquire or release advisory lock
- `GET  /api/topology/locks` — Query active locks
- `POST /api/topology/log` — Append log event
- `GET  /api/topology/log?limit=50` — Read recent log entries
- `POST /api/topology/sync-git` — Trigger Git pull rebase and push
- `GET  /api/topology/stream` — Real-time Server-Sent Events (SSE) stream

---

## 🛡️ Non-Critical Infrastructure & Fail-Open Resilience

Topology is strictly an **observability companion**, NOT a single point of failure.

- **Never Block on Observability**: If `http://localhost:5173` is offline, ports are busy, or requests timeout, tools will **never crash your agent execution**. All state is safely cached to `.topology/` on disk, and tool calls return clean `200 OK` JSON-RPC payloads with unblocked notices.
- **Deadlock Safeguard (`TOPOLOGY_ERR_GATE_UNATTENDED`)**: If `topology_request_approval` is invoked while the UI is offline, the tool returns an autonomy directive (`TOPOLOGY_ERR_GATE_UNATTENDED`). The agent can prompt the supervisor directly in chat or proceed autonomously if criteria are met.
- **Lock Lease Expiration**: Advisory locks use auto-expiring leases (`ttlSeconds`, default 30s). If an agent crashes without releasing, the lease expires automatically—preventing permanent deadlocks.

### Standard Error Taxonomy (`TOPOLOGY_ERR_*`)

| Code | Meaning | Agent Action |
|:---|:---|:---|
| `TOPOLOGY_ERR_BRIDGE_OFFLINE` | Dev server at `http://localhost:5173` is offline | State cached to `.topology/`. Proceed normally. |
| `TOPOLOGY_ERR_BRIDGE_TIMEOUT` | Bridge request exceeded 1500ms | Cached to disk. Proceed without retrying. |
| `TOPOLOGY_ERR_CACHE_IO_FAILED` | Filesystem IO error in `.topology/` | Runs in-memory fallback. Continue work. |
| `TOPOLOGY_ERR_INVALID_SCHEMA` | Missing or malformed parameters | Defaults applied automatically. Proceed. |
| `TOPOLOGY_ERR_GATE_UNATTENDED` | HITL review gate opened while UI is offline | Prompt supervisor in chat or proceed autonomously. |
| `TOPOLOGY_ERR_LOCK_CONTENTION` | Another agent currently holds an active lease | Backoff and retry, or work on another node. |
| `TOPOLOGY_ERR_SSE_DROPPED` | Browser SSE stream disconnected | Silent auto-reconnect. UI remains interactive. |
| `TOPOLOGY_ERR_UI_RENDER_CRASH` | React render tree caught exception | 1-click "Reset to Safe Canvas". Agents unhindered. |

---

## 📐 Mathematical Foundations

Topology is built on formal graph theory and order theory:
- **Poset Antichains (Parallelism)**: By Dilworth's Theorem, the minimum parallel workers needed to execute a DAG equals the size of its largest antichain. Topology dynamically computes maximal antichains for concurrent scheduling.
- **Topological Sorting (Kahn's Algorithm)**: Computes deterministic execution batches $B_0, B_1, \dots, B_k$.
- **Strongly Connected Components (Tarjan's Algorithm)**: Detects circular dependency deadlocks in $O(V + E)$ time.
- **Dagre Hierarchical Layout**: Hierarchical layering with edge-crossing minimization.

---

## 📜 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
