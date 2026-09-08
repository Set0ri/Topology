import { TopologyNode, TopologyEdge, CoherenceReport, CoherenceIssue } from '../types/topology';
import { detectCycles } from './graphAlgorithms';

/**
 * Validates the coherence of a topology graph and produces a structured diagnostic report.
 */
export function validateGraphCoherence(nodes: TopologyNode[], edges: TopologyEdge[]): CoherenceReport {
  const issues: CoherenceIssue[] = [];

  if (nodes.length === 0) {
    return {
      score: 100,
      issues: [],
      isHealthy: true,
      healthyCount: 0,
      warningCount: 0,
      errorCount: 0,
    };
  }

  // 1. Cycle & Deadlock Detection (Tarjan)
  const cycleResult = detectCycles(nodes, edges);
  if (cycleResult.hasCycle) {
    const cycleNodesList = Array.from(cycleResult.cycleNodeIds);
    issues.push({
      id: 'issue-cycle',
      severity: 'error',
      title: 'Cyclic Dependency Deadlock',
      description: `The graph contains a circular dependency loop involving ${cycleNodesList.length} node(s). The execution engine will deadlock.`,
      nodeIds: cycleNodesList,
      autoFixType: 'BREAK_CYCLE',
      fixLabel: 'Break Circular Dependency',
    });
  }

  // Build Adjacency & Degree Maps
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const incomingSources = new Map<string, string[]>();
  const outgoingTargets = new Map<string, string[]>();

  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    outDegree.set(n.id, 0);
    incomingSources.set(n.id, []);
    outgoingTargets.set(n.id, []);
  });

  edges.forEach(e => {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    outDegree.set(e.source, (outDegree.get(e.source) || 0) + 1);
    if (incomingSources.has(e.target)) incomingSources.get(e.target)!.push(e.source);
    if (outgoingTargets.has(e.source)) outgoingTargets.get(e.source)!.push(e.target);
  });

  // 2. Orphan / Disconnected Nodes (excluding lone root goal if only 1 node)
  const orphanNodes = nodes.filter(n => {
    if (nodes.length === 1) return false;
    const inD = inDegree.get(n.id) || 0;
    const outD = outDegree.get(n.id) || 0;
    return inD === 0 && outD === 0;
  });

  if (orphanNodes.length > 0) {
    orphanNodes.forEach(orphan => {
      issues.push({
        id: `issue-orphan-${orphan.id}`,
        severity: 'warning',
        title: `Disconnected Orphan Node: "${orphan.label}"`,
        description: `This node is unlinked from the causal manifold. It will neither be triggered nor deliver outputs.`,
        nodeIds: [orphan.id],
        autoFixType: 'CONNECT_ORPHAN',
        fixLabel: 'Connect to Active Graph',
      });
    });
  }

  // 3. Missing Terminal Milestone
  // If graph has tasks but zero milestones and multiple leaf nodes that never converge
  const hasMilestone = nodes.some(n => n.type === 'milestone');
  const leafNodes = nodes.filter(n => (outDegree.get(n.id) || 0) === 0);

  if (nodes.length > 3 && !hasMilestone && leafNodes.length > 1) {
    issues.push({
      id: 'issue-terminal-milestone',
      severity: 'warning',
      title: 'Missing Terminal Milestone',
      description: 'The workflow terminates in multiple disjoint branches without a shared milestone deliverable.',
      nodeIds: leafNodes.map(n => n.id),
      autoFixType: 'ADD_TERMINAL_MILESTONE',
      fixLabel: 'Synthesize Release Milestone',
    });
  }

  // 4. Missing Input Artifact Producers (Dangling Artifact Dependency)
  // Map of all produced artifacts
  const producedArtifacts = new Set<string>();
  nodes.forEach(n => {
    (n.context?.outputArtifacts || []).forEach(art => {
      if (art.trim()) producedArtifacts.add(art.trim().toLowerCase());
    });
  });

  nodes.forEach(n => {
    const declaredInputs = n.context?.inputArtifacts || [];
    const missingInputs = declaredInputs.filter(inp => {
      const clean = inp.trim().toLowerCase();
      // Allow general folders or initial specs without warning
      if (clean.endsWith('/') || clean.includes('brief') || clean.includes('legacy')) return false;
      return !producedArtifacts.has(clean);
    });

    if (missingInputs.length > 0) {
      issues.push({
        id: `issue-artifact-${n.id}`,
        severity: 'warning',
        title: `Unresolved Input Contract in "${n.label}"`,
        description: `Node expects artifacts [${missingInputs.join(', ')}] which are not produced by any upstream task.`,
        nodeIds: [n.id],
        autoFixType: 'SYNTHESIZE_MISSING_ARTIFACT',
        fixLabel: 'Synthesize Producer Step',
      });
    }
  });

  // 5. Infinite Recursion / Recursive Subgraph Safety Check
  nodes.forEach(n => {
    const isSelfRecursive = n.subgraph?.nodes.some(subN => subN.label === n.label || subN.id === n.id);
    const hasRecursiveTag = n.tags?.includes('recursive') || n.context?.stoppingCondition?.isRecursive;

    if (isSelfRecursive || hasRecursiveTag) {
      const hasStoppingCond = n.context?.stoppingCondition?.expression?.trim();
      if (!hasStoppingCond) {
        issues.push({
          id: `issue-recursion-${n.id}`,
          severity: 'error',
          title: `Unbounded Recursive Loop in "${n.label}"`,
          description: 'This node contains a recursive execution path without an explicit stopping condition or base case.',
          nodeIds: [n.id],
          autoFixType: 'ADD_STOPPING_CONDITION',
          fixLabel: 'Add Default Stopping Condition',
        });
      }
    }
  });

  // Compute Coherence Score (0 to 100)
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  const penalty = (errorCount * 22) + (warningCount * 8);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return {
    score,
    issues,
    isHealthy: errorCount === 0 && warningCount === 0,
    healthyCount: nodes.length - (errorCount + warningCount),
    warningCount,
    errorCount,
  };
}
