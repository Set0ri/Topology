import yaml from 'js-yaml';
import { TopologyNode, TopologyEdge, AgentActionContext, NodeType, NodeStatus, Priority, AgentRole } from '../types/topology';

export interface ObsidianCanvasNode {
  id: string;
  type: 'text' | 'file' | 'link' | 'group';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
}

export interface ObsidianCanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: 'top' | 'right' | 'bottom' | 'left';
  toSide?: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  color?: string;
}

export interface ObsidianCanvasData {
  nodes: ObsidianCanvasNode[];
  edges: ObsidianCanvasEdge[];
}

/**
 * Serializes Topology graph into native Obsidian JSON Canvas (.canvas) string.
 */
export function exportToObsidianCanvas(nodes: TopologyNode[], edges: TopologyEdge[]): string {
  const canvasNodes: ObsidianCanvasNode[] = nodes.map(n => {
    // Generate YAML Frontmatter
    const frontmatterObj = {
      type: n.type,
      status: n.status,
      priority: n.priority,
      tags: n.tags,
      role: n.context.role,
      tools: n.context.toolsRequired,
      inputs: n.context.inputArtifacts,
      outputs: n.context.outputArtifacts,
      validation: n.context.validationCriteria,
      fallback: n.context.fallbackAction,
      estimatedMinutes: n.context.estimatedMinutes,
    };

    const frontmatterStr = yaml.dump(frontmatterObj).trim();
    const markdownBody = `---\n${frontmatterStr}\n---\n\n### ${n.label}\n\n${n.description}`;

    return {
      id: n.id,
      type: 'text',
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
      width: 280,
      height: 140,
      text: markdownBody,
    };
  });

  const canvasEdges: ObsidianCanvasEdge[] = edges.map(e => ({
    id: e.id,
    fromNode: e.source,
    toNode: e.target,
    fromSide: 'right',
    toSide: 'left',
    label: e.label,
  }));

  const canvasData: ObsidianCanvasData = {
    nodes: canvasNodes,
    edges: canvasEdges,
  };

  return JSON.stringify(canvasData, null, 2);
}

/**
 * Imports native Obsidian JSON Canvas (.canvas) into typed Topology graph.
 */
export function importFromObsidianCanvas(jsonString: string): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
  const parsed = JSON.parse(jsonString) as ObsidianCanvasData;
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];

  (parsed.nodes || []).forEach(cn => {
    let label = 'Untitled Node';
    let description = '';
    let nodeType: NodeType = 'task';
    let status: NodeStatus = 'ready';
    let priority: Priority = 'medium';
    let role: AgentRole = 'GeneralAgent';
    let tools: string[] = [];
    let inputs: string[] = [];
    let outputs: string[] = [];
    let validation = '';
    let fallback = '';
    let tags: string[] = [];
    let estimatedMinutes = 15;

    if (cn.text) {
      const frontmatterMatch = cn.text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (frontmatterMatch) {
        try {
          const fm = yaml.load(frontmatterMatch[1]) as Record<string, any>;
          if (fm) {
            if (fm.type) nodeType = fm.type as NodeType;
            if (fm.status) status = fm.status as NodeStatus;
            if (fm.priority) priority = fm.priority as Priority;
            if (fm.role) role = fm.role as AgentRole;
            if (Array.isArray(fm.tools)) tools = fm.tools;
            if (Array.isArray(fm.inputs)) inputs = fm.inputs;
            if (Array.isArray(fm.outputs)) outputs = fm.outputs;
            if (fm.validation) validation = String(fm.validation);
            if (fm.fallback) fallback = String(fm.fallback);
            if (Array.isArray(fm.tags)) tags = fm.tags;
            if (fm.estimatedMinutes) estimatedMinutes = Number(fm.estimatedMinutes);
          }
        } catch {
          // fallback to defaults if frontmatter parse fails
        }

        const body = frontmatterMatch[2].trim();
        const headerMatch = body.match(/^###?\s*(.*?)(?:\n|$)([\s\S]*)$/);
        if (headerMatch) {
          label = headerMatch[1].trim();
          description = headerMatch[2].trim();
        } else {
          label = body.split('\n')[0] || 'Node';
          description = body;
        }
      } else {
        label = cn.text.split('\n')[0].replace(/^#+\s*/, '') || 'Node';
        description = cn.text;
      }
    }

    const context: AgentActionContext = {
      role,
      promptTemplate: description,
      toolsRequired: tools,
      inputArtifacts: inputs,
      outputArtifacts: outputs,
      validationCriteria: validation,
      fallbackAction: fallback,
      estimatedMinutes,
    };

    nodes.push({
      id: cn.id,
      type: nodeType,
      label,
      description,
      status,
      priority,
      tags,
      context,
      position: { x: cn.x || 0, y: cn.y || 0 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  (parsed.edges || []).forEach(ce => {
    edges.push({
      id: ce.id,
      source: ce.fromNode,
      target: ce.toNode,
      type: 'depends_on',
      label: ce.label,
    });
  });

  return { nodes, edges };
}

/**
 * Exports graph as a Mermaid flowchart string.
 */
export function exportToMermaid(nodes: TopologyNode[], edges: TopologyEdge[]): string {
  let mm = 'flowchart LR\n';
  nodes.forEach(n => {
    const safeLabel = n.label.replace(/"/g, "'");
    mm += `    ${n.id}["[${n.type.toUpperCase()}] ${safeLabel}"]\n`;
  });
  edges.forEach(e => {
    const label = e.label ? `|${e.label}|` : '';
    mm += `    ${e.source} -->${label} ${e.target}\n`;
  });
  return mm;
}

export interface UniversalAgentManifest {
  schemaVersion: '1.0.0';
  generator: 'Topology Agent Workspace';
  exportedAt: string;
  graph: {
    totalNodes: number;
    totalEdges: number;
    entryNodes: string[];
    terminalNodes: string[];
  };
  tasks: Array<{
    id: string;
    label: string;
    description: string;
    type: NodeType;
    status: NodeStatus;
    priority: Priority;
    agent: {
      role?: string;
      promptTemplate: string;
      tools: string[];
      requiresHumanApproval: boolean;
    };
    contracts: {
      inputArtifacts: string[];
      outputArtifacts: string[];
      validationCriteria: string;
      stoppingCondition?: string;
    };
    dependencies: {
      upstreamNodeIds: string[];
      downstreamNodeIds: string[];
    };
  }>;
}

/**
 * Serializes Topology graph into machine-executable Universal Agent Manifest (UAM / MCP).
 * Compatible with Gemini CLI, LangChain, AutoGen, and CrewAI pipelines.
 */
export function exportToUniversalAgentManifest(nodes: TopologyNode[], edges: TopologyEdge[]): string {
  const incomingMap: Record<string, string[]> = {};
  const outgoingMap: Record<string, string[]> = {};

  nodes.forEach(n => {
    incomingMap[n.id] = [];
    outgoingMap[n.id] = [];
  });

  edges.forEach(e => {
    if (outgoingMap[e.source]) outgoingMap[e.source].push(e.target);
    if (incomingMap[e.target]) incomingMap[e.target].push(e.source);
  });

  const entryNodes = nodes.filter(n => incomingMap[n.id].length === 0).map(n => n.id);
  const terminalNodes = nodes.filter(n => outgoingMap[n.id].length === 0).map(n => n.id);

  const manifest: UniversalAgentManifest = {
    schemaVersion: '1.0.0',
    generator: 'Topology Agent Workspace',
    exportedAt: new Date().toISOString(),
    graph: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      entryNodes,
      terminalNodes,
    },
    tasks: nodes.map(n => ({
      id: n.id,
      label: n.label,
      description: n.description,
      type: n.type,
      status: n.status,
      priority: n.priority,
      agent: {
        role: n.context.role,
        promptTemplate: n.context.promptTemplate || n.description,
        tools: n.context.toolsRequired || [],
        requiresHumanApproval: Boolean(n.context.requiresHumanApproval),
      },
      contracts: {
        inputArtifacts: n.context.inputArtifacts || [],
        outputArtifacts: n.context.outputArtifacts || [],
        validationCriteria: n.context.validationCriteria || 'Zero regressions',
        stoppingCondition: n.context.stoppingCondition?.expression,
      },
      dependencies: {
        upstreamNodeIds: incomingMap[n.id] || [],
        downstreamNodeIds: outgoingMap[n.id] || [],
      },
    })),
  };

  return JSON.stringify(manifest, null, 2);
}

