import { useEffect, useRef } from 'react';
import { useTopologyStore } from '../store/useTopologyStore';
import { calculateDagreLayout } from '../utils/graphAlgorithms';
import { TopologyNode, TopologyEdge, AgentActivityEvent } from '../types/topology';

// Pleasant Web Audio API Synthesizer (zero external assets)
class ChimeSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  play(type: 'start' | 'complete' | 'review' | 'ping') {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'start') {
        // Quick ascending tech beep (C5 -> E5)
        [523.25, 659.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.08, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.13);
        });
      } else if (type === 'complete') {
        // Triumphant chord (C5, E5, G5, C6)
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.09, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.36);
        });
      } else if (type === 'review') {
        // Two-tone warning alert (A4 -> E5)
        [440, 659.25].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.12, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.23);
        });
      } else {
        // Subtle soft blip
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      }
    } catch {
      // Audio autoplay policy or device muted
    }
  }
}

export const chimeSynthesizer = new ChimeSynthesizer();

export function requestDesktopNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve(false);
  }
  if (Notification.permission === 'granted') {
    return Promise.resolve(true);
  }
  return Notification.requestPermission().then(permission => {
    const isGranted = permission === 'granted';
    useTopologyStore.getState().setDesktopNotificationsEnabled(isGranted);
    return isGranted;
  });
}

export function showDesktopNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  const store = useTopologyStore.getState();
  if (!store.liveSyncStatus.desktopNotificationsEnabled) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notif = new Notification(title, {
      icon: '/favicon.ico',
      ...options,
    });
    // Auto-close notification after 6 seconds
    setTimeout(() => notif.close(), 6000);
  } catch {
    // Ignore notification error
  }
}

export function useLiveAgentSync() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const setLiveSyncConnected = useTopologyStore(s => s.setLiveSyncConnected);
  const setLiveSyncHeartbeat = useTopologyStore(s => s.setLiveSyncHeartbeat);
  const loadTopologyDirect = useTopologyStore(s => s.loadTopologyDirect);
  const updateNode = useTopologyStore(s => s.updateNode);
  const addActivityEvent = useTopologyStore(s => s.addActivityEvent);

  useEffect(() => {
    let isSubscribed = true;

    function connect() {
      if (typeof window === 'undefined') return;

      // Close previous connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const es = new EventSource('/api/topology/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!isSubscribed) return;
        reconnectAttemptsRef.current = 0;
        setLiveSyncConnected(true);
        setLiveSyncHeartbeat(Date.now());
      };

      es.addEventListener('connected', (e: MessageEvent) => {
        if (!isSubscribed) return;
        setLiveSyncConnected(true);
        setLiveSyncHeartbeat(Date.now());
      });

      // 1. Full Plan Update from External Agent
      es.addEventListener('plan_updated', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const plan = JSON.parse(e.data);
          const rawNodes: TopologyNode[] = plan.nodes || [];
          const rawEdges: TopologyEdge[] = plan.edges || [];
          if (rawNodes.length === 0) return;

          const currentDir = useTopologyStore.getState().layoutDirection || 'LR';
          const positions = calculateDagreLayout(rawNodes, rawEdges, currentDir);
          const alignedNodes = rawNodes.map(n => ({
            ...n,
            position: positions[n.id] || n.position,
          }));

          loadTopologyDirect(alignedNodes, rawEdges);
          setLiveSyncHeartbeat(Date.now());

          const store = useTopologyStore.getState();
          if (store.liveSyncStatus.audioChimesEnabled) {
            chimeSynthesizer.play('start');
          }

          showDesktopNotification(`🗺️ Antigravity Plan Synced`, {
            body: `Loaded "${plan.title || 'Dynamic Plan'}" with ${rawNodes.length} tasks and ${rawEdges.length} causal edges.`,
            tag: 'topology-plan-sync',
          });

          addActivityEvent({
            agentId: 'antigravity-live',
            agentName: 'Antigravity Agent',
            agentRole: 'Orchestrator',
            agentColor: '#1a73e8',
            agentAvatar: '🤖',
            nodeId: rawNodes[0]?.id || 'root',
            nodeLabel: plan.title || 'Plan Synced',
            actionType: 'claimed_node',
            detail: `External Antigravity Agent pushed workflow plan "${plan.title || 'Dynamic Plan'}".`,
          });
        } catch (err) {
          console.error('[Topology LiveSync] Failed to process plan_updated:', err);
        }
      });

      // 2. Node Status & Telemetry Update
      es.addEventListener('node_updated', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const update = JSON.parse(e.data);
          const { nodeId, status, thought, toolName, terminalLog, outputArtifacts } = update;
          if (!nodeId) return;

          const currentNodes = useTopologyStore.getState().nodes;
          const targetNode = currentNodes.find(n => n.id === nodeId);
          if (!targetNode) return;

          const currentTelemetry = targetNode.context.telemetry || {
            state: 'idle' as const,
            liveThought: '',
            terminalLogs: [] as string[],
            lastUpdated: Date.now(),
          };
          const currentLogs = currentTelemetry.terminalLogs || [];

          const nextStatus = status || targetNode.status;
          const isNewlyCompleted = status === 'completed' && targetNode.status !== 'completed';
          const isNewlyRunning = status === 'in_progress' && targetNode.status !== 'in_progress';
          const needsApproval = targetNode.context.requiresHumanApproval && targetNode.context.approvalStatus === 'pending';

          const updatedNodeUpdates: Partial<TopologyNode> = {
            status: nextStatus,
            context: {
              ...targetNode.context,
              outputArtifacts: outputArtifacts || targetNode.context.outputArtifacts,
              telemetry: {
                ...currentTelemetry,
                state: (status === 'completed' ? 'completed' : status === 'in_progress' ? 'thinking' : currentTelemetry.state) as any,
                liveThought: thought !== undefined ? thought : currentTelemetry.liveThought,
                activeTool: toolName !== undefined ? toolName : currentTelemetry.activeTool,
                terminalLogs: terminalLog ? [...currentLogs, terminalLog].slice(-50) : currentLogs,
                lastUpdated: Date.now(),
              },
            },
          };

          updateNode(nodeId, updatedNodeUpdates);
          setLiveSyncHeartbeat(Date.now());

          const store = useTopologyStore.getState();

          if (isNewlyCompleted) {
            if (store.liveSyncStatus.audioChimesEnabled) chimeSynthesizer.play('complete');
            showDesktopNotification(`✅ Task Completed`, {
              body: `"${targetNode.label}" completed successfully.`,
              tag: `node-${nodeId}`,
            });
            addActivityEvent({
              agentId: 'antigravity-live',
              agentName: targetNode.context.role || 'Agent',
              agentRole: targetNode.context.role || 'Worker',
              agentColor: '#1e8e3e',
              agentAvatar: '✅',
              nodeId,
              nodeLabel: targetNode.label,
              actionType: 'completed',
              detail: `Completed "${targetNode.label}".`,
            });
          } else if (needsApproval) {
            if (store.liveSyncStatus.audioChimesEnabled) chimeSynthesizer.play('review');
            showDesktopNotification(`⚠️ Approval Required`, {
              body: `Execution paused at review gate for "${targetNode.label}".`,
              tag: `approval-${nodeId}`,
            });
          } else if (isNewlyRunning) {
            if (store.liveSyncStatus.audioChimesEnabled) chimeSynthesizer.play('start');
            addActivityEvent({
              agentId: 'antigravity-live',
              agentName: targetNode.context.role || 'Agent',
              agentRole: targetNode.context.role || 'Worker',
              agentColor: '#1a73e8',
              agentAvatar: '⚡',
              nodeId,
              nodeLabel: targetNode.label,
              actionType: 'started_work',
              detail: `Started work on "${targetNode.label}".`,
            });
          }
        } catch (err) {
          console.error('[Topology LiveSync] Failed to process node_updated:', err);
        }
      });

      // 3. Streaming Thought
      es.addEventListener('thought_stream', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const { nodeId, thought, toolName } = JSON.parse(e.data);
          const target = useTopologyStore.getState().nodes.find(n => n.id === nodeId);
          if (target) {
            const currentTelemetry = target.context.telemetry || {
              state: 'idle' as const,
              liveThought: '',
              terminalLogs: [] as string[],
              lastUpdated: Date.now(),
            };
            updateNode(nodeId, {
              context: {
                ...target.context,
                telemetry: {
                  ...currentTelemetry,
                  state: 'thinking',
                  liveThought: thought,
                  activeTool: toolName || currentTelemetry.activeTool,
                  terminalLogs: currentTelemetry.terminalLogs || [],
                  lastUpdated: Date.now(),
                },
              },
            });
          }
        } catch {
          // ignore
        }
      });

      // 4. External Agent Activity Event
      es.addEventListener('agent_event', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const eventPayload = JSON.parse(e.data);
          addActivityEvent(eventPayload);
        } catch {
          // ignore
        }
      });

      // 5. Node Approved Receipt
      es.addEventListener('node_approved', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const { nodeId, notes, approved, decision } = JSON.parse(e.data);
          const target = useTopologyStore.getState().nodes.find(n => n.id === nodeId);
          const isApproved = decision ? decision === 'approved' : Boolean(approved);
          if (target) {
            updateNode(nodeId, {
              status: isApproved ? 'completed' : 'blocked',
              context: {
                ...target.context,
                approvalStatus: isApproved ? 'approved' : 'rejected',
                approvalNotes: notes,
              },
            });
          }
        } catch {
          // ignore
        }
      });

      // 6. Shared Context Updated
      es.addEventListener('context_updated', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const { scope, key, entry, repository } = JSON.parse(e.data);
          if (repository) {
            useTopologyStore.getState().setSharedContextRepository(repository);
          } else if (entry) {
            useTopologyStore.getState().writeSharedContext(
              entry.scope || scope,
              entry.key || key,
              entry.value,
              entry.authorAgentId,
              entry.authorAgentRole,
              entry.nodeId
            );
          }
          chimeSynthesizer.play('ping');
        } catch {
          // ignore
        }
      });

      // 7. Resource Locks Updated
      es.addEventListener('locks_updated', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const locks = JSON.parse(e.data);
          if (Array.isArray(locks)) {
            useTopologyStore.getState().setActiveLocks(locks);
          }
        } catch {
          // ignore
        }
      });

      // 8. Log Event Appended
      es.addEventListener('log_event', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const entry = JSON.parse(e.data);
          useTopologyStore.getState().addLogEntry(entry);
        } catch {
          // ignore
        }
      });

      // 9. Git Synced
      es.addEventListener('git_synced', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const syncRes = JSON.parse(e.data);
          useTopologyStore.getState().setGitSyncStatus({
            lastCommitHash: syncRes.currentCommit,
            lastSyncTimestamp: syncRes.timestamp || Date.now(),
            error: syncRes.errors?.length ? syncRes.errors.join('; ') : null,
          });
          chimeSynthesizer.play('ping');
        } catch {
          // ignore
        }
      });

      es.onerror = () => {
        if (!isSubscribed) return;
        setLiveSyncConnected(false, 'TOPOLOGY_ERR_SSE_DROPPED');
        es.close();

        // Exponential backoff reconnect: 1.5s, 3s, 6s, 10s max (fail-open silent reconnect)
        const attempts = reconnectAttemptsRef.current;
        const delay = Math.min(10000, Math.pow(2, attempts) * 1500);
        reconnectAttemptsRef.current += 1;

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (isSubscribed) connect();
        }, delay);
      };
    }

    connect();

    return () => {
      isSubscribed = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setLiveSyncConnected(false);
    };
  }, [setLiveSyncConnected, setLiveSyncHeartbeat, loadTopologyDirect, updateNode, addActivityEvent]);
}
