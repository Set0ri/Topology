import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Bot, Sparkles, ChevronRight, Activity, Cpu } from 'lucide-react';
import { AgentWorker } from '../../types/topology';
import { useTopologyStore } from '../../store/useTopologyStore';

interface AgentSatelliteNodesProps {
  agents: AgentWorker[];
  nodeId: string;
  nodeLabel: string;
  maxVisible?: number;
}

export const AgentSatelliteNodes: React.FC<AgentSatelliteNodesProps> = ({
  agents,
  nodeId,
  nodeLabel,
  maxVisible = 3,
}) => {
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [isClusterOpen, setIsClusterOpen] = useState(false);

  const setActiveFilterAgentId = useTopologyStore((s) => s.setActiveFilterAgentId);
  const setCockpitOpen = useTopologyStore((s) => s.setCockpitOpen);
  const theme = useTopologyStore((s) => s.theme);
  const isDark = theme !== 'default' && theme !== 'light' && theme !== 'latte';

  if (!agents || agents.length === 0) return null;

  const shouldCluster = agents.length > maxVisible;
  const visibleAgents = shouldCluster ? agents.slice(0, 2) : agents;
  const overflowCount = agents.length - visibleAgents.length;

  const handleInspectAgent = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    setActiveFilterAgentId(agentId);
    setCockpitOpen(true);
    setIsClusterOpen(false);
  };

  return (
    <div 
      className="absolute -top-4 right-3 flex items-center gap-1.5 z-30 pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Individual Satellite Worker Badges */}
      {visibleAgents.map((agent) => {
        const isActive = agent.status === 'thinking' || agent.status === 'executing_tool' || agent.status === 'debating';
        const isHovered = hoveredAgentId === agent.id;

        return (
          <motion.div
            key={agent.id}
            animate={isActive ? { y: [0, -2.5, 0] } : { y: 0 }}
            transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
            className="relative group"
            onMouseEnter={() => setHoveredAgentId(agent.id)}
            onMouseLeave={() => setHoveredAgentId(null)}
          >
            {/* Small Orbital Node Pill */}
            <button
              type="button"
              onClick={(e) => handleInspectAgent(e, agent.id)}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium shadow-elevated-sm backdrop-blur-md transition-all duration-200 hover:scale-105 border-none cursor-pointer select-none ${
                isDark
                  ? 'bg-cat-mocha-surface0/95 text-cat-mocha-text hover:bg-cat-mocha-surface1'
                  : 'bg-white/95 text-cat-latte-text hover:bg-cat-latte-surface0'
              }`}
              style={{
                boxShadow: isActive
                  ? `0 0 12px 1px ${agent.color}80, 0 3px 8px -2px rgba(0,0,0,0.25)`
                  : '0 2px 5px -1px rgba(0,0,0,0.12)',
              }}
            >
              <span className="text-xs leading-none">{agent.avatar}</span>
              <span className="max-w-[65px] truncate font-semibold">{agent.name}</span>

              {/* Status beacon dot */}
              <span className="relative flex h-1.5 w-1.5 ml-0.5">
                {isActive && (
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: agent.color }}
                  />
                )}
                <span
                  className="relative inline-flex rounded-full h-1.5 w-1.5"
                  style={{ backgroundColor: agent.color }}
                />
              </span>
            </button>

            {/* Hover on Appear: Rich Agent Card */}
            {isHovered && (
              <div
                className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 p-2.5 rounded-2xl shadow-elevated-xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150 border-none text-left ${
                  isDark
                    ? 'bg-cat-mocha-surface0/95 text-cat-mocha-text'
                    : 'bg-white/95 text-cat-latte-text'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base">{agent.avatar}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{agent.name}</div>
                      <div className="text-[10px] opacity-70 font-mono truncate">{agent.role}</div>
                    </div>
                  </div>
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0"
                    style={{
                      backgroundColor: `${agent.color}20`,
                      color: agent.color,
                    }}
                  >
                    {agent.status}
                  </span>
                </div>

                {/* Model Engine Badge */}
                <div className="flex items-center gap-1 text-[9px] font-mono opacity-75 mb-1.5">
                  <Cpu size={10} style={{ color: agent.color }} />
                  <span className="truncate">{agent.modelEngine}</span>
                </div>

                {/* Live Thought Snippet */}
                {agent.currentThought && (
                  <div
                    className={`p-1.5 rounded-xl text-[10px] italic leading-relaxed mb-2 line-clamp-3 ${
                      isDark ? 'bg-cat-mocha-base/60' : 'bg-cat-latte-base/60'
                    }`}
                  >
                    "{agent.currentThought}"
                  </div>
                )}

                {/* Action shortcut to Swarm Stream */}
                <button
                  type="button"
                  onClick={(e) => handleInspectAgent(e, agent.id)}
                  className={`w-full py-1 px-2 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 transition-all border-none cursor-pointer ${
                    isDark
                      ? 'bg-cat-mocha-surface1 text-cat-mocha-blue hover:bg-cat-mocha-surface2'
                      : 'bg-cat-latte-surface1 text-cat-latte-blue hover:bg-cat-latte-surface2'
                  }`}
                >
                  <Activity size={10} />
                  <span>View Swarm Stream</span>
                  <ChevronRight size={10} />
                </button>
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Cluster Pill When Agents Exceed Max Visible */}
      {shouldCluster && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsClusterOpen(!isClusterOpen)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-elevated-sm backdrop-blur-md transition-all duration-200 hover:scale-105 border-none cursor-pointer select-none ${
              isClusterOpen
                ? 'bg-purple-600 text-white shadow-purple-500/30'
                : isDark
                ? 'bg-gradient-to-r from-purple-900/60 to-indigo-900/60 text-purple-200 hover:bg-purple-900/80'
                : 'bg-gradient-to-r from-purple-100/90 to-indigo-100/90 text-purple-700 hover:bg-purple-200/90'
            }`}
            title={`Click to view all ${agents.length} assigned agents working on ${nodeLabel}`}
          >
            <Users size={11} />
            <span>+{overflowCount}</span>
          </button>

          {/* Cluster Roster Popover */}
          {isClusterOpen && (
            <div
              className={`absolute top-full mt-2 right-0 w-64 p-3 rounded-2xl shadow-elevated-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150 border-none text-left ${
                isDark
                  ? 'bg-cat-mocha-surface0/95 text-cat-mocha-text'
                  : 'bg-white/95 text-cat-latte-text'
              }`}
            >
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10 dark:border-black/10">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Sparkles size={12} className="text-purple-400" />
                  <span>Assigned Agents ({agents.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClusterOpen(false)}
                  className="text-[10px] opacity-60 hover:opacity-100 border-none bg-transparent cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={(e) => handleInspectAgent(e, agent.id)}
                    className={`p-1.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-cat-mocha-surface1' : 'hover:bg-cat-latte-surface0'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm">{agent.avatar}</span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate">{agent.name}</div>
                        <div className="text-[9px] opacity-60 font-mono truncate">{agent.role}</div>
                      </div>
                    </div>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase shrink-0"
                      style={{
                        backgroundColor: `${agent.color}20`,
                        color: agent.color,
                      }}
                    >
                      {agent.status}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCockpitOpen(true);
                  setIsClusterOpen(false);
                }}
                className={`mt-2 w-full py-1 px-2 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1 transition-all border-none cursor-pointer ${
                  isDark
                    ? 'bg-purple-600/30 text-purple-200 hover:bg-purple-600/50'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                <Bot size={11} />
                <span>Open Swarm Cockpit</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
