import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Cpu, 
  Layers, 
  Wifi, 
  WifiOff, 
  Lock, 
  Unlock, 
  Clock, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  FileText, 
  Terminal, 
  Zap,
  Trash2
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const theme = useTopologyStore(s => s.theme);
  const nodes = useTopologyStore(s => s.nodes);
  const edges = useTopologyStore(s => s.edges);
  const lod = useTopologyStore(s => s.lod);
  const viewMode = useTopologyStore(s => s.viewMode);
  const liveSyncStatus = useTopologyStore(s => s.liveSyncStatus);
  const activeLocks = useTopologyStore(s => s.activeLocks);
  const recentLogEntries = useTopologyStore(s => s.recentLogEntries);
  const gitSyncStatus = useTopologyStore(s => s.gitSyncStatus);
  const getCoherenceReport = useTopologyStore(s => s.getCoherenceReport);
  const removeNodeLock = useTopologyStore(s => s.removeNodeLock);

  // 1. Live Render FPS calculation via requestAnimationFrame
  const [fps, setFps] = useState<number>(60);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!isOpen) return;
    let animId: number;
    const countFrames = (now: number) => {
      frameCountRef.current++;
      if (now - lastTimeRef.current >= 600) {
        const measuredFps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
        setFps(Math.min(120, Math.max(1, measuredFps)));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      animId = requestAnimationFrame(countFrames);
    };
    animId = requestAnimationFrame(countFrames);
    return () => cancelAnimationFrame(animId);
  }, [isOpen]);

  // 2. Live Ping Latency to Bridge (/api/topology/status)
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [bridgeServerInfo, setBridgeServerInfo] = useState<any>(null);

  const checkBridgeLatency = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/topology/status', { cache: 'no-store' });
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        setLatencyMs(elapsed);
        setBridgeServerInfo(data);
      } else {
        setLatencyMs(null);
      }
    } catch {
      setLatencyMs(null);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkBridgeLatency();
      const interval = setInterval(checkBridgeLatency, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // 3. Active Locks list
  const lockList = Object.values(activeLocks || {});

  // 4. Force release a lock
  const handleReleaseLock = async (resourceKey: string) => {
    try {
      await fetch('/api/topology/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: resourceKey, action: 'release', agentId: 'force' }),
      });
      removeNodeLock(resourceKey);
    } catch {
      removeNodeLock(resourceKey);
    }
  };

  // 5. 1-Click Export System Diagnostics Bundle
  const handleExportDiagnostics = () => {
    const coherence = getCoherenceReport();
    const bundle = {
      timestamp: new Date().toISOString(),
      topologyVersion: '2.5.0-resilient',
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
        language: typeof navigator !== 'undefined' ? navigator.language : 'Unknown',
        screen: typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight } : null,
        hardwareConcurrency: typeof navigator !== 'undefined' ? (navigator as any).hardwareConcurrency : null,
      },
      performance: {
        fps,
        latencyMs,
        viewportLod: lod,
        viewMode,
      },
      bridge: {
        connected: liveSyncStatus.connected,
        lastHeartbeat: liveSyncStatus.lastHeartbeat,
        errorCode: liveSyncStatus.lastErrorCode,
        serverMeta: bridgeServerInfo,
      },
      graphMetrics: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodeStatusDistribution: nodes.reduce((acc, n) => {
          acc[n.status] = (acc[n.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      coherence: {
        score: coherence.score,
        isHealthy: coherence.isHealthy,
        issues: coherence.issues,
      },
      activeLocks: lockList,
      gitSync: gitSyncStatus,
      recentLogs: recentLogEntries.slice(0, 30),
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topology-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white/95 dark:bg-[#11131c]/95 backdrop-blur-2xl shadow-elevated-2xl text-[#202124] dark:text-[#f8fafc] border-none overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4.5 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02] border-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center shadow-xs">
                <Activity size={18} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold tracking-tight">System Diagnostics & Telemetry HUD</h2>
                <p className="text-xs text-[#5f6368] dark:text-[#94a3b8] mt-0.5">
                  Real-time render performance, SSE bridge latency, process telemetry, and lock health
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportDiagnostics}
                className="h-8 px-3 rounded-xl text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white flex items-center gap-1.5 shadow-xs border-none cursor-pointer transition-all"
                title="Download full diagnostics JSON bundle"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Export Diagnostics</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#5f6368] dark:text-[#94a3b8] flex items-center justify-center border-none cursor-pointer transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Row: Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {/* FPS Card */}
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] shadow-xs flex flex-col justify-between border-none">
                <div className="flex items-center justify-between text-[#5f6368] dark:text-[#94a3b8] text-xs font-medium">
                  <span>Render FPS</span>
                  <Zap size={14} className={fps >= 50 ? 'text-emerald-500' : 'text-amber-500'} />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className={`text-2xl font-bold font-mono ${fps >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {fps}
                  </span>
                  <span className="text-[11px] text-[#5f6368] dark:text-[#94a3b8]">fps</span>
                </div>
                <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8] mt-1">
                  Target: 60fps {lod} LOD
                </div>
              </div>

              {/* SSE Latency Card */}
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] shadow-xs flex flex-col justify-between border-none">
                <div className="flex items-center justify-between text-[#5f6368] dark:text-[#94a3b8] text-xs font-medium">
                  <span>Bridge Latency</span>
                  {liveSyncStatus.connected ? (
                    <Wifi size={14} className="text-emerald-500" />
                  ) : (
                    <WifiOff size={14} className="text-rose-500" />
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className={`text-2xl font-bold font-mono ${
                    latencyMs !== null && latencyMs < 60 ? 'text-emerald-600 dark:text-emerald-400' : 
                    latencyMs !== null ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {latencyMs !== null ? latencyMs : '---'}
                  </span>
                  <span className="text-[11px] text-[#5f6368] dark:text-[#94a3b8]">ms</span>
                </div>
                <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8] mt-1 flex items-center justify-between">
                  <span>Port 5173 {liveSyncStatus.connected ? 'online' : 'reconnecting'}</span>
                  <button
                    type="button"
                    onClick={checkBridgeLatency}
                    className="hover:text-[#1a73e8] transition-colors border-none bg-transparent cursor-pointer p-0"
                    title="Ping now"
                  >
                    <RefreshCw size={10} className={isPinging ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Graph Scale Card */}
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] shadow-xs flex flex-col justify-between border-none">
                <div className="flex items-center justify-between text-[#5f6368] dark:text-[#94a3b8] text-xs font-medium">
                  <span>Graph Elements</span>
                  <Layers size={14} className="text-[#1a73e8]" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-[#202124] dark:text-[#f8fafc]">
                    {nodes.length}
                  </span>
                  <span className="text-[11px] text-[#5f6368] dark:text-[#94a3b8]">nodes / {edges.length} edges</span>
                </div>
                <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8] mt-1">
                  Active view: {viewMode.toUpperCase()}
                </div>
              </div>

              {/* Advisory Leases Card */}
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] shadow-xs flex flex-col justify-between border-none">
                <div className="flex items-center justify-between text-[#5f6368] dark:text-[#94a3b8] text-xs font-medium">
                  <span>Active Leases</span>
                  <Lock size={14} className={lockList.length > 0 ? 'text-amber-500' : 'text-[#5f6368]'} />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-[#202124] dark:text-[#f8fafc]">
                    {lockList.length}
                  </span>
                  <span className="text-[11px] text-[#5f6368] dark:text-[#94a3b8]">locks held</span>
                </div>
                <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8] mt-1">
                  {lockList.length === 0 ? 'No resource contention' : 'Concurrent agent locks'}
                </div>
              </div>
            </div>

            {/* Server & Engine Telemetry Bar */}
            {bridgeServerInfo && (
              <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-3 text-xs border-none">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold">Vite Bridge Supervisor</span>
                  <span className="text-[#5f6368] dark:text-[#94a3b8] font-mono">
                    PID: {bridgeServerInfo.pid || 'External'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[#5f6368] dark:text-[#94a3b8] font-mono text-[11px]">
                  <span>Uptime: {Math.round(bridgeServerInfo.uptime || 0)}s</span>
                  <span>Clients: {bridgeServerInfo.activeClients || 1}</span>
                  {bridgeServerInfo.memory?.heapUsed && (
                    <span>Heap: {Math.round(bridgeServerInfo.memory.heapUsed / (1024 * 1024))} MB</span>
                  )}
                </div>
              </div>
            )}

            {/* Middle Section: Active Resource Leases */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Lock size={15} className="text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5f6368] dark:text-[#94a3b8]">
                    Active Advisory Locks ({lockList.length})
                  </h3>
                </div>
                {lockList.length > 0 && (
                  <span className="text-[11px] text-[#5f6368] dark:text-[#94a3b8]">
                    Auto-expires on lease expiration (fail-safe)
                  </span>
                )}
              </div>

              {lockList.length === 0 ? (
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] text-center text-xs text-[#5f6368] dark:text-[#94a3b8] border-none">
                  All graph nodes and resources are unblocked. No active advisory locks held.
                </div>
              ) : (
                <div className="space-y-2">
                  {lockList.map(lock => (
                    <div
                      key={lock.resourceKey}
                      className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-between gap-4 text-xs border-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Lock size={13} />
                        </div>
                        <div>
                          <div className="font-semibold font-mono">{lock.resourceKey}</div>
                          <div className="text-[11px] text-[#5f6368] dark:text-[#94a3b8] mt-0.5">
                            Held by <span className="font-medium text-[#202124] dark:text-[#f8fafc]">{lock.agentId}</span> {lock.pid ? `(PID: ${lock.pid})` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="font-mono font-bold text-amber-600 dark:text-amber-400">
                            {lock.remainingSeconds}s
                          </div>
                          <div className="text-[10px] text-[#5f6368] dark:text-[#94a3b8]">TTL remaining</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleReleaseLock(lock.resourceKey)}
                          className="h-7 px-2.5 rounded-lg text-[11px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-1 border-none cursor-pointer transition-all"
                          title="Force-release lock"
                        >
                          <Unlock size={12} />
                          <span>Release</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Section: Recent Execution Logs Tail */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Terminal size={15} className="text-[#1a73e8]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5f6368] dark:text-[#94a3b8]">
                    Recent Event Stream (.topology/topology.log)
                  </h3>
                </div>
                <span className="text-[11px] text-[#5f6368] dark:text-[#94a3b8]">
                  Append-only execution stream
                </span>
              </div>

              {recentLogEntries.length === 0 ? (
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] text-center text-xs text-[#5f6368] dark:text-[#94a3b8] border-none">
                  No log entries recorded yet in active session.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border-none font-mono text-[11px]">
                  {recentLogEntries.slice(0, 25).map((entry, idx) => (
                    <div
                      key={entry.id || idx}
                      className="px-3 py-1.5 rounded-xl bg-white/60 dark:bg-black/20 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 truncate">
                        <span className="text-[#5f6368] dark:text-[#94a3b8] mr-2">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-semibold text-[#1a73e8] dark:text-[#8ab4f8] mr-2">
                          [{entry.agentRole || entry.agentId}]
                        </span>
                        <span className="font-medium mr-2">{entry.action}</span>
                        {entry.nodeId && (
                          <span className="text-[#5f6368] dark:text-[#94a3b8] mr-2">
                            ({entry.nodeId})
                          </span>
                        )}
                        {entry.thought && (
                          <span className="text-[#5f6368] dark:text-[#94a3b8] italic">
                            "{entry.thought.slice(0, 60)}..."
                          </span>
                        )}
                      </div>
                      {entry.status && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1a73e8]/10 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0">
                          {entry.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3 bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-xs text-[#5f6368] dark:text-[#94a3b8] border-none">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Resilient Fail-Open Architecture</span>
              <span className="hidden sm:inline text-black/30 dark:text-white/30">•</span>
              <span className="hidden sm:inline">Hotkey: Ctrl+Shift+D</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#202124] dark:text-[#f8fafc] border-none cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};