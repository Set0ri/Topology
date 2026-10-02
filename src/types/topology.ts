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
  isDisconnected?: boolean;
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
  // Budget & Token Consumption Metrics
  budgetLimitUsd?: number;
  costUsd?: number;
  tokensUsed?: {
    input?: number;
    output?: number;
    total?: number;
  } | number;
  budget?: NodeBudgetMetrics;
}

export interface NodeBudgetMetrics {
  budgetLimitUsd?: number; // Allocated ceiling/budget limit for this node in USD
  costUsd?: number;        // Actual consumed cost for this node in USD
  inputTokens?: number;    // Prompt tokens consumed
  outputTokens?: number;   // Completion tokens consumed
  totalTokens?: number;    // Total tokens consumed
}

export interface PlanBudgetMetrics {
  budgetLimitUsd?: number;     // Total allocated budget ceiling for the plan in USD
  costUsd?: number;            // Total consumed spend in USD across all nodes
  remainingUsd?: number;       // Remaining budget headroom in USD
  utilizationPercent?: number; // Budget utilization percentage (0 - 100%)
  totalInputTokens?: number;   // Total prompt tokens across all nodes
  totalOutputTokens?: number;  // Total completion tokens across all nodes
  totalTokens?: number;        // Grand total tokens across all nodes
}

export type ResolvedNodeBudgetMetrics = Required<Omit<NodeBudgetMetrics, 'budgetLimitUsd'>> & { budgetLimitUsd?: number };
export type ResolvedPlanBudgetMetrics = Required<PlanBudgetMetrics>;

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
  budget?: NodeBudgetMetrics;
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

export interface NodeLock {
  resourceKey: string;
  resource?: string;
  nodeId?: string;
  agentId: string;
  agentName?: string;
  agentRole?: string;
  agentAvatar?: string;
  acquiredAt: number;
  expiresAt: number;
  remainingSeconds: number;
  ttlSeconds?: number;
  pid?: number;
  hostname?: string;
  metadata?: {
    reason?: string;
    [key: string]: unknown;
  };
}

export interface TopologyLogEntry {
  id: string;
  timestamp: number;
  agentId: string;
  agentRole?: string;
  action: string;
  nodeId?: string | null;
  thought?: string | null;
  toolName?: string | null;
  status?: string | null;
  resource?: string | null;
  payload?: Record<string, unknown> | null;
  details?: Record<string, any> | null;
  gitCommitHash?: string;
}

export interface GitSyncStatus {
  enabled: boolean;
  status?: 'synced' | 'diverged' | 'offline' | 'idle' | string;
  branch: string;
  remote: string;
  lastCommitHash?: string | null;
  lastSyncTimestamp?: number | null;
  lastSyncedAt?: number | string | null;
  isSyncing?: boolean;
  error?: string | null;
}

export type PlanStatus = 
  | 'active' 
  | 'inactive' 
  | 'paused' 
  | 'completed' 
  | 'archived' 
  | 'abandoned';

export interface TopologyPlanRecord {
  id: string;
  title: string;
  description?: string;
  agentId?: string;
  agentName?: string;
  agentRole?: string;
  agentAvatar?: string;
  agentColor?: string;
  author?: string;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  createdAt: number;
  updatedAt: number;
  status: PlanStatus;
  completedAt?: number;
  archivedAt?: number;
  abandonedAt?: number;
  abandonReason?: string;
  pausedAt?: number;
  summary?: string;
  artifacts?: string[];
  source?: string;
  latestThought?: string;
  activeTool?: string;
  oodaLoop?: OodaLoopTelemetry;
  budgetLimitUsd?: number;
  costUsd?: number;
  budget?: PlanBudgetMetrics;
}

export interface PlanSummary {
  id: string;
  title: string;
  description?: string;
  agentId?: string;
  agentName?: string;
  agentRole?: string;
  agentAvatar?: string;
  agentColor?: string;
  nodeCount: number;
  completedCount: number;
  inProgressCount: number;
  progressPercent: number;
  updatedAt: number;
  status: PlanStatus;
  completedAt?: number;
  archivedAt?: number;
  abandonedAt?: number;
  abandonReason?: string;
  pausedAt?: number;
  summary?: string;
  artifacts?: string[];
  hasActiveWork?: boolean;
  latestThought?: string;
  activeTool?: string;
  oodaLoop?: OodaLoopTelemetry;
  budgetLimitUsd?: number;
  costUsd?: number;
  budget?: PlanBudgetMetrics;
}

export interface ModelQuotaMetric {
  current: number;
  limit: number;
  safeLimit: number;
  percent: number;
}

export interface ModelTtr {
  windowSeconds: number;
  dailySeconds: number;
  formattedWindow: string;
  formattedDaily: string;
}

export interface ModelCostEstimate {
  sessionCostUsd: number;
  dailyCostUsd: number;
  allTimeCostUsd: number;
}

export interface ModelBudgetInfo {
  id: string;
  name: string;
  family: string;
  avatar: string;
  color: string;
  role: string;
  status: 'healthy' | 'approaching_limit' | 'safety_stopped' | 'throttled';
  rpm: ModelQuotaMetric;
  tpm: ModelQuotaMetric;
  daily: ModelQuotaMetric;
  ttr: ModelTtr;
  cost?: ModelCostEstimate;
  allTime: {
    totalTokens: number;
    totalRequests: number;
  };
}

export interface CouncilBudgetReport {
  timestamp: number;
  safetyThreshold: number;
  safetyReservePercent: number;
  models: Record<string, ModelBudgetInfo>;
  systemStatus: 'healthy' | 'approaching_limit' | 'safety_stopped';
  totalSessionCostUsd?: number;
  totalDailyCostUsd?: number;
  totalAllTimeCostUsd?: number;
}

export interface CouncilAdrReport {
  adrNumber: number;
  title: string;
  status: 'Proposed' | 'Accepted' | 'Superceded';
  filePath?: string;
  markdown: string;
  generatedAt: number;
}

export interface CouncilSessionSummary {
  id: string;
  planId: string;
  goal: string;
  timestamp: number;
  elapsedMs: number;
  roundsDeliberated: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  hasAdr: boolean;
  adrPath?: string;
  consensusSummary?: string;
}

export interface CouncilContribution {
  memberId: string;
  originalMemberId?: string;
  memberName: string;
  avatar: string;
  color: string;
  round: number;
  timestamp: number;
  tokensUsed: number;
  costUsd?: number;
  perspective: string;
  thought?: string;
  proposals?: string[];
  critiques?: string[];
  suggestedAmendments?: string;
  consensusSummary?: string;
  dag?: Array<{
    id: string;
    label: string;
    role: string;
    type: string;
    description: string;
    status: string;
  }>;
  edges?: Array<{ source: string; target: string; label: string }>;
}

export interface CouncilRound {
  round: number;
  title: string;
  contributions: CouncilContribution[];
}

export interface CouncilSession {
  id?: string;
  success: boolean;
  stoppedEarly?: boolean;
  reason?: string;
  message?: string;
  ttrSeconds?: number;
  planId?: string;
  goal?: string;
  elapsedMs?: number;
  roundsDeliberated?: number;
  totalTokensUsed?: number;
  timestamp?: number;
  adrPath?: string;
  contextFiles?: string[];
  constraints?: string[];
  specialists?: Record<string, string>;
  deliberationHistory?: CouncilRound[];
  consensus?: {
    perspective?: string;
    consensusSummary?: string;
    dag?: Array<{
      id: string;
      label: string;
      role: string;
      type: string;
      description: string;
      status: string;
    }>;
    edges?: Array<{ source: string; target: string; label: string }>;
  };
  adr?: CouncilAdrReport;
  estimatedCostUsd?: number;
  budgetReport?: CouncilBudgetReport;
  benchmarkReport?: CouncilBenchmarkReport;
}

// --------------------------------------------------------------------------
// Automated Benchmark & Consensus Confidence Scoring Types
// --------------------------------------------------------------------------

export interface ArchitecturalCoherenceReport {
  hasCycle: boolean;
  cycleNodeIds: string[];
  isCoherent: boolean;
  disconnectedNodeCount: number;
  terminalMilestoneCount: number;
  scorePct: number;
}

export interface ConstraintEvaluation {
  constraint: string;
  satisfied: boolean;
  confidence?: number;
  evidenceSnippet?: string;
  verifiedInLocation?: string;
}

export interface CritiqueResolution {
  critique: string;
  raisedBy?: string;
  resolvedBy?: string;
  mitigationAction?: string;
  resolved: boolean;
}

export interface CouncilBenchmarkReport {
  sessionId: string;
  timestamp: string;
  constraintSatisfactionPct: number;
  adversarialResolutionScorePct: number;
  consensusConfidencePct: number;
  architecturalCoherence: ArchitecturalCoherenceReport;
  overallScorePct: number;
  status: 'OPTIMAL' | 'VIABLE' | 'NEEDS_REFINEMENT';
  summary: string;
  constraintEvaluations?: ConstraintEvaluation[];
  critiqueResolutions?: CritiqueResolution[];
}

// --------------------------------------------------------------------------
// Multi-Loop OODA / Council Iteration Cycle Types
// --------------------------------------------------------------------------

export type OodaStage =
  | 'observe'
  | 'understand'
  | 'evaluate_with_council'
  | 'adversarial_council_evaluation'
  | 'each_member_plans'
  | 'share_and_vote_on_plan'
  | 'iterate_on_plan'
  | 'propose_plan'
  | 'update';

export interface OodaMemberPlan {
  memberId: string;
  memberName: string;
  avatar: string;
  role: string;
  proposal: string;
  voteScore?: number; // e.g. 1-10 or percentage
  feedback?: string;
}

export interface OodaLoopIteration {
  loopNumber: number;            // 1-based index (e.g. 1, 2, 3...)
  stage: OodaStage;               // current or completed stage
  stageName?: string;             // human-readable stage label
  thought?: string;               // agent's reasoning / findings
  observations?: string[];        // context gathered in 'observe'
  understandings?: string[];      // constraints/invariants analyzed in 'understand'
  councilEvaluations?: string[];  // council evaluation findings
  adversarialCritiques?: string[];// adversarial critiques raised
  memberPlans?: OodaMemberPlan[]; // individual plans from each member
  voteSummary?: string;           // result of share and vote
  refinements?: string[];         // amendments made in iterate on plan
  proposedPlanSummary?: string;   // proposed plan summary
  updatesApplied?: string[];      // updates applied to the topology graph or codebase
  metrics?: {
    tokensUsed?: number;
    costUsd?: number;
    durationMs?: number;
    consensusScorePercent?: number;
    invariantsVerifiedCount?: number;
  };
  status: 'in_progress' | 'completed' | 'converged' | 'repeating';
  timestamp: number;
}

export interface OodaLoopTelemetry {
  planId: string;
  totalLoopsCompleted: number;
  currentLoop: number;
  targetMaxLoops?: number;
  activeStage: OodaStage;
  isConverged: boolean;
  history: OodaLoopIteration[];
  updatedAt: number;
}

// --------------------------------------------------------------------------
// Real-Time Inter-Model Debate Streaming Types
// --------------------------------------------------------------------------

export type DeliberationPhase = 'ideate' | 'critique' | 'synthesize';

export type DebateChunkType =
  | 'thought'
  | 'proposal'
  | 'critique'
  | 'rebuttal'
  | 'synthesis'
  | 'status';

export interface CouncilDebateChunk {
  sessionId: string;
  planId: string;
  round: number;
  phase: DeliberationPhase;
  modelId: string;
  deltaText: string;
  tokensUsedDelta: number;
  costUsdDelta: number;
  timestamp: number;
  isComplete?: boolean;
  modelName?: string;
  avatar?: string;
  color?: string;
  chunkIndex?: number;
  chunkType?: DebateChunkType;
  totalTokensUsed?: number;
  totalCostUsd?: number;
}

export interface CouncilDebateMessage {
  id: string;
  sessionId: string;
  round: number;
  phase: DeliberationPhase;
  modelId: string;
  modelName: string;
  avatar: string;
  color: string;
  text: string;
  chunkType: DebateChunkType;
  timestamp: number;
  tokensUsed?: number;
  costUsd?: number;
}

