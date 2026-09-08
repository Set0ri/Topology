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
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 px-3 py-2 rounded-2xl bg-white/95 dark:bg-cat-mocha-mantle/95 text-cat-latte-text dark:text-cat-mocha-text backdrop-blur-2xl shadow-elevated-xl border-none flex items-center gap-2 select-none"
      >
        {/* Selection Count Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 text-xs font-semibold">
          <Layers size={13} className="text-cat-latte-sapphire dark:text-cat-mocha-sapphire" />
          <span>{selectedNodeIds.length} Nodes</span>
        </div>

        <div className="h-4 w-[1px] bg-cat-latte-surface1 dark:bg-cat-mocha-surface1 mx-0.5" />

        {/* Bundle into Subgraph */}
        {isNamingBundle ? (
          <div className="flex items-center gap-1.5 animate-fadeIn">
            <input
              type="text"
              autoFocus
              value={bundleLabel}
              onChange={(e) => setBundleLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBundle()}
              placeholder="Subgraph Name..."
              className="px-2.5 py-1 rounded-xl text-xs bg-cat-latte-surface0 dark:bg-cat-mocha-surface0 text-cat-latte-text dark:text-cat-mocha-text border-none focus:outline-none w-36"
            />
            <button
              type="button"
              onClick={handleBundle}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-cat-latte-mauve text-white dark:bg-cat-mocha-mauve dark:text-cat-mocha-base border-none cursor-pointer hover:opacity-90"
            >
              Bundle
            </button>
            <button
              type="button"
              onClick={() => setIsNamingBundle(false)}
              className="p-1 rounded-xl text-xs hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 border-none cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsNamingBundle(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cat-latte-mauve/15 hover:bg-cat-latte-mauve/25 dark:bg-cat-mocha-mauve/20 dark:hover:bg-cat-mocha-mauve/30 text-cat-latte-mauve dark:text-cat-mocha-mauve transition-all border-none cursor-pointer"
            title="Bundle selected nodes into a nested sub-graph"
          >
            <FolderTree size={13} />
            <span>Bundle into Subgraph</span>
          </button>
        )}

        {/* Alignment controls */}
        <button
          type="button"
          onClick={() => alignSelectedNodes('horizontal')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text transition-colors border-none cursor-pointer"
          title="Distribute and align horizontally"
        >
          <AlignHorizontalJustifyCenter size={13} />
          <span>Align X</span>
        </button>

        <button
          type="button"
          onClick={() => alignSelectedNodes('vertical')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text transition-colors border-none cursor-pointer"
          title="Distribute and align vertically"
        >
          <AlignVerticalJustifyCenter size={13} />
          <span>Align Y</span>
        </button>

        <div className="h-4 w-[1px] bg-cat-latte-surface1 dark:bg-cat-mocha-surface1 mx-0.5" />

        {/* Batch Status */}
        <button
          type="button"
          onClick={() => batchSetStatus('ready')}
          className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-medium hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-sapphire dark:text-cat-mocha-sapphire transition-colors border-none cursor-pointer"
          title="Set all selected to Ready"
        >
          <Play size={11} />
          <span>Ready</span>
        </button>

        <button
          type="button"
          onClick={() => batchSetStatus('completed')}
          className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-medium hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-green dark:text-cat-mocha-green transition-colors border-none cursor-pointer"
          title="Set all selected to Completed"
        >
          <CheckCircle2 size={11} />
          <span>Done</span>
        </button>

        <div className="h-4 w-[1px] bg-cat-latte-surface1 dark:bg-cat-mocha-surface1 mx-0.5" />

        {/* Batch Delete */}
        <button
          type="button"
          onClick={batchDeleteNodes}
          className="p-1.5 rounded-xl text-cat-latte-red dark:text-cat-mocha-red hover:bg-cat-latte-red/10 dark:hover:bg-cat-mocha-red/15 transition-colors border-none cursor-pointer"
          title="Delete all selected nodes"
        >
          <Trash2 size={13} />
        </button>

        {/* Clear Selection */}
        <button
          type="button"
          onClick={clearNodeSelection}
          className="p-1.5 rounded-xl hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 transition-colors border-none cursor-pointer"
          title="Clear selection (Esc)"
        >
          <X size={13} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
