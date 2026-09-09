import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { acquireLock, releaseLock } from './gitLock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const TOPOLOGY_PROJECT_ROOT = path.resolve(__dirname, '..');
export const BRIDGE_PORT = 5173;
export const BRIDGE_HOST = 'localhost';

let isStartingServer = false;

function logDebug(...args) {
  process.stderr.write(`[Topology-ServerSupervisor] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`);
}

/**
 * Check if the Vite dev bridge is currently responding on port 5173.
 */
export function isBridgeAlive(timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: BRIDGE_HOST,
      port: BRIDGE_PORT,
      path: '/api/topology/plan',
      method: 'GET',
      timeout: timeoutMs,
    }, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

/**
 * Ensure the Vite dev server is running.
 * If offline, acquires an advisory lock (to prevent stampeding by concurrent agents)
 * and spawns the server as a background detached process.
 */
export async function ensureBridgeRunning(options = {}) {
  const { maxWaitMs = 10000, forceRestart = false } = options;

  // 1. If already alive and not forcing restart, return immediately
  if (!forceRestart && (await isBridgeAlive(600))) {
    return {
      running: true,
      wasAlreadyRunning: true,
      port: BRIDGE_PORT,
      url: `http://${BRIDGE_HOST}:${BRIDGE_PORT}`,
    };
  }

  // 2. In-process mutex: prevent redundant launches within the same process
  if (isStartingServer) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      await new Promise(r => setTimeout(r, 400));
      if (await isBridgeAlive(400)) {
        return {
          running: true,
          autoStarted: true,
          port: BRIDGE_PORT,
          url: `http://${BRIDGE_HOST}:${BRIDGE_PORT}`,
        };
      }
    }
    return { running: false, error: 'Timed out waiting for concurrent server launch' };
  }

  isStartingServer = true;

  try {
    // 3. Process-safe advisory locking across different agent processes:
    // Only one agent/process becomes the server supervisor and spawns Vite.
    const lockResult = acquireLock('topology_server_supervisor', 'server-supervisor', 45, {
      pid: process.pid,
      reason: 'Auto-starting Vite dev server for visualizer',
    });

    if (!lockResult.ok) {
      logDebug(`Another agent (${lockResult.lockedBy}) is already starting the server. Waiting for ready...`);
      const start = Date.now();
      while (Date.now() - start < maxWaitMs) {
        await new Promise(r => setTimeout(r, 400));
        if (await isBridgeAlive(400)) {
          return {
            running: true,
            autoStartedByPeer: true,
            port: BRIDGE_PORT,
            url: `http://${BRIDGE_HOST}:${BRIDGE_PORT}`,
          };
        }
      }
    }

    logDebug(`Auto-starting Topology visualizer server in background at ${TOPOLOGY_PROJECT_ROOT}...`);

    const logDir = path.join(TOPOLOGY_PROJECT_ROOT, '.topology');
    if (!fs.existsSync(logDir)) {
      try { fs.mkdirSync(logDir, { recursive: true }); } catch { /* ignore */ }
    }
    const logPath = path.join(logDir, 'vite-server.log');
    const outFd = fs.openSync(logPath, 'a');

    // Cross-platform spawning:
    // Prefer direct Node execution of node_modules/vite/bin/vite.js (fastest, no extra shell)
    const viteBin = path.join(TOPOLOGY_PROJECT_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    let child;

    if (fs.existsSync(viteBin)) {
      child = spawn(process.execPath, [viteBin], {
        cwd: TOPOLOGY_PROJECT_ROOT,
        detached: true,
        stdio: ['ignore', outFd, outFd],
        windowsHide: true,
      });
    } else {
      const isWin = process.platform === 'win32';
      const npmCmd = isWin ? 'npm.cmd' : 'npm';
      child = spawn(npmCmd, ['run', 'dev'], {
        cwd: TOPOLOGY_PROJECT_ROOT,
        detached: true,
        stdio: ['ignore', outFd, outFd],
        shell: true,
        windowsHide: true,
      });
    }

    // Save supervisor metadata with PID for tracking/cleanup
    const supervisorMetaFile = path.join(logDir, 'server-supervisor.json');
    try {
      fs.writeFileSync(supervisorMetaFile, JSON.stringify({
        pid: child.pid,
        startedAt: Date.now(),
        port: BRIDGE_PORT,
        cwd: TOPOLOGY_PROJECT_ROOT,
      }, null, 2), 'utf-8');
    } catch {
      // ignore
    }

    child.unref();

    // 4. Poll until the bridge starts responding
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, 350));
      if (await isBridgeAlive(450)) {
        logDebug(`✅ Topology visualizer server is online at http://${BRIDGE_HOST}:${BRIDGE_PORT}`);
        releaseLock('topology_server_supervisor', 'server-supervisor');
        return {
          running: true,
          autoStarted: true,
          pid: child.pid,
          port: BRIDGE_PORT,
          url: `http://${BRIDGE_HOST}:${BRIDGE_PORT}`,
        };
      }
    }

    releaseLock('topology_server_supervisor', 'server-supervisor');
    logDebug(`Server did not respond within ${maxWaitMs}ms; operating in resilient disk mode.`);
    return {
      running: false,
      error: `Server did not respond within ${maxWaitMs}ms`,
      logPath,
    };
  } catch (err) {
    logDebug('Error auto-starting Vite server:', err.message);
    releaseLock('topology_server_supervisor', 'server-supervisor');
    return { running: false, error: err.message };
  } finally {
    isStartingServer = false;
  }
}
