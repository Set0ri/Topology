import React from 'react';
import { ChevronRight, ArrowLeft, FolderTree, Home } from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';

export const SubgraphBreadcrumbs: React.FC = () => {
  const subgraphStack = useTopologyStore(s => s.subgraphStack);
  const exitSubgraph = useTopologyStore(s => s.exitSubgraph);
  const navigateToBreadcrumb = useTopologyStore(s => s.navigateToBreadcrumb);

  if (subgraphStack.length === 0) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 dark:bg-cat-mocha-base/85 text-cat-latte-text dark:text-cat-mocha-text backdrop-blur-2xl shadow-elevated-md border-none select-none transition-colors duration-200">
      {/* Return to parent button */}
      <button
        onClick={exitSubgraph}
        title="Return to Parent Topology"
        className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-cat-latte-surface0/80 dark:bg-cat-mocha-surface0 hover:bg-cat-latte-surface1 dark:hover:bg-cat-mocha-surface1 text-cat-latte-text dark:text-cat-mocha-text transition-colors border-none cursor-pointer"
      >
        <ArrowLeft size={13} className="text-cat-mocha-mauve" />
        <span>Exit Sub-Graph</span>
      </button>

      <span className="w-px h-4 bg-cat-latte-surface1 dark:bg-cat-mocha-surface1" />

      {/* Root Link */}
      <button
        onClick={() => navigateToBreadcrumb(-1)}
        className="flex items-center gap-1 text-xs font-medium text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text transition-colors border-none bg-transparent cursor-pointer"
      >
        <Home size={13} />
        <span>Root Topology</span>
      </button>

      {/* Stack Trail */}
      {subgraphStack.map((frame, idx) => (
        <React.Fragment key={frame.parentId}>
          <ChevronRight size={13} className="text-cat-latte-overlay0 dark:text-cat-mocha-overlay1 shrink-0" />
          <button
            onClick={() => navigateToBreadcrumb(idx)}
            className={`text-xs font-medium transition-colors border-none bg-transparent cursor-pointer truncate max-w-[140px] ${
              idx === subgraphStack.length - 1
                ? 'text-cat-mocha-mauve font-semibold'
                : 'text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text'
            }`}
          >
            {frame.parentLabel}
          </button>
        </React.Fragment>
      ))}

      {/* Depth Indicator Badge */}
      <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-cat-mocha-mauve/15 text-cat-mocha-mauve">
        Depth {subgraphStack.length}
      </span>
    </div>
  );
};
