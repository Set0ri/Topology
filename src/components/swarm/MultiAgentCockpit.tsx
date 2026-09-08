import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Activity,
  X,
  Play,
  RotateCcw,
  Sparkles,
  Bot,
  Filter,
  Trash2,
  ExternalLink,
  Cpu,
  MessageSquare,
  Wrench,
  CheckCircle2,
  Clock,
  Layers,
  Zap,
  Shield,
  Search
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { AgentWorker, AgentActivityEvent } from '../../types/topology';

type CockpitTab = 'stream' | 'squad' | 'collaboration';

export const MultiAgentCockpit: React.FC = () => {
  const isCockpitOpen = useTopologyStore(s => s.isCockpitOpen);
  const setCockpitOpen = useTopologyStore(s => s.setCockpitOpen);
  const globalSquad = useTopologyStore(s => s.globalSquad);
  const activityStream = useTopologyStore(s => s.activityStream);
  const clearActivityStream = useTopologyStore(s => s.clearActivityStream);
  const activeFilterAgentId = useTopologyStore(s => s.activeFilterAgentId);
  const setActiveFilterAgentId = useTopologyStore(s => s.setActiveFilterAgentId);
  const loadMultiAgentDemo = useTopologyStore(s => s.loadMultiAgentDemo);
  const selectNode = useTopologyStore(s => s.selectNode);
  const nodes = useTopologyStore(s => s.nodes);
  const isSimulating = useTopologyStore(s => s.isSimulating);
  const startSimulation = useTopologyStore(s => s.startSimulation);
  const pauseSimulation = useTopologyStore(s => s.pauseSimulation);
  const resetSimulation = useTopologyStore(s => s.resetSimulation);

  const [activeTab, setActiveTab] = useState<CockpitTab>('stream');
  const [searchQuery, setSearchQuery] = useState('');
  const streamBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll stream to bottom on new event if tab is stream
  useEffect(() => {
    if (activeTab === 'stream' && streamBottomRef.current) {
      streamBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activityStream.length, activeTab]);

  if (!isCockpitOpen) return null;

  // Filter events
  const filteredEvents = activityStream.filter(event => {
    if (activeFilterAgentId && event.agentId !== activeFilterAgentId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDetails = event.detail.toLowerCase().includes(q);
      const matchAgent = event.agentName.toLowerCase().includes(q);
      const matchNode = (event.nodeId || '').toLowerCase().includes(q);
      return matchDetails || matchAgent || matchNode;
    }
    return true;
  });

  // Calculate active agents count
  const busyAgentsCount = globalSquad.filter(
    a => a.status === 'thinking' || a.status === 'executing_tool' || a.status === 'debating'
  ).length;

  // Multi-agent nodes (nodes with 2+ agents or specific multi-agent collaboration mode)
  const multiAgentNodes = nodes.filter(n => {
    const agents = n.context?.assignedAgents || [];
    return agents.length > 1 || (n.context?.collaborationMode && n.context.collaborationMode !== 'solo');
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-16 sm:bottom-22 left-2 sm:left-auto right-2 sm:right-6 z-40 w-[calc(100vw-1rem)] sm:w-[540px] md:w-[620px] max-h-[78vh] flex flex-col rounded-3xl bg-white/95 dark:bg-[#13151f]/95 text-[#202124] dark:text-[#f8fafc] backdrop-blur-3xl shadow-elevated-2xl border-none overflow-hidden transition-colors"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-black/[0.02] via-transparent to-black/[0.02] dark:from-white/[0.02] dark:to-white/[0.02] shrink-0 border-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#9334e6] flex items-center justify-center shadow-xs">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight">Swarm Observability</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#1a73e8]/20 dark:text-[#8ab4f8]">
                  <span className={`w-1.5 h-1.5 rounded-full ${busyAgentsCount > 0 ? 'bg-[#1a73e8] animate-ping' : 'bg-[#34a853]'}`} />
                  {busyAgentsCount} Active / {globalSquad.length} Squad
                </span>
              </div>
              <p className="text-[11px] text-[#5f6368] dark:text-[#94a3b8]">
                Real-time asynchronous telemetry & multi-agent consensus matrix
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={loadMultiAgentDemo}
              title="Reload Flagship Asynchronous Swarm Demo Graph"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#1a73e8]/10 hover:bg-[#1a73e8]/20 text-[#1a73e8] dark:text-[#8ab4f8] transition-colors border-none cursor-pointer"
            >
              <Sparkles size={13} />
              <span className="hidden sm:inline font-semibold">Demo Graph</span>
            </button>

            <button
              type="button"
              onClick={() => setCockpitOpen(false)}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Secondary Filter Bar */}
        <div className="px-5 pb-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          {/* Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/5 shadow-inner overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('stream')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border-none cursor-pointer shrink-0 ${
                activeTab === 'stream'
                  ? 'bg-white dark:bg-[#1e2230] text-[#1a73e8] dark:text-[#8ab4f8] shadow-elevated-xs font-semibold'
                  : 'text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc]'
              }`}
            >
              <Activity size={13} />
              <span>Live Stream</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/5 dark:bg-white/10 font-bold">
                {activityStream.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('squad')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border-none cursor-pointer ${
                activeTab === 'squad'
                  ? 'bg-white dark:bg-[#1e2230] text-[#1a73e8] dark:text-[#8ab4f8] shadow-elevated-xs font-semibold'
                  : 'text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc]'
              }`}
            >
              <Bot size={13} />
              <span>Squad Fleet</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/5 dark:bg-white/10 font-bold">
                {globalSquad.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('collaboration')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border-none cursor-pointer ${
                activeTab === 'collaboration'
                  ? 'bg-white dark:bg-[#1e2230] text-[#1a73e8] dark:text-[#8ab4f8] shadow-elevated-xs font-semibold'
                  : 'text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc]'
              }`}
            >
              <Layers size={13} />
              <span>Collab Nodes</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/5 dark:bg-white/10 font-bold">
                {multiAgentNodes.length}
              </span>
            </button>
          </div>

          {/* Quick Simulation Runner Trigger in Cockpit */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (isSimulating) {
                  pauseSimulation();
                } else {
                  startSimulation();
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors border-none cursor-pointer"
            >
              <Play size={12} className={isSimulating ? 'text-[#f9ab00] fill-current' : 'text-[#34a853]'} />
              <span>{isSimulating ? 'Pause Swarm' : 'Simulate Run'}</span>
            </button>
            <button
              type="button"
              onClick={resetSimulation}
              title="Reset Swarm Graph State"
              className="p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] transition-colors border-none cursor-pointer"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 min-h-[300px] max-h-[480px]">
          {/* TAB 1: Live Chronological Telemetry Stream */}
          {activeTab === 'stream' && (
            <div className="space-y-3">
              {/* Agent Filter Ribbon */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveFilterAgentId(null)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium shrink-0 transition-all border-none cursor-pointer ${
                    activeFilterAgentId === null
                      ? 'bg-[#1a73e8] text-white font-semibold shadow-xs'
                      : 'bg-black/5 dark:bg-white/5 text-[#5f6368] dark:text-[#94a3b8] hover:bg-black/10'
                  }`}
                >
                  All Agents
                </button>
                {globalSquad.map(agent => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setActiveFilterAgentId(agent.id === activeFilterAgentId ? null : agent.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-medium shrink-0 transition-all border-none cursor-pointer ${
                      activeFilterAgentId === agent.id
                        ? 'bg-[#1a73e8] text-white font-semibold shadow-xs'
                        : 'bg-black/5 dark:bg-white/5 text-[#5f6368] dark:text-[#94a3b8] hover:bg-black/10'
                    }`}
                  >
                    <span>{agent.avatar}</span>
                    <span>{agent.name}</span>
                  </button>
                ))}

                {activityStream.length > 0 && (
                  <button
                    type="button"
                    onClick={clearActivityStream}
                    title="Clear Telemetry Stream"
                    className="ml-auto p-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-red-500/15 hover:text-red-500 text-[#5f6368] dark:text-[#94a3b8] transition-colors border-none cursor-pointer shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {/* Event Stream List */}
              {filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-[#5f6368] dark:text-[#94a3b8]">
                  <Activity size={32} className="opacity-30 mb-2" />
                  <p className="text-xs font-medium">No telemetry events logged yet.</p>
                  <p className="text-[11px] opacity-70 mt-1 max-w-xs">
                    Start the simulation or launch the Flagship Multi-Agent Demo graph to watch parallel autonomous reasoning events stream in real-time.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      loadMultiAgentDemo();
                      startSimulation();
                    }}
                    className="mt-3 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#1a73e8] text-white hover:bg-[#1557b0] transition-all border-none cursor-pointer shadow-xs"
                  >
                    Run Demo Graph Simulation
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEvents.map(event => {
                    const eventAgent = globalSquad.find(a => a.id === event.agentId);
                    const isDebate = event.actionType === 'collaborated';
                    const isTool = event.actionType === 'tool_call';
                    const isComplete = event.actionType === 'completed';

                    return (
                      <div
                        key={event.id}
                        className={`p-3 rounded-2xl text-xs transition-all ${
                          isDebate
                            ? 'bg-[#fef7e0]/60 dark:bg-yellow-500/10'
                            : isTool
                            ? 'bg-[#e8f0fe]/60 dark:bg-[#1a73e8]/10'
                            : isComplete
                            ? 'bg-[#e6f4ea]/60 dark:bg-green-500/10'
                            : 'bg-black/[0.03] dark:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{eventAgent?.avatar || '🤖'}</span>
                            <span className="font-semibold text-[12px]">{event.agentName}</span>
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-black/5 dark:bg-white/10 font-mono text-[#5f6368] dark:text-[#94a3b8]">
                              {event.actionType.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-[#5f6368] dark:text-[#94a3b8] font-mono">
                            <Clock size={11} className="opacity-60" />
                            <span>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            {event.nodeId && (
                              <button
                                type="button"
                                onClick={() => selectNode(event.nodeId!)}
                                className="ml-1 px-1.5 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-[#1a73e8] hover:text-white text-[10px] font-semibold transition-colors border-none cursor-pointer"
                                title={`Inspect Node: ${event.nodeId}`}
                              >
                                {event.nodeId}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-[11.5px] leading-relaxed text-[#3c4043] dark:text-[#d1d5db] pl-6 font-mono break-words whitespace-pre-wrap">
                          {event.detail}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={streamBottomRef} />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Squad Fleet Directory */}
          {activeTab === 'squad' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {globalSquad.map(agent => {
                const assignedCount = nodes.filter(n =>
                  n.context?.assignedAgents?.some(a => a.id === agent.id)
                ).length;

                return (
                  <div
                    key={agent.id}
                    className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] flex flex-col justify-between gap-2.5 transition-all hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#1e2230] shadow-xs flex items-center justify-center text-lg">
                            {agent.avatar}
                          </div>
                          <div>
                            <div className="font-semibold text-xs leading-tight">{agent.name}</div>
                            <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8]">{agent.role}</div>
                          </div>
                        </div>

                        {/* Status badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            agent.status === 'thinking' || agent.status === 'executing_tool'
                              ? 'bg-[#1a73e8]/15 text-[#1a73e8] dark:text-[#8ab4f8] animate-pulse'
                              : agent.status === 'debating'
                              ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                              : agent.status === 'completed'
                              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                              : 'bg-black/5 dark:bg-white/10 text-[#5f6368] dark:text-[#94a3b8]'
                          }`}
                        >
                          {agent.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Engine & Tools */}
                      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] bg-black/5 dark:bg-white/5 font-mono text-[#5f6368] dark:text-[#94a3b8]">
                          <Cpu size={10} />
                          {agent.modelEngine}
                        </span>
                        {(agent.tools || []).slice(0, 2).map((t: string) => (
                          <span
                            key={t}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] bg-black/5 dark:bg-white/5 font-mono text-[#5f6368] dark:text-[#94a3b8]"
                          >
                            <Wrench size={9} />
                            {t}
                          </span>
                        ))}
                        {(agent.tools?.length || 0) > 2 && (
                          <span className="text-[10px] text-[#5f6368] dark:text-[#94a3b8]">
                            +{(agent.tools?.length || 0) - 2}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer: Node Assignments & Quick Filter */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-[11px]">
                      <span className="text-[#5f6368] dark:text-[#94a3b8]">
                        Assigned: <strong className="text-[#202124] dark:text-[#f8fafc]">{assignedCount} nodes</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFilterAgentId(agent.id);
                          setActiveTab('stream');
                        }}
                        className="text-[11px] text-[#1a73e8] dark:text-[#8ab4f8] font-medium hover:underline border-none bg-transparent cursor-pointer"
                      >
                        View Logs &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: Multi-Agent Collaboration Matrix */}
          {activeTab === 'collaboration' && (
            <div className="space-y-3">
              {multiAgentNodes.length === 0 ? (
                <div className="text-center py-10 text-[#5f6368] dark:text-[#94a3b8]">
                  <Layers size={28} className="opacity-30 mb-2 mx-auto" />
                  <p className="text-xs">No multi-agent collaborative nodes detected.</p>
                  <p className="text-[11px] opacity-70 mt-1">
                    Nodes with 2+ agents assigned or collaboration mode configured will appear here with real-time consensus tracking.
                  </p>
                </div>
              ) : (
                multiAgentNodes.map(node => {
                  const assigned = node.context?.assignedAgents || [];
                  const collabMode = node.context?.collaborationMode || 'solo';

                  return (
                    <div
                      key={node.id}
                      className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] space-y-2.5 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => selectNode(node.id)}
                            className="font-semibold text-xs text-[#1a73e8] dark:text-[#8ab4f8] hover:underline bg-transparent border-none cursor-pointer text-left"
                          >
                            {node.label}
                          </button>
                          <span className="font-mono text-[10px] text-[#5f6368] dark:text-[#94a3b8]">
                            ({node.id})
                          </span>
                        </div>

                        {/* Mode badge */}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#9334e6]/15 text-[#9334e6] dark:text-[#c084fc]">
                          {collabMode === 'debate_consensus' && '⚖️ Consensus Debate'}
                          {collabMode === 'pair_programming' && '👥 Pair Execution'}
                          {collabMode === 'parallel_subtasks' && '⚡ Parallel Swarm'}
                          {collabMode === 'critique_refine' && '🔍 Critique & Refine'}
                          {collabMode === 'solo' && 'Single Agent'}
                        </span>
                      </div>

                      {/* Collaborative Agents Roster for this node */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {assigned.map(agent => (
                          <div
                            key={agent.id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white dark:bg-[#1e2230] text-xs shadow-xs"
                          >
                            <span>{agent.avatar}</span>
                            <span className="font-semibold text-[11px]">{agent.name}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                agent.status === 'thinking' || agent.status === 'executing_tool'
                                  ? 'bg-[#1a73e8] animate-ping'
                                  : agent.status === 'completed'
                                  ? 'bg-green-500'
                                  : 'bg-gray-400'
                              }`}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Active Node Thought/Output snippet */}
                      {node.context?.activeThought && (
                        <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-[11px] font-mono text-[#5f6368] dark:text-[#94a3b8] truncate">
                          💬 {node.context.activeThought}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer info pill */}
        <div className="px-5 py-2.5 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-[#5f6368] dark:text-[#94a3b8] shrink-0 border-none">
          <span className="flex items-center gap-1">
            <Zap size={12} className="text-[#f9ab00]" />
            Parallel antichain execution with asynchronous agent dispatch
          </span>
          <button
            type="button"
            onClick={() => setCockpitOpen(false)}
            className="text-[11px] font-semibold text-[#1a73e8] dark:text-[#8ab4f8] hover:underline bg-transparent border-none cursor-pointer"
          >
            Minimize
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
