import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  useViewport,
  OnSelectionChangeParams,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTopologyStore } from '../../store/useTopologyStore';
import { TopologyCustomNode } from './TopologyCustomNode';
import { TopologyCustomEdge } from './TopologyCustomEdge';
import { TopologyNode, TopologyEdge } from '../../types/topology';
import { getNodeTypeColor, getPalette } from '../../utils/catppuccin';
import { SpotlightQuickAdd } from './SpotlightQuickAdd';
import { SubgraphBreadcrumbs } from '../subgraph/SubgraphBreadcrumbs';
import { MultiSelectionDock } from './MultiSelectionDock';
import { CanvasMiniMap } from './CanvasMiniMap';
import { LayoutGrid, Plus, Eye, ZoomIn, ZoomOut, ArrowDownUp, ArrowLeftRight } from 'lucide-react';

const nodeTypes = {
  custom: TopologyCustomNode,
};

const edgeTypes = {
  custom: TopologyCustomEdge,
};

const TopologyCanvasInner: React.FC = () => {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const { zoom } = useViewport();

  const nodes = useTopologyStore(s => s.nodes);
  const edges = useTopologyStore(s => s.edges);
  const selectedNodeId = useTopologyStore(s => s.selectedNodeId);
  const selectedNodeIds = useTopologyStore(s => s.selectedNodeIds);
  const setSelectedNodeIds = useTopologyStore(s => s.setSelectedNodeIds);
  const theme = useTopologyStore(s => s.theme);
  const lod = useTopologyStore(s => s.lod);
  const setLod = useTopologyStore(s => s.setLod);
  const layoutDirection = useTopologyStore(s => s.layoutDirection);
  const setLayoutDirection = useTopologyStore(s => s.setLayoutDirection);
  const toggleLayoutDirection = useTopologyStore(s => s.toggleLayoutDirection);
  const updateNode = useTopologyStore(s => s.updateNode);
  const recordSnapshot = useTopologyStore(s => s.recordSnapshot);
  const connectNodes = useTopologyStore(s => s.connectNodes);
  const selectNode = useTopologyStore(s => s.selectNode);
  const deleteNode = useTopologyStore(s => s.deleteNode);
  const branchChildNode = useTopologyStore(s => s.branchChildNode);
  const createSiblingNode = useTopologyStore(s => s.createSiblingNode);
  const applyDagreLayout = useTopologyStore(s => s.applyDagreLayout);
  const addNode = useTopologyStore(s => s.addNode);

  // Responsive layout: auto-switch to vertical ('TB') when resizing to mobile (< 768px), or horizontal ('LR') on desktop
  useEffect(() => {
    let lastWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const wasMobile = lastWidth < 768;
      const isNowMobile = currentWidth < 768;
      lastWidth = currentWidth;

      if (!wasMobile && isNowMobile) {
        setLayoutDirection('TB');
        setTimeout(() => fitView({ duration: 350, padding: 0.2 }), 50);
      } else if (wasMobile && !isNowMobile) {
        setLayoutDirection('LR');
        setTimeout(() => fitView({ duration: 350, padding: 0.2 }), 50);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setLayoutDirection, fitView]);

  // Dynamic Semantic Level-of-Detail (LOD) tracking based on viewport zoom
  useEffect(() => {
    if (zoom < 0.55) {
      if (lod !== 'macro') setLod('macro');
    } else if (zoom > 1.25) {
      if (lod !== 'micro') setLod('micro');
    } else {
      if (lod !== 'normal') setLod('normal');
    }
  }, [zoom, lod, setLod]);

  // Spotlight State
  const [spotlightState, setSpotlightState] = useState<{
    isOpen: boolean;
    screenPos: { x: number; y: number };
    flowPos: { x: number; y: number };
  }>({
    isOpen: false,
    screenPos: { x: 0, y: 0 },
    flowPos: { x: 0, y: 0 },
  });

  const palette = getPalette(theme);

  // Map Zustand nodes to React Flow nodes
  const rfNodes: Node[] = useMemo(() => {
    return nodes.map((n: TopologyNode) => ({
      id: n.id,
      type: 'custom',
      position: n.position,
      initialWidth: 280,
      initialHeight: 160,
      data: n as unknown as Record<string, unknown>,
      selected: selectedNodeIds.includes(n.id) || n.id === selectedNodeId,
    }));
  }, [nodes, selectedNodeId, selectedNodeIds]);

  // Map Zustand edges to React Flow edges
  const rfEdges: Edge[] = useMemo(() => {
    return edges.map((e: TopologyEdge) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'custom',
      label: e.label,
      animated: e.animated,
    }));
  }, [edges]);

  const rafRef = useRef<number | null>(null);
  const pendingChangesRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Handle position changes when dragging with 60fps rAF throttling
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      let hasPos = false;
      changes.forEach(change => {
        if (change.type === 'position' && change.position && change.id) {
          pendingChangesRef.current.set(change.id, change.position);
          hasPos = true;
        }
      });

      if (hasPos && rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          pendingChangesRef.current.forEach((pos: { x: number; y: number }, id: string) => {
            updateNode(id, { position: pos }, { skipSnapshot: true });
          });
          pendingChangesRef.current.clear();
          rafRef.current = null;
        });
      }
    },
    [updateNode]
  );

  // Handle marquee and multi-node selection changes
  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const ids = params.nodes.map(n => n.id);
      setSelectedNodeIds(ids);
    },
    [setSelectedNodeIds]
  );

  // Handle edge connects
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        const result = connectNodes(connection.source, connection.target, 'depends_on');
        if (!result.success && result.error) {
          alert(result.error);
        }
      }
    },
    [connectNodes]
  );

  // Canvas empty space click -> Deselect node cleanly
  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Canvas double click -> Trigger Spotlight / Quick-Add at cursor
  const handlePaneDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const flowPos = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      setSpotlightState({
        isOpen: true,
        screenPos: { x: e.clientX, y: e.clientY },
        flowPos,
      });
    },
    [screenToFlowPosition]
  );

  // Keyboard navigation & rapid authoring
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Tab') {
        e.preventDefault();
        if (selectedNodeId) {
          branchChildNode(selectedNodeId);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedNodeId) {
          createSiblingNode(selectedNodeId);
        } else {
          addNode();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          deleteNode(selectedNodeId);
        }
      } else if (e.key === 'Escape') {
        selectNode(null);
        setSpotlightState(prev => ({ ...prev, isOpen: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, branchChildNode, createSiblingNode, addNode, deleteNode, selectNode]);

  const isLight = theme === 'default' || theme === 'light' || theme === 'latte';
  const isDefault = theme === 'default';
  const canvasBgClass = isDefault 
    ? 'bg-[#f8fafd]' 
    : isLight 
    ? 'bg-cat-latte-mantle' 
    : 'bg-cat-mocha-crust/95';

  return (
    <div className={`w-full h-full relative ${canvasBgClass} select-none transition-colors duration-200`}>
      {/* Nested Sub-Graph Breadcrumb Navigation */}
      <SubgraphBreadcrumbs />

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onNodeDragStop={() => recordSnapshot()}
        onConnect={handleConnect}
        onPaneClick={handlePaneClick}
        onDoubleClick={handlePaneDoubleClick}
        onSelectionChange={handleSelectionChange}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={false}
        panOnDrag={[1, 2]}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={isDefault ? '#dadce0' : palette.surface1}
        />

        {/* Floating Quick Action Panel & LOD Indicator */}
        <Panel position="top-right" className="m-2 sm:m-4 flex items-center gap-1.5 sm:gap-2">
          {/* LOD Badge - Hidden on small mobile screens */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-white/90 dark:bg-[#1f2230]/90 text-[#5f6368] dark:text-[#94a3b8] shadow-elevated-md backdrop-blur-xl border-none">
            <Eye size={13} className="text-[#007b83] dark:text-[#26a69a]" />
            <span className="uppercase font-bold tracking-wider">{lod}</span>
            <span className="opacity-60 text-[10px]">({Math.round(zoom * 100)}%)</span>
          </div>

          <button
            onClick={() => addNode()}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-white/90 dark:bg-[#1f2230]/90 hover:bg-slate-100 dark:hover:bg-white/10 text-[#202124] dark:text-[#f8fafc] shadow-elevated-md backdrop-blur-xl transition-all duration-150 border-none cursor-pointer"
          >
            <Plus size={14} className="text-[#1a73e8]" />
            <span className="hidden sm:inline">Add Task</span>
            <span className="sm:hidden">Add</span>
          </button>
          <button
            onClick={() => {
              applyDagreLayout();
              setTimeout(() => fitView({ duration: 350, padding: 0.2 }), 40);
            }}
            title="Auto-organize DAG Hierarchical Layout"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-white/90 dark:bg-[#1f2230]/90 hover:bg-slate-100 dark:hover:bg-white/10 text-[#202124] dark:text-[#f8fafc] shadow-elevated-md backdrop-blur-xl transition-all duration-150 border-none cursor-pointer"
          >
            <LayoutGrid size={14} className="text-[#9334e6]" />
            <span className="hidden sm:inline">Auto Layout</span>
            <span className="sm:hidden">Layout</span>
          </button>

          <button
            onClick={() => {
              toggleLayoutDirection();
              setTimeout(() => fitView({ duration: 350, padding: 0.2 }), 40);
            }}
            title={`Toggle orientation: currently ${layoutDirection === 'TB' ? 'Vertical (Top-to-Bottom)' : 'Horizontal (Left-to-Right)'}`}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-white/90 dark:bg-[#1f2230]/90 hover:bg-slate-100 dark:hover:bg-white/10 text-[#202124] dark:text-[#f8fafc] shadow-elevated-md backdrop-blur-xl transition-all duration-150 border-none cursor-pointer"
          >
            {layoutDirection === 'TB' ? (
              <>
                <ArrowDownUp size={14} className="text-[#007b83] dark:text-[#26a69a]" />
                <span className="hidden sm:inline">Vertical (TB)</span>
                <span className="sm:hidden">Vert</span>
              </>
            ) : (
              <>
                <ArrowLeftRight size={14} className="text-[#1a73e8]" />
                <span className="hidden sm:inline">Horizontal (LR)</span>
                <span className="sm:hidden">Horiz</span>
              </>
            )}
          </button>
        </Panel>

        {/* Elevated Controls */}
        <Controls
          className="!bg-white/90 dark:!bg-cat-mocha-base/80 !border-none !rounded-2xl !shadow-elevated-md !backdrop-blur-xl !p-1 !overflow-hidden [&>button]:!bg-transparent [&>button]:!border-none [&>button]:!text-cat-latte-text dark:[&>button]:!text-cat-mocha-text hover:[&>button]:!bg-cat-latte-surface0 dark:hover:[&>button]:!bg-cat-mocha-surface0"
        />

        {/* Elevated Interactive Canvas MiniMap Radar */}
        <CanvasMiniMap />
      </ReactFlow>

      {/* ComfyUI / Spotlight Quick Add Modal */}
      <SpotlightQuickAdd
        isOpen={spotlightState.isOpen}
        onClose={() => setSpotlightState(prev => ({ ...prev, isOpen: false }))}
        screenPos={spotlightState.screenPos}
        flowPos={spotlightState.flowPos}
      />

      {/* Floating Multi-Node Selection Dock */}
      <MultiSelectionDock />
    </div>
  );
};

export const TopologyCanvas2D: React.FC = () => {
  return (
    <ReactFlowProvider>
      <TopologyCanvasInner />
    </ReactFlowProvider>
  );
};
