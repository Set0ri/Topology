import fs from 'fs';
import path from 'path';
import {
  acquireLock,
  releaseLock,
  appendLog,
  readRecentLogs,
  getActiveLocks,
  syncGitLog,
  LOG_FILE,
} from '../mcp-server/gitLock.js';

export function topologyBridgePlugin() {
  const clients = new Map();
  const topologyDir = path.resolve(process.cwd(), '.topology');
  const planFilePath = path.join(topologyDir, 'plan.json');
  const plansFilePath = path.join(topologyDir, 'plans.json');
  const activePlanFilePath = path.join(topologyDir, 'active_plan.json');
  const approvalsFilePath = path.join(topologyDir, 'approvals.json');
  const contextFilePath = path.join(topologyDir, 'shared_context.json');

  const ensureDir = () => {
    if (!fs.existsSync(topologyDir)) {
      try {
        fs.mkdirSync(topologyDir, { recursive: true });
      } catch (err) {
        console.warn('[Topology Bridge] Failed to create .topology dir:', err);
      }
    }
  };

  const readJsonFile = (filePath, fallback = null) => {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return fallback;
  };

  const writeJsonFile = (filePath, data) => {
    ensureDir();
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`[Topology Bridge] Failed to write to ${filePath}:`, err);
    }
  };

  const loadAllPlans = () => {
    let plans = readJsonFile(plansFilePath, null);
    if (!plans || typeof plans !== 'object') {
      plans = {};
      const singlePlan = readJsonFile(planFilePath);
      if (singlePlan && Array.isArray(singlePlan.nodes) && singlePlan.nodes.length > 0) {
        const defaultId = singlePlan.id || 'default';
        plans[defaultId] = {
          id: defaultId,
          title: singlePlan.title || 'Dynamic Plan',
          description: singlePlan.description || '',
          agentId: singlePlan.agentId || 'agent-primary',
          agentName: singlePlan.agentName || 'Lead Orchestrator',
          agentRole: singlePlan.agentRole || 'Orchestrator',
          agentAvatar: singlePlan.agentAvatar || '🤖',
          agentColor: singlePlan.agentColor || '#1a73e8',
          nodes: singlePlan.nodes || [],
          edges: singlePlan.edges || [],
          createdAt: singlePlan.createdAt || Date.now(),
          updatedAt: singlePlan.updatedAt || Date.now(),
          status: 'active',
          source: singlePlan.source || 'antigravity_agent',
        };
      }
    }
    return plans;
  };

  const getActivePlanId = (plans) => {
    const activeMeta = readJsonFile(activePlanFilePath, null);
    if (activeMeta && activeMeta.activePlanId && plans[activeMeta.activePlanId]) {
      return activeMeta.activePlanId;
    }
    const keys = Object.keys(plans);
    return keys.length > 0 ? keys[0] : 'default';
  };

  const saveAllPlans = (plans, activePlanId) => {
    writeJsonFile(plansFilePath, plans);
    if (activePlanId) {
      writeJsonFile(activePlanFilePath, { activePlanId, updatedAt: Date.now() });
      if (plans[activePlanId]) {
        // Sync with legacy single plan file for 100% backward compatibility
        writeJsonFile(planFilePath, plans[activePlanId]);
      }
    }
  };

  const getPlanSummaries = (plans) => {
    return Object.values(plans).map((plan) => {
      const nodes = Array.isArray(plan.nodes) ? plan.nodes : [];
      const completed = nodes.filter((n) => n.status === 'completed').length;
      const inProgress = nodes.filter((n) => n.status === 'in_progress').length;
      const progressPercent = nodes.length > 0 ? Math.round((completed / nodes.length) * 100) : 0;
      const hasActiveWork = Boolean(
        inProgress > 0 ||
        nodes.some((n) => n.context?.telemetry?.state === 'thinking' || n.context?.telemetry?.state === 'executing_tool')
      );
      const latestThought = plan.latestThought || (nodes.find((n) => n.context?.telemetry?.liveThought)?.context?.telemetry?.liveThought);
      const activeTool = plan.activeTool || (nodes.find((n) => n.context?.telemetry?.activeTool)?.context?.telemetry?.activeTool);

      return {
        id: plan.id,
        title: plan.title,
        description: plan.description || '',
        agentId: plan.agentId || 'agent',
        agentName: plan.agentName || 'Agent',
        agentRole: plan.agentRole || 'Worker',
        agentAvatar: plan.agentAvatar || '🤖',
        agentColor: plan.agentColor || '#1a73e8',
        nodeCount: nodes.length,
        completedCount: completed,
        inProgressCount: inProgress,
        progressPercent,
        updatedAt: plan.updatedAt || Date.now(),
        status: plan.status || 'active',
        hasActiveWork,
        latestThought,
        activeTool,
      };
    });
  };

  const findPlanByNodeId = (plans, nodeId) => {
    for (const [planId, plan] of Object.entries(plans)) {
      if (Array.isArray(plan.nodes) && plan.nodes.some((n) => n.id === nodeId)) {
        return planId;
      }
    }
    return null;
  };

  const broadcast = (eventType, data) => {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach((res, id) => {
      try {
        res.write(payload);
      } catch (err) {
        clients.delete(id);
      }
    });
  };

  // Live File Watcher on .topology directory for direct external file appends and lock changes
  ensureDir();
  let logFileByteOffset = fs.existsSync(LOG_FILE) ? fs.statSync(LOG_FILE).size : 0;
  let watcherDebounce = null;

  try {
    fs.watch(topologyDir, (eventType, filename) => {
      if (watcherDebounce) clearTimeout(watcherDebounce);
      watcherDebounce = setTimeout(() => {
        try {
          // If lock file changed, broadcast updated locks table
          if (!filename || filename.endsWith('.lock')) {
            broadcast('locks_updated', getActiveLocks());
          }

          // If topology.log changed, tail new lines and broadcast
          if ((!filename || filename === 'topology.log') && fs.existsSync(LOG_FILE)) {
            const currentSize = fs.statSync(LOG_FILE).size;
            if (currentSize > logFileByteOffset) {
              const stream = fs.createReadStream(LOG_FILE, {
                start: logFileByteOffset,
                end: currentSize,
                encoding: 'utf-8',
              });
              let chunk = '';
              stream.on('data', d => { chunk += d; });
              stream.on('end', () => {
                logFileByteOffset = currentSize;
                const lines = chunk.split('\n').filter(Boolean);
                for (const line of lines) {
                  try {
                    const event = JSON.parse(line);
                    broadcast('log_event', event);
                  } catch {
                    // ignore
                  }
                }
              });
            } else if (currentSize < logFileByteOffset) {
              logFileByteOffset = currentSize;
            }
          }
        } catch {
          // ignore
        }
      }, 60);
    });
  } catch (err) {
    console.warn('[Topology Bridge] File watcher could not start on .topology dir:', err.message);
  }

  const TOPOLOGY_ERROR_CODES = {
    BRIDGE_OFFLINE: 'TOPOLOGY_ERR_BRIDGE_OFFLINE',
    BRIDGE_TIMEOUT: 'TOPOLOGY_ERR_BRIDGE_TIMEOUT',
    CACHE_IO_FAILED: 'TOPOLOGY_ERR_CACHE_IO_FAILED',
    INVALID_SCHEMA: 'TOPOLOGY_ERR_INVALID_SCHEMA',
    CYCLIC_DEPENDENCY: 'TOPOLOGY_ERR_CYCLIC_DEPENDENCY',
    GATE_UNATTENDED: 'TOPOLOGY_ERR_GATE_UNATTENDED',
    CLIENT_DISCONNECTED: 'TOPOLOGY_ERR_CLIENT_DISCONNECTED',
    SSE_DROPPED: 'TOPOLOGY_ERR_SSE_DROPPED',
    UI_RENDER_CRASH: 'TOPOLOGY_ERR_UI_RENDER_CRASH',
    NOT_FOUND: 'TOPOLOGY_ERR_NOT_FOUND',
    INTERNAL_ERROR: 'TOPOLOGY_ERR_INTERNAL',
  };

  const sendError = (res, statusCode, code, message) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: false,
      error: {
        code,
        message,
        timestamp: Date.now(),
        resilient: true,
      },
    }));
  };

  // Parse JSON request body helper
  const parseJsonBody = (req) => {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 5 * 1024 * 1024) {
          req.destroy();
          reject(new Error('Payload too large'));
        }
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (err) {
          reject(err);
        }
      });
      req.on('error', reject);
    });
  };

  return {
    name: 'topology-bridge-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/topology')) {
          return next();
        }

        // Set standard CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const pathname = url.split('?')[0];

        // 1. SSE Stream: /api/topology/stream
        if (pathname === '/api/topology/stream' && req.method === 'GET') {
          const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
          });

          res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);
          clients.set(clientId, res);

          // If stored plans exist, deliver the plans list and active plan immediately
          const allPlans = loadAllPlans();
          const activePlanId = getActivePlanId(allPlans);
          const summaries = getPlanSummaries(allPlans);

          res.write(`event: plans_list_updated\ndata: ${JSON.stringify({ activePlanId, plans: summaries })}\n\n`);

          const currentPlan = allPlans[activePlanId] || readJsonFile(planFilePath);
          if (currentPlan) {
            res.write(`event: plan_updated\ndata: ${JSON.stringify(currentPlan)}\n\n`);
          }

          // Deliver active resource locks immediately
          const activeLocks = getActiveLocks();
          res.write(`event: locks_updated\ndata: ${JSON.stringify(activeLocks)}\n\n`);

          // Heartbeat keepalive every 20s
          const heartbeatTimer = setInterval(() => {
            try {
              res.write(': heartbeat\n\n');
            } catch {
              clearInterval(heartbeatTimer);
              clients.delete(clientId);
            }
          }, 20000);

          req.on('close', () => {
            clearInterval(heartbeatTimer);
            clients.delete(clientId);
          });
          return;
        }

        // 2. Health & Status Check: /api/topology/status
        if (pathname === '/api/topology/status' && req.method === 'GET') {
          const allPlans = loadAllPlans();
          const activePlanId = getActivePlanId(allPlans);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            activeClients: clients.size,
            uptime: process.uptime(),
            timestamp: Date.now(),
            pid: process.pid,
            memory: process.memoryUsage(),
            totalPlansCount: Object.keys(allPlans).length,
            activePlanId,
          }));
          return;
        }

        // 2b. Full Diagnostics Telemetry: /api/topology/diagnostics
        if (pathname === '/api/topology/diagnostics' && req.method === 'GET') {
          const activeLocks = getActiveLocks();
          const logStats = fs.existsSync(LOG_FILE) ? { exists: true, sizeBytes: fs.statSync(LOG_FILE).size } : { exists: false, sizeBytes: 0 };
          const allPlans = loadAllPlans();
          const activePlanId = getActivePlanId(allPlans);
          const currentPlan = allPlans[activePlanId] || readJsonFile(planFilePath, { nodes: [], edges: [] });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            timestamp: Date.now(),
            bridge: {
              port: 5173,
              activeSseClients: clients.size,
              uptimeSeconds: Math.round(process.uptime()),
              pid: process.pid,
              memory: process.memoryUsage(),
            },
            storage: {
              log: logStats,
              activeLocksCount: activeLocks.length,
              activeLocks,
              totalPlansCount: Object.keys(allPlans).length,
              activePlanId,
              planNodesCount: (currentPlan.nodes || []).length,
              planEdgesCount: (currentPlan.edges || []).length,
            },
          }));
          return;
        }

        // 3. Get All Plans: /api/topology/plans
        if (pathname === '/api/topology/plans' && req.method === 'GET') {
          const allPlans = loadAllPlans();
          const activePlanId = getActivePlanId(allPlans);
          const summaries = getPlanSummaries(allPlans);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            activePlanId,
            plans: summaries,
            allPlans,
          }));
          return;
        }

        // 3b. Switch Active Plan: /api/topology/active-plan
        if (pathname === '/api/topology/active-plan' && req.method === 'POST') {
          try {
            const data = await parseJsonBody(req);
            const { planId } = data;
            if (!planId) {
              sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, 'planId is required');
              return;
            }
            const allPlans = loadAllPlans();
            if (!allPlans[planId]) {
              sendError(res, 404, TOPOLOGY_ERROR_CODES.NOT_FOUND, `Plan "${planId}" does not exist`);
              return;
            }

            saveAllPlans(allPlans, planId);
            const summaries = getPlanSummaries(allPlans);

            broadcast('active_plan_changed', { activePlanId: planId });
            broadcast('plan_updated', allPlans[planId]);
            broadcast('plans_list_updated', { activePlanId: planId, plans: summaries });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              activePlanId: planId,
              plan: allPlans[planId],
            }));
          } catch (err) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, err.message);
          }
          return;
        }

        // 3c. Delete Plan: /api/topology/plan (DELETE)
        if (pathname === '/api/topology/plan' && req.method === 'DELETE') {
          const searchParams = new URL(url, 'http://localhost').searchParams;
          const planId = searchParams.get('planId');
          if (!planId) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, 'planId is required');
            return;
          }

          const allPlans = loadAllPlans();
          delete allPlans[planId];

          let activePlanId = getActivePlanId(allPlans);
          if (activePlanId === planId) {
            const remaining = Object.keys(allPlans);
            activePlanId = remaining.length > 0 ? remaining[0] : 'default';
            if (!allPlans[activePlanId]) {
              allPlans[activePlanId] = {
                id: activePlanId,
                title: 'Default Plan',
                description: '',
                agentRole: 'Orchestrator',
                nodes: [],
                edges: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: 'active',
              };
            }
          }

          saveAllPlans(allPlans, activePlanId);
          const summaries = getPlanSummaries(allPlans);

          broadcast('plans_list_updated', { activePlanId, plans: summaries });
          broadcast('active_plan_changed', { activePlanId });
          if (allPlans[activePlanId]) {
            broadcast('plan_updated', allPlans[activePlanId]);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, deletedPlanId: planId, activePlanId }));
          return;
        }

        // 3d. Get Specific or Active Plan: /api/topology/plan (GET)
        if (pathname === '/api/topology/plan' && req.method === 'GET') {
          const searchParams = new URL(url, 'http://localhost').searchParams;
          const reqPlanId = searchParams.get('planId');
          const allPlans = loadAllPlans();
          const activePlanId = getActivePlanId(allPlans);
          const targetPlanId = reqPlanId || activePlanId;
          const targetPlan = allPlans[targetPlanId] || readJsonFile(planFilePath, { nodes: [], edges: [] });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(targetPlan));
          return;
        }

        // 4. Create / Replace Plan: /api/topology/plan (POST)
        if (pathname === '/api/topology/plan' && req.method === 'POST') {
          try {
            const data = await parseJsonBody(req);
            const allPlans = loadAllPlans();
            const currentActiveId = getActivePlanId(allPlans);

            // Derive planId from data or generate slug
            const planId = data.planId || data.id || (
              data.title
                ? data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                : null
            ) || currentActiveId || `plan-${Date.now()}`;

            const existingPlan = allPlans[planId] || {};
            const planPayload = {
              id: planId,
              title: data.title || existingPlan.title || 'Dynamic Plan',
              description: data.description !== undefined ? data.description : (existingPlan.description || ''),
              agentId: data.agentId || existingPlan.agentId || (data.author ? `agent-${data.author}` : 'agent-primary'),
              agentName: data.agentName || existingPlan.agentName || data.agentRole || 'Agent',
              agentRole: data.agentRole || existingPlan.agentRole || 'Worker',
              agentAvatar: data.agentAvatar || existingPlan.agentAvatar || (
                (data.agentRole || '').toLowerCase().includes('architect') ? '🧠' :
                (data.agentRole || '').toLowerCase().includes('frontend') ? '🎨' :
                (data.agentRole || '').toLowerCase().includes('devops') ? '⚡' :
                (data.agentRole || '').toLowerCase().includes('security') ? '🛡️' : '🤖'
              ),
              agentColor: data.agentColor || existingPlan.agentColor || '#1a73e8',
              nodes: data.nodes || existingPlan.nodes || [],
              edges: data.edges || existingPlan.edges || [],
              createdAt: existingPlan.createdAt || Date.now(),
              updatedAt: Date.now(),
              status: data.status || existingPlan.status || 'active',
              source: data.source || existingPlan.source || 'antigravity_agent',
              latestThought: data.latestThought || existingPlan.latestThought,
            };

            allPlans[planId] = planPayload;

            // By default, make new or updated plan active unless specified makeActive === false
            const shouldMakeActive = data.makeActive !== false;
            const newActiveId = shouldMakeActive ? planId : currentActiveId;

            saveAllPlans(allPlans, newActiveId);
            const summaries = getPlanSummaries(allPlans);

            broadcast('plan_updated', planPayload);
            broadcast('plans_list_updated', { activePlanId: newActiveId, plans: summaries });
            if (newActiveId !== currentActiveId) {
              broadcast('active_plan_changed', { activePlanId: newActiveId });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: `Plan "${planPayload.title}" (${planId}) ingested successfully with ${planPayload.nodes.length} nodes and ${planPayload.edges.length} edges.`,
              planId,
              activePlanId: newActiveId,
              nodeCount: planPayload.nodes.length,
              edgeCount: planPayload.edges.length,
            }));
          } catch (err) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, err.message || 'Invalid JSON body');
          }
          return;
        }

        // 5. Update Node Status & Telemetry: /api/topology/node (POST)
        if (pathname === '/api/topology/node' && req.method === 'POST') {
          try {
            const data = await parseJsonBody(req);
            const { planId: requestedPlanId, nodeId, status, thought, toolName, terminalLog, outputArtifacts, progress, assignedAgent } = data;

            if (!nodeId) {
              sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, 'nodeId is required');
              return;
            }

            const allPlans = loadAllPlans();
            const activePlanId = getActivePlanId(allPlans);
            const targetPlanId = requestedPlanId || findPlanByNodeId(allPlans, nodeId) || activePlanId;

            if (allPlans[targetPlanId] && Array.isArray(allPlans[targetPlanId].nodes)) {
              const nodeIdx = allPlans[targetPlanId].nodes.findIndex((n) => n.id === nodeId);
              if (nodeIdx !== -1) {
                const targetNode = allPlans[targetPlanId].nodes[nodeIdx];
                if (status) targetNode.status = status;
                targetNode.updatedAt = Date.now();
                targetNode.context = targetNode.context || {};
                targetNode.context.telemetry = targetNode.context.telemetry || {};
                if (thought) {
                  targetNode.context.telemetry.liveThought = thought;
                  allPlans[targetPlanId].latestThought = thought;
                }
                if (toolName) {
                  targetNode.context.telemetry.activeTool = toolName;
                  allPlans[targetPlanId].activeTool = toolName;
                }
                if (terminalLog) {
                  targetNode.context.telemetry.terminalLogs = [
                    ...(targetNode.context.telemetry.terminalLogs || []),
                    terminalLog,
                  ].slice(-50);
                }
                if (outputArtifacts) {
                  targetNode.context.outputArtifacts = outputArtifacts;
                }
                allPlans[targetPlanId].updatedAt = Date.now();
                saveAllPlans(allPlans, activePlanId);
              }
            }

            const updatePayload = {
              planId: targetPlanId,
              nodeId,
              status,
              thought,
              toolName,
              terminalLog,
              outputArtifacts,
              progress,
              assignedAgent,
              timestamp: Date.now(),
            };

            broadcast('node_updated', updatePayload);
            broadcast('plans_list_updated', { activePlanId, plans: getPlanSummaries(allPlans) });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, planId: targetPlanId, updatedNodeId: nodeId }));
          } catch (err) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, err.message || 'Invalid JSON body');
          }
          return;
        }

        // 6. Stream Live Thought: /api/topology/thought (POST)
        if (pathname === '/api/topology/thought' && req.method === 'POST') {
          try {
            const data = await parseJsonBody(req);
            const { planId: requestedPlanId, nodeId, thought, toolName } = data;
            const allPlans = loadAllPlans();
            const activePlanId = getActivePlanId(allPlans);
            const targetPlanId = requestedPlanId || (nodeId ? findPlanByNodeId(allPlans, nodeId) : null) || activePlanId;

            if (allPlans[targetPlanId]) {
              allPlans[targetPlanId].latestThought = thought;
              if (toolName) allPlans[targetPlanId].activeTool = toolName;
              allPlans[targetPlanId].updatedAt = Date.now();
              saveAllPlans(allPlans, activePlanId);
            }

            broadcast('thought_stream', { planId: targetPlanId, nodeId, thought, toolName, timestamp: Date.now() });
            broadcast('plans_list_updated', { activePlanId, plans: getPlanSummaries(allPlans) });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, planId: targetPlanId }));
          } catch (err) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, err.message);
          }
          return;
        }

        // 7. Emit Activity Stream Event: /api/topology/event
        if (pathname === '/api/topology/event' && req.method === 'POST') {
          try {
            const eventData = await parseJsonBody(req);
            const eventPayload = {
              id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: Date.now(),
              ...eventData,
            };
            broadcast('agent_event', eventPayload);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, eventId: eventPayload.id }));
          } catch (err) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, err.message);
          }
          return;
        }

        // 8. Human-in-the-Loop Approval: /api/topology/approve (UI or agent triggers)
        if (pathname === '/api/topology/approve' && req.method === 'POST') {
          try {
            const { nodeId, notes, approved, decision } = await parseJsonBody(req);
            const approvals = readJsonFile(approvalsFilePath, {});
            const isApproved = decision ? decision === 'approved' : approved !== false;
            approvals[nodeId] = {
              approved: isApproved,
              decision: isApproved ? 'approved' : 'rejected',
              notes: notes || (isApproved ? 'Approved by human operator via Topology UI' : 'Revision requested'),
              decidedAt: Date.now(),
            };
            writeJsonFile(approvalsFilePath, approvals);

            broadcast('node_approved', {
              nodeId,
              approved: isApproved,
              decision: isApproved ? 'approved' : 'rejected',
              notes: approvals[nodeId].notes,
              timestamp: Date.now(),
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, nodeId, approved: isApproved, decision: approvals[nodeId].decision }));
          } catch (err) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, err.message);
          }
          return;
        }

        // 9. Query Approval Status: /api/topology/approval-status
        if (pathname === '/api/topology/approval-status' && req.method === 'GET') {
          const searchParams = new URL(url, 'http://localhost').searchParams;
          const nodeId = searchParams.get('nodeId');
          if (!nodeId) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, 'nodeId query parameter is required');
            return;
          }

          const approvals = readJsonFile(approvalsFilePath, {});
          const record = approvals[nodeId];

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            nodeId,
            approved: record ? Boolean(record.approved) : false,
            decision: record ? (record.decision || (record.approved ? 'approved' : 'rejected')) : null,
            decided: Boolean(record),
            notes: record ? record.notes : null,
            decidedAt: record ? record.decidedAt : null,
          }));
          return;
        }

        // 10. Shared Context Blackboard: /api/topology/context (GET & POST)
        if (pathname === '/api/topology/context' && req.method === 'POST') {
          try {
            const data = await parseJsonBody(req);
            const { scope = 'global', key, value, authorAgentId, authorAgentRole, nodeId } = data;

            if (!key) {
              sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, 'Context "key" is required');
              return;
            }

            const currentRepo = readJsonFile(contextFilePath, { global: {}, nodes: {} });
            if (!currentRepo.global) currentRepo.global = {};
            if (!currentRepo.nodes) currentRepo.nodes = {};

            const entry = {
              key,
              value,
              authorAgentId: authorAgentId || 'agent-external',
              authorAgentRole: authorAgentRole || 'Agent',
              nodeId: scope === 'node' ? nodeId : undefined,
              scope,
              updatedAt: Date.now(),
            };

            if (scope === 'global') {
              currentRepo.global[key] = entry;
            } else if (nodeId) {
              if (!currentRepo.nodes[nodeId]) currentRepo.nodes[nodeId] = {};
              currentRepo.nodes[nodeId][key] = entry;
            }

            writeJsonFile(contextFilePath, currentRepo);

            // Broadcast real-time update to all connected UI clients
            broadcast('context_updated', {
              scope,
              key,
              value,
              nodeId,
              entry,
              repository: currentRepo,
              timestamp: Date.now(),
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, entry }));
          } catch (err) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, err.message);
          }
          return;
        }

        if (pathname === '/api/topology/context' && req.method === 'GET') {
          const searchParams = new URL(url, 'http://localhost').searchParams;
          const scope = searchParams.get('scope'); // 'global' | 'node' | null (all)
          const key = searchParams.get('key');
          const nodeId = searchParams.get('nodeId');

          const currentRepo = readJsonFile(contextFilePath, { global: {}, nodes: {} });

          let result;
          if (!scope) {
            result = currentRepo;
          } else if (scope === 'global') {
            result = key ? (currentRepo.global?.[key]?.value ?? null) : (currentRepo.global || {});
          } else if (scope === 'node') {
            if (nodeId) {
              const nodeEntries = currentRepo.nodes?.[nodeId] || {};
              result = key ? (nodeEntries[key]?.value ?? null) : nodeEntries;
            } else {
              result = currentRepo.nodes || {};
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: result }));
          return;
        }

        // 11. Append Event to Log: /api/topology/log (POST)
        if (pathname === '/api/topology/log' && req.method === 'POST') {
          try {
            const data = await parseJsonBody(req);
            const entry = await appendLog(data);
            broadcast('log_event', entry);
            if (entry.nodeId && (entry.status || entry.thought || entry.toolName)) {
              broadcast('node_updated', {
                nodeId: entry.nodeId,
                status: entry.status,
                thought: entry.thought,
                toolName: entry.toolName,
                timestamp: entry.timestamp,
              });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, entry }));
          } catch (err) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, err.message);
          }
          return;
        }

        // 12. Query Recent Log Entries: /api/topology/log (GET)
        if (pathname === '/api/topology/log' && req.method === 'GET') {
          const searchParams = new URL(url, 'http://localhost').searchParams;
          const limit = parseInt(searchParams.get('limit') || '100', 10);
          const logs = readRecentLogs(limit);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, count: logs.length, logs }));
          return;
        }

        // 13. Query Active Locks: /api/topology/locks (GET)
        if (pathname === '/api/topology/locks' && req.method === 'GET') {
          const locks = getActiveLocks();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, count: locks.length, locks }));
          return;
        }

        // 14. Acquire or Release Resource Lock: /api/topology/lock (POST)
        if (pathname === '/api/topology/lock' && req.method === 'POST') {
          try {
            const { nodeId, action = 'acquire', agentId = 'web-supervisor', ttlSeconds = 60, reason } = await parseJsonBody(req);
            if (!nodeId) {
              sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, 'nodeId is required');
              return;
            }

            let result;
            if (action === 'acquire') {
              result = acquireLock(nodeId, agentId, ttlSeconds, { reason });
            } else if (action === 'release') {
              result = releaseLock(nodeId, agentId);
            } else {
              sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, `Unknown lock action: "${action}"`);
              return;
            }

            // Broadcast current lock table to all UI clients
            broadcast('locks_updated', getActiveLocks());

            res.writeHead(result.ok ? 200 : 409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, err.message);
          }
          return;
        }

        // 15. Synchronize with Remote Git Repository: /api/topology/sync-git (POST)
        if (pathname === '/api/topology/sync-git' && req.method === 'POST') {
          try {
            const body = await parseJsonBody(req);
            const syncRes = await syncGitLog(body);
            broadcast('git_synced', syncRes);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, sync: syncRes }));
          } catch (err) {
            sendError(res, 500, TOPOLOGY_ERROR_CODES.INTERNAL_ERROR, err.message);
          }
          return;
        }

        // Default 404 for unknown /api/topology routes
        sendError(res, 404, TOPOLOGY_ERROR_CODES.NOT_FOUND, 'Endpoint not found on Topology Bridge');
      });
    },
  };
}
