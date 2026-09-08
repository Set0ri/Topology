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

const BRIDGE_PORT = 5173;
const BRIDGE_HOST = 'localhost';
const TOPOLOGY_DIR = path.resolve(process.cwd(), '.topology');
const PLAN_FILE = path.join(TOPOLOGY_DIR, 'plan.json');
const APPROVALS_FILE = path.join(TOPOLOGY_DIR, 'approvals.json');

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
  ensureDir(path.dirname(file));
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    logDebug(`Failed to write file ${file}:`, err.message);
  }
}

// Low-overhead HTTP POST to the local Vite bridge
function sendToBridge(endpoint, payload) {
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
      logDebug(`Bridge HTTP request failed: ${err.message}. Using fallback disk persistence.`);
      resolve({ ok: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'Bridge request timed out' });
    });

    req.write(dataString);
    req.end();
  });
}

// Low-overhead HTTP GET
function getFromBridge(endpoint) {
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

    req.on('error', () => {
      resolve({ ok: false });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false });
    });

    req.end();
  });
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
  }
];

// Tool Handlers
async function handleToolCall(name, args) {
  if (name === 'topology_create_plan') {
    const formattedNodes = (args.nodes || []).map((n, idx) => ({
      id: n.id,
      label: n.label,
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

    const formattedEdges = (args.edges || []).map((e, idx) => ({
      id: `edge-${idx + 1}`,
      source: e.source,
      target: e.target,
      label: e.label || 'depends_on',
      condition: e.condition || 'always',
      animated: true,
    }));

    const planPayload = {
      title: args.title,
      description: args.description || '',
      nodes: formattedNodes,
      edges: formattedEdges,
      updatedAt: Date.now(),
    };

    // 1. Fallback save to disk
    writeJson(PLAN_FILE, planPayload);

    // 2. Broadcast via bridge
    const bridgeResult = await sendToBridge('plan', planPayload);
    const bridgeNotice = bridgeResult.ok 
      ? `📡 Live synced with Topology UI on http://localhost:5173`
      : `💾 Saved to .topology/plan.json (Topology UI offline, will load on launch)`;

    return {
      content: [
        {
          type: 'text',
          text: `### 🗺️ Topology Plan Initialized: "${args.title}"\n\n` +
                `- **Total Nodes**: ${formattedNodes.length}\n` +
                `- **Total Dependencies**: ${formattedEdges.length}\n` +
                `- **First Action**: \`${formattedNodes[0]?.label || 'Task'}\` (Status: ${formattedNodes[0]?.status || 'ready'})\n` +
                `- **Live View**: [Open Topology Visualizer](http://localhost:5173)\n` +
                `- **Status**: ${bridgeNotice}`
        }
      ]
    };
  }

  if (name === 'topology_update_node') {
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

    // 2. Broadcast via bridge
    await sendToBridge('node', { nodeId, status, thought, toolName, terminalLog, outputArtifacts });

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Node Updated** [\`${nodeId}\`]: Status: \`${status || 'unchanged'}\`${thought ? ` | Thought: "${thought}"` : ''}`
        }
      ]
    };
  }

  if (name === 'topology_emit_thought') {
    const { nodeId, thought, toolName } = args;
    await sendToBridge('thought', { nodeId, thought, toolName });

    return {
      content: [
        {
          type: 'text',
          text: `💭 Telemetry thought streamed to node [\`${nodeId}\`]: "${thought}"`
        }
      ]
    };
  }

  if (name === 'topology_request_approval') {
    const { nodeId, notes, proposedArtifacts } = args;

    // Update node to in_progress / awaiting approval
    await sendToBridge('node', {
      nodeId,
      status: 'in_progress',
      thought: `Paused at Human Review Gate: ${notes}`,
      terminalLog: `[HITL REVIEW GATE ACTIVE] Paused for human supervisor sign-off.`,
    });

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

    return {
      content: [
        {
          type: 'text',
          text: `⏸️ **Human Review Gate Triggered** for node [\`${nodeId}\`]\n\n` +
                `- **Supervisor Notes**: ${notes}\n` +
                `- **Artifacts to Inspect**: ${(proposedArtifacts || []).join(', ') || 'Current workspace diff'}\n` +
                `- **Action Required**: Open [Topology](http://localhost:5173) and click the **Approve** button on card \`${nodeId}\`, or reply to confirm sign-off.`
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

    return {
      content: [
        {
          type: 'text',
          text: `### 📋 Current Topology Plan: "${plan.title || 'Workspace Plan'}"\n\n` +
                (summary || 'No active nodes in plan.') +
                `\n\n[Open Topology Studio](http://localhost:5173)`
        }
      ]
    };
  }

  throw new Error(`Unknown tool name: ${name}`);
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

  // 5. Call Tool
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
      logDebug(`Tool execution error [${name}]:`, err.message);
      const response = {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: err.message || 'Internal tool execution error'
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
