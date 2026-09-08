import React, { useState, useRef } from 'react';
import { 
  GitFork, 
  Box, 
  Layers, 
  Sparkles, 
  Download, 
  Upload, 
  Undo2, 
  Redo2, 
  FolderOpen,
  FileCode2,
  ChevronDown,
  ShieldCheck,
  Bot,
  HelpCircle,
  Terminal,
  Compass,
  Users
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { exportToObsidianCanvas, exportToMermaid, exportToUniversalAgentManifest } from '../../utils/obsidianCanvas';
import { generateHeadlessCliRunner } from '../../utils/agentHandoff';
import { SAMPLE_TOPOLOGIES } from '../../data/sampleTopologies';
import { ThemePalettePicker } from './ThemePalettePicker';

interface HeaderProps {
  onOpenGenerator: () => void;
  onOpenCoherence: () => void;
  onOpenTutorial: () => void;
  onOpenLibrary: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenGenerator, onOpenCoherence, onOpenTutorial, onOpenLibrary }) => {
  const viewMode = useTopologyStore(s => s.viewMode);
  const setViewMode = useTopologyStore(s => s.setViewMode);
  const theme = useTopologyStore(s => s.theme);
  const nodes = useTopologyStore(s => s.nodes);
  const edges = useTopologyStore(s => s.edges);
  const undo = useTopologyStore(s => s.undo);
  const redo = useTopologyStore(s => s.redo);
  const history = useTopologyStore(s => s.history);
  const future = useTopologyStore(s => s.future);
  const loadSampleTopology = useTopologyStore(s => s.loadSampleTopology);
  const importCanvasData = useTopologyStore(s => s.importCanvasData);
  const getCoherenceReport = useTopologyStore(s => s.getCoherenceReport);
  const isCockpitOpen = useTopologyStore(s => s.isCockpitOpen);
  const setCockpitOpen = useTopologyStore(s => s.setCockpitOpen);
  const globalSquad = useTopologyStore(s => s.globalSquad);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSamplesOpen, setIsSamplesOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const coherenceReport = getCoherenceReport();
  const isLight = theme === 'default' || theme === 'light' || theme === 'latte';

  // Export handlers
  const handleExportObsidian = () => {
    const canvasJson = exportToObsidianCanvas(nodes, edges);
    downloadFile(canvasJson, 'agent_plan.canvas', 'application/json');
    setIsExportOpen(false);
  };

  const handleExportMermaid = () => {
    const mm = exportToMermaid(nodes, edges);
    downloadFile(mm, 'topology.mmd', 'text/plain');
    setIsExportOpen(false);
  };

  const handleExportJSON = () => {
    const fullState = JSON.stringify({ nodes, edges }, null, 2);
    downloadFile(fullState, 'agent_dag.json', 'application/json');
    setIsExportOpen(false);
  };

  const handleExportUAM = () => {
    const uamJson = exportToUniversalAgentManifest(nodes, edges);
    downloadFile(uamJson, 'universal_agent_manifest.json', 'application/json');
    setIsExportOpen(false);
  };

  const handleExportPythonCLI = () => {
    const pyScript = generateHeadlessCliRunner(nodes, edges);
    downloadFile(pyScript, 'run_topology.py', 'text/x-python');
    setIsExportOpen(false);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importCanvasData(content);
        if (!ok) {
          alert('Failed to parse Obsidian Canvas or JSON file. Please check format.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setIsExportOpen(false);
  };

  return (
    <header className="h-13 px-2.5 sm:px-4 flex items-center justify-between bg-white/90 dark:bg-[#10121a]/90 backdrop-blur-2xl select-none z-30 border-none transition-colors duration-200 shadow-xs">
      {/* Left: Clean Brand Logo & Compact 2D/3D Switcher */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#1a73e8] to-[#4285f4] flex items-center justify-center shadow-xs shrink-0">
            <GitFork size={15} className="text-white rotate-90" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#202124] dark:text-[#f8fafc] hidden sm:inline">
            Topology
          </span>
        </div>

        {/* Compact View Switcher: 2D / 3D */}
        <div className="flex items-center p-0.5 rounded-xl bg-black/5 dark:bg-white/5 shadow-inner shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 border-none cursor-pointer ${
              viewMode === '2d'
                ? 'bg-white dark:bg-[#1e2230] text-[#202124] dark:text-[#f8fafc] shadow-elevated-xs font-semibold'
                : 'text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] bg-transparent'
            }`}
          >
            <Layers size={12} />
            <span>2D</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 border-none cursor-pointer ${
              viewMode === '3d'
                ? 'bg-white dark:bg-[#1e2230] text-[#202124] dark:text-[#f8fafc] shadow-elevated-xs font-semibold'
                : 'text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] bg-transparent'
            }`}
          >
            <Box size={12} />
            <span>3D</span>
          </button>
        </div>
      </div>

      {/* Center: Essential Synthesizer & Coherence Diagnostic */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Coherence Health Pill (Tablet & Desktop) */}
        <button
          type="button"
          onClick={onOpenCoherence}
          title="Open Graph Coherence Diagnostic"
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all duration-150 border-none cursor-pointer shadow-xs ${
            coherenceReport.score >= 90
              ? 'bg-[#e6f4ea] text-[#137333] dark:bg-cat-mocha-green/15 dark:text-cat-mocha-green'
              : coherenceReport.score >= 70
              ? 'bg-[#fef7e0] text-[#b06000] dark:bg-cat-mocha-yellow/15 dark:text-cat-mocha-yellow'
              : 'bg-[#fce8e6] text-[#c5221f] dark:bg-cat-mocha-red/20 dark:text-cat-mocha-red animate-pulse'
          }`}
        >
          <ShieldCheck size={13} />
          <span>{coherenceReport.score}%</span>
        </button>

        {/* AI Plan Synthesizer Primary Button */}
        <button
          type="button"
          onClick={onOpenGenerator}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all duration-150 border-none cursor-pointer shrink-0"
        >
          <Sparkles size={13} />
          <span className="hidden sm:inline">AI Plan</span>
        </button>
      </div>

      {/* Right: Actions, History, Guide & Compact Theme Picker */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Undo / Redo (Hidden on mobile phones to conserve space) */}
        <div className="hidden sm:flex items-center gap-0.5 mr-0.5 sm:mr-1 bg-black/5 dark:bg-white/5 p-0.5 rounded-xl">
          <button
            type="button"
            disabled={history.length === 0}
            onClick={undo}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] disabled:opacity-30 transition-colors border-none cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={13} />
          </button>
          <button
            type="button"
            disabled={future.length === 0}
            onClick={redo}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] disabled:opacity-30 transition-colors border-none cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={13} />
          </button>
        </div>

        {/* Multi-Agent Swarm Observability Trigger */}
        <button
          type="button"
          onClick={() => setCockpitOpen(!isCockpitOpen)}
          title="Open Multi-Agent Swarm Observability Cockpit"
          className={`h-8 px-2 sm:px-2.5 rounded-xl text-xs font-medium flex items-center gap-1 sm:gap-1.5 transition-all border-none cursor-pointer shadow-xs shrink-0 ${
            isCockpitOpen
              ? 'bg-[#1a73e8] text-white font-semibold'
              : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#202124] dark:text-[#f8fafc]'
          }`}
        >
          <Users size={13} className={isCockpitOpen ? 'text-white' : 'text-[#1a73e8] dark:text-[#8ab4f8]'} />
          <span className="font-semibold hidden md:inline">Agents</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
            isCockpitOpen ? 'bg-white/20 text-white' : 'bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8]'
          }`}>
            {globalSquad.length}
          </span>
        </button>

        {/* Topology Hub & Archetype Library Button with Coverage Badge */}
        <button
          type="button"
          onClick={onOpenLibrary}
          className="h-8 px-2 sm:px-2.5 rounded-xl text-xs font-medium bg-gradient-to-r from-[#1a73e8]/10 to-[#9334e6]/10 hover:from-[#1a73e8]/15 hover:to-[#9334e6]/15 text-[#1a73e8] dark:text-[#8ab4f8] hidden sm:flex items-center gap-1 sm:gap-1.5 transition-all border-none cursor-pointer shadow-xs shrink-0"
          title="Browse 10 Canonical Archetypes, % Coverage Map & Community Topologies"
        >
          <Compass size={13} className="text-[#1a73e8] dark:text-[#8ab4f8]" />
          <span className="font-semibold hidden md:inline">Topology Hub</span>
          <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-[#1a73e8]/15 text-[#1a73e8] dark:text-[#8ab4f8] font-bold">
            80%
          </span>
        </button>

        {/* Hidden File Input for Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".canvas,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Consolidated Export & Import Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsExportOpen(!isExportOpen);
            }}
            className="h-8 px-2 sm:px-2.5 rounded-xl text-xs font-medium bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#202124] dark:text-[#f8fafc] flex items-center gap-1 sm:gap-1.5 transition-colors border-none cursor-pointer"
          >
            <Download size={13} className="text-[#1e8e3e]" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown size={11} className="opacity-50" />
          </button>

          {isExportOpen && (
            <div className="absolute top-full mt-2 right-0 w-64 max-w-[calc(100vw-1rem)] rounded-2xl p-2 bg-white dark:bg-[#181a24] backdrop-blur-xl shadow-elevated-lg z-50 border-none space-y-1">
              {/* Import Action inside menu */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs hover:bg-[#f1f3f4] dark:hover:bg-white/5 text-[#202124] dark:text-[#f8fafc] transition-colors border-none cursor-pointer text-left"
              >
                <Upload size={14} className="text-[#1a73e8]" />
                <div>
                  <div className="font-semibold">Import Canvas / JSON</div>
                  <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8]">Load .canvas or state file</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsExportOpen(false);
                  onOpenLibrary();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs hover:bg-[#f1f3f4] dark:hover:bg-white/5 text-[#202124] dark:text-[#f8fafc] transition-colors border-none cursor-pointer text-left"
              >
                <Compass size={14} className="text-[#1a73e8]" />
                <div>
                  <div className="font-semibold">Publish to Hub</div>
                  <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8]">Package & share active graph</div>
                </div>
              </button>

              <div className="my-1 h-px bg-black/5 dark:bg-white/5" />

              <button
                type="button"
                onClick={handleExportObsidian}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs hover:bg-[#f1f3f4] dark:hover:bg-white/5 text-[#202124] dark:text-[#f8fafc] transition-colors border-none cursor-pointer text-left"
              >
                <FileCode2 size={14} className="text-[#9334e6]" />
                <div>
                  <div className="font-semibold">Obsidian Canvas</div>
                  <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8]">.canvas visual layout</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportMermaid}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs hover:bg-[#f1f3f4] dark:hover:bg-white/5 text-[#202124] dark:text-[#f8fafc] transition-colors border-none cursor-pointer text-left"
              >
                <Layers size={14} className="text-[#1a73e8]" />
                <div>
                  <div className="font-semibold">Mermaid Flowchart</div>
                  <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8]">Markdown diagram</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportJSON}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs hover:bg-[#f1f3f4] dark:hover:bg-white/5 text-[#202124] dark:text-[#f8fafc] transition-colors border-none cursor-pointer text-left"
              >
                <Box size={14} className="text-[#fbbc04]" />
                <div>
                  <div className="font-semibold">Agent DAG JSON</div>
                  <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8]">State machine data</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportUAM}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs hover:bg-[#f1f3f4] dark:hover:bg-white/5 text-[#202124] dark:text-[#f8fafc] transition-colors border-none cursor-pointer text-left"
              >
                <Bot size={14} className="text-[#007b83]" />
                <div>
                  <div className="font-semibold">Universal Agent Manifest</div>
                  <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8]">MCP / Gemini CLI</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportPythonCLI}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs hover:bg-[#f1f3f4] dark:hover:bg-white/5 text-[#202124] dark:text-[#f8fafc] transition-colors border-none cursor-pointer text-left"
              >
                <Terminal size={14} className="text-[#1e8e3e]" />
                <div>
                  <div className="font-semibold">Headless Python CLI</div>
                  <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8]">run_topology.py runner</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Compact Tutorial Guide Icon Button */}
        <button
          type="button"
          onClick={onOpenTutorial}
          title="Open Interactive Onboarding Guide"
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer"
        >
          <HelpCircle size={15} />
        </button>

        {/* Ultra-Compact Jewel Palette Picker (swatches only) */}
        <ThemePalettePicker />
      </div>
    </header>
  );
};
