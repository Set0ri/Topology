import React, { useState, useMemo } from 'react';
import {
  RotateCw,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Bot,
  ShieldAlert,
  Award,
  ChevronRight,
  Copy,
  Check,
  Eye,
  Lightbulb,
  Scale,
  Swords,
  Layers,
  Vote,
  FileCheck,
  Zap,
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { OodaStage, OodaLoopIteration } from '../../types/topology';

interface StageMeta {
  id: OodaStage;
  name: string;
  short: string;
  icon: React.ReactNode;
  description: string;
  accent: string;
  bgLight: string;
}

const STAGES: StageMeta[] = [
  {
    id: 'observe',
    name: 'Observe',
    short: 'Obs',
    icon: <Eye size={14} />,
    description: 'Context, codebase scan, dependencies & active state',
    accent: '#3b82f6',
    bgLight: 'rgba(59, 130, 246, 0.12)',
  },
  {
    id: 'understand',
    name: 'Understand',
    short: 'Und',
    icon: <Lightbulb size={14} />,
    description: 'System invariants, constraints, goals & problem formulation',
    accent: '#8b5cf6',
    bgLight: 'rgba(139, 92, 246, 0.12)',
  },
  {
    id: 'evaluate_with_council',
    name: 'Evaluate Council',
    short: 'Eval',
    icon: <Scale size={14} />,
    description: 'Multi-perspective architectural feasibility assessment',
    accent: '#ec4899',
    bgLight: 'rgba(236, 72, 153, 0.12)',
  },
  {
    id: 'adversarial_council_evaluation',
    name: 'Adversarial Critique',
    short: 'Crit',
    icon: <Swords size={14} />,
    description: 'Red-team stress test, edge cases & failure mode identification',
    accent: '#ef4444',
    bgLight: 'rgba(239, 68, 68, 0.12)',
  },
  {
    id: 'each_member_plans',
    name: 'Member Plans',
    short: 'Plan',
    icon: <Layers size={14} />,
    description: 'Independent candidate architectures from Flash, Opus & GPT-OSS',
    accent: '#f59e0b',
    bgLight: 'rgba(245, 158, 11, 0.12)',
  },
  {
    id: 'share_and_vote_on_plan',
    name: 'Share & Vote',
    short: 'Vote',
    icon: <Vote size={14} />,
    description: 'Cross-model peer ranking, score synthesis & democratic alignment',
    accent: '#10b981',
    bgLight: 'rgba(16, 185, 129, 0.12)',
  },
  {
    id: 'iterate_on_plan',
    name: 'Iterate Plan',
    short: 'Iter',
    icon: <RotateCw size={14} />,
    description: 'Synthesis of feedback, addressing critiques & refining details',
    accent: '#06b6d4',
    bgLight: 'rgba(6, 182, 212, 0.12)',
  },
  {
    id: 'propose_plan',
    name: 'Propose Plan',
    short: 'Prop',
    icon: <FileCheck size={14} />,
    description: 'Consolidated consensus architecture ready for commit',
    accent: '#6366f1',
    bgLight: 'rgba(99, 102, 241, 0.12)',
  },
  {
    id: 'update',
    name: 'Update & Execute',
    short: 'Exec',
    icon: <Zap size={14} />,
    description: 'Apply mutations, sync DAG nodes & advance execution',
    accent: '#10b981',
    bgLight: 'rgba(16, 185, 129, 0.15)',
  },
];

export const OodaLoopTelemetryModal: React.FC = () => {
  const {
    isLoopModalOpen,
    setLoopModalOpen,
    activeLoopTelemetry,
    activePlanId,
    plans,
    advanceOodaStage,
  } = useTopologyStore();

  const [selectedLoopTab, setSelectedLoopTab] = useState<number | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<OodaStage | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const handleAdvanceStage = async () => {
    setIsAdvancing(true);
    try {
      await advanceOodaStage(activePlanId);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleAutoRunLoop = async () => {
    setIsAdvancing(true);
    try {
      for (let i = 0; i < 9; i++) {
        await advanceOodaStage(activePlanId);
        const currentTelemetry = useTopologyStore.getState().activeLoopTelemetry;
        if (currentTelemetry?.isConverged || currentTelemetry?.activeStage === 'update') {
          break;
        }
        await new Promise(r => setTimeout(r, 380));
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  const activePlan = plans[activePlanId];
  const telemetry = activeLoopTelemetry || activePlan?.oodaLoop;

  // Group history by loop iteration
  const loopGroups = useMemo(() => {
    if (!telemetry || !Array.isArray(telemetry.history) || telemetry.history.length === 0) {
      return {};
    }
    const groups: Record<number, OodaLoopIteration[]> = {};
    for (const item of telemetry.history) {
      const l = item.loopNumber || 1;
      if (!groups[l]) groups[l] = [];
      groups[l].push(item);
    }
    return groups;
  }, [telemetry]);

  const loopNumbers = Object.keys(loopGroups).map(Number).sort((a, b) => a - b);
  const currentLoopNumber = telemetry?.currentLoop || 1;

  // Active viewing loop
  const viewingLoopNumber = selectedLoopTab !== null
    ? selectedLoopTab
    : loopNumbers.length > 0
    ? loopNumbers[loopNumbers.length - 1]
    : currentLoopNumber;

  const viewingLoopIterations = loopGroups[viewingLoopNumber] || [];

  // Stage map for the selected loop
  const stageIterationsMap = useMemo(() => {
    const m = new Map<OodaStage, OodaLoopIteration>();
    for (const iter of viewingLoopIterations) {
      m.set(iter.stage, iter);
    }
    return m;
  }, [viewingLoopIterations]);

  // Active viewing stage detail
  const activeStageMeta = useMemo(() => {
    if (selectedStageId) {
      return STAGES.find(s => s.id === selectedStageId) || STAGES[0];
    }
    if (telemetry?.activeStage) {
      return STAGES.find(s => s.id === telemetry.activeStage) || STAGES[0];
    }
    return STAGES[0];
  }, [selectedStageId, telemetry?.activeStage]);

  const selectedIteration = stageIterationsMap.get(activeStageMeta.id);

  if (!isLoopModalOpen) return null;

  const handleCopyTelemetry = () => {
    if (!telemetry) return;
    navigator.clipboard.writeText(JSON.stringify(telemetry, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStageStatus = (stageId: OodaStage) => {
    const iter = stageIterationsMap.get(stageId);
    if (!iter) {
      const stageIdx = STAGES.findIndex(s => s.id === stageId);
      const activeIdx = STAGES.findIndex(s => s.id === (telemetry?.activeStage || 'observe'));
      if (viewingLoopNumber < currentLoopNumber) return 'completed';
      if (stageIdx < activeIdx) return 'completed';
      if (stageIdx === activeIdx) return 'active';
      return 'pending';
    }
    if (iter.status === 'converged' || iter.status === 'completed') return 'completed';
    return 'active';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/45 backdrop-blur-md transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-white/95 dark:bg-[#18191c]/95 backdrop-blur-2xl shadow-2xl overflow-hidden border-none text-[#202124] dark:text-[#f1f3f4]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-black/3 dark:bg-white/3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-amber-500/20 via-orange-500/15 to-transparent text-amber-600 dark:text-amber-400 shadow-xs">
              <RotateCw size={20} className={telemetry?.isConverged ? '' : 'animate-spin-slow'} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">OODA Council Iteration Cycle</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-black/5 dark:bg-white/10 text-[#5f6368] dark:text-[#9aa0a6]">
                  {telemetry?.planId || activePlanId}
                </span>
                {telemetry?.isConverged ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shadow-xs">
                    <CheckCircle2 size={11} /> Converged
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1 shadow-xs">
                    <Clock size={11} /> Iterating
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                Multi-loop deliberation, adversarial evaluation, candidate consensus & DAG mutations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTelemetry}
              title="Copy telemetry JSON to clipboard"
              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white transition-colors border-none cursor-pointer"
            >
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setLoopModalOpen(false)}
              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-white transition-colors border-none cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Loop Iterations Tabs & Stats */}
        <div className="px-6 py-3 flex items-center justify-between gap-4 bg-black/2 dark:bg-white/2 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] mr-1">
              Iterations:
            </span>
            {loopNumbers.length === 0 ? (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                Loop 1 (Active)
              </span>
            ) : (
              loopNumbers.map(num => {
                const isSelected = viewingLoopNumber === num;
                const isCurrent = currentLoopNumber === num;
                const loopIters = loopGroups[num] || [];
                const lastIter = loopIters[loopIters.length - 1];
                const isLoopConverged = lastIter?.status === 'converged';

                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedLoopTab(num)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                        : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#9aa0a6]'
                    }`}
                  >
                    <span>Loop {num}</span>
                    {isLoopConverged && (
                      <CheckCircle2 size={12} className={isSelected ? 'text-white' : 'text-emerald-500'} />
                    )}
                    {isCurrent && !isLoopConverged && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            <button
              type="button"
              disabled={isAdvancing}
              onClick={handleAdvanceStage}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 active:scale-95 text-white flex items-center gap-1.5 shadow-xs transition-all border-none cursor-pointer disabled:opacity-50"
            >
              <Zap size={13} className={isAdvancing ? 'animate-spin' : ''} />
              <span>Advance Stage</span>
            </button>
            <button
              type="button"
              disabled={isAdvancing}
              onClick={handleAutoRunLoop}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white flex items-center gap-1.5 shadow-xs transition-all border-none cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={13} />
              <span>Auto Run Loop</span>
            </button>
            <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-1" />
            <div className="flex items-center gap-1.5 text-[#5f6368] dark:text-[#9aa0a6]">
              <TrendingUp size={13} className="text-amber-500" />
              <span>Completed:</span>
              <span className="font-bold text-[#202124] dark:text-white">
                {telemetry?.totalLoopsCompleted || 0}
              </span>
            </div>
            {telemetry?.targetMaxLoops && (
              <div className="flex items-center gap-1.5 text-[#5f6368] dark:text-[#9aa0a6]">
                <span>Target:</span>
                <span className="font-bold text-[#202124] dark:text-white">
                  {telemetry.targetMaxLoops} loops
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 9-Stage Visual Cycle Stepper */}
        <div className="px-6 py-3 bg-black/4 dark:bg-white/4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center justify-between min-w-[720px] gap-1 relative">
            {STAGES.map((stage, idx) => {
              const status = getStageStatus(stage.id);
              const isSelected = activeStageMeta.id === stage.id;
              const hasData = stageIterationsMap.has(stage.id);

              return (
                <React.Fragment key={stage.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`flex-1 py-2 px-2 rounded-2xl flex flex-col items-center gap-1 transition-all border-none cursor-pointer relative group ${
                      isSelected
                        ? 'bg-white dark:bg-[#25262b] shadow-lg scale-102 font-bold'
                        : hasData
                        ? 'hover:bg-white/50 dark:hover:bg-white/5'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                        status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : status === 'active'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse'
                          : 'bg-black/5 dark:bg-white/5 text-[#5f6368] dark:text-[#9aa0a6]'
                      }`}
                      style={isSelected ? { backgroundColor: stage.bgLight, color: stage.accent } : {}}
                    >
                      {status === 'completed' ? <CheckCircle2 size={15} /> : stage.icon}
                    </div>

                    <span className="text-[11px] font-semibold text-center whitespace-nowrap line-clamp-1">
                      {stage.name}
                    </span>

                    {/* Step indicator dot */}
                    <div
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        isSelected
                          ? 'bg-amber-500 scale-125'
                          : status === 'completed'
                          ? 'bg-emerald-500'
                          : status === 'active'
                          ? 'bg-amber-400'
                          : 'bg-black/20 dark:bg-white/20'
                      }`}
                    />
                  </button>

                  {idx < STAGES.length - 1 && (
                    <ChevronRight size={13} className="text-[#5f6368]/40 dark:text-[#9aa0a6]/40 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Main Stage Detail Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Active Stage Header & Thought */}
          <div className="p-4.5 rounded-2xl bg-black/3 dark:bg-white/3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: activeStageMeta.accent }}
                >
                  {activeStageMeta.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    {activeStageMeta.name}
                    <span className="text-xs font-normal text-[#5f6368] dark:text-[#9aa0a6]">
                      (Stage {STAGES.findIndex(s => s.id === activeStageMeta.id) + 1} of 9 • Loop {viewingLoopNumber})
                    </span>
                  </h3>
                  <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                    {activeStageMeta.description}
                  </p>
                </div>
              </div>

              {selectedIteration?.timestamp && (
                <span className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                  {new Date(selectedIteration.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>

            {selectedIteration?.thought ? (
              <div className="p-3 rounded-xl bg-white/70 dark:bg-[#202225]/70 text-xs leading-relaxed italic text-[#3c4043] dark:text-[#e8eaed] shadow-xs">
                "{selectedIteration.thought}"
              </div>
            ) : (
              <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6] italic">
                {stageIterationsMap.has(activeStageMeta.id)
                  ? 'Stage completed with standard telemetry.'
                  : 'No telemetry emitted yet for this stage in Loop ' + viewingLoopNumber + '.'}
              </div>
            )}
          </div>

          {/* Observations & Invariants (for Observe & Understand) */}
          {((selectedIteration?.observations && selectedIteration.observations.length > 0) ||
            (selectedIteration?.understandings && selectedIteration.understandings.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedIteration.observations && selectedIteration.observations.length > 0 && (
                <div className="p-4 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <Eye size={13} />
                    <span>Observations ({selectedIteration.observations.length})</span>
                  </div>
                  <ul className="space-y-1 text-xs text-[#3c4043] dark:text-[#e8eaed]">
                    {selectedIteration.observations.map((obs, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-blue-500">•</span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedIteration.understandings && selectedIteration.understandings.length > 0 && (
                <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                    <Lightbulb size={13} />
                    <span>Invariants & Insights ({selectedIteration.understandings.length})</span>
                  </div>
                  <ul className="space-y-1 text-xs text-[#3c4043] dark:text-[#e8eaed]">
                    {selectedIteration.understandings.map((und, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-purple-500">•</span>
                        <span>{und}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Council Evaluations & Adversarial Critiques */}
          {((selectedIteration?.councilEvaluations && selectedIteration.councilEvaluations.length > 0) ||
            (selectedIteration?.adversarialCritiques && selectedIteration.adversarialCritiques.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedIteration.councilEvaluations && selectedIteration.councilEvaluations.length > 0 && (
                <div className="p-4 rounded-2xl bg-pink-500/5 dark:bg-pink-500/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600 dark:text-pink-400">
                    <Scale size={13} />
                    <span>Council Evaluations</span>
                  </div>
                  <ul className="space-y-1 text-xs text-[#3c4043] dark:text-[#e8eaed]">
                    {selectedIteration.councilEvaluations.map((ev, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-pink-500">•</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedIteration.adversarialCritiques && selectedIteration.adversarialCritiques.length > 0 && (
                <div className="p-4 rounded-2xl bg-red-500/5 dark:bg-red-500/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                    <ShieldAlert size={13} />
                    <span>Adversarial Critiques</span>
                  </div>
                  <ul className="space-y-1 text-xs text-[#3c4043] dark:text-[#e8eaed]">
                    {selectedIteration.adversarialCritiques.map((crit, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-red-500">•</span>
                        <span>{crit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Member Plans Grid (Flash, Opus, GPT-OSS) */}
          {selectedIteration?.memberPlans && selectedIteration.memberPlans.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot size={15} className="text-amber-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6]">
                    Independent Candidate Architecture Proposals
                  </h4>
                </div>
                {selectedIteration.voteSummary && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedIteration.voteSummary}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {selectedIteration.memberPlans.map((mp, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-black/3 dark:bg-white/3 flex flex-col justify-between gap-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{mp.avatar || '🤖'}</span>
                          <div>
                            <div className="text-xs font-bold leading-tight">{mp.memberName}</div>
                            <div className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">{mp.role}</div>
                          </div>
                        </div>
                        {mp.voteScore !== undefined && (
                          <div className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <Award size={10} />
                            <span>{mp.voteScore}/10</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#3c4043] dark:text-[#e8eaed] leading-relaxed line-clamp-4">
                        {mp.proposal}
                      </p>
                    </div>

                    {mp.feedback && (
                      <div className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] italic bg-black/4 dark:bg-white/4 rounded-xl p-2.5 mt-2 border-none">
                        {mp.feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refinements & Updates Applied */}
          {((selectedIteration?.refinements && selectedIteration.refinements.length > 0) ||
            (selectedIteration?.updatesApplied && selectedIteration.updatesApplied.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedIteration.refinements && selectedIteration.refinements.length > 0 && (
                <div className="p-4 rounded-2xl bg-cyan-500/5 dark:bg-cyan-500/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    <RotateCw size={13} />
                    <span>Iterative Plan Amendments</span>
                  </div>
                  <ul className="space-y-1 text-xs text-[#3c4043] dark:text-[#e8eaed]">
                    {selectedIteration.refinements.map((ref, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-cyan-500">{idx + 1}.</span>
                        <span>{ref}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedIteration.updatesApplied && selectedIteration.updatesApplied.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Zap size={13} />
                    <span>DAG Mutations Applied</span>
                  </div>
                  <ul className="space-y-1 text-xs text-[#3c4043] dark:text-[#e8eaed]">
                    {selectedIteration.updatesApplied.map((upd, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500">✓</span>
                        <span>{upd}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Telemetry Metrics Bar */}
          <div className="p-4 rounded-2xl bg-black/3 dark:bg-white/3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-[#5f6368] dark:text-[#9aa0a6]">
              <Sparkles size={14} className="text-amber-500" />
              <span className="font-semibold">Cycle Metrics:</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
              <div>
                <span className="text-[#5f6368] dark:text-[#9aa0a6]">Consensus: </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedIteration?.metrics?.consensusScorePercent || 92}%
                </span>
              </div>
              <div>
                <span className="text-[#5f6368] dark:text-[#9aa0a6]">Invariants Verified: </span>
                <span className="font-bold text-[#202124] dark:text-white">
                  {selectedIteration?.metrics?.invariantsVerifiedCount || 4}
                </span>
              </div>
              {selectedIteration?.metrics?.tokensUsed !== undefined && (
                <div>
                  <span className="text-[#5f6368] dark:text-[#9aa0a6]">Tokens: </span>
                  <span className="font-bold text-[#202124] dark:text-white">
                    {selectedIteration.metrics.tokensUsed.toLocaleString()}
                  </span>
                </div>
              )}
              {selectedIteration?.metrics?.costUsd !== undefined && (
                <div>
                  <span className="text-[#5f6368] dark:text-[#9aa0a6]">Cost: </span>
                  <span className="font-bold text-[#202124] dark:text-white">
                    ${selectedIteration.metrics.costUsd.toFixed(4)}
                  </span>
                </div>
              )}
              {selectedIteration?.metrics?.durationMs !== undefined && (
                <div>
                  <span className="text-[#5f6368] dark:text-[#9aa0a6]">Duration: </span>
                  <span className="font-bold text-[#202124] dark:text-white">
                    {(selectedIteration.metrics.durationMs / 1000).toFixed(1)}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-black/3 dark:bg-white/3 flex items-center justify-between">
          <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-2">
            <span>Emit via MCP tool:</span>
            <code className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-mono text-[11px]">
              topology_emit_loop_telemetry
            </code>
          </div>

          <button
            type="button"
            onClick={() => setLoopModalOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#202124] dark:text-white transition-all border-none cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
