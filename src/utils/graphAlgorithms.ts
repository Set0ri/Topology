import dagre from 'dagre';
import { TopologyNode, TopologyEdge, CausalPath } from '../types/topology';

/**
 * Tarjan's Cycle Detection Algorithm
 * Detects if the directed graph contains cycles and returns cycle node IDs.
 */
export function detectCycles(nodes: TopologyNode[], edges: TopologyEdge[]): { hasCycle: boolean; cycleNodeIds: Set<string> } {
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    if (adj.has(e.source)) {
      adj.get(e.source)!.push(e.target);
    }
  });

  const visited = new Map<string, boolean>();
  const recStack = new Map<string, boolean>();
  const cycleNodes = new Set<string>();

  function dfs(u: string, path: string[]): boolean {
    visited.set(u, true);
    recStack.set(u, true);
    path.push(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (!visited.get(v)) {
        if (dfs(v, path)) return true;
      } else if (recStack.get(v)) {
        // Cycle detected
        const cycleStartIndex = path.indexOf(v);
        if (cycleStartIndex !== -1) {
          path.slice(cycleStartIndex).forEach(id => cycleNodes.add(id));
        }
        cycleNodes.add(v);
        return true;
      }
    }

    recStack.set(u, false);
    path.pop();
    return false;
  }

  nodes.forEach(n => {
    if (!visited.get(n.id)) {
      dfs(n.id, []);
    }
  });

  return {
    hasCycle: cycleNodes.size > 0,
    cycleNodeIds: cycleNodes
  };
}

/**
 * Kahn's Topological Sort & Maximal Antichain Partitioning
 * Returns nodes grouped into sequential execution tiers/batches where
 * every node in tier N can execute in parallel.
 */
export function getTopologicalBatches(nodes: TopologyNode[], edges: TopologyEdge[]): { batches: string[][]; isCyclic: boolean } {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });

  edges.forEach(e => {
    if (inDegree.has(e.target)) {
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
    if (adj.has(e.source)) {
      adj.get(e.source)!.push(e.target);
    }
  });

  const queue: string[] = [];
  nodes.forEach(n => {
    if ((inDegree.get(n.id) || 0) === 0) {
      queue.push(n.id);
    }
  });

  const batches: string[][] = [];
  let processedCount = 0;

  while (queue.length > 0) {
    const currentBatch: string[] = [...queue];
    queue.length = 0; // drain
    batches.push(currentBatch);
    processedCount += currentBatch.length;

    for (const u of currentBatch) {
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        const nextDegree = (inDegree.get(v) || 0) - 1;
        inDegree.set(v, nextDegree);
        if (nextDegree === 0) {
          queue.push(v);
        }
      }
    }
  }

  return {
    batches,
    isCyclic: processedCount !== nodes.length
  };
}

/**
 * Causal Path Tracer
 * Traverses upstream (prerequisites) and downstream (blast radius) from a target node.
 */
export function getCausalPath(targetNodeId: string, edges: TopologyEdge[]): CausalPath {
  const upstreamIds = new Set<string>();
  const downstreamIds = new Set<string>();

  // Map incoming and outgoing
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();

  edges.forEach(e => {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e.target);

    if (!incoming.has(e.target)) incoming.set(e.target, []);
    incoming.get(e.target)!.push(e.source);
  });

  // BFS Upstream
  const upQueue = [targetNodeId];
  while (upQueue.length > 0) {
    const curr = upQueue.shift()!;
    const sources = incoming.get(curr) || [];
    for (const s of sources) {
      if (!upstreamIds.has(s)) {
        upstreamIds.add(s);
        upQueue.push(s);
      }
    }
  }

  // BFS Downstream
  const downQueue = [targetNodeId];
  while (downQueue.length > 0) {
    const curr = downQueue.shift()!;
    const targets = outgoing.get(curr) || [];
    for (const t of targets) {
      if (!downstreamIds.has(t)) {
        downstreamIds.add(t);
        downQueue.push(t);
      }
    }
  }

  return { upstreamIds, downstreamIds };
}

/**
 * Dagre Auto-Layout for Clean Hierarchical Alignment
 */
export function calculateDagreLayout(
  nodes: TopologyNode[],
  edges: TopologyEdge[],
  direction: 'LR' | 'TB' = 'LR'
): { [id: string]: { x: number; y: number } } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isVertical = direction === 'TB';
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: isVertical ? 65 : 120,
    ranksep: isVertical ? 110 : 180,
    marginx: isVertical ? 30 : 50,
    marginy: isVertical ? 30 : 50
  });

  const nodeWidth = isVertical ? 290 : 320;
  const nodeHeight = isVertical ? 150 : 160;

  nodes.forEach(n => {
    dagreGraph.setNode(n.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach(e => {
    dagreGraph.setEdge(e.source, e.target);
  });

  dagre.layout(dagreGraph);

  const positions: { [id: string]: { x: number; y: number } } = {};
  nodes.forEach(n => {
    const nodeWithPos = dagreGraph.node(n.id);
    if (nodeWithPos) {
      positions[n.id] = {
        x: Math.round(nodeWithPos.x - nodeWidth / 2),
        y: Math.round(nodeWithPos.y - nodeHeight / 2)
      };
    }
  });

  return positions;
}
