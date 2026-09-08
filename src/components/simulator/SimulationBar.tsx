import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Play, Pause, SkipForward, RotateCcw, Activity, Users, Sparkles } from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';

export const SimulationBar: React.FC = () => {
  const isSimulating = useTopologyStore(s => s.isSimulating);
  const simulationStep = useTopologyStore(s => s.simulationStep);
  const simulationBatches = useTopologyStore(s => s.simulationBatches);
  const startSimulation = useTopologyStore(s => s.startSimulation);
  const stepSimulation = useTopologyStore(s => s.stepSimulation);
  const pauseSimulation = useTopologyStore(s => s.pauseSimulation);
  const resetSimulation = useTopologyStore(s => s.resetSimulation);
  const isCockpitOpen = useTopologyStore(s => s.isCockpitOpen);
  const setCockpitOpen = useTopologyStore(s => s.setCockpitOpen);
  const nodes = useTopologyStore(s => s.nodes);

  const completedCount = nodes.filter(n => n.status === 'completed').length;
  const inProgressCount = nodes.filter(n => n.status === 'in_progress').length;
  const progressPercent = nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0;

  // Auto-step timer when playing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isSimulating) {
      interval = setInterval(() => {
        const store = useTopologyStore.getState();
        if (store.simulationStep < store.simulationBatches.length) {
          store.stepSimulation();
        } else {
          store.pauseSimulation();
          // Trigger confetti on goal completion!
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#cba6f7', '#89dceb', '#a6e3a1', '#fab387'],
          });
        }
      }, 1600);
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  return (
    <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-2xl bg-white/95 dark:bg-[#181a24]/95 text-[#202124] dark:text-[#f8fafc] backdrop-blur-2xl shadow-elevated-xl border-none max-w-[calc(100vw-1rem)] overflow-x-auto scrollbar-none transition-colors duration-200">
      {/* Simulation Status Icon */}
      <div className="flex items-center gap-1.5 sm:gap-2 pr-1 sm:pr-2 border-r border-black/5 dark:border-white/10 shrink-0">
        <Activity size={14} className={`text-[#f9ab00] ${isSimulating ? 'animate-pulse' : ''}`} />
        <span className="text-xs font-semibold tracking-wide hidden lg:inline">
          {isSimulating ? 'Simulating...' : 'Simulation Engine'}
        </span>
      </div>

      {/* Play / Pause */}
      <button
        onClick={() => {
          if (isSimulating) {
            pauseSimulation();
          } else {
            if (simulationBatches.length === 0 || simulationStep >= simulationBatches.length) {
              startSimulation();
            } else {
              useTopologyStore.setState({ isSimulating: true });
            }
          }
        }}
        className="p-1.5 sm:p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#f9ab00] transition-all border-none cursor-pointer shrink-0"
        title={isSimulating ? 'Pause Execution' : 'Start Simulation'}
      >
        {isSimulating ? <Pause size={14} /> : <Play size={14} />}
      </button>

      {/* Step Forward */}
      <button
        onClick={() => stepSimulation()}
        className="p-1.5 sm:p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#1a73e8] dark:text-[#8ab4f8] transition-all border-none cursor-pointer shrink-0"
        title="Step Forward Single Execution Tier"
      >
        <SkipForward size={14} />
      </button>

      {/* Reset Simulation */}
      <button
        onClick={() => resetSimulation()}
        className="p-1.5 sm:p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#5f6368] dark:text-[#94a3b8] transition-all border-none cursor-pointer shrink-0"
        title="Reset Simulation State"
      >
        <RotateCcw size={14} />
      </button>

      {/* Swarm Observability Cockpit Drawer Toggle */}
      <button
        onClick={() => setCockpitOpen(!isCockpitOpen)}
        className={`p-1.5 sm:p-2 rounded-xl transition-all border-none cursor-pointer shrink-0 flex items-center gap-1.5 ${
          isCockpitOpen
            ? 'bg-[#1a73e8] text-white shadow-xs'
            : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#1a73e8] dark:text-[#8ab4f8]'
        }`}
        title="Toggle Multi-Agent Swarm Observability Cockpit"
      >
        <Users size={14} />
        <span className="text-xs font-semibold hidden md:inline">Swarm</span>
      </button>

      {/* Progress Bar & Counter */}
      <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-black/5 dark:border-white/10 shrink-0">
        <div className="w-12 sm:w-20 h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#1a73e8] to-[#1e8e3e] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-[11px] font-mono font-medium text-[#5f6368] dark:text-[#94a3b8]">
          {progressPercent}%
        </span>
      </div>
    </div>
  );
};
