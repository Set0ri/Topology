/**
 * Topology Council Debate Stream Bus
 * 
 * Provides a non-blocking, fail-open streaming event bus for real-time inter-model debate chunks.
 * Dispatches chunks to:
 *  1. Local in-process subscribers (e.g. CLI tailers, test suites)
 *  2. Local Vite visualizer bridge (/api/topology/council/chunk) which broadcasts to SSE clients
 * 
 * Fail-open resilience: absorbs bridge offline or timeout errors without crashing deliberation.
 */

import http from 'node:http';

class DebateStreamBus {
  constructor() {
    this.listeners = new Set();
    this.sessionChunks = new Map(); // sessionId -> CouncilDebateChunk[]
    this.bridgeHost = process.env.TOPOLOGY_BRIDGE_HOST || '127.0.0.1';
    this.bridgePort = parseInt(process.env.TOPOLOGY_BRIDGE_PORT || '5173', 10);
    this.bridgePath = '/api/topology/council/chunk';
  }

  /**
   * Updates bridge destination configuration (useful for ephemeral test servers)
   */
  setBridgeConfig({ host, port, path } = {}) {
    if (host) this.bridgeHost = host;
    if (port) this.bridgePort = parseInt(port, 10);
    if (path) this.bridgePath = path;
  }

  /**
   * Sets bridge destination from a full URL string (e.g. http://127.0.0.1:49210)
   */
  setBridgeUrl(urlStr) {
    try {
      const parsed = new URL(urlStr);
      this.bridgeHost = parsed.hostname;
      this.bridgePort = parseInt(parsed.port || '80', 10);
      if (parsed.pathname && parsed.pathname !== '/') {
        this.bridgePath = parsed.pathname.endsWith('/council/chunk')
          ? parsed.pathname
          : `${parsed.pathname.replace(/\/$/, '')}/council/chunk`;
      }
    } catch {
      // ignore parse errors and keep current config
    }
  }

  /**
   * Subscribes a callback to all emitted debate chunks in-process.
   * Returns an unsubscribe function.
   */
  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
    }
    return () => this.unsubscribe(listener);
  }

  /**
   * Removes a subscription callback.
   */
  unsubscribe(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Returns a copy of all chunks accumulated for a given session.
   */
  getSessionChunks(sessionId) {
    return Array.from(this.sessionChunks.get(sessionId) || []);
  }

  /**
   * Clears accumulated chunks for a specific session or all sessions.
   */
  clearSessionChunks(sessionId) {
    if (sessionId) {
      this.sessionChunks.delete(sessionId);
    } else {
      this.sessionChunks.clear();
    }
  }

  /**
   * Emits an incremental debate chunk.
   * Dispatches to in-process subscribers immediately and dispatches an HTTP POST
   * to the visualizer bridge in a fail-open, non-blocking manner.
   */
  async emitDebateChunk(chunk) {
    if (!chunk || typeof chunk !== 'object') {
      return { ok: false, error: 'Invalid chunk payload' };
    }

    const normalizedChunk = {
      sessionId: String(chunk.sessionId || 'session-default'),
      planId: String(chunk.planId || ''),
      round: Number.isInteger(chunk.round) && chunk.round >= 1 ? chunk.round : 1,
      phase: ['ideate', 'critique', 'synthesize'].includes(chunk.phase) ? chunk.phase : 'ideate',
      modelId: String(chunk.modelId || 'unknown'),
      deltaText: String(chunk.deltaText ?? ''),
      tokensUsedDelta: typeof chunk.tokensUsedDelta === 'number' && chunk.tokensUsedDelta >= 0 ? chunk.tokensUsedDelta : 0,
      costUsdDelta: typeof chunk.costUsdDelta === 'number' && chunk.costUsdDelta >= 0 ? chunk.costUsdDelta : 0,
      timestamp: typeof chunk.timestamp === 'number' && chunk.timestamp > 0 ? chunk.timestamp : Date.now(),
      isComplete: Boolean(chunk.isComplete),
      ...(chunk.modelName ? { modelName: String(chunk.modelName) } : {}),
      ...(chunk.avatar ? { avatar: String(chunk.avatar) } : {}),
      ...(chunk.color ? { color: String(chunk.color) } : {}),
      ...(typeof chunk.chunkIndex === 'number' ? { chunkIndex: chunk.chunkIndex } : {}),
      ...(chunk.chunkType ? { chunkType: chunk.chunkType } : {}),
      ...(typeof chunk.totalTokensUsed === 'number' ? { totalTokensUsed: chunk.totalTokensUsed } : {}),
      ...(typeof chunk.totalCostUsd === 'number' ? { totalCostUsd: chunk.totalCostUsd } : {}),
    };

    // 1. Record in in-memory session buffer
    if (!this.sessionChunks.has(normalizedChunk.sessionId)) {
      this.sessionChunks.set(normalizedChunk.sessionId, []);
    }
    this.sessionChunks.get(normalizedChunk.sessionId).push(normalizedChunk);

    // 2. Notify local in-memory listeners
    for (const listener of this.listeners) {
      try {
        listener(normalizedChunk);
      } catch {
        // Isolate subscriber errors from affecting delivery
      }
    }

    // 3. Dispatch to local bridge via HTTP POST (non-blocking, fail-open)
    return new Promise((resolve) => {
      let host = this.bridgeHost;
      let port = this.bridgePort;

      // Allow dynamic override via process.env.TOPOLOGY_BRIDGE_URL or environment variables
      if (process.env.TOPOLOGY_BRIDGE_URL) {
        try {
          const parsed = new URL(process.env.TOPOLOGY_BRIDGE_URL);
          host = parsed.hostname;
          port = parseInt(parsed.port || '80', 10);
        } catch {}
      } else {
        if (process.env.TOPOLOGY_BRIDGE_HOST) host = process.env.TOPOLOGY_BRIDGE_HOST;
        if (process.env.TOPOLOGY_BRIDGE_PORT) port = parseInt(process.env.TOPOLOGY_BRIDGE_PORT, 10);
      }

      const data = JSON.stringify(normalizedChunk);

      const req = http.request(
        {
          hostname: host,
          port,
          path: this.bridgePath,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          },
          timeout: 1200,
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              statusCode: res.statusCode,
            });
          });
        }
      );

      req.on('error', (err) => {
        // Fail-open: absorb connection refused or network errors
        resolve({
          ok: false,
          code: 'TOPOLOGY_ERR_BRIDGE_OFFLINE',
          error: err.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          ok: false,
          code: 'TOPOLOGY_ERR_BRIDGE_TIMEOUT',
          error: 'Bridge connection timed out',
        });
      });

      req.write(data);
      req.end();
    });
  }
}

export const debateStreamBus = new DebateStreamBus();

export const emitDebateChunk = (chunk) => debateStreamBus.emitDebateChunk(chunk);
export const subscribe = (listener) => debateStreamBus.subscribe(listener);
export const unsubscribe = (listener) => debateStreamBus.unsubscribe(listener);
export const getSessionChunks = (sessionId) => debateStreamBus.getSessionChunks(sessionId);
export const clearSessionChunks = (sessionId) => debateStreamBus.clearSessionChunks(sessionId);
export const setBridgeConfig = (cfg) => debateStreamBus.setBridgeConfig(cfg);
export const setBridgeUrl = (url) => debateStreamBus.setBridgeUrl(url);

export default debateStreamBus;
