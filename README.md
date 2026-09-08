# Topology 🧭

> **The Spatial DAG Studio, Causal State Machine & Autonomous AI Agent Execution Cockpit.**
> Designed for Nobel-class engineering, visual spatial planning, and deterministic multi-agent execution.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![React Flow](https://img.shields.io/badge/@xyflow/react-12.3-FF0072)](https://reactflow.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.169-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![Google Material](https://img.shields.io/badge/Design-Google_Material_Light-4285F4?logo=google&logoColor=white)](https://m3.material.io/)
[![Gemini CLI Ready](https://img.shields.io/badge/Agent-Gemini_CLI_Ready-8E75B2?logo=google-gemini&logoColor=white)](https://github.com/google-gemini/gemini-cli)

---

## 🌟 Why Topology?

Traditional agent frameworks force developers and AI systems into blind text logs or brittle script loops. **Topology** bridges human spatial intuition and AI programmatic precision:

- **For Humans**: A distraction-free visual canvas with zero borders, natural paper elevation, ComfyUI-style spotlight quick-add, 3D force-directed galaxy views, and an industry-standard **Topology Hub with an 80% Architecture Coverage Map**.
- **For AI Agents**: A deterministic causal protocol. Every node specifies system instructions, authorized MCP tools, upstream artifact inputs, strict validation criteria, and recursion guards. With 1-click prompt handoff and a zero-dependency headless Python orchestrator (`run_topology.py`), agents can execute complex topologies headlessly in CI/CD or local terminals.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 18+ or 20+
- npm, pnpm, or yarn

### Installation & Launch
```bash
# Clone the repository
git clone https://github.com/Set0ri/Topology.git
cd Topology

# Install dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
npm run build
# Compiles TypeScript and packages optimized Vite production chunks
```

---

## 🧑 How to Use: Instructions for Humans

### 1. Spatial 2D Workbench (`@xyflow/react`)
- **Pan & Zoom**: Click and drag empty canvas to pan; scroll or pinch to zoom.
- **Select Nodes**: Click any card to open the **Context Protocol Inspector** in the right drawer. Hold `Shift` to drag multi-select bounding boxes.
- **Spotlight Quick-Add**: Click anywhere on the empty canvas to spawn the ComfyUI / Raycast floating search bar. Type to filter archetypes (`Task`, `Goal`, `Decision`, `Milestone`, `Agent`) and press `Enter`. The new node will automatically infer predecessor links!
- **Auto-Connect Edge Pull**: Drag from any handle to connect causal relationships (`depends_on`, `produces`, `subtask`, `triggers`).

### 2. Sleek Floating Sidebar & Micro-Metrics
- Located at the top-left of the canvas.
- **Interactive Metrics Strip**: Displays live counts for `Total`, `Done` (green dot), `Active` (amber dot), and `Wait` (orange dot). Clicking any metric chip instantly toggles filtering for that status!
- **Search & Filters**: Search nodes, labels, and tags. Filter by Status, Archetype Type, or Execution Engine (`🤖 AI Agent`, `⚡ Script`, `👤 Human Gate`, `🔀 Router`).
- **Collapsible Rail**: Click the left chevron to collapse into a slim vertical icon rail with tooltips and badge indicators.

### 3. Topology Hub & 80% Architecture Coverage Map
- Click the **Topology Hub (80%)** button in the top navigation bar.
- **Coverage Map**: Visual dashboard showing how many standard software architecture archetypes are ready vs planned (8 of 10 ready, 80% global coverage).
- **1-Click Archetype Loading**: Browse canonical patterns (TDD loops, RAG ingestion, multi-agent debates, map-reduce fan-out, HITL security gates). Click **"Load into Canvas"** to instantiate a full working DAG.
- **Publish Custom Topologies**: Design on the canvas, switch to the *Publish* tab in the Hub, give it a name, category, and tags, and click **"Save to Local Registry"** or **"Copy GitHub PR JSON"** to contribute!

### 4. 3D Force-Directed Galaxy (`Three.js`)
- Click the **3D** pill in the top navigation header.
- Explore your DAG as a living 3D constellation:
  - **Orbit**: Left Click + Drag
  - **Pan**: Right Click + Drag
  - **Zoom**: Scroll Wheel (or floating `+` / `-` controls)
  - **Fit Graph**: Click the maximize button in the floating 3D dock
  - **Node Focus**: Click any node to fly the camera directly to it and inspect its execution telemetry.

### 5. Tri-Palette Elevated Theming
- Click the 4-dot jewel button in the top right to open the palette popover:
  - **Google Material Light** (Default): Crisp `#f8fafd` canvas, `#ffffff` pure paper cards, Google Slate typography, and jewel accents (Blue, Red, Yellow, Green, Purple, Teal).
  - **Catppuccin Mocha**: Soft cyber pastel dark mode (`#11111b` crust, `#1e1e2e` base).
  - **Latte**: Warm porcelain glare-free light mode.

### 6. Universal Interoperability & Export
From the **Export** menu in the header:
- **Obsidian Canvas (`.canvas`)**: Export for visual knowledge graphs in Obsidian.
- **Universal Agent Manifest (`.json`)**: Machine-readable specification for orchestrator frameworks.
- **Mermaid Flowchart (`.mmd`)**: Clean markdown diagrams for PR documentation.
- **Headless Python CLI Runner (`run_topology.py`)**: Zero-dependency runner for executing tasks headlessly.
- **Import Canvas / JSON**: Drag-and-drop or select any `.canvas` or Topology JSON file to restore workspaces.

### 7. Touch-First Mobile & Tablet Ergonomics
Topology is designed for phones (down to 320px) and tablets:
- **Touch Gestures**: Single finger drag to pan canvas, two-finger pinch to zoom in/out, tap node to inspect.
- **Slide-Up Bottom Sheet**: Node Inspector gracefully transforms into a native slide-up drawer on mobile with a drag handle.
- **Auto-Collapsing Sidebar**: Filter drawer collapses into a floating button on mobile screens (`<768px`) with tap-to-dismiss backdrop.
- **Smart Radar Suppression**: The minimap automatically tucks away when the inspector drawer is open on mobile to prevent control overlap.
- **Safe Touch Targets**: All buttons adhere to >=44px ergonomic touch bounds with zero borders and natural elevation.

---

## 🤖 How to Use: Instructions for AI Agents & LLMs

If you are an autonomous AI agent (e.g. Gemini CLI, Claude 3.7 Sonnet, Cursor Agent, AutoGen, CrewAI, LangGraph), Topology serves as your **Visual Cockpit and Executable State Machine**.

### 1. Agent Handoff Protocol
Every task node on the canvas contains a **1-Click Copy Agent Prompt** button. When clicked, it generates a structured prompt engineered for LLM execution:

```markdown
# Agent Execution Task: [Node Label]
- **Role**: [Architect | CodeGenerator | TestAuditor | SecurityAnalyst | Synthesizer]
- **Model Engine**: [gemini-2.5-pro | claude-3-7-sonnet | script-runner]
- **Execution Type**: [autonomous_agent | automated_script | human_operator]

## System Instructions & Objectives
[promptTemplate]

## Upstream Input Artifacts
- **feature_request.md**:
```markdown
[Upstream content passed automatically through causal edges]
```

## Authorized Tools Required
- [read_file, write_file, vitest]

## Acceptance & Validation Criteria
[validationCriteria]

## Stopping Condition / Recursion Guard
[expression e.g. "passCount === totalCount && coverage >= 90"]
```

### 2. Headless Python CLI Orchestrator (`run_topology.py`)
Export `run_topology.py` from the Export menu. It runs without external dependencies on any machine with Python 3.8+:

```bash
# Dry run: view antichain batches and causal dependencies
python run_topology.py --dry-run

# Execute full DAG headlessly
python run_topology.py

# Verbose execution with simulated agent telemetry
python run_topology.py --verbose
```

#### How the Python Runner Works:
1. Parses the DAG using Kahn's topological sorting algorithm.
2. Identifies maximal antichains (nodes that can safely execute in parallel without race conditions).
3. Executes nodes batch-by-batch, passing emitted `artifactPayloads` downstream.
4. Evaluates decision conditions and halts if stopping conditions are met.

### 3. Graph Coherence Invariants (For Agent Generators)
When synthesizing or editing a topology via JSON, agents must adhere to these mathematical invariants:
1. **Acyclicity**: Graph must be a Directed Acyclic Graph (DAG). Cycles trigger Tarjan's SCC diagnostic error.
2. **Stopping Guard on Recursive Loops**: Any feedback edge must define `stoppingCondition: { expression, maxIterations }` to prevent infinite token depletion.
3. **No Orphan Actions**: Every task node must connect to an upstream goal/task and terminate in a deliverable milestone or artifact.
4. **Human Approval Gates**: Tasks modifying production infrastructure or security credentials must specify `requiresHumanApproval: true`.

### 4. Contributing New Topologies via JSON
Autonomous agents can contribute new canonical archetypes by creating a JSON file matching this schema:

```json
{
  "id": "my-agent-archetype",
  "name": "Autonomous Documentation & Docstring Sync",
  "category": "coding",
  "description": "Scans git diffs, identifies signature changes, and updates OpenAPI and docstrings.",
  "popularity": 85,
  "complexity": "Intermediate",
  "status": "ready",
  "tags": ["documentation", "openapi", "git"],
  "estimatedMinutes": 15,
  "author": "Gemini Autonomous Contributor",
  "whyItMatters": "Eliminates documentation drift between code and docs.",
  "nodes": [...],
  "edges": [...]
}
```
Submit the JSON as a PR to `src/data/topologyRegistry.ts`!

---

## 📐 Mathematical Foundations

Topology is built on formal order theory and graph theory:

- **Poset Antichains (Parallelism)**: By Dilworth's Theorem, the minimum number of parallel worker threads needed to execute a DAG equals the size of its largest antichain. Topology computes maximal antichains dynamically to maximize parallel throughput.
- **Topological Sorting (Kahn's Algorithm)**: Computes deterministic sequential batches $B_0, B_1, \dots, B_k$ where every dependency for batch $B_i$ is guaranteed complete in batches $B_{<i}$.
- **Strongly Connected Components (Tarjan's Algorithm)**: Fast $O(V + E)$ cycle detection identifying circular deadlocks before execution dispatch.
- **Dagre Hierarchical Layout**: Computes optimal node coordinate projection with edge-crossing minimization.

---

## 📁 Repository Structure

```
Topology/
├── src/
│   ├── components/
│   │   ├── canvas/             # 2D React Flow workspace, custom nodes, handles, mini-map
│   │   ├── common/             # ErrorBoundary, ElevatedCard, fallback screens
│   │   ├── generator/          # AI Plan Synthesizer modal
│   │   ├── graph3d/            # 3D Force-Directed WebGL constellation (Three.js)
│   │   ├── inspector/          # NodeInspector: Context, Prompt Handoff, Telemetry, Artifacts
│   │   ├── layout/             # Header, ThemePalettePicker, SidebarFilter
│   │   ├── library/            # TopologyLibraryModal: % Coverage Map & Community Hub
│   │   ├── simulator/          # Simulation playback dock & step controller
│   │   ├── subgraph/           # Nested subgraph breadcrumbs & navigation
│   │   ├── tutorial/           # Animated SVG onboarding modal (5 interactive lessons)
│   │   └── validation/         # CoherenceModal: Tarjan cycle detector & auto-fixes
│   ├── data/
│   │   ├── canonicalTopologies.ts # Top 10 industry software/agent archetypes
│   │   ├── sampleTopologies.ts    # Self-hosting architecture & code migration DAGs
│   │   └── topologyRegistry.ts    # % Coverage Map calculation engine
│   ├── store/
│   │   └── useTopologyStore.ts    # Central Zustand store with undo/redo & local persistence
│   ├── types/
│   │   └── topology.ts            # Strongly typed AST definitions (Node, Edge, Telemetry)
│   └── utils/
│       ├── agentHandoff.ts        # Prompt generator for Gemini CLI & run_topology.py generator
│       ├── catppuccin.ts          # Tri-palette theme tokens (Google Light, Mocha, Latte)
│       ├── graphAlgorithms.ts     # Kahn antichains, Tarjan SCC, Dagre layout
│       ├── graphValidation.ts     # Invariant checks & 1-click auto-fixers
│       └── obsidianCanvas.ts      # Obsidian .canvas, Mermaid, and UAM serializers
├── dataflow.md                    # Complete reactive architecture specification
├── walkthrough.md                 # Implementation walkthrough & verification logs
├── index.html                     # Entry HTML with Inter & Google Sans typography
├── package.json
├── tailwind.config.js             # Elevated paper shadows & jewel color tokens
└── tsconfig.json
```

---

## 🤝 Contributing

We welcome contributions from human software engineers, security researchers, and autonomous AI agents!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/new-topology-archetype`)
3. Commit your Changes (`git commit -m 'feat: add Event-Driven Saga Orchestrator archetype'`)
4. Verify Build: `npm run build` (must pass with 0 errors)
5. Push to the Branch (`git push origin feat/new-topology-archetype`)
6. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

---

## 📜 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

---

*Crafted with precision for humans and AI agents building the future of autonomous computation.*
