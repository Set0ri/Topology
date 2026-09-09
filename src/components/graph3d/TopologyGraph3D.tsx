import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import { useTopologyStore } from '../../store/useTopologyStore';
import { getNodeTypeColor } from '../../utils/catppuccin';
import { Plus, Minus, Maximize2, Layers, AlertCircle, RotateCw, Compass } from 'lucide-react';

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

// Reusable Object Pools for Geometries to avoid WebGL GC churn
const sphereGeoNormal = new THREE.SphereGeometry(6, 24, 24);
const sphereGeoSelected = new THREE.SphereGeometry(8, 28, 28);
const haloGeoNormal = new THREE.SphereGeometry(6 * 1.45, 16, 16);
const haloGeoSelected = new THREE.SphereGeometry(8 * 1.45, 16, 16);

// Material caches keyed by `color_selected_light`
const lambertMaterialCache = new Map<string, THREE.MeshLambertMaterial>();
function getCachedMaterial(colorHex: string, isSelected: boolean, isLight: boolean): THREE.MeshLambertMaterial {
  const key = `${colorHex}_${isSelected ? 'sel' : 'norm'}_${isLight ? 'lt' : 'dk'}`;
  let mat = lambertMaterialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(colorHex),
      emissive: new THREE.Color(colorHex),
      emissiveIntensity: isLight ? (isSelected ? 0.75 : 0.45) : (isSelected ? 0.95 : 0.65),
    });
    lambertMaterialCache.set(key, mat);
  }
  return mat;
}

const haloMaterialCache = new Map<string, THREE.MeshBasicMaterial>();
function getCachedHaloMaterial(colorHex: string, isLight: boolean): THREE.MeshBasicMaterial {
  const key = `${colorHex}_${isLight ? 'lt' : 'dk'}`;
  let mat = haloMaterialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: isLight ? 0.4 : 0.3,
      wireframe: true,
    });
    haloMaterialCache.set(key, mat);
  }
  return mat;
}

// Cached SpriteText templates sharing underlying CanvasTextures across nodes
const spriteTextCache = new Map<string, any>();
function getCachedSpriteText(label: string, isLight: boolean): any {
  const key = `${label || 'Node'}_${isLight ? 'lt' : 'dk'}`;
  let proto = spriteTextCache.get(key);
  if (!proto) {
    proto = new SpriteText(label || 'Node');
    proto.color = isLight ? '#202124' : '#cdd6f4';
    proto.textHeight = 4.0;
    proto.position.set(0, -9.5, 0);
    proto.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(24, 24, 37, 0.85)';
    proto.padding = [3, 6];
    proto.borderRadius = 6;
    if (spriteTextCache.size > 250) {
      const firstKey = spriteTextCache.keys().next().value;
      if (firstKey) spriteTextCache.delete(firstKey);
    }
    spriteTextCache.set(key, proto);
  }
  return proto.clone();
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
  const [isAutoRotating, setIsAutoRotating] = useState(false);

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

    // Initial camera auto-fit once simulation warms up and nodes disperse
    const timer = setTimeout(() => {
      if (fgRef.current && nodes.length > 0) {
        const bbox = fgRef.current.getGraphBbox();
        // Ensure nodes have actually dispersed before running zoomToFit
        if (bbox && (Math.abs(bbox.x[1] - bbox.x[0]) > 20 || Math.abs(bbox.y[1] - bbox.y[0]) > 20)) {
          fgRef.current.zoomToFit(800, 50);
        } else {
          // Safe fallback perspective position
          fgRef.current.cameraPosition({ x: 0, y: 30, z: 280 }, { x: 0, y: 0, z: 0 }, 600);
        }
      }
    }, 700);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [nodes.length]);

  // Guaranteed Scene Lighting Injection for Three.js Materials
  useEffect(() => {
    let animId: number;
    let attempts = 0;
    const injectLights = () => {
      attempts++;
      if (fgRef.current) {
        const scene = fgRef.current.scene();
        if (scene) {
          const existingLight = scene.getObjectByName('topology-custom-light');
          if (!existingLight) {
            const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
            ambientLight.name = 'topology-custom-light';
            scene.add(ambientLight);

            const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
            dirLight1.position.set(100, 200, 100);
            scene.add(dirLight1);

            const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.55);
            dirLight2.position.set(-100, -200, -100);
            scene.add(dirLight2);
            return;
          }
        }
      }
      if (attempts < 60) {
        animId = requestAnimationFrame(injectLights);
      }
    };
    animId = requestAnimationFrame(injectLights);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Auto-Rotate Presentation Mode
  useEffect(() => {
    if (!isAutoRotating) return;
    let angle = 0;
    let animId: number;
    const distance = 320;

    const rotate = () => {
      angle += 0.003;
      if (fgRef.current) {
        const fg = fgRef.current as any;
        const cur = fg.cameraPosition();
        const y = cur ? cur.y : 60;
        fg.cameraPosition({
          x: distance * Math.sin(angle),
          y,
          z: distance * Math.cos(angle),
        });
      }
      animId = requestAnimationFrame(rotate);
    };
    animId = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(animId);
  }, [isAutoRotating]);

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

    const distance = 95;
    const hyp = Math.hypot(node.x || 0, node.y || 0, node.z || 0) || 1;
    const distRatio = 1 + distance / hyp;

    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
        node,
        1400
      );
    }
  }, [selectNode]);

  // Camera Control Actions
  const handleResetCamera = () => {
    if (fgRef.current && nodes.length > 0) {
      fgRef.current.zoomToFit(900, 60);
    }
  };

  const handleTopDownView = () => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 350, z: 0.1 }, { x: 0, y: 0, z: 0 }, 1000);
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

  // Custom 3D Node Object (Theme-Aware Sphere, Halo & Frosted Label with Geometry/Material Pooling)
  const nodeThreeObject = useCallback((node: any) => {
    const group = new THREE.Group();
    const typeColor = getNodeTypeColor(node.type, theme);
    const isSelected = node.id === selectedNodeId;

    // Node Sphere using pooled geometry and cached material
    const sphereGeo = isSelected ? sphereGeoSelected : sphereGeoNormal;
    const sphereMat = getCachedMaterial(typeColor, isSelected, isLight);
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);

    // Outer Halo for Selected or Active Nodes
    if (isSelected || node.status === 'in_progress') {
      const haloGeo = isSelected ? haloGeoSelected : haloGeoNormal;
      const haloMat = getCachedHaloMaterial(typeColor, isLight);
      const halo = new THREE.Mesh(haloGeo, haloMat);
      group.add(halo);
    }

    // Floating Text Sprite Label (pooled from texture cache)
    const sprite = getCachedSpriteText(node.label || 'Node', isLight);
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
        nodeLabel={(node: any) => {
          const assigned = node.context?.assignedAgents || [];
          const agentString = assigned.length > 0 
            ? assigned.map((a: any) => `${a.avatar} ${a.name}`).join(', ')
            : (node.context?.role || 'GeneralAgent');

          return `
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
                ${agentString} • Status: ${node.status}
              </div>
            </div>
          `;
        }}
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => selectNode(null)}
        linkColor={() => linkColor}
        linkWidth={1.5}
        linkDirectionalParticles={edges.length > 40 ? 1 : 2}
        linkDirectionalParticleSpeed={0.007}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => particleColor}
        enableNodeDrag={true}
        onNodeDragEnd={() => {
          if (fgRef.current) {
            fgRef.current.d3ReheatSimulation();
          }
        }}
        nodeRelSize={6}
        nodeColor={(n: any) => getNodeTypeColor(n.type, theme)}
        nodeVal={8}
        nodeThreeObjectExtend={false}
        onEngineStop={() => {
          if (fgRef.current && nodes.length > 0) {
            fgRef.current.zoomToFit(600, 40);
          }
        }}
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
          onClick={handleTopDownView}
          title="Top-Down (2.5D) Layout View"
          className="p-2 rounded-xl text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] hover:bg-black/5 dark:hover:bg-white/10 transition-colors border-none cursor-pointer"
        >
          <Compass size={15} />
        </button>

        <button
          type="button"
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          title={isAutoRotating ? 'Stop Auto-Rotate' : 'Start Cinematic Auto-Rotate'}
          className={`p-2 rounded-xl transition-colors border-none cursor-pointer ${
            isAutoRotating 
              ? 'bg-[#1a73e8] text-white' 
              : 'text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] hover:bg-black/5 dark:hover:bg-white/10'
          }`}
        >
          <RotateCw size={15} className={isAutoRotating ? 'animate-spin' : ''} />
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
        <span>Orbit: <strong className="text-[#202124] dark:text-[#f8fafc] font-medium">Left Drag</strong></span>
        <span>•</span>
        <span>Pan: <strong className="text-[#202124] dark:text-[#f8fafc] font-medium">Right Drag</strong></span>
        <span>•</span>
        <span>Zoom: <strong className="text-[#202124] dark:text-[#f8fafc] font-medium">Scroll</strong></span>
      </div>
    </div>
  );
};
