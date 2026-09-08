import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Play, Pause, SkipForward, RotateCcw, Activity } from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';

export const SimulationBar: React.FC = () => {
  const isSimulating = useTopologyStore(s => s.isSimulating);
  const simulationStep = useTopologyStore(s => s.simulationStep);
  const simulationBatches = useTopologyStore(s => s.simulationBatches);
  const startSimulation = useTopologyStore(s => s.startSimulation);
  const stepSimulation = useTopologyStore(s => s.stepSimulation);
  const pauseSimulation = useTopologyStore(s => s.pauseSimulation);
  const resetSimulation = useTopologyStore(s => s.resetSimulation);
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/90 dark:bg-cat-mocha-base/85 text-cat-latte-text dark:text-cat-mocha-text backdrop-blur-2xl shadow-elevated-lg border-none transition-colors duration-200">
      {/* Simulation Status Icon */}
      <div className="flex items-center gap-2 pr-2 border-r border-transparent">
        <Activity size={16} className={`text-cat-mocha-yellow dark:text-cat-mocha-yellow ${isSimulating ? 'animate-pulse' : ''}`} />
        <span className="text-xs font-semibold tracking-wide">
          {isSimulating ? 'Simulating Run...' : 'Simulation Engine'}
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
        className="p-2 rounded-xl bg-cat-latte-surface0/80 dark:bg-cat-mocha-surface0/80 hover:bg-cat-latte-surface1 dark:hover:bg-cat-mocha-surface1 text-cat-mocha-yellow dark:text-cat-mocha-yellow transition-all border-none cursor-pointer"
        title={isSimulating ? 'Pause Execution' : 'Start Simulation'}
      >
        {isSimulating ? <Pause size={15} /> : <Play size={15} />}
      </button>

      {/* Step Forward */}
      <button
        onClick={() => stepSimulation()}
        className="p-2 rounded-xl bg-cat-latte-surface0/80 dark:bg-cat-mocha-surface0/80 hover:bg-cat-latte-surface1 dark:hover:bg-cat-mocha-surface1 text-cat-mocha-sapphire dark:text-cat-mocha-sapphire transition-all border-none cursor-pointer"
        title="Step Forward Single Execution Tier"
      >
        <SkipForward size={15} />
      </button>

      {/* Reset */}
      <button
        onClick={() => resetSimulation()}
        className="p-2 rounded-xl bg-cat-latte-surface0/80 dark:bg-cat-mocha-surface0/80 hover:bg-cat-latte-surface1 dark:hover:bg-cat-mocha-surface1 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 transition-all border-none cursor-pointer"
        title="Reset Topology to Initial Plan"
      >
        <RotateCcw size={15} />
      </button>

      {/* Progress & Batch Information */}
      <div className="flex items-center gap-3 pl-2">
        <div className="w-28 h-2 rounded-full bg-cat-latte-surface1/70 dark:bg-cat-mocha-surface0 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-cat-mocha-sapphire to-cat-mocha-green transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs font-mono text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 min-w-10">
          {progressPercent}%
        </span>

        {inProgressCount > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-cat-mocha-yellow/15 text-cat-mocha-yellow font-medium">
            {inProgressCount} active
          </span>
        )}
      </div>
    </div>
  );
};
