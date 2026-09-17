import { useEffect, useRef } from 'react';
import { useTopologyStore, ensureSequentialEdges } from '../store/useTopologyStore';
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
        useTopologyStore.getState().fetchCouncilBudget();
      };

      es.addEventListener('connected', (e: MessageEvent) => {
        if (!isSubscribed) return;
        setLiveSyncConnected(true);
        setLiveSyncHeartbeat(Date.now());
        useTopologyStore.getState().fetchCouncilBudget();
      });

      // 0a. Plans List Registry Updated
      es.addEventListener('plans_list_updated', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(e.data);
          if (data && Array.isArray(data.plans)) {
            useTopologyStore.getState().setPlansList(data.plans, data.activePlanId);
          }
        } catch (err) {
          console.error('[Topology LiveSync] Failed to process plans_list_updated:', err);
        }
      });

      // 0b. Active Plan Changed
      es.addEventListener('active_plan_changed', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(e.data);
          if (data && data.activePlanId) {
            useTopologyStore.getState().switchPlan(data.activePlanId);
          }
        } catch (err) {
          console.error('[Topology LiveSync] Failed to process active_plan_changed:', err);
        }
      });

      // 1. Full Plan Update from External Agent
      es.addEventListener('plan_updated', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const plan = JSON.parse(e.data);
          const rawNodes: TopologyNode[] = plan.nodes || [];
          const rawEdges: TopologyEdge[] = plan.edges || [];
          const store = useTopologyStore.getState();
          const targetPlanId = plan.id || plan.planId || store.activePlanId;

          // Upsert into multi-plan registry
          store.upsertPlan(plan, targetPlanId === store.activePlanId);
          setLiveSyncHeartbeat(Date.now());

          if (rawNodes.length > 0 && targetPlanId === store.activePlanId) {
            const currentDir = store.layoutDirection || 'TB';
            const edges = ensureSequentialEdges(rawNodes, rawEdges);
            const positions = calculateDagreLayout(rawNodes, edges, currentDir);
            const alignedNodes = rawNodes.map(n => ({
              ...n,
              position: positions[n.id] || n.position,
            }));
            loadTopologyDirect(alignedNodes, edges);
          }

          if (store.liveSyncStatus.audioChimesEnabled) {
            chimeSynthesizer.play('start');
          }

          showDesktopNotification(`🗺️ Agent Plan Synced: "${plan.title || 'Dynamic Plan'}"`, {
            body: `Agent ${plan.agentRole || 'Worker'} pushed ${rawNodes.length} tasks and ${rawEdges.length} edges.`,
            tag: `topology-plan-${targetPlanId}`,
          });

          addActivityEvent({
            agentId: plan.agentId || 'antigravity-live',
            agentName: plan.agentName || plan.agentRole || 'Antigravity Agent',
            agentRole: plan.agentRole || 'Orchestrator',
            agentColor: plan.agentColor || '#1a73e8',
            agentAvatar: plan.agentAvatar || '🤖',
            nodeId: rawNodes[0]?.id || 'root',
            nodeLabel: plan.title || 'Plan Synced',
            actionType: 'claimed_node',
            detail: `Agent ${plan.agentRole || 'Worker'} initialized plan "${plan.title || 'Dynamic Plan'}".`,
          });
        } catch (err) {
          console.error('[Topology LiveSync] Failed to process plan_updated:', err);
        }
      });

      // 1b. Plan Completed Event
      es.addEventListener('plan_completed', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(e.data);
          const { planId, summary, artifacts } = data;
          const store = useTopologyStore.getState();
          const targetPlan = store.plans[planId];
          if (targetPlan) {
            store.upsertPlan({
              ...targetPlan,
              status: 'completed',
              completedAt: data.completedAt || Date.now(),
              summary: summary || targetPlan.summary,
              artifacts: artifacts || targetPlan.artifacts,
            });
          }

          if (store.liveSyncStatus.audioChimesEnabled) {
            chimeSynthesizer.play('complete');
          }

          showDesktopNotification(`🏁 Workflow Completed: "${targetPlan?.title || planId}"`, {
            body: summary || 'All plan tasks validated and deliverables synthesized.',
            tag: `topology-plan-completed-${planId}`,
          });

          addActivityEvent({
            agentId: targetPlan?.agentId || 'antigravity-live',
            agentName: targetPlan?.agentName || targetPlan?.agentRole || 'Antigravity Agent',
            agentRole: targetPlan?.agentRole || 'Orchestrator',
            agentColor: targetPlan?.agentColor || '#1a73e8',
            agentAvatar: targetPlan?.agentAvatar || '🏁',
            nodeId: 'plan-root',
            nodeLabel: targetPlan?.title || 'Workflow Completed',
            actionType: 'completed',
            detail: summary || `Plan "${targetPlan?.title || planId}" completed successfully.`,
          });
        } catch (err) {
          console.error('[Topology LiveSync] Failed to process plan_completed:', err);
        }
      });

      // 1b. Plan Status Changed Event (active, inactive, paused, completed, archived, abandoned)
      es.addEventListener('plan_status_changed', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(e.data);
          const { planId, status, plan } = data;
          if (!planId) return;

          const store = useTopologyStore.getState();
          if (plan) {
            store.upsertPlan(plan);
          } else {
            const existing = store.plans[planId];
            if (existing) {
              store.upsertPlan({ ...existing, status, updatedAt: Date.now() });
            }
          }
        } catch (err) {
          console.error('[Topology LiveSync] Failed to process plan_status_changed:', err);
        }
      });

      // 2. Node Status & Telemetry Update
      es.addEventListener('node_updated', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const update = JSON.parse(e.data);
          const { planId, nodeId, status, thought, toolName, terminalLog, outputArtifacts } = update;
          if (!nodeId) return;

          const store = useTopologyStore.getState();
          const targetPlanId = planId || store.activePlanId;

          // If targeted plan is in background, update its stored state
          if (targetPlanId) {
            store.updatePlanNodeState(targetPlanId, nodeId, {
              status,
              context: {
                outputArtifacts,
                telemetry: {
                  liveThought: thought,
                  activeTool: toolName,
                  lastUpdated: Date.now(),
                } as any,
              } as any,
            });
          }

          const currentNodes = store.nodes;
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

          const isStatusChanged = status && status !== targetNode.status;
          updateNode(nodeId, updatedNodeUpdates, { skipSnapshot: !isStatusChanged });
          setLiveSyncHeartbeat(Date.now());

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
          const { planId, nodeId, thought, toolName } = JSON.parse(e.data);
          const store = useTopologyStore.getState();
          const targetPlanId = planId || store.activePlanId;

          if (targetPlanId) {
            store.updatePlanNodeState(targetPlanId, nodeId, {
              context: {
                telemetry: {
                  liveThought: thought,
                  activeTool: toolName,
                  lastUpdated: Date.now(),
                } as any
              } as any
            });
          }

          const target = store.nodes.find(n => n.id === nodeId);
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
            }, { skipSnapshot: true });
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
            useTopologyStore.getState().cleanAndReconcilePlans();
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

      // 10. Council Budget & Quotas Updated
      es.addEventListener('budget_updated', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const budget = JSON.parse(e.data);
          useTopologyStore.getState().setCouncilBudget(budget);
        } catch {
          // ignore
        }
      });

      // 11. Council Session Completed
      es.addEventListener('council_completed', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const { session, budget } = JSON.parse(e.data);
          if (budget) useTopologyStore.getState().setCouncilBudget(budget);
          if (session) useTopologyStore.getState().setActiveCouncilSession(session);
          chimeSynthesizer.play('complete');
        } catch {
          // ignore
        }
      });

      // 12. OODA Loop Telemetry Updated
      es.addEventListener('loop_telemetry_updated', (e: MessageEvent) => {
        if (!isSubscribed) return;
        try {
          const { planId, telemetry } = JSON.parse(e.data);
          const store = useTopologyStore.getState();
          if (telemetry) {
            if (store.activePlanId === planId) {
              store.setActiveLoopTelemetry(telemetry);
            }
            const targetPlan = store.plans[planId];
            if (targetPlan) {
              store.upsertPlan({
                ...targetPlan,
                oodaLoop: telemetry,
                latestThought: telemetry.history?.[telemetry.history.length - 1]?.thought || targetPlan.latestThought,
                updatedAt: Date.now(),
              });
            }
          }
        } catch {
          // ignore
        }
      });

      es.onerror = () => {
        if (!isSubscribed) return;
        setLiveSyncConnected(false, 'TOPOLOGY_ERR_SSE_DROPPED');
        // On connection drop, clean and reconcile plans
        useTopologyStore.getState().cleanAndReconcilePlans();
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

    // 1. Initial on-load cleanup and reconciliation
    useTopologyStore.getState().cleanAndReconcilePlans();

    connect();

    // 2. Periodic background plan cleanup and reconciliation (every 20s)
    const periodicCleanupTimer = window.setInterval(() => {
      if (isSubscribed) {
        useTopologyStore.getState().cleanAndReconcilePlans();
      }
    }, 20000);

    // 3. Reconcile on window focus / tab visibility change
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isSubscribed) {
        useTopologyStore.getState().cleanAndReconcilePlans();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isSubscribed = false;
      window.clearInterval(periodicCleanupTimer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setLiveSyncConnected(false);
    };
  }, [setLiveSyncConnected, setLiveSyncHeartbeat, loadTopologyDirect, updateNode, addActivityEvent]);
}
