/**
 * Topology Multi-Model Council Budget & Quota Tracker
 * 
 * Accurately tracks usage, requests-per-minute (RPM), tokens-per-minute (TPM),
 * and daily usage against Gemini Ultra plan allocations for:
 *  - Gemini 3.8 Flash (⚡ Google DeepMind)
 *  - Claude 4.6 Opus (🧠 Anthropic)
 *  - GPT-OSS 120b (🌐 Open-Weight / OSS Coalition)
 * 
 * Key Features:
 *  - 60-second sliding rolling window for RPM & TPM
 *  - Daily rolling quota with automatic midnight UTC reset
 *  - Proactive 15% safety buffer stop (hard threshold at 85% usage)
 *  - Precise TTR (Time-To-Refresh) countdown calculation
 *  - Persistent state in .topology/council_budget.json
 */

import fs from 'fs';
import path from 'path';

const TOPOLOGY_DIR = path.resolve(process.cwd(), '.topology');
const BUDGET_FILE = path.join(TOPOLOGY_DIR, 'council_budget.json');

// Gemini Ultra Plan Quota Allocations & Extensible Model Registry
export const DEFAULT_MODEL_CONFIG = {
  'gemini-3.8-flash': {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    family: 'Google DeepMind',
    avatar: '⚡',
    color: '#1a73e8',
    role: 'Fast Architect & Execution Lead',
    provider: 'gemini',
    limits: {
      rpm: 1000,
      tpm: 4000000,
      dailyTokens: 100000000,
    },
    ratesPerMillion: {
      inputUsd: 0.075,
      outputUsd: 0.30,
    },
    defaultEstInputTokens: 1200,
    defaultEstOutputTokens: 2500,
  },
  'claude-5.5-opus': {
    id: 'claude-5.5-opus',
    name: 'Claude 5.5 Opus',
    family: 'Anthropic',
    avatar: '🧠',
    color: '#9334e6',
    role: 'Deep Reasoning & Invariant Critic',
    provider: 'anthropic',
    limits: {
      rpm: 60,
      tpm: 400000,
      dailyTokens: 10000000,
    },
    ratesPerMillion: {
      inputUsd: 15.00,
      outputUsd: 75.00,
    },
    defaultEstInputTokens: 2200,
    defaultEstOutputTokens: 4000,
  },
  'opus-5.5': {
    id: 'opus-5.5',
    name: 'Opus 5.5',
    family: 'Anthropic',
    avatar: '🧠',
    color: '#9334e6',
    role: 'Deep Reasoning & Invariant Critic',
    provider: 'anthropic',
    limits: {
      rpm: 60,
      tpm: 400000,
      dailyTokens: 10000000,
    },
    ratesPerMillion: {
      inputUsd: 15.00,
      outputUsd: 75.00,
    },
    defaultEstInputTokens: 2200,
    defaultEstOutputTokens: 4000,
  },
  'claude-4.6-opus': {
    id: 'claude-4.6-opus',
    name: 'Claude 4.6 Opus',
    family: 'Anthropic',
    avatar: '🧠',
    color: '#9334e6',
    role: 'Deep Reasoning & Invariant Critic',
    provider: 'anthropic',
    limits: {
      rpm: 50,
      tpm: 300000,
      dailyTokens: 5000000,
    },
    ratesPerMillion: {
      inputUsd: 15.00,
      outputUsd: 75.00,
    },
    defaultEstInputTokens: 2000,
    defaultEstOutputTokens: 3500,
  },
  'gpt-oss-120b': {
    id: 'gpt-oss-120b',
    name: 'GPT-OSS 120b',
    family: 'Open-Weight / OpenAI-compatible',
    avatar: '🌐',
    color: '#10a37f',
    role: 'Alternative Paradigm & Robustness Auditor',
    provider: 'openai_compatible',
    limits: {
      rpm: 120,
      tpm: 500000,
      dailyTokens: 10000000,
    },
    ratesPerMillion: {
      inputUsd: 0.15,
      outputUsd: 0.60,
    },
    defaultEstInputTokens: 1500,
    defaultEstOutputTokens: 3000,
  },
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
  }
}

function safeWriteJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  const content = JSON.stringify(data, null, 2);
  const tmpFile = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    fs.writeFileSync(tmpFile, content, 'utf8');
    try {
      fs.renameSync(tmpFile, filePath);
    } catch {
      // Windows concurrency / file lock fallback
      fs.writeFileSync(filePath, content, 'utf8');
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  } catch (err) {
    console.warn(`[BudgetTracker] Error saving ${filePath}:`, err.message);
  }
}

const CUSTOM_MODELS_FILE = path.join(TOPOLOGY_DIR, 'models.json');
const WORKSPACE_MODELS_FILE = path.resolve(process.cwd(), 'topology.models.json');

let cachedCustomModels = {};

export function loadCustomModels() {
  const loaded = { ...cachedCustomModels };
  // 1. Check workspace file topology.models.json
  try {
    if (fs.existsSync(WORKSPACE_MODELS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(WORKSPACE_MODELS_FILE, 'utf8'));
      if (Array.isArray(parsed)) {
        parsed.forEach(m => { if (m?.id) loaded[m.id] = m; });
      } else if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k, v]) => { if (v?.id || k) loaded[v.id || k] = { id: k, ...v }; });
      }
    }
  } catch (err) {
    console.warn('[BudgetTracker] Error reading workspace topology.models.json:', err.message);
  }

  // 2. Check .topology/models.json
  try {
    if (fs.existsSync(CUSTOM_MODELS_FILE)) {
      const raw = fs.readFileSync(CUSTOM_MODELS_FILE, 'utf8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(m => { if (m?.id) loaded[m.id] = m; });
        } else if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => { if (v?.id || k) loaded[v.id || k] = { id: k, ...v }; });
        }
        cachedCustomModels = { ...loaded };
      }
    }
  } catch (err) {
    // If reading is transiently contended, return last known good cache
    console.warn('[BudgetTracker] Error reading .topology/models.json (using cached fallback):', err.message);
  }

  return loaded;
}

export const MODEL_QUOTA_CONFIG = {
  ...DEFAULT_MODEL_CONFIG,
  ...loadCustomModels(),
};

export function getAllModelConfigs() {
  const custom = loadCustomModels();
  Object.assign(MODEL_QUOTA_CONFIG, custom);
  return { ...MODEL_QUOTA_CONFIG };
}

export function getModelConfig(modelId) {
  if (!modelId) return null;
  const normalizedId = String(modelId).trim().toLowerCase();
  if (!MODEL_QUOTA_CONFIG[normalizedId]) {
    const custom = loadCustomModels();
    if (custom[normalizedId]) {
      MODEL_QUOTA_CONFIG[normalizedId] = custom[normalizedId];
    }
  }
  return MODEL_QUOTA_CONFIG[normalizedId] || null;
}

export function registerCustomModel(modelInput) {
  if (!modelInput || typeof modelInput !== 'object' || !modelInput.id) {
    throw new Error('Model configuration must include an "id" field.');
  }

  const modelId = String(modelInput.id).trim().toLowerCase();
  if (!modelId) {
    throw new Error('Model ID cannot be empty or whitespace.');
  }

  const rpm = Math.max(1, parseInt(modelInput.limits?.rpm ?? '60', 10) || 60);
  const tpm = Math.max(1000, parseInt(modelInput.limits?.tpm ?? '300000', 10) || 300000);
  const dailyTokens = Math.max(10000, parseInt(modelInput.limits?.dailyTokens ?? '5000000', 10) || 5000000);
  const rateIn = Math.max(0, parseFloat(modelInput.ratesPerMillion?.inputUsd ?? 0.20) || 0.20);
  const rateOut = Math.max(0, parseFloat(modelInput.ratesPerMillion?.outputUsd ?? 0.80) || 0.80);

  const normalized = {
    id: modelId,
    name: modelInput.name || modelId,
    family: modelInput.family || 'Custom LLM / Provider',
    avatar: modelInput.avatar || '🤖',
    color: modelInput.color || '#6366f1',
    role: modelInput.role || 'Specialist & Deliberation Member',
    provider: modelInput.provider || 'openai_compatible',
    endpoint: modelInput.endpoint || modelInput.baseUrl || '',
    apiKeyEnv: modelInput.apiKeyEnv || null,
    apiKey: modelInput.apiKey || null,
    modelName: modelInput.modelName || modelInput.model || modelId,
    limits: {
      rpm,
      tpm,
      dailyTokens,
    },
    ratesPerMillion: {
      inputUsd: rateIn,
      outputUsd: rateOut,
    },
    defaultEstInputTokens: Math.max(100, parseInt(modelInput.defaultEstInputTokens || '1500', 10) || 1500),
    defaultEstOutputTokens: Math.max(100, parseInt(modelInput.defaultEstOutputTokens || '3000', 10) || 3000),
  };

  MODEL_QUOTA_CONFIG[modelId] = normalized;

  // Persist to .topology/models.json atomically
  try {
    let existing = {};
    if (fs.existsSync(CUSTOM_MODELS_FILE)) {
      try {
        const raw = fs.readFileSync(CUSTOM_MODELS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(m => { if (m?.id) existing[m.id] = m; });
        } else if (parsed && typeof parsed === 'object') {
          existing = parsed;
        }
      } catch {}
    }
    existing[modelId] = normalized;
    safeWriteJson(CUSTOM_MODELS_FILE, existing);
    cachedCustomModels = { ...cachedCustomModels, [modelId]: normalized };
  } catch (err) {
    console.warn('[BudgetTracker] Failed saving custom model to disk:', err.message);
  }

  // Update budgetTracker in-memory state safely
  if (typeof budgetTracker !== 'undefined' && budgetTracker?.state) {
    if (!budgetTracker.state.models[modelId]) {
      budgetTracker.state.models[modelId] = {
        id: modelId,
        name: normalized.name,
        requests: [],
        dailyRequests: 0,
        dailyTokens: 0,
        dailyResetAt: getUtcMidnightTimestamp(),
        totalAllTimeTokens: 0,
        totalAllTimeRequests: 0,
        throttledUntil: null,
      };
      budgetTracker.saveState();
    }
  }

  return normalized;
}

export function unregisterCustomModel(modelId) {
  if (!modelId) return false;
  const normalizedId = String(modelId).trim().toLowerCase();

  // Protect default built-in models
  if (DEFAULT_MODEL_CONFIG[normalizedId]) {
    throw new Error(`Cannot unregister default core model "${normalizedId}".`);
  }

  let removed = false;
  if (MODEL_QUOTA_CONFIG[normalizedId]) {
    delete MODEL_QUOTA_CONFIG[normalizedId];
    removed = true;
  }
  if (cachedCustomModels[normalizedId]) {
    delete cachedCustomModels[normalizedId];
    removed = true;
  }

  // Persist deletion to .topology/models.json atomically
  try {
    if (fs.existsSync(CUSTOM_MODELS_FILE)) {
      const raw = fs.readFileSync(CUSTOM_MODELS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed[normalizedId]) {
        delete parsed[normalizedId];
        safeWriteJson(CUSTOM_MODELS_FILE, parsed);
        removed = true;
      }
    }
  } catch (err) {
    console.warn('[BudgetTracker] Failed unregistering model from disk:', err.message);
  }

  // Remove from budgetTracker in-memory state
  if (typeof budgetTracker !== 'undefined' && budgetTracker?.state?.models) {
    if (budgetTracker.state.models[normalizedId]) {
      delete budgetTracker.state.models[normalizedId];
      budgetTracker.saveState();
      removed = true;
    }
  }

  return removed;
}

// Hard stop safety reserve threshold (85% limit = 15% reserve)
export const SAFETY_STOP_THRESHOLD = 0.85;

function getUtcMidnightTimestamp(now = Date.now()) {
  const d = new Date(now);
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

function getUtcStartOfDay(now = Date.now()) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

class BudgetTracker {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    let existing = null;
    try {
      if (fs.existsSync(BUDGET_FILE)) {
        const raw = fs.readFileSync(BUDGET_FILE, 'utf8');
        existing = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[BudgetTracker] Failed reading budget file, initializing default:', err.message);
    }

    const initial = existing || {
      version: 1,
      lastUpdated: Date.now(),
      models: {},
    };
    if (!initial.models) initial.models = {};

    for (const [modelId, cfg] of Object.entries(MODEL_QUOTA_CONFIG)) {
      if (!initial.models[modelId]) {
        initial.models[modelId] = {
          id: modelId,
          name: cfg.name,
          requests: [], // [{ timestamp, tokens }] in last 60s
          dailyRequests: 0,
          dailyTokens: 0,
          dailyResetAt: getUtcMidnightTimestamp(),
          totalAllTimeTokens: 0,
          totalAllTimeRequests: 0,
          throttledUntil: null,
        };
      }
    }

    return initial;
  }

  saveState() {
    this.state.lastUpdated = Date.now();
    safeWriteJson(BUDGET_FILE, this.state);
  }

  /**
   * Prunes sliding window entries older than 60s and resets daily counts if past UTC midnight
   */
  prune(now = Date.now()) {
    let changed = false;
    const windowStart = now - 60000;

    for (const modelId of Object.keys(MODEL_QUOTA_CONFIG)) {
      let m = this.state.models[modelId];
      if (!m) {
        const cfg = MODEL_QUOTA_CONFIG[modelId];
        m = this.state.models[modelId] = {
          id: modelId,
          name: cfg.name,
          requests: [],
          dailyRequests: 0,
          dailyTokens: 0,
          dailyResetAt: getUtcMidnightTimestamp(now),
          totalAllTimeTokens: 0,
          totalAllTimeRequests: 0,
          throttledUntil: null,
        };
        changed = true;
      }

      // Check daily reset
      if (now >= m.dailyResetAt) {
        m.dailyRequests = 0;
        m.dailyTokens = 0;
        m.dailyResetAt = getUtcMidnightTimestamp(now);
        changed = true;
      }

      // Filter sliding 60s window
      const beforeCount = m.requests.length;
      m.requests = m.requests.filter(r => r.timestamp > windowStart);
      if (m.requests.length !== beforeCount) {
        changed = true;
      }

      // Clear throttle if expired
      if (m.throttledUntil && now >= m.throttledUntil) {
        m.throttledUntil = null;
        changed = true;
      }
    }

    if (changed) {
      this.saveState();
    }
  }

  /**
   * Evaluates current usage against limits and 15% safety buffer.
   * Returns canConsume: boolean, reason, metrics, and TTR.
   */
  canConsume(modelId, estimatedTokens = 0, now = Date.now()) {
    this.prune(now);
    const sanitizedEstTokens = Math.max(0, parseInt(estimatedTokens, 10) || 0);
    const cfg = getModelConfig(modelId);
    if (!cfg) {
      return { allowed: false, reason: `Unknown model ID: ${modelId}` };
    }

    const m = this.state.models[modelId];
    if (!m) {
      return { allowed: true, reason: 'OK' };
    }

    if (m.throttledUntil && now < m.throttledUntil) {
      const waitSeconds = Math.max(1, Math.ceil((m.throttledUntil - now) / 1000));
      return {
        allowed: false,
        reason: 'THROTTLED',
        ttrSeconds: waitSeconds,
        message: `${cfg.name} is currently throttled. Cools down in ${waitSeconds}s.`,
        recommendedFallback: 'gemini-3.8-flash',
      };
    }

    const currentRpm = m.requests.length;
    const currentTpm = m.requests.reduce((sum, r) => sum + (r.tokens || 0), 0);
    const currentDaily = m.dailyTokens;

    const maxSafeRpm = Math.floor(cfg.limits.rpm * SAFETY_STOP_THRESHOLD);
    const maxSafeTpm = Math.floor(cfg.limits.tpm * SAFETY_STOP_THRESHOLD);
    const maxSafeDaily = Math.floor(cfg.limits.dailyTokens * SAFETY_STOP_THRESHOLD);

    // Check RPM
    if (currentRpm + 1 > maxSafeRpm) {
      const oldest = m.requests[0];
      const ttr = oldest ? Math.max(1, Math.ceil((oldest.timestamp + 60000 - now) / 1000)) : 60;
      return {
        allowed: false,
        reason: 'RPM_SAFETY_LIMIT_REACHED',
        currentRpm,
        limitRpm: cfg.limits.rpm,
        safeLimitRpm: maxSafeRpm,
        ttrSeconds: ttr,
        message: `${cfg.name} RPM safe ceiling reached (${currentRpm}/${cfg.limits.rpm}, 85% safety limit: ${maxSafeRpm}). Refreshes in ${ttr}s.`,
        recommendedFallback: 'gemini-3.8-flash',
      };
    }

    // Check TPM
    if (currentTpm + sanitizedEstTokens > maxSafeTpm) {
      const oldest = m.requests[0];
      const ttr = oldest ? Math.max(1, Math.ceil((oldest.timestamp + 60000 - now) / 1000)) : 60;
      return {
        allowed: false,
        reason: 'TPM_SAFETY_LIMIT_REACHED',
        currentTpm,
        limitTpm: cfg.limits.tpm,
        safeLimitTpm: maxSafeTpm,
        ttrSeconds: ttr,
        message: `${cfg.name} TPM safe ceiling reached (${currentTpm + sanitizedEstTokens}/${cfg.limits.tpm}). Refreshes in ${ttr}s.`,
        recommendedFallback: 'gemini-3.8-flash',
      };
    }

    // Check Daily
    if (currentDaily + sanitizedEstTokens > maxSafeDaily) {
      const ttr = Math.max(1, Math.ceil((m.dailyResetAt - now) / 1000));
      return {
        allowed: false,
        reason: 'DAILY_SAFETY_LIMIT_REACHED',
        currentDaily,
        limitDaily: cfg.limits.dailyTokens,
        safeLimitDaily: maxSafeDaily,
        ttrSeconds: ttr,
        message: `${cfg.name} daily token ceiling reached (${currentDaily + sanitizedEstTokens}/${cfg.limits.dailyTokens}). Resets at 00:00 UTC (${Math.ceil(ttr / 60)} mins).`,
        recommendedFallback: 'gemini-3.8-flash',
      };
    }

    return {
      allowed: true,
      reason: 'OK',
      currentRpm,
      currentTpm,
      currentDaily,
    };
  }

  /**
   * Records token and request consumption with precise USD financial tracking
   */
  recordConsumption(modelId, tokensUsed = 0, now = Date.now(), options = {}) {
    this.prune(now);
    const sanitizedTokens = Math.max(0, parseInt(tokensUsed, 10) || 0);
    let m = this.state.models[modelId];
    if (!m) {
      const cfg = getModelConfig(modelId);
      if (cfg) {
        m = this.state.models[modelId] = {
          id: modelId,
          name: cfg.name,
          requests: [],
          dailyRequests: 0,
          dailyTokens: 0,
          dailyCostUsd: 0,
          dailyResetAt: getUtcMidnightTimestamp(now),
          totalAllTimeTokens: 0,
          totalAllTimeRequests: 0,
          totalAllTimeCostUsd: 0,
          throttledUntil: null,
        };
      } else {
        return { tokensUsed: sanitizedTokens, costUsd: 0 };
      }
    }

    const cfg = getModelConfig(modelId);
    const inputTokens = Math.max(0, parseInt(options.inputTokens, 10) || Math.round(sanitizedTokens * 0.4));
    const outputTokens = Math.max(0, parseInt(options.outputTokens, 10) || (sanitizedTokens - inputTokens));

    const rateIn = cfg?.ratesPerMillion?.inputUsd ?? 0.1;
    const rateOut = cfg?.ratesPerMillion?.outputUsd ?? 0.4;
    const costUsd = Number(((inputTokens * rateIn + outputTokens * rateOut) / 1000000).toFixed(6));

    m.requests.push({ timestamp: now, tokens: sanitizedTokens, costUsd });
    m.dailyRequests += 1;
    m.dailyTokens += sanitizedTokens;
    m.dailyCostUsd = Number(((m.dailyCostUsd || 0) + costUsd).toFixed(5));
    m.totalAllTimeRequests += 1;
    m.totalAllTimeTokens += sanitizedTokens;
    m.totalAllTimeCostUsd = Number(((m.totalAllTimeCostUsd || 0) + costUsd).toFixed(5));

    this.saveState();
    return { tokensUsed, costUsd };
  }

  /**
   * Applies manual throttle or cool-down
   */
  setThrottled(modelId, durationSeconds = 60, now = Date.now()) {
    const m = this.state.models[modelId];
    if (m) {
      m.throttledUntil = now + durationSeconds * 1000;
      this.saveState();
    }
  }

  /**
   * Returns comprehensive quota health report for UI and MCP tools
   */
  getBudgetStatus(now = Date.now()) {
    this.prune(now);
    const result = {
      timestamp: now,
      safetyThreshold: SAFETY_STOP_THRESHOLD,
      safetyReservePercent: Math.round((1 - SAFETY_STOP_THRESHOLD) * 100),
      models: {},
      systemStatus: 'healthy',
      totalSessionCostUsd: 0,
      totalDailyCostUsd: 0,
      totalAllTimeCostUsd: 0,
    };

    let hasThrottled = false;
    let hasApproaching = false;

    const allConfigs = getAllModelConfigs();
    for (const [modelId, cfg] of Object.entries(allConfigs)) {
      const m = this.state.models[modelId] || {
        requests: [],
        dailyRequests: 0,
        dailyTokens: 0,
        dailyCostUsd: 0,
        totalAllTimeCostUsd: 0,
        dailyResetAt: getUtcMidnightTimestamp(now),
        throttledUntil: null,
      };

      const currentRpm = m.requests.length;
      const currentTpm = m.requests.reduce((sum, r) => sum + (r.tokens || 0), 0);
      const sessionCost = Number((m.requests.reduce((sum, r) => sum + (r.costUsd || 0), 0)).toFixed(5));
      const currentDaily = m.dailyTokens;
      const dailyCost = m.dailyCostUsd || 0;
      const allTimeCost = m.totalAllTimeCostUsd || 0;

      result.totalSessionCostUsd = Number((result.totalSessionCostUsd + sessionCost).toFixed(5));
      result.totalDailyCostUsd = Number((result.totalDailyCostUsd + dailyCost).toFixed(5));
      result.totalAllTimeCostUsd = Number((result.totalAllTimeCostUsd + allTimeCost).toFixed(5));

      const rpmPercent = Math.min(100, Math.round((currentRpm / cfg.limits.rpm) * 100));
      const tpmPercent = Math.min(100, Math.round((currentTpm / cfg.limits.tpm) * 100));
      const dailyPercent = Math.min(100, Math.round((currentDaily / cfg.limits.dailyTokens) * 100));

      // Calculate sliding TTR (seconds until oldest request rolls off 60s window)
      let ttrWindowSeconds = 0;
      if (m.requests.length > 0) {
        const oldest = m.requests[0];
        ttrWindowSeconds = Math.max(0, Math.ceil((oldest.timestamp + 60000 - now) / 1000));
      }

      // Calculate Daily TTR
      const ttrDailySeconds = Math.max(0, Math.ceil((m.dailyResetAt - now) / 1000));

      // Determine model status
      let status = 'healthy';
      if (m.throttledUntil && now < m.throttledUntil) {
        status = 'throttled';
        hasThrottled = true;
      } else if (
        currentRpm >= cfg.limits.rpm * SAFETY_STOP_THRESHOLD ||
        currentTpm >= cfg.limits.tpm * SAFETY_STOP_THRESHOLD ||
        currentDaily >= cfg.limits.dailyTokens * SAFETY_STOP_THRESHOLD
      ) {
        status = 'safety_stopped';
        hasThrottled = true;
      } else if (
        currentRpm >= cfg.limits.rpm * 0.7 ||
        currentTpm >= cfg.limits.tpm * 0.7 ||
        currentDaily >= cfg.limits.dailyTokens * 0.7
      ) {
        status = 'approaching_limit';
        hasApproaching = true;
      }

      result.models[modelId] = {
        id: modelId,
        name: cfg.name,
        family: cfg.family,
        avatar: cfg.avatar,
        color: cfg.color,
        role: cfg.role,
        status,
        rpm: {
          current: currentRpm,
          limit: cfg.limits.rpm,
          safeLimit: Math.floor(cfg.limits.rpm * SAFETY_STOP_THRESHOLD),
          percent: rpmPercent,
        },
        tpm: {
          current: currentTpm,
          limit: cfg.limits.tpm,
          safeLimit: Math.floor(cfg.limits.tpm * SAFETY_STOP_THRESHOLD),
          percent: tpmPercent,
        },
        daily: {
          current: currentDaily,
          limit: cfg.limits.dailyTokens,
          safeLimit: Math.floor(cfg.limits.dailyTokens * SAFETY_STOP_THRESHOLD),
          percent: dailyPercent,
        },
        ttr: {
          windowSeconds: ttrWindowSeconds,
          dailySeconds: ttrDailySeconds,
          formattedWindow: formatDuration(ttrWindowSeconds),
          formattedDaily: formatDuration(ttrDailySeconds),
        },
        cost: {
          sessionCostUsd: sessionCost,
          dailyCostUsd: dailyCost,
          allTimeCostUsd: allTimeCost,
          formattedDaily: `$${dailyCost.toFixed(4)}`,
          formattedAllTime: `$${allTimeCost.toFixed(4)}`,
        },
        allTime: {
          totalTokens: m.totalAllTimeTokens || 0,
          totalRequests: m.totalAllTimeRequests || 0,
        },
      };
    }

    if (hasThrottled) {
      result.systemStatus = 'safety_stopped';
    } else if (hasApproaching) {
      result.systemStatus = 'approaching_limit';
    }

    return result;
  }

  /**
   * Resets budget tracking metrics for one or all models
   */
  resetBudget(modelId = null) {
    const now = Date.now();
    const allConfigs = getAllModelConfigs();
    if (modelId && this.state.models[modelId]) {
      this.state.models[modelId].requests = [];
      this.state.models[modelId].dailyRequests = 0;
      this.state.models[modelId].dailyTokens = 0;
      this.state.models[modelId].dailyCostUsd = 0;
      this.state.models[modelId].dailyResetAt = getUtcMidnightTimestamp(now);
      this.state.models[modelId].throttledUntil = null;
    } else {
      for (const id of Object.keys(allConfigs)) {
        if (this.state.models[id]) {
          this.state.models[id].requests = [];
          this.state.models[id].dailyRequests = 0;
          this.state.models[id].dailyTokens = 0;
          this.state.models[id].dailyResetAt = getUtcMidnightTimestamp(now);
          this.state.models[id].throttledUntil = null;
        }
      }
    }
    this.saveState();
    return this.getBudgetStatus(now);
  }

  /**
   * Dynamic Quota & Cost Allocation Optimizer
   * Analyzes live RPM/TPM quota headroom (< 85% ceiling), sliding window TTR,
   * target financial budget in USD, and multi-round consumption projections.
   * Generates and ranks 4 candidate roster archetypes with intelligent surrogate substitution.
   *
   * @param {Object} [options={}]
   * @param {number} [options.targetBudgetUsd] - Target financial ceiling in USD
   * @param {number} [options.rounds=3] - Number of deliberation rounds planned (1 to 10)
   * @param {'balanced'|'cost_optimized'|'maximum_reasoning'|'surrogate_fallback'} [options.strategy='balanced']
   * @param {string[]} [options.requiredSpecialists=[]] - Model IDs required to be included
   * @param {number} [options.now] - Optional timestamp override
   * @returns {Object} QuotaOptimizationResult
   */
  optimizeCouncilAllocation(options = {}) {
    const now = typeof options.now === 'number' ? options.now : Date.now();
    this.prune(now);

    const rounds = Math.max(1, Math.min(10, parseInt(options.rounds ?? 3, 10) || 3));
    let targetBudgetUsd = undefined;
    if (typeof options.targetBudgetUsd === 'number' && !isNaN(options.targetBudgetUsd) && options.targetBudgetUsd > 0) {
      targetBudgetUsd = options.targetBudgetUsd;
    } else if (typeof options.targetBudgetUsd === 'string' && !isNaN(parseFloat(options.targetBudgetUsd)) && parseFloat(options.targetBudgetUsd) > 0) {
      targetBudgetUsd = parseFloat(options.targetBudgetUsd);
    }

    const validStrategies = ['balanced', 'cost_optimized', 'maximum_reasoning', 'surrogate_fallback'];
    const strategy = validStrategies.includes(options.strategy) ? options.strategy : 'balanced';

    const requiredSpecialists = Array.isArray(options.requiredSpecialists)
      ? options.requiredSpecialists.map(s => String(s).trim().toLowerCase()).filter(Boolean)
      : [];

    const allConfigs = getAllModelConfigs();
    const modelEvaluations = {};

    // 1. Evaluate live quota headroom and multi-round consumption for every registered model
    for (const [modelId, cfg] of Object.entries(allConfigs)) {
      const m = this.state.models[modelId] || {
        requests: [],
        dailyRequests: 0,
        dailyTokens: 0,
        dailyCostUsd: 0,
        dailyResetAt: getUtcMidnightTimestamp(now),
        throttledUntil: null,
      };

      const isThrottled = Boolean(m.throttledUntil && now < m.throttledUntil);
      const waitSeconds = isThrottled ? Math.max(1, Math.ceil((m.throttledUntil - now) / 1000)) : 0;

      const currentRpm = m.requests.length;
      const currentTpm = m.requests.reduce((sum, r) => sum + (r.tokens || 0), 0);
      const currentDaily = m.dailyTokens;

      const rpmLimit = cfg.limits?.rpm || 60;
      const tpmLimit = cfg.limits?.tpm || 300000;
      const dailyLimit = cfg.limits?.dailyTokens || 5000000;

      const safeRpmLimit = Math.floor(rpmLimit * SAFETY_STOP_THRESHOLD);
      const safeTpmLimit = Math.floor(tpmLimit * SAFETY_STOP_THRESHOLD);
      const safeDailyLimit = Math.floor(dailyLimit * SAFETY_STOP_THRESHOLD);

      // Remaining effective headroom: H_effective = min(0.85 * limit - current, limit * 0.85)
      const effectiveRpmHeadroom = Math.max(0, Math.min(safeRpmLimit - currentRpm, Math.floor(rpmLimit * SAFETY_STOP_THRESHOLD)));
      const effectiveTpmHeadroom = Math.max(0, Math.min(safeTpmLimit - currentTpm, Math.floor(tpmLimit * SAFETY_STOP_THRESHOLD)));
      const effectiveDailyHeadroom = Math.max(0, Math.min(safeDailyLimit - currentDaily, Math.floor(dailyLimit * SAFETY_STOP_THRESHOLD)));

      const rpmHeadroomPct = safeRpmLimit > 0 ? (effectiveRpmHeadroom / safeRpmLimit) * 100 : 0;
      const tpmHeadroomPct = safeTpmLimit > 0 ? (effectiveTpmHeadroom / safeTpmLimit) * 100 : 0;
      const dailyHeadroomPct = safeDailyLimit > 0 ? (effectiveDailyHeadroom / safeDailyLimit) * 100 : 0;
      const effectiveHeadroomPct = isThrottled ? 0 : Math.max(0, Math.min(rpmHeadroomPct, tpmHeadroomPct, dailyHeadroomPct));

      // Multi-round token projection
      const estInputPerRound = cfg.defaultEstInputTokens || 1500;
      const estOutputPerRound = cfg.defaultEstOutputTokens || 3000;
      const projectedInputTokens = rounds * estInputPerRound;
      const projectedOutputTokens = rounds * estOutputPerRound;
      const projectedTokens = projectedInputTokens + projectedOutputTokens;

      const rateIn = cfg.ratesPerMillion?.inputUsd ?? 0.10;
      const rateOut = cfg.ratesPerMillion?.outputUsd ?? 0.40;
      const projectedCostUsd = Number(((projectedInputTokens * rateIn + projectedOutputTokens * rateOut) / 1000000).toFixed(6));

      const projectedRpm = currentRpm + rounds;
      const projectedTpm = currentTpm + projectedTokens;
      const projectedDaily = currentDaily + projectedTokens;

      const projectedRpmPct = Number(((projectedRpm / rpmLimit) * 100).toFixed(1));
      const projectedTpmPct = Number(((projectedTpm / tpmLimit) * 100).toFixed(1));
      const projectedDailyPct = Number(((projectedDaily / dailyLimit) * 100).toFixed(1));

      const satisfiesCeiling = !isThrottled &&
        (projectedRpm <= safeRpmLimit) &&
        (projectedTpm <= safeTpmLimit) &&
        (projectedDaily <= safeDailyLimit);

      // Relative capability score
      let capabilityTier = 0.80;
      if (modelId === 'claude-5.5-opus' || modelId === 'opus-5.5') capabilityTier = 1.05;
      else if (modelId === 'claude-4.6-opus') capabilityTier = 1.0;
      else if (modelId.includes('deepseek-r1')) capabilityTier = 0.95;
      else if (modelId.includes('deepseek-v3') || modelId.includes('gpt-4o')) capabilityTier = 0.90;
      else if (modelId === 'gemini-3.8-flash') capabilityTier = 0.85;
      else if (modelId === 'gpt-oss-120b') capabilityTier = 0.80;

      modelEvaluations[modelId] = {
        modelId,
        cfg,
        isThrottled,
        ttrSeconds: waitSeconds,
        currentRpm,
        currentTpm,
        currentDaily,
        safeRpmLimit,
        safeTpmLimit,
        safeDailyLimit,
        effectiveRpmHeadroom,
        effectiveTpmHeadroom,
        effectiveDailyHeadroom,
        effectiveHeadroomPct: Number(effectiveHeadroomPct.toFixed(1)),
        projectedCostUsd,
        projectedRpmPct,
        projectedTpmPct,
        projectedDailyPct,
        satisfiesCeiling,
        capabilityTier,
      };
    }

    // 2. Intelligent surrogate finder tailored to deliberation roles
    const findSurrogateFor = (targetModelId, currentRosterModels, reason) => {
      const origCfg = allConfigs[targetModelId] || { name: targetModelId };
      const currentSet = new Set(currentRosterModels.map(id => String(id).toLowerCase()));
      currentSet.add(targetModelId.toLowerCase());

      let candidateIds = [];
      if (targetModelId === 'claude-5.5-opus' || targetModelId === 'opus-5.5') {
        candidateIds = ['claude-4.6-opus', 'deepseek-v3', 'deepseek-r1', 'gpt-4o', 'gpt-oss-120b', 'gemini-3.8-flash'];
      } else if (targetModelId === 'claude-4.6-opus') {
        candidateIds = ['claude-5.5-opus', 'deepseek-v3', 'deepseek-r1', 'gpt-4o', 'gpt-oss-120b', 'gemini-3.8-flash'];
      } else if (targetModelId === 'gemini-3.8-flash') {
        candidateIds = ['gpt-oss-120b', 'deepseek-v3', 'claude-5.5-opus', 'claude-4.6-opus'];
      } else if (targetModelId === 'gpt-oss-120b') {
        candidateIds = ['deepseek-v3', 'llama-3.3-70b', 'gemini-3.8-flash', 'claude-5.5-opus', 'claude-4.6-opus'];
      } else {
        candidateIds = ['gpt-oss-120b', 'gemini-3.8-flash', 'claude-5.5-opus', 'claude-4.6-opus'];
      }

      // Check prioritized candidates first
      for (const cid of candidateIds) {
        if (allConfigs[cid] && !currentSet.has(cid.toLowerCase()) && modelEvaluations[cid]?.satisfiesCeiling) {
          const surrCfg = allConfigs[cid];
          return {
            surrogateId: cid,
            rationale: `${origCfg.name} ${reason}. Substituted with ${surrCfg.name} (${modelEvaluations[cid].effectiveHeadroomPct}% safe headroom).`,
          };
        }
      }

      // Check any registered model that satisfies the ceiling
      for (const [mid, ev] of Object.entries(modelEvaluations)) {
        if (!currentSet.has(mid.toLowerCase()) && ev.satisfiesCeiling) {
          const surrCfg = allConfigs[mid];
          return {
            surrogateId: mid,
            rationale: `${origCfg.name} ${reason}. Substituted with ${surrCfg.name} (${ev.effectiveHeadroomPct}% safe headroom).`,
          };
        }
      }

      // Fallback: highest headroom model not already in roster
      const sortedByHeadroom = Object.values(modelEvaluations)
        .filter(ev => !currentSet.has(ev.modelId.toLowerCase()))
        .sort((a, b) => b.effectiveHeadroomPct - a.effectiveHeadroomPct);

      if (sortedByHeadroom.length > 0) {
        const fallback = sortedByHeadroom[0];
        return {
          surrogateId: fallback.modelId,
          rationale: `${origCfg.name} ${reason}. Substituted with highest-headroom available model ${fallback.cfg.name}.`,
        };
      }

      return null;
    };

    // 3. Helper to evaluate and score a candidate roster
    const evaluateRoster = (rosterName, rawModels, substitutions, archetypeKey) => {
      let models = [];
      const seen = new Set();
      for (const id of rawModels) {
        const norm = String(id).toLowerCase();
        if (allConfigs[norm] && !seen.has(norm)) {
          seen.add(norm);
          models.push(norm);
        }
      }

      // Ensure required specialists are always included
      for (const req of requiredSpecialists) {
        if (allConfigs[req] && !seen.has(req)) {
          seen.add(req);
          models.push(req);
        }
      }

      // If fewer than 3 models and more exist, fill up to 3
      if (models.length < 3) {
        for (const id of Object.keys(allConfigs)) {
          if (!seen.has(id)) {
            seen.add(id);
            models.push(id);
            if (models.length >= 3) break;
          }
        }
      }

      const memberEvals = models.map(id => modelEvaluations[id] || {
        modelId: id,
        cfg: allConfigs[id] || { name: id, family: 'Custom' },
        isThrottled: false,
        effectiveHeadroomPct: 50,
        projectedCostUsd: 0.005,
        projectedRpmPct: 5,
        projectedTpmPct: 5,
        projectedDailyPct: 1,
        satisfiesCeiling: true,
        capabilityTier: 0.8,
      });

      const projectedCostUsd = Number(memberEvals.reduce((sum, m) => sum + m.projectedCostUsd, 0).toFixed(5));
      const maxRpmUtilizationPct = Math.max(...memberEvals.map(m => m.projectedRpmPct));
      const maxTpmUtilizationPct = Math.max(...memberEvals.map(m => m.projectedTpmPct));
      const maxDailyUtilizationPct = Math.max(...memberEvals.map(m => m.projectedDailyPct));
      const minHeadroomPct = Math.min(...memberEvals.map(m => m.effectiveHeadroomPct));

      const safeCeilingSatisfied = maxRpmUtilizationPct <= (SAFETY_STOP_THRESHOLD * 100) &&
        maxTpmUtilizationPct <= (SAFETY_STOP_THRESHOLD * 100) &&
        maxDailyUtilizationPct <= (SAFETY_STOP_THRESHOLD * 100) &&
        !memberEvals.some(m => m.isThrottled);

      // Scoring model (0 - 100)
      // 1. Headroom Score: 0 to 35 pts
      const headroomScore = Math.min(35, Math.max(0, (minHeadroomPct / 100) * 35));

      // 2. Cost Score: 0 to 30 pts
      let costScore = 0;
      if (targetBudgetUsd != null && targetBudgetUsd > 0) {
        if (projectedCostUsd <= targetBudgetUsd) {
          costScore = 30 * (1 - (projectedCostUsd / targetBudgetUsd));
        } else {
          const overrunRatio = (projectedCostUsd - targetBudgetUsd) / targetBudgetUsd;
          costScore = -40 * Math.min(2.5, overrunRatio); // Penalize over-budget rosters
        }
      } else {
        costScore = 30 / (1 + projectedCostUsd * 2.5);
      }

      // 3. Capability Score: 0 to 20 pts
      const avgCapability = memberEvals.reduce((sum, m) => sum + m.capabilityTier, 0) / memberEvals.length;
      const capabilityScore = avgCapability * 20;

      // 4. Provider Diversity Score: 0 to 15 pts
      const providers = new Set(memberEvals.map(m => m.cfg.provider || m.cfg.family || m.modelId));
      let diversityScore = 5;
      if (providers.size >= 3) diversityScore = 15;
      else if (providers.size === 2) diversityScore = 10;

      // 5. Strategy Alignment Bonus: +15 pts
      let strategyBonus = 0;
      if (strategy === archetypeKey) {
        strategyBonus = 15;
      }

      // 6. Penalties
      let penalty = 0;
      if (!safeCeilingSatisfied) penalty += 50;
      if (memberEvals.some(m => m.isThrottled)) penalty += 30;

      const rawSuitability = headroomScore + costScore + capabilityScore + diversityScore + strategyBonus - penalty;
      const suitabilityScore = Number(Math.max(0, Math.min(100, rawSuitability)).toFixed(1));

      return {
        rosterName,
        models,
        projectedCostUsd,
        maxRpmUtilizationPct,
        maxTpmUtilizationPct,
        safeCeilingSatisfied,
        surrogateSubstitutions: substitutions,
        suitabilityScore,
        strategy: archetypeKey,
      };
    };

    // 4. Generate 4 Candidate Roster Archetypes:

    // --- Archetype 1: Balanced Frontier Triad ---
    const balancedSubstitutions = [];
    const balancedModels = [];
    const baseBalancedTargets = ['gemini-3.8-flash', 'claude-4.6-opus', 'gpt-oss-120b'];
    for (const targetId of baseBalancedTargets) {
      if (!allConfigs[targetId]) continue;
      const ev = modelEvaluations[targetId];
      const exceedsBudgetCeiling = targetBudgetUsd != null && ev && ev.projectedCostUsd > targetBudgetUsd;

      if (ev && !ev.isThrottled && ev.satisfiesCeiling && !exceedsBudgetCeiling) {
        balancedModels.push(targetId);
      } else {
        let reason = 'is unavailable';
        if (ev?.isThrottled) reason = `is throttled (TTR: ${ev.ttrSeconds}s)`;
        else if (ev && !ev.satisfiesCeiling) reason = `exceeds 85% safe ceiling (${Math.max(ev.projectedRpmPct, ev.projectedTpmPct)}% projected)`;
        else if (exceedsBudgetCeiling) reason = `projected cost ($${ev.projectedCostUsd.toFixed(4)}) exceeds target session budget ($${targetBudgetUsd.toFixed(4)})`;

        const surrogate = findSurrogateFor(targetId, balancedModels, reason);
        if (surrogate) {
          balancedModels.push(surrogate.surrogateId);
          balancedSubstitutions.push({
            original: targetId,
            surrogate: surrogate.surrogateId,
            rationale: surrogate.rationale,
          });
        } else {
          balancedModels.push(targetId);
        }
      }
    }
    const rosterBalanced = evaluateRoster('Balanced Frontier Triad', balancedModels, balancedSubstitutions, 'balanced');

    // --- Archetype 2: Cost-Optimized (Frugal) ---
    const costOptSubstitutions = [];
    const costOptModels = [];
    // Sort all safe models by projected cost ascending
    const sortedByCost = Object.values(modelEvaluations)
      .filter(ev => ev.satisfiesCeiling)
      .sort((a, b) => a.projectedCostUsd - b.projectedCostUsd);

    for (const ev of sortedByCost) {
      if (costOptModels.length < 3) {
        costOptModels.push(ev.modelId);
      }
    }
    // If Opus was in default triad and replaced by lower cost model
    if (allConfigs['claude-4.6-opus'] && !costOptModels.includes('claude-4.6-opus')) {
      const cheapestAlternative = costOptModels.find(id => id !== 'gemini-3.8-flash') || costOptModels[0] || 'gpt-oss-120b';
      const savings = Math.max(0, (modelEvaluations['claude-4.6-opus']?.projectedCostUsd || 0.87) - (modelEvaluations[cheapestAlternative]?.projectedCostUsd || 0.005));
      costOptSubstitutions.push({
        original: 'claude-4.6-opus',
        surrogate: cheapestAlternative,
        rationale: `Substituted Claude 4.6 Opus with ${allConfigs[cheapestAlternative]?.name || cheapestAlternative} to minimize financial cost ($${savings.toFixed(4)} savings) within safe quotas.`,
      });
    }
    const rosterCostOpt = evaluateRoster('Cost-Optimized (Frugal)', costOptModels, costOptSubstitutions, 'cost_optimized');

    // --- Archetype 3: Maximum Reasoning Frontier ---
    const maxReasonSubstitutions = [];
    const maxReasonModels = [];
    const reasoningTargets = allConfigs['claude-5.5-opus']
      ? ['claude-5.5-opus', 'gemini-3.8-flash', 'gpt-oss-120b']
      : ['claude-4.6-opus', 'gemini-3.8-flash', 'gpt-oss-120b'];
    for (const targetId of reasoningTargets) {
      if (!allConfigs[targetId]) continue;
      const ev = modelEvaluations[targetId];
      if (ev && !ev.isThrottled && ev.satisfiesCeiling) {
        maxReasonModels.push(targetId);
      } else {
        const reason = ev?.isThrottled ? `is throttled (TTR: ${ev.ttrSeconds}s)` : `exceeds 85% safe ceiling (${Math.max(ev?.projectedRpmPct || 0, ev?.projectedTpmPct || 0)}%)`;
        const surrogate = findSurrogateFor(targetId, maxReasonModels, reason);
        if (surrogate) {
          maxReasonModels.push(surrogate.surrogateId);
          maxReasonSubstitutions.push({
            original: targetId,
            surrogate: surrogate.surrogateId,
            rationale: surrogate.rationale,
          });
        } else {
          maxReasonModels.push(targetId);
        }
      }
    }
    const rosterMaxReason = evaluateRoster('Maximum Reasoning Frontier', maxReasonModels, maxReasonSubstitutions, 'maximum_reasoning');

    // --- Archetype 4: High-Headroom Surrogate Fallback ---
    const surrogateFallbackSubstitutions = [];
    const surrogateFallbackModels = [];
    // Prioritize models with highest effective headroom
    const sortedByHeadroom = Object.values(modelEvaluations)
      .sort((a, b) => b.effectiveHeadroomPct - a.effectiveHeadroomPct);

    for (const ev of sortedByHeadroom) {
      if (surrogateFallbackModels.length < 3) {
        surrogateFallbackModels.push(ev.modelId);
      }
    }
    // Record any substitutions relative to default base
    for (const baseId of ['claude-5.5-opus', 'claude-4.6-opus', 'gpt-oss-120b']) {
      if (allConfigs[baseId] && !surrogateFallbackModels.includes(baseId)) {
        const highHeadroomModel = surrogateFallbackModels.find(id => id !== 'gemini-3.8-flash') || surrogateFallbackModels[0];
        surrogateFallbackSubstitutions.push({
          original: baseId,
          surrogate: highHeadroomModel,
          rationale: `${allConfigs[baseId]?.name || baseId} safe headroom (${modelEvaluations[baseId]?.effectiveHeadroomPct || 0}%) bypassed in favor of ${allConfigs[highHeadroomModel]?.name || highHeadroomModel} (${modelEvaluations[highHeadroomModel]?.effectiveHeadroomPct || 0}% headroom) for burst safety.`,
        });
      }
    }
    const rosterSurrogate = evaluateRoster('High-Headroom Surrogate Fallback', surrogateFallbackModels, surrogateFallbackSubstitutions, 'surrogate_fallback');

    // 5. Rank candidate rosters by suitabilityScore descending
    const rawRosters = [rosterBalanced, rosterCostOpt, rosterMaxReason, rosterSurrogate];
    rawRosters.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    const candidateRosters = rawRosters.map((r, index) => ({
      rank: index + 1,
      rosterName: r.rosterName,
      models: r.models,
      projectedCostUsd: r.projectedCostUsd,
      maxRpmUtilizationPct: r.maxRpmUtilizationPct,
      maxTpmUtilizationPct: r.maxTpmUtilizationPct,
      safeCeilingSatisfied: r.safeCeilingSatisfied,
      surrogateSubstitutions: r.surrogateSubstitutions,
      suitabilityScore: r.suitabilityScore,
    }));

    return {
      options: {
        targetBudgetUsd,
        rounds,
        strategy,
        requiredSpecialists,
      },
      candidateRosters,
      recommendedRoster: candidateRosters[0],
      safetyCeilingThreshold: SAFETY_STOP_THRESHOLD,
      generatedAt: new Date(now).toISOString(),
    };
  }
}

function formatDuration(seconds) {
  if (!seconds || typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return '00:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const budgetTracker = new BudgetTracker();

export function optimizeCouncilAllocation(options = {}) {
  return budgetTracker.optimizeCouncilAllocation(options);
}

