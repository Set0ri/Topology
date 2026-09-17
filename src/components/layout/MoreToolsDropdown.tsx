import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MoreHorizontal, 
  ShieldCheck, 
  Users, 
  Brain, 
  Activity, 
  Compass, 
  Undo2, 
  Redo2, 
  HelpCircle,
  LayoutGrid
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';

export interface MoreToolsDropdownProps {
  onOpenCoherence: () => void;
  onOpenSharedContext?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenLibrary: () => void;
  onOpenTutorial: () => void;
  onOpenFleetModal?: () => void;
  className?: string;
}

export const MoreToolsDropdown: React.FC<MoreToolsDropdownProps> = ({
  onOpenCoherence,
  onOpenSharedContext,
  onOpenDiagnostics,
  onOpenLibrary,
  onOpenTutorial,
  onOpenFleetModal,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCoherenceReport = useTopologyStore(s => s.getCoherenceReport);
  const globalSquad = useTopologyStore(s => s.globalSquad);
  const sharedContext = useTopologyStore(s => s.sharedContext);
  const isCockpitOpen = useTopologyStore(s => s.isCockpitOpen);
  const setCockpitOpen = useTopologyStore(s => s.setCockpitOpen);
  const undo = useTopologyStore(s => s.undo);
  const redo = useTopologyStore(s => s.redo);
  const history = useTopologyStore(s => s.history);
  const future = useTopologyStore(s => s.future);
  const theme = useTopologyStore(s => s.theme);

  const coherenceReport = getCoherenceReport();
  const contextCount = Object.keys(sharedContext?.global || {}).length;
  const isDark = theme !== 'default' && theme !== 'light' && theme !== 'latte';

  // Outside click & escape listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleAction = (action?: () => void) => {
    if (action) {
      action();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className || ''}`}>
      {/* Trigger Button: Elevated Paper Style */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="More Workspace Tools & Observability"
        className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer shadow-xs ${
          isOpen
            ? isDark
              ? 'bg-cat-mocha-surface1 text-white shadow-elevated-sm'
              : 'bg-white text-slate-900 shadow-elevated-sm'
            : isDark
            ? 'bg-white/5 hover:bg-white/10 text-cat-mocha-text'
            : 'bg-black/5 hover:bg-black/10 text-slate-800'
        }`}
      >
        <MoreHorizontal size={16} />
      </button>

      {/* Floating Menu Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl p-2 bg-white/95 dark:bg-[#181a24]/95 shadow-elevated-2xl backdrop-blur-2xl z-50 border-none select-none flex flex-col gap-1"
          >
            {/* Header */}
            <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="uppercase tracking-wider">Workspace Tools</span>
              <span className="font-mono text-[10px] opacity-70">Responsive Menu</span>
            </div>

            {/* Tool Items */}
            <div className="flex flex-col gap-0.5">
              {/* Coherence Health */}
              <button
                type="button"
                onClick={() => handleAction(onOpenCoherence)}
                className="w-full p-2 rounded-xl text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-none cursor-pointer flex items-center justify-between gap-2 text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium">Graph Coherence</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">DAG cycle & invariant audit</div>
                  </div>
                </div>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                  coherenceReport.score >= 90
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : coherenceReport.score >= 70
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}>
                  {coherenceReport.score}%
                </span>
              </button>

              {/* Swarm Observability */}
              <button
                type="button"
                onClick={() => {
                  setCockpitOpen(!isCockpitOpen);
                  setIsOpen(false);
                }}
                className="w-full p-2 rounded-xl text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-none cursor-pointer flex items-center justify-between gap-2 text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center shrink-0">
                    <Users size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium">Swarm Observability</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Live agent activity stream</div>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0">
                  {globalSquad.length} {globalSquad.length === 1 ? 'agent' : 'agents'}
                </span>
              </button>

              {/* Shared Context Blackboard */}
              {onOpenSharedContext && (
                <button
                  type="button"
                  onClick={() => handleAction(onOpenSharedContext)}
                  className="w-full p-2 rounded-xl text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-none cursor-pointer flex items-center justify-between gap-2 text-slate-800 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Brain size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium">Shared Context</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Cross-agent memory bus</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 shrink-0">
                    {contextCount}
                  </span>
                </button>
              )}

              {/* Topology Archetype Hub */}
              <button
                type="button"
                onClick={() => handleAction(onOpenLibrary)}
                className="w-full p-2 rounded-xl text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-none cursor-pointer flex items-center justify-between gap-2 text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Compass size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium">Archetypes Hub</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">10 canonical agent topologies</div>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                  80%
                </span>
              </button>

              {/* Multi-Plan Fleet Matrix */}
              {onOpenFleetModal && (
                <button
                  type="button"
                  onClick={() => handleAction(onOpenFleetModal)}
                  className="w-full p-2 rounded-xl text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-none cursor-pointer flex items-center justify-between gap-2 text-slate-800 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <LayoutGrid size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium">Fleet Matrix</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Multi-plan grid overview</div>
                    </div>
                  </div>
                </button>
              )}

              {/* Diagnostics & Telemetry HUD */}
              {onOpenDiagnostics && (
                <button
                  type="button"
                  onClick={() => handleAction(onOpenDiagnostics)}
                  className="w-full p-2 rounded-xl text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-none cursor-pointer flex items-center justify-between gap-2 text-slate-800 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Activity size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium">System Diagnostics</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Live FPS, latency, and leases</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/5 shrink-0">
                    Ctrl+Shift+D
                  </span>
                </button>
              )}

              {/* Interactive Tutorial Guide */}
              <button
                type="button"
                onClick={() => handleAction(onOpenTutorial)}
                className="w-full p-2 rounded-xl text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-none cursor-pointer flex items-center justify-between gap-2 text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                    <HelpCircle size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium">Interactive Guide</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Onboarding & concepts walkthrough</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="my-1 h-px bg-black/5 dark:bg-white/5" />

            {/* Undo / Redo Quick Controls */}
            <div className="p-1 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-between gap-1">
              <button
                type="button"
                disabled={history.length === 0}
                onClick={() => {
                  undo();
                }}
                className="flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 border-none cursor-pointer transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={13} />
                <span>Undo</span>
              </button>
              <div className="w-px h-4 bg-black/10 dark:bg-white/10" />
              <button
                type="button"
                disabled={future.length === 0}
                onClick={() => {
                  redo();
                }}
                className="flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 border-none cursor-pointer transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 size={13} />
                <span>Redo</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
