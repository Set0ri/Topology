#!/usr/bin/env node
/**
 * Topology Agent CLI - Git-Backed Event Log & Atomic Resource Locking
 * 
 * Usage:
 *   node scripts/topology-log.mjs log --action start --nodeId spec-1 --agent "Architect" --thought "Analyzing schema"
 *   node scripts/topology-log.mjs lock --nodeId spec-1 --agent "Architect" --ttl 60
 *   node scripts/topology-log.mjs unlock --nodeId spec-1 --agent "Architect"
 *   node scripts/topology-log.mjs locks
 *   node scripts/topology-log.mjs tail --limit 20
 *   node scripts/topology-log.mjs sync [--push]
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { acquireLock, releaseLock, appendLog, readRecentLogs, getActiveLocks, syncGitLog, LOG_FILE, TOPOLOGY_DIR } from '../mcp-server/gitLock.js';
import { ensureBridgeRunning, getServerStatus, stopServer } from '../mcp-server/serverSupervisor.js';
import { budgetTracker, getAllModelConfigs, registerCustomModel, unregisterCustomModel } from '../mcp-server/budgetTracker.js';
import { councilOrchestrator } from '../mcp-server/councilOrchestrator.js';

function postToBridge(endpoint, payload) {
  return new Promise((resolve) => {
    try {
      const dataString = JSON.stringify(payload);
      const req = http.request({
        hostname: 'localhost',
        port: 5173,
        path: `/api/topology/${endpoint}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataString),
        },
        timeout: 1000,
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300 }));
      });
      req.on('error', () => resolve({ ok: false }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false }); });
      req.write(dataString);
      req.end();
    } catch {
      resolve({ ok: false });
    }
  });
}

function parseArgs(args) {
  const result = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const val = arg.slice(eqIdx + 1);
        result[key] = val;
      } else {
        const key = arg.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith('--')) {
          result[key] = next;
          i++;
        } else {
          result[key] = true;
        }
      }
    } else {
      result._.push(arg);
    }
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0] || (args.action ? 'log' : 'help');

async function main() {
  switch (command) {
    case 'log': {
      const action = args.action || args._[1] || 'update';
      const nodeId = args.nodeId || args.node || null;
      const planId = args.planId || args.plan || null;
      const agentId = args.agentId || args.agent || 'cli-agent';
      const agentRole = args.role || 'Worker';
      const thought = args.thought || null;
      const toolName = args.tool || null;
      const status = args.status || null;

      const entry = await appendLog({
        action,
        planId,
        nodeId,
        agentId,
        agentRole,
        thought,
        toolName,
        status,
        timestamp: Date.now(),
      });

      if (nodeId && (status || thought)) {
        try {
          const plansPath = path.join(TOPOLOGY_DIR, 'plans.json');
          if (fs.existsSync(plansPath)) {
            const plans = JSON.parse(fs.readFileSync(plansPath, 'utf8'));
            const targetPlanId = planId || Object.keys(plans).find(pId => plans[pId].nodes?.some(n => n.id === nodeId)) || 'default';
            if (plans[targetPlanId]) {
              const targetNode = plans[targetPlanId].nodes?.find(n => n.id === nodeId);
              if (targetNode) {
                if (status) targetNode.status = status;
                if (thought) targetNode.currentThought = thought;
                targetNode.updatedAt = Date.now();
                plans[targetPlanId].updatedAt = Date.now();
                fs.writeFileSync(plansPath, JSON.stringify(plans, null, 2), 'utf8');
              }
            }
          }
        } catch { /* ignore */ }

        if (status) {
          await postToBridge('node', { planId, nodeId, status, thought, agentId, agentRole });
        } else if (thought) {
          await postToBridge('thought', { planId, nodeId, thought, agentId, agentRole });
        }
      }

      console.log(`✅ [Topology Log] Appended event [${entry.id}]: "${action}" ${nodeId ? `on node "${nodeId}"` : ''}${planId ? ` in plan "${planId}"` : ''}`);
      break;
    }

    case 'lock': {
      const nodeId = args.nodeId || args.node || args._[1];
      if (!nodeId) {
        console.error('❌ Error: --nodeId is required to acquire a lock.');
        process.exit(1);
      }
      const agentId = args.agentId || args.agent || 'cli-agent';
      const ttl = parseInt(args.ttl || args.ttlSeconds || '60', 10);
      const reason = args.reason || 'Agent exclusive execution lock';

      const result = acquireLock(nodeId, agentId, ttl, { reason });
      if (result.ok) {
        console.log(`🔒 [Topology Lock] Acquired lease on "${nodeId}" for agent "${agentId}" (TTL: ${ttl}s, expires at ${new Date(result.expiresAt).toLocaleTimeString()})`);
      } else {
        console.error(`⚠️ [Topology Lock] Contention: ${result.error}`);
        process.exit(1);
      }
      break;
    }

    case 'unlock': {
      const nodeId = args.nodeId || args.node || args._[1];
      if (!nodeId) {
        console.error('❌ Error: --nodeId is required to release a lock.');
        process.exit(1);
      }
      const agentId = args.agentId || args.agent || null;

      const result = releaseLock(nodeId, agentId);
      if (result.ok) {
        console.log(`🔓 [Topology Lock] Released lock on "${nodeId}".`);
      } else {
        console.error(`❌ [Topology Lock] Release failed: ${result.error}`);
        process.exit(1);
      }
      break;
    }

    case 'locks': {
      const locks = getActiveLocks();
      console.log(`\nActive Topology Resource Leases (${locks.length}):`);
      if (locks.length === 0) {
        console.log('  (No active locks. All resources unblocked.)\n');
      } else {
        locks.forEach(l => {
          console.log(`  - 🔒 "${l.resourceKey}": Held by "${l.agentId}" (Remaining: ${l.remainingSeconds}s, PID: ${l.pid})`);
        });
        console.log('');
      }
      break;
    }

    case 'tail': {
      const limit = parseInt(args.limit || '15', 10);
      const logs = readRecentLogs(limit);
      console.log(`\nRecent Topology Activity Log (${logs.length} entries):`);
      logs.forEach(e => {
        const time = new Date(e.timestamp).toLocaleTimeString();
        console.log(`  [${time}] ${e.agentRole ? `[${e.agentRole}] ` : ''}${e.agentId}: ${e.action}${e.nodeId ? ` (${e.nodeId})` : ''}${e.thought ? ` -> "${e.thought}"` : ''}${e.status ? ` [${e.status}]` : ''}`);
      });
      console.log('');
      break;
    }

    case 'sync': {
      const remote = args.remote || 'origin';
      const branch = args.branch || 'main';
      const autoPush = Boolean(args.push);

      console.log(`🔄 Syncing .topology/topology.log with Git repository (${remote}/${branch})...`);
      const result = await syncGitLog({ remote, branch, autoPush });

      if (result.ok) {
        console.log(`✅ Git sync complete. (Pulled: ${result.pulled}, Committed: ${result.committed}, Pushed: ${result.pushed})`);
        if (result.currentCommit) console.log(`   HEAD: ${result.currentCommit}`);
      } else {
        console.warn(`⚠️ Git sync finished with notices:`, result.errors.join('; '));
      }
      break;
    }

    case 'server': {
      console.log('🔍 Checking Topology visualizer dev server on port 5173...');
      const serverRes = await ensureBridgeRunning({ forceRestart: Boolean(args.restart) });
      if (serverRes.running) {
        console.log(`✅ Topology visualizer server is online at ${serverRes.url} ${serverRes.autoStarted ? '(auto-started in background)' : '(already active)'}`);
      } else {
        console.warn(`⚠️ Could not auto-start visualizer server: ${serverRes.error}`);
      }
      break;
    }

    case 'stop-server': {
      console.log('🛑 Terminating background Topology visualizer server...');
      const stopRes = stopServer();
      if (stopRes.stopped) {
        console.log(`✅ Server stopped (PID ${stopRes.pid}).`);
      } else {
        console.log('ℹ️ Server was not running or has already exited.');
      }
      break;
    }

    case 'health': {
      console.log('\n=============================================');
      console.log('       Topology Agent Diagnostics & Health    ');
      console.log('=============================================\n');

      // 1. Server / Bridge Status
      const status = await getServerStatus();
      if (status.running) {
        console.log(`📡 Bridge Server:     ONLINE (http://${status.host}:${status.port})`);
        console.log(`   - HTTP Ping:       ${status.latencyMs}ms`);
        console.log(`   - Supervisor PID:  ${status.pid || 'External / Manual'} ${status.pidAlive ? '(Active)' : ''}`);
        if (status.uptimeSeconds) console.log(`   - Uptime:          ${status.uptimeSeconds}s`);
      } else {
        console.log(`📡 Bridge Server:     OFFLINE (Fail-open mode active)`);
        console.log(`   - Port 5173 is currently closed or busy.`);
      }

      // 2. Storage & Logs Status
      const logExists = fs.existsSync(LOG_FILE);
      const logSize = logExists ? fs.statSync(LOG_FILE).size : 0;
      const recentLogs = readRecentLogs(5);
      console.log(`\n📁 Append-Only Log:   ${logExists ? 'PRESENT' : 'NOT INITIALIZED'}`);
      console.log(`   - Path:            ${LOG_FILE}`);
      console.log(`   - Size:            ${(logSize / 1024).toFixed(2)} KB`);
      console.log(`   - Recent Events:   ${recentLogs.length} sampled`);

      // 3. Advisory Locks Status
      const locks = getActiveLocks();
      console.log(`\n🔒 Advisory Locks:    ${locks.length} active lease(s)`);
      if (locks.length > 0) {
        locks.forEach(l => {
          console.log(`   - "${l.resourceKey}": Held by "${l.agentId}" (TTL remaining: ${l.remainingSeconds}s, PID: ${l.pid})`);
        });
      }

      console.log('\n✅ System health audit complete.\n');
      break;
    }

    case 'clean-locks': {
      let cleaned = 0;
      if (fs.existsSync(TOPOLOGY_DIR)) {
        const files = fs.readdirSync(TOPOLOGY_DIR);
        for (const file of files) {
          if (file.endsWith('.lock')) {
            try {
              fs.unlinkSync(path.join(TOPOLOGY_DIR, file));
              cleaned++;
            } catch {
              // ignore
            }
          }
        }
      }
      console.log(`🧹 Purged ${cleaned} advisory lock file(s).`);
      break;
    }

    case 'clean':
    case 'clean-plans': {
      console.log('🧹 Reconciling and cleaning up Topology plans based on active connections and tasks...');
      try {
        await postToBridge('plans/clean', {});
      } catch {}

      const plansFile = path.join(TOPOLOGY_DIR, 'plans.json');
      let plans = {};
      try {
        if (fs.existsSync(plansFile)) plans = JSON.parse(fs.readFileSync(plansFile, 'utf8'));
      } catch {}

      // Reconcile disk fallback if bridge offline
      let updated = false;
      for (const p of Object.values(plans)) {
        const nodes = p.nodes || [];
        const completed = nodes.filter(n => n.status === 'completed').length;
        if (nodes.length > 0 && completed === nodes.length && p.status !== 'completed') {
          p.status = 'completed';
          p.completedAt = p.completedAt || Date.now();
          updated = true;
        }
      }
      if (updated) {
        fs.writeFileSync(plansFile, JSON.stringify(plans, null, 2), 'utf8');
      }

      console.log(`✅ Reconciled ${Object.keys(plans).length} plan(s):`);
      for (const p of Object.values(plans)) {
        const nodes = p.nodes || [];
        const completed = nodes.filter(n => n.status === 'completed').length;
        console.log(`  - [${(p.status || 'active').toUpperCase()}] "${p.title}" (${completed}/${nodes.length} nodes done)`);
      }
      break;
    }

    case 'plans': {
      // Reconcile via bridge if available
      try {
        await postToBridge('plans/clean', {});
      } catch {}

      const plansFile = path.join(TOPOLOGY_DIR, 'plans.json');
      const activeFile = path.join(TOPOLOGY_DIR, 'active_plan.json');
      let plans = {};
      let activePlanId = 'default';
      try {
        if (fs.existsSync(plansFile)) plans = JSON.parse(fs.readFileSync(plansFile, 'utf8'));
        if (fs.existsSync(activeFile)) activePlanId = JSON.parse(fs.readFileSync(activeFile, 'utf8')).activePlanId;
      } catch {}

      const planList = Object.values(plans);
      console.log(`\nTopology Workflow Plans (${planList.length}):`);
      if (planList.length === 0) {
        console.log('  (No plans currently registered.)\n');
      } else {
        planList.forEach(p => {
          const isActive = p.id === activePlanId ? ' ⭐ [ACTIVE]' : '';
          const nodes = p.nodes || [];
          const completed = nodes.filter(n => n.status === 'completed').length;
          const statusTag = (p.status || (nodes.length > 0 && completed === nodes.length ? 'completed' : 'active')).toUpperCase();
          console.log(`  - [${statusTag}] "${p.title}" [${p.id}]: ${p.agentRole || 'Worker'} (${completed}/${nodes.length} completed)${isActive}`);
        });
        console.log('');
      }
      break;
    }

    case 'switch':
    case 'switch-plan': {
      const targetPlanId = args.planId || args.plan || args._[1];
      if (!targetPlanId) {
        console.error('❌ Error: planId is required. E.g.: node scripts/topology-log.mjs switch backend-refactor');
        process.exit(1);
      }
      const activeFile = path.join(TOPOLOGY_DIR, 'active_plan.json');
      fs.writeFileSync(activeFile, JSON.stringify({ activePlanId: targetPlanId, updatedAt: Date.now() }, null, 2), 'utf8');
      await postToBridge('active-plan', { activePlanId: targetPlanId });
      console.log(`⭐ [Topology] Switched active canvas plan to "${targetPlanId}".`);
      break;
    }

    case 'complete-node': {
      const nodeId = args.nodeId || args.node || args._[1];
      if (!nodeId) {
        console.error('❌ Error: --nodeId is required. E.g.: node scripts/topology-log.mjs complete-node --nodeId task-1 --summary "Verified"');
        process.exit(1);
      }

      const planId = args.planId || args.plan || null;
      const summary = args.summary || args.thought || 'Task completed via CLI';
      const artifacts = args.artifacts ? String(args.artifacts).split(',').map(s => s.trim()) : [];
      const advanceNextNode = args.advanceNextNode !== 'false' && args.advance !== 'false';
      const autoCompletePlan = args.autoCompletePlan !== 'false' && args.autoComplete !== 'false';

      // 1. Post to bridge
      await postToBridge('node', {
        planId,
        nodeId,
        status: 'completed',
        thought: summary ? `Completed: ${summary}` : undefined,
        outputArtifacts: artifacts,
      });

      // 2. Direct disk fallback
      let planCompleted = false;
      let nextNodeAdvanced = null;
      try {
        const plansFile = path.join(TOPOLOGY_DIR, 'plans.json');
        if (fs.existsSync(plansFile)) {
          const plans = JSON.parse(fs.readFileSync(plansFile, 'utf8'));
          let targetPlanKey = planId;
          if (!targetPlanKey) {
            for (const [k, p] of Object.entries(plans)) {
              if (Array.isArray(p.nodes) && p.nodes.some(n => n.id === nodeId)) {
                targetPlanKey = k;
                break;
              }
            }
          }
          if (targetPlanKey && plans[targetPlanKey] && Array.isArray(plans[targetPlanKey].nodes)) {
            const planNodes = plans[targetPlanKey].nodes;
            const targetIdx = planNodes.findIndex(n => n.id === nodeId);
            if (targetIdx !== -1) {
              const now = Date.now();
              planNodes[targetIdx].status = 'completed';
              planNodes[targetIdx].updatedAt = now;
              planNodes[targetIdx].context = planNodes[targetIdx].context || {};
              planNodes[targetIdx].context.telemetry = planNodes[targetIdx].context.telemetry || {};
              planNodes[targetIdx].context.telemetry.activeTool = undefined;
              if (summary) planNodes[targetIdx].context.telemetry.liveThought = `Completed: ${summary}`;
              if (artifacts.length > 0) planNodes[targetIdx].context.outputArtifacts = artifacts;

              // Clean up other in_progress nodes
              planNodes.forEach((n, idx) => {
                if (idx !== targetIdx && n.status === 'in_progress') {
                  n.status = 'completed';
                  n.updatedAt = now;
                }
              });

              // Advance next node
              if (advanceNextNode) {
                const nextNode = planNodes.find((n, idx) => idx > targetIdx && (n.status === 'pending' || n.status === 'ready'));
                if (nextNode) {
                  nextNode.status = 'in_progress';
                  nextNode.updatedAt = now;
                  nextNodeAdvanced = nextNode.id;
                }
              }

              // Auto-complete plan if all nodes done
              if (autoCompletePlan) {
                const allDone = planNodes.length > 0 && planNodes.every(n => n.status === 'completed');
                if (allDone) {
                  plans[targetPlanKey].status = 'completed';
                  plans[targetPlanKey].completedAt = now;
                  plans[targetPlanKey].summary = summary || 'All workflow plan tasks completed successfully.';
                  planCompleted = true;
                }
              }

              plans[targetPlanKey].updatedAt = now;
              fs.writeFileSync(plansFile, JSON.stringify(plans, null, 2), 'utf8');
            }
          }
        }
      } catch (err) {
        console.warn('Direct disk update warning:', err.message);
      }

      await appendLog({
        action: 'node_complete',
        planId,
        nodeId,
        status: 'completed',
        thought: summary,
        payload: { artifacts, planCompleted, nextNodeAdvanced },
      });

      console.log(`✅ [Topology] Node "${nodeId}" marked COMPLETED.`);
      if (summary) console.log(`   Summary: ${summary}`);
      if (artifacts.length > 0) console.log(`   Deliverables: ${artifacts.join(', ')}`);
      if (nextNodeAdvanced) console.log(`   ⏩ Advanced next node "${nextNodeAdvanced}" to IN_PROGRESS.`);
      if (planCompleted) console.log(`   🎉 All nodes finished! Plan automatically marked COMPLETED.`);
      break;
    }

    case 'complete-plan':
    case 'complete': {
      const activeFile = path.join(TOPOLOGY_DIR, 'active_plan.json');
      let defaultPlanId = 'default';
      try {
        if (fs.existsSync(activeFile)) defaultPlanId = JSON.parse(fs.readFileSync(activeFile, 'utf8')).activePlanId || 'default';
      } catch {}

      const targetPlanId = args.planId || args.plan || args._[1] || defaultPlanId;
      const summary = args.summary || args.thought || 'Plan completed via CLI';
      const artifacts = args.artifacts ? String(args.artifacts).split(',').map(s => s.trim()) : [];
      const autoCompleteNodes = args.autoCompleteNodes !== 'false' && args.autoComplete !== 'false';

      // 1. Post to bridge
      await postToBridge('plan/complete', {
        planId: targetPlanId,
        summary,
        artifacts,
        autoCompleteNodes,
      });

      // 2. Direct disk update fallback
      try {
        const plansFile = path.join(TOPOLOGY_DIR, 'plans.json');
        if (fs.existsSync(plansFile)) {
          const plans = JSON.parse(fs.readFileSync(plansFile, 'utf8'));
          if (plans[targetPlanId]) {
            const now = Date.now();
            plans[targetPlanId].status = 'completed';
            plans[targetPlanId].completedAt = now;
            plans[targetPlanId].updatedAt = now;
            plans[targetPlanId].summary = summary;
            plans[targetPlanId].artifacts = artifacts;
            if (autoCompleteNodes && Array.isArray(plans[targetPlanId].nodes)) {
              plans[targetPlanId].nodes.forEach(n => { n.status = 'completed'; n.updatedAt = now; });
            }
            fs.writeFileSync(plansFile, JSON.stringify(plans, null, 2), 'utf8');
          }
        }
      } catch (err) {
        console.warn('Direct disk update warning:', err.message);
      }

      console.log(`🏁 [Topology] Plan "${targetPlanId}" marked COMPLETED.`);
      if (summary) console.log(`   Summary: ${summary}`);
      if (artifacts.length > 0) console.log(`   Deliverables: ${artifacts.join(', ')}`);
      break;
    }

    case 'plan-status':
    case 'status': {
      const activeFile = path.join(TOPOLOGY_DIR, 'active_plan.json');
      let defaultPlanId = 'default';
      try {
        if (fs.existsSync(activeFile)) defaultPlanId = JSON.parse(fs.readFileSync(activeFile, 'utf8')).activePlanId || 'default';
      } catch {}

      const targetPlanId = args.planId || args.plan || defaultPlanId;
      const requestedStatus = args.status || args._[1];
      const reason = args.reason || args.thought || args.summary || null;

      if (!requestedStatus) {
        console.error('❌ Error: --status is required (active | paused | completed | archived | abandoned)');
        process.exit(1);
      }

      await postToBridge('plan/status', {
        planId: targetPlanId,
        status: requestedStatus,
        reason,
        summary: reason,
      });

      try {
        const plansFile = path.join(TOPOLOGY_DIR, 'plans.json');
        if (fs.existsSync(plansFile)) {
          const plans = JSON.parse(fs.readFileSync(plansFile, 'utf8'));
          if (plans[targetPlanId]) {
            const now = Date.now();
            plans[targetPlanId].status = requestedStatus;
            plans[targetPlanId].updatedAt = now;
            if (requestedStatus === 'completed') plans[targetPlanId].completedAt = now;
            if (requestedStatus === 'archived') plans[targetPlanId].archivedAt = now;
            if (requestedStatus === 'abandoned') {
              plans[targetPlanId].abandonedAt = now;
              plans[targetPlanId].abandonReason = reason || 'CLI command';
            }
            if (requestedStatus === 'paused' || requestedStatus === 'inactive') plans[targetPlanId].pausedAt = now;
            fs.writeFileSync(plansFile, JSON.stringify(plans, null, 2), 'utf8');
          }
        }
      } catch (err) {
        console.warn('Direct disk update warning:', err.message);
      }

      console.log(`🔄 [Topology] Plan "${targetPlanId}" transitioned to status "${requestedStatus}".`);
      if (reason) console.log(`   Reason/Note: ${reason}`);
      break;
    }

    case 'council': {
      const goal = args.goal || args._.slice(1).join(' ') || 'Architecture and planning deliberation';
      const rounds = parseInt(args.rounds || '3', 10);
      const strategy = args.strategy || 'halt_before_limit';
      const planId = args.planId || args.plan || null;
      const members = args.models ? String(args.models).split(',').map(s => s.trim()) : (args.members ? String(args.members).split(',').map(s => s.trim()) : undefined);
      const contextFiles = args.context ? String(args.context).split(',').map(s => s.trim()) : (args.contextFiles ? String(args.contextFiles).split(',').map(s => s.trim()) : []);
      const constraints = args.constraints ? String(args.constraints).split(',').map(s => s.trim()) : [];
      const saveAdr = args.saveAdr !== 'false' && args.adr !== 'false';

      console.log(`🏛️ [Council] Convening multi-model council for: "${goal}"`);
      console.log(`   Rounds: ${rounds} | Strategy: ${strategy} | Save ADR: ${saveAdr}`);
      if (members && members.length > 0) console.log(`   Members: ${members.join(', ')}`);
      if (contextFiles.length > 0) console.log(`   Context Files: ${contextFiles.join(', ')}`);
      if (constraints.length > 0) console.log(`   Invariants: ${constraints.join('; ')}`);

      const session = await councilOrchestrator.spawnCouncil({
        goal,
        planId,
        rounds,
        strategy,
        members,
        contextFiles,
        constraints,
        saveAdr,
        handoffToPlan: args.handoff !== 'false',
        handoffAgentRole: args.handoffRole || args.role || 'ExecutionLead',
      });
      if (session.stoppedEarly) {
        console.warn(`🛑 [Council Interrupted] ${session.message} (TTR: ${session.ttrSeconds}s)`);
      } else {
        console.log(`✅ [Council Completed] Plan: ${session.planId}`);
        if (session.estimatedCostUsd !== undefined) {
          console.log(`   Estimated Financial Cost: $${session.estimatedCostUsd.toFixed(4)} USD`);
        }
        if (session.adrPath) {
          console.log(`   ADR Exported: ${session.adrPath}`);
        }
        if (session.consensus) {
          console.log(`\n📋 Consensus Summary:`);
          console.log(`   ${session.consensus.consensusSummary}`);
          console.log(`\n🚀 Synthesized Tasks Ready for Execution:`);
          session.consensus.dag?.forEach((t, i) => {
            console.log(`   ${i + 1}. [${t.role}] ${t.label}: ${t.description}`);
          });
        }
      }
      break;
    }

    case 'models':
    case 'list-models': {
      const all = getAllModelConfigs();
      console.log(`\n🏛️ Registered Topology Council Models (${Object.keys(all).length}):\n`);
      for (const [id, m] of Object.entries(all)) {
        console.log(`  ${m.avatar || '🤖'} ${m.name} [${id}]`);
        console.log(`     Family:   ${m.family}`);
        console.log(`     Provider: ${m.provider || 'default'}${m.endpoint ? ` (${m.endpoint})` : ''}`);
        console.log(`     Role:     ${m.role}`);
        console.log(`     Limits:   RPM: ${m.limits?.rpm} | TPM: ${m.limits?.tpm} | Daily: ${m.limits?.dailyTokens}`);
        console.log(`     Rates:    $${m.ratesPerMillion?.inputUsd}/M in | $${m.ratesPerMillion?.outputUsd}/M out\n`);
      }
      break;
    }

    case 'add-model':
    case 'register-model': {
      const id = args.id || args._[1];
      if (!id) {
        console.error('❌ Error: --id is required. E.g.: node scripts/topology-log.mjs add-model --id deepseek-v3 --name "DeepSeek V3" --provider openai_compatible --endpoint "https://api.deepseek.com/v1" --apiKeyEnv DEEPSEEK_API_KEY');
        process.exit(1);
      }
      const model = registerCustomModel({
        id,
        name: args.name || id,
        family: args.family || 'Custom LLM',
        avatar: args.avatar || '🤖',
        color: args.color || '#6366f1',
        role: args.role || 'Council Specialist',
        provider: args.provider || 'openai_compatible',
        endpoint: args.endpoint || args.baseUrl || '',
        apiKeyEnv: args.apiKeyEnv || null,
        apiKey: args.apiKey || null,
        modelName: args.modelName || args.model || id,
        limits: {
          rpm: args.rpm ? parseInt(args.rpm, 10) : 60,
          tpm: args.tpm ? parseInt(args.tpm, 10) : 300000,
          dailyTokens: args.dailyTokens ? parseInt(args.dailyTokens, 10) : 5000000,
        },
        ratesPerMillion: {
          inputUsd: args.rateIn ? parseFloat(args.rateIn) : 0.20,
          outputUsd: args.rateOut ? parseFloat(args.rateOut) : 0.80,
        },
      });
      console.log(`✅ [Topology] Registered custom council model "${model.name}" [${model.id}].`);
      console.log(`   Provider: ${model.provider} | Endpoint: ${model.endpoint || 'default'}`);
      console.log(`   Config saved to .topology/models.json.`);
      break;
    }

    case 'remove-model':
    case 'unregister-model': {
      const id = args.id || args._[1];
      if (!id) {
        console.error('❌ Error: --id is required. E.g.: node scripts/topology-log.mjs remove-model --id custom-model');
        process.exit(1);
      }
      try {
        const removed = unregisterCustomModel(id);
        if (removed) {
          console.log(`✅ [Topology] Unregistered custom council model "${id}".`);
        } else {
          console.warn(`⚠️ [Topology] Model "${id}" was not found in registered custom models.`);
        }
      } catch (err) {
        console.error(`❌ [Topology] Error: ${err.message}`);
        process.exit(1);
      }
      break;
    }

    case 'sessions': {
      const limit = parseInt(args.limit || '10', 10);
      const sessions = councilOrchestrator.listCouncilSessions(limit);
      console.log(`\n🏛️ Historical Council Deliberation Sessions (${sessions.length} recorded):`);
      if (sessions.length === 0) {
        console.log(`   No sessions found in .topology/councils/`);
      } else {
        for (const s of sessions) {
          const dateStr = new Date(s.timestamp).toLocaleString();
          const costStr = s.totalCostUsd ? `$${s.totalCostUsd.toFixed(4)}` : '$0.0000';
          console.log(`\n   • [${s.id}] "${s.goal}"`);
          console.log(`     Deliberated: ${dateStr} | Rounds: ${s.roundsDeliberated} | Cost: ${costStr}`);
          console.log(`     Tokens: ${s.totalTokensUsed.toLocaleString()} | Tasks: ${s.consensusSummary ? 'Consensus reached' : 'Incomplete'}`);
          if (s.adrPath) console.log(`     ADR: ${s.adrPath}`);
        }
      }
      console.log('');
      break;
    }

    case 'adr': {
      const sessionId = args.session || args.sessionId || args._[1];
      const session = sessionId ? councilOrchestrator.getCouncilSession(sessionId) : councilOrchestrator.getLastSession();
      if (!session) {
        console.error(`❌ Error: No council deliberation session found${sessionId ? ` for "${sessionId}"` : ''}.`);
        process.exit(1);
      }
      const title = args.title || undefined;
      const saveToDisk = args.save !== 'false';
      const adr = councilOrchestrator.generateAdrMarkdown(session, { title, saveToDisk });
      console.log(`\n📑 Architectural Decision Record (ADR):`);
      if (adr.filePath) console.log(`   Saved to: ${adr.filePath}\n`);
      console.log(adr.markdown);
      break;
    }

    case 'budget': {
      const status = budgetTracker.getBudgetStatus();
      console.log(`\n📊 Gemini Ultra Multi-Model Council Quotas & Real-Time Headroom:`);
      console.log(`   Global Status: ${status.systemStatus.toUpperCase()} (15% safety reserve armed)`);
      console.log(`   Total Session Cost: $${status.totalSessionCostUsd?.toFixed(4) || '0.0000'} | Daily Cost: $${status.totalDailyCostUsd?.toFixed(4) || '0.0000'}`);
      for (const m of Object.values(status.models)) {
        console.log(`\n   ${m.avatar} ${m.name} (${m.family}):`);
        console.log(`      Role: ${m.role}`);
        console.log(`      RPM:  ${m.rpm.current}/${m.rpm.limit} (${m.rpm.percent}%) [Safe ceiling: ${m.rpm.safeLimit}]`);
        console.log(`      TPM:  ${m.tpm.current}/${m.tpm.limit} (${m.tpm.percent}%) [Safe ceiling: ${m.tpm.safeLimit}]`);
        console.log(`      Cost: $${m.cost?.sessionCostUsd?.toFixed(4) || '0.0000'} (Daily: $${m.cost?.dailyCostUsd?.toFixed(4) || '0.0000'}, All-Time: $${m.cost?.allTimeCostUsd?.toFixed(4) || '0.0000'})`);
        console.log(`      Daily: ${m.daily.current}/${m.daily.limit} (${m.daily.percent}%)`);
        console.log(`      TTR (60s window): ${m.ttr.formattedWindow}`);
        console.log(`      TTR (daily 00:00 UTC): ${m.ttr.formattedDaily}`);
        console.log(`      Status: ${m.status.toUpperCase()}`);
      }
      break;
    }

    case 'optimize-budget': {
      const rawBudget = args.budget || args.maxCost || args['target-budget'] || args.targetBudgetUsd || args.b;
      const targetBudgetUsd = rawBudget != null ? parseFloat(rawBudget) : undefined;
      const rounds = parseInt(args.rounds || args.r || 3, 10) || 3;
      const strategy = args.strategy || args.s || 'balanced';
      const rawSpecialists = args.specialists || args.models || args.requiredSpecialists;
      const requiredSpecialists = rawSpecialists ? String(rawSpecialists).split(',').map(s => s.trim()).filter(Boolean) : [];

      const result = budgetTracker.optimizeCouncilAllocation({
        targetBudgetUsd,
        rounds,
        strategy,
        requiredSpecialists,
      });

      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      console.log(`\n⚡ Topology Multi-Model Council Quota & Budget Optimizer:`);
      console.log(`   Strategy: ${result.options.strategy} | Rounds: ${result.options.rounds}${result.options.targetBudgetUsd != null ? ` | Target Budget: $${Number(result.options.targetBudgetUsd).toFixed(4)}` : ''}`);
      console.log(`   Safety Stop Reserve: 15% (Strict < 85% ceiling enforced)\n`);

      console.log(`🏆 Recommended Roster: [Rank #1] ${result.recommendedRoster.rosterName}`);
      console.log(`   Models:            ${result.recommendedRoster.models.join(', ')}`);
      console.log(`   Projected Cost:    $${result.recommendedRoster.projectedCostUsd.toFixed(4)} USD`);
      console.log(`   Max RPM / TPM:     ${result.recommendedRoster.maxRpmUtilizationPct}% RPM / ${result.recommendedRoster.maxTpmUtilizationPct}% TPM`);
      console.log(`   Safe Ceiling:      ${result.recommendedRoster.safeCeilingSatisfied ? '✅ Satisfied (< 85%)' : '⚠️ Ceilings Exceeded'}`);
      console.log(`   Suitability Score: ${result.recommendedRoster.suitabilityScore} / 100\n`);

      if (result.recommendedRoster.surrogateSubstitutions?.length > 0) {
        console.log(`🔄 Surrogate Recommendations:`);
        for (const s of result.recommendedRoster.surrogateSubstitutions) {
          console.log(`   • ${s.original} ➔ ${s.surrogate}: ${s.rationale}`);
        }
        console.log('');
      }

      console.log(`Candidate Rosters:`);
      console.log(`┌──────┬────────────────────────────────┬──────────────────────────────────────┬─────────────┬───────────┬───────────┬─────────────┬────────┐`);
      console.log(`│ Rank │ Roster Name                    │ Members                              │ Est Cost ($)│ Max RPM % │ Max TPM % │ Safe (<85%) │ Score  │`);
      console.log(`├──────┼────────────────────────────────┼──────────────────────────────────────┼─────────────┼───────────┼───────────┼─────────────┼────────┤`);
      for (const r of result.candidateRosters) {
        const rankStr = String(r.rank).padEnd(4);
        const nameStr = r.rosterName.slice(0, 30).padEnd(30);
        const membersStr = r.models.join(', ').slice(0, 36).padEnd(36);
        const costStr = `$${r.projectedCostUsd.toFixed(4)}`.padEnd(11);
        const rpmStr = `${r.maxRpmUtilizationPct}%`.padEnd(9);
        const tpmStr = `${r.maxTpmUtilizationPct}%`.padEnd(9);
        const safeStr = (r.safeCeilingSatisfied ? 'YES' : 'NO').padEnd(11);
        const scoreStr = String(r.suitabilityScore).padEnd(6);
        console.log(`│ ${rankStr} │ ${nameStr} │ ${membersStr} │ ${costStr} │ ${rpmStr} │ ${tpmStr} │ ${safeStr} │ ${scoreStr} │`);
      }
      console.log(`└──────┴────────────────────────────────┴──────────────────────────────────────┴─────────────┴───────────┴───────────┴─────────────┴────────┘`);

      const commandModels = result.recommendedRoster.models.join(',');
      console.log(`\n💡 To convene council with recommended roster:`);
      console.log(`   node scripts/topology-log.mjs council --models="${commandModels}" --rounds=${result.options.rounds} --goal="<your architectural goal>"\n`);
      break;
    }

    case 'ooda':
    case 'loop': {
      const planId = args.plan || args.planId || args._[1];
      if (!planId) {
        console.error('❌ Error: --plan is required. E.g.: node scripts/topology-log.mjs loop --plan distributed-engine --loop 1 --max-loops 3 --stage observe --thought "Scanning codebase"');
        process.exit(1);
      }

      // Strict parameter for number of loops (clamped 1-10)
      const rawMaxLoops = args.maxLoops || args['max-loops'] || args.maxloops || args.totalLoops || args.total || '3';
      const maxLoops = Math.max(1, Math.min(parseInt(rawMaxLoops, 10), 10));
      let loopNumber = parseInt(args.loop || args.loopNumber || '1', 10);
      let status = args.status || 'in_progress';
      const stage = args.stage || args._[2] || 'observe';

      // Strict capping: if loop exceeds maxLoops, clamp and declare converged
      if (loopNumber > maxLoops) {
        console.warn(`⚠️ [OODA Loop] Requested Loop ${loopNumber} exceeds strict maxLoops parameter (${maxLoops}). Loop capped and declared CONVERGED.`);
        loopNumber = maxLoops;
        status = 'converged';
      } else if (stage === 'update' && loopNumber >= maxLoops) {
        status = 'converged';
      }

      const thought = args.thought || null;
      const observations = args.observations ? String(args.observations).split(';').map(s => s.trim()) : [];
      const understandings = args.understandings ? String(args.understandings).split(';').map(s => s.trim()) : [];
      const refinements = args.refinements ? String(args.refinements).split(';').map(s => s.trim()) : [];
      const updatesApplied = args.updatesApplied ? String(args.updatesApplied).split(';').map(s => s.trim()) : [];
      const voteSummary = args.voteSummary || null;
      const proposedPlanSummary = args.proposedPlanSummary || null;
      const score = args.score ? parseFloat(args.score) : undefined;
      let memberPlans = [];
      if (args.memberPlans) {
        try {
          memberPlans = typeof args.memberPlans === 'string' ? JSON.parse(args.memberPlans) : args.memberPlans;
        } catch {}
      }

      const OODA_STAGE_NAMES = {
        observe: 'Observe 👁️',
        understand: 'Understand 💡',
        evaluate_with_council: 'Evaluate with Council 🏛️',
        adversarial_council_evaluation: 'Adversarial Council Evaluation ⚔️',
        each_member_plans: 'Each Member Plans 📝',
        share_and_vote_on_plan: 'Share & Vote on Plan 🗳️',
        iterate_on_plan: 'Iterate on Plan 🔄',
        propose_plan: 'Propose Plan 📋',
        update: 'Update & Execute ⚡',
      };

      const stageLabel = OODA_STAGE_NAMES[stage] || stage;

      const iterationRecord = {
        loopNumber,
        stage,
        stageName: stageLabel,
        thought,
        observations,
        understandings,
        memberPlans,
        voteSummary,
        refinements,
        proposedPlanSummary,
        updatesApplied,
        metrics: score ? { consensusScorePercent: score } : {},
        status,
        timestamp: Date.now(),
      };

      // 1. Direct file fallback
      let allLoops = {};
      try {
        const LOOPS_FILE = path.join(TOPOLOGY_DIR, 'ooda_loops.json');
        if (fs.existsSync(LOOPS_FILE)) {
          allLoops = JSON.parse(fs.readFileSync(LOOPS_FILE, 'utf8'));
        }
        if (!allLoops[planId]) {
          allLoops[planId] = {
            planId,
            totalLoopsCompleted: 0,
            currentLoop: loopNumber,
            targetMaxLoops: maxLoops,
            activeStage: stage,
            isConverged: status === 'converged',
            history: [],
            updatedAt: Date.now(),
          };
        }
        if (!Array.isArray(allLoops[planId].history)) {
          allLoops[planId].history = allLoops[planId].iteration ? [allLoops[planId].iteration] : [];
        }
        allLoops[planId].currentLoop = loopNumber;
        allLoops[planId].targetMaxLoops = maxLoops;
        allLoops[planId].activeStage = stage;
        allLoops[planId].isConverged = status === 'converged' || allLoops[planId].isConverged;
        allLoops[planId].updatedAt = Date.now();
        allLoops[planId].history.push(iterationRecord);
        if (stage === 'update' && (status === 'completed' || status === 'converged')) {
          allLoops[planId].totalLoopsCompleted = Math.max(allLoops[planId].totalLoopsCompleted, loopNumber);
        }
        fs.writeFileSync(LOOPS_FILE, JSON.stringify(allLoops, null, 2), 'utf8');

        // Update plan in plans.json
        const plansFile = path.join(TOPOLOGY_DIR, 'plans.json');
        if (fs.existsSync(plansFile)) {
          const plans = JSON.parse(fs.readFileSync(plansFile, 'utf8'));
          if (plans[planId]) {
            plans[planId].oodaLoop = allLoops[planId];
            if (thought) plans[planId].latestThought = thought;
            plans[planId].updatedAt = Date.now();
            fs.writeFileSync(plansFile, JSON.stringify(plans, null, 2), 'utf8');
          }
        }
      } catch (err) {
        console.warn('Direct file save notice:', err.message);
      }

      // 2. Post to bridge
      await postToBridge('loop-telemetry', {
        planId,
        telemetry: allLoops[planId],
        iteration: iterationRecord,
      });

      await appendLog({
        action: 'loop_telemetry',
        planId,
        status,
        thought: thought || `[OODA Loop ${loopNumber} - ${stageLabel}] ${status}`,
        payload: { loopNumber, maxLoops, stage },
      });

      console.log(`\n🔄 [OODA Loop] Telemetry emitted for "${planId}":`);
      console.log(`   Loop Iteration: Loop ${loopNumber} of ${maxLoops} (Strict Cap)`);
      console.log(`   Active Stage:   ${stageLabel}`);
      console.log(`   Status:         ${status.toUpperCase()}`);
      if (thought) console.log(`   Thought:        ${thought}`);
      break;
    }

    case 'loops': {
      const planId = args.plan || args.planId || args._[1];
      const LOOPS_FILE = path.join(TOPOLOGY_DIR, 'ooda_loops.json');
      if (!fs.existsSync(LOOPS_FILE)) {
        console.log('\nℹ️ No OODA loop records found in .topology/ooda_loops.json\n');
        break;
      }
      const allLoops = JSON.parse(fs.readFileSync(LOOPS_FILE, 'utf8'));
      if (planId && allLoops[planId]) {
        const d = allLoops[planId];
        const history = Array.isArray(d.history) ? d.history : (d.iteration ? [d.iteration] : []);
        const curLoop = d.currentLoop || d.iteration?.loopNumber || 1;
        const totalLoopsTarget = d.targetMaxLoops;
        const actStage = d.activeStage || d.iteration?.stage || 'observe';
        const completedLoops = d.totalLoopsCompleted || 0;
        const isConverged = d.isConverged || d.iteration?.status === 'converged';

        console.log(`\n🔄 OODA Loop Telemetry: "${planId}"`);
        console.log(`   Current Loop: Loop ${curLoop}${totalLoopsTarget ? ` of ${totalLoopsTarget} (Strict Cap)` : ''}`);
        console.log(`   Completed Loops: ${completedLoops}`);
        console.log(`   Active Stage: ${actStage}`);
        console.log(`   Convergence: ${isConverged ? 'CONVERGED ✅' : 'ITERATING 🔄'}`);
        console.log(`\n   History (${history.length} stages):`);
        history.forEach((h, i) => {
          console.log(`     ${i + 1}. [Loop ${h.loopNumber}] ${h.stageName || h.stage} (${h.status}): ${h.thought || ''}`);
        });
        console.log('');
      } else {
        console.log(`\n🔄 Active OODA Loop Plans (${Object.keys(allLoops).length}):`);
        for (const [pid, d] of Object.entries(allLoops)) {
          const curLoop = d.currentLoop || d.iteration?.loopNumber || 1;
          const totalLoopsTarget = d.targetMaxLoops ? `/${d.targetMaxLoops}` : '';
          const actStage = d.activeStage || d.iteration?.stage || 'observe';
          const completedLoops = d.totalLoopsCompleted || 0;
          const isConverged = d.isConverged || d.iteration?.status === 'converged';
          console.log(`   • [${pid}] Loop ${curLoop}${totalLoopsTarget} • ${actStage} (${completedLoops} completed loops)${isConverged ? ' [CONVERGED]' : ''}`);
        }
        console.log('');
      }
      break;
    }

    case 'help':
    default: {
      console.log(`
Topology Agent CLI - Git-Backed Event Log & Atomic Resource Locking

Usage:
  node scripts/topology-log.mjs health          Audit server health, log sizes, locks, and connectivity
  node scripts/topology-log.mjs server          Ensure visualizer dev server is running on http://localhost:5173
  node scripts/topology-log.mjs stop-server     Gracefully stop visualizer server process
  node scripts/topology-log.mjs plans           List all active agent plans registered on the server
  node scripts/topology-log.mjs switch          <planId> Switch active visual canvas plan
  node scripts/topology-log.mjs complete-node   --nodeId <id> [--summary <text>] [--artifacts <files>] Mark node completed & advance
  node scripts/topology-log.mjs complete-plan   [--plan <planId>] [--summary <text>] Mark entire plan completed
  node scripts/topology-log.mjs status          --status <active|paused|completed|archived|abandoned> [--reason <text>]
  node scripts/topology-log.mjs council         --goal <prompt> [--models <id1,id2>] [--rounds 3] [--context <files>] [--constraints <list>] Run council
  node scripts/topology-log.mjs models          List all registered council models and quota limits
  node scripts/topology-log.mjs add-model       --id <id> --name <name> --provider <provider> [--endpoint <url>] Register custom model
  node scripts/topology-log.mjs remove-model    --id <id> Unregister custom model from registry
  node scripts/topology-log.mjs sessions        List recorded council deliberation sessions
  node scripts/topology-log.mjs adr             [--session <id>] [--save] Export consensus ADR Markdown
  node scripts/topology-log.mjs budget          Display live model quotas, usage, costs, and TTR countdowns
  node scripts/topology-log.mjs optimize-budget [--budget <usd>] [--rounds <n>] [--strategy <str>] Optimize council roster
  node scripts/topology-log.mjs loop            --plan <id> --loop <N> --max-loops <M> --stage <stage> [--thought <text>] Emit OODA telemetry
  node scripts/topology-log.mjs loops           [--plan <id>] Inspect OODA loop iterations and history
  node scripts/topology-log.mjs log             --action <action> [--plan <planId>] [--nodeId <id>] [--agent <name>] [--thought <text>] [--status <status>]
  node scripts/topology-log.mjs lock            --nodeId <id> [--agent <name>] [--ttl <seconds>]
  node scripts/topology-log.mjs unlock          --nodeId <id> [--agent <name>]
  node scripts/topology-log.mjs locks           List all currently active leases
  node scripts/topology-log.mjs clean-locks     Purge all lock files
  node scripts/topology-log.mjs tail            [--limit <N>] Display recent event lines
  node scripts/topology-log.mjs sync            [--push] [--remote <origin>] [--branch <main>] Pull/push log with Git
      `);
      break;
    }
  }
}

main().catch(err => {
  console.error('Fatal CLI error:', err.message);
  process.exit(1);
});
