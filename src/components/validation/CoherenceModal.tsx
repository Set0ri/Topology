import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  X, 
  Wrench, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { CoherenceIssue } from '../../types/topology';

interface CoherenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CoherenceModal: React.FC<CoherenceModalProps> = ({ isOpen, onClose }) => {
  const getCoherenceReport = useTopologyStore(s => s.getCoherenceReport);
  const applyAutoFix = useTopologyStore(s => s.applyAutoFix);
  const selectNode = useTopologyStore(s => s.selectNode);

  if (!isOpen) return null;

  const report = getCoherenceReport();

  const handleFix = (issue: CoherenceIssue) => {
    applyAutoFix(issue.id);
  };

  const handleSelectNode = (nodeId: string) => {
    selectNode(nodeId);
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl p-4 sm:p-6 bg-white/95 dark:bg-[#181a24]/95 text-[#202124] dark:text-[#f8fafc] shadow-elevated-2xl backdrop-blur-2xl border-none overflow-y-auto custom-scrollbar select-none transition-colors duration-200"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-none">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className={`p-2 sm:p-2.5 rounded-2xl shrink-0 ${report.isHealthy ? 'bg-[#e6f4ea] text-[#137333] dark:bg-[#1e8e3e]/20 dark:text-[#34a853]' : 'bg-[#fef7e0] text-[#b06000] dark:bg-[#f9ab00]/20 dark:text-[#fbbc04]'}`}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-[#202124] dark:text-[#f8fafc]">
                    Graph Coherence Diagnostic
                  </h3>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-semibold ${
                    report.score >= 90 ? 'bg-[#e6f4ea] text-[#137333] dark:bg-[#1e8e3e]/20 dark:text-[#34a853]' :
                    report.score >= 70 ? 'bg-[#fef7e0] text-[#b06000] dark:bg-[#f9ab00]/20 dark:text-[#fbbc04]' :
                    'bg-[#fce8e6] text-[#c5221f] dark:bg-[#d93025]/20 dark:text-[#f28b82]'
                  }`}>
                    {report.score}% Coherent
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-[#5f6368] dark:text-[#94a3b8] mt-0.5">
                  Analytical verification of causal connectivity, deadlocks, and invariant contracts
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Coherence Progress Bar */}
          <div className="my-3 p-3.5 sm:p-4 rounded-2xl bg-slate-100/60 dark:bg-white/4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#5f6368] dark:text-[#94a3b8]">Integrity Index</span>
              <span className="font-mono font-bold text-[#202124] dark:text-[#f8fafc]">{report.score}/100</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  report.score >= 90 ? 'bg-[#1e8e3e]' :
                  report.score >= 70 ? 'bg-[#f9ab00]' : 'bg-[#ea4335]'
                }`}
                style={{ width: `${report.score}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#5f6368] dark:text-[#94a3b8]">
              <span className="flex items-center gap-1 text-[#ea4335]">
                <AlertOctagon size={12} /> {report.errorCount} Critical Deadlocks
              </span>
              <span className="flex items-center gap-1 text-[#f9ab00]">
                <AlertTriangle size={12} /> {report.warningCount} Warnings
              </span>
              <span className="flex items-center gap-1 text-[#1e8e3e]">
                <CheckCircle2 size={12} /> Verified Graph Nodes
              </span>
            </div>
          </div>

          {/* Issues List */}
          <div className="mt-2 space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {report.issues.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 size={36} className="text-[#1e8e3e] mx-auto opacity-80" />
                <h4 className="text-sm font-semibold text-[#202124] dark:text-[#f8fafc]">Perfect Graph Coherence</h4>
                <p className="text-xs text-[#5f6368] dark:text-[#94a3b8] max-w-md mx-auto">
                  Zero cyclic deadlocks, zero orphaned nodes, and all artifact contracts are satisfied.
                </p>
              </div>
            ) : (
              report.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-3.5 rounded-2xl bg-slate-100/60 dark:bg-white/4 hover:bg-slate-100/90 dark:hover:bg-white/6 transition-colors flex flex-col sm:flex-row items-start justify-between gap-3 border-none"
                >
                  <div className="flex items-start gap-2.5">
                    {issue.severity === 'error' ? (
                      <AlertOctagon size={16} className="text-[#ea4335] shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="text-[#f9ab00] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-[#202124] dark:text-[#f8fafc]">
                        {issue.title}
                      </div>
                      <p className="text-[11px] text-[#5f6368] dark:text-[#94a3b8] leading-relaxed mt-0.5">
                        {issue.description}
                      </p>

                      {/* Involved Node Pills */}
                      {issue.nodeIds.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          <span className="text-[10px] text-[#5f6368] dark:text-[#94a3b8] uppercase">Involved:</span>
                          {issue.nodeIds.map(nid => (
                            <button
                              key={nid}
                              type="button"
                              onClick={() => handleSelectNode(nid)}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer"
                            >
                              {nid.slice(0, 14)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Auto Fix Button */}
                  {issue.autoFixType && (
                    <button
                      type="button"
                      onClick={() => handleFix(issue)}
                      className="shrink-0 self-end sm:self-center flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white transition-all duration-150 border-none cursor-pointer shadow-elevated-sm"
                    >
                      <Wrench size={12} />
                      <span>{issue.fixLabel || 'Auto-Fix'}</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Modal Footer */}
          <div className="mt-5 pt-3 border-none flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[#202124] dark:text-[#f8fafc] transition-colors border-none cursor-pointer"
            >
              Close Inspector
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
