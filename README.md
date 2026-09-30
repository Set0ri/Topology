# Topology 🧭

> **The Spatial DAG Studio, Multi-Model Deliberation Council & Causal Orchestration Cockpit.**  
> Designed for human-agent symbiosis, extensible multi-model councils, 9-stage OODA iteration loops with strict bounds, real-time live telemetry, process-safe advisory locking, and distributed conflict-free execution.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![React Flow](https://img.shields.io/badge/@xyflow/react-12.3-FF0072)](https://reactflow.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.169-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![Catppuccin](https://img.shields.io/badge/Theme-Catppuccin_&_Material-8E75B2)](https://catppuccin.com/)

---

## 📑 Table of Contents
- [🌟 Architecture Overview](#-architecture-overview)
- [🤖 Instant AI Agent Copypasta](#-instant-ai-agent-copypasta) *(AI agents: copy this section!)*
- [🧑 Comprehensive Human Guide](#-comprehensive-human-guide)
  - [1. 2D Precision Canvas & Spatial Navigation](#1-2d-precision-canvas--spatial-navigation)
  - [2. Multi-Model Deliberation Council](#2-multi-model-deliberation-council)
  - [3. Extensible Custom Models & Provider Endpoints](#3-extensible-custom-models--provider-endpoints)
  - [4. 9-Stage OODA Iteration Engine with Strict Loop Limits](#4-9-stage-ooda-iteration-engine-with-strict-loop-limits)
  - [5. Live Quota & Budget Tracking](#5-live-quota--budget-tracking)
  - [6. Human-in-the-Loop Review Gates & Artifact Inspection](#6-human-in-the-loop-review-gates--artifact-inspection)
  - [7. 3D Constellation Orbit View](#7-3d-constellation-orbit-view)
- [⚙️ Installation & Setup](#️-installation--setup)
- [🛠️ MCP Tools Reference](#️-mcp-tools-reference)
- [💻 Zero-Dependency CLI Reference](#-zero-dependency-cli-reference)
- [🛡️ Fail-Open Resilience & Non-Critical Architecture](#️-fail-open-resilience--non-critical-architecture)
- [📜 License](#-license)

---

## 🌟 Architecture Overview

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                           TOPOLOGY COCKPIT                             │
 ├────────────────────────────────────┬───────────────────────────────────┤
 │           FOR HUMANS 🧑            │           FOR AGENTS 🤖           │
 ├────────────────────────────────────┼───────────────────────────────────┤
 │ • 2D / 3D Fluid Spatial Canvas     │ • Model Context Protocol (MCP)    │
 │ • Multi-Model Council Ideation UI  │ • Dynamic Multi-Provider Routing  │
 │ • 9-Stage OODA Interactive Stepper │ • Strict Loop Convergence Bounds  │
 │ • Real-Time Quota & TTR Countdown  │ • Process-Safe Advisory Locks     │
 │ • 1-Click Code Deliverable Viewer  │ • Live Thought & Tool Streaming   │
 │ • Zero-Border Elevated Glass Theme │ • Distributed Git Execution Log   │
 └────────────────────────────────────┴───────────────────────────────────┘
```

Topology bridges human intuition with autonomous multi-agent execution:
- **Humans** gain visual transparency into what AI agents are designing and executing, participate in architectural councils, inspect code artifacts with syntax highlighting, and sign off at critical security gates.
- **AI Agents** orchestrate multi-step architectures, convene heterogeneous model councils, iterate through formal OODA loops without runaway recursion, acquire process-safe locks to prevent race conditions, and export standardized Architectural Decision Records (ADRs).

---

## 🤖 Instant AI Agent Copypasta

> **For AI Assistants & Coding Agents:** Copy and paste the block below into your MCP configuration, system prompt, or workflow instructions to instantly connect and operate with Topology.

```markdown
### 🤖 Topology MCP & Workflow Integration Directives

#### 1. MCP Server Configuration (`mcp_config.json`)
Add the Topology MCP server to your MCP client config (e.g. `~/.gemini/antigravity/mcp/topology/` or Claude Desktop):
```json
{
  "mcpServers": {
    "topology": {
      "command": "node",
      "args": ["mcp-server/index.js"]
    }
  }
}
```

#### 2. Core Agent Protocol
When planning or implementing non-trivial features, refactors, or architectures:
1. **Ensure Visualizer Online**: Call `topology_ensure_server` (or `node scripts/topology-log.mjs server`). The dev server auto-starts at `http://localhost:5173`.
2. **Convene Deliberation Council**: For complex architecture decisions, call `topology_spawn_council`:
   - Supports 1, 2, or 3 rounds (Ideate ➔ Critique ➔ Consensus DAG).
   - Accepts custom models via `members: ["gemini-3.8-flash", "claude-4.6-opus", "deepseek-v3"]`.
   - Automatically writes an Architectural Decision Record to `docs/adr/`.
3. **Execute 9-Stage OODA Loops with Strict Limits**:
   - Call `topology_emit_loop_telemetry` across stages: `observe` ➔ `understand` ➔ `evaluate_with_council` ➔ `adversarial_council_evaluation` ➔ `each_member_plans` ➔ `share_and_vote_on_plan` ➔ `iterate_on_plan` ➔ `propose_plan` ➔ `update`.
   - **Strict Loop Parameter**: Always supply `maxLoops` (e.g. `maxLoops: 3`, clamped 1-10). If iterations reach `maxLoops`, Topology enforces convergence and terminates looping safely.
4. **Register Custom Models**: Use `topology_register_model` to add models across Gemini, Anthropic, OpenAI, or Ollama with custom RPM/TPM quotas.
5. **Manage DAG Workflow**:
   - `topology_create_plan`: Initialize nodes, roles, and causal dependency edges.
   - `topology_emit_thought`: Stream active reasoning before tool execution.
   - `topology_update_node`: Set `status: "in_progress"` or `"completed"` and attach deliverable artifacts.
   - `topology_complete_node`: Mark node complete and auto-advance to next pending step.
6. **Concurrency & Safe Locking**:
   - Call `topology_acquire_lock(resource, agentId, ttlSeconds)` before modifying shared resources or taking ownership.
   - Call `topology_release_lock(resource, agentId)` upon finishing.
7. **Fail-Open Resilience**:
   - Topology is an observability companion. If `http://localhost:5173` is unreachable or ports are busy, state safely caches to `.topology/` and tool calls return success (`TOPOLOGY_ERR_BRIDGE_OFFLINE`). Never abort code tasks due to observability notices.

#### 3. Quick Zero-Dependency CLI Cheat-Sheet
```bash
# Check council budget and quota usage
node scripts/topology-log.mjs budget

# List registered models
node scripts/topology-log.mjs models

# Register custom model
node scripts/topology-log.mjs add-model --id=deepseek-v3 --name="DeepSeek V3" --provider=openai_compatible --rpm=120 --tpm=1000000

# Convene multi-model council
node scripts/topology-log.mjs council --goal="Design rate limiter" --rounds=3

# Emit OODA loop telemetry with strict max-loops cap
node scripts/topology-log.mjs loop --plan="feature-plan" --loop=1 --max-loops=3 --stage="observe" --thought="Analyzing AST"

# Complete node and advance DAG
node scripts/topology-log.mjs complete-node --nodeId="task-1" --plan="feature-plan" --summary="Implemented contracts"
```
```

---

## 🧑 Comprehensive Human Guide

### 1. 2D Precision Canvas & Spatial Navigation
- **Interactive DAG Layout**: High-performance canvas powered by `@xyflow/react`. Nodes represent tasks, milestones, or agent actions connected by causal dependency edges.
- **Elevated Zero-Border Card Design**: Built in strict adherence to elevated card styling—borderless surfaces, subtle translucency (`backdrop-blur-md`), and rich drop shadows.
- **Dynamic Level of Detail (LOD)**: Smoothly transitions between `micro` (collapsed icon pills), `normal` (detailed cards with progress and role avatars), and `macro` (full telemetry, reasoning stream, and code artifact badges).
- **Spotlight Quick-Add**: Click anywhere on empty canvas to open the command palette (`Ctrl/Cmd + K` or double-click). Search actions, instantiate templates, or auto-connect nodes.
- **Intuitive Shortcuts**:
  - `Space + Drag`: Pan canvas smoothly.
  - `Tab / Shift+Tab`: Navigate across dependency steps.
  - `Delete / Backspace`: Remove selected nodes.
  - `1 / 2 / 3`: Switch between Macro, Normal, and Micro LODs.

### 2. Multi-Model Deliberation Council
Complex decisions require diverse perspectives. Topology integrates a multi-model deliberation council:
- **Default Triad**:
  - ⚡ **Gemini 3.8 Flash**: High-speed architect, structural decomposition, rapid exploration.
  - 🛡️ **Claude 4.6 Opus**: Invariant critic, security auditor, boundary condition validator.
  - 🔬 **GPT-OSS 120b**: Resilience auditor, performance profiling, failure mode synthesis.
- **Three-Phase Deliberation**:
  1. **Phase 1: Independent Ideation**: Each council member proposes distinct candidate approaches.
  2. **Phase 2: Adversarial Peer Review**: Models critique each other's proposals, identifying blind spots and race conditions.
  3. **Phase 3: Unified Consensus & DAG Synthesis**: Synthesizes the optimal architecture, extracts invariants, and formats a ready-to-execute visual DAG.
- **Automatic ADR Generation**: Council sessions automatically generate and export Architectural Decision Records in `docs/adr/`.

### 3. Extensible Custom Models & Provider Endpoints
Topology allows you to bring your own models from any provider:
- **Supported Providers**:
  - `gemini`: Native Google Generative Language API (`gemini-2.5-pro`, `gemini-2.5-flash`, etc.).
  - `anthropic`: Anthropic Messages API (`claude-3-7-sonnet`, `claude-3-5-haiku`, etc.).
  - `openai_compatible` / `openai`: Universal `/chat/completions` API supporting DeepSeek (`deepseek-v3`, `deepseek-r1`), Mistral, Groq, Together, and vLLM.
  - `ollama`: Fully offline local inference via local Ollama daemon (`http://localhost:11434/v1`).
- **Register via CLI or MCP**:
  ```bash
  node scripts/topology-log.mjs add-model --id=deepseek-v3 --name="DeepSeek V3" --provider=openai_compatible --rpm=120 --tpm=1000000 --cost-in=0.00014 --cost-out=0.00028
  ```
- **Custom Configuration File**: Persisted to `.topology/models.json` with rate limits, token quotas, and system roles.
- **Convene with Custom Members**: Pass custom models directly:
  ```bash
  node scripts/topology-log.mjs council --goal="Distributed Cache" --models="deepseek-v3,gemini-3.8-flash,claude-4.6-opus"
  ```

### 4. 9-Stage OODA Iteration Engine with Strict Loop Limits
For complex problem solving, Topology implements a structured 9-stage iterative refinement cycle:
1. `observe` — Scan workspace, read AST, analyze context and files.
2. `understand` — Identify invariants, performance constraints, and architectural boundaries.
3. `evaluate_with_council` — Deliberate candidate solutions across council members.
4. `adversarial_council_evaluation` — Stress-test proposals with adversarial critique.
5. `each_member_plans` — Independent candidate DAG formulations.
6. `share_and_vote_on_plan` — Democratic peer scoring and ranking.
7. `iterate_on_plan` — Refine, merge strengths, and address critiques.
8. `propose_plan` — Final consolidated architecture proposal.
9. `update` — Apply mutations to the DAG or codebase.

- **Strict Loop Governance (`maxLoops`)**:
  - Unbounded loops can quickly consume quotas. Topology enforces a strict `maxLoops` parameter (default 3, clamped between 1 and 10).
  - When iterations reach `maxLoops`, Topology automatically marks the status as `converged` and terminates recursion.
  - The UI modal features an interactive **Max Loops** selector (`1, 2, 3, 4, 5, 8, 10`) and one-click **Auto Run Loop**.

### 5. Live Quota & Budget Tracking
- **Granular Quota Safeguards**: Monitors Requests Per Minute (RPM), Tokens Per Minute (TPM), Requests Per Day (RPD), and Tokens Per Day (TPD).
- **Time-To-Refresh (TTR) Countdowns**: Real-time sliding window display showing exact seconds until rolling minute quotas refresh.
- **Cost Estimation**: Tracks input/output token expenditure and calculates financial cost in USD per session.
- **Fail-Safe Quota Ceilings**: Pre-flight checks halt council deliberation or fall back to high-throughput models when usage approaches the 85% safety threshold.

### 6. Human-in-the-Loop Review Gates & Artifact Inspection
- **Security & Quality Gates**: Set `requiresHumanApproval: true` on critical nodes. The visualizer pauses execution and illuminates the review card.
- **Syntax-Highlighted Artifact Viewer**: Click any deliverable tag (e.g. `schema.sql`, `api.ts`, `report.md`) to open an elevated glass viewer with syntax highlighting and 1-click clipboard copy.
- **Approve or Request Revisions**: Supervisors can approve downstream tasks or send targeted revision notes back to the agent.

### 7. 3D Constellation Orbit View
- Toggle the **3D** view in the top navigation to inspect complex multi-tier microservices or agent workflows as a living force-directed constellation powered by Three.js.
- **Controls**: Left-drag to orbit, right-drag to pan, scroll to zoom, click any celestial sphere to focus the camera.

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- (Optional) API Keys for live model deliberation (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or custom provider keys)

### Step 1: Clone and Install
```bash
git clone https://github.com/Set0ri/Topology.git
cd Topology
npm install
```

### Step 2: Start Visualizer
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### Step 3: Register MCP Server
Add Topology to your Antigravity, Gemini CLI, or Claude Desktop configuration:
```json
{
  "mcpServers": {
    "topology": {
      "command": "node",
      "args": ["mcp-server/index.js"]
    }
  }
}
```

---

## 🛠️ MCP Tools Reference

| MCP Tool | Description |
|:---|:---|
| `topology_ensure_server` | Verifies dev visualizer is online at `http://localhost:5173` (auto-starts detached in background if offline). |
| `topology_create_plan` | Initializes or replaces an agent execution plan with nodes and causal dependency edges. |
| `topology_update_node` | Updates task status (`in_progress`, `completed`, `failed`), attaches artifacts, and appends logs. |
| `topology_complete_node` | Marks task completed, attaches deliverables, and auto-advances to the next pending step. |
| `topology_emit_thought` | Streams live thought reasoning and active tool execution onto the canvas node card. |
| `topology_request_approval` | Opens a Human-in-the-Loop review gate on the canvas and pauses execution. |
| `topology_spawn_council` | Convenes multi-model council (Gemini, Claude, GPT-OSS, or custom models) across 1-3 rounds. |
| `topology_register_model` | Registers or updates a custom model with custom provider endpoint, quotas, and cost rates. |
| `topology_get_council_budget` | Inspects live RPM/TPM usage, remaining token reserves, USD cost, and rolling TTR countdowns. |
| `topology_emit_loop_telemetry` | Emits 9-stage OODA iteration telemetry with strict `maxLoops` capping (1-10). |
| `topology_get_loop_telemetry` | Retrieves iteration timelines, stage history, and convergence metrics. |
| `topology_export_council_adr` | Exports synthesized council decisions as an Architectural Decision Record in `docs/adr/`. |
| `topology_acquire_lock` | Acquires an atomic, auto-expiring process advisory lease on a node or shared resource. |
| `topology_release_lock` | Releases an advisory lease upon task completion. |
| `topology_write_shared_context` | Writes architectural decisions or schemas to the shared blackboard. |
| `topology_read_shared_context` | Reads shared blackboard context written by peer agents or human operators. |
| `topology_sync_git_log` | Rebase-pulls and pushes append-only execution logs across distributed Git clones. |

---

## 💻 Zero-Dependency CLI Reference

Agents or scripts running without direct MCP tool bindings can execute commands directly with Node:

```bash
# Ensure server is running
node scripts/topology-log.mjs server

# List all workflow plans
node scripts/topology-log.mjs plans

# Switch active canvas view
node scripts/topology-log.mjs switch feature-auth

# Inspect registered models
node scripts/topology-log.mjs models

# Register custom model
node scripts/topology-log.mjs add-model --id=deepseek-v3 --name="DeepSeek V3" --provider=openai_compatible --rpm=120 --tpm=1000000

# Inspect live quotas and TTR countdowns
node scripts/topology-log.mjs budget

# Convene multi-model council with custom members
node scripts/topology-log.mjs council --goal="Design rate limiter" --rounds=3 --models="deepseek-v3,gemini-3.8-flash,claude-4.6-opus"

# Emit OODA loop telemetry with strict loop limit
node scripts/topology-log.mjs loop --plan="feature-auth" --loop=1 --max-loops=3 --stage="observe" --thought="Scanning AST"

# View OODA loop history
node scripts/topology-log.mjs loops --plan="feature-auth"

# Acquire advisory lease
node scripts/topology-log.mjs lock node:auth-jwt --agent="SecurityAgent" --ttl=30

# Complete node and advance DAG
node scripts/topology-log.mjs complete-node --nodeId="auth-jwt" --plan="feature-auth" --summary="Added JWT validation"

# Release advisory lock
node scripts/topology-log.mjs unlock node:auth-jwt --agent="SecurityAgent"

# Rebase and push git execution log
node scripts/topology-log.mjs sync --push
```

---

## 🛡️ Fail-Open Resilience & Non-Critical Architecture

Topology is built as a strictly **fail-open observability companion**:
- **Never Blocks Core Work**: If `http://localhost:5173` is offline, ports are busy, or network requests fail, Topology tools will never throw fatal errors or crash agent execution. All state is cached to `.topology/` on disk.
- **Deadlock Safeguards**: If a human approval gate is opened while the UI is offline, the tool returns an autonomy directive (`TOPOLOGY_ERR_GATE_UNATTENDED`) so agents are never blocked waiting indefinitely.
- **Auto-Expiring Advisory Leases**: All locks use time-to-live leases (`ttlSeconds`, default 30s). Crashed or disconnected agents will never leave permanent resource deadlocks.
- **Strict Loop Halting**: Recursive OODA cycles are hard-capped by `maxLoops` to prevent unbounded execution and runaway token spend.

---

## 📜 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
