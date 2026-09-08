import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { getStatusColor, hexToRgba } from '../../utils/catppuccin';

export const TopologyCustomEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  source,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetPosition,
    targetX,
    targetY,
  });

  const nodes = useTopologyStore(s => s.nodes);
  const edges = useTopologyStore(s => s.edges);
  const theme = useTopologyStore(s => s.theme);
  const isSimulating = useTopologyStore(s => s.isSimulating);
  const sourceNode = nodes.find(n => n.id === source);
  const currentEdge = edges.find(e => e.id === id);

  const statusColor = sourceNode ? getStatusColor(sourceNode.status, theme) : '#b4befe';
  const isActive = isSimulating || sourceNode?.status === 'in_progress' || currentEdge?.animated;
  const isDark = theme === 'mocha';

  const condition = currentEdge?.condition;
  const dataPayloads = currentEdge?.dataPayloadPassed;

  return (
    <>
      {/* Background Soft Glow Path */}
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          stroke={statusColor}
          strokeWidth={7}
          strokeOpacity={0.25}
          className="animate-pulse"
        />
      )}

      {/* Main Path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isActive ? statusColor : hexToRgba(isDark ? '#a6adc8' : '#6c6f85', '0.45'),
          strokeWidth: isActive ? 2.5 : 1.5,
          strokeDasharray: isActive ? '5,5' : undefined,
          animation: isActive ? 'dashdraw 1.5s linear infinite' : undefined,
        }}
      />

      {/* Edge Condition & Payload Label Pill */}
      {(label || condition || (dataPayloads && dataPayloads.length > 0)) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider bg-white/90 dark:bg-cat-mocha-mantle/90 text-cat-latte-text dark:text-cat-mocha-subtext0 shadow-elevated-sm backdrop-blur-md border-none select-none"
          >
            {condition === 'true' && (
              <span className="font-bold text-cat-latte-green dark:text-cat-mocha-green">
                [TRUE]
              </span>
            )}
            {condition === 'false' && (
              <span className="font-bold text-cat-latte-peach dark:text-cat-mocha-peach">
                [FALSE]
              </span>
            )}
            {dataPayloads && dataPayloads.length > 0 && (
              <span className="text-cat-latte-teal dark:text-cat-mocha-teal font-medium">
                📦 {dataPayloads[0]}
              </span>
            )}
            {label && !dataPayloads && (
              <span>{label}</span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
