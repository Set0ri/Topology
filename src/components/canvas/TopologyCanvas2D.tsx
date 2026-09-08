import React, { useCallback, useMemo, useEffect, useState } from 'react';
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
import { LayoutGrid, Plus, Eye, ZoomIn, ZoomOut } from 'lucide-react';

const nodeTypes = {
  custom: TopologyCustomNode,
};

const edgeTypes = {
  custom: TopologyCustomEdge,
};

const TopologyCanvasInner: React.FC = () => {
  const { screenToFlowPosition } = useReactFlow();
  const { zoom } = useViewport();

  const nodes = useTopologyStore(s => s.nodes);
  const edges = useTopologyStore(s => s.edges);
  const selectedNodeId = useTopologyStore(s => s.selectedNodeId);
  const selectedNodeIds = useTopologyStore(s => s.selectedNodeIds);
  const setSelectedNodeIds = useTopologyStore(s => s.setSelectedNodeIds);
  const theme = useTopologyStore(s => s.theme);
  const lod = useTopologyStore(s => s.lod);
  const setLod = useTopologyStore(s => s.setLod);
  const updateNode = useTopologyStore(s => s.updateNode);
  const connectNodes = useTopologyStore(s => s.connectNodes);
  const selectNode = useTopologyStore(s => s.selectNode);
  const deleteNode = useTopologyStore(s => s.deleteNode);
  const branchChildNode = useTopologyStore(s => s.branchChildNode);
  const createSiblingNode = useTopologyStore(s => s.createSiblingNode);
  const applyDagreLayout = useTopologyStore(s => s.applyDagreLayout);
  const addNode = useTopologyStore(s => s.addNode);

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

  // Handle position changes when dragging
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      changes.forEach(change => {
        if (change.type === 'position' && change.position && change.id) {
          updateNode(change.id, { position: change.position });
        }
      });
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

  // Canvas empty space click -> Trigger Spotlight / ComfyUI Quick-Add
  const handlePaneClick = useCallback(
    (e: React.MouseEvent) => {
      selectNode(null);

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
    [screenToFlowPosition, selectNode]
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
        onConnect={handleConnect}
        onPaneClick={handlePaneClick}
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
        <Panel position="top-right" className="m-4 flex items-center gap-2">
          {/* LOD Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-white/90 dark:bg-cat-mocha-base/80 text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 shadow-elevated-md backdrop-blur-xl border-none">
            <Eye size={13} className="text-cat-latte-teal dark:text-cat-mocha-teal" />
            <span className="uppercase font-bold tracking-wider">{lod}</span>
            <span className="opacity-60 text-[10px]">({Math.round(zoom * 100)}%)</span>
          </div>

          <button
            onClick={() => addNode()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/90 dark:bg-cat-mocha-base/80 hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-text dark:text-cat-mocha-text shadow-elevated-md backdrop-blur-xl transition-all duration-150 border-none cursor-pointer"
          >
            <Plus size={14} className="text-cat-mocha-mauve dark:text-cat-mocha-mauve" />
            <span>Add Task</span>
          </button>
          <button
            onClick={() => applyDagreLayout('LR')}
            title="Auto-organize DAG Hierarchical Layout"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/90 dark:bg-cat-mocha-base/80 hover:bg-cat-latte-surface0 dark:hover:bg-cat-mocha-surface0 text-cat-latte-text dark:text-cat-mocha-text shadow-elevated-md backdrop-blur-xl transition-all duration-150 border-none cursor-pointer"
          >
            <LayoutGrid size={14} className="text-cat-mocha-sapphire dark:text-cat-mocha-sapphire" />
            <span>Auto Layout</span>
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
