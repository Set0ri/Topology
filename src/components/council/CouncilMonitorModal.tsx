import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw,
  Layers,
  DollarSign, 
  FileText, 
  Copy, 
  Check, 
  FolderGit2, 
  Lock,
  MessageSquare
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { ModelBudgetInfo } from '../../types/topology';
import { LiveDebateTranscript } from './LiveDebateTranscript';
import { BenchmarkScoreCard } from './BenchmarkScoreCard';
import { ModelQuotaCard } from './ModelQuotaCard';
import { QuotaHeadroomPanel } from './QuotaHeadroomPanel';

export const CouncilMonitorModal: React.FC = () => {
  const isCouncilModalOpen = useTopologyStore((s) => s.isCouncilModalOpen);
  const setCouncilModalOpen = useTopologyStore((s) => s.setCouncilModalOpen);
  const councilBudget = useTopologyStore((s) => s.councilBudget);
  const councilSessions = useTopologyStore((s) => s.councilSessions);
  const fetchCouncilBudget = useTopologyStore((s) => s.fetchCouncilBudget);
  const fetchCouncilSessions = useTopologyStore((s) => s.fetchCouncilSessions);
  const fetchCouncilSessionDetails = useTopologyStore((s) => s.fetchCouncilSessionDetails);
  const spawnCouncil = useTopologyStore((s) => s.spawnCouncil);
  const resetCouncilBudget = useTopologyStore((s) => s.resetCouncilBudget);
  const isCouncilSpawning = useTopologyStore((s) => s.isCouncilSpawning);
  const activeCouncilSession = useTopologyStore((s) => s.activeCouncilSession);
  const activeDebateChunks = useTopologyStore((s) => s.activeDebateChunks);
  const clearDebateChunks = useTopologyStore((s) => s.clearDebateChunks);
  const createNewPlan = useTopologyStore((s) => s.createNewPlan);

  const [activeTab, setActiveTab] = useState<'debate' | 'quotas' | 'convene' | 'history'>('quotas');
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

      // Clear previous debate chunks and switch to live streaming debate tab
      clearDebateChunks();
      setActiveTab('debate');

      await spawnCouncil({
        goal: goalPrompt.trim(),
        rounds,
        strategy,
        contextFiles,
        constraints,
        saveAdr,
      });
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
              type="button"
              onClick={() => setCouncilModalOpen(false)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors border-none outline-none cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 pt-1 pb-3 bg-white/[0.01]">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04]">
            {/* Live Debate Stream Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('debate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border-none outline-none cursor-pointer ${
                activeTab === 'debate'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Live Debate & Scoring</span>
              {(isCouncilSpawning || activeDebateChunks.length > 0) && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            {/* Live Quotas & Headroom Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('quotas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border-none outline-none cursor-pointer ${
                activeTab === 'quotas'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>Live Quotas & Cost</span>
            </button>

            {/* Convene Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('convene')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border-none outline-none cursor-pointer ${
                activeTab === 'convene'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Convene Council</span>
            </button>

            {/* History & ADR Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border-none outline-none cursor-pointer ${
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
              type="button"
              onClick={() => { fetchCouncilBudget(); fetchCouncilSessions(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all border-none outline-none cursor-pointer"
              title="Refresh quota status and history"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => handleReset()}
              disabled={isResetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all border-none outline-none cursor-pointer"
              title="Reset test quotas"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Reset Budget</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* TAB 0: LIVE DEBATE STREAM & BENCHMARKS */}
          {activeTab === 'debate' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <LiveDebateTranscript />

              {/* Render Benchmark Score Card for current session if available */}
              <BenchmarkScoreCard report={activeCouncilSession?.benchmarkReport || null} />
            </div>
          )}

          {/* TAB 1: LIVE QUOTAS & HEALTH */}
          {activeTab === 'quotas' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Dynamic Quota & Cost Allocation Optimizer Panel */}
              <QuotaHeadroomPanel
                councilBudget={councilBudget}
                onSelectRoster={() => setActiveTab('convene')}
              />

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
                    {modelsList[0]?.ttr?.formattedDaily || '00:00:00 UTC'}
                  </div>
                </div>
              </div>

              {/* 3 Model Cards Grid using ModelQuotaCard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {modelsList.map((model) => (
                  <ModelQuotaCard
                    key={model.id}
                    model={model}
                    onReset={handleReset}
                    isResetting={isResetting}
                  />
                ))}
              </div>

              {/* Architecture Boundary Card */}
              <div className="p-5 rounded-2xl bg-white/[0.02] flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-white">Deliberation vs. Execution Boundary</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The Council (Opus & GPT-OSS) operates exclusively during multi-model deliberation and architecture reviews. Flash acts as Execution Lead, converting consensus ADRs directly into actionable visual DAG tasks without depleting reasoning quotas during task execution.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONVENE COUNCIL */}
          {activeTab === 'convene' && (
            <div className="space-y-5 max-w-3xl mx-auto py-2 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Convene Multi-Model Council</h3>
                <p className="text-xs text-slate-400">
                  Pose high-level architecture decisions, refactors, or security invariants. 3 model families will cross-examine and synthesize an execution DAG.
                </p>
              </div>

              {/* Goal Prompt Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Architecture Goal / Deliberation Prompt</span>
                </label>
                <textarea
                  value={goalPrompt}
                  onChange={(e) => setGoalPrompt(e.target.value)}
                  rows={3}
                  className="w-full p-3.5 rounded-2xl bg-white/[0.04] text-xs text-slate-200 placeholder-slate-500 focus:bg-white/[0.08] transition-all resize-none border-none outline-none"
                  placeholder="e.g. Design a resilient distributed event streaming engine with zero-copy WAL..."
                />
              </div>

              {/* Context Files Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Context Files (comma separated or newline)
                </label>
                <input
                  type="text"
                  value={contextFilesInput}
                  onChange={(e) => setContextFilesInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] text-xs text-slate-200 placeholder-slate-500 focus:bg-white/[0.08] transition-all border-none outline-none font-mono"
                  placeholder="src/types/topology.ts, src/store/useTopologyStore.ts"
                />
                <p className="text-[11px] text-slate-500">
                  Relevant files will be summarized and injected into all models' context windows.
                </p>
              </div>

              {/* Constraints Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Architectural Invariants & Constraints
                </label>
                <input
                  type="text"
                  value={constraintsInput}
                  onChange={(e) => setConstraintsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] text-xs text-slate-200 placeholder-slate-500 focus:bg-white/[0.08] transition-all border-none outline-none"
                  placeholder="Strict zero borders, Backward compatibility, Fail-open resilience"
                />
              </div>

              {/* Parameters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rounds Selector */}
                <div className="p-4 rounded-2xl bg-white/[0.03] space-y-2">
                  <div className="text-xs font-medium text-slate-300">Deliberation Rounds</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRounds(r)}
                        className={`py-2 rounded-xl text-xs font-medium transition-all border-none outline-none cursor-pointer ${
                          rounds === r
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        {r} {r === 1 ? 'Round' : 'Rounds'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {rounds === 1 ? 'Fast consensus' : rounds === 2 ? 'Proposal + Peer Critique' : 'Full 3-stage deliberation with synthesis'}
                  </p>
                </div>

                {/* Quota Strategy */}
                <div className="p-4 rounded-2xl bg-white/[0.03] space-y-2">
                  <div className="text-xs font-medium text-slate-300">Quota Ceiling Strategy</div>
                  <select
                    value={strategy}
                    onChange={(e: any) => setStrategy(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/[0.04] text-xs text-slate-200 focus:bg-white/[0.08] transition-all border-none outline-none"
                  >
                    <option value="halt_before_limit" className="bg-slate-900 text-slate-200">
                      Halt before limit (Safe 15% reserve)
                    </option>
                    <option value="fallback_gemini_flash" className="bg-slate-900 text-slate-200">
                      Fallback to Gemini Flash if Opus throttled
                    </option>
                    <option value="pause_for_refresh" className="bg-slate-900 text-slate-200">
                      Pause and wait for window TTR refresh
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
                type="button"
                onClick={handleLaunchCouncil}
                disabled={isCouncilSpawning || !goalPrompt.trim()}
                className={`w-full py-4 rounded-2xl text-sm font-semibold text-white shadow-xl transition-all duration-300 flex items-center justify-center gap-2 border-none outline-none cursor-pointer ${
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
                          type="button"
                          onClick={() => handleSelectSession(s.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap border-none outline-none cursor-pointer ${
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

                  {/* Benchmark Score Card for this active/selected session */}
                  <BenchmarkScoreCard report={activeCouncilSession.benchmarkReport || null} />

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
                            type="button"
                            onClick={() => handleCopyAdr(activeCouncilSession.adr?.markdown || '')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 transition-all border-none outline-none cursor-pointer"
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
                            type="button"
                            onClick={() => setExpandedAdr(!expandedAdr)}
                            className="px-3 py-1.5 rounded-xl text-xs bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 transition-all border-none outline-none cursor-pointer"
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
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white flex items-center gap-1.5 shadow-sm transition-all border-none outline-none cursor-pointer"
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
                    type="button"
                    onClick={() => setActiveTab('convene')}
                    className="px-4 py-2 rounded-xl text-xs bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-all border-none outline-none cursor-pointer"
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
