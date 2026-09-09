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

          // If a stored plan exists, deliver it immediately to the new client
          const existingPlan = readJsonFile(planFilePath);
          if (existingPlan) {
            res.write(`event: plan_updated\ndata: ${JSON.stringify(existingPlan)}\n\n`);
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
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            activeClients: clients.size,
            uptime: process.uptime(),
            timestamp: Date.now(),
            pid: process.pid,
            memory: process.memoryUsage(),
          }));
          return;
        }

        // 2b. Full Diagnostics Telemetry: /api/topology/diagnostics
        if (pathname === '/api/topology/diagnostics' && req.method === 'GET') {
          const activeLocks = getActiveLocks();
          const logStats = fs.existsSync(LOG_FILE) ? { exists: true, sizeBytes: fs.statSync(LOG_FILE).size } : { exists: false, sizeBytes: 0 };
          const planData = readJsonFile(planFilePath, { nodes: [], edges: [] });

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
              planNodesCount: (planData.nodes || []).length,
              planEdgesCount: (planData.edges || []).length,
            },
          }));
          return;
        }

        // 3. Get Current Plan: /api/topology/plan
        if (pathname === '/api/topology/plan' && req.method === 'GET') {
          const plan = readJsonFile(planFilePath, { nodes: [], edges: [] });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(plan));
          return;
        }

        // 4. Create / Replace Plan: /api/topology/plan
        if (pathname === '/api/topology/plan' && req.method === 'POST') {
          try {
            const data = await parseJsonBody(req);
            const planPayload = {
              title: data.title || 'Antigravity Dynamic Workflow',
              description: data.description || '',
              nodes: data.nodes || [],
              edges: data.edges || [],
              updatedAt: Date.now(),
              source: data.source || 'antigravity_agent',
            };

            writeJsonFile(planFilePath, planPayload);
            broadcast('plan_updated', planPayload);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              message: `Plan ingested successfully with ${planPayload.nodes.length} nodes and ${planPayload.edges.length} edges.`,
              nodeCount: planPayload.nodes.length,
              edgeCount: planPayload.edges.length,
            }));
          } catch (err) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, err.message || 'Invalid JSON body');
          }
          return;
        }

        // 5. Update Node Status & Telemetry: /api/topology/node
        if (pathname === '/api/topology/node' && req.method === 'POST') {
          try {
            const data = await parseJsonBody(req);
            const { nodeId, status, thought, toolName, terminalLog, outputArtifacts, progress, assignedAgent } = data;

            if (!nodeId) {
              sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, 'nodeId is required');
              return;
            }

            // Update in stored plan if available
            const plan = readJsonFile(planFilePath);
            if (plan && Array.isArray(plan.nodes)) {
              const nodeIdx = plan.nodes.findIndex((n) => n.id === nodeId);
              if (nodeIdx !== -1) {
                const targetNode = plan.nodes[nodeIdx];
                if (status) targetNode.status = status;
                targetNode.updatedAt = Date.now();
                targetNode.context = targetNode.context || {};
                targetNode.context.telemetry = targetNode.context.telemetry || {};
                if (thought) targetNode.context.telemetry.liveThought = thought;
                if (toolName) targetNode.context.telemetry.activeTool = toolName;
                if (terminalLog) {
                  targetNode.context.telemetry.terminalLogs = [
                    ...(targetNode.context.telemetry.terminalLogs || []),
                    terminalLog,
                  ].slice(-50);
                }
                if (outputArtifacts) {
                  targetNode.context.outputArtifacts = outputArtifacts;
                }
                writeJsonFile(planFilePath, plan);
              }
            }

            const updatePayload = {
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

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, updatedNodeId: nodeId }));
          } catch (err) {
            sendError(res, 400, TOPOLOGY_ERROR_CODES.INVALID_SCHEMA, err.message || 'Invalid JSON body');
          }
          return;
        }

        // 6. Stream Live Thought: /api/topology/thought
        if (pathname === '/api/topology/thought' && req.method === 'POST') {
          try {
            const data = await parseJsonBody(req);
            const { nodeId, thought, toolName } = data;
            broadcast('thought_stream', { nodeId, thought, toolName, timestamp: Date.now() });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
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
