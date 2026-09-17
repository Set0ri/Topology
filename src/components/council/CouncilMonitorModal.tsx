import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  Brain, 
  Globe, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Activity, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw,
  Layers,
  ChevronRight,
  Sliders,
  TrendingUp,
  Cpu,
  DollarSign,
  FileCode,
  FileText,
  Copy,
  Check,
  FolderGit2,
  Lock
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { ModelBudgetInfo, CouncilSessionSummary } from '../../types/topology';

export const CouncilMonitorModal: React.FC = () => {
  const isCouncilModalOpen = useTopologyStore((s) => s.isCouncilModalOpen);
  const setCouncilModalOpen = useTopologyStore((s) => s.setCouncilModalOpen);
  const councilBudget = useTopologyStore((s) => s.councilBudget);
  const councilSessions = useTopologyStore((s) => s.councilSessions);
  const fetchCouncilBudget = useTopologyStore((s) => s.fetchCouncilBudget);
  const fetchCouncilSessions = useTopologyStore((s) => s.fetchCouncilSessions);
  const fetchCouncilSessionDetails = useTopologyStore((s) => s.fetchCouncilSessionDetails);
  const exportCouncilAdr = useTopologyStore((s) => s.exportCouncilAdr);
  const spawnCouncil = useTopologyStore((s) => s.spawnCouncil);
  const resetCouncilBudget = useTopologyStore((s) => s.resetCouncilBudget);
  const isCouncilSpawning = useTopologyStore((s) => s.isCouncilSpawning);
  const activeCouncilSession = useTopologyStore((s) => s.activeCouncilSession);
  const createNewPlan = useTopologyStore((s) => s.createNewPlan);
  const setGraph = useTopologyStore((s) => s.setGraph);

  const [activeTab, setActiveTab] = useState<'quotas' | 'convene' | 'history'>('quotas');
  const [goalPrompt, setGoalPrompt] = useState('Design resilient distributed event streaming engine with zero-copy WAL and invariant checks');
  const [contextFilesInput, setContextFilesInput] = useState('src/types/topology.ts');
  const [constraintsInput, setConstraintsInput] = useState('Zero borders UI, Subtle animations, Fail-open resilience');
  const [rounds, setRounds] = useState(3);
  const [strategy, setStrategy] = useState<'halt_before_limit' | 'fallback_gemini_flash' | 'pause_for_refresh'>('halt_before_limit');
  const [saveAdr, setSaveAdr] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [copiedAdr, setCopiedAdr] = useState(false);
  const [expandedAdr, setExpandedAdr] = useState(false);
  const [, setNow] = useState(Date.now());

  // Ticking timer for real-time countdowns and data loading
  useEffect(() => {
    if (!isCouncilModalOpen) return;
    fetchCouncilBudget();
    fetchCouncilSessions();
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isCouncilModalOpen, fetchCouncilBudget, fetchCouncilSessions]);

  if (!isCouncilModalOpen) return null;

  const handleLaunchCouncil = async () => {
    if (!goalPrompt.trim() || isCouncilSpawning) return;
    try {
      const contextFiles = contextFilesInput
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const constraints = constraintsInput
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      await spawnCouncil({
        goal: goalPrompt.trim(),
        rounds,
        strategy,
        contextFiles,
        constraints,
        saveAdr,
      });
      setActiveTab('history');
    } catch (err: any) {
      console.error('Failed to spawn council:', err);
    }
  };

  const handleReset = async (modelId?: string) => {
    setIsResetting(true);
    await resetCouncilBudget(modelId);
    setTimeout(() => setIsResetting(false), 400);
  };

  const handleCopyAdr = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAdr(true);
    setTimeout(() => setCopiedAdr(false), 2000);
  };

  const handleSelectSession = async (sessionId: string) => {
    await fetchCouncilSessionDetails(sessionId);
    setActiveTab('history');
  };

  const handleHandoffToCanvas = () => {
    if (!activeCouncilSession?.consensus?.dag) return;
    const dagTasks = activeCouncilSession.consensus.dag;
    const dagEdges = activeCouncilSession.consensus.edges || [];

    const nodes = dagTasks.map((t, idx) => ({
      id: t.id,
      label: t.label,
      type: (t.type || 'task') as any,
      description: t.description || '',
      status: (idx === 0 ? 'ready' : 'pending') as any,
      priority: (idx === 0 ? 'high' : 'medium') as any,
      tags: ['council-consensus'],
      context: {
        role: t.role || 'ExecutionLead',
        promptTemplate: t.description || '',
        toolsRequired: [],
        inputArtifacts: [],
        outputArtifacts: [],
        validationCriteria: 'Invariants verified',
        telemetry: {
          state: 'idle' as const,
          terminalLogs: [`[COUNCIL] Handed off from ${activeCouncilSession.id}`],
          lastUpdated: Date.now(),
        }
      },
      position: { x: 100, y: 100 + idx * 240 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    const edges = dagEdges.map((e, idx) => ({
      id: `edge-council-${idx + 1}`,
      source: e.source,
      target: e.target,
      type: 'depends_on' as const,
      label: e.label || 'depends_on',
      animated: true,
    }));

    createNewPlan(
      `Execution: ${(activeCouncilSession.goal || 'Council Plan').slice(0, 36)}`,
      'ExecutionLead',
      nodes,
      edges
    );
    setCouncilModalOpen(false);
  };

  const modelsList: ModelBudgetInfo[] = councilBudget?.models ? Object.values(councilBudget.models) : [];
  const systemStatus = councilBudget?.systemStatus || 'healthy';
  const totalSessionCost = councilBudget?.totalSessionCostUsd ?? 0;
  const totalDailyCost = councilBudget?.totalDailyCostUsd ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-2xl animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        style={{ boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 50px 2px rgba(99, 102, 241, 0.12)' }}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600/40 to-violet-500/40 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/10">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-white">Multi-Model Council & Quotas</h2>
                <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
                  Gemini Ultra Plan
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Recurrent 3-Family Squad (Flash ⚡, Opus 🧠, GPT-OSS 🌐) with Context Ingestion & ADR Generation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Financial Cost Chip */}
            <div className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 cursor-help">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>${totalSessionCost.toFixed(4)} USD</span>
              <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute right-0 top-full mt-2 w-52 p-2.5 rounded-xl bg-slate-900/95 backdrop-blur-lg text-[10px] text-slate-300 shadow-xl transition-all duration-200 z-50">
                <div className="font-semibold text-white mb-1">Financial Consumption</div>
                <div>Session Cost: <span className="text-emerald-400 font-mono">${totalSessionCost.toFixed(4)}</span></div>
                <div>Daily Cost: <span className="text-emerald-400 font-mono">${totalDailyCost.toFixed(4)}</span></div>
                <div className="text-[9px] text-slate-500 mt-1">Calculated via official token pricing per family.</div>
              </div>
            </div>

            {/* Live Safety Status Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${
              systemStatus === 'healthy' 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : systemStatus === 'approaching_limit'
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-rose-500/10 text-rose-400'
            }`}>
              {systemStatus === 'healthy' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>
                {systemStatus === 'healthy' ? '15% Safety Buffer' : 'Safety Ceilings Active'}
              </span>
            </div>

            <button
              onClick={() => setCouncilModalOpen(false)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 pt-1 pb-3 bg-white/[0.01]">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04]">
            <button
              onClick={() => setActiveTab('quotas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'quotas'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Live Quotas & Cost</span>
            </button>

            <button
              onClick={() => setActiveTab('convene')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'convene'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Convene Council</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Transcript & ADRs</span>
              {activeCouncilSession && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchCouncilBudget(); fetchCouncilSessions(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
              title="Refresh quota status and history"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => handleReset()}
              disabled={isResetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
              title="Reset test quotas"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Reset Budget</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* TAB 1: LIVE QUOTAS & HEALTH */}
          {activeTab === 'quotas' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Top Banner Notice */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Gemini Ultra Sliding Window Quotas Active</h4>
                    <p className="text-[11px] text-slate-400">
                      Requests and tokens track a rolling 60-second window. The 15% reserve arming threshold automatically pauses council execution before hitting provider hard blocks.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-400">Daily Reset</span>
                  <div className="text-xs font-mono font-medium text-indigo-300">
                    {modelsList[0]?.ttr?.formattedDaily || '00:00'} (00:00 UTC)
                  </div>
                </div>
              </div>

              {/* 3 Model Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {modelsList.map((model) => {
                  const isHealthy = model.status === 'healthy';
                  const isApproaching = model.status === 'approaching_limit';
                  const modelCost = model.cost?.sessionCostUsd ?? 0;

                  return (
                    <div
                      key={model.id}
                      className="group relative p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition-all duration-300 flex flex-col justify-between"
                      style={{ boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)' }}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md"
                              style={{ backgroundColor: `${model.color}20`, color: model.color }}
                            >
                              {model.avatar}
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                                {model.name}
                              </h3>
                              <span className="text-[10px] text-slate-400 tracking-wide">
                                {model.family}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                            isHealthy 
                              ? 'bg-emerald-500/15 text-emerald-400' 
                              : isApproaching
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {model.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Specialist Role Pill & Cost Badge */}
                        <div className="mb-4 flex items-center justify-between gap-2">
                          <div className="px-2.5 py-1.5 rounded-xl bg-white/[0.02] text-[11px] text-slate-300 flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: model.color }} />
                            <span className="font-medium text-slate-200">Role:</span>
                            <span className="truncate">{model.role}</span>
                          </div>

                          <div 
                            className="px-2 py-1.5 rounded-xl bg-emerald-500/10 text-[11px] font-mono text-emerald-400 flex items-center gap-1 group/cost relative cursor-help flex-shrink-0"
                            title={`Session: $${modelCost.toFixed(4)}`}
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>${modelCost.toFixed(4)}</span>
                          </div>
                        </div>

                        {/* Metrics: RPM, TPM, Daily */}
                        <div className="space-y-3">
                          {/* RPM */}
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Activity className="w-3 h-3 text-slate-400" /> RPM (Req / Min)
                              </span>
                              <span className="font-mono text-slate-200">
                                {model.rpm.current} <span className="text-slate-500">/ {model.rpm.limit}</span>
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden relative">
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, model.rpm.percent)}%`,
                                  backgroundColor: model.rpm.percent > 70 ? '#f59e0b' : model.color,
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 mt-0.5 font-mono">
                              <span>0%</span>
                              <span className="text-amber-400/80">85% Safe Ceiling ({model.rpm.safeLimit})</span>
                              <span>100%</span>
                            </div>
                          </div>

                          {/* TPM */}
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Cpu className="w-3 h-3 text-slate-400" /> TPM (Tokens / Min)
                              </span>
                              <span className="font-mono text-slate-200">
                                {model.tpm.current.toLocaleString()} <span className="text-slate-500">/ {model.tpm.limit.toLocaleString()}</span>
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden relative">
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, model.tpm.percent)}%`,
                                  backgroundColor: model.tpm.percent > 70 ? '#f59e0b' : model.color,
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 mt-0.5 font-mono">
                              <span>0%</span>
                              <span className="text-amber-400/80">85% Safe Ceiling</span>
                              <span>100%</span>
                            </div>
                          </div>

                          {/* Daily Tokens */}
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-400 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-slate-400" /> Daily Tokens
                              </span>
                              <span className="font-mono text-slate-200">
                                {model.daily.current.toLocaleString()} <span className="text-slate-500">/ {model.daily.limit.toLocaleString()}</span>
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, model.daily.percent)}%`,
                                  backgroundColor: model.color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Live TTR Cool-down timer */}
                      <div className="mt-5 pt-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Window TTR:</span>
                        </div>
                        <span className={`font-mono font-medium px-2 py-0.5 rounded-md ${
                          model.ttr.windowSeconds > 0 
                            ? 'bg-amber-500/10 text-amber-300' 
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {model.ttr.formattedWindow}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Execution Hand-off Explanation Card */}
              <div className="p-5 rounded-2xl bg-white/[0.02] flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-2xl flex-shrink-0">
                  ⚡
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Deliberation vs. Execution Boundary</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The Council (Gemini 3.8 Flash, Claude 4.6 Opus, GPT-OSS 120b) convenes strictly for <span className="text-white font-medium">ideation, conceptual critique, and architectural DAG synthesis</span>. Once consensus is formed, the plan is handed off to <span className="text-blue-400 font-medium">Gemini 3.8 Flash</span> (1,000 RPM, 4M TPM) for deterministic, cost-effective code execution.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONVENE COUNCIL */}
          {activeTab === 'convene' && (
            <div className="space-y-5 max-w-2xl mx-auto animate-in fade-in duration-150 py-2">
              {/* Goal Prompt */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>Goal, Architecture Challenge, or Research Topic</span>
                  <span className="text-[10px] text-indigo-400 font-mono">Deliberated across 3 LLMs</span>
                </label>
                <textarea
                  value={goalPrompt}
                  onChange={(e) => setGoalPrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Design resilient distributed message queue with zero-copy WAL and invariant checks..."
                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all"
                />
              </div>

              {/* Context Files Input */}
              <div className="p-4 rounded-2xl bg-white/[0.03]">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Workspace Context Files (Optional)</span>
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Relative workspace paths fed directly into model contexts for ground-truth code awareness:
                </p>
                <input
                  type="text"
                  value={contextFilesInput}
                  onChange={(e) => setContextFilesInput(e.target.value)}
                  placeholder="e.g. src/types/topology.ts, dataflow.md"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Architectural Invariants / Constraints Input */}
              <div className="p-4 rounded-2xl bg-white/[0.03]">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Architectural Invariants & Guardrails (Optional)</span>
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Non-negotiable constraints enforced by Claude Opus & GPT-OSS during adversarial critique:
                </p>
                <input
                  type="text"
                  value={constraintsInput}
                  onChange={(e) => setConstraintsInput(e.target.value)}
                  placeholder="e.g. Zero borders UI, Memory < 128MB, Fail-open resilience"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rounds Selector */}
                <div className="p-4 rounded-2xl bg-white/[0.03]">
                  <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Deliberation Rounds</span>
                  </label>
                  <div className="flex gap-2">
                    {[
                      { r: 1, label: '1: Fast Ideate' },
                      { r: 2, label: '2: Peer Critique' },
                      { r: 3, label: '3: Full Consensus' },
                    ].map((item) => (
                      <button
                        key={item.r}
                        onClick={() => setRounds(item.r)}
                        className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
                          rounds === item.r
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'bg-white/[0.04] text-slate-400 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strategy Selector */}
                <div className="p-4 rounded-2xl bg-white/[0.03]">
                  <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Quota Ceiling Strategy</span>
                  </label>
                  <select
                    value={strategy}
                    onChange={(e: any) => setStrategy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.06] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="halt_before_limit" className="bg-slate-900 text-slate-100">
                      Halt before limit (15% reserve)
                    </option>
                    <option value="fallback_gemini_flash" className="bg-slate-900 text-slate-100">
                      Fallback to Gemini Flash surrogate
                    </option>
                    <option value="pause_for_refresh" className="bg-slate-900 text-slate-100">
                      Pause for rolling window refresh
                    </option>
                  </select>
                </div>
              </div>

              {/* Save ADR Toggle */}
              <div 
                onClick={() => setSaveAdr(!saveAdr)}
                className="p-4 rounded-2xl bg-white/[0.03] flex items-center justify-between cursor-pointer hover:bg-white/[0.05] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Auto-generate Architectural Decision Record (ADR)</div>
                    <div className="text-[11px] text-slate-400">Saves standardized ADR markdown to <span className="font-mono text-indigo-300">docs/adr/</span> for team documentation</div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                  saveAdr ? 'bg-indigo-600 text-white' : 'bg-white/10 text-transparent'
                }`}>
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Convene Action Button */}
              <button
                onClick={handleLaunchCouncil}
                disabled={isCouncilSpawning || !goalPrompt.trim()}
                className={`w-full py-4 rounded-2xl text-sm font-semibold text-white shadow-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                  isCouncilSpawning
                    ? 'bg-indigo-600/50 cursor-not-allowed animate-pulse'
                    : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:opacity-95 shadow-indigo-500/25 active:scale-[0.99]'
                }`}
              >
                {isCouncilSpawning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Convening Multi-Model Council (Deliberating...)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Convene Multi-Model Council Now</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: DELIBERATION HISTORY & ADR */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Historical Sessions Bar */}
              {councilSessions.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-white/[0.03] space-y-2">
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Historical Deliberations ({councilSessions.length})</span>
                    </span>
                    <span className="text-[11px] text-slate-500">Click to inspect transcript & ADR</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                    {councilSessions.map((s) => {
                      const isSelected = activeCouncilSession?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleSelectSession(s.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                          }`}
                        >
                          <span className="font-mono text-[10px] opacity-75">{s.id.slice(0, 14)}</span>
                          <span className="max-w-[140px] truncate">{s.goal}</span>
                          {s.totalCostUsd ? (
                            <span className="text-[10px] font-mono text-emerald-300">${s.totalCostUsd.toFixed(3)}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeCouncilSession ? (
                <>
                  {/* Session Overview */}
                  <div className="p-5 rounded-2xl bg-white/[0.03] flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400">
                          {activeCouncilSession.planId}
                        </span>
                        <span className="text-xs text-slate-400">
                          Completed in {Math.round((activeCouncilSession.elapsedMs || 0) / 1000)}s
                        </span>
                        {activeCouncilSession.estimatedCostUsd !== undefined && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300">
                            ${activeCouncilSession.estimatedCostUsd.toFixed(4)} USD
                          </span>
                        )}
                        {activeCouncilSession.totalTokensUsed && (
                          <span className="text-xs font-mono text-slate-400">
                            {activeCouncilSession.totalTokensUsed.toLocaleString()} tokens
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-white">
                        "{activeCouncilSession.goal}"
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                        Consensus Verified
                      </span>
                    </div>
                  </div>

                  {/* ADR Card */}
                  {activeCouncilSession.adr && (
                    <div className="p-5 rounded-2xl bg-white/[0.03] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white flex items-center gap-2">
                              <span>Architectural Decision Record (ADR-{(activeCouncilSession.adr.adrNumber || 1).toString().padStart(4, '0')})</span>
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                {activeCouncilSession.adr.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {activeCouncilSession.adr.filePath || 'Generated from consensus'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyAdr(activeCouncilSession.adr?.markdown || '')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 transition-all"
                          >
                            {copiedAdr ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy ADR</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setExpandedAdr(!expandedAdr)}
                            className="px-3 py-1.5 rounded-xl text-xs bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 transition-all"
                          >
                            {expandedAdr ? 'Collapse' : 'Inspect ADR'}
                          </button>
                        </div>
                      </div>

                      {expandedAdr && (
                        <div className="p-4 rounded-xl bg-black/40 text-xs font-mono text-slate-300 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed animate-in fade-in duration-150">
                          {activeCouncilSession.adr.markdown}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Synthesized Consensus DAG Callout */}
                  {activeCouncilSession.consensus && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-transparent">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300">
                          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                          <span>Synthesized Consensus Plan</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleHandoffToCanvas}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white flex items-center gap-1.5 shadow-sm transition-all border-none cursor-pointer"
                        >
                          <Sparkles size={13} />
                          <span>Handoff to Visual DAG</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                        {activeCouncilSession.consensus.consensusSummary}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeCouncilSession.consensus.dag?.map((task, idx) => (
                          <div key={task.id} className="p-3 rounded-xl bg-white/[0.03] flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                                {task.label}
                                <span className="text-[9px] font-mono text-slate-400 px-1.5 py-0.2 rounded bg-white/5">
                                  {task.role}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                {task.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deliberation Rounds Timeline */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Deliberation Timeline
                    </h4>

                    {activeCouncilSession.deliberationHistory?.map((roundItem) => (
                      <div key={roundItem.round} className="p-5 rounded-2xl bg-white/[0.02] space-y-4">
                        <div className="flex items-center justify-between pb-2">
                          <h5 className="text-xs font-semibold text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-indigo-400">
                              R{roundItem.round}
                            </span>
                            <span>{roundItem.title}</span>
                          </h5>
                          <span className="text-[11px] text-slate-500">
                            3 Model Families Deliberated
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {roundItem.contributions.map((c) => (
                            <div key={c.memberId + roundItem.round} className="p-3.5 rounded-xl bg-white/[0.02] flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-base">{c.avatar}</span>
                                  <span className="text-xs font-semibold text-white">{c.memberName}</span>
                                </div>
                                <div className="text-[11px] font-medium text-indigo-400 mb-2">
                                  {c.perspective}
                                </div>
                                {c.thought && (
                                  <p className="text-[11px] text-slate-300 italic mb-2 leading-relaxed">
                                    "{c.thought}"
                                  </p>
                                )}
                                {c.proposals && (
                                  <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                                    {c.proposals.map((p, i) => (
                                      <li key={i} className="leading-snug">{p}</li>
                                    ))}
                                  </ul>
                                )}
                                {c.critiques && (
                                  <ul className="text-[11px] text-amber-300/80 space-y-1 list-disc list-inside">
                                    {c.critiques.map((crit, i) => (
                                      <li key={i} className="leading-snug">{crit}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div className="mt-3 pt-2 flex justify-between text-[10px] text-slate-500 font-mono">
                                <span>Tokens Used</span>
                                <span>{c.tokensUsed.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-16 text-center text-slate-500 space-y-3">
                  <Layers className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-xs">No active council deliberation transcript yet.</p>
                  <button
                    onClick={() => setActiveTab('convene')}
                    className="px-4 py-2 rounded-xl text-xs bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-all"
                  >
                    Convene Council Now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
