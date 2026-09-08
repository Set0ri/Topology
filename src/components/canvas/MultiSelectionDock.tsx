import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderTree, 
  AlignHorizontalJustifyCenter, 
  AlignVerticalJustifyCenter, 
  Trash2, 
  CheckCircle2, 
  X, 
  Layers,
  Play
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { NodeStatus } from '../../types/topology';

export const MultiSelectionDock: React.FC = () => {
  const selectedNodeIds = useTopologyStore(s => s.selectedNodeIds);
  const clearNodeSelection = useTopologyStore(s => s.clearNodeSelection);
  const bundleSelectedIntoSubgraph = useTopologyStore(s => s.bundleSelectedIntoSubgraph);
  const alignSelectedNodes = useTopologyStore(s => s.alignSelectedNodes);
  const batchSetStatus = useTopologyStore(s => s.batchSetStatus);
  const batchDeleteNodes = useTopologyStore(s => s.batchDeleteNodes);

  const [bundleLabel, setBundleLabel] = useState('');
  const [isNamingBundle, setIsNamingBundle] = useState(false);

  if (selectedNodeIds.length < 2) return null;

  const handleBundle = () => {
    bundleSelectedIntoSubgraph(bundleLabel.trim() || undefined);
    setIsNamingBundle(false);
    setBundleLabel('');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1.5rem)] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-white/95 dark:bg-[#181a24]/95 text-[#202124] dark:text-[#f8fafc] backdrop-blur-2xl shadow-elevated-xl border-none flex items-center gap-1.5 sm:gap-2 select-none overflow-x-auto no-scrollbar"
      >
        {/* Selection Count Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-semibold shrink-0">
          <Layers size={13} className="text-[#1a73e8]" />
          <span>{selectedNodeIds.length} <span className="hidden sm:inline">Nodes</span></span>
        </div>

        <div className="h-4 w-[1px] bg-black/5 dark:bg-white/10 mx-0.5 shrink-0" />

        {/* Bundle into Subgraph */}
        {isNamingBundle ? (
          <div className="flex items-center gap-1.5 animate-fadeIn shrink-0">
            <input
              type="text"
              autoFocus
              value={bundleLabel}
              onChange={(e) => setBundleLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBundle()}
              placeholder="Subgraph Name..."
              className="px-2.5 py-1 rounded-xl text-xs bg-slate-100 dark:bg-white/5 text-[#202124] dark:text-[#f8fafc] border-none focus:outline-none w-28 sm:w-36"
            />
            <button
              type="button"
              onClick={handleBundle}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#9334e6] text-white border-none cursor-pointer hover:opacity-90"
            >
              Bundle
            </button>
            <button
              type="button"
              onClick={() => setIsNamingBundle(false)}
              className="p-1 rounded-xl text-xs hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] border-none cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsNamingBundle(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#9334e6]/10 hover:bg-[#9334e6]/20 text-[#9334e6] dark:text-[#c084fc] transition-all border-none cursor-pointer shrink-0"
            title="Bundle selected nodes into a nested sub-graph"
          >
            <FolderTree size={13} />
            <span className="hidden sm:inline">Bundle Subgraph</span>
            <span className="sm:hidden">Bundle</span>
          </button>
        )}

        {/* Alignment controls */}
        <button
          type="button"
          onClick={() => alignSelectedNodes('horizontal')}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer shrink-0"
          title="Distribute and align horizontally"
        >
          <AlignHorizontalJustifyCenter size={13} />
          <span className="hidden sm:inline">Align </span><span>X</span>
        </button>

        <button
          type="button"
          onClick={() => alignSelectedNodes('vertical')}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer shrink-0"
          title="Distribute and align vertically"
        >
          <AlignVerticalJustifyCenter size={13} />
          <span className="hidden sm:inline">Align </span><span>Y</span>
        </button>

        <div className="h-4 w-[1px] bg-black/5 dark:bg-white/10 mx-0.5 shrink-0" />

        {/* Batch Status */}
        <button
          type="button"
          onClick={() => batchSetStatus('ready')}
          className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-medium hover:bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8] transition-colors border-none cursor-pointer shrink-0"
          title="Set all selected to Ready"
        >
          <Play size={11} />
          <span>Ready</span>
        </button>

        <button
          type="button"
          onClick={() => batchSetStatus('completed')}
          className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-medium hover:bg-[#1e8e3e]/10 text-[#1e8e3e] dark:text-[#34a853] transition-colors border-none cursor-pointer shrink-0"
          title="Set all selected to Completed"
        >
          <CheckCircle2 size={11} />
          <span>Done</span>
        </button>

        <div className="h-4 w-[1px] bg-black/5 dark:bg-white/10 mx-0.5 shrink-0" />

        {/* Batch Delete */}
        <button
          type="button"
          onClick={batchDeleteNodes}
          className="p-1.5 rounded-xl text-[#ea4335] hover:bg-[#ea4335]/10 transition-colors border-none cursor-pointer shrink-0"
          title="Delete all selected nodes"
        >
          <Trash2 size={13} />
        </button>

        {/* Clear Selection */}
        <button
          type="button"
          onClick={clearNodeSelection}
          className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] transition-colors border-none cursor-pointer shrink-0"
          title="Clear selection (Esc)"
        >
          <X size={13} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
