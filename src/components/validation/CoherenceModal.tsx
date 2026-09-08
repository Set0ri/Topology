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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl rounded-3xl p-6 bg-white/95 dark:bg-cat-mocha-base/95 text-cat-latte-text dark:text-cat-mocha-text shadow-elevated-lg backdrop-blur-2xl border-none overflow-hidden select-none transition-colors duration-200"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between pb-4 border-none">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${report.isHealthy ? 'bg-cat-mocha-green/20 text-cat-mocha-green' : 'bg-cat-mocha-yellow/20 text-cat-mocha-yellow'}`}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-cat-latte-text dark:text-cat-mocha-text flex items-center gap-2">
                  Graph Coherence Diagnostic
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold ${
                    report.score >= 90 ? 'bg-cat-mocha-green/20 text-cat-mocha-green' :
                    report.score >= 70 ? 'bg-cat-mocha-yellow/20 text-cat-mocha-yellow' :
                    'bg-cat-mocha-red/20 text-cat-mocha-red'
                  }`}>
                    {report.score}% Coherent
                  </span>
                </h3>
                <p className="text-xs text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 mt-0.5">
                  Analytical verification of causal connectivity, deadlocks, and invariant contracts
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 hover:text-cat-latte-text dark:hover:text-cat-mocha-text transition-colors border-none cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Coherence Progress Bar */}
          <div className="my-3 p-4 rounded-2xl bg-cat-latte-surface0/60 dark:bg-cat-mocha-surface0/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cat-latte-subtext0 dark:text-cat-mocha-subtext0">Integrity Index</span>
              <span className="font-mono text-cat-latte-text dark:text-cat-mocha-text">{report.score}/100</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-cat-latte-surface1/60 dark:bg-cat-mocha-surface1/60 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  report.score >= 90 ? 'bg-cat-mocha-green' :
                  report.score >= 70 ? 'bg-cat-mocha-yellow' : 'bg-cat-mocha-red'
                }`}
                style={{ width: `${report.score}%` }}
              />
            </div>
            <div className="flex items-center gap-4 pt-1 text-[11px] text-cat-latte-overlay1 dark:text-cat-mocha-overlay2">
              <span className="flex items-center gap-1 text-cat-mocha-red">
                <AlertOctagon size={12} /> {report.errorCount} Critical Deadlocks
              </span>
              <span className="flex items-center gap-1 text-cat-mocha-peach">
                <AlertTriangle size={12} /> {report.warningCount} Warnings
              </span>
              <span className="flex items-center gap-1 text-cat-mocha-green">
                <CheckCircle2 size={12} /> Verified Graph Nodes
              </span>
            </div>
          </div>

          {/* Issues List */}
          <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {report.issues.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 size={36} className="text-cat-mocha-green mx-auto opacity-80" />
                <h4 className="text-sm font-semibold text-cat-latte-text dark:text-cat-mocha-text">Perfect Graph Coherence</h4>
                <p className="text-xs text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 max-w-md mx-auto">
                  Zero cyclic deadlocks, zero orphaned nodes, and all artifact contracts are satisfied.
                </p>
              </div>
            ) : (
              report.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-3.5 rounded-2xl bg-cat-latte-surface0/60 dark:bg-cat-mocha-surface0/50 hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0/70 transition-colors flex items-start justify-between gap-3 border-none"
                >
                  <div className="flex items-start gap-2.5">
                    {issue.severity === 'error' ? (
                      <AlertOctagon size={16} className="text-cat-mocha-red shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className="text-cat-mocha-peach shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-cat-latte-text dark:text-cat-mocha-text">
                        {issue.title}
                      </div>
                      <p className="text-[11px] text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 leading-relaxed mt-0.5">
                        {issue.description}
                      </p>

                      {/* Involved Node Pills */}
                      {issue.nodeIds.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          <span className="text-[10px] text-cat-latte-overlay1 dark:text-cat-mocha-overlay1 uppercase">Involved:</span>
                          {issue.nodeIds.map(nid => (
                            <button
                              key={nid}
                              type="button"
                              onClick={() => handleSelectNode(nid)}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-cat-latte-surface1 dark:bg-cat-mocha-surface1 text-cat-latte-subtext1 dark:text-cat-mocha-subtext1 hover:text-cat-latte-text dark:hover:text-cat-mocha-text transition-colors border-none cursor-pointer"
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
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cat-latte-mauve text-white dark:bg-cat-mocha-mauve dark:text-cat-mocha-base hover:opacity-90 transition-all duration-150 border-none cursor-pointer shadow-elevated-sm"
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
              className="px-4 py-2 rounded-xl text-xs font-medium bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 hover:bg-cat-latte-surface1 dark:hover:bg-cat-mocha-surface1 text-cat-latte-text dark:text-cat-mocha-text transition-colors border-none cursor-pointer"
            >
              Close Inspector
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
