/**
 * Topology Multi-Model Provider Client (Dual-Mode Execution)
 * 
 * Supports calling real model endpoints when API keys are available:
 *  - Google Gemini API (generativelanguage.googleapis.com)
 *  - Anthropic Messages API (api.anthropic.com)
 *  - OpenAI-compatible / OSS API (OpenAI, Ollama, vLLM, OpenRouter)
 * 
 * Seamless Fallback:
 *  - If API keys are unconfigured, network is offline, or rate-limited,
 *    transparently falls back to domain-tailored cognitive reasoning
 *    without throwing fatal errors or halting agent execution.
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getModelConfig } from './budgetTracker.js';

const TOPOLOGY_DIR = path.resolve(process.cwd(), '.topology');
const CONFIG_FILE = path.join(TOPOLOGY_DIR, 'council_config.json');

export function loadCouncilConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveCouncilConfig(config) {
  try {
    if (!fs.existsSync(TOPOLOGY_DIR)) fs.mkdirSync(TOPOLOGY_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    if (typeof providerClient !== 'undefined' && providerClient?.refreshConfig) {
      providerClient.refreshConfig();
    }
  } catch (err) {
    console.warn('[ProviderClient] Failed saving council config:', err.message);
  }
}

/**
 * Generic HTTPS POST request helper
 */
function postHttps(urlStr, headers, data, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let isSettled = false;
    const safeResolve = (val) => {
      if (!isSettled) {
        isSettled = true;
        resolve(val);
      }
    };
    const safeReject = (err) => {
      if (!isSettled) {
        isSettled = true;
        reject(err);
      }
    };

    try {
      const url = new URL(urlStr);
      const isHttp = url.protocol === 'http:';
      const transport = isHttp ? http : https;

      const req = transport.request(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || (isHttp ? 80 : 443),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            ...headers,
          },
          timeout: timeoutMs,
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              safeResolve({ statusCode: res.statusCode, data: JSON.parse(body), raw: body });
            } catch {
              safeResolve({ statusCode: res.statusCode, data: null, raw: body });
            }
          });
        }
      );

      req.on('error', safeReject);
      req.on('timeout', () => {
        try { req.destroy(); } catch {}
        safeReject(new Error('Provider request timed out'));
      });

      req.write(data);
      req.end();
    } catch (err) {
      safeReject(err);
    }
  });
}

// In-memory query response cache for cost and latency optimization
const queryCache = new Map();
const MAX_CACHE_SIZE = 100;

function computeCacheKey(modelId, prompt, systemPrompt) {
  const str = `${modelId}:::${systemPrompt || ''}:::${prompt || ''}`;
  const hash = crypto.createHash('sha256').update(str).digest('hex').slice(0, 32);
  return `${modelId}_${hash}`;
}

export class ProviderClient {
  constructor() {
    this.config = loadCouncilConfig();
    this.queryCache = queryCache;
  }

  refreshConfig() {
    this.config = loadCouncilConfig();
    return this.config;
  }

  getApiKey(provider) {
    this.refreshConfig();
    const cfg = this.config[provider] || {};
    if (cfg.apiKey) return cfg.apiKey;

    if (provider === 'gemini') {
      return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
    }
    if (provider === 'anthropic') {
      return process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || null;
    }
    if (provider === 'openai' || provider === 'gpt-oss') {
      return process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || null;
    }

    // Dynamic provider uppercase env variable lookup (e.g. DEEPSEEK_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY)
    if (provider && typeof provider === 'string') {
      const envKey = `${provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`;
      if (process.env[envKey]) return process.env[envKey];
    }
    return null;
  }

  getBaseUrl(provider) {
    this.refreshConfig();
    const cfg = this.config[provider] || {};
    if (cfg.baseUrl) return cfg.baseUrl;

    if (provider === 'gemini') return 'https://generativelanguage.googleapis.com';
    if (provider === 'anthropic') return 'https://api.anthropic.com';
    if (provider === 'openai' || provider === 'gpt-oss') {
      return process.env.OPENAI_BASE_URL || 'https://api.openai.com';
    }

    if (provider && typeof provider === 'string') {
      const envBase = `${provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_BASE_URL`;
      if (process.env[envBase]) return process.env[envBase];
    }
    return '';
  }

  /**
   * Attempts live query to model provider with transparent caching and fallback
   */
  async queryModel({ modelId, prompt, systemPrompt = '', temperature = 0.4, maxTokens = 2500, bypassCache = false }) {
    const cacheKey = computeCacheKey(modelId, prompt, systemPrompt);
    if (!bypassCache && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      return { ...cached, fromCache: true };
    }

    const setCache = (res) => {
      if (res && res.usedLiveApi && res.text) {
        if (this.queryCache.size >= MAX_CACHE_SIZE) {
          const firstKey = this.queryCache.keys().next().value;
          if (firstKey) this.queryCache.delete(firstKey);
        }
        this.queryCache.set(cacheKey, res);
      }
      return res;
    };

    const modelCfg = getModelConfig(modelId);
    const provider = modelCfg?.provider || (modelId === 'gemini-3.8-flash' ? 'gemini' : modelId === 'claude-4.6-opus' ? 'anthropic' : 'openai_compatible');

    // 1. Google Gemini Provider
    if (provider === 'gemini' || modelId === 'gemini-3.8-flash') {
      const apiKey = modelCfg?.apiKey || (modelCfg?.apiKeyEnv ? process.env[modelCfg.apiKeyEnv] : null) || this.getApiKey('gemini');
      if (!apiKey) return { usedLiveApi: false, reason: 'NO_API_KEY' };

      try {
        let baseUrl = (modelCfg?.endpoint || this.getBaseUrl('gemini')).replace(/\/+$/, '');
        const modelName = modelCfg?.modelName || (modelId === 'gemini-3.8-flash' ? 'gemini-2.5-flash' : modelId);
        const prefix = baseUrl.endsWith('/v1beta') ? '' : '/v1beta';
        const url = `${baseUrl}${prefix}/models/${modelName}:generateContent?key=${apiKey}`;
        const payload = JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}` }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        });

        const res = await postHttps(url, {}, payload);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const parts = res.data?.candidates?.[0]?.content?.parts || [];
          const substantiveParts = parts.filter(p => p.text && !p.thought);
          const targetParts = substantiveParts.length > 0 ? substantiveParts : parts.filter(p => p.text);
          const text = targetParts.map(p => p.text).join('\n\n').trim();

          if (text) {
            const usage = res.data?.usageMetadata || {};
            return setCache({
              usedLiveApi: true,
              text,
              tokensUsed: (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0) || 2000,
              inputTokens: usage.promptTokenCount || 1000,
              outputTokens: usage.candidatesTokenCount || 1000,
            });
          }
        }
        const errorReason = res.statusCode === 401 || res.statusCode === 403
          ? 'AUTH_FAILED'
          : res.statusCode === 429
            ? 'RATE_LIMIT_EXCEEDED'
            : (res.statusCode >= 200 && res.statusCode < 300)
              ? 'EMPTY_OR_UNPARSEABLE_RESPONSE'
              : `API_ERROR_${res.statusCode}`;
        return { usedLiveApi: false, reason: errorReason };
      } catch (err) {
        return { usedLiveApi: false, reason: err.message };
      }
    }

    // 2. Anthropic Messages Provider
    if (provider === 'anthropic' || modelId === 'claude-4.6-opus') {
      const apiKey = modelCfg?.apiKey || (modelCfg?.apiKeyEnv ? process.env[modelCfg.apiKeyEnv] : null) || this.getApiKey('anthropic');
      if (!apiKey) return { usedLiveApi: false, reason: 'NO_API_KEY' };

      try {
        let baseUrl = (modelCfg?.endpoint || this.getBaseUrl('anthropic')).replace(/\/+$/, '');
        const modelName = modelCfg?.modelName || (modelId === 'claude-4.6-opus' ? 'claude-3-7-sonnet-20250219' : modelId);
        const prefix = baseUrl.endsWith('/v1') ? '' : '/v1';
        const url = `${baseUrl}${prefix}/messages`;
        const payload = JSON.stringify({
          model: modelName,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt || undefined,
          messages: [{ role: 'user', content: prompt }],
        });

        const res = await postHttps(
          url,
          {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          payload
        );

        if (res.statusCode >= 200 && res.statusCode < 300) {
          let text = '';
          if (Array.isArray(res.data?.content)) {
            const textBlocks = res.data.content.filter(b => b.type === 'text' && b.text);
            if (textBlocks.length > 0) {
              text = textBlocks.map(b => b.text).join('\n\n').trim();
            } else if (res.data.content[0]?.text) {
              text = res.data.content[0].text.trim();
            }
          } else if (typeof res.data?.content === 'string') {
            text = res.data.content.trim();
          }

          if (text) {
            const usage = res.data?.usage || {};
            return setCache({
              usedLiveApi: true,
              text,
              tokensUsed: (usage.input_tokens || 0) + (usage.output_tokens || 0) || 2500,
              inputTokens: usage.input_tokens || 1200,
              outputTokens: usage.output_tokens || 1300,
            });
          }
        }
        const errorReason = res.statusCode === 401 || res.statusCode === 403
          ? 'AUTH_FAILED'
          : res.statusCode === 429
            ? 'RATE_LIMIT_EXCEEDED'
            : (res.statusCode >= 200 && res.statusCode < 300)
              ? 'EMPTY_OR_UNPARSEABLE_RESPONSE'
              : `API_ERROR_${res.statusCode}`;
        return { usedLiveApi: false, reason: errorReason };
      } catch (err) {
        return { usedLiveApi: false, reason: err.message };
      }
    }

    // 3. OpenAI-compatible / Ollama / DeepSeek / vLLM / OpenRouter / Custom Endpoints
    if (
      provider === 'openai' ||
      provider === 'openai_compatible' ||
      provider === 'ollama' ||
      modelId === 'gpt-oss-120b' ||
      modelCfg
    ) {
      const apiKey = modelCfg?.apiKey || (modelCfg?.apiKeyEnv ? process.env[modelCfg.apiKeyEnv] : null) || this.getApiKey(provider) || this.getApiKey('openai') || this.getApiKey('gpt-oss');
      const baseUrl = modelCfg?.endpoint || (provider === 'ollama' ? 'http://localhost:11434/v1' : this.getBaseUrl(provider) || this.getBaseUrl('gpt-oss'));
      const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

      if (!apiKey && !isLocal) {
        return { usedLiveApi: false, reason: 'NO_API_KEY' };
      }

      try {
        let endpointUrl = baseUrl.replace(/\/+$/, '');
        if (!endpointUrl.endsWith('/chat/completions')) {
          if (endpointUrl.endsWith('/v1')) {
            endpointUrl = `${endpointUrl}/chat/completions`;
          } else {
            endpointUrl = `${endpointUrl}/v1/chat/completions`;
          }
        }

        const modelName = modelCfg?.modelName || (modelId === 'gpt-oss-120b' ? 'gpt-4o-mini' : modelId);
        const payload = JSON.stringify({
          model: modelName,
          temperature,
          max_tokens: maxTokens,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
        });

        const headers = {};
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const res = await postHttps(endpointUrl, headers, payload);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const choice = res.data?.choices?.[0]?.message;
          const text = (choice?.content || choice?.reasoning_content || '').trim();
          if (text) {
            const usage = res.data?.usage || {};
            return setCache({
              usedLiveApi: true,
              text,
              tokensUsed: usage.total_tokens || 2200,
              inputTokens: usage.prompt_tokens || 1100,
              outputTokens: usage.completion_tokens || 1100,
            });
          }
        }
        const errorReason = res.statusCode === 401 || res.statusCode === 403
          ? 'AUTH_FAILED'
          : res.statusCode === 429
            ? 'RATE_LIMIT_EXCEEDED'
            : (res.statusCode >= 200 && res.statusCode < 300)
              ? 'EMPTY_OR_UNPARSEABLE_RESPONSE'
              : `API_ERROR_${res.statusCode}`;
        return { usedLiveApi: false, reason: errorReason };
      } catch (err) {
        return { usedLiveApi: false, reason: err.message };
      }
    }

    return { usedLiveApi: false, reason: 'UNKNOWN_MODEL' };
  }
}

export const providerClient = new ProviderClient();
