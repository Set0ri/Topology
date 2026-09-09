export type NodeType = 
  | 'goal'        // Strategic objective or overarching target
  | 'task'        // Operational action step or execution unit
  | 'decision'    // Conditional branch or evaluation checkpoint
  | 'milestone'   // Critical sync-point or deliverable completion
  | 'artifact'    // Data entity, file, or schema output
  | 'agent';      // Specialized subagent or persona assignment

export type NodeStatus = 
  | 'draft'       // Newly planned, pending validation
  | 'pending'     // Waiting on upstream prerequisites
  | 'ready'       // Unblocked and ready for immediate execution
  | 'in_progress' // Agent actively executing step
  | 'completed'   // Step validated and successfully finished
  | 'blocked'     // Execution halted due to prerequisite failure
  | 'failed';     // Execution error encountered

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type ExecutionType = 
  | 'autonomous_agent'  // Autonomous LLM worker with prompt & tool calling
  | 'automated_script'  // Deterministic local script, shell, or API webhook
  | 'human_operator'    // Manual human review, authoring, or HITL sign-off
  | 'conditional_router'; // Dynamic branching evaluator

export type ModelEngine = 
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'claude-3-7-sonnet'
  | 'script-runner'
  | 'human-operator';

export type AgentRole = 
  | 'Architect' 
  | 'CodeGenerator' 
  | 'TestAuditor' 
  | 'Researcher' 
  | 'SecurityAnalyst' 
  | 'Synthesizer'
  | 'GeneralAgent';

export type EdgeType = 
  | 'depends_on'  // Source must complete before Target can start (causal dependency)
  | 'produces'    // Source generates Target (artifact creation)
  | 'subtask'     // Target is a decomposed child component of Source
  | 'triggers';   // Source dynamically invokes Target upon completion

export type AgentExecutionState = 
  | 'idle'
  | 'thinking'
  | 'executing_tool'
  | 'validating'
  | 'completed'
  | 'error';

export type AgentWorkStatus = 
  | 'idle'
  | 'queued'
  | 'ready'
  | 'thinking'
  | 'executing_tool'
  | 'reviewing'
  | 'debating'
  | 'completed'
  | 'blocked';

export type MultiAgentCollaborationMode = 
  | 'solo'              // Single assigned agent
  | 'parallel_subtasks' // Concurrently dividing sub-components
  | 'pair_programming' // Primary coder + auditor/linting
  | 'debate_consensus'  // Cross-agent debate and consensus
  | 'critique_refine';  // Generator + Critic feedback loop

export interface AgentWorker {
  id: string;
  name: string;
  role: AgentRole | string;
  avatar: string; // Emoji or short symbol, e.g. '🤖', '🛡️', '🎨', '🔬', '🧠', '⚡'
  color: string;  // Hex accent color, e.g. #1a73e8, #f9ab00, #9334e6, #1e8e3e, #ea4335, #007b83
  modelEngine: ModelEngine | string;
  status: AgentWorkStatus;
  currentThought?: string;
  activeTool?: string;
  progress?: number; // 0 to 100
  contributionRole?: 'primary' | 'reviewer' | 'critic' | 'debater' | 'auditor';
  assignedNodeId?: string;
  tools?: string[];
}

export interface AgentActivityEvent {
  id: string;
  timestamp: number;
  agentId: string;
  agentName: string;
  agentRole: string;
  agentColor: string;
  agentAvatar: string;
  nodeId: string;
  nodeLabel: string;
  actionType: 'claimed_node' | 'started_work' | 'thought' | 'tool_call' | 'handoff' | 'collaborated' | 'completed' | 'blocked';
  detail: string;
  tool?: string;
  artifactName?: string;
}

export interface AgentTelemetry {
  state: AgentExecutionState;
  activeTool?: string;
  liveThought?: string;
  terminalLogs: string[];
  lastUpdated: number;
}

export interface StoppingCondition {
  expression: string;     // e.g. "iteration >= 3 || test_coverage >= 90"
  description: string;
  maxIterations?: number;
  isRecursive: boolean;
}

export interface SubgraphData {
  id: string;
  label: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface ArtifactPayload {
  name: string;
  content: string;
  mimeType: 'text/markdown' | 'text/typescript' | 'application/json' | 'text/plain';
  sizeBytes: number;
  updatedAt: number;
  language?: string;
  authorRole?: string;
  description?: string;
}

export interface SharedContextEntry {
  key: string;
  value: unknown;
  authorAgent?: string;
  authorAgentId?: string;
  authorAgentRole?: string;
  authorRole?: string;
  nodeId?: string;
  scope?: 'global' | 'node';
  description?: string;
  updatedAt: number;
}

export interface SharedContextRepository {
  global: Record<string, SharedContextEntry>;
  nodes: Record<string, Record<string, SharedContextEntry>>;
}

export interface AgentActionContext {
  executionType?: ExecutionType;
  modelEngine?: ModelEngine;
  role?: AgentRole | string;
  promptTemplate: string;
  toolsRequired: string[];
  inputArtifacts: string[];
  outputArtifacts: string[];
  validationCriteria: string;
  fallbackAction?: string;
  estimatedMinutes?: number;
  executionLogs?: string[];
  telemetry?: AgentTelemetry;
  // Multi-Agent Collaboration
  collaborationMode?: MultiAgentCollaborationMode;
  assignedAgents?: AgentWorker[];
  activeThought?: string;
  stoppingCondition?: StoppingCondition;
  artifactPayloads?: Record<string, ArtifactPayload>;
  requiresHumanApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalNotes?: string;
  decisionCondition?: {
    expression: string;
    evaluatedResult?: boolean;
    evaluatedAt?: number;
  };
}

export interface TopologyNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  status: NodeStatus;
  priority: Priority;
  tags: string[];
  context: AgentActionContext;
  position: { x: number; y: number };
  progress?: number; // 0 to 100
  subgraph?: SubgraphData; // Nested sub-graph of same topology type
  createdAt: number;
  updatedAt: number;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  animated?: boolean;
  condition?: 'true' | 'false' | 'always';
  dataPayloadPassed?: string[];
}

export type LevelOfDetail = 'macro' | 'normal' | 'micro';

export type ThemeMode = 'default' | 'catpuccin' | 'light' | 'mocha' | 'latte';
export type ViewMode = '2d' | '3d';

export interface TopologyStats {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  ready: number;
  pending: number;
}

export interface CausalPath {
  upstreamIds: Set<string>;
  downstreamIds: Set<string>;
}

export type IssueSeverity = 'error' | 'warning' | 'info';
export type AutoFixType = 
  | 'CONNECT_ORPHAN' 
  | 'ADD_TERMINAL_MILESTONE' 
  | 'ADD_STOPPING_CONDITION' 
  | 'BREAK_CYCLE' 
  | 'SYNTHESIZE_MISSING_ARTIFACT';

export interface CoherenceIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  nodeIds: string[];
  autoFixType?: AutoFixType;
  fixLabel?: string;
}

export interface CoherenceReport {
  score: number; // 0 to 100
  issues: CoherenceIssue[];
  isHealthy: boolean;
  healthyCount: number;
  warningCount: number;
  errorCount: number;
}

export interface SubgraphStackFrame {
  parentId: string;
  parentLabel: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}
