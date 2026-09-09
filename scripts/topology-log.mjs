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

import { acquireLock, releaseLock, appendLog, readRecentLogs, getActiveLocks, syncGitLog } from '../mcp-server/gitLock.js';

function parseArgs(args) {
  const result = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
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
      const agentId = args.agentId || args.agent || 'cli-agent';
      const agentRole = args.role || 'Worker';
      const thought = args.thought || null;
      const toolName = args.tool || null;
      const status = args.status || null;

      const entry = await appendLog({
        action,
        nodeId,
        agentId,
        agentRole,
        thought,
        toolName,
        status,
        timestamp: Date.now(),
      });

      console.log(`✅ [Topology Log] Appended event [${entry.id}]: "${action}" ${nodeId ? `on node "${nodeId}"` : ''}`);
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

    case 'help':
    default: {
      console.log(`
Topology Agent CLI - Git-Backed Event Log & Atomic Resource Locking

Usage:
  node scripts/topology-log.mjs log      --action <action> [--nodeId <id>] [--agent <name>] [--thought <text>] [--status <status>]
  node scripts/topology-log.mjs lock     --nodeId <id> [--agent <name>] [--ttl <seconds>]
  node scripts/topology-log.mjs unlock   --nodeId <id> [--agent <name>]
  node scripts/topology-log.mjs locks    List all currently active leases
  node scripts/topology-log.mjs tail     [--limit <N>] Display recent event lines
  node scripts/topology-log.mjs sync     [--push] [--remote <origin>] [--branch <main>] Pull/push log with Git
      `);
      break;
    }
  }
}

main().catch(err => {
  console.error('Fatal CLI error:', err.message);
  process.exit(1);
});
