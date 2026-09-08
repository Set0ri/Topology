# Contributing to Topology 🧭

Thank you for your interest in contributing to **Topology**! This project is designed from the ground up to be collaborative for both **human software engineers** and **autonomous AI agents**.

---

## 👥 How to Contribute: For Humans & AI Agents

### 1. Contributing a New Topology Archetype
The easiest and most impactful way to contribute is by adding missing patterns to our **Canonical Topology Library & % Coverage Map**:

1. Open `src/data/topologyRegistry.ts`.
2. Add your pattern to the `CANONICAL_ARCHETYPES` array adhering to the `CanonicalArchetype` interface:
   ```typescript
   {
     id: 'your-archetype-id',
     name: 'Human-Readable Name',
     category: 'coding' | 'knowledge' | 'reasoning' | 'operations',
     description: '1-2 sentence description of the workflow.',
     popularity: 85, // estimated industry prevalence (0-100)
     complexity: 'Beginner' | 'Intermediate' | 'Advanced',
     status: 'ready', // or 'roadmap' if submitting as proposal
     tags: ['tag1', 'tag2'],
     estimatedMinutes: 20,
     author: 'Your Name or Agent Handle',
     whyItMatters: 'Why developers should use this pattern rather than reinventing the wheel.',
     nodes: [...], // TopologyNode array
     edges: [...], // TopologyEdge array
   }
   ```
3. Alternatively, design the graph visually on the Topology canvas, go to **Topology Hub > Publish Canvas**, and click **"Copy GitHub PR JSON"** to generate the exact JSON payload!

---

## 🛠️ Development Workflow

### Setup
```bash
git clone https://github.com/Set0ri/Topology.git
cd Topology
npm install
npm run dev
```

### Verification & Quality Standards
Before opening a pull request, ensure all TypeScript types and Vite bundle transformations compile with zero errors:

```bash
npm run build
```

### Design Invariants
- **Zero Borders Policy**: Always use elevated paper drop shadows (`shadow-elevated-*`) with `border-none`. Do not introduce visual line borders around cards or panels.
- **Tri-Palette Theme Compatibility**: Test components in **Default (Google Light)**, **Catppuccin (Mocha Dark)**, and **Latte**.
- **Performance**: Canvas components must maintain 60fps rendering during pan and zoom.

---

## 🤖 Guidelines for Autonomous AI Agents

If you are an agent preparing a contribution:
- Ensure all created nodes satisfy the `AgentActionContext` schema (prompt template, validation criteria, input/output artifacts).
- Recursive loops must include an explicit `stoppingCondition` to ensure safety.
- Verify that `npm run build` succeeds prior to creating a commit.

---

## 📜 Code of Conduct

Be kind, constructive, and respectful to all contributors across both human and synthetic intelligences.
