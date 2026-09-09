import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Cpu, 
  GitBranch, 
  Flag, 
  Package, 
  Bot, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Play, 
  Plus, 
  Trash2, 
  Maximize2,
  FolderTree,
  Sparkles,
  Zap,
  Repeat,
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  Code2,
  Terminal,
  UserCheck,
  Copy,
  Eye,
  Brain,
  Lock
} from 'lucide-react';
import { TopologyNode } from '../../types/topology';
import { useTopologyStore } from '../../store/useTopologyStore';
import { AgentSatelliteNodes } from './AgentSatelliteNodes';
import { getNodeTypeColor, getStatusColor, hexToRgba, getNodeCardStyling } from '../../utils/catppuccin';
import { generateAgentPromptPayload } from '../../utils/agentHandoff';

const getEngineLabel = (context?: TopologyNode['context']): string => {
  if (!context) return 'Gemini 2.5 Pro';
  if (context.executionType === 'automated_script') return 'Script Runner';
  if (context.executionType === 'human_operator') return 'Human Operator';
  if (context.executionType === 'conditional_router') return 'Decision Router';
  if (context.modelEngine === 'gemini-2.5-pro') return 'Gemini 2.5 Pro';
  if (context.modelEngine === 'gemini-2.5-flash') return 'Gemini 2.5 Flash';
  if (context.modelEngine === 'claude-3-7-sonnet') return 'Claude 3.7 Sonnet';
  if (context.modelEngine === 'script-runner') return 'Script Engine';
  if (context.modelEngine === 'human-operator') return 'Human Operator';
  if (context.role) return context.role;
  return 'Gemini 2.5 Pro';
};

const NodeTypeIcon: React.FC<{ type: TopologyNode['type']; color: string; size?: number }> = ({ type, color, size = 15 }) => {
  const iconProps = { size, style: { color } };
  switch (type) {
    case 'goal':
      return <Target {...iconProps} />;
    case 'task':
      return <Cpu {...iconProps} />;
    case 'decision':
      return <GitBranch {...iconProps} />;
    case 'milestone':
      return <Flag {...iconProps} />;
    case 'artifact':
      return <Package {...iconProps} />;
    case 'agent':
      return <Bot {...iconProps} />;
  }
};

const TopologyCustomNodeComponent: React.FC<NodeProps> = ({ id, data, selected }) => {
  const node = data as unknown as TopologyNode;
  const [isHovered, setIsHovered] = useState(false);

  const theme = useTopologyStore(s => s.theme);
  const lod = useTopologyStore(s => s.lod);
  const layoutDirection = useTopologyStore(s => s.layoutDirection);
  const isVertical = layoutDirection === 'TB';
  const isSelfHovered = useTopologyStore(s => s.hoveredNodeId === id);
  const isMultiSelected = useTopologyStore(s => s.selectedNodeIds.includes(id));
  const setHoveredNode = useTopologyStore(s => s.setHoveredNode);
  const selectNode = useTopologyStore(s => s.selectNode);
  const toggleNodeSelection = useTopologyStore(s => s.toggleNodeSelection);
  const updateNode = useTopologyStore(s => s.updateNode);
  const deleteNode = useTopologyStore(s => s.deleteNode);
  const branchChildNode = useTopologyStore(s => s.branchChildNode);
  const enterSubgraph = useTopologyStore(s => s.enterSubgraph);
  const runAutonomousAgent = useTopologyStore(s => s.runAutonomousAgent);
  const approveNode = useTopologyStore(s => s.approveNode);
  const rejectNode = useTopologyStore(s => s.rejectNode);
  const evaluateDecisionBranch = useTopologyStore(s => s.evaluateDecisionBranch);
  const setViewingArtifact = useTopologyStore(s => s.setViewingArtifact);
  const nodeLock = useTopologyStore(s => s.activeLocks[id] || s.activeLocks['node:' + id]);
  const nodeContextCount = useTopologyStore(s => Object.keys(s.sharedContext?.nodes?.[id] || {}).length);

  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const isElevated = isHovered || isSelfHovered || selected || isMultiSelected;

  const { 
    background, 
    boxShadow, 
    typeColor, 
    statusColor, 
    isDark,
    typeBadgeBg,
    typeBadgeText,
    typeLabel 
  } = getNodeCardStyling(
    node.type,
    node.status,
    node.priority,
    theme,
    selected || isMultiSelected,
    isHovered || isSelfHovered
  );

  const telemetry = node.context?.telemetry;
  const isAgentActive = telemetry?.state === 'thinking' || telemetry?.state === 'executing_tool' || telemetry?.state === 'validating';

  const hasSubgraph = Boolean(node.subgraph && node.subgraph.nodes && node.subgraph.nodes.length > 0);
  const isRecursive = Boolean(node.tags?.includes('recursive') || node.context?.stoppingCondition?.isRecursive);
  const isMissingStoppingCondition = isRecursive && !node.context?.stoppingCondition?.expression;
  const isHitlPending = node.context?.requiresHumanApproval && node.context?.approvalStatus === 'pending';
  const artifactPayloads = node.context?.artifactPayloads || {};
  const artifactList = Object.keys(artifactPayloads);
  const assignedAgents = node.context?.assignedAgents || [];
  const collaborationMode = node.context?.collaborationMode || (assignedAgents.length > 1 ? 'parallel_subtasks' : 'solo');
  const isMultiAgent = assignedAgents.length > 1;

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      toggleNodeSelection(id, true);
    } else {
      selectNode(id);
    }
  };

  const handleQuickStatusToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = 
      node.status === 'completed' ? 'pending' : 
      node.status === 'in_progress' ? 'completed' : 'in_progress';
    updateNode(id, { status: nextStatus });
  };

  const handleRunAgent = (e: React.MouseEvent) => {
    e.stopPropagation();
    runAutonomousAgent(id);
  };

  const handleBranch = (e: React.MouseEvent) => {
    e.stopPropagation();
    branchChildNode(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(id);
  };

  const handleInspect = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(id);
  };

  const handleEnterSubgraph = (e: React.MouseEvent) => {
    e.stopPropagation();
    enterSubgraph(id);
  };

  const handleQuickApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    approveNode(id, 'Quick-approved from canvas card');
  };

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { nodes, edges } = useTopologyStore.getState();
    const promptText = generateAgentPromptPayload(node, nodes, edges);
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleTestDecision = (e: React.MouseEvent, condition: boolean) => {
    e.stopPropagation();
    evaluateDecisionBranch(id, condition);
  };

  // Sleek handle styling helper
  const handleClasses = `!w-2 !h-2 !rounded-full !border-none transition-all duration-150 ${
    isHovered ? '!opacity-80 hover:!opacity-100 hover:!scale-150' : '!opacity-0'
  }`;

  // ==========================================
  // 1. MACRO LEVEL OF DETAIL (Zoom < 0.55)
  // Minimal high-altitude glowing beacon
  // ==========================================
  if (lod === 'macro') {
    return (
      <div
        className="relative group transition-all duration-150 cursor-pointer select-none"
        onMouseEnter={() => {
          setIsHovered(true);
          setHoveredNode(id);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setHoveredNode(null);
        }}
        onClick={handleCardClick}
      >
        {isVertical ? (
          <>
            <Handle type="target" position={Position.Top} style={{ backgroundColor: typeColor }} className={handleClasses} />
            <Handle type="source" position={Position.Bottom} style={{ backgroundColor: typeColor }} className={handleClasses} />
          </>
        ) : (
          <>
            <Handle type="target" position={Position.Left} style={{ backgroundColor: typeColor }} className={handleClasses} />
            <Handle type="source" position={Position.Right} style={{ backgroundColor: typeColor }} className={handleClasses} />
          </>
        )}

        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-xl border-none shadow-elevated-md transition-all duration-200 ${
            selected || isMultiSelected ? 'ring-2 ring-cat-mocha-sapphire/80 scale-105' : ''
          }`}
          style={{ background, boxShadow }}
        >
          <span 
            className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
            style={{ backgroundColor: statusColor }} 
          />
          <span className="text-[11px] font-bold tracking-tight truncate max-w-[130px]" style={{ color: isDark ? '#cdd6f4' : '#4c4f69' }}>
            {node.label}
          </span>
          <div className="shrink-0 opacity-70">
            <NodeTypeIcon type={node.type} color={typeColor} size={11} />
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // 2. NORMAL & MICRO LEVEL OF DETAIL (Normal vs Deep Dive)
  // ========================================================
  const isMicro = lod === 'micro';

  return (
    <div
      className="relative group transition-all duration-150"
      style={{
        zIndex: isElevated ? 1000 : 1,
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        setHoveredNode(id);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredNode(null);
      }}
      onClick={handleCardClick}
    >
      {/* Target & Source Handles */}
      {isVertical ? (
        <>
          <Handle type="target" position={Position.Top} style={{ backgroundColor: typeColor }} className={handleClasses} />
          <Handle type="source" position={Position.Bottom} style={{ backgroundColor: typeColor }} className={handleClasses} />
          <Handle type="target" position={Position.Left} style={{ backgroundColor: typeColor }} className={handleClasses} />
          <Handle type="source" position={Position.Right} style={{ backgroundColor: typeColor }} className={handleClasses} />
        </>
      ) : (
        <>
          <Handle type="target" position={Position.Left} style={{ backgroundColor: typeColor }} className={handleClasses} />
          <Handle type="source" position={Position.Right} style={{ backgroundColor: typeColor }} className={handleClasses} />
          <Handle type="target" position={Position.Top} style={{ backgroundColor: typeColor }} className={handleClasses} />
          <Handle type="source" position={Position.Bottom} style={{ backgroundColor: typeColor }} className={handleClasses} />
        </>
      )}

      {/* Satellite Worker Nodes indicating assigned agents */}
      <AgentSatelliteNodes 
        agents={assignedAgents} 
        nodeId={node.id} 
        nodeLabel={node.label} 
      />

      {/* Main Card */}
      <motion.div
        layout
        transition={{ layout: { duration: 0.18, ease: 'easeOut' } }}
        className={`rounded-2xl relative overflow-hidden backdrop-blur-2xl border-none outline-none select-none transition-all duration-200 cursor-pointer ${
          isMicro ? 'w-[340px] p-4' : 'w-[316px] p-3.5 sm:p-4'
        } ${isHovered ? '-translate-y-1' : ''}`}
        style={{ background, boxShadow }}
      >
        {/* Top Header: Minimal Type Badge, Status Beacon, Priority & Multi-Agent Avatars */}
        <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
          <div className="flex items-center gap-1.5 min-w-0">
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-medium text-[11px] tracking-wide shrink-0"
              style={{ backgroundColor: typeBadgeBg, color: typeBadgeText }}
            >
              <NodeTypeIcon type={node.type} color={typeColor} size={11} />
              <span>{typeLabel}</span>
            </div>

            {/* Overlapping Multi-Agent Avatar Cluster */}
            {assignedAgents.length > 0 && (
              <div 
                className="flex items-center -space-x-1.5 ml-0.5 shrink-0" 
                title={`Assigned Squad: ${assignedAgents.map(a => `${a.name} (${a.role})`).join(', ')}`}
              >
                {assignedAgents.map((agent) => {
                  const isActiveWorker = (node.status === 'in_progress' || isAgentActive) && (agent.status === 'thinking' || agent.status === 'executing_tool' || agent.status === 'debating');
                  return (
                    <div
                      key={agent.id}
                      className={`relative w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-white/95 dark:bg-[#202434] shadow-xs transition-transform hover:scale-125 hover:z-20 ${
                        isActiveWorker ? 'animate-pulse' : ''
                      }`}
                      style={{
                        boxShadow: isActiveWorker ? `0 0 0 1.5px ${agent.color}` : `0 0 0 1px ${agent.color}80`,
                      }}
                      title={`${agent.name} (${agent.role}) - ${agent.status}: ${agent.currentThought || 'Ready'}`}
                    >
                      <span>{agent.avatar}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Active Git Resource Lease Badge */}
            {nodeLock && (
              <div 
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border-none shrink-0"
                title={`Locked by agent "${nodeLock.agentId}" (TTL remaining: ${nodeLock.remainingSeconds}s)${nodeLock.metadata?.reason ? ` - ${nodeLock.metadata.reason}` : ''}`}
              >
                <Lock size={10} className="text-amber-500 animate-pulse" />
                <span className="truncate max-w-[60px]">{nodeLock.agentId}</span>
                <span className="opacity-75">{nodeLock.remainingSeconds}s</span>
              </div>
            )}

            {/* Status Beacon dot */}
            <span 
              className="relative flex h-2 w-2" 
              title={`Status: ${node.status}`}
            >
              {(node.status === 'in_progress' || isAgentActive) && (
                <span 
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ backgroundColor: statusColor }}
                />
              )}
              <span 
                className="relative inline-flex rounded-full h-2 w-2" 
                style={{ backgroundColor: statusColor }}
              />
            </span>

            {/* Priority pill */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              node.priority === 'critical'
                ? isDark ? 'bg-cat-mocha-red/15 text-cat-mocha-red font-semibold' : 'bg-cat-latte-red/12 text-cat-latte-red font-semibold'
                : node.priority === 'high'
                ? isDark ? 'bg-cat-mocha-peach/15 text-cat-mocha-peach font-semibold' : 'bg-cat-latte-peach/12 text-cat-latte-peach font-semibold'
                : isDark ? 'bg-cat-mocha-surface0/70 text-cat-mocha-subtext0' : 'bg-cat-latte-surface0 text-cat-latte-subtext0'
            }`}>
              {node.priority}
            </span>
          </div>
        </div>

        {/* Node Title & Collaboration Pill */}
        <div>
          <h3 className={`font-semibold text-xs leading-snug tracking-tight line-clamp-2 mb-1 relative z-10 ${
            isDark ? 'text-cat-mocha-text' : 'text-cat-latte-text'
          }`}>
            {node.label}
          </h3>

          {/* Collaboration Mode Pill if multi-agent */}
          {isMultiAgent && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 ${
                collaborationMode === 'debate_consensus'
                  ? 'bg-purple-100/80 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                  : collaborationMode === 'pair_programming'
                  ? 'bg-blue-100/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}>
                {collaborationMode === 'debate_consensus' ? '⚖️ Consensus Debate' :
                 collaborationMode === 'pair_programming' ? '👥 Pair Execution' :
                 '⚡ Parallel Swarm'}
              </span>
              <span className="text-[10px] opacity-60 font-mono">
                {assignedAgents.length} agents
              </span>
            </div>
          )}
        </div>

        {/* HITL Pending Review Checkpoint Alert */}
        {isHitlPending && (
          <div className={`my-2 p-2.5 rounded-2xl flex flex-col gap-2 text-xs font-medium backdrop-blur-md ${
            isDark ? 'bg-cat-mocha-peach/20 text-cat-mocha-peach' : 'bg-cat-latte-peach/15 text-cat-latte-peach'
          }`}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] font-bold">
                <ShieldAlert size={14} className="animate-pulse" />
                <span>Awaiting Sign-off</span>
              </span>
              {artifactList.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const firstArt = artifactPayloads[artifactList[0]];
                    if (firstArt) {
                      setViewingArtifact({
                        artifact: firstArt,
                        nodeId: node.id,
                        nodeLabel: node.label,
                      });
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-purple-500/20 text-purple-600 dark:text-purple-300 hover:bg-purple-500/30 transition-all border-none cursor-pointer"
                  title="Inspect deliverable before sign-off"
                >
                  <Eye size={11} />
                  <span>Review Deliverable</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={handleQuickApprove}
                className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-xl text-[10px] font-bold bg-cat-latte-green text-white dark:bg-cat-mocha-green dark:text-cat-mocha-base hover:opacity-95 transition-all border-none cursor-pointer shadow-xs"
              >
                <Check size={11} />
                <span>Approve & Send to Squad</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  rejectNode(node.id, 'Supervisor requested revision from card checkpoint');
                }}
                className="flex items-center justify-center gap-1 py-1 px-2 rounded-xl text-[10px] font-semibold bg-red-500/20 text-red-600 dark:text-red-300 hover:bg-red-500/30 transition-all border-none cursor-pointer"
              >
                <X size={11} />
                <span>Reject</span>
              </button>
            </div>
          </div>
        )}

        {/* Decision Gate Fast Branch Controls */}
        {node.type === 'decision' && (
          <div className="flex items-center justify-between gap-1.5 mb-1.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={(e) => handleTestDecision(e, true)}
              className={`flex-1 py-1 px-1.5 rounded-lg transition-all border-none cursor-pointer text-center font-bold ${
                node.context?.decisionCondition?.evaluatedResult === true
                  ? 'bg-cat-mocha-green text-white font-bold shadow-elevated-sm'
                  : isDark ? 'bg-cat-mocha-green/20 text-cat-mocha-green hover:bg-cat-mocha-green/30' : 'bg-cat-latte-green/15 text-cat-latte-green hover:bg-cat-latte-green/25'
              }`}
            >
              ✓ TRUE
            </button>
            <button
              type="button"
              onClick={(e) => handleTestDecision(e, false)}
              className={`flex-1 py-1 px-1.5 rounded-lg transition-all border-none cursor-pointer text-center font-bold ${
                node.context?.decisionCondition?.evaluatedResult === false
                  ? 'bg-cat-mocha-peach text-white font-bold shadow-elevated-sm'
                  : isDark ? 'bg-cat-mocha-peach/20 text-cat-mocha-peach hover:bg-cat-mocha-peach/30' : 'bg-cat-latte-peach/15 text-cat-latte-peach hover:bg-cat-latte-peach/25'
              }`}
            >
              ✗ FALSE
            </button>
          </div>
        )}

        {/* Micro LOD Extended Inlines: Always Visible in Micro Mode */}
        {isMicro && (
          <div className="mt-2 pt-2 border-t border-cat-latte-surface1/60 dark:border-cat-mocha-surface0/50 space-y-2">
            {node.description && (
              <p className={`text-[11px] leading-relaxed line-clamp-2 ${
                isDark ? 'text-cat-mocha-subtext0' : 'text-cat-latte-subtext0'
              }`}>
                {node.description}
              </p>
            )}

            {/* Artifact payload chips */}
            {artifactList.length > 0 && (
              <div className="space-y-1">
                <span className="text-[9px] font-mono uppercase tracking-wider opacity-65 flex items-center gap-1">
                  <Code2 size={10} />
                  <span>Payloads ({artifactList.length})</span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {artifactList.map(art => (
                    <button
                      key={art}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingArtifact({
                          artifact: artifactPayloads[art],
                          nodeId: node.id,
                          nodeLabel: node.label,
                        });
                      }}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 text-cat-latte-teal dark:text-cat-mocha-teal hover:scale-105 transition-transform flex items-center gap-1 border-none cursor-pointer"
                      title="Click to inspect deliverable"
                    >
                      <span>{art}</span>
                      <Eye size={10} className="opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Badges Row: Subgraph Badge, Recursive Indicator, Shared Context Indicator */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {hasSubgraph && (
            <button
              type="button"
              onClick={handleEnterSubgraph}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border-none cursor-pointer ${
                isDark 
                  ? 'bg-cat-mocha-mauve/20 text-cat-mocha-mauve hover:bg-cat-mocha-mauve/30' 
                  : 'bg-cat-latte-mauve/15 text-cat-latte-mauve hover:bg-cat-latte-mauve/25'
              }`}
            >
              <FolderTree size={10} />
              <span>Sub-Graph ({node.subgraph?.nodes.length || 0})</span>
            </button>
          )}

          {nodeContextCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectNode(id);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-300 hover:scale-105 transition-all border-none cursor-pointer"
              title={`${nodeContextCount} shared context entries scoped to this node. Click to inspect.`}
            >
              <Brain size={10} />
              <span>{nodeContextCount} Context</span>
            </button>
          )}

          {isRecursive && (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${
              isDark ? 'bg-cat-mocha-peach/20 text-cat-mocha-peach' : 'bg-cat-latte-peach/15 text-cat-latte-peach'
            }`}>
              <Repeat size={10} />
              <span>Recursive</span>
            </span>
          )}

          {isMissingStoppingCondition && (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-semibold animate-pulse ${
              isDark ? 'bg-cat-mocha-red/25 text-cat-mocha-red' : 'bg-cat-latte-red/20 text-cat-latte-red'
            }`}>
              <AlertTriangle size={10} />
              <span>No Stop Rule!</span>
            </span>
          )}
        </div>

        {/* Multi-Agent & Autonomous Active Thought Telemetry */}
        {(node.status === 'in_progress' || isAgentActive) && (
          <div className="my-1.5 space-y-1">
            {assignedAgents.length > 0 ? (
              assignedAgents.map((agent) => (
                <div
                  key={agent.id}
                  className={`p-1.5 rounded-xl flex items-center gap-1.5 text-[10px] backdrop-blur-md transition-all shadow-xs ${
                    isDark ? 'bg-[#181a24]/90 text-[#f8fafc]' : 'bg-slate-100/90 text-[#202124]'
                  }`}
                >
                  <span className="shrink-0 text-xs">{agent.avatar}</span>
                  <span className="font-semibold shrink-0" style={{ color: agent.color }}>
                    {agent.name}:
                  </span>
                  <span className="font-mono truncate opacity-85">
                    {agent.currentThought || (agent.status === 'thinking' ? 'Synthesizing...' : 'Executing...')}
                  </span>
                </div>
              ))
            ) : (
              <div className={`p-2 rounded-xl flex items-center gap-2 text-[11px] backdrop-blur-md ${
                isDark ? 'bg-cat-mocha-surface0/80 text-cat-mocha-yellow' : 'bg-cat-latte-surface0 text-cat-latte-yellow'
              }`}>
                <Zap size={12} className="animate-bounce shrink-0" />
                <span className="font-mono text-[10px] truncate">
                  {telemetry?.liveThought || 'Agent reasoning...'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* PROGRESSIVE DISCLOSURE: Revealed on Hover (Normal LOD) */}
        <AnimatePresence>
          {(isHovered || isMicro) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="overflow-hidden mt-2.5 space-y-2 pt-2 border-none"
            >
              {!isMicro && node.description && (
                <p className={`text-[11px] leading-relaxed line-clamp-2 ${
                  isDark ? 'text-cat-mocha-subtext0' : 'text-cat-latte-subtext0'
                }`}>
                  {node.description}
                </p>
              )}

              {/* Execution Engine & Tool Counts */}
              <div className={`flex items-center justify-between text-[10px] pt-0.5 ${
                isDark ? 'text-cat-mocha-overlay2' : 'text-cat-latte-overlay2'
              }`}>
                <span className={`flex items-center gap-1 font-medium ${
                  node.context?.executionType === 'automated_script'
                    ? (isDark ? 'text-cat-mocha-sapphire' : 'text-cat-latte-sapphire')
                    : node.context?.executionType === 'human_operator'
                    ? (isDark ? 'text-cat-mocha-peach' : 'text-cat-latte-peach')
                    : (isDark ? 'text-cat-mocha-lavender' : 'text-cat-latte-lavender')
                }`}>
                  {node.context?.executionType === 'automated_script' ? (
                    <Terminal size={11} />
                  ) : node.context?.executionType === 'human_operator' ? (
                    <UserCheck size={11} />
                  ) : (
                    <Sparkles size={11} />
                  )}
                  {getEngineLabel(node.context)}
                </span>
                <div className="flex items-center gap-2">
                  {(node.context?.toolsRequired?.length || 0) > 0 && (
                    <span className="opacity-75 font-mono">
                      {node.context?.toolsRequired?.length} tool{(node.context?.toolsRequired?.length || 0) > 1 ? 's' : ''}
                    </span>
                  )}
                  {node.context?.estimatedMinutes && (
                    <span className="flex items-center gap-0.5 opacity-75">
                      <Clock size={10} />
                      {node.context.estimatedMinutes}m
                    </span>
                  )}
                </div>
              </div>

              {/* Micro-Action Dock */}
              <div className="flex items-center justify-between gap-1.5 pt-2 pb-0.5">
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleQuickStatusToggle}
                    title={node.status === 'completed' ? 'Mark Pending' : 'Mark Done'}
                    className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-semibold shrink-0 transition-colors border-none cursor-pointer ${
                      isDark 
                        ? 'bg-cat-mocha-surface0/80 hover:bg-cat-mocha-surface1 text-cat-mocha-text' 
                        : 'bg-cat-latte-surface0 hover:bg-cat-latte-surface1 text-cat-latte-text'
                    }`}
                  >
                    {node.status === 'completed' ? (
                      <CheckCircle2 size={12} className={isDark ? "text-cat-mocha-green" : "text-cat-latte-green"} />
                    ) : (
                      <Play size={11} className={isDark ? "text-cat-mocha-yellow" : "text-cat-latte-yellow"} />
                    )}
                    <span>{node.status === 'completed' ? 'Done' : 'Exec'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRunAgent}
                    title="Dispatch Autonomous Agent"
                    className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-semibold shrink-0 transition-colors border-none cursor-pointer ${
                      isDark 
                        ? 'bg-cat-mocha-mauve/20 hover:bg-cat-mocha-mauve/30 text-cat-mocha-mauve' 
                        : 'bg-cat-latte-mauve/15 hover:bg-cat-latte-mauve/25 text-cat-latte-mauve'
                    }`}
                  >
                    <Sparkles size={11} />
                    <span>Agent</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    title="Copy LLM Prompt for Agent (Gemini CLI / Claude)"
                    className={`p-1.5 rounded-xl shrink-0 transition-colors border-none cursor-pointer ${
                      isDark 
                        ? 'bg-cat-mocha-surface0/80 hover:bg-cat-mocha-surface1 text-cat-mocha-teal' 
                        : 'bg-cat-latte-surface0 hover:bg-cat-latte-surface1 text-cat-latte-teal'
                    }`}
                  >
                    {copiedPrompt ? <Check size={11} className="text-cat-mocha-green" /> : <Copy size={11} />}
                  </button>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleBranch}
                    title="Branch Connected Subtask (Tab)"
                    className={`p-1.5 rounded-xl shrink-0 transition-colors border-none cursor-pointer ${
                      isDark 
                        ? 'bg-cat-mocha-surface0/80 hover:bg-cat-mocha-surface1 text-cat-mocha-sapphire' 
                        : 'bg-cat-latte-surface0 hover:bg-cat-latte-surface1 text-cat-latte-sapphire'
                    }`}
                  >
                    <Plus size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={handleEnterSubgraph}
                    title="Open / Create Nested Sub-Graph Topology"
                    className={`p-1.5 rounded-xl shrink-0 transition-colors border-none cursor-pointer ${
                      isDark 
                        ? 'bg-cat-mocha-surface0/80 hover:bg-cat-mocha-surface1 text-cat-mocha-mauve' 
                        : 'bg-cat-latte-surface0 hover:bg-cat-latte-surface1 text-cat-latte-mauve'
                    }`}
                  >
                    <FolderTree size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={handleInspect}
                    title="Open Full Agent Context (Space)"
                    className={`p-1.5 rounded-xl shrink-0 transition-colors border-none cursor-pointer ${
                      isDark 
                        ? 'bg-cat-mocha-surface0/80 hover:bg-cat-mocha-surface1 text-cat-mocha-subtext0' 
                        : 'bg-cat-latte-surface0 hover:bg-cat-latte-surface1 text-cat-latte-subtext0'
                    }`}
                  >
                    <Maximize2 size={11} />
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    title="Delete Node"
                    className={`p-1.5 rounded-xl shrink-0 transition-colors border-none cursor-pointer text-red-500 hover:text-red-600 ${
                      isDark 
                        ? 'bg-cat-mocha-surface0/80 hover:bg-red-950/40' 
                        : 'bg-cat-latte-surface0 hover:bg-red-100'
                    }`}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export const TopologyCustomNode = React.memo(
  TopologyCustomNodeComponent,
  (prev, next) => {
    if (prev.id !== next.id) return false;
    if (prev.selected !== next.selected) return false;

    const prevNode = prev.data as unknown as TopologyNode;
    const nextNode = next.data as unknown as TopologyNode;

    if (prevNode === nextNode) return true;

    if (prevNode.label !== nextNode.label) return false;
    if (prevNode.description !== nextNode.description) return false;
    if (prevNode.status !== nextNode.status) return false;
    if (prevNode.priority !== nextNode.priority) return false;
    if (prevNode.type !== nextNode.type) return false;
    if (prevNode.updatedAt !== nextNode.updatedAt) return false;

    // Compare tags
    const prevTags = prevNode.tags || [];
    const nextTags = nextNode.tags || [];
    if (prevTags.length !== nextTags.length) return false;
    for (let i = 0; i < prevTags.length; i++) {
      if (prevTags[i] !== nextTags[i]) return false;
    }

    // Context & Telemetry comparison
    const prevCtx = prevNode.context;
    const nextCtx = nextNode.context;
    if (prevCtx !== nextCtx) {
      if (prevCtx?.role !== nextCtx?.role) return false;
      if (prevCtx?.activeThought !== nextCtx?.activeThought) return false;
      if (prevCtx?.collaborationMode !== nextCtx?.collaborationMode) return false;
      if (prevCtx?.approvalStatus !== nextCtx?.approvalStatus) return false;
      if (prevCtx?.requiresHumanApproval !== nextCtx?.requiresHumanApproval) return false;
      if (prevCtx?.stoppingCondition?.expression !== nextCtx?.stoppingCondition?.expression) return false;

      // Telemetry comparison
      const prevTelem = prevCtx?.telemetry;
      const nextTelem = nextCtx?.telemetry;
      if (prevTelem !== nextTelem) {
        if (prevTelem?.state !== nextTelem?.state) return false;
        if (prevTelem?.liveThought !== nextTelem?.liveThought) return false;
        if (prevTelem?.activeTool !== nextTelem?.activeTool) return false;
        if (prevTelem?.lastUpdated !== nextTelem?.lastUpdated) return false;
      }

      // Assigned agents
      const prevAgents = prevCtx?.assignedAgents || [];
      const nextAgents = nextCtx?.assignedAgents || [];
      if (prevAgents.length !== nextAgents.length) return false;
      for (let i = 0; i < prevAgents.length; i++) {
        if (prevAgents[i].id !== nextAgents[i].id || prevAgents[i].status !== nextAgents[i].status) return false;
      }

      // Artifact payloads
      const prevArts = Object.keys(prevCtx?.artifactPayloads || {});
      const nextArts = Object.keys(nextCtx?.artifactPayloads || {});
      if (prevArts.length !== nextArts.length) return false;

      // Output artifacts list
      const prevOutputs = prevCtx?.outputArtifacts || [];
      const nextOutputs = nextCtx?.outputArtifacts || [];
      if (prevOutputs.length !== nextOutputs.length) return false;

      // Subgraph
      const prevSub = prevNode.subgraph?.nodes?.length || 0;
      const nextSub = nextNode.subgraph?.nodes?.length || 0;
      if (prevSub !== nextSub) return false;
    }

    return true;
  }
);
