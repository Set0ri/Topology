import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  X, 
  Bell, 
  Volume2, 
  VolumeX, 
  Check, 
  Copy, 
  Bot, 
  Zap, 
  Terminal, 
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { chimeSynthesizer, requestDesktopNotificationPermission, showDesktopNotification } from '../../services/liveAgentSync';

interface AgentSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentSyncModal: React.FC<AgentSyncModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'mcp' | 'instructions' | 'curl'>('status');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSimulatingTest, setIsSimulatingTest] = useState(false);

  const liveSyncStatus = useTopologyStore(s => s.liveSyncStatus);
  const setDesktopNotificationsEnabled = useTopologyStore(s => s.setDesktopNotificationsEnabled);
  const setAudioChimesEnabled = useTopologyStore(s => s.setAudioChimesEnabled);
  const theme = useTopologyStore(s => s.theme);
  const isDark = theme === 'mocha' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleNotifications = async () => {
    if (!liveSyncStatus.desktopNotificationsEnabled) {
      const granted = await requestDesktopNotificationPermission();
      if (granted) {
        showDesktopNotification('🔔 Notifications Enabled', {
          body: 'You will now receive desktop alerts when external agents start, complete, or pause tasks.',
        });
      }
    } else {
      setDesktopNotificationsEnabled(false);
    }
  };

  const handleTestChime = () => {
    chimeSynthesizer.play('complete');
  };

  const handleTestNotification = () => {
    showDesktopNotification('🤖 Antigravity Agent Active', {
      body: 'Synthesizing API architecture and executing security contract.',
    });
    chimeSynthesizer.play('start');
  };

  const handleSimulateExternalDispatch = async () => {
    setIsSimulatingTest(true);
    try {
      // 1. Dispatch Plan
      await fetch('/api/topology/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Live Agent Distributed Pipeline',
          description: 'Autonomous multi-step execution synthesized by external Antigravity agent.',
          nodes: [
            { id: 'ext-step-1', label: 'Security & Schema Contract', type: 'task', role: 'Architect', status: 'in_progress', description: 'Validate input schemas and authentication boundary' },
            { id: 'ext-step-2', label: 'Distributed Event Bus Worker', type: 'task', role: 'CodeGenerator', status: 'pending', description: 'Implement RabbitMQ / Kafka event streamer' },
            { id: 'ext-step-3', label: 'E2E Validation & Load Test', type: 'decision', role: 'SecurityAnalyst', status: 'pending', description: 'Stress test connection pool under 10k RPS' },
            { id: 'ext-step-4', label: 'Production Container Deploy', type: 'milestone', role: 'Synthesizer', status: 'pending', description: 'Deploy artifacts to production' },
          ],
          edges: [
            { source: 'ext-step-1', target: 'ext-step-2', label: 'schema' },
            { source: 'ext-step-2', target: 'ext-step-3', label: 'stream' },
            { source: 'ext-step-3', target: 'ext-step-4', label: 'verify' },
          ],
        }),
      });

      // 2. Stream Thought
      setTimeout(async () => {
        await fetch('/api/topology/thought', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: 'ext-step-1',
            thought: 'Synthesizing OpenAPI v3 contract and checking zero-trust headers...',
            toolName: 'schema_validator',
          }),
        });
      }, 700);

      // 3. Complete First Step
      setTimeout(async () => {
        await fetch('/api/topology/node', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: 'ext-step-1',
            status: 'completed',
            outputArtifacts: ['contracts/api_v1.json'],
            terminalLog: '[00:04] Security & Schema Contract passed invariants with 0 errors.',
          }),
        });
        setIsSimulatingTest(false);
      }, 1600);
    } catch {
      setIsSimulatingTest(false);
    }
  };

  const mcpConfigSnippet = `{
  "mcpServers": {
    "topology": {
      "command": "node",
      "args": [
        "c:\\\\Users\\\\Logan\\\\projects\\\\Topology\\\\mcp-server\\\\index.js"
      ]
    }
  }
}`;

  const agentGuidelinesSnippet = `## Topology Visual DAG Planning Guideline
When executing multi-step projects, complex architectures, or long-running refactors:
1. Initialize the plan in Topology using \`topology_create_plan\` so the user can visualize progress on http://localhost:5173.
2. Before running a tool, stream your current reasoning using \`topology_emit_thought\`.
3. When completing a milestone or encountering a blocker, update the node status with \`topology_update_node\`.
4. If a step requires user verification or breaking change approval, invoke \`topology_request_approval\`.`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 dark:bg-black/60 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white/95 dark:bg-[#151722]/95 text-slate-900 dark:text-slate-100 shadow-elevated-2xl border-none overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-cat-mocha-sapphire/10 text-cat-mocha-sapphire dark:bg-cat-mocha-sapphire/20">
                <Radio size={20} className={liveSyncStatus.connected ? 'animate-pulse text-emerald-500' : ''} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold">
                  Antigravity Live Agent Sync
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time MCP hook, live telemetry streaming & desktop alerts
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border-none cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Connection Banner */}
          <div className="px-4 sm:px-6 py-2">
            <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl ${
              liveSyncStatus.connected 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' 
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center gap-2 text-xs font-medium">
                {liveSyncStatus.connected ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-amber-500" />}
                <span>
                  {liveSyncStatus.connected 
                    ? 'SSE Live Bridge Connected (localhost:5173/api/topology/stream)' 
                    : liveSyncStatus.lastErrorCode
                    ? `[${liveSyncStatus.lastErrorCode}] Bridge Disconnected (Fail-Open: Agent tasks continue unblocked)`
                    : 'Bridge Disconnected (Fail-Open: Agent tasks continue unblocked)'}
                </span>
              </div>
              <span className="text-[11px] font-mono opacity-70">
                {liveSyncStatus.lastHeartbeat ? `Heartbeat ${Math.round((Date.now() - liveSyncStatus.lastHeartbeat) / 1000)}s ago` : 'Waiting for connection'}
              </span>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-2 border-none">
            {[
              { id: 'status', label: 'Live Notifications & Controls' },
              { id: 'mcp', label: 'MCP Config' },
              { id: 'instructions', label: 'Agent Guidelines' },
              { id: 'curl', label: 'HTTP / Webhooks' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 border-none cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-elevated-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
            {activeTab === 'status' && (
              <div className="space-y-4">
                {/* Notification & Audio Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Desktop Notification Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                          <Bell size={16} />
                        </div>
                        <span className="text-xs font-bold">Desktop Notifications</span>
                      </div>
                      <button
                        onClick={handleToggleNotifications}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border-none cursor-pointer ${
                          liveSyncStatus.desktopNotificationsEnabled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                            : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                        }`}
                      >
                        {liveSyncStatus.desktopNotificationsEnabled ? 'Active' : 'Enable'}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Receive OS notifications when the other Antigravity agent begins work, finishes tasks, or pauses at approval gates.
                    </p>
                    <button
                      onClick={handleTestNotification}
                      className="w-full py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 shadow-elevated-xs border-none cursor-pointer transition-all"
                    >
                      Test Desktop Notification
                    </button>
                  </div>

                  {/* Audio Chime Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                          {liveSyncStatus.audioChimesEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </div>
                        <span className="text-xs font-bold">Web Audio Chimes</span>
                      </div>
                      <button
                        onClick={() => setAudioChimesEnabled(!liveSyncStatus.audioChimesEnabled)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border-none cursor-pointer ${
                          liveSyncStatus.audioChimesEnabled
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200'
                            : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                        }`}
                      >
                        {liveSyncStatus.audioChimesEnabled ? 'Active' : 'Muted'}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Subtle synthesized sine-wave sounds for task milestones and review gates (zero external files).
                    </p>
                    <button
                      onClick={handleTestChime}
                      className="w-full py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 shadow-elevated-xs border-none cursor-pointer transition-all"
                    >
                      Play Test Chime
                    </button>
                  </div>
                </div>

                {/* Simulate External Agent Dispatch */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 border-none space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot size={18} className="text-blue-500" />
                      <span className="text-xs font-bold">Simulate External Agent Dispatch</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold">
                      Interactive Demo
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Send a test DAG through the MCP bridge to verify real-time plan synchronization, card animations, live thought streaming, and desktop notifications.
                  </p>
                  <button
                    onClick={handleSimulateExternalDispatch}
                    disabled={isSimulatingTest}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-elevated-sm hover:shadow-elevated-md transition-all border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Zap size={14} />
                    <span>{isSimulatingTest ? 'Dispatching Test Telemetry...' : 'Trigger Live External Agent Simulation'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'mcp' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Global Configuration (~/.gemini/config/mcp_config.json)
                  </span>
                  <button
                    onClick={() => copyToClipboard(mcpConfigSnippet, 'mcp')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors border-none cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    {copiedKey === 'mcp' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copiedKey === 'mcp' ? 'Copied' : 'Copy Snippet'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border-none">
                  {mcpConfigSnippet}
                </pre>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This MCP server has already been registered in your global <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-[11px]">~/.gemini/config/mcp_config.json</code>. Any other Antigravity agent or subagent running on your machine automatically has access to the <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-[11px]">topology_*</code> tools!
                </p>
              </div>
            )}

            {activeTab === 'instructions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Agent Instruction Rule (AGENTS.md / GEMINI.md)
                  </span>
                  <button
                    onClick={() => copyToClipboard(agentGuidelinesSnippet, 'inst')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors border-none cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    {copiedKey === 'inst' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copiedKey === 'inst' ? 'Copied' : 'Copy Guidelines'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap border-none">
                  {agentGuidelinesSnippet}
                </pre>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Place this snippet in your other project's <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-[11px]">AGENTS.md</code> or your agent's system prompt to ensure it proactively creates and updates the topology graph.
                </p>
              </div>
            )}

            {activeTab === 'curl' && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Direct REST & Webhook Endpoints (For scripts, CI/CD, or non-MCP agents)
                </span>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 space-y-1.5">
                    <span className="text-xs font-mono font-bold text-blue-500">POST /api/topology/plan</span>
                    <pre className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-900 text-slate-100 p-2.5 rounded-lg overflow-x-auto">
{`curl -X POST http://localhost:5173/api/topology/plan \\
  -H "Content-Type: application/json" \\
  -d '{"title":"API Pipeline","nodes":[{"id":"n1","label":"Spec"}],"edges":[]}'`}
                    </pre>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 space-y-1.5">
                    <span className="text-xs font-mono font-bold text-emerald-500">POST /api/topology/node</span>
                    <pre className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-900 text-slate-100 p-2.5 rounded-lg overflow-x-auto">
{`curl -X POST http://localhost:5173/api/topology/node \\
  -H "Content-Type: application/json" \\
  -d '{"nodeId":"n1","status":"in_progress","thought":"Analyzing schemas..."}'`}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 pt-3 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02] border-none">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Zero external credentials required & local-only stdio bridge</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 transition-colors border-none cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
