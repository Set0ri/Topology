import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const TOPOLOGY_DIR = path.resolve(process.cwd(), '.topology');
export const LOG_FILE = path.join(TOPOLOGY_DIR, 'topology.log');

function ensureTopologyDir() {
  if (!fs.existsSync(TOPOLOGY_DIR)) {
    try {
      fs.mkdirSync(TOPOLOGY_DIR, { recursive: true });
    } catch {
      // ignore
    }
  }
}

function getLockFilePath(resourceKey) {
  // Sanitize resource key for file path
  const sanitized = String(resourceKey).replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(TOPOLOGY_DIR, `${sanitized}.lock`);
}

/**
 * Acquire an atomic advisory lease on a resource (node, file, or graph).
 * Uses atomic file creation (O_CREAT | O_EXCL) with auto-expiration (TTL).
 */
export function acquireLock(resourceKey, agentId, ttlSeconds = 60, metadata = {}) {
  ensureTopologyDir();
  const lockFile = getLockFilePath(resourceKey);
  const now = Date.now();
  const expiresAt = now + (Math.max(1, ttlSeconds) * 1000);

  const lockPayload = {
    lockId: `lock_${now}_${Math.random().toString(36).slice(2, 8)}`,
    resourceKey,
    agentId: agentId || 'anonymous_agent',
    pid: process.pid,
    hostname: os.hostname(),
    acquiredAt: now,
    expiresAt,
    ttlSeconds,
    metadata,
  };

  try {
    // Atomic exclusive creation ('wx' mode throws EEXIST if file already exists)
    const fd = fs.openSync(lockFile, 'wx');
    fs.writeSync(fd, JSON.stringify(lockPayload, null, 2), 0, 'utf-8');
    fs.closeSync(fd);
    return { ok: true, ...lockPayload, isNew: true };
  } catch (err) {
    if (err.code === 'EEXIST') {
      // Lock file already exists: inspect for expiration or owner renewal
      try {
        const existingData = fs.readFileSync(lockFile, 'utf-8');
        const existing = JSON.parse(existingData);

        // 1. If stale/expired, safely take over the lock
        if (now > existing.expiresAt) {
          try { fs.unlinkSync(lockFile); } catch { /* ignore */ }
          const fd = fs.openSync(lockFile, 'wx');
          fs.writeSync(fd, JSON.stringify(lockPayload, null, 2), 0, 'utf-8');
          fs.closeSync(fd);
          return { ok: true, ...lockPayload, brokenStaleLock: true, previousOwner: existing.agentId };
        }

        // 2. If same agent already holds the lock, renew lease
        if (existing.agentId === agentId) {
          const renewedPayload = {
            ...existing,
            expiresAt,
            renewedAt: now,
            ttlSeconds,
            metadata: { ...existing.metadata, ...metadata },
          };
          fs.writeFileSync(lockFile, JSON.stringify(renewedPayload, null, 2), 'utf-8');
          return { ok: true, ...renewedPayload, renewed: true };
        }

        // 3. Actively locked by another agent
        const remainingSeconds = Math.max(0, Math.round((existing.expiresAt - now) / 1000));
        return {
          ok: false,
          lockedBy: existing.agentId,
          acquiredAt: existing.acquiredAt,
          expiresAt: existing.expiresAt,
          remainingSeconds,
          lockId: existing.lockId,
          error: `Resource "${resourceKey}" is currently locked by agent "${existing.agentId}" (expires in ${remainingSeconds}s)`,
        };
      } catch {
        // Read/parse error on existing lockfile (corrupted) - remove and take over
        try { fs.unlinkSync(lockFile); } catch { /* ignore */ }
        try {
          const fd = fs.openSync(lockFile, 'wx');
          fs.writeSync(fd, JSON.stringify(lockPayload, null, 2), 0, 'utf-8');
          fs.closeSync(fd);
          return { ok: true, ...lockPayload, recoveredCorruptLock: true };
        } catch {
          return { ok: false, error: `Contention error acquiring lock for "${resourceKey}"` };
        }
      }
    }
    return { ok: false, error: err.message };
  }
}

/**
 * Release an advisory lock on a resource.
 */
export function releaseLock(resourceKey, agentId) {
  ensureTopologyDir();
  const lockFile = getLockFilePath(resourceKey);

  if (!fs.existsSync(lockFile)) {
    return { ok: true, released: false, message: `Lock for "${resourceKey}" was already released.` };
  }

  try {
    const raw = fs.readFileSync(lockFile, 'utf-8');
    const existing = JSON.parse(raw);

    // Only owner or expired lock can be released, unless agentId is 'force' or matches
    const isExpired = Date.now() > existing.expiresAt;
    if (agentId === 'force' || isExpired || !agentId || existing.agentId === agentId) {
      fs.unlinkSync(lockFile);
      return { ok: true, released: true, resourceKey, releasedAgentId: existing.agentId };
    }

    return {
      ok: false,
      error: `Permission denied: Lock is owned by "${existing.agentId}", not "${agentId}".`,
      heldBy: existing.agentId,
    };
  } catch (err) {
    try { fs.unlinkSync(lockFile); } catch { /* ignore */ }
    return { ok: true, released: true, recovered: true };
  }
}

/**
 * High-level helper: executes an asynchronous task while holding a local Git lock.
 * Retries with exponential backoff if currently contended.
 */
export async function withLock(resourceKey, agentId, ttlSeconds, taskFn, maxWaitMs = 5000) {
  const startTime = Date.now();
  let attempt = 0;

  while (Date.now() - startTime < maxWaitMs) {
    const lockResult = acquireLock(resourceKey, agentId, ttlSeconds);
    if (lockResult.ok) {
      try {
        return await taskFn(lockResult);
      } finally {
        releaseLock(resourceKey, agentId);
      }
    }

    attempt += 1;
    const delay = Math.min(500, 30 * Math.pow(1.5, attempt) + Math.random() * 25);
    await new Promise(res => setTimeout(res, delay));
  }

  throw new Error(`[TOPOLOGY_LOCK_TIMEOUT] Timed out waiting for lock on "${resourceKey}" after ${maxWaitMs}ms.`);
}

/**
 * Append an immutable event line to the append-only journal (`.topology/topology.log`).
 * Guarantees process-safe atomic append through the local lock manager.
 */
export async function appendLog(entry) {
  ensureTopologyDir();

  const formattedEntry = {
    id: entry.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: entry.timestamp || Date.now(),
    agentId: entry.agentId || 'agent-external',
    agentRole: entry.agentRole || 'Worker',
    action: entry.action || 'log',
    nodeId: entry.nodeId || null,
    thought: entry.thought || null,
    toolName: entry.toolName || null,
    status: entry.status || null,
    payload: entry.payload || null,
  };

  const line = JSON.stringify(formattedEntry) + '\n';

  await withLock('topology_log_journal', formattedEntry.agentId, 10, async () => {
    fs.appendFileSync(LOG_FILE, line, 'utf-8');
  });

  return formattedEntry;
}

/**
 * Read the most recent N log entries from `.topology/topology.log`.
 */
export function readRecentLogs(limit = 100) {
  ensureTopologyDir();
  if (!fs.existsSync(LOG_FILE)) return [];

  try {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const parsed = [];
    for (let i = lines.length - 1; i >= 0 && parsed.length < limit; i--) {
      try {
        parsed.unshift(JSON.parse(lines[i]));
      } catch {
        // ignore malformed line
      }
    }
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Scan `.topology/` and return all currently active (non-expired) resource locks.
 */
export function getActiveLocks() {
  ensureTopologyDir();
  const locks = [];
  const now = Date.now();

  try {
    const files = fs.readdirSync(TOPOLOGY_DIR);
    for (const file of files) {
      if (file.endsWith('.lock')) {
        const lockPath = path.join(TOPOLOGY_DIR, file);
        try {
          const raw = fs.readFileSync(lockPath, 'utf-8');
          const data = JSON.parse(raw);
          if (now < data.expiresAt) {
            locks.push({
              ...data,
              remainingSeconds: Math.max(0, Math.round((data.expiresAt - now) / 1000)),
            });
          } else {
            // Clean up expired lock file
            try { fs.unlinkSync(lockPath); } catch { /* ignore */ }
          }
        } catch {
          // Corrupt lockfile
          try { fs.unlinkSync(lockPath); } catch { /* ignore */ }
        }
      }
    }
  } catch {
    // ignore
  }

  return locks;
}

/**
 * Synchronize local `.topology/topology.log` with the remote Git repository.
 * Handles:
 * 1. Pulling latest commits with rebase (merging remote agent events cleanly).
 * 2. Optional commit of local events.
 * 3. Optional push to remote branch.
 */
export async function syncGitLog(options = {}) {
  const {
    remote = 'origin',
    branch = 'main',
    autoCommit = true,
    autoPush = false,
    commitMessage = 'chore(topology): sync multi-agent event journal',
  } = options;

  ensureTopologyDir();
  const results = {
    pulled: false,
    committed: false,
    pushed: false,
    errors: [],
  };

  // 1. Fetch & pull remote log events
  try {
    await execAsync(`git pull ${remote} ${branch} --rebase`);
    results.pulled = true;
  } catch (err) {
    results.errors.push(`Git pull failed: ${err.message}`);
  }

  // 2. Commit local log additions
  if (autoCommit && fs.existsSync(LOG_FILE)) {
    try {
      await execAsync(`git add .topology/topology.log`);
      const { stdout } = await execAsync(`git status --porcelain .topology/topology.log`);
      if (stdout.trim()) {
        await execAsync(`git commit -m "${commitMessage}" -- .topology/topology.log`);
        results.committed = true;
      }
    } catch (err) {
      // Nothing to commit or git error
      if (!err.message.includes('nothing to commit')) {
        results.errors.push(`Git commit failed: ${err.message}`);
      }
    }
  }

  // 3. Push to remote
  if (autoPush && results.committed) {
    try {
      await execAsync(`git push ${remote} ${branch}`);
      results.pushed = true;
    } catch (err) {
      results.errors.push(`Git push failed: ${err.message}`);
    }
  }

  // Retrieve current Git commit info & branch
  let currentCommit = null;
  let currentBranch = branch;
  try {
    const { stdout: commitOut } = await execAsync('git rev-parse --short HEAD');
    currentCommit = commitOut.trim();
    const { stdout: branchOut } = await execAsync('git rev-parse --abbrev-ref HEAD');
    if (branchOut.trim()) currentBranch = branchOut.trim();
  } catch {
    // ignore
  }

  return {
    ok: results.errors.length === 0,
    currentCommit,
    branch: currentBranch,
    remote,
    ...results,
    timestamp: Date.now(),
  };
}
