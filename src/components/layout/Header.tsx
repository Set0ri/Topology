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
  Users,
  Radio,
  Brain,
  Activity,
  RotateCw,
  Coins,
  X,
  ChevronRight
} from 'lucide-react';
import { useTopologyStore, computePlanBudgetMetrics, getNodeBudgetMetrics } from '../../store/useTopologyStore';
import { exportToObsidianCanvas, exportToMermaid, exportToUniversalAgentManifest } from '../../utils/obsidianCanvas';
import { generateHeadlessCliRunner } from '../../utils/agentHandoff';
import { SAMPLE_TOPOLOGIES } from '../../data/sampleTopologies';
import { ThemePalettePicker } from './ThemePalettePicker';
import { PlanSelectorDropdown } from './PlanSelectorDropdown';
import { MoreToolsDropdown } from './MoreToolsDropdown';

const STAGE_SHORT_LABELS: Record<string, string> = {
  observe: 'Observe',
  understand: 'Understand',
  evaluate_with_council: 'Evaluate',
  adversarial_council_evaluation: 'Critique',
  each_member_plans: 'Plans',
  share_and_vote_on_plan: 'Vote',
  iterate_on_plan: 'Iterate',
  propose_plan: 'Propose',
  update: 'Execute',
};

interface HeaderProps {
  onOpenGenerator: () => void;
  onOpenCoherence: () => void;
  onOpenTutorial: () => void;
  onOpenLibrary: () => void;
  onOpenAgentSync: () => void;
  onOpenSharedContext?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenFleetModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenGenerator, 
  onOpenCoherence, 
  onOpenTutorial, 
  onOpenLibrary,
  onOpenAgentSync,
  onOpenSharedContext,
  onOpenDiagnostics,
  onOpenFleetModal
}) => {
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
  const liveSyncStatus = useTopologyStore(s => s.liveSyncStatus);
  const sharedContext = useTopologyStore(s => s.sharedContext);
  const setCouncilModalOpen = useTopologyStore(s => s.setCouncilModalOpen);
  const councilBudget = useTopologyStore(s => s.councilBudget);
  const setLoopModalOpen = useTopologyStore(s => s.setLoopModalOpen);
  const activeLoopTelemetry = useTopologyStore(s => s.activeLoopTelemetry);
  const activePlanId = useTopologyStore(s => s.activePlanId);
  const plans = useTopologyStore(s => s.plans);
  const selectNode = useTopologyStore(s => s.selectNode);
  const setPlanBudget = useTopologyStore(s => s.setPlanBudget);
  const activePlan = plans[activePlanId];
  const loopTelemetry = activeLoopTelemetry || activePlan?.oodaLoop;

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isBudgetPopoverOpen, setIsBudgetPopoverOpen] = useState(false);
  const [budgetLimitInput, setBudgetLimitInput] = useState('');
  const [budgetSavedFeedback, setBudgetSavedFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const budgetPopoverRef = useRef<HTMLDivElement>(null);

  const planBudget = React.useMemo(() => {
    if (activePlan && (!activePlan.nodes || activePlan.nodes.length === 0) && nodes.length > 0) {
      return computePlanBudgetMetrics({ ...activePlan, nodes });
    }
    return computePlanBudgetMetrics(activePlan);
  }, [activePlan, nodes]);


  React.useEffect(() => {
    if (planBudget.budgetLimitUsd !== undefined) {
      setBudgetLimitInput(String(planBudget.budgetLimitUsd));
    }
  }, [planBudget.budgetLimitUsd, activePlanId]);

  // Close budget popover on outside click or Escape
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (budgetPopoverRef.current && !budgetPopoverRef.current.contains(e.target as Node)) {
        setIsBudgetPopoverOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBudgetPopoverOpen(false);
      }
    };
    if (isBudgetPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBudgetPopoverOpen]);

  // Ranked top consuming nodes
  const topConsumingNodes = React.useMemo(() => {
    const planNodes = activePlan && Array.isArray(activePlan.nodes) ? activePlan.nodes : nodes;
    return [...planNodes]
      .map(n => ({
        node: n,
        metrics: getNodeBudgetMetrics(n),
      }))
      .filter(item => item.metrics.costUsd > 0 || (item.metrics.totalTokens > 0))
      .sort((a, b) => b.metrics.costUsd - a.metrics.costUsd)
      .slice(0, 5);
  }, [activePlan, nodes]);

  // Close export menu on outside click or Escape
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExportOpen(false);
      }
    };
    if (isExportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExportOpen]);

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

  // Global shortcut for Diagnostics & Telemetry HUD: Ctrl+Shift+D
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        onOpenDiagnostics?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenDiagnostics]);

  return (
    <header className="h-13 sm:h-14 px-2 sm:px-4 flex items-center justify-between bg-white/90 dark:bg-[#10121a]/90 backdrop-blur-2xl select-none z-30 border-none transition-colors duration-200 shadow-xs gap-1.5 sm:gap-2">
      {/* Left: Brand Logo, Compact 2D/3D Switcher, and Plan Selector Dropdown */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 sm:flex-initial">
        {/* Brand Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

        <div className="w-px h-5 bg-black/10 dark:bg-white/10 shrink-0 hidden sm:block" />

        {/* Workspace Plan Selector Dropdown (Clean, responsive, non-scrolling) */}
        <PlanSelectorDropdown onOpenFleetModal={onOpenFleetModal} className="min-w-0" />

        {/* Current Plan Budget Utilization Pill & Progressive Reveal Popover */}
        <div className="relative shrink-0" ref={budgetPopoverRef}>
          <button
            type="button"
            onClick={() => setIsBudgetPopoverOpen(!isBudgetPopoverOpen)}
            title={`Plan Budget: $${planBudget.costUsd.toFixed(4)} / $${planBudget.budgetLimitUsd.toFixed(2)} (${planBudget.utilizationPercent}%) - Click for breakdown`}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-mono font-medium transition-all duration-150 border-none cursor-pointer shadow-xs ${
              planBudget.utilizationPercent >= 100
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold'
                : planBudget.utilizationPercent >= 75
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium'
                : isLight
                ? 'bg-black/5 hover:bg-black/10 text-cat-latte-text'
                : 'bg-white/5 hover:bg-white/10 text-cat-mocha-text'
            }`}
          >
            <Coins size={13} className="text-amber-500 shrink-0" />
            <span className="hidden sm:inline">
              ${planBudget.costUsd.toFixed(2)}
              <span className="opacity-60 text-[10px]"> / ${planBudget.budgetLimitUsd.toFixed(2)}</span>
            </span>
            <span className="sm:hidden">
              ${planBudget.costUsd.toFixed(2)}
            </span>
            <span className={`text-[10px] px-1 rounded-md font-bold ${
              planBudget.utilizationPercent >= 100 ? 'bg-rose-500/20 text-rose-600' :
              planBudget.utilizationPercent >= 75 ? 'bg-amber-500/20 text-amber-600' :
              'opacity-60'
            }`}>
              {planBudget.utilizationPercent}%
            </span>
          </button>

          {isBudgetPopoverOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 p-4 rounded-2xl bg-white/95 dark:bg-[#181a24]/95 text-[#202124] dark:text-[#f8fafc] backdrop-blur-2xl shadow-elevated-2xl border-none z-50 transition-all duration-200 space-y-3.5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins size={15} className="text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">
                    Plan Budget Overview
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBudgetPopoverOpen(false)}
                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors border-none cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Active Plan Name */}
              <div className="text-[11px] text-cat-latte-subtext0 dark:text-cat-mocha-subtext0 font-mono truncate">
                Plan: <span className="font-semibold text-cat-latte-text dark:text-cat-mocha-text">{activePlan?.title || activePlanId}</span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-cat-latte-surface0/60 dark:bg-cat-mocha-surface0/40 border-none font-mono">
                <div>
                  <div className="text-[9px] uppercase tracking-wider opacity-60">Consumed</div>
                  <div className="text-sm font-bold text-cat-latte-text dark:text-cat-mocha-text">
                    ${planBudget.costUsd.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider opacity-60">Ceiling</div>
                  <div className="text-sm font-bold text-cat-latte-text dark:text-cat-mocha-text">
                    ${planBudget.budgetLimitUsd.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider opacity-60">Headroom</div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    ${planBudget.remainingUsd.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider opacity-60">Utilization</div>
                  <div className={`text-xs font-bold ${
                    planBudget.utilizationPercent >= 100
                      ? 'text-rose-600 dark:text-rose-400'
                      : planBudget.utilizationPercent >= 75
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {planBudget.utilizationPercent}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden border-none">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      planBudget.utilizationPercent >= 100
                        ? 'bg-rose-500'
                        : planBudget.utilizationPercent >= 75
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, planBudget.utilizationPercent))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono opacity-60">
                  <span>Spend: ${planBudget.costUsd.toFixed(2)}</span>
                  <span>Limit: ${planBudget.budgetLimitUsd.toFixed(2)}</span>
                </div>
              </div>

              {/* Tokens Summary */}
              {planBudget.totalTokens > 0 && (
                <div className="flex items-center justify-between text-[10px] font-mono p-2 rounded-xl bg-cat-latte-surface0/40 dark:bg-cat-mocha-surface0/30 border-none">
                  <span className="opacity-70">Total Tokens:</span>
                  <span className="font-semibold">{planBudget.totalTokens.toLocaleString()}</span>
                  {planBudget.totalInputTokens > 0 && (
                    <span className="opacity-60 text-[9px]">(In: {planBudget.totalInputTokens.toLocaleString()} • Out: {planBudget.totalOutputTokens.toLocaleString()})</span>
                  )}
                </div>
              )}

              {/* Top Consuming Nodes List */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 block">
                  Top Consuming Nodes
                </span>

                {topConsumingNodes.length === 0 ? (
                  <p className="text-[11px] opacity-60 italic py-1 font-mono">
                    No individual node costs recorded yet.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {topConsumingNodes.map(({ node: n, metrics }) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          selectNode(n.id);
                          setIsBudgetPopoverOpen(false);
                        }}
                        className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-none cursor-pointer text-left font-mono"
                      >
                        <div className="truncate mr-2">
                          <div className="text-xs font-medium truncate">{n.label}</div>
                          <div className="text-[9px] opacity-60 truncate">
                            {metrics.totalTokens ? `${metrics.totalTokens.toLocaleString()} tokens` : n.status}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-1">
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                            ${metrics.costUsd.toFixed(4)}
                          </span>
                          <ChevronRight size={12} className="opacity-40" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Limit Adjustment */}
              <div className="pt-2 border-none space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cat-latte-overlay1 dark:text-cat-mocha-overlay2 block">
                  Adjust Plan Budget Ceiling
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold opacity-60">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={budgetLimitInput}
                      onChange={(e) => setBudgetLimitInput(e.target.value)}
                      placeholder="1.00"
                      className="w-full pl-6 pr-2 py-1.5 rounded-xl text-xs font-mono bg-cat-latte-surface1/60 dark:bg-cat-mocha-surface0/70 text-cat-latte-text dark:text-cat-mocha-text focus:outline-none focus:ring-1 focus:ring-amber-500/50 border-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const parsed = parseFloat(budgetLimitInput);
                      if (!isNaN(parsed) && parsed > 0) {
                        setPlanBudget(activePlanId, parsed);
                        setBudgetSavedFeedback(true);
                        setTimeout(() => setBudgetSavedFeedback(false), 2000);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all border-none cursor-pointer shadow-elevated-xs"
                  >
                    {budgetSavedFeedback ? 'Saved' : 'Save'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {[0.50, 1.00, 2.00, 5.00, 10.00].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setBudgetLimitInput(String(preset));
                        setPlanBudget(activePlanId, preset);
                        setBudgetSavedFeedback(true);
                        setTimeout(() => setBudgetSavedFeedback(false), 2000);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all border-none cursor-pointer ${
                        planBudget.budgetLimitUsd === preset
                          ? 'bg-amber-500 text-white font-bold'
                          : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 opacity-80'
                      }`}
                    >
                      ${preset.toFixed(2)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetLimitInput('');
                      setPlanBudget(activePlanId, null);
                      setBudgetSavedFeedback(true);
                      setTimeout(() => setBudgetSavedFeedback(false), 2000);
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-black/5 dark:bg-white/5 hover:bg-rose-500/15 hover:text-rose-600 transition-all border-none cursor-pointer opacity-80"
                    title="Clear explicit ceiling and use auto sum-of-nodes / default"
                  >
                    Auto
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Right: Health, AI Plan, Minimal Swarm Observability, Telemetry & Export */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Coherence Health Pill - visible on lg+ */}
        <button
          type="button"
          onClick={onOpenCoherence}
          title={`Graph Coherence: ${coherenceReport.score}% (Click for full diagnostic report)`}
          className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-medium transition-all duration-150 border-none cursor-pointer shadow-xs ${
            coherenceReport.score >= 90
              ? 'bg-[#e6f4ea] text-[#137333] dark:bg-cat-mocha-green/15 dark:text-cat-mocha-green'
              : coherenceReport.score >= 70
              ? 'bg-[#fef7e0] text-[#b06000] dark:bg-cat-mocha-yellow/15 dark:text-cat-mocha-yellow'
              : 'bg-[#fce8e6] text-[#c5221f] dark:bg-cat-mocha-red/20 dark:text-cat-mocha-red animate-pulse'
          }`}
        >
          <ShieldCheck size={13} />
          <span className="font-semibold">{coherenceReport.score}%</span>
        </button>

        {/* AI Plan Synthesizer Primary CTA - Always visible */}
        <button
          type="button"
          onClick={onOpenGenerator}
          title="Open AI Plan Synthesizer"
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-xl text-xs font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all duration-150 border-none cursor-pointer shrink-0"
        >
          <Sparkles size={13} />
          <span className="hidden sm:inline font-semibold">AI Plan</span>
        </button>

        {/* Undo / Redo - visible on xl+ */}
        <div className="hidden xl:flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-xl">
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

        <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5 hidden xl:block" />

        {/* Multi-Agent Swarm Observability - visible on md+ */}
        <button
          type="button"
          onClick={() => setCockpitOpen(!isCockpitOpen)}
          title={`Multi-Agent Swarm Observability (${globalSquad.length} active agents)`}
          className={`hidden md:flex h-8 px-2 rounded-xl text-xs font-medium items-center gap-1 transition-all border-none cursor-pointer shadow-xs shrink-0 ${
            isCockpitOpen
              ? 'bg-[#1a73e8] text-white font-semibold'
              : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#202124] dark:text-[#f8fafc]'
          }`}
        >
          <Users size={13} className={isCockpitOpen ? 'text-white' : 'text-[#1a73e8] dark:text-[#8ab4f8]'} />
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold font-mono ${
            isCockpitOpen ? 'bg-white/20 text-white' : 'bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8]'
          }`}>
            {globalSquad.length}
          </span>
        </button>

        {/* Shared Context Blackboard - visible on xl+ */}
        <button
          type="button"
          onClick={onOpenSharedContext}
          title={`Shared Agent Context Repository (${Object.keys(sharedContext?.global || {}).length} entries)`}
          className="hidden xl:flex h-8 px-2 rounded-xl text-xs font-medium bg-purple-500/10 hover:bg-purple-500/15 text-purple-700 dark:text-purple-300 items-center gap-1 transition-all border-none cursor-pointer shadow-xs shrink-0"
        >
          <Brain size={13} className="text-purple-600 dark:text-purple-400" />
          <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold font-mono">
            {Object.keys(sharedContext?.global || {}).length}
          </span>
        </button>

        {/* Antigravity Live Agent Sync Status Indicator - Always visible */}
        <button
          type="button"
          onClick={onOpenAgentSync}
          title={
            liveSyncStatus.connected
              ? "Agent Live Sync: Connected"
              : liveSyncStatus.lastErrorCode
              ? `Agent Live Sync [${liveSyncStatus.lastErrorCode}] (Auto-reconnecting)`
              : "Agent Live Sync Offline"
          }
          className={`h-8 px-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border-none cursor-pointer shadow-xs shrink-0 ${
            liveSyncStatus.connected
              ? 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold'
              : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8]'
          }`}
        >
          <span className="relative flex h-2 w-2">
            {liveSyncStatus.connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              liveSyncStatus.connected ? 'bg-emerald-500' : 'bg-slate-400'
            }`}></span>
          </span>
          <Radio size={13} className={liveSyncStatus.connected ? 'text-emerald-500' : 'opacity-60'} />
        </button>

        {/* Multi-Model Council & Gemini Ultra Quotas */}
        <button
          type="button"
          onClick={() => setCouncilModalOpen(true)}
          title="Multi-Model Council & Gemini Ultra Quota Monitor"
          className="h-8 px-2 sm:px-2.5 rounded-xl text-xs font-medium bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-transparent hover:bg-white/10 text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 transition-all border-none cursor-pointer shadow-xs shrink-0"
        >
          <span className="text-sm leading-none">🏛️</span>
          <span className="hidden md:inline font-semibold">Council</span>
          <span className={`w-1.5 h-1.5 rounded-full ${
            councilBudget?.systemStatus === 'healthy' || !councilBudget
              ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
              : councilBudget?.systemStatus === 'approaching_limit'
              ? 'bg-amber-500 animate-pulse'
              : 'bg-rose-500 animate-ping'
          }`} />
        </button>

        {/* Multi-Loop OODA / Council Iteration Cycle */}
        <button
          type="button"
          onClick={() => setLoopModalOpen(true)}
          title={`OODA Council Iteration Cycle: Loop ${loopTelemetry?.currentLoop || 1}${loopTelemetry?.targetMaxLoops ? `/${loopTelemetry.targetMaxLoops}` : ''} • ${loopTelemetry?.activeStage || 'observe'}${loopTelemetry?.isConverged ? ' (Converged)' : ''}`}
          className="h-8 px-2 sm:px-2.5 rounded-xl text-xs font-medium bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-transparent hover:bg-white/10 text-amber-800 dark:text-amber-200 flex items-center gap-1.5 transition-all border-none cursor-pointer shadow-xs shrink-0"
        >
          <RotateCw size={13} className={`text-amber-600 dark:text-amber-400 ${loopTelemetry?.isConverged ? '' : 'animate-spin-slow'}`} />
          <span className="hidden lg:inline font-semibold">
            {loopTelemetry
              ? `Loop ${loopTelemetry.currentLoop}${loopTelemetry.targetMaxLoops ? `/${loopTelemetry.targetMaxLoops}` : ''}`
              : 'OODA'}
          </span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold font-mono ${
            loopTelemetry?.isConverged
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
          }`}>
            {loopTelemetry?.isConverged
              ? 'Done'
              : (loopTelemetry?.activeStage ? (STAGE_SHORT_LABELS[loopTelemetry.activeStage] || loopTelemetry.activeStage) : 'Loop 1')}
          </span>
        </button>

        {/* Diagnostics & Telemetry HUD - visible on xl+ */}
        <button
          type="button"
          onClick={onOpenDiagnostics}
          title="System Diagnostics & Telemetry HUD (Ctrl+Shift+D)"
          className="hidden xl:flex h-8 w-8 rounded-xl text-xs font-medium bg-blue-500/10 hover:bg-blue-500/15 text-blue-700 dark:text-blue-300 items-center justify-center transition-all border-none cursor-pointer shadow-xs shrink-0"
        >
          <Activity size={13} className="text-blue-600 dark:text-blue-400" />
        </button>

        {/* Topology Hub & Archetype Library - visible on lg+ */}
        <button
          type="button"
          onClick={onOpenLibrary}
          className="h-8 px-2 rounded-xl text-xs font-medium bg-gradient-to-r from-[#1a73e8]/10 to-[#9334e6]/10 hover:from-[#1a73e8]/15 hover:to-[#9334e6]/15 text-[#1a73e8] dark:text-[#8ab4f8] hidden lg:flex items-center gap-1 transition-all border-none cursor-pointer shadow-xs shrink-0"
          title="Browse 10 Canonical Archetypes & Community Topologies (80% coverage)"
        >
          <Compass size={13} className="text-[#1a73e8] dark:text-[#8ab4f8]" />
          <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-[#1a73e8]/15 text-[#1a73e8] dark:text-[#8ab4f8] font-bold">
            80%
          </span>
        </button>

        <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-0.5 hidden sm:block" />

        {/* Hidden File Input for Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".canvas,.json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Consolidated Export & Import Dropdown - Always visible */}
        <div ref={exportMenuRef} className="relative">
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

        {/* Compact Tutorial Guide Icon Button - visible on xl+ */}
        <button
          type="button"
          onClick={onOpenTutorial}
          title="Open Interactive Onboarding Guide"
          className="hidden xl:flex w-8 h-8 rounded-xl items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] hover:text-[#202124] dark:hover:text-[#f8fafc] transition-colors border-none cursor-pointer"
        >
          <HelpCircle size={15} />
        </button>

        {/* Responsive More Tools Dropdown - visible on < xl */}
        <MoreToolsDropdown
          onOpenCoherence={onOpenCoherence}
          onOpenSharedContext={onOpenSharedContext}
          onOpenDiagnostics={onOpenDiagnostics}
          onOpenLibrary={onOpenLibrary}
          onOpenTutorial={onOpenTutorial}
          onOpenFleetModal={onOpenFleetModal}
          className="flex xl:hidden"
        />

        {/* Ultra-Compact Jewel Palette Picker (swatches only) */}
        <ThemePalettePicker />
      </div>
    </header>
  );
};
