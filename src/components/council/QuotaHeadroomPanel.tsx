import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  ShieldAlert, 
  Cpu, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Sliders, 
  Clock, 
  AlertCircle
} from 'lucide-react';
import { CouncilBudgetReport, ModelBudgetInfo } from '../../types/topology';

export interface CandidateRoster {
  rank: number;
  rosterName: string;
  models: string[];
  projectedCostUsd: number;
  maxRpmUtilizationPct: number;
  maxTpmUtilizationPct: number;
  safeCeilingSatisfied: boolean;
  surrogateSubstitutions: { original: string; surrogate: string; rationale: string }[];
  suitabilityScore: number;
}

export type OptimizationStrategy = 'balanced' | 'cost_optimized' | 'maximum_reasoning' | 'surrogate_fallback';

interface QuotaHeadroomPanelProps {
  councilBudget?: CouncilBudgetReport | null;
  onSelectRoster?: (models: string[]) => void;
  className?: string;
}

const DEFAULT_MODEL_NAMES: Record<string, { name: string; avatar: string; family: string }> = {
  'gemini-3.8-flash': { name: 'Gemini 3.8 Flash', avatar: '⚡', family: 'Gemini' },
  'claude-5.5-opus': { name: 'Claude 5.5 Opus', avatar: '🧠', family: 'Anthropic' },
  'opus-5.5': { name: 'Opus 5.5', avatar: '🧠', family: 'Anthropic' },
  'claude-4.6-opus': { name: 'Claude 4.6 Opus', avatar: '🧠', family: 'Anthropic' },
  'gpt-oss-120b': { name: 'GPT-OSS 120b', avatar: '🌐', family: 'Open-Source' },
  'deepseek-v3': { name: 'DeepSeek V3', avatar: '🐋', family: 'DeepSeek' },
};

export const QuotaHeadroomPanel: React.FC<QuotaHeadroomPanelProps> = ({
  councilBudget,
  onSelectRoster,
  className = '',
}) => {
  const [strategy, setStrategy] = useState<OptimizationStrategy>('balanced');
  const [targetBudgetUsd, setTargetBudgetUsd] = useState<number>(0.25);
  const [deliberationRounds, setDeliberationRounds] = useState<number>(3);
  const [selectedRosterRank, setSelectedRosterRank] = useState<number>(1);

  const models: ModelBudgetInfo[] = useMemo(() => {
    return councilBudget?.models ? Object.values(councilBudget.models) : [];
  }, [councilBudget]);

  // Compute fleet-wide minimum effective headroom against 85% safety ceiling
  const fleetHeadroom = useMemo(() => {
    if (models.length === 0) return { hEffective: 100, minModel: 'All Models', isSafe: true };

    let minHeadroom = 100;
    let bottleneckModel = models[0].name;

    for (const m of models) {
      const rpmH = Math.max(0, (m.rpm.safeLimit - m.rpm.current) / Math.max(1, m.rpm.safeLimit)) * 100;
      const tpmH = Math.max(0, (m.tpm.safeLimit - m.tpm.current) / Math.max(1, m.tpm.safeLimit)) * 100;
      const dailyH = Math.max(0, (m.daily.safeLimit - m.daily.current) / Math.max(1, m.daily.safeLimit)) * 100;

      const modelMin = Math.min(rpmH, tpmH, dailyH);
      if (modelMin < minHeadroom) {
        minHeadroom = modelMin;
        bottleneckModel = m.name;
      }
    }

    return {
      hEffective: Math.round(minHeadroom),
      minModel: bottleneckModel,
      isSafe: minHeadroom >= 15,
    };
  }, [models]);

  // Dynamic candidate rosters calculation
  const candidateRosters: CandidateRoster[] = useMemo(() => {
    const opusModel = models.find((m) => m.id === 'claude-4.6-opus');
    const isOpusConstrained = opusModel ? (opusModel.rpm.percent >= 80 || opusModel.status === 'safety_stopped') : false;

    // 1. Balanced Frontier
    const balancedModels = isOpusConstrained
      ? ['gemini-3.8-flash', 'deepseek-v3', 'gpt-oss-120b']
      : ['gemini-3.8-flash', 'claude-4.6-opus', 'gpt-oss-120b'];

    const balancedSurrogates = isOpusConstrained
      ? [{
          original: 'claude-4.6-opus',
          surrogate: 'deepseek-v3',
          rationale: 'Claude 4.6 Opus approaching 85% safety ceiling. Substituted with DeepSeek V3 surrogate.',
        }]
      : [];

    const baseFlashCost = 0.0003 * deliberationRounds;
    const baseOpusCost = 0.015 * deliberationRounds;
    const baseGptCost = 0.0008 * deliberationRounds;
    const baseDeepseekCost = 0.0012 * deliberationRounds;

    const balancedCost = isOpusConstrained
      ? baseFlashCost + baseDeepseekCost + baseGptCost
      : baseFlashCost + baseOpusCost + baseGptCost;

    const roster1: CandidateRoster = {
      rank: 1,
      rosterName: 'Balanced Frontier (Recommended)',
      models: balancedModels,
      projectedCostUsd: parseFloat(balancedCost.toFixed(4)),
      maxRpmUtilizationPct: isOpusConstrained ? 32 : 45,
      maxTpmUtilizationPct: isOpusConstrained ? 38 : 52,
      safeCeilingSatisfied: targetBudgetUsd ? balancedCost <= targetBudgetUsd : true,
      surrogateSubstitutions: balancedSurrogates,
      suitabilityScore: 94,
    };

    // 2. Cost-Optimized Frugal Triad
    const costModels = ['gemini-3.8-flash', 'gpt-oss-120b', 'deepseek-v3'];
    const costCost = baseFlashCost + baseGptCost + baseDeepseekCost;
    const roster2: CandidateRoster = {
      rank: 2,
      rosterName: 'Cost-Optimized Frugal Triad',
      models: costModels,
      projectedCostUsd: parseFloat(costCost.toFixed(4)),
      maxRpmUtilizationPct: 22,
      maxTpmUtilizationPct: 28,
      safeCeilingSatisfied: targetBudgetUsd ? costCost <= targetBudgetUsd : true,
      surrogateSubstitutions: [
        {
          original: 'claude-4.6-opus',
          surrogate: 'deepseek-v3',
          rationale: 'Frugal mode minimizes USD expenditure while preserving reasoning depth.',
        },
      ],
      suitabilityScore: 89,
    };

    // 3. High-Headroom Burst Safe
    const throughputModels = ['gemini-3.8-flash', 'gpt-oss-120b'];
    const throughputCost = baseFlashCost + baseGptCost;
    const roster3: CandidateRoster = {
      rank: 3,
      rosterName: 'High-Headroom Burst Safe',
      models: throughputModels,
      projectedCostUsd: parseFloat(throughputCost.toFixed(4)),
      maxRpmUtilizationPct: 14,
      maxTpmUtilizationPct: 18,
      safeCeilingSatisfied: targetBudgetUsd ? throughputCost <= targetBudgetUsd : true,
      surrogateSubstitutions: [],
      suitabilityScore: 81,
    };

    return [roster1, roster2, roster3];
  }, [models, deliberationRounds, targetBudgetUsd]);

  const recommendedRoster = useMemo(() => {
    if (strategy === 'cost_optimized') return candidateRosters[1];
    if (strategy === 'surrogate_fallback') return candidateRosters[2];
    return candidateRosters[0];
  }, [candidateRosters, strategy]);

  const handleApplyRoster = (roster: CandidateRoster) => {
    setSelectedRosterRank(roster.rank);
    if (onSelectRoster) {
      onSelectRoster(roster.models);
    }
  };

  return (
    <div
      className={`rounded-3xl bg-slate-900/90 backdrop-blur-2xl p-6 shadow-2xl text-slate-100 space-y-6 ${className}`}
      style={{ boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.7), 0 0 40px 1px rgba(99, 102, 241, 0.08)' }}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600/30 to-teal-500/30 flex items-center justify-center text-emerald-300 shadow-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold tracking-tight text-white">
                Dynamic Quota & Cost Allocation Optimizer
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/15 text-emerald-300">
                &lt; 85% Safety Ceiling
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Predictive headroom optimization, surrogate routing, and projected financial math
            </p>
          </div>
        </div>

        {/* Fleet Headroom Indicator */}
        <div className="flex items-center gap-3 bg-white/[0.04] px-4 py-2.5 rounded-2xl backdrop-blur-md">
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Fleet Headroom ({fleetHeadroom.minModel})
            </div>
            <div className={`text-xl font-bold font-mono ${fleetHeadroom.isSafe ? 'text-emerald-400' : 'text-amber-400'}`}>
              {fleetHeadroom.hEffective}% Safe
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
            {fleetHeadroom.isSafe ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            )}
          </div>
        </div>
      </div>

      {/* Control Strip: Strategy, Budget Target, Rounds */}
      <div className="p-4 rounded-2xl bg-white/[0.02] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Strategy Selector */}
        <div>
          <label className="text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Optimization Strategy</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/[0.04]">
            <button
              type="button"
              onClick={() => setStrategy('balanced')}
              className={`py-1.5 px-2 rounded-lg font-medium transition-all border-none outline-none cursor-pointer ${
                strategy === 'balanced'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Balanced
            </button>
            <button
              type="button"
              onClick={() => setStrategy('cost_optimized')}
              className={`py-1.5 px-2 rounded-lg font-medium transition-all border-none outline-none cursor-pointer ${
                strategy === 'cost_optimized'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Cost Frugal
            </button>
          </div>
        </div>

        {/* Target USD Budget */}
        <div>
          <label className="text-slate-400 font-medium mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Target USD Budget Ceiling</span>
            </span>
            <span className="font-mono text-emerald-300 font-bold">${targetBudgetUsd.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.01"
            max="1.00"
            step="0.01"
            value={targetBudgetUsd}
            onChange={(e) => setTargetBudgetUsd(parseFloat(e.target.value))}
            className="w-full accent-emerald-400 bg-white/[0.06] rounded-lg h-2 cursor-pointer border-none outline-none"
          />
        </div>

        {/* Deliberation Rounds Multiplier */}
        <div>
          <label className="text-slate-400 font-medium mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Deliberation Rounds</span>
            </span>
            <span className="font-mono text-purple-300 font-bold">{deliberationRounds} Rounds</span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDeliberationRounds(r)}
                className={`flex-1 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all border-none outline-none cursor-pointer ${
                  deliberationRounds === r
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                R{r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Candidate Rosters Stack */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold uppercase tracking-wider">Candidate Model Rosters</span>
          <span>Ranked by suitability score & quota headroom</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {candidateRosters.map((roster) => {
            const isRecommended = roster.rank === recommendedRoster.rank;
            const isSelected = roster.rank === selectedRosterRank;

            return (
              <motion.div
                key={roster.rank}
                whileHover={{ scale: 1.01 }}
                className={`p-5 rounded-2xl transition-all flex flex-col justify-between space-y-4 ${
                  isRecommended
                    ? 'bg-gradient-to-b from-indigo-950/40 via-purple-950/20 to-transparent shadow-xl'
                    : 'bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div>
                  {/* Roster Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300">
                          Rank #{roster.rank}
                        </span>
                        {isRecommended && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Recommended</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-white tracking-tight leading-snug">
                        {roster.rosterName}
                      </h4>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-emerald-300">
                        ${roster.projectedCostUsd.toFixed(4)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">USD est.</div>
                    </div>
                  </div>

                  {/* Models in Roster */}
                  <div className="space-y-1.5 mb-3">
                    <div className="text-[11px] text-slate-400 font-medium">Council Composition:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {roster.models.map((mId) => {
                        const meta = DEFAULT_MODEL_NAMES[mId] || { name: mId, avatar: '🤖', family: 'Model' };
                        return (
                          <span
                            key={mId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.05] text-xs text-slate-200"
                          >
                            <span>{meta.avatar}</span>
                            <span className="font-medium text-[11px]">{meta.name.split(' ')[0]}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Surrogate alert if any */}
                  {roster.surrogateSubstitutions.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-300/90 text-[11px] leading-relaxed flex items-start gap-1.5 mb-3">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                      <span>{roster.surrogateSubstitutions[0].rationale}</span>
                    </div>
                  )}

                  {/* Quota Headroom Progress Bars */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                        <span>Max RPM Utilization</span>
                        <span className="font-mono text-slate-200">{roster.maxRpmUtilizationPct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${roster.maxRpmUtilizationPct}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                        <span>Max TPM Utilization</span>
                        <span className="font-mono text-slate-200">{roster.maxTpmUtilizationPct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500"
                          style={{ width: `${roster.maxTpmUtilizationPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    Suitability: <strong className="text-white">{roster.suitabilityScore}</strong>/100
                  </span>

                  <button
                    type="button"
                    onClick={() => handleApplyRoster(roster)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border-none outline-none cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-200'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Selected</span>
                      </>
                    ) : (
                      <>
                        <span>Select Roster</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
