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
