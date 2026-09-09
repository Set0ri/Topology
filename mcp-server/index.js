#!/usr/bin/env node
/**
 * Topology Model Context Protocol (MCP) Server
 * 
 * Provides native tool calling for Antigravity agents to create plans,
 * stream live telemetry thoughts, update task statuses, and request human approvals.
 * 
 * Communication: Stdio JSON-RPC 2.0 (MCP Specification)
 * Bridge Target: http://localhost:5173/api/topology (with .topology/ fallback)
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import http from 'http';
import {
  acquireLock,
  releaseLock,
  appendLog,
  getActiveLocks,
  readRecentLogs,
  syncGitLog,
} from './gitLock.js';
import {
  ensureBridgeRunning,
  isBridgeAlive,
  BRIDGE_HOST,
  BRIDGE_PORT,
} from './serverSupervisor.js';
const TOPOLOGY_DIR = path.resolve(process.cwd(), '.topology');
const PLAN_FILE = path.join(TOPOLOGY_DIR, 'plan.json');
const APPROVALS_FILE = path.join(TOPOLOGY_DIR, 'approvals.json');
const CONTEXT_FILE = path.join(TOPOLOGY_DIR, 'shared_context.json');

// Standardized Topology Error Codes Taxonomy
export const TOPOLOGY_ERROR_CODES = {
  BRIDGE_OFFLINE: 'TOPOLOGY_ERR_BRIDGE_OFFLINE',
  BRIDGE_TIMEOUT: 'TOPOLOGY_ERR_BRIDGE_TIMEOUT',
  CACHE_IO_FAILED: 'TOPOLOGY_ERR_CACHE_IO_FAILED',
  INVALID_SCHEMA: 'TOPOLOGY_ERR_INVALID_SCHEMA',
  CYCLIC_DEPENDENCY: 'TOPOLOGY_ERR_CYCLIC_DEPENDENCY',
  GATE_UNATTENDED: 'TOPOLOGY_ERR_GATE_UNATTENDED',
  CLIENT_DISCONNECTED: 'TOPOLOGY_ERR_CLIENT_DISCONNECTED',
  LOCK_CONTENTION: 'TOPOLOGY_ERR_LOCK_CONTENTION',
  INTERNAL_ERROR: 'TOPOLOGY_ERR_INTERNAL',
};

const ERROR_METADATA = {
  TOPOLOGY_ERR_BRIDGE_OFFLINE: {
    message: 'Topology web visualizer bridge is currently offline at http://localhost:5173.',
    guidance: 'Ensure "npm run dev" is running if you want real-time canvas updates. Workflow state has been safely preserved in .topology/ on disk.',
    resilient: true,
  },
  TOPOLOGY_ERR_BRIDGE_TIMEOUT: {
    message: 'Topology web bridge request exceeded 1500ms timeout threshold.',
    guidance: 'Vite dev server may be busy or reloading. State has been safely preserved in .topology/ on disk.',
    resilient: true,
  },
  TOPOLOGY_ERR_INVALID_SCHEMA: {
    message: 'Provided parameters were incomplete or malformed.',
    guidance: 'Defaulted missing attributes to preserve continuous agent execution.',
    resilient: true,
  },
  TOPOLOGY_ERR_GATE_UNATTENDED: {
    message: 'Review gate requested while web supervisor is unattended or bridge is offline.',
    guidance: 'Do not hang indefinitely. If Topology UI is closed, prompt the supervisor directly in your conversation/terminal to approve or continue.',
    resilient: true,
  },
  TOPOLOGY_ERR_CACHE_IO_FAILED: {
    message: 'Encountered local filesystem error accessing .topology/ directory.',
    guidance: 'Operating in memory cache fallback mode.',
    resilient: true,
  },
  TOPOLOGY_ERR_LOCK_CONTENTION: {
    message: 'Resource or task node is currently leased by another active worker agent.',
    guidance: 'Wait for lease TTL to expire, claim another parallel unblocked node, or use releaseLock with force if owner crashed.',
    resilient: true,
  },
};

function logDebug(...args) {
  process.stderr.write(`[Topology-MCP] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { /* ignore */ }
  }
}

function readJson(file, fallback = null) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch {
    // ignore
  }
  return fallback;
}

function writeJson(file, data) {
  try {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    logDebug(`[${TOPOLOGY_ERROR_CODES.CACHE_IO_FAILED}] Failed to write file ${file}:`, err.message);
  }
}

function formatResilientNotice(bridgeResult) {
  if (bridgeResult && bridgeResult.ok) return '';
  const code = bridgeResult?.code || TOPOLOGY_ERROR_CODES.BRIDGE_OFFLINE;
  const meta = ERROR_METADATA[code] || {
    message: 'Topology live bridge is currently offline.',
    guidance: 'Updates cached to .topology/ folder. Agent execution is NOT blocked.'
  };
  return `\n\n> ℹ️ **[${code}] Non-Critical Notice**: ${meta.message}\n> **Execution Status**: Unblocked. State safely cached to disk (\`.topology/\`). You can proceed with your tasks normally.`;
}

// Low-overhead HTTP POST to the local Vite bridge with fail-open fallback and auto-start
function rawSendToBridge(endpoint, payload) {
  return new Promise((resolve) => {
    const dataString = JSON.stringify(payload);
    const options = {
      hostname: BRIDGE_HOST,
      port: BRIDGE_PORT,
      path: `/api/topology/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString),
      },
      timeout: 1500,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: JSON.parse(body) });
        } catch {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: body });
        }
      });
    });

    req.on('error', (err) => {
      const code = (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND')
        ? TOPOLOGY_ERROR_CODES.BRIDGE_OFFLINE
        : TOPOLOGY_ERROR_CODES.INTERNAL_ERROR;
      logDebug(`Bridge HTTP request failed: ${err.message} [${code}].`);
      resolve({ ok: false, code, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, code: TOPOLOGY_ERROR_CODES.BRIDGE_TIMEOUT, error: 'Bridge request timed out' });
    });

    req.write(dataString);
    req.end();
  });
}

async function sendToBridge(endpoint, payload, allowAutoStart = true) {
  let result = await rawSendToBridge(endpoint, payload);
  if (!result.ok && result.code === TOPOLOGY_ERROR_CODES.BRIDGE_OFFLINE && allowAutoStart) {
    logDebug(`[Topology-MCP] Live visualizer is offline. Auto-starting Vite server in background...`);
    const serverStatus = await ensureBridgeRunning();
    if (serverStatus.running) {
      logDebug(`[Topology-MCP] Visualizer server is ready! Resending payload to bridge...`);
      result = await rawSendToBridge(endpoint, payload);
    }
  }
  return result;
}

// Low-overhead HTTP GET with fail-open fallback and auto-start
function rawGetFromBridge(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: BRIDGE_HOST,
      port: BRIDGE_PORT,
      path: `/api/topology/${endpoint}`,
      method: 'GET',
      timeout: 1500,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: JSON.parse(body) });
        } catch {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, data: body });
        }
      });
    });

    req.on('error', (err) => {
      const code = (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND')
        ? TOPOLOGY_ERROR_CODES.BRIDGE_OFFLINE
        : TOPOLOGY_ERROR_CODES.INTERNAL_ERROR;
      resolve({ ok: false, code, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, code: TOPOLOGY_ERROR_CODES.BRIDGE_TIMEOUT, error: 'Bridge request timed out' });
    });

    req.end();
  });
}

async function getFromBridge(endpoint, allowAutoStart = true) {
  let result = await rawGetFromBridge(endpoint);
  if (!result.ok && result.code === TOPOLOGY_ERROR_CODES.BRIDGE_OFFLINE && allowAutoStart) {
    logDebug(`[Topology-MCP] Live visualizer is offline. Auto-starting Vite server in background...`);
    const serverStatus = await ensureBridgeRunning();
    if (serverStatus.running) {
      result = await rawGetFromBridge(endpoint);
    }
  }
  return result;
}

// Tool Definitions
const TOOLS = [
  {
    name: 'topology_create_plan',
    description: 'Initialize or update the global workflow DAG in Topology. Pass the high-level goal and decomposed tasks/nodes with their causal dependency edges so the user can visualize live progress.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the goal or workflow plan' },
        description: { type: 'string', description: 'Overview summary of the plan' },
        nodes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique node ID (e.g., "spec-1", "backend-impl", "test-eval")' },
              label: { type: 'string', description: 'Concise, human-readable task title' },
              type: { type: 'string', enum: ['goal', 'task', 'decision', 'milestone', 'artifact', 'agent'], default: 'task' },
              role: { type: 'string', description: 'Assigned specialist persona (e.g., "Architect", "SecurityAnalyst", "CodeGenerator")' },
              description: { type: 'string', description: 'Detailed execution instructions, tools required, or acceptance criteria' },
              status: { type: 'string', enum: ['pending', 'ready', 'in_progress', 'completed', 'blocked', 'failed'], default: 'pending' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
              requiresApproval: { type: 'boolean', description: 'Set true if human review is required before unblocking downstream steps', default: false }
            },
            required: ['id', 'label']
          },
          description: 'List of execution nodes in the workflow'
        },
        edges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              source: { type: 'string', description: 'Prerequisite node ID' },
              target: { type: 'string', description: 'Dependent node ID' },
              label: { type: 'string', description: 'Relationship label (e.g. "contracts", "depends_on", "validates")' },
              condition: { type: 'string', enum: ['true', 'false', 'always'], default: 'always' }
            },
            required: ['source', 'target']
          },
          description: 'Causal dependency edges connecting nodes'
        }
      },
      required: ['title', 'nodes', 'edges']
    }
  },
  {
    name: 'topology_update_node',
    description: 'Update a specific node\'s progress, status, active thought, tool execution, terminal logs, or emitted artifact payloads in the Topology UI.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node to update' },
        status: { type: 'string', enum: ['pending', 'ready', 'in_progress', 'completed', 'blocked', 'failed'] },
        thought: { type: 'string', description: 'Current live thought or reasoning step to display on the node card' },
        toolName: { type: 'string', description: 'Name of the tool currently being executed' },
        terminalLog: { type: 'string', description: 'A line of terminal output or log message to append to the node telemetry' },
        outputArtifacts: { type: 'array', items: { type: 'string' }, description: 'Output artifact files created (e.g. ["src/auth.ts"])' }
      },
      required: ['nodeId']
    }
  },
  {
    name: 'topology_emit_thought',
    description: 'Stream a live thought and tool state to the Topology canvas in real-time as you reason through a problem.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the currently active node' },
        thought: { type: 'string', description: 'Live thought or reasoning step' },
        toolName: { type: 'string', description: 'Optional name of the tool in progress' }
      },
      required: ['nodeId', 'thought']
    }
  },
  {
    name: 'topology_request_approval',
    description: 'Pause execution at a Human-in-the-Loop review gate. Emits an alert in Topology and awaits supervisor sign-off.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'Node ID requiring human review' },
        notes: { type: 'string', description: 'Summary of what was achieved and what the user needs to inspect or approve' },
        proposedArtifacts: { type: 'array', items: { type: 'string' }, description: 'List of files/artifacts to be verified' }
      },
      required: ['nodeId', 'notes']
    }
  },
  {
    name: 'topology_get_plan',
    description: 'Retrieve the current live Topology DAG, node execution states, and human approval decisions.',
    inputSchema: {
      type: 'object',
      properties: {
        includeApprovals: { type: 'boolean', default: true }
      }
    }
  },
  {
    name: 'topology_write_shared_context',
    description: 'Write a shared context entry (architectural contract, database schema, security policy, or intermediate data) to the Topology blackboard repository. Can be scoped globally to the entire workflow or to a specific node.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['global', 'node'], default: 'global', description: 'Scope: "global" for the entire graph or "node" for a specific task node' },
        key: { type: 'string', description: 'Unique identifier for the context entry (e.g., "auth_contract", "db_schema")' },
        value: { description: 'The context value, can be a JSON object, array, string, or number' },
        nodeId: { type: 'string', description: 'Required if scope is "node": the target node ID' },
        authorAgentRole: { type: 'string', description: 'Specialist role of the authoring agent' }
      },
      required: ['key', 'value']
    }
  },
  {
    name: 'topology_read_shared_context',
    description: 'Read shared context entries from the Topology blackboard repository. Retrieve global architectural contracts or node-specific state.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['global', 'node'], description: 'Optional scope filter: "global" or "node". Omit to read the full repository' },
        key: { type: 'string', description: 'Optional key filter to retrieve a specific entry value directly' },
        nodeId: { type: 'string', description: 'Required if reading a specific node\'s context' }
      }
    }
  },
  {
    name: 'topology_log_event',
    description: 'Atomically append a structured action event to the Git-backed event log (.topology/topology.log) with optional node locking. Updates node progress, thought, and tools in a single simple call.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Action type: "claim", "start", "thought", "tool", "completed", "blocked", "context", etc.' },
        nodeId: { type: 'string', description: 'Optional target node ID' },
        thought: { type: 'string', description: 'Live reasoning thought or explanation' },
        toolName: { type: 'string', description: 'Name of active tool executing' },
        status: { type: 'string', enum: ['pending', 'ready', 'in_progress', 'completed', 'blocked', 'failed'], description: 'Optional task status' },
        outputArtifacts: { type: 'array', items: { type: 'string' }, description: 'Artifacts generated by this step' },
        acquireLock: { type: 'boolean', description: 'If true, automatically acquire a local lease lock on this nodeId', default: false },
        lockTtlSeconds: { type: 'number', description: 'TTL in seconds for acquired lock (default: 60)', default: 60 },
        authorAgentRole: { type: 'string', description: 'Agent persona role' }
      },
      required: ['action']
    }
  },
  {
    name: 'topology_acquire_lock',
    description: 'Acquire an exclusive lease-based lock on a node or resource to prevent race conditions with other agents. Uses local Git-style lockfile with auto-expiration (TTL).',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'Node or resource ID to lock' },
        agentId: { type: 'string', description: 'ID of the agent claiming the lock' },
        ttlSeconds: { type: 'number', description: 'Duration of the lock lease in seconds before auto-expiration (default: 60)', default: 60 },
        reason: { type: 'string', description: 'Purpose or operation description for holding the lock' }
      },
      required: ['nodeId']
    }
  },
  {
    name: 'topology_release_lock',
    description: 'Release an exclusive lock held on a node or resource.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'Node or resource ID to unlock' },
        agentId: { type: 'string', description: 'ID of the agent releasing the lock (or "force" to break)' }
      },
      required: ['nodeId']
    }
  },
  {
    name: 'topology_sync_git_log',
    description: 'Synchronize the local event log (.topology/topology.log) with the remote Git repository for non-local multi-agent coordination across machines or branches.',
    inputSchema: {
      type: 'object',
      properties: {
        remote: { type: 'string', default: 'origin', description: 'Git remote name' },
        branch: { type: 'string', default: 'main', description: 'Git branch name' },
        autoCommit: { type: 'boolean', default: true, description: 'Automatically commit local log additions' },
        autoPush: { type: 'boolean', default: false, description: 'Automatically push committed log events to remote repository' }
      }
    }
  },
  {
    name: 'topology_ensure_server',
    description: 'Ensure the Topology visualizer server is running on http://localhost:5173. Auto-starts the background server process if currently offline, with process-safe single-instance locking so only one agent starts it.',
    inputSchema: {
      type: 'object',
      properties: {
        port: { type: 'number', default: 5173, description: 'Visualizer port number' },
        forceRestart: { type: 'boolean', default: false, description: 'Force restart of server process' }
      }
    }
  }
];

// Tool Handlers
async function handleToolCall(name, args = {}) {
  if (name === 'topology_create_plan') {
    if (!args || typeof args !== 'object') {
      args = { title: 'Dynamic Workflow', nodes: [], edges: [] };
    }
    const nodesList = Array.isArray(args.nodes) ? args.nodes : [];
    const edgesList = Array.isArray(args.edges) ? args.edges : [];

    const formattedNodes = nodesList.map((n, idx) => ({
      id: n.id || `node-${idx + 1}`,
      label: n.label || `Task ${idx + 1}`,
      type: n.type || 'task',
      description: n.description || '',
      status: n.status || (idx === 0 ? 'in_progress' : 'pending'),
      priority: n.priority || 'medium',
      position: { x: 80 + idx * 280, y: 120 + (idx % 2) * 60 },
      context: {
        role: n.role || 'Worker',
        promptTemplate: n.description || '',
        toolsRequired: [],
        inputArtifacts: [],
        outputArtifacts: [],
        validationCriteria: 'Invariants verified',
        requiresHumanApproval: Boolean(n.requiresApproval),
        approvalStatus: n.requiresApproval ? 'pending' : undefined,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    const formattedEdges = edgesList.map((e, idx) => ({
      id: `edge-${idx + 1}`,
      source: e.source,
      target: e.target,
      label: e.label || 'depends_on',
      condition: e.condition || 'always',
      animated: true,
    }));

    const planPayload = {
      title: args.title || 'Dynamic Plan',
      description: args.description || '',
      nodes: formattedNodes,
      edges: formattedEdges,
      updatedAt: Date.now(),
    };

    // 1. Fallback save to disk
    writeJson(PLAN_FILE, planPayload);
    appendLog({
      action: 'plan_init',
      thought: `Plan "${planPayload.title}" initialized with ${formattedNodes.length} nodes and ${formattedEdges.length} edges`,
      payload: { title: planPayload.title, nodeCount: formattedNodes.length, edgeCount: formattedEdges.length },
    }).catch(() => {});

    // 2. Broadcast via bridge
    const bridgeResult = await sendToBridge('plan', planPayload);
    const bridgeNotice = bridgeResult.ok 
      ? `📡 Live synced with Topology UI on http://localhost:5173`
      : `💾 Saved to .topology/plan.json (Topology UI offline, will load on launch)`;
    const resilientNotice = formatResilientNotice(bridgeResult);

    return {
      content: [
        {
          type: 'text',
          text: `### 🗺️ Topology Plan Initialized: "${planPayload.title}"\n\n` +
                `- **Total Nodes**: ${formattedNodes.length}\n` +
                `- **Total Dependencies**: ${formattedEdges.length}\n` +
                `- **First Action**: \`${formattedNodes[0]?.label || 'Task'}\` (Status: ${formattedNodes[0]?.status || 'ready'})\n` +
                `- **Live View**: [Open Topology Visualizer](http://localhost:5173)\n` +
                `- **Status**: ${bridgeNotice}${resilientNotice}`
        }
      ]
    };
  }

  if (name === 'topology_update_node') {
    if (!args || !args.nodeId) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ **[${TOPOLOGY_ERROR_CODES.INVALID_SCHEMA}] Schema Warning**: \`nodeId\` is required for \`topology_update_node\`. Update skipped. Execution remains unblocked.`
          }
        ]
      };
    }

    const { nodeId, status, thought, toolName, terminalLog, outputArtifacts } = args;

    // 1. Fallback update to disk
    const stored = readJson(PLAN_FILE);
    if (stored && Array.isArray(stored.nodes)) {
      const target = stored.nodes.find(n => n.id === nodeId);
      if (target) {
        if (status) target.status = status;
        target.updatedAt = Date.now();
        target.context = target.context || {};
        target.context.telemetry = target.context.telemetry || {};
        if (thought) target.context.telemetry.liveThought = thought;
        if (toolName) target.context.telemetry.activeTool = toolName;
        if (terminalLog) {
          target.context.telemetry.terminalLogs = [
            ...(target.context.telemetry.terminalLogs || []),
            terminalLog
          ].slice(-50);
        }
        if (outputArtifacts) target.context.outputArtifacts = outputArtifacts;
        writeJson(PLAN_FILE, stored);
      }
    }

    // 2. Broadcast via bridge & append to Git log
    const bridgeResult = await sendToBridge('node', { nodeId, status, thought, toolName, terminalLog, outputArtifacts });
    appendLog({
      action: 'node_update',
      nodeId,
      status,
      thought,
      toolName,
      payload: { outputArtifacts },
    }).catch(() => {});
    const resilientNotice = formatResilientNotice(bridgeResult);

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Node Updated** [\`${nodeId}\`]: Status: \`${status || 'unchanged'}\`${thought ? ` | Thought: "${thought}"` : ''}${resilientNotice}`
        }
      ]
    };
  }

  if (name === 'topology_emit_thought') {
    if (!args || !args.nodeId || !args.thought) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ **[${TOPOLOGY_ERROR_CODES.INVALID_SCHEMA}] Schema Warning**: \`nodeId\` and \`thought\` are required for \`topology_emit_thought\`. Execution remains unblocked.`
          }
        ]
      };
    }

    const { nodeId, thought, toolName } = args;
    const bridgeResult = await sendToBridge('thought', { nodeId, thought, toolName });
    appendLog({ action: 'thought', nodeId, thought, toolName }).catch(() => {});
    const resilientNotice = formatResilientNotice(bridgeResult);

    return {
      content: [
        {
          type: 'text',
          text: `💭 Telemetry thought streamed to node [\`${nodeId}\`]: "${thought}"${resilientNotice}`
        }
      ]
    };
  }

  if (name === 'topology_request_approval') {
    if (!args || !args.nodeId || !args.notes) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ **[${TOPOLOGY_ERROR_CODES.INVALID_SCHEMA}] Schema Warning**: \`nodeId\` and \`notes\` are required for \`topology_request_approval\`. Execution remains unblocked.`
          }
        ]
      };
    }

    const { nodeId, notes, proposedArtifacts } = args;

    // Update node to in_progress / awaiting approval
    const bridgeResult = await sendToBridge('node', {
      nodeId,
      status: 'in_progress',
      thought: `Paused at Human Review Gate: ${notes}`,
      terminalLog: `[HITL REVIEW GATE ACTIVE] Paused for human supervisor sign-off.`,
    });
    appendLog({ action: 'approval_request', nodeId, thought: notes, payload: { proposedArtifacts } }).catch(() => {});

    // Check if already approved
    const approvals = readJson(APPROVALS_FILE, {});
    const record = approvals[nodeId];

    if (record && record.approved) {
      return {
        content: [
          {
            type: 'text',
            text: `🟢 **Approval Already Granted** for node [\`${nodeId}\`]: "${record.notes}"`
          }
        ]
      };
    }

    let offlineGuidance = '';
    if (!bridgeResult.ok) {
      offlineGuidance = `\n\n> ⚠️ **[${TOPOLOGY_ERROR_CODES.GATE_UNATTENDED}] Fail-Open Autonomy Directive**:\n` +
        `> The Topology visualizer bridge is offline or unattended at http://localhost:5173.\n` +
        `> **Topology is non-critical infrastructure**: Do not block execution indefinitely!\n` +
        `> **Agent Action**: Prompt the supervisor directly in your chat/terminal conversation for confirmation, or proceed autonomously if criteria are met.`;
    }

    return {
      content: [
        {
          type: 'text',
          text: `⏸️ **Human Review Gate Triggered** for node [\`${nodeId}\`]\n\n` +
                `- **Supervisor Notes**: ${notes}\n` +
                `- **Artifacts to Inspect**: ${(proposedArtifacts || []).join(', ') || 'Current workspace diff'}\n` +
                `- **Action Required**: Open [Topology](http://localhost:5173) and click the **Approve** button on card \`${nodeId}\`, or reply in chat to confirm sign-off.${offlineGuidance}`
        }
      ]
    };
  }

  if (name === 'topology_get_plan') {
    // Check bridge first, fallback to disk
    const bridgeResp = await getFromBridge('plan');
    const plan = bridgeResp.ok ? bridgeResp.data : readJson(PLAN_FILE, { nodes: [], edges: [] });
    const approvals = readJson(APPROVALS_FILE, {});

    const summary = (plan.nodes || []).map(n => {
      const approval = approvals[n.id];
      const appText = approval ? (approval.approved ? ' [APPROVED]' : ' [REJECTED]') : (n.context?.requiresHumanApproval ? ' [NEEDS APPROVAL]' : '');
      return `- **${n.label}** (\`${n.id}\`): \`${n.status}\`${appText}`;
    }).join('\n');

    const resilientNotice = formatResilientNotice(bridgeResp);

    return {
      content: [
        {
          type: 'text',
          text: `### 📋 Current Topology Plan: "${plan.title || 'Workspace Plan'}"\n\n` +
                (summary || 'No active nodes in plan.') +
                `\n\n[Open Topology Studio](http://localhost:5173)${resilientNotice}`
        }
      ]
    };
  }

  if (name === 'topology_write_shared_context') {
    if (!args || !args.key || args.value === undefined) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ **[${TOPOLOGY_ERROR_CODES.INVALID_SCHEMA}] Schema Warning**: \`key\` and \`value\` are required for \`topology_write_shared_context\`. Execution remains unblocked.`
          }
        ]
      };
    }

    const { scope = 'global', key, value, nodeId, authorAgentRole } = args;

    // 1. Fallback update to disk
    const stored = readJson(CONTEXT_FILE, { global: {}, nodes: {} });
    if (!stored.global) stored.global = {};
    if (!stored.nodes) stored.nodes = {};

    const entry = {
      key,
      value,
      authorAgentId: 'agent-mcp',
      authorAgentRole: authorAgentRole || 'ExternalAgent',
      nodeId: scope === 'node' ? nodeId : undefined,
      scope,
      updatedAt: Date.now(),
    };

    if (scope === 'global') {
      stored.global[key] = entry;
    } else if (nodeId) {
      if (!stored.nodes[nodeId]) stored.nodes[nodeId] = {};
      stored.nodes[nodeId][key] = entry;
    }
    writeJson(CONTEXT_FILE, stored);

    // 2. Broadcast via bridge
    const bridgeResult = await sendToBridge('context', {
      scope,
      key,
      value,
      authorAgentId: 'agent-mcp',
      authorAgentRole: authorAgentRole || 'ExternalAgent',
      nodeId,
    });
    const resilientNotice = formatResilientNotice(bridgeResult);

    return {
      content: [
        {
          type: 'text',
          text: `🧠 **Shared Context Written** [${scope}${nodeId ? `:${nodeId}` : ''}] Key: \`${key}\`${resilientNotice}`
        }
      ]
    };
  }

  if (name === 'topology_read_shared_context') {
    const { scope, key, nodeId } = args;
    const query = new URLSearchParams();
    if (scope) query.append('scope', scope);
    if (key) query.append('key', key);
    if (nodeId) query.append('nodeId', nodeId);

    const bridgeResp = await getFromBridge(`context?${query.toString()}`);
    let result = bridgeResp.ok ? bridgeResp.data : null;

    if (!result) {
      const stored = readJson(CONTEXT_FILE, { global: {}, nodes: {} });
      if (!scope) {
        result = stored;
      } else if (scope === 'global') {
        result = key ? (stored.global?.[key]?.value ?? null) : (stored.global || {});
      } else if (scope === 'node') {
        if (nodeId) {
          const nodeEntries = stored.nodes?.[nodeId] || {};
          result = key ? (nodeEntries[key]?.value ?? null) : nodeEntries;
        } else {
          result = stored.nodes || {};
        }
      }
    }

    const resilientNotice = formatResilientNotice(bridgeResp);

    return {
      content: [
        {
          type: 'text',
          text: `### 🧠 Topology Shared Context\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`${resilientNotice}`
        }
      ]
    };
  }

  if (name === 'topology_log_event') {
    const { action, nodeId, thought, toolName, status, outputArtifacts, acquireLock: shouldLock, lockTtlSeconds = 60, authorAgentRole, payload } = args;
    if (!action) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ **[${TOPOLOGY_ERROR_CODES.INVALID_SCHEMA}] Warning**: \`action\` is required for \`topology_log_event\`. Execution unblocked.`
        }]
      };
    }

    let lockNotice = '';
    if (shouldLock && nodeId) {
      const lockRes = acquireLock(nodeId, authorAgentRole || 'agent-mcp', lockTtlSeconds);
      if (lockRes.ok) {
        lockNotice = ` | 🔒 Locked \`${nodeId}\` for ${lockTtlSeconds}s`;
        sendToBridge('lock', { nodeId, action: 'acquire', agentId: authorAgentRole || 'agent-mcp', ttlSeconds: lockTtlSeconds }).catch(() => {});
      } else {
        lockNotice = ` | ⚠️ Lock contention: ${lockRes.error}`;
      }
    }

    // 1. Append to Git-backed log file
    const logEntry = await appendLog({
      action,
      nodeId,
      thought,
      toolName,
      status,
      agentId: 'agent-mcp',
      agentRole: authorAgentRole || 'Worker',
      payload: { ...payload, outputArtifacts },
    });

    // 2. Broadcast via bridge
    const bridgeResult = await sendToBridge('log', {
      ...logEntry,
      status,
      thought,
      toolName,
      outputArtifacts,
    });
    const resilientNotice = formatResilientNotice(bridgeResult);

    return {
      content: [{
        type: 'text',
        text: `📝 **Logged Event** [\`${logEntry.id}\`]: "${action}"${nodeId ? ` on \`${nodeId}\`` : ''}${thought ? ` | "${thought}"` : ''}${status ? ` (${status})` : ''}${lockNotice}${resilientNotice}`
      }]
    };
  }

  if (name === 'topology_acquire_lock') {
    const { nodeId, agentId = 'agent-mcp', ttlSeconds = 60, reason } = args;
    if (!nodeId) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ **[${TOPOLOGY_ERROR_CODES.INVALID_SCHEMA}] Warning**: \`nodeId\` is required for \`topology_acquire_lock\`.`
        }]
      };
    }

    const lockRes = acquireLock(nodeId, agentId, ttlSeconds, { reason });
    if (lockRes.ok) {
      appendLog({ action: 'acquire_lock', nodeId, agentId, thought: reason, payload: { ttlSeconds } }).catch(() => {});
      sendToBridge('lock', { nodeId, action: 'acquire', agentId, ttlSeconds, reason }).catch(() => {});

      return {
        content: [{
          type: 'text',
          text: `🔒 **Lock Acquired**: Agent \`${agentId}\` holds exclusive lease on node \`${nodeId}\` for ${ttlSeconds} seconds (Expires: ${new Date(lockRes.expiresAt).toLocaleTimeString()}).`
        }]
      };
    } else {
      return {
        content: [{
          type: 'text',
          text: `⚠️ **[${TOPOLOGY_ERROR_CODES.LOCK_CONTENTION}] Lock Contention**: Node \`${nodeId}\` is already locked by \`${lockRes.lockedBy}\` (${lockRes.remainingSeconds}s remaining).`
        }]
      };
    }
  }

  if (name === 'topology_release_lock') {
    const { nodeId, agentId = 'agent-mcp' } = args;
    if (!nodeId) {
      return {
        content: [{
          type: 'text',
          text: `⚠️ **[${TOPOLOGY_ERROR_CODES.INVALID_SCHEMA}] Warning**: \`nodeId\` is required for \`topology_release_lock\`.`
        }]
      };
    }

    const releaseRes = releaseLock(nodeId, agentId);
    appendLog({ action: 'release_lock', nodeId, agentId }).catch(() => {});
    sendToBridge('lock', { nodeId, action: 'release', agentId }).catch(() => {});

    return {
      content: [{
        type: 'text',
        text: releaseRes.ok 
          ? `🔓 **Lock Released**: Node \`${nodeId}\` is now unblocked and available for squad workers.`
          : `⚠️ **Release Warning**: ${releaseRes.error}`
      }]
    };
  }

  if (name === 'topology_sync_git_log') {
    const { remote = 'origin', branch = 'main', autoCommit = true, autoPush = false } = args;
    const syncRes = await syncGitLog({ remote, branch, autoCommit, autoPush });
    const bridgeResp = await sendToBridge('sync-git', syncRes);
    const resilientNotice = formatResilientNotice(bridgeResp);

    return {
      content: [{
        type: 'text',
        text: `🔄 **Git Log Sync**: (Pulled: ${syncRes.pulled} | Committed: ${syncRes.committed} | Pushed: ${syncRes.pushed})${syncRes.currentCommit ? ` | HEAD: \`${syncRes.currentCommit}\`` : ''}\n` +
              (syncRes.errors.length ? `⚠️ Notices: ${syncRes.errors.join('; ')}\n` : '') +
              resilientNotice
      }]
    };
  }

  if (name === 'topology_ensure_server') {
    const { forceRestart = false } = args;
    const serverRes = await ensureBridgeRunning({ forceRestart });
    return {
      content: [{
        type: 'text',
        text: serverRes.running
          ? `✅ **Topology Visualizer Server Online**: Active at ${serverRes.url} ${serverRes.autoStarted ? '(auto-started in background)' : '(already active)'}.\n\nOpen ${serverRes.url} in your browser to inspect the visual canvas.`
          : `⚠️ **[${TOPOLOGY_ERROR_CODES.BRIDGE_OFFLINE}] Notice**: Could not auto-start visualizer server (${serverRes.error || 'timeout'}). State is safely stored on disk in \`.topology/\`. Agent execution remains 100% unblocked.`
      }]
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: `⚠️ **[${TOPOLOGY_ERROR_CODES.INTERNAL_ERROR}] Tool Notice**: Unknown tool name: \`${name}\`. Execution remains unblocked.`
      }
    ]
  };
}

// JSON-RPC Message Processing
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  if (!line.trim()) return;

  let request;
  try {
    request = JSON.parse(line);
  } catch (err) {
    logDebug('JSON parse error on stdin:', err.message);
    return;
  }

  const { id, method, params } = request;

  // 1. Initialize
  if (method === 'initialize') {
    const response = {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'topology-mcp-server',
          version: '1.0.0'
        }
      }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
    return;
  }

  // 2. Initialized notification
  if (method === 'notifications/initialized') {
    logDebug('Client initialized notification received');
    return;
  }

  // 3. Ping
  if (method === 'ping') {
    const response = { jsonrpc: '2.0', id, result: {} };
    process.stdout.write(JSON.stringify(response) + '\n');
    return;
  }

  // 4. List Tools
  if (method === 'tools/list') {
    const response = {
      jsonrpc: '2.0',
      id,
      result: {
        tools: TOOLS
      }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
    return;
  }

  // 5. Call Tool (Fail-Open Non-Blocking Execution)
  if (method === 'tools/call') {
    const { name, arguments: toolArgs } = params || {};
    try {
      const result = await handleToolCall(name, toolArgs || {});
      const response = {
        jsonrpc: '2.0',
        id,
        result
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (err) {
      logDebug(`Tool execution caught error [${name}]:`, err.message);
      // Non-blocking fail-open result: Return valid JSON-RPC result instead of error object so agent harness continues
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: `⚠️ **[${TOPOLOGY_ERROR_CODES.INTERNAL_ERROR}] Non-Critical Notice**: Tool \`${name}\` encountered: ${err.message}.\n\n` +
                    `> **Execution Status**: Unblocked. Topology is an optional visualization companion and not critical infrastructure. Proceed with your primary coding task.`
            }
          ]
        }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    return;
  }

  // Unknown method
  if (id !== undefined) {
    const response = {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  }
});

logDebug('Topology MCP Server started. Listening on stdio.');
