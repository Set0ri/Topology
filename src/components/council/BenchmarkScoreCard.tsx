import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  GitMerge, 
  ShieldCheck, 
  Network, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Info
} from 'lucide-react';
import { CouncilBenchmarkReport } from '../../types/topology';

interface BenchmarkScoreCardProps {
  report?: CouncilBenchmarkReport | null;
  className?: string;
}

export const BenchmarkScoreCard: React.FC<BenchmarkScoreCardProps> = ({
  report,
  className = '',
}) => {
  const [showConstraintDetails, setShowConstraintDetails] = useState(false);
  const [showCritiqueDetails, setShowCritiqueDetails] = useState(false);

  if (!report) {
    return (
      <div className={`p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl shadow-2xl text-center text-slate-400 space-y-3 ${className}`}>
        <Award className="w-10 h-10 mx-auto text-indigo-400/40" />
        <h3 className="text-sm font-semibold text-white">Objective Benchmark Evaluator</h3>
        <p className="text-xs max-w-md mx-auto text-slate-400 leading-relaxed">
          Benchmark scoring evaluates non-negotiable constraints, adversarial resolution, model agreement variance, and Tarjan 0-deadlock topological coherence upon deliberation completion.
        </p>
      </div>
    );
  }

  const {
    overallScorePct,
    status,
    constraintSatisfactionPct,
    adversarialResolutionScorePct,
    consensusConfidencePct,
    architecturalCoherence,
    summary,
    constraintEvaluations = [],
    critiqueResolutions = [],
  } = report;

  const getStatusBadge = () => {
    switch (status) {
      case 'OPTIMAL':
        return {
          label: 'OPTIMAL (>=85%)',
          className: 'bg-emerald-500/20 text-emerald-300',
          icon: CheckCircle2,
        };
      case 'VIABLE':
        return {
          label: 'VIABLE (>=70%)',
          className: 'bg-amber-500/20 text-amber-300',
          icon: AlertTriangle,
        };
      case 'NEEDS_REFINEMENT':
      default:
        return {
          label: 'NEEDS REFINEMENT (<70%)',
          className: 'bg-rose-500/20 text-rose-300',
          icon: XCircle,
        };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getBarColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 70) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  return (
    <div
      className={`rounded-3xl bg-slate-900/90 backdrop-blur-2xl p-6 shadow-2xl text-slate-100 space-y-6 ${className}`}
      style={{ boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.7), 0 0 40px 1px rgba(99, 102, 241, 0.08)' }}
    >
      {/* Header & Overall Composite Score */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-purple-500/30 flex items-center justify-center text-indigo-300 shadow-lg">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold tracking-tight text-white">
                Deliberation Benchmark Evaluator
              </h3>
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.className}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{statusBadge.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Quantitative verification of multi-model consensus and DAG synthesis
            </p>
          </div>
        </div>

        {/* Hero Composite Score Circle */}
        <div className="flex items-center gap-4 bg-white/[0.04] px-5 py-3 rounded-2xl backdrop-blur-md">
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Composite Score</div>
            <div className={`text-2xl font-bold font-mono tracking-tight ${getScoreColor(overallScorePct)}`}>
              {overallScorePct}%
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center">
            <Sparkles className={`w-5 h-5 ${getScoreColor(overallScorePct)}`} />
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      {summary && (
        <div className="p-3.5 rounded-2xl bg-white/[0.03] text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <span>{summary}</span>
        </div>
      )}

      {/* 4 Primary Benchmark Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Constraint Satisfaction */}
        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className={`text-lg font-bold font-mono ${getScoreColor(constraintSatisfactionPct)}`}>
              {constraintSatisfactionPct}%
            </span>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Constraint Satisfaction</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Ratio of non-negotiable architectural invariants met in final DAG
            </p>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(constraintSatisfactionPct)}`}
              style={{ width: `${constraintSatisfactionPct}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Adversarial Robustness */}
        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
              <GitMerge className="w-4 h-4" />
            </div>
            <span className={`text-lg font-bold font-mono ${getScoreColor(adversarialResolutionScorePct)}`}>
              {adversarialResolutionScorePct}%
            </span>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Adversarial Robustness</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Quantitative resolution of peer critiques in subsequent rounds
            </p>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(adversarialResolutionScorePct)}`}
              style={{ width: `${adversarialResolutionScorePct}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Consensus Confidence */}
        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className={`text-lg font-bold font-mono ${getScoreColor(consensusConfidencePct)}`}>
              {consensusConfidencePct}%
            </span>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Consensus Confidence</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Cross-model convergence metric normalized across 3 families
            </p>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(consensusConfidencePct)}`}
              style={{ width: `${consensusConfidencePct}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Architectural Coherence */}
        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition-all flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400">
              <Network className="w-4 h-4" />
            </div>
            <span className={`text-lg font-bold font-mono ${getScoreColor(architecturalCoherence.scorePct)}`}>
              {architecturalCoherence.scorePct}%
            </span>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Architectural Coherence</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              {architecturalCoherence.hasCycle ? 'Cyclic deadlock detected!' : 'Tarjan 0-deadlock verified DAG'}
            </p>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(architecturalCoherence.scorePct)}`}
              style={{ width: `${architecturalCoherence.scorePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Graph Theory & Formal Verification Proof Badges */}
      <div className="p-4 rounded-2xl bg-white/[0.02] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Formal Graph Invariants:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono flex items-center gap-1.5 ${
            !architecturalCoherence.hasCycle 
              ? 'bg-emerald-500/15 text-emerald-300' 
              : 'bg-rose-500/20 text-rose-300'
          }`}>
            {!architecturalCoherence.hasCycle ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>Tarjan Cycle Status: {architecturalCoherence.hasCycle ? 'CYCLE DETECTED' : '0 Deadlocks (Acyclic)'}</span>
          </span>

          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-indigo-500/15 text-indigo-300 flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-indigo-400" />
            <span>Kahn Topological Order: {architecturalCoherence.isCoherent ? 'Strictly Valid' : 'Check Dependencies'}</span>
          </span>

          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-purple-500/15 text-purple-300 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-purple-400" />
            <span>Terminal Milestones: {architecturalCoherence.terminalMilestoneCount}</span>
          </span>
        </div>
      </div>

      {/* Expandable Drill-Down Details */}
      <div className="space-y-3 pt-2">
        {/* Toggle Constraint Invariant Details */}
        {constraintEvaluations.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowConstraintDetails(!showConstraintDetails)}
              className="w-full p-4 flex items-center justify-between text-left text-xs text-slate-200 hover:bg-white/[0.03] transition-colors border-none outline-none cursor-pointer"
            >
              <span className="font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Non-Negotiable Constraints Verification ({constraintEvaluations.length})</span>
              </span>
              {showConstraintDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showConstraintDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 space-y-2 text-xs"
                >
                  {constraintEvaluations.map((c, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.03] flex items-start gap-3">
                      {c.satisfied ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold text-white">{c.constraint}</div>
                        {c.evidenceSnippet && (
                          <p className="text-[11px] text-slate-400 mt-1 italic leading-relaxed">
                            "{c.evidenceSnippet}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Toggle Adversarial Critiques Resolution Details */}
        {critiqueResolutions.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCritiqueDetails(!showCritiqueDetails)}
              className="w-full p-4 flex items-center justify-between text-left text-xs text-slate-200 hover:bg-white/[0.03] transition-colors border-none outline-none cursor-pointer"
            >
              <span className="font-semibold flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-amber-400" />
                <span>Adversarial Critiques & Resolution Log ({critiqueResolutions.length})</span>
              </span>
              {showCritiqueDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showCritiqueDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 space-y-2 text-xs"
                >
                  {critiqueResolutions.map((cr, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.03] flex items-start gap-3">
                      {cr.resolved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className="text-slate-300 font-medium">{cr.critique}</div>
                        {cr.mitigationAction && (
                          <div className="text-[11px] text-emerald-300/90">
                            Mitigation: {cr.mitigationAction}
                          </div>
                        )}
                        {(cr.raisedBy || cr.resolvedBy) && (
                          <div className="text-[10px] font-mono text-slate-500">
                            Raised by: {cr.raisedBy || 'Peer'} • Resolved by: {cr.resolvedBy || 'Synthesizer'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
