import React, { useState, useCallback } from 'react';
import { MiniMap, useReactFlow } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  Focus 
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { TopologyNode } from '../../types/topology';
import { getNodeTypeColor } from '../../utils/catppuccin';

export const CanvasMiniMap: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const theme = useTopologyStore(s => s.theme);
  const selectedNodeId = useTopologyStore(s => s.selectedNodeId);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const isDark = theme === 'mocha';

  const handleFitView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    fitView({ padding: 0.25, duration: 400 });
  }, [fitView]);

  const handleZoomIn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    zoomIn({ duration: 250 });
  }, [zoomIn]);

  const handleZoomOut = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    zoomOut({ duration: 250 });
  }, [zoomOut]);

  // If a node is selected, the inspector drawer is open on the right (420px width).
  // Shift the minimap to the left so it is never occluded!
  const hasInspectorOpen = Boolean(selectedNodeId);

  return (
    <motion.div
      animate={{
        right: hasInspectorOpen ? 444 : 16,
      }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="fixed bottom-4 z-20 select-none flex flex-col items-end pointer-events-none"
    >
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.button
            key="collapsed-button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCollapsed(false)}
            title="Expand Canvas Radar"
            className="pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/90 dark:bg-cat-mocha-base/90 text-cat-latte-text dark:text-cat-mocha-text shadow-elevated-md backdrop-blur-2xl transition-all border-none cursor-pointer group"
          >
            <Compass size={16} className="text-cat-latte-mauve dark:text-cat-mocha-mauve group-hover:rotate-45 transition-transform duration-300" />
            <span className="text-xs font-semibold tracking-wide">Radar</span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded-minimap"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-auto flex flex-col rounded-3xl overflow-hidden bg-white/95 dark:bg-cat-mocha-base/90 text-cat-latte-text dark:text-cat-mocha-text shadow-elevated-lg backdrop-blur-2xl border-none transition-colors duration-200"
          >
            {/* Header Control Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-cat-latte-surface1/50 dark:border-cat-mocha-surface0/40">
              <div className="flex items-center gap-2">
                <Compass size={14} className="text-cat-latte-mauve dark:text-cat-mocha-mauve" />
                <span className="text-[11px] font-semibold tracking-wide uppercase opacity-85">
                  Radar
                </span>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  className="p-1 rounded-lg hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text transition-colors border-none cursor-pointer"
                >
                  <ZoomIn size={12} />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="p-1 rounded-lg hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text transition-colors border-none cursor-pointer"
                >
                  <ZoomOut size={12} />
                </button>
                <button
                  type="button"
                  onClick={handleFitView}
                  title="Fit All Nodes in Viewport"
                  className="p-1 rounded-lg hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text transition-colors border-none cursor-pointer"
                >
                  <Focus size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  title="Minimize Radar"
                  className="p-1 rounded-lg hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 hover:text-cat-latte-text dark:hover:text-cat-mocha-text transition-colors border-none cursor-pointer ml-1"
                >
                  <Minimize2 size={12} />
                </button>
              </div>
            </div>

            {/* Interactive React Flow MiniMap */}
            <div className="w-[200px] h-[130px] relative overflow-hidden bg-transparent">
              <MiniMap
                pannable={true}
                zoomable={true}
                nodeStrokeWidth={0}
                nodeBorderRadius={6}
                nodeColor={(n) => {
                  const data = n.data as unknown as TopologyNode;
                  return data?.type 
                    ? getNodeTypeColor(data.type, theme) 
                    : (isDark ? '#b4befe' : '#7287fd');
                }}
                maskColor={isDark ? 'rgba(17, 17, 27, 0.65)' : 'rgba(230, 233, 239, 0.65)'}
                className="!m-0 !w-full !h-full !bg-transparent !border-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
