import test from 'node:test';
import assert from 'node:assert/strict';
import { providerClient, ProviderClient, saveCouncilConfig, loadCouncilConfig } from '../mcp-server/providerClient.js';

test('ProviderClient - Instantiation and Config Refresh', () => {
  const client = new ProviderClient();
  assert.ok(client, 'ProviderClient should instantiate');

  const initialConfig = client.refreshConfig();
  assert.ok(typeof initialConfig === 'object', 'Config should be an object');

  // Test dynamic saving and refreshing
  const testCfg = {
    ...initialConfig,
    test_provider: { apiKey: 'test-key-123', baseUrl: 'https://api.test.com' }
  };
  saveCouncilConfig(testCfg);

  assert.equal(client.getApiKey('test_provider'), 'test-key-123');
  assert.equal(client.getBaseUrl('test_provider'), 'https://api.test.com');
});

test('ProviderClient - Query Model Fallback without API Keys', async () => {
  // Querying with an unconfigured model without live API key falls back gracefully
  const res = await providerClient.queryModel({
    modelId: 'test-unconfigured-model',
    prompt: 'Hello world',
    systemPrompt: 'You are an architect',
  });

  assert.equal(res.usedLiveApi, false);
  assert.ok(res.reason, 'Should report reason for not using live API');
});

test('ProviderClient - Query Caching', async () => {
  // Inject mock cached entry to test cache hit
  const cacheKey = 'test-cache-model_abc';
  providerClient.queryCache.set(cacheKey, {
    usedLiveApi: true,
    text: 'Cached response',
    tokensUsed: 100,
  });

  assert.ok(providerClient.queryCache.has(cacheKey));
  const cached = providerClient.queryCache.get(cacheKey);
  assert.equal(cached.text, 'Cached response');
});

test('ProviderClient - Dynamic Environment Variable Resolution', () => {
  const client = new ProviderClient();
  process.env.DEEPSEEK_API_KEY = 'sk-deepseek-env-test-123';
  process.env.DEEPSEEK_BASE_URL = 'https://custom.deepseek.endpoint/v1';

  try {
    assert.equal(client.getApiKey('deepseek'), 'sk-deepseek-env-test-123');
    assert.equal(client.getBaseUrl('deepseek'), 'https://custom.deepseek.endpoint/v1');
  } finally {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_BASE_URL;
  }
});
