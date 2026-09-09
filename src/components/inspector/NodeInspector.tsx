import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Bot, 
  Cpu,
  Wrench, 
  FileText, 
  ArrowDownRight, 
  ArrowUpRight, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  Sparkles,
  FolderTree,
  Terminal,
  Repeat,
  ArrowRight,
  Layers,
  Database,
  UserCheck,
  Copy,
  Check,
  Download,
  Code2,
  GitBranch,
  ShieldAlert,
  Play,
  Users,
  Brain
} from 'lucide-react';
import { useTopologyStore, createSyntheticArtifactPayload } from '../../store/useTopologyStore';
import { NodeStatus, Priority, AgentRole, ArtifactPayload, ExecutionType, ModelEngine, MultiAgentCollaborationMode, AgentWorker } from '../../types/topology';
import { getNodeTypeColor, getStatusColor } from '../../utils/catppuccin';
import { generateAgentPromptPayload } from '../../utils/agentHandoff';

type InspectorTab = 'overview' | 'squad' | 'artifacts' | 'context' | 'telemetry' | 'hitl';

export const NodeInspector: React.FC = () => {
  const selectedNodeId = useTopologyStore(s => s.selectedNodeId);
  const selectNode = useTopologyStore(s => s.selectNode);
  const nodes = useTopologyStore(s => s.nodes);
  const edges = useTopologyStore(s => s.edges);
  const updateNode = useTopologyStore(s => s.updateNode);
  const deleteNode = useTopologyStore(s => s.deleteNode);
  const theme = useTopologyStore(s => s.theme);
  const enterSubgraph = useTopologyStore(s => s.enterSubgraph);
  const runAutonomousAgent = useTopologyStore(s => s.runAutonomousAgent);
  const approveNode = useTopologyStore(s => s.approveNode);
  const rejectNode = useTopologyStore(s => s.rejectNode);
  const toggleApprovalRequired = useTopologyStore(s => s.toggleApprovalRequired);
  const evaluateDecisionBranch = useTopologyStore(s => s.evaluateDecisionBranch);
  const globalSquad = useTopologyStore(s => s.globalSquad);
  const assignAgentToNode = useTopologyStore(s => s.assignAgentToNode);
  const removeAgentFromNode = useTopologyStore(s => s.removeAgentFromNode);
  const setNodeCollaborationMode = useTopologyStore(s => s.setNodeCollaborationMode);
  const sharedContext = useTopologyStore(s => s.sharedContext);
  const writeSharedContext = useTopologyStore(s => s.writeSharedContext);
  const clearSharedContext = useTopologyStore(s => s.clearSharedContext);
  const setViewingArtifact = useTopologyStore(s => s.setViewingArtifact);

  const [activeTab, setActiveTab] = useState<InspectorTab>('overview');
  const [selectedArtifactName, setSelectedArtifactName] = useState<string | null>(null);
  const [copiedArtifact, setCopiedArtifact] = useState(false);
  const [copiedAgentPrompt, setCopiedAgentPrompt] = useState(false);
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [newContextKey, setNewContextKey] = useState('');
  const [newContextValue, setNewContextValue] = useState('');
  const [copiedContextKey, setCopiedContextKey] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() => 
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [newTool, setNewTool] = useState('');
  const [newInput, setNewInput] = useState('');
  const [newOutput, setNewOutput] = useState('');

  const node = nodes.find(n => n.id === selectedNodeId);

  if (!node) return null;

  const nodeContextMap = (sharedContext?.nodes && node) ? (sharedContext.nodes[node.id] || {}) : {};
  const nodeContextEntries = Object.values(nodeContextMap);

  const typeColor = getNodeTypeColor(node.type, theme);
  const statusColor = getStatusColor(node.status, theme);

  // Artifact payloads
  const payloads: Record<string, ArtifactPayload> = node.context?.artifactPayloads || {};
  const artifactNames = Object.keys(payloads);
  const activePayload = selectedArtifactName && payloads[selectedArtifactName] 
    ? payloads[selectedArtifactName] 
    : artifactNames.length > 0 
      ? payloads[artifactNames[0]] 
      : null;

  const handleCopyArtifact = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedArtifact(true);
    setTimeout(() => setCopiedArtifact(false), 2000);
  };

  const handleDownloadArtifact = (name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateSyntheticPayload = (artifactName: string) => {
    const payload = createSyntheticArtifactPayload(artifactName, node.context.role, node.label);
    updateNode(node.id, {
      context: {
        ...node.context,
        artifactPayloads: {
          ...(node.context.artifactPayloads || {}),
          [artifactName]: payload,
        },
      },
    });
    setSelectedArtifactName(artifactName);
  };

  const handleAddTool = () => {
    if (!newTool.trim()) return;
    const tools = node.context?.toolsRequired || [];
    if (!tools.includes(newTool.trim())) {
      updateNode(node.id, {
        context: { ...node.context, toolsRequired: [...tools, newTool.trim()] }
      });
    }
    setNewTool('');
  };

  const handleRemoveTool = (toolToRemove: string) => {
    const tools = (node.context?.toolsRequired || []).filter(t => t !== toolToRemove);
    updateNode(node.id, {
      context: { ...node.context, toolsRequired: tools }
    });
  };

  const handleAddInput = () => {
    if (!newInput.trim()) return;
    const inputs = node.context?.inputArtifacts || [];
    if (!inputs.includes(newInput.trim())) {
      updateNode(node.id, {
        context: { ...node.context, inputArtifacts: [...inputs, newInput.trim()] }
      });
    }
    setNewInput('');
  };

  const handleRemoveInput = (item: string) => {
    const inputs = (node.context?.inputArtifacts || []).filter(i => i !== item);
    updateNode(node.id, {
      context: { ...node.context, inputArtifacts: inputs }
    });
  };

  const handleAddOutput = () => {
    if (!newOutput.trim()) return;
    const outputs = node.context?.outputArtifacts || [];
    const trimmed = newOutput.trim();
    if (!outputs.includes(trimmed)) {
      updateNode(node.id, {
        context: { ...node.context, outputArtifacts: [...outputs, trimmed] }
      });
      // Also prime synthetic artifact
      handleGenerateSyntheticPayload(trimmed);
    }
    setNewOutput('');
  };

  const handleRemoveOutput = (item: string) => {
    const outputs = (node.context?.outputArtifacts || []).filter(o => o !== item);
    const updatedPayloads = { ...(node.context?.artifactPayloads || {}) };
    delete updatedPayloads[item];
    updateNode(node.id, {
      context: { 
        ...node.context, 
        outputArtifacts: outputs,
        artifactPayloads: updatedPayloads,
      }
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={isMobile ? { y: '100%', opacity: 0 } : { x: 420, opacity: 0 }}
        animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
        exit={isMobile ? { y: '100%', opacity: 0 } : { x: 420, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 sm:bottom-4 right-0 sm:right-4 top-auto sm:top-16 w-full sm:w-[420px] max-h-[85vh] sm:max-h-[calc(100vh-5rem)] z-40 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 bg-white/95 dark:bg-[#181a24]/95 text-[#202124] dark:text-[#f8fafc] backdrop-blur-2xl shadow-elevated-2xl border-none flex flex-col overflow-hidden transition-colors duration-200"
      >
        {/* Mobile Drag Indicator */}
        <div 
          onClick={() => selectNode(null)}
          className="w-12 h-1.5 rounded-full bg-black/15 dark:bg-white/25 mx-auto mb-3 sm:hidden shrink-0 cursor-pointer"
          title="Tap to dismiss inspector"
        />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-none">
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full shadow-sm shrink-0" 
              style={{ backgroundColor: statusColor }} 
            />
            <span className="text-xs font-mono font-bold tracking-wider uppercase opacity-85" style={{ color: typeColor }}>
              {node.type}
            </span>
            {node.context.requiresHumanApproval && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#feefe3] text-[#c25100] dark:bg-[#e8710a]/20 dark:text-[#fa903e]">
                <ShieldAlert size={10} />
                <span>HITL</span>
              </span>
            )}
          </div>
          <button
            onClick={() => selectNode(null)}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 mb-4 rounded-2xl bg-black/4 dark:bg-white/5 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-medium transition-all border-none cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-cat-mocha-mantle text-cat-latte-sapphire dark:text-cat-mocha-sapphire shadow-elevated-sm font-semibold'
                : 'text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text'
            }`}
          >
            <Layers size={13} />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('squad')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-medium transition-all border-none cursor-pointer ${
              activeTab === 'squad'
                ? 'bg-white dark:bg-cat-mocha-mantle text-cat-latte-mauve dark:text-cat-mocha-mauve shadow-elevated-sm font-semibold'
                : 'text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text'
            }`}
          >
            <Users size={13} />
            <span>Squad</span>
            {(node.context?.assignedAgents?.length || 0) > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cat-latte-mauve/15 dark:bg-cat-mocha-mauve/20 text-cat-latte-mauve dark:text-cat-mocha-mauve font-mono font-bold">
                {node.context?.assignedAgents?.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('artifacts')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-medium transition-all border-none cursor-pointer ${
              activeTab === 'artifacts'
                ? 'bg-white dark:bg-cat-mocha-mantle text-cat-latte-teal dark:text-cat-mocha-teal shadow-elevated-sm font-semibold'
                : 'text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text'
            }`}
          >
            <Database size={13} />
            <span>Artifacts</span>
            {artifactNames.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cat-latte-teal/15 dark:bg-cat-mocha-teal/20 text-cat-latte-teal dark:text-cat-mocha-teal font-mono">
                {artifactNames.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('context')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-medium transition-all border-none cursor-pointer ${
              activeTab === 'context'
                ? 'bg-white dark:bg-cat-mocha-mantle text-purple-600 dark:text-purple-400 shadow-elevated-sm font-semibold'
                : 'text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text'
            }`}
          >
            <Brain size={13} />
            <span>Context</span>
            {nodeContextEntries.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/15 text-purple-500 font-mono font-bold">
                {nodeContextEntries.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('telemetry')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-medium transition-all border-none cursor-pointer ${
              activeTab === 'telemetry'
                ? 'bg-white dark:bg-cat-mocha-mantle text-cat-latte-mauve dark:text-cat-mocha-mauve shadow-elevated-sm font-semibold'
                : 'text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text'
            }`}
          >
            <Terminal size={13} />
            <span>Telemetry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hitl')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-medium transition-all border-none cursor-pointer ${
              activeTab === 'hitl'
                ? 'bg-white dark:bg-cat-mocha-mantle text-cat-latte-peach dark:text-cat-mocha-peach shadow-elevated-sm font-semibold'
                : 'text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text'
            }`}
          >
            <UserCheck size={13} />
            <span>HITL</span>
            {node.context.requiresHumanApproval && node.context.approvalStatus === 'pending' && (
              <span className="w-2 h-2 rounded-full bg-cat-mocha-peach animate-ping" />
            )}
          </button>
        </div>

        {/* Tab 1: Overview & Scope */}
        {activeTab === 'overview' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
            {/* Node Title */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1 block">
                Node Title
              </label>
              <input
                type="text"
                value={node.label}
                onChange={(e) => updateNode(node.id, { label: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm font-semibold bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text placeholder-cat-latte-overlay0 dark:placeholder-cat-mocha-overlay1 focus:outline-none focus:ring-1 focus:ring-cat-mocha-sapphire/50 border-none transition-all"
              />
            </div>

            {/* Status & Priority Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1 block">
                  Status
                </label>
                <select
                  value={node.status}
                  onChange={(e) => updateNode(node.id, { status: e.target.value as NodeStatus })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text focus:outline-none focus:ring-1 focus:ring-cat-mocha-sapphire/50 border-none cursor-pointer"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="ready">Ready</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1 block">
                  Priority
                </label>
                <select
                  value={node.priority}
                  onChange={(e) => updateNode(node.id, { priority: e.target.value as Priority })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text focus:outline-none focus:ring-1 focus:ring-cat-mocha-sapphire/50 border-none cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1 block">
                Description & Scope
              </label>
              <textarea
                rows={3}
                value={node.description}
                onChange={(e) => updateNode(node.id, { description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-xs leading-relaxed bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text placeholder-cat-latte-overlay0 dark:placeholder-cat-mocha-overlay1 focus:outline-none focus:ring-1 focus:ring-cat-mocha-sapphire/50 border-none resize-none transition-all"
              />
            </div>

            {/* Execution Mode & Engine Model Assignment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-cat-mocha-mauve" />
                  Execution Mode
                </label>
                <select
                  value={node.context?.executionType || 'autonomous_agent'}
                  onChange={(e) => {
                    const execType = e.target.value as ExecutionType;
                    const defaultEngine: ModelEngine = 
                      execType === 'automated_script' ? 'script-runner' :
                      execType === 'human_operator' ? 'human-operator' :
                      execType === 'conditional_router' ? 'script-runner' : 'gemini-2.5-pro';
                    updateNode(node.id, {
                      context: { 
                        ...node.context, 
                        executionType: execType,
                        modelEngine: defaultEngine,
                        requiresHumanApproval: execType === 'human_operator' ? true : node.context?.requiresHumanApproval
                      }
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text font-medium focus:outline-none focus:ring-1 focus:ring-cat-mocha-sapphire/50 border-none cursor-pointer"
                >
                  <option value="autonomous_agent">🤖 Autonomous AI</option>
                  <option value="automated_script">⚡ Script / Tool</option>
                  <option value="human_operator">👤 Human Gate</option>
                  <option value="conditional_router">🔀 Decision Router</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1 flex items-center gap-1.5">
                  <Cpu size={13} className="text-cat-mocha-sapphire" />
                  Engine / Runner
                </label>
                <select
                  value={node.context?.modelEngine || 'gemini-2.5-pro'}
                  onChange={(e) => updateNode(node.id, {
                    context: { ...node.context, modelEngine: e.target.value as ModelEngine }
                  })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-sapphire dark:text-cat-mocha-sapphire font-mono font-medium focus:outline-none focus:ring-1 focus:ring-cat-mocha-sapphire/50 border-none cursor-pointer"
                >
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
                  <option value="script-runner">Script Runner</option>
                  <option value="human-operator">Human Operator</option>
                </select>
              </div>
            </div>

            {/* Agent Prompt Instructions */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1 flex items-center gap-1.5">
                <FileText size={13} className="text-cat-mocha-sapphire" />
                Agent Prompt Instructions
              </label>
              <textarea
                rows={3}
                value={node.context?.promptTemplate || ''}
                onChange={(e) => updateNode(node.id, {
                  context: { ...node.context, promptTemplate: e.target.value }
                })}
                placeholder="System instructions or prompt template for this task..."
                className="w-full px-3 py-2 rounded-xl text-xs leading-relaxed font-mono bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text placeholder-cat-latte-overlay0 dark:placeholder-cat-mocha-overlay1 focus:outline-none focus:ring-1 focus:ring-cat-mocha-sapphire/50 border-none resize-none transition-all"
              />
            </div>

            {/* Agent Prompt Handoff (1-Click Copy for Gemini CLI / Claude) */}
            <div className="p-3.5 rounded-2xl bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/50 space-y-2 border-none">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cat-mocha-mauve dark:text-cat-mocha-mauve flex items-center gap-1.5">
                  <Bot size={13} />
                  Agent Prompt Handoff
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const payload = generateAgentPromptPayload(node, nodes, edges);
                    navigator.clipboard.writeText(payload);
                    setCopiedAgentPrompt(true);
                    setTimeout(() => setCopiedAgentPrompt(false), 2000);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-cat-mocha-mauve/20 hover:bg-cat-mocha-mauve/30 text-cat-mocha-mauve transition-all border-none cursor-pointer"
                >
                  {copiedAgentPrompt ? <Check size={12} className="text-cat-mocha-green" /> : <Copy size={12} />}
                  <span>{copiedAgentPrompt ? 'Copied Full Prompt!' : 'Copy Agent Prompt'}</span>
                </button>
              </div>
              <p className="text-[11px] text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 leading-relaxed">
                Generates a structured prompt containing the assigned role (<span className="font-mono">{node.context?.role || 'Architect'}</span>), upstream input schemas, required tools, and validation criteria for Gemini CLI, Claude, or Cursor agents.
              </p>
            </div>

            {/* NESTED SUB-GRAPH TOPOLOGY */}
            <div className="p-3.5 rounded-2xl bg-cat-latte-surface0/60 dark:bg-cat-mocha-surface0/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cat-latte-mauve dark:text-cat-mocha-mauve flex items-center gap-1.5">
                  <FolderTree size={13} />
                  Nested Sub-Graph
                </span>
                <button
                  type="button"
                  onClick={() => enterSubgraph(node.id)}
                  className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium bg-cat-latte-surface1/80 dark:bg-cat-mocha-surface0 hover:bg-cat-latte-surface1 dark:hover:bg-cat-mocha-surface1 text-cat-latte-mauve dark:text-cat-mocha-mauve transition-colors border-none cursor-pointer"
                >
                  <span>{node.subgraph && node.subgraph.nodes.length > 0 ? 'Open Sub-Graph' : 'Attach Sub-Graph'}</span>
                  <ArrowRight size={12} />
                </button>
              </div>
              <p className="text-[11px] text-cat-latte-subtext0 dark:text-cat-mocha-subtext0">
                {node.subgraph && node.subgraph.nodes.length > 0
                  ? `Contains a nested sub-topology with ${node.subgraph.nodes.length} decomposed nodes.`
                  : 'Decompose this node into a nested child topology executing micro-tasks.'}
              </p>
            </div>

            {/* RECURSION GUARD */}
            <div className="p-3.5 rounded-2xl bg-cat-latte-surface0/60 dark:bg-cat-mocha-surface0/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cat-mocha-peach flex items-center gap-1.5">
                  <Repeat size={13} />
                  Recursion & Stopping Invariants
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(node.context?.stoppingCondition?.isRecursive || node.tags?.includes('recursive'))}
                  onChange={(e) => {
                    const isRec = e.target.checked;
                    updateNode(node.id, {
                      tags: isRec ? [...(node.tags || []), 'recursive'] : (node.tags || []).filter(t => t !== 'recursive'),
                      context: {
                        ...node.context,
                        stoppingCondition: {
                          expression: node.context?.stoppingCondition?.expression || (isRec ? 'iteration >= 3 || accuracy >= 0.95' : ''),
                          description: node.context?.stoppingCondition?.description || 'Max 3 iterations.',
                          maxIterations: 3,
                          isRecursive: isRec,
                        },
                      },
                    });
                  }}
                  className="rounded accent-cat-mocha-peach cursor-pointer"
                />
              </div>
              {node.context?.stoppingCondition?.isRecursive && (
                <input
                  type="text"
                  value={node.context?.stoppingCondition?.expression || ''}
                  onChange={(e) => updateNode(node.id, {
                    context: {
                      ...node.context,
                      stoppingCondition: {
                        expression: e.target.value,
                        description: 'Exit invariant',
                        maxIterations: 3,
                        isRecursive: true,
                      },
                    },
                  })}
                  placeholder="e.g. iteration >= 3 || accuracy >= 0.95"
                  className="w-full px-3 py-1.5 rounded-xl text-xs font-mono bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text focus:outline-none border-none"
                />
              )}
            </div>
          </div>
        )}

        {/* Tab: Multi-Agent Squad & Asynchronous Collaboration */}
        {activeTab === 'squad' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
            {/* Collaboration Mode Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-mauve dark:text-cat-mocha-mauve flex items-center gap-1.5">
                  <Users size={13} />
                  Collaboration Strategy
                </label>
              </div>

              <div className="space-y-1.5">
                {[
                  {
                    id: 'solo',
                    label: 'Single Agent',
                    icon: '🤖',
                    desc: 'Isolated execution by primary assigned agent.',
                  },
                  {
                    id: 'debate_consensus',
                    label: 'Consensus Debate',
                    icon: '⚖️',
                    desc: 'Multiple agents debate proposals and vote before advancing.',
                  },
                  {
                    id: 'pair_programming',
                    label: 'Pair Execution',
                    icon: '👥',
                    desc: 'Driver agent produces code while Observer audits in lockstep.',
                  },
                  {
                    id: 'parallel_subtasks',
                    label: 'Parallel Subtasks',
                    icon: '⚡',
                    desc: 'Agents decompose node into concurrent asynchronous work units.',
                  },
                  {
                    id: 'critique_refine',
                    label: 'Critique & Refine',
                    icon: '🔍',
                    desc: 'Generator outputs artifact, Critic flags issues, Generator refines.',
                  },
                ].map((mode) => {
                  const isSelected = (node.context?.collaborationMode || 'solo') === mode.id;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => setNodeCollaborationMode(node.id, mode.id as MultiAgentCollaborationMode)}
                      className={`p-2.5 rounded-2xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cat-latte-mauve/15 dark:bg-cat-mocha-mauve/20 shadow-xs'
                          : 'bg-black/3 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{mode.icon}</span>
                          <span className="text-xs font-semibold text-cat-latte-text dark:text-cat-mocha-text">
                            {mode.label}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 size={14} className="text-cat-latte-mauve dark:text-cat-mocha-mauve" />
                        )}
                      </div>
                      <p className="text-[10.5px] text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 mt-1 pl-6 leading-tight">
                        {mode.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Currently Assigned Agents on this Node */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 flex items-center gap-1.5">
                  <Bot size={13} />
                  Assigned Agents ({node.context?.assignedAgents?.length || 0})
                </label>
              </div>

              {(!node.context?.assignedAgents || node.context.assignedAgents.length === 0) ? (
                <div className="p-4 rounded-2xl bg-black/3 dark:bg-white/5 text-center text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 text-xs">
                  No specialized agents assigned yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {node.context.assignedAgents.map((worker: AgentWorker) => (
                    <div
                      key={worker.id}
                      className="p-3 rounded-2xl bg-black/3 dark:bg-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-cat-mocha-mantle shadow-xs flex items-center justify-center text-base shrink-0">
                          {worker.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-cat-latte-text dark:text-cat-mocha-text truncate">
                              {worker.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                worker.status === 'thinking' || worker.status === 'executing_tool'
                                  ? 'bg-[#1a73e8]/20 text-[#1a73e8] dark:text-[#8ab4f8] animate-pulse'
                                  : worker.status === 'debating'
                                  ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                  : worker.status === 'completed'
                                  ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                  : 'bg-black/5 dark:bg-white/10 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0'
                              }`}
                            >
                              {worker.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-[10px] text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 truncate">
                            {worker.role} &bull; <span className="font-mono">{worker.modelEngine}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAgentFromNode(node.id, worker.id)}
                        className="p-1.5 rounded-xl hover:bg-red-500/15 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer shrink-0"
                        title={`Remove ${worker.name} from this node`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Add Available Fleet Agents */}
            {(() => {
              const assignedIds = new Set((node.context?.assignedAgents || []).map(a => a.id));
              const availableSquad = globalSquad.filter(a => !assignedIds.has(a.id));

              if (availableSquad.length === 0) return null;

              return (
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1.5 block">
                    Available Squad Agents to Assign
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableSquad.map(agent => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => assignAgentToNode(node.id, agent)}
                        className="flex items-center gap-2 p-2 rounded-xl bg-black/3 dark:bg-white/5 hover:bg-[#1a73e8]/10 text-left transition-all border-none cursor-pointer group"
                      >
                        <span className="text-base">{agent.avatar}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold group-hover:text-[#1a73e8] dark:group-hover:text-[#8ab4f8] truncate">
                            {agent.name}
                          </div>
                          <div className="text-[9.5px] text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 truncate">
                            {agent.role}
                          </div>
                        </div>
                        <Plus size={12} className="opacity-40 group-hover:opacity-100 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Live Thought Stream Preview for this Node */}
            {node.context?.activeThought && (
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-sapphire dark:text-cat-mocha-sapphire mb-1.5 flex items-center gap-1.5">
                  <Terminal size={12} />
                  Live Asynchronous Thought Stream
                </label>
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 font-mono text-[11px] leading-relaxed text-cat-latte-text dark:text-cat-mocha-text break-words">
                  {node.context.activeThought}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Artifact Studio (Data Contracts & Viewer) */}
        {activeTab === 'artifacts' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar flex flex-col">
            {/* Produced / Captured Artifacts List */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-teal dark:text-cat-mocha-teal flex items-center gap-1.5">
                  <Database size={13} />
                  Artifact Registry & Live Payloads
                </label>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {artifactNames.length === 0 ? (
                  <p className="text-xs text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 italic py-1">
                    No active artifact payloads generated yet. Dispatch agent or add outputs below to synthesize.
                  </p>
                ) : (
                  artifactNames.map(name => {
                    const isSelected = activePayload?.name === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSelectedArtifactName(name)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono transition-all border-none cursor-pointer ${
                          isSelected
                            ? 'bg-cat-latte-teal dark:bg-cat-mocha-teal text-white dark:text-cat-mocha-base font-semibold shadow-elevated-sm'
                            : 'bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 text-cat-latte-teal dark:text-cat-mocha-teal hover:bg-cat-latte-surface1'
                        }`}
                      >
                        <Code2 size={12} />
                        <span>{name}</span>
                        <span className="text-[10px] opacity-75 font-normal">
                          ({payloads[name].sizeBytes}B)
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Artifact Payload Viewer */}
            {activePayload ? (
              <div className="p-3 rounded-2xl bg-cat-latte-surface0/60 dark:bg-cat-mocha-surface0/40 space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-1 border-b border-cat-latte-surface1 dark:border-cat-mocha-surface0/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cat-latte-teal dark:text-cat-mocha-teal">
                      {activePayload.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cat-latte-teal/15 text-cat-latte-teal dark:text-cat-mocha-teal font-mono">
                      {activePayload.mimeType}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewingArtifact({ artifact: activePayload, nodeId: node.id, nodeLabel: node.label })}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-cat-latte-teal/15 dark:bg-cat-mocha-teal/20 text-cat-latte-teal dark:text-cat-mocha-teal hover:opacity-90 transition-all border-none cursor-pointer"
                      title="Open full-screen elevated artifact inspector"
                    >
                      <Sparkles size={11} />
                      <span>Inspect & Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyArtifact(activePayload.content)}
                      className="p-1 rounded-lg hover:bg-cat-latte-surface1 dark:hover:bg-cat-mocha-surface1 text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 hover:text-cat-latte-text dark:hover:text-cat-mocha-text border-none cursor-pointer"
                      title="Copy payload"
                    >
                      {copiedArtifact ? <Check size={13} className="text-cat-mocha-green" /> : <Copy size={13} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadArtifact(activePayload.name, activePayload.content)}
                      className="p-1 rounded-lg hover:bg-cat-latte-surface1 dark:hover:bg-cat-mocha-surface1 text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 hover:text-cat-latte-text dark:hover:text-cat-mocha-text border-none cursor-pointer"
                      title="Download file"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 max-h-48 overflow-y-auto p-2 rounded-xl bg-cat-latte-mantle dark:bg-cat-mocha-crust font-mono text-[11px] leading-relaxed text-cat-latte-text dark:text-cat-mocha-text/90 custom-scrollbar select-text">
                  <pre className="whitespace-pre-wrap">{activePayload.content}</pre>
                </div>
              </div>
            ) : null}

            {/* Inputs Artifacts Management */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1 flex items-center gap-1.5">
                <ArrowDownRight size={13} className="text-cat-mocha-teal" />
                Required Upstream Input Artifacts
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(node.context?.inputArtifacts || []).map(inp => (
                  <span 
                    key={inp}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 text-cat-latte-teal dark:text-cat-mocha-teal"
                  >
                    {inp}
                    <button
                      onClick={() => handleRemoveInput(inp)}
                      className="hover:text-cat-mocha-red border-none bg-transparent cursor-pointer p-0"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newInput}
                  onChange={(e) => setNewInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddInput()}
                  placeholder="e.g. data_contract.json..."
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text placeholder-cat-latte-overlay0 dark:placeholder-cat-mocha-overlay1 focus:outline-none border-none"
                />
                <button
                  type="button"
                  onClick={handleAddInput}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 hover:bg-cat-latte-surface1 dark:hover:bg-cat-mocha-surface1 text-cat-latte-text dark:text-cat-mocha-text border-none cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Output Artifacts Produced */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1 flex items-center gap-1.5">
                <ArrowUpRight size={13} className="text-cat-mocha-green" />
                Declared Output Artifacts
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(node.context?.outputArtifacts || []).map(out => (
                  <span 
                    key={out}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 text-cat-latte-green dark:text-cat-mocha-green"
                  >
                    {out}
                    <button
                      onClick={() => handleRemoveOutput(out)}
                      className="hover:text-cat-mocha-red border-none bg-transparent cursor-pointer p-0"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newOutput}
                  onChange={(e) => setNewOutput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOutput()}
                  placeholder="e.g. topology_manifest.ts..."
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text placeholder-cat-latte-overlay0 dark:placeholder-cat-mocha-overlay1 focus:outline-none border-none"
                />
                <button
                  type="button"
                  onClick={handleAddOutput}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 hover:bg-cat-latte-surface1 dark:hover:bg-cat-mocha-surface1 text-cat-latte-text dark:text-cat-mocha-text border-none cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Node-Scoped Shared Context Blackboard */}
        {activeTab === 'context' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-purple-500 flex items-center gap-1.5">
                  <Brain size={13} />
                  Node Shared Context Blackboard
                </label>
              </div>
              <p className="text-xs text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 mb-3">
                Persistent shared memory scoped to <strong>{node.label}</strong>. Autonomous agents write invariants, contracts, and intermediate outputs here.
              </p>

              {/* Form to write node context */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newContextKey.trim()) return;
                  let parsed: unknown = newContextValue;
                  try {
                    parsed = JSON.parse(newContextValue);
                  } catch {
                    parsed = newContextValue;
                  }
                  writeSharedContext('node', newContextKey.trim(), parsed, 'agent-user', 'Supervisor', node.id);
                  setNewContextKey('');
                  setNewContextValue('');
                }}
                className="p-3 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 space-y-2 mb-3"
              >
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  + Add Node-Level Context Entry
                </div>
                <input
                  type="text"
                  placeholder="Key (e.g. verified_schema, auth_contract)"
                  value={newContextKey}
                  onChange={(e) => setNewContextKey(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl text-xs bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text border-none focus:outline-none"
                  required
                />
                <textarea
                  rows={2}
                  placeholder='Value JSON or text (e.g. {"status": "ok", "strict": true})'
                  value={newContextValue}
                  onChange={(e) => setNewContextValue(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl text-xs font-mono bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text border-none resize-none focus:outline-none"
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-all border-none cursor-pointer"
                  >
                    Save Context
                  </button>
                </div>
              </form>

              {/* List of context entries */}
              <div className="space-y-2">
                {nodeContextEntries.length === 0 ? (
                  <div className="p-4 rounded-xl text-center text-xs opacity-60 bg-black/5 dark:bg-white/5">
                    No context entries written for this node yet. Use the form above or call <code>topology_write_shared_context</code> from an agent.
                  </div>
                ) : (
                  nodeContextEntries.map((entry) => (
                    <div
                      key={entry.key}
                      className="p-3 rounded-2xl bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                          {entry.key}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(entry.value, null, 2));
                              setCopiedContextKey(entry.key);
                              setTimeout(() => setCopiedContextKey(null), 1800);
                            }}
                            className="p-1 rounded-lg text-xs opacity-60 hover:opacity-100 border-none bg-transparent cursor-pointer"
                            title="Copy JSON"
                          >
                            {copiedContextKey === entry.key ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => clearSharedContext('node', entry.key, node.id)}
                            className="p-1 rounded-lg text-xs opacity-60 hover:opacity-100 hover:text-red-500 border-none bg-transparent cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] opacity-60 font-sans">
                        Author: <strong>{entry.authorAgentRole || entry.authorAgentId || 'Agent'}</strong>
                      </div>
                      <div className="p-2 rounded-xl font-mono text-[10px] bg-cat-latte-mantle dark:bg-cat-mocha-crust overflow-x-auto select-text">
                        <pre className="m-0 whitespace-pre-wrap">
                          <code>{typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value, null, 2)}</code>
                        </pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Agent Telemetry & Terminal */}
        {activeTab === 'telemetry' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
            {/* Quick Dispatch Card */}
            <div className="p-3.5 rounded-2xl bg-cat-latte-surface0/60 dark:bg-cat-mocha-surface0/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    node.context.telemetry?.state === 'thinking' || node.context.telemetry?.state === 'executing_tool'
                      ? 'bg-cat-mocha-yellow animate-ping'
                      : node.context.telemetry?.state === 'completed'
                      ? 'bg-cat-mocha-green'
                      : 'bg-cat-mocha-overlay0'
                  }`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-cat-latte-text dark:text-cat-mocha-text">
                    Agent State: {node.context.telemetry?.state || 'idle'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => runAutonomousAgent(node.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cat-latte-mauve text-white dark:bg-cat-mocha-mauve dark:text-cat-mocha-base hover:opacity-90 transition-all border-none cursor-pointer shadow-elevated-sm"
                >
                  <Sparkles size={13} />
                  <span>Dispatch Agent</span>
                </button>
              </div>

              {/* Active Thought Bubble */}
              {node.context.telemetry?.liveThought && (
                <div className="p-2.5 rounded-xl bg-cat-latte-mantle/70 dark:bg-cat-mocha-crust/70 text-xs italic text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 flex items-start gap-2">
                  <Bot size={14} className="text-cat-latte-lavender dark:text-cat-mocha-lavender shrink-0 mt-0.5" />
                  <span>"{node.context.telemetry.liveThought}"</span>
                </div>
              )}
            </div>

            {/* Live Terminal Output */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 flex items-center gap-1.5">
                  <Terminal size={13} className="text-cat-latte-sapphire dark:text-cat-mocha-sapphire" />
                  Execution Logs
                </label>
                {node.context?.telemetry?.activeTool && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cat-latte-yellow/15 text-cat-latte-yellow dark:text-cat-mocha-yellow">
                    Tool: {node.context.telemetry.activeTool}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-cat-latte-mantle dark:bg-cat-mocha-crust font-mono text-[11px] text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 max-h-56 overflow-y-auto space-y-1 custom-scrollbar select-text">
                {(node.context?.telemetry?.terminalLogs || ['[Ready] Awaiting agent dispatch...']).map((log, i) => (
                  <div key={i} className="leading-relaxed whitespace-pre-wrap">{log}</div>
                ))}
              </div>
            </div>

            {/* Tools Required */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1 flex items-center gap-1.5">
                <Wrench size={13} className="text-cat-mocha-yellow" />
                Tools Required
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(node.context?.toolsRequired || []).map(tool => (
                  <span 
                    key={tool}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 text-cat-latte-yellow dark:text-cat-mocha-yellow"
                  >
                    {tool}
                    <button
                      onClick={() => handleRemoveTool(tool)}
                      className="hover:text-cat-mocha-red border-none bg-transparent cursor-pointer p-0"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTool}
                  onChange={(e) => setNewTool(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTool()}
                  placeholder="e.g. bash_run, read_file..."
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text placeholder-cat-latte-overlay0 dark:placeholder-cat-mocha-overlay1 focus:outline-none border-none"
                />
                <button
                  type="button"
                  onClick={handleAddTool}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 hover:bg-cat-latte-surface1 dark:hover:bg-cat-mocha-surface1 text-cat-latte-text dark:text-cat-mocha-text border-none cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Validation Criteria */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-cat-mocha-green" />
                Validation Criteria
              </label>
              <input
                type="text"
                value={node.context?.validationCriteria || ''}
                onChange={(e) => updateNode(node.id, {
                  context: { ...node.context, validationCriteria: e.target.value }
                })}
                placeholder="e.g. Invariant verified with 0 regressions"
                className="w-full px-3 py-2 rounded-xl text-xs bg-cat-latte-surface0/70 dark:bg-cat-mocha-surface0/60 text-cat-latte-text dark:text-cat-mocha-text focus:outline-none border-none"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Human-in-the-Loop & Decision Gates */}
        {activeTab === 'hitl' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
            {/* Approval Gate Toggle Card */}
            <div className="p-3.5 rounded-2xl bg-cat-latte-surface0/60 dark:bg-cat-mocha-surface0/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-cat-latte-peach dark:text-cat-mocha-peach block">
                    Supervisor Review Checkpoint
                  </span>
                  <span className="text-[11px] text-cat-latte-subtext0 dark:text-cat-mocha-subtext0">
                    Halt execution prior to downstream unblocking
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleApprovalRequired(node.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer ${
                    node.context.requiresHumanApproval
                      ? 'bg-cat-latte-peach text-white dark:bg-cat-mocha-peach dark:text-cat-mocha-base'
                      : 'bg-cat-latte-surface1 text-cat-latte-subtext0 dark:bg-cat-mocha-surface0 dark:text-cat-mocha-subtext0'
                  }`}
                >
                  {node.context.requiresHumanApproval ? 'Required' : 'Disabled'}
                </button>
              </div>

              {node.context.requiresHumanApproval && (
                <div className="p-2.5 rounded-xl bg-cat-latte-mantle/70 dark:bg-cat-mocha-crust/70 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cat-latte-overlay1 dark:text-cat-mocha-overlay2">Approval Status:</span>
                    <span className={`font-bold uppercase px-2 py-0.5 rounded-full ${
                      node.context.approvalStatus === 'approved'
                        ? 'bg-cat-latte-green/15 text-cat-latte-green dark:text-cat-mocha-green'
                        : node.context.approvalStatus === 'rejected'
                        ? 'bg-cat-latte-red/15 text-cat-latte-red dark:text-cat-mocha-red'
                        : 'bg-cat-latte-peach/15 text-cat-latte-peach dark:text-cat-mocha-peach animate-pulse'
                    }`}>
                      {node.context.approvalStatus || 'Pending Review'}
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 mb-1 block">
                      Supervisor Feedback / Sign-off Notes
                    </label>
                    <textarea
                      rows={2}
                      value={supervisorNotes}
                      onChange={(e) => setSupervisorNotes(e.target.value)}
                      placeholder="e.g. Verified artifact schemas and edge conditions..."
                      className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-cat-latte-surface0/80 dark:bg-cat-mocha-surface0/70 text-cat-latte-text dark:text-cat-mocha-text border-none resize-none focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => approveNode(node.id, supervisorNotes)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-cat-latte-green text-white dark:bg-cat-mocha-green dark:text-cat-mocha-base hover:opacity-90 transition-all border-none cursor-pointer shadow-elevated-sm"
                    >
                      <CheckCircle2 size={13} />
                      <span>Approve & Unblock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectNode(node.id, supervisorNotes)}
                      className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-cat-latte-red text-white dark:bg-cat-mocha-red dark:text-cat-mocha-base hover:opacity-90 transition-all border-none cursor-pointer"
                    >
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Decision Gate Conditional Branch Simulator */}
            {node.type === 'decision' && (
              <div className="p-3.5 rounded-2xl bg-cat-latte-surface0/60 dark:bg-cat-mocha-surface0/40 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-cat-latte-sapphire dark:text-cat-mocha-sapphire flex items-center gap-1.5">
                  <GitBranch size={13} />
                  Decision Gate Routing Simulator
                </span>

                <p className="text-[11px] text-cat-latte-subtext0 dark:text-cat-mocha-subtext0">
                  Simulate conditional branch activation. Testing true/false will evaluate this decision node and light up corresponding DAG branches.
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => evaluateDecisionBranch(node.id, true)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-cat-latte-green text-white dark:bg-cat-mocha-green dark:text-cat-mocha-base hover:opacity-90 transition-all border-none cursor-pointer"
                  >
                    <Play size={12} />
                    <span>Test Branch [TRUE]</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => evaluateDecisionBranch(node.id, false)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-cat-latte-peach text-white dark:bg-cat-mocha-peach dark:text-cat-mocha-base hover:opacity-90 transition-all border-none cursor-pointer"
                  >
                    <Play size={12} />
                    <span>Test Branch [FALSE]</span>
                  </button>
                </div>

                {node.context.decisionCondition?.evaluatedResult !== undefined && (
                  <div className="text-[11px] font-mono text-center pt-1 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0">
                    Last Evaluated: <span className="font-bold">{node.context.decisionCondition.evaluatedResult ? 'TRUE' : 'FALSE'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-3 mt-2 border-none flex items-center justify-between">
          <button
            type="button"
            onClick={() => deleteNode(node.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-cat-mocha-red hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 transition-colors border-none cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Delete Node</span>
          </button>
          <span className="text-[11px] text-cat-latte-overlay1 dark:text-cat-mocha-overlay1 font-mono">
            {node.id.slice(0, 14)}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
