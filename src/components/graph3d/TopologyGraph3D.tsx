import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import { useTopologyStore } from '../../store/useTopologyStore';
import { getNodeTypeColor } from '../../utils/catppuccin';
import { Plus, Minus, Maximize2, Layers, AlertCircle } from 'lucide-react';

function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export const TopologyGraph3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods>();
  
  const nodes = useTopologyStore(s => s.nodes);
  const edges = useTopologyStore(s => s.edges);
  const selectedNodeId = useTopologyStore(s => s.selectedNodeId);
  const selectNode = useTopologyStore(s => s.selectNode);
  const theme = useTopologyStore(s => s.theme);
  const setViewMode = useTopologyStore(s => s.setViewMode);

  const isLight = theme === 'default' || theme === 'light' || theme === 'latte';
  const [isWebGLSupported] = useState<boolean>(() => checkWebGLSupport());

  // Dynamic container dimensions with ResizeObserver
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight - 52 : 800,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);

    // Initial camera auto-fit once simulation warms up
    const timer = setTimeout(() => {
      if (fgRef.current && nodes.length > 0) {
        fgRef.current.zoomToFit(1200, 60);
      }
    }, 700);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [nodes.length]);

  // Format graph data with strict orphan/dangling link validation
  const graphData = useMemo(() => {
    const nodeIds = new Set(nodes.map(n => n.id));
    return {
      nodes: nodes.map(n => ({
        id: n.id,
        label: n.label || 'Node',
        type: n.type,
        status: n.status,
        priority: n.priority,
        context: n.context,
      })),
      links: edges
        .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
          label: e.label,
        })),
    };
  }, [nodes, edges]);

  // Handle node selection with camera fly-to
  const handleNodeClick = useCallback((node: any) => {
    if (!node || !node.id) return;
    selectNode(node.id);

    const distance = 90;
    const hyp = Math.hypot(node.x || 0, node.y || 0, node.z || 0) || 1;
    const distRatio = 1 + distance / hyp;

    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
        node,
        1500
      );
    }
  }, [selectNode]);

  // Camera Control Actions
  const handleResetCamera = () => {
    if (fgRef.current && nodes.length > 0) {
      fgRef.current.zoomToFit(1000, 60);
    }
  };

  const handleZoomIn = () => {
    if (fgRef.current) {
      const fg = fgRef.current as any;
      const cur = fg.cameraPosition();
      if (cur && typeof cur.x === 'number') {
        fg.cameraPosition(
          { x: cur.x * 0.75, y: cur.y * 0.75, z: cur.z * 0.75 },
          undefined,
          400
        );
      }
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      const fg = fgRef.current as any;
      const cur = fg.cameraPosition();
      if (cur && typeof cur.x === 'number') {
        fg.cameraPosition(
          { x: cur.x * 1.35, y: cur.y * 1.35, z: cur.z * 1.35 },
          undefined,
          400
        );
      }
    }
  };

  // Custom 3D Node Object (Theme-Aware Sphere, Halo & Frosted Label)
  const nodeThreeObject = useCallback((node: any) => {
    const group = new THREE.Group();
    const typeColor = getNodeTypeColor(node.type, theme);
    const isSelected = node.id === selectedNodeId;

    // Node Sphere
    const sphereRadius = isSelected ? 8 : 6;
    const geometry = new THREE.SphereGeometry(sphereRadius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(typeColor),
      emissive: new THREE.Color(typeColor),
      emissiveIntensity: isLight ? (isSelected ? 0.6 : 0.3) : (isSelected ? 0.8 : 0.4),
      roughness: 0.25,
      metalness: 0.15,
    });
    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);

    // Outer Halo for Selected or Active Nodes
    if (isSelected || node.status === 'in_progress') {
      const haloGeo = new THREE.SphereGeometry(sphereRadius * 1.45, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(typeColor),
        transparent: true,
        opacity: isLight ? 0.35 : 0.25,
        wireframe: true,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      group.add(halo);
    }

    // Floating Text Sprite Label
    const sprite = new SpriteText(node.label || 'Node');
    sprite.color = isLight ? '#202124' : '#cdd6f4';
    sprite.textHeight = 4.2;
    sprite.position.set(0, -10, 0);
    sprite.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(24, 24, 37, 0.85)';
    sprite.padding = [3, 6];
    sprite.borderRadius = 6;
    group.add(sprite);

    return group;
  }, [theme, isLight, selectedNodeId]);

  if (!isWebGLSupported) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#f8fafd] dark:bg-[#11111b] text-[#202124] dark:text-[#f8fafc] select-none">
        <div className="p-8 rounded-3xl bg-white dark:bg-[#181a24] shadow-elevated-xl text-center max-w-md border-none">
          <div className="w-12 h-12 rounded-2xl bg-[#f9ab00]/10 text-[#f9ab00] flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-base font-bold">WebGL Hardware Acceleration Unavailable</h3>
          <p className="text-xs text-[#5f6368] dark:text-[#94a3b8] mt-1.5 mb-4 leading-relaxed">
            Your current browser or hardware environment has WebGL disabled. The 2D Spatial Precision Studio remains fully operational.
          </p>
          <button
            type="button"
            onClick={() => setViewMode('2d')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs border-none cursor-pointer transition-all"
          >
            Switch to 2D Studio
          </button>
        </div>
      </div>
    );
  }

  const bgColor = isLight ? '#f8fafd' : '#11111b';
  const linkColor = isLight ? 'rgba(148, 163, 184, 0.5)' : 'rgba(166, 173, 200, 0.35)';
  const particleColor = isLight ? '#1a73e8' : '#89dceb';

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative select-none overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: bgColor }}
    >
      <ForceGraph3D
        ref={fgRef as any}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor={bgColor}
        nodeThreeObject={nodeThreeObject}
        nodeLabel={(node: any) => `
          <div style="
            background: ${isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 30, 46, 0.95)'};
            color: ${isLight ? '#202124' : '#cdd6f4'};
            padding: 8px 12px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 12px;
            border: none;
            pointer-events: none;
          ">
            <div style="font-weight: 700; color: ${getNodeTypeColor(node.type, theme)}">${node.label}</div>
            <div style="font-size: 10px; color: ${isLight ? '#5f6368' : '#a6adc8'}; margin-top: 2px;">
              Role: ${node.context?.role || 'GeneralAgent'} • Status: ${node.status}
            </div>
          </div>
        `}
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => selectNode(null)}
        linkColor={() => linkColor}
        linkWidth={1.5}
        linkDirectionalParticles={3}
        linkDirectionalParticleSpeed={0.008}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => particleColor}
        enableNodeDrag={true}
        showNavInfo={false}
      />

      {/* Floating 3D Camera Controls Dock */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-white/90 dark:bg-[#181a24]/90 backdrop-blur-2xl shadow-elevated-md border-none">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In (+)"
          className="p-2 rounded-xl text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] hover:bg-black/5 dark:hover:bg-white/10 transition-colors border-none cursor-pointer"
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          className="p-2 rounded-xl text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] hover:bg-black/5 dark:hover:bg-white/10 transition-colors border-none cursor-pointer"
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          onClick={handleResetCamera}
          title="Fit Graph in View"
          className="p-2 rounded-xl text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] hover:bg-black/5 dark:hover:bg-white/10 transition-colors border-none cursor-pointer"
        >
          <Maximize2 size={15} />
        </button>
        <div className="w-5 h-px bg-black/5 dark:bg-white/10 my-0.5" />
        <button
          type="button"
          onClick={() => setViewMode('2d')}
          title="Return to 2D Studio"
          className="p-2 rounded-xl text-[#1a73e8] hover:bg-[#1a73e8]/10 transition-colors border-none cursor-pointer"
        >
          <Layers size={15} />
        </button>
      </div>

      {/* Floating 3D Navigation Guide Tip */}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-white/85 dark:bg-[#181a24]/85 backdrop-blur-xl text-[#5f6368] dark:text-[#94a3b8] text-xs shadow-elevated-md pointer-events-none flex items-center gap-2">
        <span>Orbit: <strong className="text-[#202124] dark:text-[#f8fafc] font-medium">Left Click + Drag</strong></span>
        <span>•</span>
        <span>Pan: <strong className="text-[#202124] dark:text-[#f8fafc] font-medium">Right Click</strong></span>
        <span>•</span>
        <span>Zoom: <strong className="text-[#202124] dark:text-[#f8fafc] font-medium">Scroll</strong></span>
      </div>
    </div>
  );
};
